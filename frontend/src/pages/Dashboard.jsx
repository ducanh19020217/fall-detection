import React from 'react';
import StreamGrid from '../components/StreamGrid';
import EventList from '../components/EventList';

export default function Dashboard({ activeStreams, events }) {
    return (
        <div className="main-grid" style={{ height: '100%', padding: '1rem', boxSizing: 'border-box' }}>
            <div className="video-section" style={{ flex: 3, height: '100%', overflow: 'hidden' }}>
                <StreamGrid activeStreams={activeStreams} />
            </div>

            <div className="sidebar" style={{ flex: 1, height: '100%', overflowY: 'auto' }}>
                <EventList events={events} />
            </div>
        </div>
    );
}
