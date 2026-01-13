import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Trash2, Edit, Plus, Play, Square, Save, X, Video } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Cameras({ activeStreams, onStart, onStop }) {
    const [sources, setSources] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ name: '', source_url: '', type: 'rtsp' });
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        fetchSources();
    }, []);

    const fetchSources = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/sources`);
            // Filter only cameras
            setSources(res.data.filter(s => s.type !== 'file'));
        } catch (err) {
            console.error("Failed to fetch sources", err);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to delete this camera?")) return;
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

    const handleSave = async () => {
        try {
            if (editingId) {
                await axios.put(`${API_URL}/api/sources/${editingId}`, formData);
            } else {
                await axios.post(`${API_URL}/api/sources`, formData);
            }
            setEditingId(null);
            setIsAdding(false);
            setFormData({ name: '', source_url: '', type: 'rtsp' });
            fetchSources();
        } catch (err) {
            console.error("Failed to save source", err);
            alert("Failed to save source");
        }
    };

    const startEdit = (source) => {
        setEditingId(source.id);
        setFormData({ name: source.name, source_url: source.source_url, type: source.type });
        setIsAdding(false);
    };

    const startAdd = () => {
        setIsAdding(true);
        setEditingId(null);
        setFormData({ name: '', source_url: '', type: 'rtsp' });
    };

    const isRunning = (id) => activeStreams.find(s => s.id === id);

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', color: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Video size={32} color="#3b82f6" />
                    <h2>Camera Management</h2>
                </div>
                <button className="primary" onClick={startAdd} disabled={isAdding || editingId}>
                    <Plus size={16} style={{ marginRight: '0.5rem' }} /> Add Camera
                </button>
            </div>

            {(isAdding || editingId) && (
                <div className="panel" style={{ marginBottom: '2rem', border: '1px solid #3b82f6' }}>
                    <h3>{editingId ? 'Edit Camera' : 'Add New Camera'}</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                            <label>Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Living Room"
                            />
                        </div>
                        <div>
                            <label>Type</label>
                            <select
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                            >
                                <option value="rtsp">IP Camera (RTSP)</option>
                                <option value="webcam">Webcam (USB)</option>
                            </select>
                        </div>
                        <div>
                            <label>URL / Index</label>
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
                            <Save size={16} style={{ marginRight: '0.5rem' }} /> Save
                        </button>
                        <button className="danger" onClick={() => { setIsAdding(false); setEditingId(null); }}>
                            <X size={16} style={{ marginRight: '0.5rem' }} /> Cancel
                        </button>
                    </div>
                </div>
            )}

            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#1e293b', borderRadius: '8px', overflow: 'hidden' }}>
                <thead>
                    <tr style={{ background: '#0f172a', textAlign: 'left' }}>
                        <th style={{ padding: '1rem' }}>ID</th>
                        <th style={{ padding: '1rem' }}>Name</th>
                        <th style={{ padding: '1rem' }}>Type</th>
                        <th style={{ padding: '1rem' }}>URL / Index</th>
                        <th style={{ padding: '1rem' }}>Status</th>
                        <th style={{ padding: '1rem' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {sources.map(source => (
                        <tr key={source.id} style={{ borderBottom: '1px solid #334155' }}>
                            <td style={{ padding: '1rem' }}>{source.id}</td>
                            <td style={{ padding: '1rem', fontWeight: 'bold' }}>{source.name}</td>
                            <td style={{ padding: '1rem' }}>
                                <span style={{
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    background: source.type === 'rtsp' ? '#3b82f6' : '#8b5cf6',
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
                                    <span style={{ color: '#22c55e', fontWeight: 'bold' }}>● Active</span>
                                ) : (
                                    <span style={{ color: '#64748b' }}>○ Idle</span>
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
                            <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                                No cameras found.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
