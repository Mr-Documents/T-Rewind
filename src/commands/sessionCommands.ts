import * as vscode from 'vscode';
import { TimelineManager } from '../core/timelineManager';
import { TimelineState } from '../types';

export async function exportSession(timelineManager: TimelineManager) {
    const state = timelineManager.getState();
    if (state.snapshots.length === 0) {
        vscode.window.showInformationMessage('No active session data to export.');
        return;
    }

    const uri = await vscode.window.showSaveDialog({
        title: 'Export Time-Travel Session',
        filters: {
            'Time-Travel Session': ['ttd', 'json']
        },
        saveLabel: 'Export'
    });

    if (uri) {
        try {
            const data = Buffer.from(JSON.stringify(state, null, 2), 'utf-8');
            await vscode.workspace.fs.writeFile(uri, new Uint8Array(data));
            vscode.window.showInformationMessage('Time-Travel session exported successfully!');
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to export session: ${error.message}`);
        }
    }
}

export async function importSession(timelineManager: TimelineManager, providerRefresh: () => void) {
    const uri = await vscode.window.showOpenDialog({
        title: 'Import Time-Travel Session',
        filters: {
            'Time-Travel Session': ['ttd', 'json']
        },
        canSelectMany: false
    });

    if (uri && uri[0]) {
        try {
            const data = await vscode.workspace.fs.readFile(uri[0]);
            const state = JSON.parse(Buffer.from(data).toString('utf-8')) as TimelineState;
            timelineManager.loadState(state);
            providerRefresh();
            vscode.window.showInformationMessage('Time-Travel session imported successfully!');
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to import session: ${error.message}`);
        }
    }
}
