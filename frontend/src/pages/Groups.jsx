import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Trash2, Edit, Plus, Save, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Groups() {
    const { t } = useTranslation();
    const [groups, setGroups] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ name: '', chat_id: '', bot_token: '' });
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        fetchGroups();
    }, []);

    const fetchGroups = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/groups`);
            setGroups(res.data);
        } catch (err) {
            console.error("Failed to fetch groups", err);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm(t('groups.confirm_delete'))) return;
        try {
            await axios.delete(`${API_URL}/api/groups/${id}`);
            fetchGroups();
        } catch (err) {
            console.error("Failed to delete group", err);
        }
    };

    const handleSave = async () => {
        try {
            if (editingId) {
                await axios.put(`${API_URL}/api/groups/${editingId}`, formData);
            } else {
                await axios.post(`${API_URL}/api/groups`, formData);
            }
            setEditingId(null);
            setIsAdding(false);
            setFormData({ name: '', chat_id: '', bot_token: '' });
            fetchGroups();
        } catch (err) {
            console.error("Failed to save group", err);
            alert(t('groups.save_failed'));
        }
    };

    const startEdit = (group) => {
        setEditingId(group.id);
        setFormData({ name: group.name, chat_id: group.chat_id || '', bot_token: group.bot_token || '' });
        setIsAdding(false);
    };

    const startAdd = () => {
        setIsAdding(true);
        setEditingId(null);
        setFormData({ name: '', chat_id: '', bot_token: '' });
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', color: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2>{t('groups.title')}</h2>
                <button className="primary" onClick={startAdd} disabled={isAdding || editingId}>
                    <Plus size={16} style={{ marginRight: '0.5rem' }} /> {t('groups.add_group')}
                </button>
            </div>

            {(isAdding || editingId) && (
                <div className="panel" style={{ marginBottom: '2rem', border: '1px solid #3b82f6' }}>
                    <h3>{editingId ? t('groups.edit_group') : t('groups.add_group')}</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                            <label>{t('groups.name')}</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Office Cameras"
                            />
                        </div>
                        <div>
                            <label>{t('groups.chat_id')}</label>
                            <input
                                type="text"
                                value={formData.chat_id}
                                onChange={e => setFormData({ ...formData, chat_id: e.target.value })}
                                placeholder={t('groups.optional')}
                            />
                        </div>
                        <div>
                            <label>{t('groups.bot_token')}</label>
                            <input
                                type="text"
                                value={formData.bot_token}
                                onChange={e => setFormData({ ...formData, bot_token: e.target.value })}
                                placeholder={t('groups.optional')}
                            />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button className="primary" onClick={handleSave}>
                            <Save size={16} style={{ marginRight: '0.5rem' }} /> {t('groups.save')}
                        </button>
                        <button className="danger" onClick={() => { setIsAdding(false); setEditingId(null); }}>
                            <X size={16} style={{ marginRight: '0.5rem' }} /> {t('groups.cancel')}
                        </button>
                    </div>
                </div>
            )}

            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#1e293b', borderRadius: '8px', overflow: 'hidden' }}>
                <thead>
                    <tr style={{ background: '#0f172a', textAlign: 'left' }}>
                        <th style={{ padding: '1rem' }}>{t('groups.table.id')}</th>
                        <th style={{ padding: '1rem' }}>{t('groups.table.name')}</th>
                        <th style={{ padding: '1rem' }}>{t('groups.table.chat_id')}</th>
                        <th style={{ padding: '1rem' }}>{t('groups.table.actions')}</th>
                    </tr>
                </thead>
                <tbody>
                    {groups.map(group => (
                        <tr key={group.id} style={{ borderBottom: '1px solid #334155' }}>
                            <td style={{ padding: '1rem' }}>{group.id}</td>
                            <td style={{ padding: '1rem', fontWeight: 'bold' }}>{group.name}</td>
                            <td style={{ padding: '1rem', fontFamily: 'monospace', color: '#94a3b8' }}>
                                {group.chat_id || '-'}
                            </td>
                            <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
                                <button onClick={() => startEdit(group)} style={{ background: '#3b82f6', padding: '6px', border: 'none', borderRadius: '4px', cursor: 'pointer', color: 'white' }} title="Edit">
                                    <Edit size={16} />
                                </button>
                                <button onClick={() => handleDelete(group.id)} style={{ background: '#ef4444', padding: '6px', border: 'none', borderRadius: '4px', cursor: 'pointer', color: 'white' }} title="Delete">
                                    <Trash2 size={16} />
                                </button>
                            </td>
                        </tr>
                    ))}
                    {groups.length === 0 && (
                        <tr>
                            <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                                {t('groups.no_groups')}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
