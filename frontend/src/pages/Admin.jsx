import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Trash2, Edit, Plus, Play, Square, Save, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Admin({ activeStreams, onStart, onStop }) {
    const { t } = useTranslation();
    const [sources, setSources] = useState([]);
    const [groups, setGroups] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ name: '', source_url: '', type: 'rtsp', group_id: '' });
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        fetchSources();
        fetchGroups();
    }, []);

    const fetchSources = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/sources`);
            setSources(res.data);
        } catch (err) {
            console.error("Failed to fetch sources", err);
        }
    };

    const fetchGroups = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/groups`);
            setGroups(res.data);
        } catch (err) {
            console.error("Failed to fetch groups", err);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm(t('admin.confirm_delete'))) return;
        try {
            await axios.delete(`${API_URL}/api/sources/${id}`);
            fetchSources();
            // Also stop if running
            if (activeStreams.find(s => s.id === id)) {
                onStop(id);
            }
        } catch (err) {
            console.error("Failed to delete source", err);
        }
    };

    const handleSave = async () => {
        try {
            const payload = {
                ...formData,
                group_id: formData.group_id ? parseInt(formData.group_id) : null
            };

            if (editingId) {
                await axios.put(`${API_URL}/api/sources/${editingId}`, payload);
            } else {
                await axios.post(`${API_URL}/api/sources`, payload);
            }
            setEditingId(null);
            setIsAdding(false);
            setFormData({ name: '', source_url: '', type: 'rtsp', group_id: '' });
            fetchSources();
        } catch (err) {
            console.error("Failed to save source", err);
            alert(t('admin.save_failed'));
        }
    };

    const startEdit = (source) => {
        setEditingId(source.id);
        setFormData({
            name: source.name,
            source_url: source.source_url,
            type: source.type,
            group_id: source.group_id || ''
        });
        setIsAdding(false);
    };

    const startAdd = () => {
        setIsAdding(true);
        setEditingId(null);
        setFormData({ name: '', source_url: '', type: 'rtsp', group_id: '' });
    };

    const isRunning = (id) => activeStreams.find(s => s.id === id);

    const getGroupName = (groupId) => {
        const group = groups.find(g => g.id === groupId);
        return group ? group.name : '-';
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', color: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2>{t('admin.title')}</h2>
                <button className="primary" onClick={startAdd} disabled={isAdding || editingId}>
                    <Plus size={16} style={{ marginRight: '0.5rem' }} /> {t('admin.add_camera')}
                </button>
            </div>

            {(isAdding || editingId) && (
                <div className="panel" style={{ marginBottom: '2rem', border: '1px solid #3b82f6' }}>
                    <h3>{editingId ? t('admin.edit_camera') : t('admin.add_camera')}</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                            <label>{t('admin.name')}</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Living Room"
                            />
                        </div>
                        <div>
                            <label>{t('admin.type')}</label>
                            <select
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                            >
                                <option value="rtsp">IP Camera (RTSP)</option>
                                <option value="webcam">Webcam (USB)</option>
                                <option value="file">File</option>
                            </select>
                        </div>
                        <div>
                            <label>{t('admin.group')}</label>
                            <select
                                value={formData.group_id}
                                onChange={e => setFormData({ ...formData, group_id: e.target.value })}
                            >
                                <option value="">{t('admin.no_group')}</option>
                                {groups.map(g => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label>{t('admin.url')}</label>
                            <input
                                type="text"
                                value={formData.source_url}
                                onChange={e => setFormData({ ...formData, source_url: e.target.value })}
                                placeholder={formData.type === 'rtsp' ? "rtsp://..." : "0"}
                            />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button className="primary" onClick={handleSave}>
                            <Save size={16} style={{ marginRight: '0.5rem' }} /> {t('admin.save')}
                        </button>
                        <button className="danger" onClick={() => { setIsAdding(false); setEditingId(null); }}>
                            <X size={16} style={{ marginRight: '0.5rem' }} /> {t('admin.cancel')}
                        </button>
                    </div>
                </div>
            )}

            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#1e293b', borderRadius: '8px', overflow: 'hidden' }}>
                <thead>
                    <tr style={{ background: '#0f172a', textAlign: 'left' }}>
                        <th style={{ padding: '1rem' }}>{t('admin.table.id')}</th>
                        <th style={{ padding: '1rem' }}>{t('admin.table.name')}</th>
                        <th style={{ padding: '1rem' }}>{t('admin.table.group')}</th>
                        <th style={{ padding: '1rem' }}>{t('admin.table.type')}</th>
                        <th style={{ padding: '1rem' }}>{t('admin.table.source')}</th>
                        <th style={{ padding: '1rem' }}>{t('admin.table.status')}</th>
                        <th style={{ padding: '1rem' }}>{t('admin.table.actions')}</th>
                    </tr>
                </thead>
                <tbody>
                    {sources.map(source => (
                        <tr key={source.id} style={{ borderBottom: '1px solid #334155' }}>
                            <td style={{ padding: '1rem' }}>{source.id}</td>
                            <td style={{ padding: '1rem', fontWeight: 'bold' }}>{source.name}</td>
                            <td style={{ padding: '1rem' }}>{getGroupName(source.group_id)}</td>
                            <td style={{ padding: '1rem' }}>
                                <span style={{
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    background: source.type === 'rtsp' ? '#3b82f6' : '#64748b',
                                    fontSize: '0.8rem'
                                }}>
                                    {source.type.toUpperCase()}
                                </span>
                            </td>
                            <td style={{ padding: '1rem', fontFamily: 'monospace', color: '#94a3b8' }}>
                                {source.source_url.length > 30 ? source.source_url.substring(0, 30) + '...' : source.source_url}
                            </td>
                            <td style={{ padding: '1rem' }}>
                                {isRunning(source.id) ? (
                                    <span style={{ color: '#22c55e', fontWeight: 'bold' }}>● {t('admin.status_active')}</span>
                                ) : (
                                    <span style={{ color: '#64748b' }}>○ {t('admin.status_idle')}</span>
                                )}
                            </td>
                            <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
                                {isRunning(source.id) ? (
                                    <button onClick={() => onStop(source.id)} style={{ background: '#ef4444', padding: '6px', border: 'none', borderRadius: '4px', cursor: 'pointer', color: 'white' }} title="Stop">
                                        <Square size={16} />
                                    </button>
                                ) : (
                                    <button onClick={() => onStart(source)} style={{ background: '#22c55e', padding: '6px', border: 'none', borderRadius: '4px', cursor: 'pointer', color: 'white' }} title="Start">
                                        <Play size={16} />
                                    </button>
                                )}
                                <button onClick={() => startEdit(source)} style={{ background: '#3b82f6', padding: '6px', border: 'none', borderRadius: '4px', cursor: 'pointer', color: 'white' }} title="Edit">
                                    <Edit size={16} />
                                </button>
                                <button onClick={() => handleDelete(source.id)} style={{ background: '#ef4444', padding: '6px', border: 'none', borderRadius: '4px', cursor: 'pointer', color: 'white' }} title="Delete">
                                    <Trash2 size={16} />
                                </button>
                            </td>
                        </tr>
                    ))}
                    {sources.length === 0 && (
                        <tr>
                            <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                                {t('admin.no_cameras')}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
