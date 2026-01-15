import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import Groups from './pages/Groups';
import Login from './pages/Login';
import Files from './pages/Files';
import Demo from './pages/Demo';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Auth Guard Component
const RequireAuth = ({ children }) => {
    const token = localStorage.getItem('token');
    const location = useLocation();

    if (!token) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
};

// Main App Component wrapper to use hooks
const AppContent = () => {
    const [activeStreams, setActiveStreams] = useState([]);
    const [events, setEvents] = useState([]);
    const navigate = useNavigate();

    // Axios Interceptor for 401 and Header Setup
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }

        const interceptor = axios.interceptors.response.use(
            response => response,
            error => {
                if (error.response && error.response.status === 401) {
                    localStorage.removeItem('token');
                    delete axios.defaults.headers.common['Authorization'];
                    navigate('/login');
                }
                return Promise.reject(error);
            }
        );

        return () => {
            axios.interceptors.response.eject(interceptor);
        };
    }, [navigate]);

    // Fetch initial data (active streams)
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        const fetchEvents = async () => {
            const currentToken = localStorage.getItem('token');
            if (!currentToken) return;
            try {
                const res = await axios.get(`${API_URL}/api/events?limit=20`);
                setEvents(res.data);
            } catch (e) { }
        };

        const fetchInitialData = async () => {
            const currentToken = localStorage.getItem('token');
            if (!currentToken) return;

            try {
                // Fetch status and sources in parallel
                const [statusRes, sourcesRes, _] = await Promise.all([
                    axios.get(`${API_URL}/api/pipeline/status`),
                    axios.get(`${API_URL}/api/sources`),
                    fetchEvents() // Also fetch events immediately
                ]);

                const activeIds = statusRes.data.active_source_ids;
                const allSources = sourcesRes.data;

                if (activeIds && activeIds.length > 0) {
                    const restoredStreams = allSources.filter(s => activeIds.includes(s.id));
                    setActiveStreams(restoredStreams);
                }
            } catch (e) {
                console.error("Failed to restore initial data", e);
            }
        };

        fetchInitialData();

        // Poll for events every 5s for better responsiveness
        const interval = setInterval(fetchEvents, 5000);

        return () => clearInterval(interval);
    }, []);

    const handleStart = async (source) => {
        try {
            await axios.post(`${API_URL}/api/pipeline/start`, { source_id: source.id });
            if (!activeStreams.find(s => s.id === source.id)) {
                setActiveStreams([...activeStreams, source]);
            }
        } catch (e) {
            console.error("Failed to start pipeline", e);
            alert("Failed to start pipeline");
        }
    };

    const handleStop = async (sourceId) => {
        try {
            await axios.post(`${API_URL}/api/pipeline/stop?source_id=${sourceId}`);
            setActiveStreams(activeStreams.filter(s => s.id !== sourceId));
        } catch (e) {
            console.error("Failed to stop pipeline", e);
        }
    };

    return (
        <div className="container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
            <Routes>
                <Route path="/login" element={<Login />} />

                <Route path="/*" element={
                    <RequireAuth>
                        <Navbar />
                        <div style={{ flex: 1, overflow: 'auto', background: '#0f172a' }}>
                            <Routes>
                                <Route
                                    path="/"
                                    element={<Dashboard activeStreams={activeStreams} events={events} />}
                                />
                                <Route
                                    path="/admin"
                                    element={<Admin activeStreams={activeStreams} onStart={handleStart} onStop={handleStop} />}
                                />
                                <Route path="/groups" element={<Groups />} />
                                <Route path="/files" element={<Files activeStreams={activeStreams} onStart={handleStart} onStop={handleStop} />} />
                                <Route path="/demo" element={<Demo />} />
                            </Routes>
                        </div>
                    </RequireAuth>
                } />
            </Routes>
        </div>
    );
};

function App() {
    return (
        <Router>
            <AppContent />
        </Router>
    );
}

export default App;
