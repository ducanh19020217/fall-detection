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
                        <div key={event.id} className="event-item alert">
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
                                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                    {t('dashboard.track_id')}: {event.track_id}
                                </div>
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
