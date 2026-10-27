import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { GraduationCap, LogOut, BookOpen, User, Bell, Check, ExternalLink } from 'lucide-react';

export default function Navbar({ onOpenAuth }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const countRes = await api.get('/notifications/unread-count');
      setUnreadCount(countRes.data?.unreadCount || 0);

      const notifRes = await api.get('/notifications');
      setNotifications(notifRes.data || []);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 15000); // Poll every 15s
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setUnreadCount(0);
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    } catch (e) {
      // ignore
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header style={{
      backgroundColor: '#FFFFFF',
      borderBottom: '1px solid var(--border)',
      position: 'sticky',
      top: 0,
      zIndex: 40,
    }}>
      <div style={{
        maxWidth: '1240px',
        margin: '0 auto',
        padding: '0.85rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* Brand Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', color: 'var(--ink)' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            backgroundColor: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontWeight: 800,
            fontSize: '1.1rem',
          }}>
            CM
          </div>
          <div>
            <div className="font-display" style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              Campus Master
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--ink-muted)', fontWeight: 500 }}>
              Course-Centric Platform
            </div>
          </div>
        </Link>

        {/* User Navigation / Auth Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          {user ? (
            <>
              <Link to="/dashboard" style={{
                textDecoration: 'none',
                color: 'var(--ink)',
                fontWeight: 600,
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.8rem',
                borderRadius: '8px',
                backgroundColor: 'var(--surface-alt)',
                border: '1px solid var(--border)',
              }}>
                <BookOpen size={16} color="var(--primary)" />
                <span>My Courses</span>
              </Link>

              {/* Notification Bell */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  style={{
                    background: 'var(--surface-alt)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '0.45rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--ink)',
                    position: 'relative',
                  }}
                  title="Notifications"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      backgroundColor: 'var(--primary)',
                      color: '#FFFFFF',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      borderRadius: '9999px',
                      minWidth: '16px',
                      height: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 3px',
                    }}>
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {isNotifOpen && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: '320px',
                    maxHeight: '380px',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '16px',
                    boxShadow: 'var(--shadow-elevation)',
                    border: '1px solid var(--border)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 50,
                  }}>
                    <div style={{
                      padding: '0.75rem 1rem',
                      borderBottom: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: 'var(--surface-alt)',
                    }}>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--primary)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>

                    <div style={{ overflowY: 'auto', flex: 1, padding: '0.5rem 0' }}>
                      {notifications.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', fontSize: '0.82rem', color: 'var(--ink-muted)' }}>
                          No notifications yet.
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            style={{
                              padding: '0.65rem 1rem',
                              borderBottom: '1px solid var(--border)',
                              backgroundColor: notif.read ? '#FFFFFF' : 'var(--primary-soft)',
                            }}
                          >
                            <div style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--ink)', marginBottom: '2px' }}>
                              {notif.title}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', lineHeight: 1.4 }}>
                              {notif.message}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--ink-muted)', marginTop: '4px' }}>
                              {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Profile Pill */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.35rem 0.85rem',
                borderRadius: '9999px',
                backgroundColor: 'var(--canvas)',
                border: '1px solid var(--border)',
              }}>
                <div style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  backgroundColor: user.role === 'FACULTY' ? 'var(--primary)' : 'var(--info-text)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink)', lineHeight: 1.1 }}>
                    {user.name}
                  </div>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: user.role === 'FACULTY' ? 'var(--primary-dark)' : 'var(--info-text)',
                    fontFamily: 'var(--font-code)',
                  }}>
                    {user.role}
                  </span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '0.45rem 0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.85rem',
                  color: 'var(--danger-text)',
                  fontWeight: 500,
                }}
                title="Log Out"
              >
                <LogOut size={15} />
                <span>Exit</span>
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                onClick={() => onOpenAuth('login')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '0.92rem',
                  fontWeight: 600,
                  color: 'var(--ink)',
                  cursor: 'pointer',
                  padding: '0.5rem 1rem',
                }}
              >
                Sign In
              </button>

              <button
                onClick={() => onOpenAuth('register')}
                className="btn-primary"
                style={{ minHeight: '42px', padding: '0 1.25rem', fontSize: '0.88rem' }}
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
