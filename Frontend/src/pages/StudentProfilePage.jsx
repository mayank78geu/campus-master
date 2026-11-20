import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Hash, BookOpen, Layers, Phone, CheckCircle2, 
  AlertTriangle, ArrowRight, ShieldCheck, Mail, Save, Clock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function StudentProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isInitialSetup = user && user.role === 'STUDENT' && !user.isProfileCompleted;

  const [name, setName] = useState(user?.name || '');
  const [studentId, setStudentId] = useState(user?.studentId || '');
  const [course, setCourse] = useState(user?.course || '');
  const [section, setSection] = useState(user?.section || '');
  const [classRollNo, setClassRollNo] = useState(user?.classRollNo || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // Fetch latest profile from backend
    const loadProfile = async () => {
      try {
        const res = await api.get('/profile');
        if (res?.data) {
          const p = res.data;
          setName(p.name || user?.name || '');
          setStudentId(p.studentId || '');
          setCourse(p.course || '');
          setSection(p.section || '');
          setClassRollNo(p.classRollNo || '');
          setPhoneNumber(p.phoneNumber || '');
        }
      } catch (_e) {
        // Fallback to user context
      } finally {
        setFetchLoading(false);
      }
    };
    loadProfile();
  }, [user]);

  const validatePhone = (phone) => {
    const clean = phone.trim().replace(/\s+/g, '');
    return /^[+]?[0-9]{10,15}$/.test(clean);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Field-level validations
    if (!name.trim()) {
      setError('Please provide your full legal name.');
      return;
    }
    if (!studentId.trim()) {
      setError('Please enter your University / Student ID.');
      return;
    }
    if (!course.trim()) {
      setError('Please enter your degree program or enrolled course.');
      return;
    }
    if (!section.trim()) {
      setError('Please provide your class section.');
      return;
    }
    if (!classRollNo.trim()) {
      setError('Please provide your class roll number.');
      return;
    }
    if (!phoneNumber.trim() || !validatePhone(phoneNumber)) {
      setError('Please enter a valid phone number (10 to 15 digits).');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        studentId: studentId.trim().toUpperCase(),
        course: course.trim(),
        section: section.trim().toUpperCase(),
        classRollNo: classRollNo.trim(),
        phoneNumber: phoneNumber.trim().replace(/\s+/g, ''),
      };

      const res = await api.put('/profile', payload);
      const updated = res.data;

      // Update AuthContext & localStorage
      updateUser({
        name: updated.name,
        studentId: updated.studentId,
        course: updated.course,
        section: updated.section,
        classRollNo: updated.classRollNo,
        phoneNumber: updated.phoneNumber,
        isProfileCompleted: true,
      });

      setSuccess(
        isInitialSetup
          ? 'Profile completed successfully! Redirecting to your student dashboard...'
          : 'Profile details updated successfully!'
      );

      if (isInitialSetup) {
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 1200);
      }
    } catch (err) {
      setError(err.message || 'Failed to update profile. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F8FAFC',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '2.5rem 1.25rem',
    }}>
      <div style={{ maxWidth: '640px', width: '100%', margin: '0 auto' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.65rem',
            backgroundColor: '#0B132B',
            color: '#FFFFFF',
            padding: '0.55rem 1.25rem',
            borderRadius: '12px',
            marginBottom: '1rem',
            boxShadow: '0 4px 12px rgba(11, 19, 43, 0.15)',
          }}>
            <ShieldCheck size={20} color="#14B8A6" />
            <span className="font-display" style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.02em' }}>
              CampusMaster
            </span>
          </div>

          <h1 className="font-display" style={{
            fontSize: '1.85rem',
            fontWeight: 800,
            color: '#0F172A',
            letterSpacing: '-0.025em',
            margin: '0 0 0.5rem 0',
          }}>
            {isInitialSetup ? 'Complete Your Student Profile' : 'Student Academic Profile'}
          </h1>

          <p style={{ fontSize: '0.92rem', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
            {isInitialSetup
              ? 'Please fill in your academic details. This one-time registration is required before accessing courses, coursework, assignments, and attendance.'
              : 'Keep your academic credentials and contact details up to date.'}
          </p>
        </div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            border: '1px solid #E2E8F0',
            padding: '2rem 2.25rem',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
          }}
        >
          {/* Important Notice Banner */}
          <div style={{
            backgroundColor: isInitialSetup ? '#FEF3C7' : '#F0FDFA',
            border: isInitialSetup ? '1px solid #FDE68A' : '1px solid #CCFBF1',
            borderRadius: '12px',
            padding: '0.9rem 1.15rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            marginBottom: '1.75rem',
          }}>
            {isInitialSetup ? (
              <AlertTriangle size={18} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
            ) : (
              <Clock size={18} color="#0D9488" style={{ flexShrink: 0, marginTop: '2px' }} />
            )}
            <div style={{ fontSize: '0.84rem', color: isInitialSetup ? '#92400E' : '#0F766E', lineHeight: 1.45 }}>
              {isInitialSetup ? (
                <>
                  <strong>Mandatory Verification:</strong> All fields are verified against institutional records. Your attendance logs and grade submissions will be linked to this Student ID and Class Roll number.
                </>
              ) : (
                <>
                  <strong>Attendance Snapshot Policy:</strong> Whenever you scan for attendance, your records permanently capture the name, section, roll number, and student ID at that specific moment.
                </>
              )}
            </div>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div style={{
              backgroundColor: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: '10px',
              padding: '0.75rem 1rem',
              color: '#991B1B',
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1.25rem',
            }}>
              <AlertTriangle size={16} color="#DC2626" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div style={{
              backgroundColor: '#ECFDF5',
              border: '1px solid #A7F3D0',
              borderRadius: '10px',
              padding: '0.75rem 1rem',
              color: '#065F46',
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1.25rem',
            }}>
              <CheckCircle2 size={16} color="#059669" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Registered Email (Read-Only) */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.04em' }}>
                Account Email
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                backgroundColor: '#F1F5F9',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                padding: '0.75rem 1rem',
                color: '#475569',
                fontSize: '0.9rem',
              }}>
                <Mail size={16} color="#94A3B8" />
                <span style={{ fontWeight: 600 }}>{user?.email || 'student@campusmaster.edu'}</span>
              </div>
            </div>

            {/* Name */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.04em' }}>
                Full Legal Name <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} color="#94A3B8" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  required
                  placeholder="e.g. Mayank Bhadani"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem 0.75rem 2.6rem',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.9rem',
                    color: '#0F172A',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s ease',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#0D9488'}
                  onBlur={(e) => e.target.style.borderColor = '#CBD5E1'}
                />
              </div>
            </div>

            {/* Student ID & Course Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              {/* Student ID */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.04em' }}>
                  Student ID / Reg No. <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Hash size={16} color="#94A3B8" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2023CS042"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value.toUpperCase())}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem 0.75rem 2.6rem',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.9rem',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      color: '#0F172A',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#0D9488'}
                    onBlur={(e) => e.target.style.borderColor = '#CBD5E1'}
                  />
                </div>
              </div>

              {/* Course */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.04em' }}>
                  Degree / Course <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <BookOpen size={16} color="#94A3B8" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    required
                    placeholder="e.g. B.Tech CSE"
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem 0.75rem 2.6rem',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.9rem',
                      color: '#0F172A',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#0D9488'}
                    onBlur={(e) => e.target.style.borderColor = '#CBD5E1'}
                  />
                </div>
              </div>
            </div>

            {/* Section & Class Roll No Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              {/* Section */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.04em' }}>
                  Section <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Layers size={16} color="#94A3B8" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Section A"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem 0.75rem 2.6rem',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.9rem',
                      color: '#0F172A',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#0D9488'}
                    onBlur={(e) => e.target.style.borderColor = '#CBD5E1'}
                  />
                </div>
              </div>

              {/* Class Roll No */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.04em' }}>
                  Class Roll No. <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Hash size={16} color="#94A3B8" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    required
                    placeholder="e.g. 24"
                    value={classRollNo}
                    onChange={(e) => setClassRollNo(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem 0.75rem 2.6rem',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.9rem',
                      color: '#0F172A',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#0D9488'}
                    onBlur={(e) => e.target.style.borderColor = '#CBD5E1'}
                  />
                </div>
              </div>
            </div>

            {/* Phone Number */}
            <div style={{ marginBottom: '1.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.04em' }}>
                Contact Phone Number <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} color="#94A3B8" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210 or +919876543210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem 0.75rem 2.6rem',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.9rem',
                    color: '#0F172A',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#0D9488'}
                  onBlur={(e) => e.target.style.borderColor = '#CBD5E1'}
                />
              </div>
              <span style={{ fontSize: '0.74rem', color: '#64748B', display: 'block', marginTop: '0.3rem' }}>
                Used for urgent institutional notifications, batch announcements, and identity verification.
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                backgroundColor: '#0D9488',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                padding: '0.85rem 1.5rem',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(13, 148, 136, 0.25)',
                transition: 'all 0.15s ease',
              }}
              onMouseOver={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#0F766E'; }}
              onMouseOut={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#0D9488'; }}
            >
              {loading ? (
                <span>Saving Profile...</span>
              ) : isInitialSetup ? (
                <>
                  <span>Complete Registration & Enter Dashboard</span>
                  <ArrowRight size={18} />
                </>
              ) : (
                <>
                  <Save size={18} />
                  <span>Save Profile Changes</span>
                </>
              )}
            </button>

            {!isInitialSetup && (
              <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748B',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Return to Dashboard
                </button>
              </div>
            )}

            {isInitialSetup && (
              <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={logout}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94A3B8',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                  }}
                >
                  Signed in as wrong account? Sign out
                </button>
              </div>
            )}
          </form>
        </motion.div>
      </div>
    </div>
  );
}
