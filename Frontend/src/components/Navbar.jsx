import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, LogOut, BookOpen, User, Plus, KeyRound } from 'lucide-react';

export default function Navbar({ onOpenAuth }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {user ? (
            <>
              <Link to="/dashboard" style={{
                textDecoration: 'none',
                color: 'var(--ink)',
                fontWeight: 600,
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.8rem',
                borderRadius: '8px',
                backgroundColor: 'var(--surface-alt)',
                border: '1px solid var(--border)',
              }}>
                <BookOpen size={16} color="var(--primary)" />
                My Courses
              </Link>

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
