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
}
