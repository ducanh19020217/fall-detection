import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Login() {
    const { t, i18n } = useTranslation();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const formData = new FormData();
            formData.append('username', username);
            formData.append('password', password);

            const res = await axios.post(`${API_URL}/api/token`, formData, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            const token = res.data.access_token;
            localStorage.setItem('token', token);
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            navigate('/');
        } catch (err) {
            console.error("Login failed", err);
            setError(t('login.error'));
        }
    };

    const toggleLanguage = () => {
        const newLang = i18n.language === 'vi' ? 'en' : 'vi';
        i18n.changeLanguage(newLang);
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            background: '#0f172a',
            color: '#f8fafc',
            gap: '1rem'
        }}>
            <div style={{
                padding: '2rem',
                background: '#1e293b',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                width: '100%',
                maxWidth: '400px',
                position: 'relative'
            }}>
                <button
                    onClick={toggleLanguage}
                    style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid #334155',
                        color: '#94a3b8',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontSize: '0.8rem'
                    }}
                >
                    <Languages size={14} />
                    {i18n.language === 'vi' ? 'EN' : 'VI'}
                </button>

                <h2 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>{t('login.title')}</h2>
                <p style={{ textAlign: 'center', color: '#94a3b8', marginBottom: '2rem', fontSize: '0.9rem' }}>{t('login.subtitle')}</p>

                {error && (
                    <div style={{
                        background: '#ef444420',
                        color: '#ef4444',
                        padding: '0.75rem',
                        borderRadius: '4px',
                        marginBottom: '1rem',
                        textAlign: 'center'
                    }}>
                        {error}
                    </div>
                )}
                <form onSubmit={handleLogin}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>{t('login.username')}</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: '4px',
                                border: '1px solid #334155',
                                background: '#0f172a',
                                color: 'white'
                            }}
                            required
                        />
                    </div>
                    <div style={{ marginBottom: '2rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>{t('login.password')}</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: '4px',
                                border: '1px solid #334155',
                                background: '#0f172a',
                                color: 'white'
                            }}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="primary"
                        style={{ width: '100%', justifyContent: 'center' }}
                    >
                        {t('login.button')}
                    </button>
                </form>
            </div>
        </div>
    );
}
