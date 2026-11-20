import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { 
  QrCode, Clock, Play, Square, Users, Download, Calendar, 
  CheckCircle2, AlertTriangle, X, RefreshCw, Eye, ShieldCheck, Copy, Check
} from 'lucide-react';
import api from '../services/api';

export default function FacultyAttendanceTab({ courseId, courseCode, courseName }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState(null);
  const [currentQrToken, setCurrentQrToken] = useState('');
  const [sessionCode, setSessionCode] = useState('');
  const [attendeesCount, setAttendeesCount] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState('');

  // Start Session Modal
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionDuration, setSessionDuration] = useState(10);
  const [starting, setStarting] = useState(false);

  // Attendees Modal
  const [viewingSession, setViewingSession] = useState(null);
  const [sessionRecords, setSessionRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  // QR rotation timer animation progress (0-100%)
  const [progress, setProgress] = useState(100);
  const [copiedCode, setCopiedCode] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch course sessions on mount
  const loadSessions = async () => {
    try {
      const res = await api.get(`/attendance/courses/${courseId}/sessions`);
      const list = res.data || [];
      setSessions(list);

      // Check if there is an active session
      const active = list.find((s) => s.status === 'ACTIVE' && !s.isExpired);
      if (active) {
        setActiveSession(active);
        setSessionCode(active.sessionCode);
        setCurrentQrToken(active.currentQrToken);
        setAttendeesCount(active.attendeesCount || 0);
      } else {
        setActiveSession(null);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load attendance sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, [courseId]);

  // Handle active session: QR rotation every 5s & session countdown timer
  useEffect(() => {
    if (!activeSession) return;

    let qrInterval;
    let animInterval;
    let countdownInterval;

    // 1. Session expiration countdown
    const updateCountdown = () => {
      const expiresAt = new Date(activeSession.expiresAt).getTime();
      const now = Date.now();
      const diff = expiresAt - now;

      if (diff <= 0) {
        setTimeRemaining('Session Expired');
        loadSessions();
      } else {
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setTimeRemaining(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      }
    };
    updateCountdown();
    countdownInterval = setInterval(updateCountdown, 1000);

    // 2. Fetch new QR token every 5 seconds (Only latest token is valid server-side)
    const refreshQr = async () => {
      try {
        const res = await api.get(`/attendance/sessions/${activeSession.id}/qr-token`);
        if (res.data) {
          setCurrentQrToken(res.data.qrToken);
          setAttendeesCount(res.data.attendeesCount || 0);
          setProgress(100);
        }
      } catch (_err) {
        // Session likely closed or expired
        loadSessions();
      }
    };

    qrInterval = setInterval(refreshQr, 5000);

    // Smooth progress bar draining over 5000ms
    const stepTime = 100;
    const stepDec = 100 / (5000 / stepTime);
    animInterval = setInterval(() => {
      setProgress((prev) => Math.max(0, prev - stepDec));
    }, stepTime);

    return () => {
      clearInterval(qrInterval);
      clearInterval(animInterval);
      clearInterval(countdownInterval);
    };
  }, [activeSession]);

  // Start new attendance session
  const handleStartSession = async (e) => {
    e.preventDefault();
    if (!sessionTitle.trim()) return;

    setStarting(true);
    setErrorMsg('');
    try {
      const res = await api.post(`/attendance/courses/${courseId}/sessions`, {
        title: sessionTitle.trim(),
        durationMinutes: parseInt(sessionDuration, 10) || 10,
      });

      const newSession = res.data;
      setActiveSession(newSession);
      setSessionCode(newSession.sessionCode);
      setCurrentQrToken(newSession.currentQrToken);
      setAttendeesCount(0);
      setIsStartModalOpen(false);
      setSessionTitle('');
      setSessionDuration(10);
      await loadSessions();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to start attendance session');
    } finally {
      setStarting(false);
    }
  };

  // End active attendance session
  const handleEndSession = async () => {
    if (!activeSession) return;
    if (!window.confirm('Are you sure you want to close this attendance session? Students will no longer be able to scan or submit.')) {
      return;
    }

    try {
      await api.post(`/attendance/sessions/${activeSession.id}/end`);
      setActiveSession(null);
      await loadSessions();
    } catch (err) {
      alert(err.message || 'Failed to end session');
    }
  };

  // View attendees for a session
  const handleViewAttendees = async (session) => {
    setViewingSession(session);
    setLoadingRecords(true);
    try {
      const res = await api.get(`/attendance/sessions/${session.id}/records`);
      setSessionRecords(res.data || []);
    } catch (err) {
      alert(err.message || 'Failed to fetch session attendees');
    } finally {
      setLoadingRecords(false);
    }
  };

  // Export CSV
  const handleExportCsv = (sessionId) => {
    const token = localStorage.getItem('cm_token');
    const url = `http://localhost:8081/api/v1/attendance/sessions/${sessionId}/export`;
    
    // Trigger download with auth header using fetch & blob
    fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to export CSV');
        return res.blob();
      })
      .then(blob => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `Attendance_${courseCode}_Session_${sessionId}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
      })
      .catch(err => alert(err.message || 'Export failed'));
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(sessionCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // QR Payload: encodes both session ID, token, and courseCode for the student camera scanner
  const qrPayload = JSON.stringify({
    sessionId: activeSession?.id,
    token: currentQrToken,
    code: sessionCode,
    courseCode: courseCode,
  });

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
            <span style={{
              fontSize: '0.78rem',
              fontWeight: 800,
              fontFamily: 'monospace',
              backgroundColor: '#E0F2FE',
              color: '#0369A1',
              padding: '0.2rem 0.6rem',
              borderRadius: '6px',
            }}>
              {courseCode}
            </span>
            <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600 }}>
              Faculty Attendance Desk
            </span>
          </div>
          <h1 className="font-display" style={{ fontSize: '1.9rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Course Attendance System
          </h1>
        </div>

        {!activeSession && (
          <button
            onClick={() => setIsStartModalOpen(true)}
            style={{
              backgroundColor: '#0D9488',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '12px',
              padding: '0.75rem 1.4rem',
              fontWeight: 700,
              fontSize: '0.92rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 12px rgba(13, 148, 136, 0.25)',
              transition: 'all 0.15s ease',
            }}
          >
            <Play size={18} />
            <span>Start Attendance</span>
          </button>
        )}
      </div>

      {errorMsg && (
        <div style={{
          backgroundColor: '#FEF2F2',
          border: '1px solid #FCA5A5',
          borderRadius: '12px',
          padding: '0.85rem 1.25rem',
          color: '#991B1B',
          fontSize: '0.88rem',
          fontWeight: 600,
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <AlertTriangle size={18} color="#DC2626" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* =========================================================================
          ACTIVE ATTENDANCE SESSION DISPLAY (PROJECTOR / CLASSROOM SCREEN)
         ========================================================================= */}
      {activeSession ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            backgroundColor: '#0B132B',
            color: '#FFFFFF',
            borderRadius: '24px',
            padding: '2.5rem',
            marginBottom: '2.5rem',
            boxShadow: '0 20px 40px -15px rgba(11, 19, 43, 0.4)',
            border: '1px solid #1C2D4A',
          }}
        >
          {/* Header Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            borderBottom: '1px solid #1E2D4A',
            paddingBottom: '1.5rem',
            marginBottom: '2rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: '#10B981',
                boxShadow: '0 0 12px #10B981',
                animation: 'pulse 1.5s infinite',
              }} />
              <div>
                <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#14B8A6', fontWeight: 800 }}>
                  Live Attendance Active
                </span>
                <h2 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 800, margin: '2px 0 0 0', color: '#FFFFFF' }}>
                  {activeSession.title}
                </h2>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              {/* Countdown Timer */}
              <div style={{
                backgroundColor: '#131F33',
                border: '1px solid #1F314F',
                borderRadius: '12px',
                padding: '0.55rem 1.15rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                <Clock size={16} color="#38BDF8" />
                <span style={{ fontSize: '0.95rem', fontWeight: 800, fontFamily: 'monospace', color: '#38BDF8' }}>
                  {timeRemaining}
                </span>
              </div>

              {/* End Attendance Button */}
              <button
                onClick={handleEndSession}
                style={{
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '0.65rem 1.25rem',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
                }}
              >
                <Square size={16} />
                <span>End Attendance</span>
              </button>
            </div>
          </div>

          {/* Core Split: QR Code & Session Code */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gap: '3rem',
            alignItems: 'center',
          }}>
            {/* Left: Dynamic Rotating QR Code */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '20px',
                padding: '1.25rem',
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
                border: '4px solid #14B8A6',
                display: 'inline-block',
                position: 'relative',
              }}>
                <QRCodeSVG
                  value={qrPayload}
                  size={260}
                  level="H"
                  includeMargin={true}
                />
              </div>

              {/* 5-Second QR Regeneration Progress Bar */}
              <div style={{ width: '280px', marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#94A3B8', marginBottom: '0.35rem', fontWeight: 600 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <RefreshCw size={12} color="#14B8A6" /> Regenerating in 5s
                  </span>
                  <span>Server-Validated</span>
                </div>
                <div style={{ width: '100%', height: '5px', backgroundColor: '#1E2D4A', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${progress}%`,
                    height: '100%',
                    backgroundColor: '#14B8A6',
                    borderRadius: '9999px',
                    transition: 'width 0.1s linear',
                  }} />
                </div>
              </div>
            </div>

            {/* Right: Fixed 6-Character Session Code & Instructions */}
            <div>
              <div style={{ marginBottom: '1.75rem' }}>
                <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8', fontWeight: 700 }}>
                  SESSION VERIFICATION CODE (FIXED)
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.4rem' }}>
                  <div style={{
                    backgroundColor: '#131F33',
                    border: '2px solid #38BDF8',
                    borderRadius: '16px',
                    padding: '0.85rem 1.75rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.85rem',
                  }}>
                    <span style={{
                      fontSize: '2.5rem',
                      fontWeight: 900,
                      fontFamily: 'monospace',
                      letterSpacing: '0.2em',
                      color: '#F8FAFC',
                    }}>
                      {sessionCode}
                    </span>
                  </div>

                  <button
                    onClick={handleCopyCode}
                    title="Copy Code"
                    style={{
                      backgroundColor: '#1E2D4A',
                      color: '#F8FAFC',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '0.85rem 1.15rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                    }}
                  >
                    {copiedCode ? <Check size={16} color="#10B981" /> : <Copy size={16} />}
                    <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Instructions Box */}
              <div style={{
                backgroundColor: '#131F33',
                border: '1px solid #1E2D4A',
                borderRadius: '14px',
                padding: '1.25rem 1.5rem',
                marginBottom: '1.75rem',
              }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#38BDF8', margin: '0 0 0.5rem 0' }}>
                  Instructions for Students:
                </h4>
                <ol style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.88rem', color: '#CBD5E1', lineHeight: 1.6 }}>
                  <li>Open the <strong>Attendance</strong> tab in their Course view.</li>
                  <li>Click <strong>Scan QR</strong> and point their camera at this screen.</li>
                  <li>When prompted, enter the 6-character code <strong>{sessionCode}</strong> to confirm.</li>
                </ol>
              </div>

              {/* Live Count & Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                  <span style={{ fontSize: '2.2rem', fontWeight: 900, color: '#10B981', fontFamily: 'var(--font-code)' }}>
                    {attendeesCount}
                  </span>
                  <span style={{ fontSize: '0.95rem', color: '#94A3B8', fontWeight: 600 }}>
                    students marked
                  </span>
                </div>

                <button
                  onClick={() => handleViewAttendees(activeSession)}
                  style={{
                    backgroundColor: '#1E2D4A',
                    color: '#FFFFFF',
                    border: '1px solid #2B3D63',
                    borderRadius: '10px',
                    padding: '0.65rem 1.15rem',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                  }}
                >
                  <Eye size={16} />
                  <span>View Live List</span>
                </button>

                <button
                  onClick={() => handleExportCsv(activeSession.id)}
                  style={{
                    backgroundColor: '#14B8A6',
                    color: '#0B132B',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0.65rem 1.15rem',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                  }}
                >
                  <Download size={16} />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}

      {/* =========================================================================
          ATTENDANCE SESSION HISTORY LIST
         ========================================================================= */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '20px',
        border: '1px solid #E2E8F0',
        padding: '1.75rem 2rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h2 className="font-display" style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Attendance History & Sessions
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '0.2rem 0 0' }}>
              Historical attendance sessions conducted for {courseName}
            </p>
          </div>

          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748B' }}>
            {sessions.length} total sessions
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: '#64748B' }}>
            Loading attendance records...
          </div>
        ) : sessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
            <Calendar size={48} color="#94A3B8" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.4rem' }}>
              No Attendance Sessions Yet
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#64748B', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
              Click "Start Attendance" above to launch a dynamic QR code session for your class.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {sessions.map((sess) => {
              const isExpired = sess.status === 'EXPIRED' || sess.isExpired;
              const isClosed = sess.status === 'CLOSED';
              const isActive = sess.status === 'ACTIVE' && !isExpired;

              return (
                <div
                  key={sess.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '14px',
                    padding: '1.25rem 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {/* Left: Details */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      backgroundColor: isActive ? '#ECFDF5' : '#F1F5F9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isActive ? '#059669' : '#64748B',
                    }}>
                      <QrCode size={22} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.25rem' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          backgroundColor: isActive ? '#D1FAE5' : isClosed ? '#E2E8F0' : '#FEF3C7',
                          color: isActive ? '#065F46' : isClosed ? '#475569' : '#B45309',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                        }}>
                          {isActive ? 'Active' : isClosed ? 'Closed' : 'Expired'}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: '#64748B', fontFamily: 'monospace', fontWeight: 700 }}>
                          Code: {sess.sessionCode}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                          · {sess.durationMinutes} min duration
                        </span>
                      </div>

                      <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A', margin: '0 0 0.25rem 0' }}>
                        {sess.title}
                      </h4>

                      <p style={{ fontSize: '0.82rem', color: '#64748B', margin: 0 }}>
                        Created on {new Date(sess.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    </div>
                  </div>

                  {/* Right: Attendees Count & Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', fontFamily: 'var(--font-code)' }}>
                        {sess.attendeesCount}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>
                        Attendees
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleViewAttendees(sess)}
                        style={{
                          backgroundColor: '#F8FAFC',
                          border: '1px solid #CBD5E1',
                          borderRadius: '8px',
                          padding: '0.5rem 0.85rem',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          color: '#0F172A',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        <Eye size={15} />
                        <span>View</span>
                      </button>

                      <button
                        onClick={() => handleExportCsv(sess.id)}
                        style={{
                          backgroundColor: '#0F766E',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '0.5rem 0.85rem',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        <Download size={15} />
                        <span>Export</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =========================================================================
          MODAL: START ATTENDANCE SESSION
         ========================================================================= */}
      <AnimatePresence>
        {isStartModalOpen && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '20px',
                width: '100%',
                maxWidth: '480px',
                padding: '24px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    backgroundColor: '#CCFBF1',
                    color: '#0F766E',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <QrCode size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      Start Attendance Session
                    </h3>
                    <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                      {courseCode} · {courseName}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setIsStartModalOpen(false)}
                  style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleStartSession}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                    Lecture Topic / Session Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lecture 12 - Pipelining and Hazard Controls"
                    value={sessionTitle}
                    onChange={(e) => setSessionTitle(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                    Session Duration (Minutes) *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '0.65rem' }}>
                    {[5, 10, 15, 30].map((dur) => (
                      <button
                        type="button"
                        key={dur}
                        onClick={() => setSessionDuration(dur)}
                        style={{
                          padding: '0.6rem 0.5rem',
                          borderRadius: '8px',
                          border: sessionDuration === dur ? '2px solid #0D9488' : '1px solid #CBD5E1',
                          backgroundColor: sessionDuration === dur ? '#F0FDFA' : '#FFFFFF',
                          color: sessionDuration === dur ? '#0D9488' : '#334155',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                        }}
                      >
                        {dur} Mins
                      </button>
                    ))}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    Sessions auto-expire after this duration and reject any subsequent student scans.
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setIsStartModalOpen(false)}
                    style={{
                      background: 'transparent',
                      border: '1px solid #CBD5E1',
                      borderRadius: '10px',
                      padding: '0.65rem 1.15rem',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={starting}
                    style={{
                      backgroundColor: '#0D9488',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '0.65rem 1.35rem',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      cursor: starting ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                    }}
                  >
                    <Play size={16} />
                    <span>{starting ? 'Launching...' : 'Launch QR Attendance'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          MODAL: ATTENDEE LIST DETAILS
         ========================================================================= */}
      <AnimatePresence>
        {viewingSession && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '20px',
                width: '100%',
                maxWidth: '780px',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                overflow: 'hidden',
              }}
            >
              {/* Header */}
              <div style={{
                padding: '1.25rem 1.75rem',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    {viewingSession.title}
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '0.2rem 0 0' }}>
                    Session Code: <strong>{viewingSession.sessionCode}</strong> · {sessionRecords.length} Attendees Marked
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button
                    onClick={() => handleExportCsv(viewingSession.id)}
                    style={{
                      backgroundColor: '#0F766E',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.45rem 0.85rem',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <Download size={14} />
                    <span>Download CSV</span>
                  </button>

                  <button
                    onClick={() => setViewingSession(null)}
                    style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Table Body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.75rem' }}>
                {loadingRecords ? (
                  <div style={{ textAlign: 'center', padding: '3rem 0', color: '#64748B' }}>
                    Loading attendee details...
                  </div>
                ) : sessionRecords.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 0', color: '#64748B' }}>
                    No students have marked attendance for this session yet.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #F1F5F9', color: '#64748B', textTransform: 'uppercase', fontSize: '0.74rem' }}>
                        <th style={{ padding: '0.75rem 0.5rem' }}>Student Name</th>
                        <th style={{ padding: '0.75rem 0.5rem' }}>Student ID</th>
                        <th style={{ padding: '0.75rem 0.5rem' }}>Course & Section</th>
                        <th style={{ padding: '0.75rem 0.5rem' }}>Roll No.</th>
                        <th style={{ padding: '0.75rem 0.5rem' }}>Marked At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessionRecords.map((r, i) => (
                        <tr key={r.id || i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '0.85rem 0.5rem', fontWeight: 700, color: '#0F172A' }}>
                            {r.studentName}
                          </td>
                          <td style={{ padding: '0.85rem 0.5rem', fontFamily: 'monospace', fontWeight: 700, color: '#0369A1' }}>
                            {r.studentIdCode}
                          </td>
                          <td style={{ padding: '0.85rem 0.5rem', color: '#475569' }}>
                            {r.courseName} ({r.section})
                          </td>
                          <td style={{ padding: '0.85rem 0.5rem', color: '#0F172A', fontWeight: 600 }}>
                            {r.classRollNo}
                          </td>
                          <td style={{ padding: '0.85rem 0.5rem', color: '#64748B', fontSize: '0.82rem' }}>
                            {new Date(r.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
