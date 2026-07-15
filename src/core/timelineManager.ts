import { FileSnapshot, TimelineState, SessionMetadata } from '../types';
import { produce } from 'immer';
import { DiffEngine } from './diffEngine';

export class TimelineManager {
    private state: TimelineState;
    private listeners: ((state: TimelineState) => void)[] = [];

    constructor(initialMetadata: SessionMetadata) {
        this.state = {
            snapshots: [],
            currentTime: Date.now(),
            bookmarks: [],
            metadata: initialMetadata,
            isRecording: false
        };
    }

    public addSnapshot(snapshot: FileSnapshot) {
        let finalSnapshot = { ...snapshot };

        if (finalSnapshot.changeType === 'modify' && finalSnapshot.content !== undefined) {
            const previousContent = DiffEngine.reconstructContent(this.state.snapshots, finalSnapshot.uri, finalSnapshot.timestamp - 1);
            if (previousContent !== null) {
                const patch = DiffEngine.createPatch(finalSnapshot.uri, previousContent, finalSnapshot.content);
                finalSnapshot.delta = patch;
                delete finalSnapshot.content;
            }
        }

        this.state = produce(this.state, draft => {
            draft.snapshots.push(finalSnapshot as FileSnapshot);
            draft.currentTime = finalSnapshot.timestamp;
        });
        this.notify();
    }

    public jumpToTime(timestamp: number) {
        this.state = produce(this.state, draft => {
            draft.currentTime = timestamp;
        });
        this.notify();
    }

    public toggleBookmark(label: string, timestamp: number) {
        this.state = produce(this.state, draft => {
            const index = draft.bookmarks.findIndex(b => b.timestamp === timestamp);
            if (index >= 0) {
                draft.bookmarks.splice(index, 1);
            } else {
                draft.bookmarks.push({
                    id: Math.random().toString(36).substring(2, 11),
                    timestamp,
                    label
                });
            }
        });
        this.notify();
    }

    public setRecording(isRecording: boolean) {
        this.state = produce(this.state, draft => {
            draft.isRecording = isRecording;
        });
        this.notify();
    }

    public clearSession(initialMetadata: SessionMetadata) {
        this.state = produce(this.state, draft => {
            draft.snapshots = [];
            draft.currentTime = Date.now();
            draft.bookmarks = [];
            draft.metadata = initialMetadata;
            draft.isRecording = false;
        });
        this.notify();
    }

    public loadState(state: TimelineState) {
        this.state = state;
        this.notify();
    }

    public getState(): TimelineState {
        return this.state;
    }

    public subscribe(listener: (state: TimelineState) => void) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notify() {
        this.listeners.forEach(l => l(this.state));
    }
}
