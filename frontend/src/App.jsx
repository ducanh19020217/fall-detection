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

        const fetchInitialData = async () => {
            console.log("Fetching initial data to restore streams...");
            try {
                // 1. Fetch active pipeline IDs
                const statusRes = await axios.get(`${API_URL}/api/pipeline/status`);
                const activeIds = statusRes.data.active_source_ids;
                console.log("Active pipeline IDs:", activeIds);

                if (activeIds && activeIds.length > 0) {
                    // 2. Fetch all sources to get details for active ones
                    const sourcesRes = await axios.get(`${API_URL}/api/sources`);
                    const allSources = sourcesRes.data;

                    const restoredStreams = allSources.filter(s => activeIds.includes(s.id));
                    console.log("Restored streams:", restoredStreams);
                    setActiveStreams(restoredStreams);
                }
            } catch (e) {
                console.error("Failed to restore active streams", e);
            }
        };

        fetchInitialData();

        // Poll for events
        const interval = setInterval(async () => {
            const currentToken = localStorage.getItem('token');
            if (!currentToken) return;

            try {
                const res = await axios.get(`${API_URL}/api/events?limit=20`);
                setEvents(res.data);
            } catch (e) {
                // Silent fail for polling
            }
        }, 10000); // Poll events every 10s instead of 30s for better UX

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
