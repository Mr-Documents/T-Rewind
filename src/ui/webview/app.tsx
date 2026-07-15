import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
    Play, Pause, RotateCcw, Bookmark, ChevronLeft, ChevronRight, 
    Circle, FileText, CheckCircle, Clock, Plus, Trash2, ArrowRight
} from 'lucide-react';
import { DiffEngine, DiffLine } from '../../core/diffEngine';
import { TimelineState } from '../../types';
import './styles.css';

const vscode = (window as any).acquireVsCodeApi ? (window as any).acquireVsCodeApi() : {
    postMessage: (msg: any) => console.log('VSCode PostMessage:', msg)
};

function App() {
    const [state, setState] = useState<TimelineState>({
        snapshots: [],
        currentTime: Date.now(),
        bookmarks: [],
        metadata: { id: '', name: 'No Active Session', startTime: Date.now(), tags: [] },
        isRecording: false
    });

    const [currentFilesContent, setCurrentFilesContent] = useState<Record<string, string>>({});
    const [selectedSnapshotIndex, setSelectedSnapshotIndex] = useState<number>(-1);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [playbackInterval, setPlaybackInterval] = useState<number>(1000); // ms per step
    const playTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Subscribe to VS Code Messages
    useEffect(() => {
        const handler = (event: MessageEvent) => {
            const message = event.data;
            switch (message.type) {
                case 'updateState':
                    setState(message.payload);
                    break;
                case 'currentFileContent': {
                    const { uri, content } = message.payload;
                    setCurrentFilesContent(prev => ({
                        ...prev,
                        [uri]: content
                    }));
                    break;
                }
            }
        };

        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, []);

    const snapshots = state.snapshots;
    const currentMetadata = state.metadata;

    // Keep selected snapshot index updated with currentTime
    useEffect(() => {
        if (snapshots.length === 0) {
            setSelectedSnapshotIndex(-1);
            return;
        }
        // Find snapshot closest to currentTime
        const idx = snapshots.findIndex(s => s.timestamp === state.currentTime);
        if (idx !== -1) {
            setSelectedSnapshotIndex(idx);
        } else {
            // Find closest snapshot before or equal to currentTime
            let closestIdx = 0;
            let minDiff = Infinity;
            snapshots.forEach((s, i) => {
                const diff = state.currentTime - s.timestamp;
                if (diff >= 0 && diff < minDiff) {
                    minDiff = diff;
                    closestIdx = i;
                }
            });
            setSelectedSnapshotIndex(closestIdx);
        }
    }, [state.currentTime, snapshots]);

    // Handle Playback Interval
    useEffect(() => {
        if (isPlaying) {
            playTimerRef.current = setInterval(() => {
                setSelectedSnapshotIndex(prevIdx => {
                    if (prevIdx < snapshots.length - 1) {
                        const nextIdx = prevIdx + 1;
                        const nextSnapshot = snapshots[nextIdx];
                        vscode.postMessage({ type: 'jumpToTime', payload: nextSnapshot.timestamp });
                        return nextIdx;
                    } else {
                        setIsPlaying(false);
                        return prevIdx;
                    }
                });
            }, playbackInterval);
        } else {
            if (playTimerRef.current) {
                clearInterval(playTimerRef.current);
            }
        }

        return () => {
            if (playTimerRef.current) {
                clearInterval(playTimerRef.current);
            }
        };
    }, [isPlaying, snapshots, playbackInterval]);

    // UI Trigger actions
    const handleToggleRecording = () => {
        if (state.isRecording) {
            vscode.postMessage({ type: 'stopRecording' });
        } else {
            vscode.postMessage({ type: 'startRecording' });
        }
    };

    const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
        const idx = parseInt(e.target.value, 10);
        if (idx >= 0 && idx < snapshots.length) {
            const snapshot = snapshots[idx];
            vscode.postMessage({ type: 'jumpToTime', payload: snapshot.timestamp });
        }
    };

    const handleStepBack = () => {
        if (selectedSnapshotIndex > 0) {
            const prevSnapshot = snapshots[selectedSnapshotIndex - 1];
            vscode.postMessage({ type: 'jumpToTime', payload: prevSnapshot.timestamp });
        }
    };

    const handleStepForward = () => {
        if (selectedSnapshotIndex < snapshots.length - 1) {
            const nextSnapshot = snapshots[selectedSnapshotIndex + 1];
            vscode.postMessage({ type: 'jumpToTime', payload: nextSnapshot.timestamp });
        }
    };

    const handleRewind = () => {
        if (snapshots.length > 0) {
            vscode.postMessage({ type: 'jumpToTime', payload: snapshots[0].timestamp });
        }
    };

    const handleAddBookmark = () => {
        if (selectedSnapshotIndex === -1) return;
        const snapshot = snapshots[selectedSnapshotIndex];
        const label = prompt("Enter bookmark description:", `Bookmark @ ${new Date(snapshot.timestamp).toLocaleTimeString()}`);
        if (label) {
            vscode.postMessage({
                type: 'toggleBookmark',
                payload: { timestamp: snapshot.timestamp, label }
            });
        }
    };

    const handleJumpToBookmark = (timestamp: number) => {
        vscode.postMessage({ type: 'jumpToTime', payload: timestamp });
    };

    const handleRestoreFile = () => {
        if (selectedSnapshotIndex === -1) return;
        const snapshot = snapshots[selectedSnapshotIndex];
        vscode.postMessage({
            type: 'restoreFile',
            payload: { uri: snapshot.uri, timestamp: snapshot.timestamp }
        });
    };

    // Calculate diff lines
    const activeSnapshot = selectedSnapshotIndex >= 0 ? snapshots[selectedSnapshotIndex] : null;
    const activeSnapshotContent = activeSnapshot ? (DiffEngine.reconstructContent(snapshots, activeSnapshot.uri, activeSnapshot.timestamp) || '') : '';
    const currentLiveContent = activeSnapshot ? (currentFilesContent[activeSnapshot.uri] || '') : '';
    const diffLines: DiffLine[] = activeSnapshot 
        ? DiffEngine.computeDiff(activeSnapshotContent, currentLiveContent)
        : [];

    const getFileName = (uriStr: string) => {
        try {
            const parts = uriStr.split('/');
            return parts[parts.length - 1];
        } catch {
            return uriStr;
        }
    };

    return (
        <div className="container">
            {/* Header / Session Stats Card */}
            <div className="card header-card">
                <div className="header-top">
                    <div>
                        <h2 className="session-title">{currentMetadata.name}</h2>
                        <span className="session-subtitle">
                            <Clock size={12} className="icon-inline" /> {snapshots.length} Snapshots | {state.bookmarks.length} Bookmarks
                        </span>
                    </div>
                    <button 
                        className={`btn-record ${state.isRecording ? 'recording' : ''}`}
                        onClick={handleToggleRecording}
                    >
                        <Circle size={14} fill={state.isRecording ? '#ff3b30' : 'none'} />
                        {state.isRecording ? 'Stop Rec' : 'Start Rec'}
                    </button>
                </div>
            </div>

            {/* Timeline Controls & Scrubber Card */}
            <div className="card control-card">
                <div className="scrubber-container">
                    <input 
                        type="range" 
                        min="0" 
                        max={snapshots.length > 0 ? snapshots.length - 1 : 0} 
                        value={selectedSnapshotIndex >= 0 ? selectedSnapshotIndex : 0} 
                        onChange={handleScrub}
                        disabled={snapshots.length <= 1}
                        className="timeline-slider"
                    />
                    <div className="timeline-ticks">
                        {snapshots.map((s, idx) => {
                            const isBookmarked = state.bookmarks.some(b => b.timestamp === s.timestamp);
                            return (
                                <div 
                                    key={s.timestamp} 
                                    className={`tick ${idx === selectedSnapshotIndex ? 'active' : ''} ${isBookmarked ? 'bookmarked' : ''}`}
                                    style={{ left: `${(idx / (snapshots.length - 1 || 1)) * 100}%` }}
                                    title={`Snapshot at ${new Date(s.timestamp).toLocaleTimeString()}`}
                                />
                            );
                        })}
                    </div>
                </div>

                <div className="playback-panel">
                    <div className="btn-group">
                        <button className="btn-icon" onClick={handleRewind} disabled={snapshots.length === 0}>
                            <RotateCcw size={16} />
                        </button>
                        <button className="btn-icon" onClick={handleStepBack} disabled={selectedSnapshotIndex <= 0}>
                            <ChevronLeft size={16} />
                        </button>
                        <button 
                            className="btn-play-pause" 
                            onClick={() => setIsPlaying(!isPlaying)}
                            disabled={snapshots.length === 0}
                        >
                            {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                        </button>
                        <button className="btn-icon" onClick={handleStepForward} disabled={selectedSnapshotIndex === -1 || selectedSnapshotIndex >= snapshots.length - 1}>
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    <div className="playback-speed">
                        <select 
                            value={playbackInterval} 
                            onChange={(e) => setPlaybackInterval(parseInt(e.target.value, 10))}
                            className="select-speed"
                        >
                            <option value="2000">0.5x</option>
                            <option value="1000">1.0x</option>
                            <option value="500">2.0x</option>
                        </select>
                    </div>
                </div>

                {activeSnapshot && (
                    <div className="snapshot-details">
                        <div className="detail-row">
                            <span className="detail-label">Active File:</span>
                            <span className="detail-value text-highlight">{getFileName(activeSnapshot.uri)}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Time:</span>
                            <span className="detail-value">{new Date(activeSnapshot.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Type:</span>
                            <span className={`badge-type ${activeSnapshot.changeType}`}>
                                {activeSnapshot.changeType.toUpperCase()}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Bookmarks Section */}
            <div className="card bookmarks-card">
                <div className="section-header">
                    <h3>Bookmarks</h3>
                    <button className="btn-action-text" onClick={handleAddBookmark} disabled={selectedSnapshotIndex === -1}>
                        <Plus size={14} className="icon-inline" /> Add
                    </button>
                </div>
                {state.bookmarks.length === 0 ? (
                    <div className="empty-state">No bookmarks recorded for this session.</div>
                ) : (
                    <div className="bookmarks-list">
                        {state.bookmarks.map(b => (
                            <div 
                                key={b.id} 
                                className="bookmark-item"
                                onClick={() => handleJumpToBookmark(b.timestamp)}
                            >
                                <Bookmark size={12} className="bookmark-icon-active" fill="currentColor" />
                                <span className="bookmark-label">{b.label}</span>
                                <span className="bookmark-time">{new Date(b.timestamp).toLocaleTimeString()}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Visual Diff Panel */}
            <div className="card diff-card">
                <div className="section-header">
                    <h3>Unified Visual Diff</h3>
                    {activeSnapshot && (
                        <button className="btn-restore" onClick={handleRestoreFile}>
                            <CheckCircle size={14} className="icon-inline" /> Restore
                        </button>
                    )}
                </div>

                {!activeSnapshot ? (
                    <div className="empty-state">Start recording to capture files, then select a snapshot.</div>
                ) : (
                    <div className="diff-view-wrapper">
                        <div className="diff-header-filename">
                            <FileText size={14} className="icon-inline" /> {getFileName(activeSnapshot.uri)}
                            <span className="diff-header-meta">
                                Snapshot vs Workspace (Live)
                            </span>
                        </div>
                        <div className="diff-lines-container">
                            {diffLines.length === 0 ? (
                                <div className="no-diff-msg">Workspace matches this snapshot.</div>
                            ) : (
                                diffLines.map((line, idx) => {
                                    let lineClass = 'diff-line-unchanged';
                                    let prefix = ' ';
                                    if (line.type === 'added') {
                                        lineClass = 'diff-line-added';
                                        prefix = '+';
                                    } else if (line.type === 'removed') {
                                        lineClass = 'diff-line-removed';
                                        prefix = '-';
                                    }
                                    return (
                                        <div key={idx} className={`diff-line ${lineClass}`}>
                                            <span className="line-prefix">{prefix}</span>
                                            <span className="line-code">{line.content}</span>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}
