import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Trash2, Play, Square, Upload, FileVideo } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Files({ activeStreams, onStart, onStop }) {
    const { t } = useTranslation();
    const [sources, setSources] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchSources();
    }, []);

    const fetchSources = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/sources`);
            // Filter only files
            setSources(res.data.filter(s => s.type === 'file'));
        } catch (err) {
            console.error("Failed to fetch sources", err);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm(t('files.confirm_delete'))) return;
        try {
            await axios.delete(`${API_URL}/api/sources/${id}`);
            fetchSources();
            if (activeStreams.find(s => s.id === id)) {
                onStop(id);
            }
        } catch (err) {
            console.error("Failed to delete source", err);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setLoading(true);
        try {
            // Upload file
            const uploadRes = await axios.post(`${API_URL}/api/upload`, formData);

            // Create source
            await axios.post(`${API_URL}/api/sources`, {
                name: file.name,
                source_url: uploadRes.data.path,
                type: 'file'
            });

            fetchSources();
        } catch (err) {
            console.error(err);
            alert(t('files.upload_failed'));
        } finally {
            setLoading(false);
        }
    };

    const isRunning = (id) => activeStreams.find(s => s.id === id);

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', color: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <FileVideo size={32} color="#3b82f6" />
                    <h2>{t('files.title')}</h2>
                </div>

                <label className="primary-btn" style={{
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: '#3b82f6',
                    color: 'white',
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    fontWeight: 'bold'
                }}>
                    <Upload size={16} />
                    {loading ? t('files.uploading') : t('files.upload_video')}
                    <input type="file" accept="video/*" onChange={handleFileUpload} style={{ display: 'none' }} disabled={loading} />
                </label>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#1e293b', borderRadius: '8px', overflow: 'hidden' }}>
                <thead>
                    <tr style={{ background: '#0f172a', textAlign: 'left' }}>
                        <th style={{ padding: '1rem' }}>{t('files.table.id')}</th>
                        <th style={{ padding: '1rem' }}>{t('files.table.filename')}</th>
                        <th style={{ padding: '1rem' }}>{t('files.table.path')}</th>
                        <th style={{ padding: '1rem' }}>{t('files.table.status')}</th>
                        <th style={{ padding: '1rem' }}>{t('files.table.actions')}</th>
                    </tr>
                </thead>
                <tbody>
                    {sources.map(source => (
                        <tr key={source.id} style={{ borderBottom: '1px solid #334155' }}>
                            <td style={{ padding: '1rem' }}>{source.id}</td>
                            <td style={{ padding: '1rem', fontWeight: 'bold' }}>{source.name}</td>
                            <td style={{ padding: '1rem', fontFamily: 'monospace', color: '#94a3b8', fontSize: '0.8rem' }}>
                                {source.source_url}
                            </td>
                            <td style={{ padding: '1rem' }}>
                                {isRunning(source.id) ? (
                                    <span style={{ color: '#22c55e', fontWeight: 'bold' }}>● {t('files.status_playing')}</span>
                                ) : (
                                    <span style={{ color: '#64748b' }}>○ {t('files.status_idle')}</span>
                                )}
                            </td>
                            <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
                                {isRunning(source.id) ? (
                                    <button onClick={() => onStop(source.id)} style={{ background: '#ef4444', padding: '6px', border: 'none', borderRadius: '4px', cursor: 'pointer', color: 'white' }} title="Stop">
                                        <Square size={16} />
                                    </button>
                                ) : (
                                    <button onClick={() => onStart(source)} style={{ background: '#22c55e', padding: '6px', border: 'none', borderRadius: '4px', cursor: 'pointer', color: 'white' }} title="Play">
                                        <Play size={16} />
                                    </button>
                                )}
                                <button onClick={() => handleDelete(source.id)} style={{ background: '#ef4444', padding: '6px', border: 'none', borderRadius: '4px', cursor: 'pointer', color: 'white' }} title="Delete">
                                    <Trash2 size={16} />
                                </button>
                            </td>
                        </tr>
                    ))}
                    {sources.length === 0 && (
                        <tr>
                            <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                                {t('files.no_files')}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
