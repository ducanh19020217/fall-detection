import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Settings, Activity, Video, Users, LogOut, Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Navbar() {
    const { t, i18n } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();

    const isActive = (path) => location.pathname === path;

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    const toggleLanguage = () => {
        const newLang = i18n.language === 'vi' ? 'en' : 'vi';
        i18n.changeLanguage(newLang);
    };

    const linkStyle = (path) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        textDecoration: 'none',
        color: isActive(path) ? '#3b82f6' : '#94a3b8',
        fontWeight: isActive(path) ? 'bold' : 'normal',
        cursor: 'pointer'
    });

    return (
        <nav style={{
            background: '#1e293b',
            padding: '1rem 2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #334155'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Activity size={32} color="#3b82f6" />
                <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#f8fafc' }}>{t('login.title')}</h1>
            </div>

            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                <Link to="/" style={linkStyle('/')}>
                    <LayoutDashboard size={20} />
                    {t('nav.dashboard')}
                </Link>
                <Link to="/admin" style={linkStyle('/admin')}>
                    <Settings size={20} />
                    {t('nav.admin')}
                </Link>
                <Link to="/groups" style={linkStyle('/groups')}>
                    <Users size={20} />
                    {t('nav.groups')}
                </Link>
                <Link to="/files" style={linkStyle('/files')}>
                    <Video size={20} />
                    {t('nav.files')}
                </Link>
                <Link to="/demo" style={linkStyle('/demo')}>
                    <Activity size={20} />
                    {t('nav.demo')}
                </Link>

                <button
                    onClick={toggleLanguage}
                    style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid #334155',
                        color: '#94a3b8',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontSize: '0.85rem'
                    }}
                >
                    <Languages size={16} />
                    {i18n.language === 'vi' ? 'EN' : 'VI'}
                </button>

                <button
                    onClick={handleLogout}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '1rem',
                        padding: 0
                    }}
                >
                    <LogOut size={20} />
                    {t('nav.logout')}
                </button>
            </div>
        </nav>
    );
}
