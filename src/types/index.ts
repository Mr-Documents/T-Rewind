export interface FileSnapshot {
    uri: string;
    timestamp: number;
    content?: string; // Only present for 'create' or base snapshots
    changeType: 'create' | 'modify' | 'delete';
    delta?: string; // Present for 'modify' to save memory
}

export interface Bookmark {
    id: string;
    timestamp: number;
    label: string;
    description?: string;
}

export interface SessionMetadata {
    id: string;
    name: string;
    startTime: number;
    endTime?: number;
    tags: string[];
}

export interface TimelineState {
    snapshots: FileSnapshot[];
    currentTime: number;
    bookmarks: Bookmark[];
    metadata: SessionMetadata;
    isRecording: boolean;
}

export type WebviewMessage = 
    | { type: 'updateState'; payload: TimelineState }
    | { type: 'jumpToTime'; payload: number }
    | { type: 'restoreFile'; payload: { uri: string; timestamp: number } }
    | { type: 'startRecording' }
    | { type: 'stopRecording' }
    | { type: 'toggleBookmark'; payload: { timestamp: number; label: string } }
    | { type: 'currentFileContent'; payload: { uri: string; content: string } };


