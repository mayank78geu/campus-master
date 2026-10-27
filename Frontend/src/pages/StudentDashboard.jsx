import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { KeyRound, BookOpen, Layers, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

export default function StudentDashboard() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchEnrolledCourses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/courses');
      setCourses(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load enrolled courses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnrolledCourses();
  }, []);

  const handleJoinBatch = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoining(true);
    setError('');
    setMessage('');
    try {
      const res = await api.post('/batches/join', { joinCode: joinCode.trim() });
      setMessage(res.message || 'Joined successfully!');
      setJoinCode('');
      await fetchEnrolledCourses();
    } catch (err) {
      setError(err.message || 'Failed to join batch');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
      {/* Student Join Banner */}
      <div className="rounded-card-1" style={{
        backgroundColor: '#FFFFFF',
        padding: '2rem',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-card)',
        marginBottom: '2.5rem',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.5rem',
      }}>
        <div style={{ maxWidth: '520px' }}>
          <div className="badge-chip" style={{ marginBottom: '0.4rem' }}>Enrolment</div>
          <h2 className="font-display" style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--ink)' }}>
            Join a Course with a Single Code
          </h2>
          <p style={{ color: 'var(--ink-muted)', fontSize: '0.9rem', marginTop: '0.35rem' }}>
            Got a 6-character code from your professor? Enter it here to immediately see all course notes, units, and deadlines.
          </p>
        </div>

        <form onSubmit={handleJoinBatch} style={{ display: 'flex', gap: '0.65rem', width: '100%', maxWidth: '380px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <KeyRound size={17} color="var(--ink-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              required
              maxLength={12}
              placeholder="e.g. WSWKPP"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              style={{
                width: '100%',
                padding: '0.7rem 0.75rem 0.7rem 2.25rem',
                borderRadius: '10px',
                border: '1px solid var(--border-input)',
                fontFamily: 'var(--font-code)',
                fontSize: '1rem',
                letterSpacing: '0.05em',
                fontWeight: 600,
                textTransform: 'uppercase',
                backgroundColor: 'var(--surface-alt)',
              }}
            />
          </div>
          <button
            type="submit"
            disabled={joining}
            className="btn-primary"
            style={{ minHeight: '46px', padding: '0 1.4rem', whiteSpace: 'nowrap' }}
          >
            {joining ? 'Joining...' : 'Join Batch'}
          </button>
        </form>
      </div>

      {/* Success / Error Messages */}
      {message && (
        <div style={{
          padding: '0.85rem 1rem',
          backgroundColor: 'var(--success-bg)',
          color: 'var(--success-text)',
          borderRadius: '10px',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontWeight: 500,
        }}>
          <CheckCircle2 size={18} />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div style={{
          padding: '0.85rem 1rem',
          backgroundColor: 'var(--danger-bg)',
          color: 'var(--danger-text)',
          borderRadius: '10px',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontWeight: 500,
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Enrolled Courses Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 className="font-display" style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--ink)' }}>
          My Enrolled Courses
        </h2>
        <p style={{ color: 'var(--ink-secondary)', fontSize: '0.92rem' }}>
          All active courses and their permanent resource spaces.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--ink-muted)' }}>
          Loading your courses...
        </div>
      ) : courses.length === 0 ? (
        <div className="rounded-card-2" style={{
          backgroundColor: '#FFFFFF',
          padding: '4rem 2rem',
          textAlign: 'center',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-card)',
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: 'var(--info-bg)',
            color: 'var(--info-text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
          }}>
            <BookOpen size={28} />
          </div>
          <h3 className="font-display" style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            You haven't joined any courses yet
          </h3>
          <p style={{ color: 'var(--ink-muted)', maxWidth: '420px', margin: '0 auto 1rem', fontSize: '0.95rem' }}>
            Ask your faculty for a 6-character batch join code and enter it in the box above to get full course access.
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '1.5rem',
        }}>
          {courses.map((course) => (
            <div
              key={course.id}
              className="rounded-card-2"
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--border)',
                padding: '1.75rem',
                boxShadow: 'var(--shadow-card)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span style={{
                    fontFamily: 'var(--font-code)',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    backgroundColor: 'var(--surface-muted)',
                    color: 'var(--ink)',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '6px',
                  }}>
                    {course.code}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', fontWeight: 500 }}>
                    {course.semester}
                  </span>
                </div>

                <h3 className="font-display" style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '0.5rem' }}>
                  {course.name}
                </h3>

                <p style={{ color: 'var(--ink-muted)', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                  Faculty: <strong>{course.owner?.name}</strong>
                </p>

                <div style={{
                  padding: '0.75rem 0',
                  borderTop: '1px solid var(--border)',
                  borderBottom: '1px solid var(--border)',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.84rem',
                  color: 'var(--primary-dark)',
                  fontWeight: 600,
                }}>
                  <Layers size={16} color="var(--primary)" />
                  <span>{course.units ? course.units.length : 0} Course Units Available</span>
                </div>
              </div>

              <Link
                to={`/courses/${course.id}`}
                className="btn-outline"
                style={{
                  width: '100%',
                  justifyContent: 'space-between',
                  minHeight: '44px',
                  fontSize: '0.88rem',
                  padding: '0 1.25rem',
                }}
              >
                <span>View Course Units & Material</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
