import React, { useState } from 'react';
import { Play, Square, Plus, Upload, Trash2 } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function ControlPanel({ onStart, onStop, activeStreams }) {
    const [sourceType, setSourceType] = useState('rtsp');
    const [sourceUrl, setSourceUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [nightMode, setNightMode] = useState(false);

    const handleNightModeChange = async (e) => {
        const enabled = e.target.checked;
        setNightMode(enabled);
        // Update config for ALL active streams (or add a selector)
        // For MVP, we update all or just the first one. Let's iterate.
        activeStreams.forEach(async (stream) => {
            try {
                await axios.post(`${API_URL}/api/pipeline/config?source_id=${stream.id}&night_mode=${enabled}`);
            } catch (err) {
                console.error(`Failed to update night mode for ${stream.id}`, err);
            }
        });
    };

    const handleAddSource = async () => {
        setLoading(true);
        try {
            // Create source first
            const res = await axios.post(`${API_URL}/api/sources`, {
                name: `Cam ${activeStreams.length + 1}`,
                source_url: sourceUrl,
                type: sourceType
            });

            // Start pipeline with this source
            if (res.data.id) {
                onStart({
                    id: res.data.id,
                    name: res.data.name,
                    url: res.data.source_url
                });
            }
        } catch (err) {
            console.error(err);
            alert('Failed to add source');
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setLoading(true);
        try {
            const res = await axios.post(`${API_URL}/api/upload`, formData);
            setSourceUrl(res.data.path);
            setSourceType('file');
        } catch (err) {
            console.error(err);
            alert('Upload failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="panel">
            <h2>Control Panel</h2>

            {/* Resource Warning */}
            {activeStreams.length >= 2 && (
                <div style={{
                    backgroundColor: '#fef3c7',
                    color: '#92400e',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    marginBottom: '1rem',
                    fontSize: '0.9rem',
                    border: '1px solid #fcd34d'
                }}>
                    <strong>⚠️ High Resource Usage:</strong> Running {activeStreams.length} AI streams requires a strong GPU.
                </div>
            )}

            {/* Active Streams List */}
            <div className="active-streams" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: '#94a3b8' }}>Active Cameras ({activeStreams.length})</h3>
                {activeStreams.length === 0 && <p style={{ fontSize: '0.9rem', color: '#64748b' }}>No cameras running.</p>}

                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {activeStreams.map(stream => (
                        <li key={stream.id} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '0.5rem',
                            background: '#1e293b',
                            marginBottom: '0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.9rem'
                        }}>
                            <span>📷 {stream.name}</span>
                            <button
                                onClick={() => onStop(stream.id)}
                                style={{
                                    background: '#ef4444',
                                    border: 'none',
                                    color: 'white',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Stop
                            </button>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="divider" style={{ height: '1px', background: '#334155', margin: '1rem 0' }}></div>

            {/* Add New Source */}
            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: '#94a3b8' }}>Add New Camera</h3>
            <div className="control-group">
                <label>Source Type</label>
                <select value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
                    <option value="rtsp">IP Camera (RTSP)</option>
                    <option value="webcam">Webcam (USB)</option>
                    <option value="file">Video File</option>
                </select>
            </div>

            {sourceType === 'file' ? (
                <div className="control-group">
                    <label className="file-upload-btn" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Upload size={16} /> Upload Video
                        <input type="file" accept="video/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                    </label>
                    {sourceUrl && <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{sourceUrl.split('/').pop()}</div>}
                </div>
            ) : (
                <div className="control-group">
                    <label>
                        {sourceType === 'rtsp' ? 'RTSP URL' : 'Device Index'}
                    </label>
                    <input
                        type="text"
                        placeholder={sourceType === 'rtsp' ? "rtsp://admin:pass@192.168.1.x:554/..." : "0"}
                        value={sourceUrl}
                        onChange={(e) => setSourceUrl(e.target.value)}
                    />
                    {sourceType === 'rtsp' && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                            Format: rtsp://username:password@IP_ADDRESS:554/stream_path
                        </div>
                    )}
                </div>
            )}

            <div className="control-group" style={{ marginTop: '1rem' }}>
                <button className="primary" onClick={handleAddSource} disabled={loading || !sourceUrl}>
                    <Plus size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                    Add & Start Camera
                </button>
            </div>

            <div className="control-group" style={{ marginTop: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        checked={nightMode}
                        onChange={handleNightModeChange}
                    />
                    Night Vision Mode (All Cams)
                </label>
            </div>
        </div>
    );
}
