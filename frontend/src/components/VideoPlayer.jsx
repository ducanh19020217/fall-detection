import React, { useEffect, useRef, useState } from 'react';

export default function VideoPlayer({ wsUrl, isStreaming }) {
    const canvasRef = useRef(null);
    const wsRef = useRef(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!isStreaming) {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            return;
        }

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        wsRef.current = new WebSocket(wsUrl);
        wsRef.current.binaryType = 'arraybuffer';

        wsRef.current.onopen = () => {
            console.log('WebSocket Connected');
            setError(null);
        };

        wsRef.current.onmessage = (event) => {
            if (typeof event.data === 'string') {
                // Handle metadata (events) if needed
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'events') {
                        // Dispatch event to parent or global store if needed
                        // For now, we just log it or handle it in App.jsx via a callback prop if we passed one
                        // But since App.jsx will likely poll or use a separate mechanism, we might ignore here
                        // OR better: pass a callback `onEvent` prop
                    }
                } catch (e) { }
            } else {
                // Handle binary frame
                const blob = new Blob([event.data], { type: 'image/jpeg' });
                const url = URL.createObjectURL(blob);
                const img = new Image();
                img.onload = () => {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    URL.revokeObjectURL(url);
                };
                img.src = url;
            }
        };

        wsRef.current.onerror = (e) => {
            console.error('WebSocket Error', e);
            setError('Connection Error');
        };

        wsRef.current.onclose = () => {
            console.log('WebSocket Disconnected');
        };

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [isStreaming, wsUrl]);

    return (
        <div className="video-container" style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {!isStreaming && <div className="placeholder">Waiting for stream...</div>}
            {error && <div className="error">{error}</div>}
            <canvas ref={canvasRef} style={{ maxWidth: '100%', maxHeight: '100%', display: isStreaming ? 'block' : 'none' }} />
        </div>
    );
}
