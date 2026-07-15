import * as diff from 'diff';

export interface DiffLine {
    type: 'added' | 'removed' | 'unchanged';
    content: string;
}

export class DiffEngine {
    /**
     * Computes a line-by-line diff between two strings.
     */
    public static computeDiff(oldContent: string, newContent: string): DiffLine[] {
        const changes: any[] = diff.diffLines(oldContent, newContent);
        const diffLines: DiffLine[] = [];

        changes.forEach((change: any) => {
            const lines = change.value.split(/\r?\n/);
            // If the string ends with a newline, split returns a trailing empty string
            if (lines.length > 1 && lines[lines.length - 1] === '') {
                lines.pop();
            }

            let type: 'added' | 'removed' | 'unchanged' = 'unchanged';
            if (change.added) {
                type = 'added';
            } else if (change.removed) {
                type = 'removed';
            }

            lines.forEach((line: string) => {
                diffLines.push({
                    type,
                    content: line
                });
            });
        });

        return diffLines;
    }

    /**
     * Creates a patch delta between old and new content.
     */
    public static createPatch(uri: string, oldContent: string, newContent: string): string {
        return diff.createPatch(uri, oldContent, newContent);
    }

    /**
     * Reconstructs file content at a specific timestamp using patches.
     */
    public static reconstructContent(snapshots: import('../types').FileSnapshot[], uri: string, upToTimestamp: number): string | null {
        const fileSnapshots = snapshots.filter(s => s.uri === uri && s.timestamp <= upToTimestamp);
        if (fileSnapshots.length === 0) return null;

        let content = '';
        for (const s of fileSnapshots) {
            if (s.changeType === 'create' || s.content !== undefined) {
                content = s.content || '';
            } else if (s.changeType === 'modify' && s.delta) {
                const patched = diff.applyPatch(content, s.delta);
                if (typeof patched === 'string') {
                    content = patched;
                } else {
                    console.error(`Failed to apply patch for ${uri} at ${s.timestamp}`);
                }
            } else if (s.changeType === 'delete') {
                content = '';
            }
        }
        return content;
    }
}
