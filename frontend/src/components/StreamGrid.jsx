import React from 'react';
import VideoPlayer from './VideoPlayer';
import { useTranslation } from 'react-i18next';

export default function StreamGrid({ activeStreams }) {
    const { t } = useTranslation();
    const count = activeStreams.length;

    // Determine grid columns based on count
    let gridStyle = {
        display: 'grid',
        gap: '1rem',
        width: '100%',
        height: '100%',
        gridTemplateColumns: '1fr', // Default 1 column
        gridTemplateRows: '1fr'
    };

    if (count > 1 && count <= 4) {
        gridStyle.gridTemplateColumns = '1fr 1fr';
        gridStyle.gridTemplateRows = '1fr 1fr';
    } else if (count > 4) {
        gridStyle.gridTemplateColumns = '1fr 1fr 1fr';
        gridStyle.gridTemplateRows = '1fr 1fr 1fr';
    }

    if (count === 0) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#64748b' }}>
                {t('dashboard.no_streams')}
            </div>
        );
    }

    return (
        <div style={gridStyle}>
            {activeStreams.map(stream => (
                <div key={stream.id} style={{ position: 'relative', background: '#000', borderRadius: '8px', overflow: 'hidden' }}>
                    <VideoPlayer
                        wsUrl={`ws://localhost:8000/api/ws/stream/${stream.id}`}
                        isStreaming={true}
                    />
                    <div style={{
                        position: 'absolute',
                        top: '10px',
                        left: '10px',
                        background: 'rgba(0,0,0,0.6)',
                        color: '#fff',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.8rem'
                    }}>
                        {stream.name} (ID: {stream.id})
                    </div>
                </div>
            ))}
        </div>
    );
}
