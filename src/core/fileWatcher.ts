import * as vscode from 'vscode';
import { EventEmitter } from 'events';

export class FileWatcher extends EventEmitter {
    private disposables: vscode.Disposable[] = [];
    private active: boolean = false;

    constructor() {
        super();
    }

    public start() {
        if (this.active) return;
        this.active = true;

        // Watch for document changes
        this.disposables.push(
            vscode.workspace.onDidChangeTextDocument(e => {
                if (e.document.uri.scheme === 'file') {
                    this.emit('change', {
                        uri: e.document.uri.toString(),
                        content: e.document.getText(),
                        timestamp: Date.now(),
                        changeType: 'modify'
                    });
                }
            })
        );

        // Watch for file creation
        this.disposables.push(
            vscode.workspace.onDidCreateFiles(e => {
                e.files.forEach(async uri => {
                    const content = (await vscode.workspace.fs.readFile(uri)).toString();
                    this.emit('change', {
                        uri: uri.toString(),
                        content: content,
                        timestamp: Date.now(),
                        changeType: 'create'
                    });
                });
            })
        );

        // Watch for file deletion
        this.disposables.push(
            vscode.workspace.onDidDeleteFiles(e => {
                e.files.forEach(uri => {
                    this.emit('change', {
                        uri: uri.toString(),
                        content: '',
                        timestamp: Date.now(),
                        changeType: 'delete'
                    });
                });
            })
        );
    }

    public stop() {
        this.active = false;
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
}
