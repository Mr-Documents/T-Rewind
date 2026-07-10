import * as vscode from 'vscode';
import { FileWatcher } from './core/fileWatcher';
import { TimelineManager } from './core/timelineManager';
import { TimelineState } from './types';

export function activate(context: vscode.ExtensionContext) {
    const sessionMetadata = {
        id: Math.random().toString(36).substring(2, 11),
        name: `Session - ${new Date().toLocaleTimeString()}`,
        startTime: Date.now(),
        tags: []
    };

    const timelineManager = new TimelineManager(sessionMetadata);
    const fileWatcher = new FileWatcher();

    // Setup Workspace State Persistence
    const savedState = context.workspaceState.get<TimelineState>('time-travel-timeline-state');
    if (savedState) {
        timelineManager.loadState(savedState);
    }

    timelineManager.subscribe(state => {
        context.workspaceState.update('time-travel-timeline-state', state);
        provider.sendState();
    });

    const provider = new TimeTravelTimelineProvider(context.extensionUri, timelineManager, fileWatcher);

    // Register Webview View Provider
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            TimeTravelTimelineProvider.viewType,
            provider
        )
    );

    // Recording control helper functions
    function startRecording() {
        timelineManager.setRecording(true);
        fileWatcher.start();
        provider.sendState();
        vscode.commands.executeCommand('setContext', 'time-travel:recording', true);
        vscode.window.showInformationMessage('Time-Travel Recording Started.');
    }

    function stopRecording() {
        timelineManager.setRecording(false);
        fileWatcher.stop();
        provider.sendState();
        vscode.commands.executeCommand('setContext', 'time-travel:recording', false);
        vscode.window.showInformationMessage('Time-Travel Recording Stopped.');
    }

    // Register Commands
    context.subscriptions.push(
        vscode.commands.registerCommand('time-travel.startRecording', startRecording),
        vscode.commands.registerCommand('time-travel.stopRecording', stopRecording),
        vscode.commands.registerCommand('time-travel.openTimeline', () => {
            vscode.commands.executeCommand('workbench.view.extension.time-travel-explorer');
        })
    );

    // Debounce maps for file changes during recording
    const debounceTimers = new Map<string, NodeJS.Timeout>();
    function debounceSnapshot(uri: string, content: string, changeType: 'create' | 'modify' | 'delete') {
        if (debounceTimers.has(uri)) {
            clearTimeout(debounceTimers.get(uri)!);
        }
        const timer = setTimeout(() => {
            if (timelineManager.getState().isRecording) {
                timelineManager.addSnapshot({
                    uri,
                    timestamp: Date.now(),
                    content,
                    changeType
                });
            }
            debounceTimers.delete(uri);
        }, 500); // 500ms debounce
        debounceTimers.set(uri, timer);
    }

    // Monitor file modifications from Watcher
    fileWatcher.on('change', (change) => {
        if (!timelineManager.getState().isRecording) return;

        // Skip files that shouldn't be recorded (dist, node_modules, .git)
        if (change.uri.includes('node_modules') || change.uri.includes('.git') || change.uri.includes('/dist/')) {
            return;
        }

        if (change.changeType === 'modify') {
            debounceSnapshot(change.uri, change.content, 'modify');
        } else {
            timelineManager.addSnapshot({
                uri: change.uri,
                timestamp: change.timestamp,
                content: change.content,
                changeType: change.changeType
            });
        }
    });

    // Capture file saves immediately (bypassing debounce)
    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument(document => {
            if (document.uri.scheme !== 'file') return;
            const uri = document.uri.toString();

            if (uri.includes('node_modules') || uri.includes('.git') || uri.includes('/dist/')) {
                return;
            }

            if (debounceTimers.has(uri)) {
                clearTimeout(debounceTimers.get(uri)!);
                debounceTimers.delete(uri);
            }

            if (timelineManager.getState().isRecording) {
                timelineManager.addSnapshot({
                    uri,
                    timestamp: Date.now(),
                    content: document.getText(),
                    changeType: 'modify'
                });
            }
        })
    );

    // Sync active editor content with webview for live-diffs
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(() => {
            provider.sendCurrentFileContent();
        }),
        vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.scheme === 'file') {
                provider.sendCurrentFileContent();
            }
        })
    );

    // Initialize watcher state on startup
    if (timelineManager.getState().isRecording) {
        fileWatcher.start();
        vscode.commands.executeCommand('setContext', 'time-travel:recording', true);
    }
}

export function deactivate() {}

class TimeTravelTimelineProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'time-travel-timeline';
    private _view?: vscode.WebviewView;

    constructor(
        private readonly extensionUri: vscode.Uri,
        private readonly timelineManager: TimelineManager,
        private readonly fileWatcher: FileWatcher
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this.extensionUri
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case 'startRecording':
                    this.timelineManager.setRecording(true);
                    this.fileWatcher.start();
                    vscode.commands.executeCommand('setContext', 'time-travel:recording', true);
                    this.sendState();
                    break;
                case 'stopRecording':
                    this.timelineManager.setRecording(false);
                    this.fileWatcher.stop();
                    vscode.commands.executeCommand('setContext', 'time-travel:recording', false);
                    this.sendState();
                    break;
                case 'jumpToTime':
                    this.timelineManager.jumpToTime(message.payload);
                    break;
                case 'toggleBookmark':
                    this.timelineManager.toggleBookmark(message.payload.label, message.payload.timestamp);
                    break;
                case 'restoreFile':
                    await this.restoreFile(message.payload.uri, message.payload.timestamp);
                    break;
            }
        });

        // Push initial state
        this.sendState();
        this.sendCurrentFileContent();
    }

    public sendState() {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'updateState',
                payload: this.timelineManager.getState()
            });
        }
    }

    public sendCurrentFileContent() {
        if (!this._view) return;
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && activeEditor.document.uri.scheme === 'file') {
            this._view.webview.postMessage({
                type: 'currentFileContent',
                payload: {
                    uri: activeEditor.document.uri.toString(),
                    content: activeEditor.document.getText()
                }
            });
        }
    }

    private async restoreFile(uriStr: string, timestamp: number) {
        try {
            const uri = vscode.Uri.parse(uriStr);
            const state = this.timelineManager.getState();
            const snapshot = state.snapshots.find(s => s.uri === uriStr && s.timestamp === timestamp);
            
            if (!snapshot) {
                vscode.window.showErrorMessage(`Snapshot not found at ${timestamp}`);
                return;
            }

            const data = new Uint8Array(Buffer.from(snapshot.content, 'utf8'));
            await vscode.workspace.fs.writeFile(uri, data);
            vscode.window.showInformationMessage(`Successfully restored file to timestamp state!`);
            this.sendCurrentFileContent();
        } catch (err: any) {
            vscode.window.showErrorMessage(`Restoration failed: ${err.message}`);
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const scriptPathOnDisk = vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview.js');
        const scriptUri = webview.asWebviewUri(scriptPathOnDisk);
        const nonce = this.getNonce();

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Time-Travel Timeline</title>
                <style>
                    body {
                        padding: 0;
                        margin: 0;
                        overflow-x: hidden;
                        overflow-y: auto;
                        background-color: var(--vscode-editor-background);
                        color: var(--vscode-editor-foreground);
                        font-family: var(--vscode-font-family);
                    }
                </style>
            </head>
            <body>
                <div id="root"></div>
                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;
    }

    private getNonce() {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}
