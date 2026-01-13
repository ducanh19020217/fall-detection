import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Upload, Play, Square, AlertTriangle, Activity, CheckCircle } from 'lucide-react';
import VideoPlayer from '../components/VideoPlayer';
import { useTranslation } from 'react-i18next';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Demo() {
    const { t } = useTranslation();
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [sourceId, setSourceId] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [events, setEvents] = useState([]);
    const [logs, setLogs] = useState([]);
    const [telegramConfig, setTelegramConfig] = useState({ chat_id: '', bot_token: '' });

    const addLog = (msg) => {
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUploadAndStart = async () => {
        if (!file) return;
        setUploading(true);
        addLog(t('demo.uploading_file'));

        try {
            // 1. Upload File
            const formData = new FormData();
            formData.append('file', file);
            const uploadRes = await axios.post(`${API_URL}/api/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const filePath = uploadRes.data.path;
            addLog(t('demo.upload_complete', { filename: uploadRes.data.filename }));

            // 2. Create Video Source (File Type)
            const sourceData = {
                name: `Demo - ${file.name}`,
                source_url: filePath,
                type: 'file',
                group_id: null // Independent demo
            };
            const sourceRes = await axios.post(`${API_URL}/api/sources`, sourceData);
            const newSourceId = sourceRes.data.id;
            setSourceId(newSourceId);
            addLog(t('demo.source_created', { id: newSourceId }));

            // 3. Start Pipeline with optional Telegram Config
            const startPayload = {
                source_id: newSourceId,
                telegram_config: (telegramConfig.chat_id && telegramConfig.bot_token) ? telegramConfig : null
            };
            await axios.post(`${API_URL}/api/pipeline/start`, startPayload);
            addLog(t('demo.pipeline_started'));
            setIsPlaying(true);

        } catch (err) {
            console.error(err);
            addLog(t('demo.error', { message: err.message }));
            alert(t('demo.failed_to_start'));
        } finally {
            setUploading(false);
        }
    };

    const handleStop = async () => {
        if (!sourceId) return;
        try {
            await axios.post(`${API_URL}/api/pipeline/stop?source_id=${sourceId}`);
            addLog(t('demo.pipeline_stopped'));
            setIsPlaying(false);
        } catch (err) {
            console.error(err);
        }
    };

    // Poll for events for this specific source
    useEffect(() => {
        if (!isPlaying || !sourceId) return;

        const interval = setInterval(async () => {
            try {
                const res = await axios.get(`${API_URL}/api/events?limit=10`);
                // Filter for this source (though backend returns all, we filter client side for demo focus)
                const myEvents = res.data.filter(e => e.source_id === sourceId);
                setEvents(myEvents);

                if (myEvents.length > 0 && myEvents[0].timestamp > (Date.now() / 1000 - 2)) {
                    // Simple check to log new events roughly
                }
            } catch (e) {
                console.error(e);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [isPlaying, sourceId]);

    return (
        <div style={{ padding: '2rem', height: 'calc(100vh - 80px)', boxSizing: 'border-box', display: 'flex', gap: '2rem', color: '#f8fafc' }}>

            {/* Left Panel: Controls & Logs */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                {/* Control Card */}
                <div className="panel" style={{ padding: '2rem', background: '#1e293b', borderRadius: '12px', border: '1px solid #334155' }}>
                    <h2 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Activity color="#3b82f6" /> {t('demo.title')}
                    </h2>
                    <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
                        {t('demo.subtitle')}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {!isPlaying ? (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.3rem' }}>{t('demo.chat_id')}</label>
                                        <input
                                            type="text"
                                            value={telegramConfig.chat_id}
                                            onChange={e => setTelegramConfig({ ...telegramConfig, chat_id: e.target.value })}
                                            placeholder={t('demo.optional')}
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #334155', background: '#0f172a', color: 'white' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.3rem' }}>{t('demo.bot_token')}</label>
                                        <input
                                            type="text"
                                            value={telegramConfig.bot_token}
                                            onChange={e => setTelegramConfig({ ...telegramConfig, bot_token: e.target.value })}
                                            placeholder={t('demo.optional')}
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #334155', background: '#0f172a', color: 'white' }}
                                        />
                                    </div>
                                </div>

                                <div style={{
                                    border: '2px dashed #475569',
                                    borderRadius: '8px',
                                    padding: '2rem',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    background: file ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                    borderColor: file ? '#3b82f6' : '#475569'
                                }} onClick={() => document.getElementById('fileInput').click()}>
                                    <input
                                        type="file"
                                        id="fileInput"
                                        accept="video/*"
                                        style={{ display: 'none' }}
                                        onChange={handleFileChange}
                                    />
                                    <Upload size={32} color={file ? '#3b82f6' : '#94a3b8'} style={{ marginBottom: '0.5rem' }} />
                                    <div style={{ fontWeight: 'bold', color: file ? '#3b82f6' : '#e2e8f0' }}>
                                        {file ? file.name : t('demo.upload_text')}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                        {t('demo.upload_hint')}
                                    </div>
                                </div>

                                <button
                                    className="primary"
                                    onClick={handleUploadAndStart}
                                    disabled={!file || uploading}
                                    style={{ padding: '1rem', fontSize: '1.1rem', justifyContent: 'center' }}
                                >
                                    {uploading ? t('demo.processing') : (
                                        <>
                                            <Play size={20} style={{ marginRight: '0.5rem' }} /> {t('demo.start')}
                                        </>
                                    )}
                                </button>
                            </>
                        ) : (
                            <button
                                className="danger"
                                onClick={handleStop}
                                style={{ padding: '1rem', fontSize: '1.1rem', justifyContent: 'center' }}
                            >
                                <Square size={20} style={{ marginRight: '0.5rem' }} /> {t('demo.stop')}
                            </button>
                        )}
                    </div>
                </div>

                {/* System Logs */}
                <div className="panel" style={{ flex: 1, padding: '1.5rem', background: '#0f172a', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ marginTop: 0, fontSize: '1rem', color: '#94a3b8' }}>{t('demo.logs')}</h3>
                    <div style={{ flex: 1, overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {logs.map((log, i) => (
                            <div key={i} style={{ color: log.includes('Error') ? '#ef4444' : '#cbd5e1' }}>
                                {log}
                            </div>
                        ))}
                        {logs.length === 0 && <span style={{ color: '#475569' }}>{t('demo.ready')}</span>}
                    </div>
                </div>

            </div>

            {/* Right Panel: Visualization */}
            <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                {/* Video Player */}
                <div style={{
                    flex: 3,
                    background: '#000',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    position: 'relative',
                    border: '1px solid #334155',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                }}>
                    {isPlaying && sourceId ? (
                        <VideoPlayer
                            wsUrl={`ws://localhost:8000/api/ws/stream/${sourceId}`}
                            isStreaming={true}
                        />
                    ) : (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
                            <Activity size={64} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                            <div style={{ fontSize: '1.2rem' }}>{t('demo.waiting')}</div>
                        </div>
                    )}

                    {/* Status Overlay */}
                    {isPlaying && (
                        <div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', gap: '1rem' }}>
                            <div style={{ background: 'rgba(34, 197, 94, 0.9)', color: 'white', padding: '0.5rem 1rem', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                <div style={{ width: '8px', height: '8px', background: 'white', borderRadius: '50%', animation: 'pulse 1s infinite' }}></div>
                                {t('demo.live')}
                            </div>
                        </div>
                    )}
                </div>

                {/* Events Timeline */}
                <div style={{ flex: 1, background: '#1e293b', borderRadius: '12px', padding: '1rem', border: '1px solid #334155', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ marginTop: 0, fontSize: '1rem', color: '#94a3b8', marginBottom: '1rem' }}>{t('demo.detected_events')}</h3>
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        {events.length === 0 ? (
                            <div style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>{t('dashboard.no_events')}</div>
                        ) : (
                            events.map(event => (
                                <div key={event.id} style={{
                                    background: '#0f172a',
                                    padding: '0.8rem',
                                    borderRadius: '8px',
                                    borderLeft: '4px solid #ef4444',
                                    display: 'flex',
                                    gap: '1rem',
                                    alignItems: 'center'
                                }}>
                                    {event.snapshot_path && (
                                        <img
                                            src={`${API_URL}/data/snapshots/${event.snapshot_path.split('/').pop()}`}
                                            style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }}
                                        />
                                    )}
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '0.9rem' }}>{t('dashboard.fall_detected')}</span>
                                            <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{new Date(event.timestamp).toLocaleTimeString()}</span>
                                        </div>
                                        <div style={{ color: '#cbd5e1', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                                            {t('dashboard.score')}: {event.fall_score.toFixed(2)} | {t('dashboard.track_id')}: {event.track_id}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
