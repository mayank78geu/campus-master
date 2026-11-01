import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { 
  Home, BookOpen, Calendar, Bell, Users, LayoutGrid, LogOut, Layers, Menu, X, Megaphone
} from 'lucide-react';

export default function Sidebar({ activeNav }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isFaculty = user?.role === 'FACULTY';
  const queryParams = new URLSearchParams(location.search);
  const currentTab = queryParams.get('tab');
  const nav = activeNav || currentTab || (isFaculty ? 'overview' : 'home');

  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile drawer when route/tab changes
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    let mounted = true;
    const fetchCounts = async () => {
      try {
        const notifRes = await api.get('/notifications/unread-count');
        if (mounted && notifRes.data?.unreadCount !== undefined) {
          setUnreadCount(notifRes.data.unreadCount);
        }
      } catch (e) {}

      if (isFaculty) {
        try {
          const reqRes = await api.get('/faculty/join-requests');
          if (mounted && Array.isArray(reqRes.data)) {
            setPendingRequestsCount(reqRes.data.length);
          }
        } catch (e) {}
      }
    };
    fetchCounts();
    return () => { mounted = false; };
  }, [isFaculty, location.key]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Get initials for avatar
  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <>
      {/* Mobile Top App Bar (visible on screens <= 1024px) */}
      <header className="cm-mobile-top-bar">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation menu"
          style={{
            background: 'none',
            border: 'none',
            color: '#FFFFFF',
            cursor: 'pointer',
            padding: '0.4rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
          }}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', textDecoration: 'none', color: '#FFFFFF' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            backgroundColor: '#152542',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L3 7L12 12L21 7L12 2Z" fill="#5EE0C4" />
              <path d="M3 12L12 17L21 12" stroke="#5EE0C4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="font-display" style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Campus Master
          </span>
        </Link>

        <Link
          to="/dashboard?tab=notifications"
          style={{
            position: 'relative',
            color: '#94A3B8',
            padding: '0.4rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#10B981',
            }} />
          )}
        </Link>
      </header>

      {/* Backdrop for Mobile Drawer */}
      <div 
        className={`cm-drawer-backdrop ${mobileOpen ? 'open' : ''}`}
        onClick={() => setMobileOpen(false)} 
      />

      <aside 
        className={`cm-sidebar-desktop ${mobileOpen ? 'open' : ''}`}
        style={{
          width: '240px',
          minWidth: '240px',
          backgroundColor: '#0B132B',
          color: '#FFFFFF',
          height: '100vh',
          position: 'sticky',
          top: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '1.75rem 1.1rem 1.5rem',
          zIndex: 50,
          boxShadow: '4px 0 15px rgba(0, 0, 0, 0.08)',
        }}
      >
        {/* Top Section */}
        <div>
          {/* Brand Logo & Name */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
            <Link 
              to="/dashboard" 
              onClick={() => setMobileOpen(false)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.85rem', 
                textDecoration: 'none', 
                color: '#FFFFFF',
                padding: '0 0.5rem',
              }}
            >
              {/* Custom Teal Stacked Layers Icon */}
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#152542',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L3 7L12 12L21 7L12 2Z" fill="#5EE0C4" />
                  <path d="M3 12L12 17L21 12" stroke="#5EE0C4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M3 17L12 22L21 17" stroke="#5EE0C4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              <div className="font-display" style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#FFFFFF' }}>
                  Campus
                </span>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#FFFFFF' }}>
                  Master
                </span>
              </div>
            </Link>

            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              style={{
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '0.35rem',
                display: mobileOpen ? 'flex' : 'none',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
              }}
            >
              <X size={20} />
            </button>
          </div>

        {/* Navigation List */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {isFaculty ? (
            <>
              {/* Overview */}
              <Link
                to="/dashboard?tab=overview"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontSize: '0.92rem',
                  fontWeight: nav === 'overview' ? 700 : 500,
                  color: nav === 'overview' ? '#FFFFFF' : '#94A3B8',
                  backgroundColor: nav === 'overview' ? '#1A2639' : 'transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <LayoutGrid size={18} color={nav === 'overview' ? '#FFFFFF' : '#94A3B8'} />
                <span>Overview</span>
              </Link>

              {/* My courses */}
              <Link
                to="/dashboard?tab=courses"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontSize: '0.92rem',
                  fontWeight: nav === 'courses' ? 700 : 500,
                  color: nav === 'courses' ? '#FFFFFF' : '#94A3B8',
                  backgroundColor: nav === 'courses' ? '#1A2639' : 'transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <BookOpen size={18} color={nav === 'courses' ? '#FFFFFF' : '#94A3B8'} />
                <span>My courses</span>
              </Link>

              {/* Announcements */}
              <Link
                to="/dashboard?tab=announcements"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontSize: '0.92rem',
                  fontWeight: nav === 'announcements' ? 700 : 500,
                  color: nav === 'announcements' ? '#FFFFFF' : '#94A3B8',
                  backgroundColor: nav === 'announcements' ? '#1A2639' : 'transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <Megaphone size={18} color={nav === 'announcements' ? '#5EE0C4' : '#94A3B8'} />
                <span>Announcements</span>
              </Link>

              {/* Join requests with badge */}
              <Link
                to="/dashboard?tab=requests"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontSize: '0.92rem',
                  fontWeight: nav === 'requests' ? 700 : 500,
                  color: nav === 'requests' ? '#FFFFFF' : '#94A3B8',
                  backgroundColor: nav === 'requests' ? '#1A2639' : 'transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <Users size={18} color={nav === 'requests' ? '#FFFFFF' : '#94A3B8'} />
                  <span>Join requests</span>
                </div>
                {pendingRequestsCount > 0 && (
                  <span style={{
                    backgroundColor: '#10B981',
                    color: '#0B132B',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    fontFamily: 'var(--font-code)',
                    borderRadius: '9999px',
                    padding: '0.15rem 0.55rem',
                    lineHeight: 1.2,
                  }}>
                    {pendingRequestsCount}
                  </span>
                )}
              </Link>

              {/* Notifications */}
              <Link
                to="/dashboard?tab=notifications"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontSize: '0.92rem',
                  fontWeight: nav === 'notifications' ? 700 : 500,
                  color: nav === 'notifications' ? '#FFFFFF' : '#94A3B8',
                  backgroundColor: nav === 'notifications' ? '#1A2639' : 'transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <Bell size={18} color={nav === 'notifications' ? '#FFFFFF' : '#94A3B8'} />
                  <span>Notifications</span>
                </div>
                {unreadCount > 0 && (
                  <span style={{
                    backgroundColor: '#10B981',
                    color: '#0B132B',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    fontFamily: 'var(--font-code)',
                    borderRadius: '9999px',
                    padding: '0.15rem 0.55rem',
                    lineHeight: 1.2,
                  }}>
                    {unreadCount}
                  </span>
                )}
              </Link>
            </>
          ) : (
            <>
              {/* Home */}
              <Link
                to="/dashboard?tab=home"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontSize: '0.92rem',
                  fontWeight: nav === 'home' ? 700 : 500,
                  color: nav === 'home' ? '#FFFFFF' : '#94A3B8',
                  backgroundColor: nav === 'home' ? '#1A2639' : 'transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <Home size={18} color={nav === 'home' ? '#FFFFFF' : '#94A3B8'} />
                <span>Home</span>
              </Link>

              {/* My courses */}
              <Link
                to="/dashboard?tab=courses"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontSize: '0.92rem',
                  fontWeight: nav === 'courses' ? 700 : 500,
                  color: nav === 'courses' ? '#FFFFFF' : '#94A3B8',
                  backgroundColor: nav === 'courses' ? '#1A2639' : 'transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <BookOpen size={18} color={nav === 'courses' ? '#FFFFFF' : '#94A3B8'} />
                <span>My courses</span>
              </Link>

              {/* Deadlines */}
              <Link
                to="/dashboard?tab=deadlines"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontSize: '0.92rem',
                  fontWeight: nav === 'deadlines' ? 700 : 500,
                  color: nav === 'deadlines' ? '#FFFFFF' : '#94A3B8',
                  backgroundColor: nav === 'deadlines' ? '#1A2639' : 'transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <Calendar size={18} color={nav === 'deadlines' ? '#FFFFFF' : '#94A3B8'} />
                <span>Deadlines</span>
              </Link>

              {/* Notifications with badge */}
              <Link
                to="/dashboard?tab=notifications"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontSize: '0.92rem',
                  fontWeight: nav === 'notifications' ? 700 : 500,
                  color: nav === 'notifications' ? '#FFFFFF' : '#94A3B8',
                  backgroundColor: nav === 'notifications' ? '#1A2639' : 'transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <Bell size={18} color={nav === 'notifications' ? '#FFFFFF' : '#94A3B8'} />
                  <span>Notifications</span>
                </div>
                {unreadCount > 0 && (
                  <span style={{
                    backgroundColor: '#10B981',
                    color: '#0B132B',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    fontFamily: 'var(--font-code)',
                    borderRadius: '9999px',
                    padding: '0.15rem 0.55rem',
                    lineHeight: 1.2,
                  }}>
                    {unreadCount}
                  </span>
                )}
              </Link>
            </>
          )}
        </nav>
      </div>

      {/* Bottom Profile Widget */}
      <div style={{
        backgroundColor: '#131F33',
        borderRadius: '14px',
        padding: '0.75rem 0.85rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        border: '1px solid #1C2D4A',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
          {/* Avatar circle */}
          <div style={{
            width: '36px',
            height: '36px',
            minWidth: '36px',
            borderRadius: '50%',
            backgroundColor: isFaculty ? '#FFFFFF' : '#5EE0C4',
            color: '#0B132B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '0.85rem',
          }}>
            {getInitials(user?.name)}
          </div>

          <div style={{ overflow: 'hidden' }}>
            <div style={{
              fontSize: '0.88rem',
              fontWeight: 700,
              color: '#FFFFFF',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
            }}>
              {user?.name || (isFaculty ? 'Prof. Faculty' : 'Student')}
            </div>
            <div style={{
              fontSize: '0.72rem',
              color: '#94A3B8',
              textTransform: 'capitalize',
            }}>
              {user?.role?.toLowerCase() || 'Student'}
            </div>
          </div>
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          title="Sign out"
          style={{
            background: 'none',
            border: 'none',
            color: '#64748B',
            cursor: 'pointer',
            padding: '0.35rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '6px',
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#EF4444'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#64748B'}
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>

      {/* Mobile Bottom Navigation Bar (fixed on mobile <= 768px) */}
      <nav className="cm-mobile-bottom-nav">
        {isFaculty ? (
          <>
            <Link
              to="/dashboard?tab=overview"
              className={`cm-mobile-nav-item ${nav === 'overview' ? 'active' : ''}`}
            >
              <LayoutGrid size={18} />
              <span>Overview</span>
            </Link>
            <Link
              to="/dashboard?tab=courses"
              className={`cm-mobile-nav-item ${nav === 'courses' ? 'active' : ''}`}
            >
              <BookOpen size={18} />
              <span>Courses</span>
            </Link>
            <Link
              to="/dashboard?tab=announcements"
              className={`cm-mobile-nav-item ${nav === 'announcements' ? 'active' : ''}`}
            >
              <Megaphone size={18} />
              <span>Announce</span>
            </Link>
            <Link
              to="/dashboard?tab=requests"
              className={`cm-mobile-nav-item ${nav === 'requests' ? 'active' : ''}`}
            >
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Users size={18} />
                {pendingRequestsCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-8px',
                    backgroundColor: '#10B981',
                    color: '#0B132B',
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    fontFamily: 'var(--font-code)',
                    borderRadius: '999px',
                    padding: '0 0.35rem',
                    lineHeight: 1.2,
                  }}>
                    {pendingRequestsCount}
                  </span>
                )}
              </div>
              <span>Requests</span>
            </Link>
            <Link
              to="/dashboard?tab=notifications"
              className={`cm-mobile-nav-item ${nav === 'notifications' ? 'active' : ''}`}
            >
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-8px',
                    backgroundColor: '#10B981',
                    color: '#0B132B',
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    fontFamily: 'var(--font-code)',
                    borderRadius: '999px',
                    padding: '0 0.35rem',
                    lineHeight: 1.2,
                  }}>
                    {unreadCount}
                  </span>
                )}
              </div>
              <span>Alerts</span>
            </Link>
          </>
        ) : (
          <>
            <Link
              to="/dashboard?tab=home"
              className={`cm-mobile-nav-item ${nav === 'home' ? 'active' : ''}`}
            >
              <Home size={18} />
              <span>Home</span>
            </Link>
            <Link
              to="/dashboard?tab=courses"
              className={`cm-mobile-nav-item ${nav === 'courses' ? 'active' : ''}`}
            >
              <BookOpen size={18} />
              <span>Courses</span>
            </Link>
            <Link
              to="/dashboard?tab=deadlines"
              className={`cm-mobile-nav-item ${nav === 'deadlines' ? 'active' : ''}`}
            >
              <Calendar size={18} />
              <span>Deadlines</span>
            </Link>
            <Link
              to="/dashboard?tab=notifications"
              className={`cm-mobile-nav-item ${nav === 'notifications' ? 'active' : ''}`}
            >
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-8px',
                    backgroundColor: '#10B981',
                    color: '#0B132B',
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    fontFamily: 'var(--font-code)',
                    borderRadius: '999px',
                    padding: '0 0.35rem',
                    lineHeight: 1.2,
                  }}>
                    {unreadCount}
                  </span>
                )}
              </div>
              <span>Alerts</span>
            </Link>
          </>
        )}
      </nav>
    </>
  );
}
