import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, GraduationCap, Briefcase, Mail, Lock, User, AlertCircle } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, initialMode = 'login', initialRole = 'FACULTY' }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState(initialMode); // 'login' or 'register'
  const [role, setRole] = useState(initialRole); // 'FACULTY' or 'STUDENT'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(name, email, password, role);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 27, 45, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '1rem',
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '460px',
        boxShadow: 'var(--shadow-elevation)',
        overflow: 'hidden',
        border: '1px solid var(--border)',
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <h3 className="font-display" style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--ink)' }}>
              {mode === 'login' ? 'Welcome Back' : 'Create Your Account'}
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', marginTop: '2px' }}>
              {mode === 'login' ? 'Enter your academic credentials' : 'Join Campus Master to teach or learn'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--ink-muted)',
              padding: '4px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Toggle */}
        <div style={{ padding: '1rem 1.5rem 0.5rem' }}>
          <div style={{
            display: 'flex',
            backgroundColor: 'var(--canvas)',
            borderRadius: '12px',
            padding: '4px',
            border: '1px solid var(--border)',
          }}>
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); }}
              style={{
                flex: 1,
                padding: '0.5rem',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.88rem',
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: mode === 'login' ? '#FFFFFF' : 'transparent',
                color: mode === 'login' ? 'var(--ink)' : 'var(--ink-muted)',
                boxShadow: mode === 'login' ? 'var(--shadow-subtle)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(''); }}
              style={{
                flex: 1,
                padding: '0.5rem',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.88rem',
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: mode === 'register' ? '#FFFFFF' : 'transparent',
                color: mode === 'register' ? 'var(--ink)' : 'var(--ink-muted)',
                boxShadow: mode === 'register' ? 'var(--shadow-subtle)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              Register
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            margin: '0.75rem 1.5rem 0',
            padding: '0.65rem 0.9rem',
            backgroundColor: 'var(--danger-bg)',
            color: 'var(--danger-text)',
            borderRadius: '8px',
            fontSize: '0.84rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.25rem 1.5rem' }}>
          {mode === 'register' && (
            <>
              {/* Role Selector */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '0.35rem' }}>
                  I am registering as:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setRole('FACULTY')}
                    style={{
                      padding: '0.65rem',
                      borderRadius: '12px',
                      border: role === 'FACULTY' ? '2px solid var(--primary)' : '1px solid var(--border)',
                      backgroundColor: role === 'FACULTY' ? 'var(--primary-soft)' : '#FFFFFF',
                      color: role === 'FACULTY' ? 'var(--primary-dark)' : 'var(--ink)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                    }}
                  >
                    <Briefcase size={20} color={role === 'FACULTY' ? 'var(--primary)' : 'var(--ink-muted)'} />
                    Faculty
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('STUDENT')}
                    style={{
                      padding: '0.65rem',
                      borderRadius: '12px',
                      border: role === 'STUDENT' ? '2px solid var(--primary)' : '1px solid var(--border)',
                      backgroundColor: role === 'STUDENT' ? 'var(--primary-soft)' : '#FFFFFF',
                      color: role === 'STUDENT' ? 'var(--primary-dark)' : 'var(--ink)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                    }}
                  >
                    <GraduationCap size={20} color={role === 'STUDENT' ? 'var(--primary)' : 'var(--ink-muted)'} />
                    Student
                  </button>
                </div>
              </div>

              {/* Full Name */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '0.35rem' }}>
                  Full Name
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={16} color="var(--ink-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    required
                    placeholder={role === 'FACULTY' ? 'Prof. Sharma' : 'Mayank Kumar'}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem 0.65rem 2.25rem',
                      borderRadius: '10px',
                      border: '1px solid var(--border-input)',
                      fontSize: '0.9rem',
                      backgroundColor: 'var(--surface-alt)',
                    }}
                  />
                </div>
              </div>
            </>
          )}

          {/* Email */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '0.35rem' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="var(--ink-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="email"
                required
                placeholder="name@geu.ac.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.75rem 0.65rem 2.25rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-input)',
                  fontSize: '0.9rem',
                  backgroundColor: 'var(--surface-alt)',
                }}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '0.35rem' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="var(--ink-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.75rem 0.65rem 2.25rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-input)',
                  fontSize: '0.9rem',
                  backgroundColor: 'var(--surface-alt)',
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary"
            style={{ width: '100%', minHeight: '46px', opacity: submitting ? 0.7 : 1 }}
          >
            {submitting ? 'Please wait...' : (mode === 'login' ? 'Sign In to Campus Master' : `Register as ${role === 'FACULTY' ? 'Faculty' : 'Student'}`)}
          </button>
        </form>
      </div>
    </div>
  );
}
