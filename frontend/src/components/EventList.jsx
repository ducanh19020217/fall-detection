import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function EventList({ events }) {
    const { t } = useTranslation();
    return (
        <div className="panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h2>{t('dashboard.recent_alerts')}</h2>
            <div style={{ overflowY: 'auto', flex: 1 }}>
                {events.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>
                        {t('dashboard.no_events')}
                    </div>
                ) : (
                    events.map((event) => (
                        <div key={event.id} className={`event-item alert ${event.is_resolved ? 'resolved' : ''}`}>
                            <div className="event-icon">
                                <AlertTriangle color="#ef4444" size={20} />
                            </div>
                            <div className="event-details">
                                <div className="event-time">
                                    {new Date(event.timestamp).toLocaleTimeString()}
                                </div>
                                <div className="event-score">
                                    {t('dashboard.fall_detected')} ({t('dashboard.score')}: {event.fall_score.toFixed(2)})
                                </div>
                                <div style={{ fontSize: '0.85rem', color: '#3b82f6', fontWeight: '600' }}>
                                    {event.source?.name || `Source ${event.source_id}`}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                    {t('dashboard.track_id')}: {event.track_id}
                                </div>
                                {event.is_resolved && (
                                    <div style={{
                                        marginTop: '4px',
                                        fontSize: '0.75rem',
                                        color: '#10b981',
                                        fontWeight: 'bold',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}>
                                        <span style={{
                                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                            padding: '2px 6px',
                                            borderRadius: '4px'
                                        }}>
                                            ✅ {t('dashboard.resolved')}
                                        </span>
                                        <span style={{ color: '#64748b' }}>
                                            {t('dashboard.by')}: {event.responder_name} ({new Date(event.resolved_at).toLocaleTimeString()})
                                        </span>
                                    </div>
                                )}
                            </div>
                            {event.snapshot_path && (
                                <div className="event-snapshot">
                                    <img
                                        src={`${API_URL}/data/snapshots/${event.snapshot_path.split('/').pop()}`}
                                        alt="Snapshot"
                                        style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }}
                                    />
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
