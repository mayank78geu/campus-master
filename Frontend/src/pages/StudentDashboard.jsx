import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { 
  Search, ArrowRight, CheckCircle2, AlertCircle, FileText, Link as LinkIcon,
  Bell, Check, Clock, Calendar, Download, FileUp, X, BookOpen, Filter, Award, ChevronRight, Megaphone
} from 'lucide-react';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeTab = searchParams.get('tab') || 'home';

  const [courses, setCourses] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [recentResources, setRecentResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Coursework / Deadlines Tab State
  const [deadlineFilter, setDeadlineFilter] = useState('ALL'); // ALL, PENDING, SUBMITTED, EVALUATED
  const [deadlineSearch, setDeadlineSearch] = useState('');

  // Course Tab State
  const [courseSearch, setCourseSearch] = useState('');

  // Quick Assignment Submission Modal
  const [submittingAsg, setSubmittingAsg] = useState(null);
  const [submitFile, setSubmitFile] = useState(null);
  const [submitText, setSubmitText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState('');

  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [notifFilter, setNotifFilter] = useState('ALL'); // ALL, UNREAD

  const fetchNotifications = async () => {
    try {
      setLoadingNotifs(true);
      const res = await api.get('/notifications');
      setNotifications(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingNotifs(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (activeTab === 'notifications') {
      fetchNotifications();
    }
  }, [activeTab]);

  const handleMarkAllNotificationsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkSingleNotificationRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (e) {
      console.error(e);
    }
  };

  // Course acronym color palette
  const badgeColors = [
    { bg: '#D1FAE5', text: '#065F46' }, // Mint green
    { bg: '#E0F2FE', text: '#0369A1' }, // Light blue
    { bg: '#EDE9FE', text: '#6D28D9' }, // Light purple
    { bg: '#FEF3C7', text: '#B45309' }, // Light amber
    { bg: '#FEE2E2', text: '#B91C1C' }, // Light red
  ];

  const getCourseAcronym = (name) => {
    if (!name) return 'CS';
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [coursesRes, deadlinesRes, resourcesRes] = await Promise.all([
        api.get('/courses'),
        api.get('/assignments/student/deadlines').catch(() => ({ data: [] })),
        api.get('/resources/recent').catch(() => ({ data: [] }))
      ]);
      setCourses(coursesRes.data || []);
      setDeadlines(deadlinesRes.data || []);
      setRecentResources(resourcesRes.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleJoinBatch = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoining(true);
    setError('');
    setMessage('');
    try {
      const res = await api.post('/batches/join', { joinCode: joinCode.trim() });
      setMessage(res.message || 'Joined batch successfully!');
      setJoinCode('');
      await fetchData();
    } catch (err) {
      setError(err.message || 'Failed to join batch. Check the code and try again.');
    } finally {
      setJoining(false);
    }
  };

  const handleSubmitAssignment = async (e) => {
    e.preventDefault();
    if (!submitFile && !submitText.trim()) {
      alert('Please upload a file or enter submission text');
      return;
    }
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      if (submitText.trim()) formData.append('textContent', submitText.trim());
      if (submitFile) formData.append('files', submitFile);
      const token = localStorage.getItem('cm_token');
      const asgId = submittingAsg.assignmentId || submittingAsg.id;
      const res = await fetch(`http://localhost:8081/api/v1/assignments/${asgId}/submissions`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Submission failed');
      setSubmitSuccess(`Assignment submitted successfully! Receipt Token: ${data.data?.receiptToken}`);
      setTimeout(() => {
        setSubmittingAsg(null);
        setSubmitSuccess('');
        setSubmitFile(null);
        setSubmitText('');
      }, 3000);
      await fetchData();
    } catch (err) {
      alert(err.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Formatted date string for header
  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  const firstName = user?.name ? user.name.split(' ')[0] : 'Student';

  // Real deadlines directly from database
  const displayDeadlines = deadlines;

  // Filtered deadlines for Deadlines tab
  const filteredDeadlines = displayDeadlines.filter(d => {
    const matchesSearch = !deadlineSearch.trim() || 
      d.title?.toLowerCase().includes(deadlineSearch.toLowerCase()) ||
      d.courseName?.toLowerCase().includes(deadlineSearch.toLowerCase()) ||
      d.courseCode?.toLowerCase().includes(deadlineSearch.toLowerCase());
    
    if (!matchesSearch) return false;
    if (deadlineFilter === 'PENDING') return !d.submitted;
    if (deadlineFilter === 'SUBMITTED') return d.submitted;
    if (deadlineFilter === 'EVALUATED') return d.marksPublished && d.marks !== null && d.marks !== undefined;
    return true;
  });

  // Filtered courses for Courses tab
  const filteredCourses = courses.filter(c => {
    if (!courseSearch.trim()) return true;
    const term = courseSearch.toLowerCase();
    return c.name?.toLowerCase().includes(term) || c.code?.toLowerCase().includes(term);
  });

  // Filtered notifications
  const filteredNotifs = notifications.filter(n => {
    if (notifFilter === 'UNREAD') return !n.isRead;
    if (notifFilter === 'ANNOUNCEMENTS') return n.eventType === 'ANNOUNCEMENT';
    return true;
  });

  const unreadNotifsCount = notifications.filter(n => !n.isRead).length;
  const announcementsNotifsCount = notifications.filter(n => n.eventType === 'ANNOUNCEMENT').length;

  return (
    <div className="cm-layout-container" style={{ backgroundColor: '#F8FAFC' }}>
      {/* Dark Navy Persistent Sidebar */}
      <Sidebar activeNav={activeTab} />

      {/* Main Content Area */}
      <main className="cm-main-area" style={{ flex: 1, overflowY: 'auto' }}>
        {/* Top Header Row */}
        <div className="cm-page-header" style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '2rem',
        }}>
          <div>
            <div style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#64748B',
              marginBottom: '0.25rem',
            }}>
              {todayFormatted}
            </div>
            <h1 className="font-display" style={{
              fontSize: '2rem',
              fontWeight: 800,
              color: '#0F172A',
              letterSpacing: '-0.025em',
              marginBottom: '0.35rem',
            }}>
              {activeTab === 'courses' ? 'My Enrolled Courses' :
               activeTab === 'deadlines' ? 'All Deadlines & Coursework' :
               activeTab === 'notifications' ? 'Notification Center' :
               `Good evening, ${firstName}`}
            </h1>
            <p style={{ fontSize: '0.95rem', color: '#64748B' }}>
              {activeTab === 'courses' ? 'Explore your enrolled subjects, course spaces, syllabus materials, and batch rosters.' :
               activeTab === 'deadlines' ? 'Stay on top of upcoming deliverables, submit solutions, and track evaluated scores.' :
               activeTab === 'notifications' ? 'Real-time updates on assignments, announcements, and teacher remarks.' :
               `${displayDeadlines.filter(d => !d.submitted).length} assignments need your attention.`}
            </p>
          </div>

          {/* Quick Header Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {activeTab === 'notifications' && (
              <button
                onClick={handleMarkAllNotificationsRead}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '10px',
                  padding: '0.65rem 1.15rem',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  color: '#0D9488',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                }}
              >
                <Check size={16} />
                <span>Mark all as read</span>
              </button>
            )}

            {/* Search Pill */}
            <div style={{ position: 'relative', width: '320px' }}>
              <Search 
                size={18} 
                color="#94A3B8" 
                style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} 
              />
              <input
                type="text"
                placeholder={activeTab === 'deadlines' ? 'Search assignments...' : activeTab === 'courses' ? 'Search courses...' : 'Search notes, slides, links'}
                value={activeTab === 'deadlines' ? deadlineSearch : activeTab === 'courses' ? courseSearch : searchQuery}
                onChange={(e) => {
                  if (activeTab === 'deadlines') setDeadlineSearch(e.target.value);
                  else if (activeTab === 'courses') setCourseSearch(e.target.value);
                  else setSearchQuery(e.target.value);
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.75rem',
                  borderRadius: '9999px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#FFFFFF',
                  fontSize: '0.9rem',
                  color: '#0F172A',
                  outline: 'none',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Global Notifications / Alerts */}
        {message && (
          <div style={{
            padding: '0.85rem 1.25rem',
            backgroundColor: '#D1FAE5',
            color: '#065F46',
            borderRadius: '12px',
            marginBottom: '1.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            fontWeight: 600,
            fontSize: '0.9rem',
          }}>
            <CheckCircle2 size={18} color="#059669" />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div style={{
            padding: '0.85rem 1.25rem',
            backgroundColor: '#FEE2E2',
            color: '#991B1B',
            borderRadius: '12px',
            marginBottom: '1.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            fontWeight: 600,
            fontSize: '0.9rem',
          }}>
            <AlertCircle size={18} color="#DC2626" />
            <span>{error}</span>
          </div>
        )}

        {/* =========================================================================
            TAB 1: MY COURSES PAGE
           ========================================================================= */}
        {activeTab === 'courses' ? (
          <div>
            {/* Top Toolbar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.5rem',
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              border: '1px solid #E2E8F0',
              padding: '1rem 1.4rem',
              flexWrap: 'wrap',
              gap: '1rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0F172A' }}>
                  {filteredCourses.length} Enrolled {filteredCourses.length === 1 ? 'Course' : 'Courses'}
                </span>
                <span style={{ fontSize: '0.82rem', color: '#64748B' }}>
                  Semester 3 · Academic Year 2026
                </span>
              </div>

              {/* Join Batch inline quick button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Enter join code (e.g. DBMS-7K2M)"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    padding: '0.5rem 0.85rem',
                    fontSize: '0.85rem',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    outline: 'none',
                    width: 'min(210px, 100%)',
                  }}
                />
                <button
                  onClick={handleJoinBatch}
                  disabled={joining || !joinCode.trim()}
                  style={{
                    backgroundColor: '#0F766E',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.52rem 1.1rem',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: joining || !joinCode.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  {joining ? 'Joining...' : 'Join Course'}
                </button>
              </div>
            </div>

            {/* Courses Grid */}
            <div className="cm-grid-cards-auto" style={{ marginBottom: '2rem' }}>
              {filteredCourses.length > 0 ? (
                filteredCourses.map((course, idx) => {
                  const colorScheme = badgeColors[idx % badgeColors.length];
                  const acronym = getCourseAcronym(course.name);

                  return (
                    <Link
                      key={course.id}
                      to={`/courses/${course.id}`}
                      style={{
                        textDecoration: 'none',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '16px',
                        border: '1px solid #E2E8F0',
                        padding: '1.5rem',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        minHeight: '210px',
                        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-3px)';
                        e.currentTarget.style.boxShadow = '0 10px 20px rgba(0, 0, 0, 0.06)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.03)';
                      }}
                    >
                      <div>
                        {/* Top Row: Acronym & Course Code */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.1rem' }}>
                          <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '10px',
                            backgroundColor: colorScheme.bg,
                            color: colorScheme.text,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontFamily: 'monospace',
                            fontSize: '0.95rem',
                          }}>
                            {acronym}
                          </div>

                          <span style={{
                            fontFamily: 'monospace',
                            fontSize: '0.8rem',
                            color: '#64748B',
                            fontWeight: 700,
                            backgroundColor: '#F1F5F9',
                            padding: '0.25rem 0.65rem',
                            borderRadius: '6px',
                          }}>
                            {course.code}
                          </span>
                        </div>

                        {/* Title & Faculty */}
                        <h3 className="font-display" style={{
                          fontSize: '1.2rem',
                          fontWeight: 700,
                          color: '#0F172A',
                          marginBottom: '0.35rem',
                          lineHeight: 1.3,
                        }}>
                          {course.name}
                        </h3>
                        <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '0 0 0.85rem 0' }}>
                          {course.owner?.name ? (course.owner.name.startsWith('Prof.') ? course.owner.name : `Prof. ${course.owner.name}`) : 'Prof. Faculty'}
                        </p>
                        <p style={{ fontSize: '0.82rem', color: '#94A3B8', margin: 0, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {course.description || 'Comprehensive syllabus modules, assignments, and lecture notes.'}
                        </p>
                      </div>

                      {/* Bottom Info Bar */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '1.5rem',
                        paddingTop: '0.95rem',
                        borderTop: '1px solid #F1F5F9',
                      }}>
                        <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 500 }}>
                          {course.units ? `${course.units.length} units` : 'Active curriculum'}
                        </span>

                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          color: '#0F766E',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                        }}>
                          <span>Enter Space</span>
                          <ArrowRight size={14} />
                        </span>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div style={{
                  gridColumn: '1 / -1',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  border: '1px solid #E2E8F0',
                  padding: '3.5rem',
                  textAlign: 'center',
                }}>
                  <BookOpen size={48} color="#94A3B8" style={{ margin: '0 auto 1rem' }} />
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem' }}>
                    No Enrolled Courses Found
                  </h3>
                  <p style={{ color: '#64748B', fontSize: '0.9rem', maxWidth: '440px', margin: '0 auto 1.5rem' }}>
                    You have not enrolled in any batch yet or your search query did not match. Enter the join code provided by your faculty above to unlock course materials immediately.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : 

        /* =========================================================================
            TAB 2: ALL DEADLINES & COURSEWORK PAGE
           ========================================================================= */
        activeTab === 'deadlines' ? (
          <div>
            {/* Filter Pills & Stats Row */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
              gap: '1rem',
            }}>
              <div className="cm-scrollable-pills" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {[
                  { key: 'ALL', label: `All (${displayDeadlines.length})` },
                  { key: 'PENDING', label: `Pending (${displayDeadlines.filter(d => !d.submitted).length})` },
                  { key: 'SUBMITTED', label: `Submitted (${displayDeadlines.filter(d => d.submitted).length})` },
                  { key: 'EVALUATED', label: `Graded (${displayDeadlines.filter(d => d.marksPublished).length})` },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setDeadlineFilter(tab.key)}
                    style={{
                      padding: '0.55rem 1.15rem',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: deadlineFilter === tab.key ? '#0B132B' : '#FFFFFF',
                      color: deadlineFilter === tab.key ? '#FFFFFF' : '#64748B',
                      boxShadow: deadlineFilter === tab.key ? '0 2px 6px rgba(11, 19, 43, 0.2)' : '0 1px 2px rgba(0,0,0,0.03)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 500 }}>
                Showing {filteredDeadlines.length} assignments
              </div>
            </div>

            {/* Assignment Cards List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredDeadlines.length > 0 ? (
                filteredDeadlines.map((item) => {
                  const dueDateObj = item.dueDate ? new Date(item.dueDate) : null;
                  const dayStr = dueDateObj ? dueDateObj.getDate() : '28';
                  const monthStr = dueDateObj ? dueDateObj.toLocaleString('en-US', { month: 'short' }).toUpperCase() : 'OCT';

                  return (
                    <div
                      key={item.assignmentId || item.id}
                      onClick={() => setSubmittingAsg(item)}
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '16px',
                        border: '1px solid #E2E8F0',
                        padding: '1.35rem 1.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                        cursor: 'pointer',
                        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.06)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.03)';
                      }}
                    >
                      {/* Left: Date Block & Details */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                        <div style={{
                          width: '52px',
                          height: '52px',
                          borderRadius: '12px',
                          backgroundColor: '#F1F5F9',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          lineHeight: 1.1,
                        }}>
                          <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                            {dayStr}
                          </span>
                          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em' }}>
                            {monthStr}
                          </span>
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.25rem' }}>
                            <span style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              fontFamily: 'monospace',
                              backgroundColor: '#E0F2FE',
                              color: '#0369A1',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '4px',
                            }}>
                              {item.courseCode || 'COURSE'}
                            </span>
                            <span style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 600 }}>
                              {item.courseName || 'Course'}
                            </span>
                            <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>
                              · Max {item.maxMarks || 20} Marks
                            </span>
                          </div>

                          <h3 className="font-display" style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0F172A', margin: '0 0 0.25rem 0' }}>
                            {item.title}
                          </h3>
                          <p style={{ fontSize: '0.82rem', color: '#64748B', margin: 0 }}>
                            Due: {dueDateObj ? dueDateObj.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Pending'}
                          </p>
                        </div>
                      </div>

                      {/* Right: Status Pill & Action */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
                          {item.marksPublished && item.marks !== null && item.marks !== undefined ? (
                            <span style={{
                              backgroundColor: '#CCFBF1',
                              color: '#0F766E',
                              borderRadius: '6px',
                              padding: '0.25rem 0.75rem',
                              fontSize: '0.82rem',
                              fontWeight: 800,
                            }}>
                              Score: {item.marks} / {item.maxMarks || 20}
                            </span>
                          ) : item.submitted ? (
                            <span style={{
                              backgroundColor: '#D1FAE5',
                              color: '#065F46',
                              borderRadius: '6px',
                              padding: '0.25rem 0.75rem',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                            }}>
                              {item.receiptToken ? `Submitted (${item.receiptToken})` : 'Submitted'}
                            </span>
                          ) : (
                            <span style={{
                              backgroundColor: '#FEF3C7',
                              color: '#B45309',
                              borderRadius: '6px',
                              padding: '0.25rem 0.75rem',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                            }}>
                              Not Submitted
                            </span>
                          )}
                        </div>

                        <button
                          style={{
                            backgroundColor: item.submitted ? '#F1F5F9' : '#0F766E',
                            color: item.submitted ? '#0F172A' : '#FFFFFF',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '0.55rem 1.15rem',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {item.submitted ? 'View Submission' : 'Submit Work'}
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  border: '1px solid #E2E8F0',
                  padding: '3.5rem',
                  textAlign: 'center',
                }}>
                  <Calendar size={48} color="#94A3B8" style={{ margin: '0 auto 1rem' }} />
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem' }}>
                    No Assignments Found
                  </h3>
                  <p style={{ color: '#64748B', fontSize: '0.9rem', margin: 0 }}>
                    You have no deadlines matching the selected filter.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : 

        /* =========================================================================
            TAB 3: NOTIFICATIONS PAGE
           ========================================================================= */
        activeTab === 'notifications' ? (
          <div style={{ maxWidth: '860px' }}>
            {/* Filter Buttons & Mark All Read Toolbar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
              gap: '1rem',
            }}>
              <div className="cm-scrollable-pills" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <button
                  onClick={() => setNotifFilter('ALL')}
                  style={{
                    padding: '0.5rem 1.15rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: notifFilter === 'ALL' ? '#0B132B' : '#FFFFFF',
                    color: notifFilter === 'ALL' ? '#FFFFFF' : '#64748B',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  }}
                >
                  All ({notifications.length})
                </button>
                <button
                  onClick={() => setNotifFilter('ANNOUNCEMENTS')}
                  style={{
                    padding: '0.5rem 1.15rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: notifFilter === 'ANNOUNCEMENTS' ? '#0F766E' : '#FFFFFF',
                    color: notifFilter === 'ANNOUNCEMENTS' ? '#FFFFFF' : '#0F766E',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  }}
                >
                  <Megaphone size={14} />
                  <span>Announcements ({announcementsNotifsCount})</span>
                </button>
                <button
                  onClick={() => setNotifFilter('UNREAD')}
                  style={{
                    padding: '0.5rem 1.15rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: notifFilter === 'UNREAD' ? '#0B132B' : '#FFFFFF',
                    color: notifFilter === 'UNREAD' ? '#FFFFFF' : '#64748B',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  }}
                >
                  Unread ({unreadNotifsCount})
                </button>
              </div>

              {notifications.some(n => !n.isRead) && (
                <button
                  onClick={handleMarkAllNotificationsRead}
                  style={{
                    backgroundColor: '#FFFFFF',
                    color: '#0F766E',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    padding: '0.5rem 1rem',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Mark all as read
                </button>
              )}
            </div>

            {loadingNotifs ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: '#64748B' }}>
                Loading notification updates...
              </div>
            ) : filteredNotifs.length === 0 ? (
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
                padding: '3.5rem',
                textAlign: 'center',
              }}>
                <Bell size={48} color="#94A3B8" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem' }}>
                  No Notifications
                </h3>
                <p style={{ color: '#64748B', fontSize: '0.9rem', margin: 0 }}>
                  You are all caught up! Announcements and course updates will appear here.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {filteredNotifs.map(n => {
                  const isAnnouncement = n.eventType === 'ANNOUNCEMENT';
                  const isUrgent = n.priority === 'URGENT';
                  const isImportant = n.priority === 'IMPORTANT';

                  return (
                    <div
                      key={n.id}
                      onClick={() => handleMarkSingleNotificationRead(n.id)}
                      style={{
                        backgroundColor: isAnnouncement
                          ? (n.isRead ? '#FFFFFF' : '#F0FDFA')
                          : (n.isRead ? '#FFFFFF' : '#F8FAFC'),
                        borderRadius: '14px',
                        border: isAnnouncement
                          ? (n.isRead ? '1px solid #CCFBF1' : '1.5px solid #0D9488')
                          : '1px solid ' + (n.isRead ? '#E2E8F0' : '#CBD5E1'),
                        padding: '1.25rem 1.5rem',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.1rem', flex: 1 }}>
                        <div style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '12px',
                          backgroundColor: isAnnouncement
                            ? (isUrgent ? '#FEE2E2' : '#CCFBF1')
                            : (n.isRead ? '#F1F5F9' : '#E0F2FE'),
                          color: isAnnouncement
                            ? (isUrgent ? '#DC2626' : '#0F766E')
                            : (n.isRead ? '#64748B' : '#0369A1'),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          {isAnnouncement ? <Megaphone size={20} /> : <Bell size={18} />}
                        </div>

                        <div style={{ flex: 1 }}>
                          {/* Announcement Badges & Author Header */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                            {isAnnouncement && (
                              <span style={{
                                backgroundColor: isUrgent ? '#FEE2E2' : (isImportant ? '#FEF3C7' : '#CCFBF1'),
                                color: isUrgent ? '#991B1B' : (isImportant ? '#B45309' : '#0F766E'),
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                padding: '2px 8px',
                                borderRadius: '4px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                              }}>
                                {isUrgent ? '⚡ Urgent Announcement' : (isImportant ? '★ Important Notice' : '📢 Official Announcement')}
                              </span>
                            )}

                            {n.authorName && (
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B' }}>
                                From {n.authorName}
                              </span>
                            )}

                            {!n.isRead && (
                              <span style={{
                                width: '7px',
                                height: '7px',
                                borderRadius: '50%',
                                backgroundColor: '#0F766E',
                              }} />
                            )}
                          </div>

                          <h4 style={{
                            fontSize: '1rem',
                            fontWeight: 700,
                            color: '#0F172A',
                            margin: '0 0 0.35rem 0',
                            lineHeight: 1.35,
                          }}>
                            {n.title}
                          </h4>

                          <p style={{
                            fontSize: '0.88rem',
                            color: '#334155',
                            margin: 0,
                            lineHeight: 1.5,
                            whiteSpace: 'pre-wrap',
                          }}>
                            {n.message}
                          </p>
                        </div>
                      </div>

                      <span style={{
                        fontSize: '0.78rem',
                        color: '#94A3B8',
                        whiteSpace: 'nowrap',
                        marginLeft: '1.25rem',
                        marginTop: '0.2rem',
                      }}>
                        {n.createdAt ? new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : 

        /* =========================================================================
            TAB 4: HOME 2-COLUMN DASHBOARD (Real Database Content)
           ========================================================================= */
        (
          <div className="cm-grid-hero-split" style={{
            gap: '2.5rem',
            alignItems: 'start',
          }}>
            {/* Left Column: Due Soon & Your Courses */}
            <div>
              {/* Professor Announcement Alert Banner */}
              {(() => {
                const latestAnn = notifications.find(n => n.eventType === 'ANNOUNCEMENT' && !n.isRead) ||
                                  notifications.find(n => n.eventType === 'ANNOUNCEMENT');
                if (!latestAnn) return null;
                const isUrgent = latestAnn.priority === 'URGENT';
                return (
                  <div style={{
                    backgroundColor: '#0B132B',
                    borderRadius: '16px',
                    padding: '1.25rem 1.6rem',
                    marginBottom: '2rem',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 8px 24px -4px rgba(11, 19, 43, 0.28)',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    borderLeft: isUrgent ? '5px solid #EF4444' : '5px solid #5EE0C4',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.1rem', flex: 1, minWidth: '260px' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        backgroundColor: '#152542',
                        color: isUrgent ? '#F87171' : '#5EE0C4',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Megaphone size={20} />
                      </div>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{
                            backgroundColor: isUrgent ? '#7F1D1D' : '#132F4C',
                            color: isUrgent ? '#FCA5A5' : '#5EE0C4',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                          }}>
                            {isUrgent ? '⚡ Urgent Announcement' : '📢 Faculty Announcement'}
                          </span>
                          <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>
                            {latestAnn.authorName || 'Faculty'} · {latestAnn.createdAt ? new Date(latestAnn.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Recent'}
                          </span>
                        </div>
                        <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 2px 0' }}>
                          {latestAnn.title}
                        </h4>
                        <p style={{
                          fontSize: '0.85rem',
                          color: '#CBD5E1',
                          margin: 0,
                          lineHeight: 1.4,
                          display: '-webkit-box',
                          WebkitLineClamp: 1,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}>
                          {latestAnn.message}
                        </p>
                      </div>
                    </div>

                    <Link
                      to="/dashboard?tab=notifications"
                      style={{
                        backgroundColor: isUrgent ? '#EF4444' : '#5EE0C4',
                        color: isUrgent ? '#FFFFFF' : '#0B132B',
                        padding: '0.6rem 1.25rem',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 800,
                        textDecoration: 'none',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                      }}
                    >
                      View in Notifications
                    </Link>
                  </div>
                );
              })()}

              {/* Due soon section */}
              <div style={{ marginBottom: '2.5rem' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1.1rem',
                }}>
                  <h2 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>
                    Due soon
                  </h2>
                  <Link
                    to="/dashboard?tab=deadlines"
                    style={{
                      color: '#0D9488',
                      textDecoration: 'none',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                    }}
                  >
                    All deadlines ({displayDeadlines.length})
                  </Link>
                </div>

                {/* Assignment Cards List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {displayDeadlines.length > 0 ? (
                    displayDeadlines.slice(0, 3).map((item) => {
                      const dueDateObj = item.dueDate ? new Date(item.dueDate) : null;
                      const dayStr = dueDateObj ? dueDateObj.getDate() : '28';
                      const monthStr = dueDateObj ? dueDateObj.toLocaleString('en-US', { month: 'short' }).toUpperCase() : 'OCT';

                      return (
                        <div
                          key={item.assignmentId || item.id}
                          onClick={() => setSubmittingAsg(item)}
                          style={{
                            backgroundColor: '#FFFFFF',
                            borderRadius: '16px',
                            border: '1px solid #E2E8F0',
                            padding: '1.15rem 1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                            cursor: 'pointer',
                            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.06)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.03)';
                          }}
                        >
                          {/* Left: Date Block & Details */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1.1rem' }}>
                            <div style={{
                              width: '46px',
                              height: '46px',
                              borderRadius: '10px',
                              backgroundColor: '#F1F5F9',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              lineHeight: 1.1,
                            }}>
                              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>
                                {dayStr}
                              </span>
                              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em' }}>
                                {monthStr}
                              </span>
                            </div>

                            <div>
                              <h3 className="font-display" style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.25rem' }}>
                                {item.title}
                              </h3>
                              <p style={{ fontSize: '0.82rem', color: '#64748B', margin: 0 }}>
                                {item.courseName || 'Course'} · Due {dueDateObj ? dueDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '11:59 PM'}
                              </p>
                            </div>
                          </div>

                          {/* Right: Due Time & Status Badge */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
                            <span style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 500 }}>
                              {item.submitted ? 'Submitted' : 'Pending'}
                            </span>

                            {item.submitted ? (
                              <span style={{
                                backgroundColor: '#D1FAE5',
                                color: '#065F46',
                                borderRadius: '6px',
                                padding: '0.2rem 0.65rem',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                              }}>
                                {item.receiptToken ? `Received (${item.receiptToken})` : 'Received'}
                              </span>
                            ) : (
                              <span style={{
                                backgroundColor: '#FEF3C7',
                                color: '#B45309',
                                borderRadius: '6px',
                                padding: '0.2rem 0.65rem',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                              }}>
                                Not submitted
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '16px',
                      border: '1px solid #E2E8F0',
                      padding: '2rem',
                      textAlign: 'center',
                      color: '#64748B',
                    }}>
                      <CheckCircle2 size={32} color="#059669" style={{ margin: '0 auto 8px' }} />
                      <div style={{ fontWeight: 700, color: '#0F172A' }}>No upcoming deadlines</div>
                      <div style={{ fontSize: '0.85rem' }}>You're completely caught up with all assignment deliverables!</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Your courses section */}
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1.1rem',
                }}>
                  <h2 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>
                    Your courses
                  </h2>
                  <Link
                    to="/dashboard?tab=courses"
                    style={{
                      color: '#0D9488',
                      textDecoration: 'none',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                    }}
                  >
                    View all ({courses.length})
                  </Link>
                </div>

                {/* 2x2 Course Cards Grid */}
                <div className="cm-grid-cards-auto" style={{ gap: '1.25rem' }}>
                  {courses.length > 0 ? (
                    courses.map((course, idx) => {
                      const colorScheme = badgeColors[idx % badgeColors.length];
                      const acronym = getCourseAcronym(course.name);

                      return (
                        <Link
                          key={course.id}
                          to={`/courses/${course.id}`}
                          style={{
                            textDecoration: 'none',
                            backgroundColor: '#FFFFFF',
                            borderRadius: '16px',
                            border: '1px solid #E2E8F0',
                            padding: '1.4rem',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            minHeight: '175px',
                            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                              <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                backgroundColor: colorScheme.bg,
                                color: colorScheme.text,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontFamily: 'monospace',
                                fontSize: '0.85rem',
                              }}>
                                {acronym}
                              </div>

                              <span style={{
                                fontFamily: 'monospace',
                                fontSize: '0.78rem',
                                color: '#64748B',
                                fontWeight: 600,
                              }}>
                                {course.code}
                              </span>
                            </div>

                            <h3 className="font-display" style={{
                              fontSize: '1.15rem',
                              fontWeight: 700,
                              color: '#0F172A',
                              marginBottom: '0.3rem',
                              lineHeight: 1.3,
                            }}>
                              {course.name}
                            </h3>
                            <p style={{ fontSize: '0.82rem', color: '#64748B', margin: 0 }}>
                              {course.owner?.name ? (course.owner.name.startsWith('Prof.') ? course.owner.name : `Prof. ${course.owner.name}`) : 'Prof. Faculty'}
                            </p>
                          </div>

                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginTop: '1.25rem',
                            paddingTop: '0.85rem',
                            borderTop: '1px solid #F1F5F9',
                          }}>
                            <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                              {course.units ? `${course.units.length} units` : 'Syllabus Space'}
                            </span>

                            <span style={{
                              backgroundColor: '#D1FAE5',
                              color: '#065F46',
                              borderRadius: '6px',
                              padding: '0.2rem 0.6rem',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                            }}>
                              Active
                            </span>
                          </div>
                        </Link>
                      );
                    })
                  ) : (
                    <div style={{
                      gridColumn: '1 / -1',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '16px',
                      border: '1px solid #E2E8F0',
                      padding: '2rem',
                      textAlign: 'center',
                      color: '#64748B',
                    }}>
                      <BookOpen size={32} color="#94A3B8" style={{ margin: '0 auto 8px' }} />
                      <div style={{ fontWeight: 700, color: '#0F172A' }}>No Enrolled Courses</div>
                      <div style={{ fontSize: '0.85rem' }}>Enter the join code from your instructor to enroll in your courses.</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Join a Batch & Recently Added */}
            <div>
              {/* Join a batch Dark Navy Card */}
              <div style={{
                backgroundColor: '#0B132B',
                borderRadius: '20px',
                padding: '1.75rem',
                color: '#FFFFFF',
                boxShadow: '0 10px 25px -5px rgba(11, 19, 43, 0.3)',
                marginBottom: '2rem',
              }}>
                <h2 className="font-display" style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.45rem', color: '#FFFFFF' }}>
                  Join a batch
                </h2>
                <p style={{ fontSize: '0.82rem', color: '#94A3B8', lineHeight: 1.45, marginBottom: '1.4rem' }}>
                  Enter the code your faculty shared. Every earlier resource of the course unlocks at once.
                </p>

                <form onSubmit={handleJoinBatch}>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.45rem' }}>
                    Join code
                  </label>
                  <div style={{ marginBottom: '1.1rem' }}>
                    <input
                      type="text"
                      required
                      maxLength={12}
                      placeholder="DBMS-7K2M"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      style={{
                        width: '100%',
                        backgroundColor: '#152542',
                        border: '1px solid #233554',
                        borderRadius: '10px',
                        padding: '0.85rem 1rem',
                        color: '#FFFFFF',
                        fontFamily: 'monospace',
                        fontSize: '1.15rem',
                        fontWeight: 700,
                        letterSpacing: '0.12em',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={joining}
                    style={{
                      width: '100%',
                      backgroundColor: '#5EE0C4',
                      color: '#0B132B',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '0.75rem',
                      fontWeight: 800,
                      fontSize: '0.92rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(94, 224, 196, 0.25)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {joining ? 'Joining batch...' : 'Join batch'}
                  </button>
                </form>
              </div>

              {/* Recently added Widget */}
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '20px',
                border: '1px solid #E2E8F0',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
              }}>
                <h3 className="font-display" style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', marginBottom: '1.25rem' }}>
                  Recently added
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {recentResources.length > 0 ? (
                    recentResources.map((item, idx) => {
                      const isUrl = item.resourceType === 'URL';
                      const badgeType = isUrl ? 'LINK' : (item.mimeType?.includes('pdf') ? 'PDF' : 'DOC');
                      const badgeBg = isUrl ? '#E0F2FE' : '#FEE2E2';
                      const badgeText = isUrl ? '#0369A1' : '#B91C1C';

                      return (
                        <div
                          key={item.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.85rem',
                            padding: '0.85rem 0',
                            borderBottom: idx === recentResources.length - 1 ? 'none' : '1px solid #F1F5F9',
                          }}
                        >
                          <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '8px',
                            backgroundColor: badgeBg,
                            color: badgeText,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontFamily: 'monospace',
                            fontSize: '0.72rem',
                            flexShrink: 0,
                          }}>
                            {badgeType}
                          </div>

                          <div style={{ overflow: 'hidden', flex: 1 }}>
                            <div style={{
                              fontSize: '0.88rem',
                              fontWeight: 700,
                              color: '#0F172A',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              marginBottom: '0.15rem',
                            }}>
                              <a
                                href={item.externalUrl || `http://localhost:8081/api/v1/files/${item.fileUrl}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: 'inherit', textDecoration: 'none' }}
                              >
                                {item.title}
                              </a>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                              {item.courseName ? `${item.courseName} · ` : ''}
                              {item.createdAt ? new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Recent'}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ textAlign: 'center', padding: '1.5rem 0', color: '#94A3B8', fontSize: '0.85rem' }}>
                      No recent resources published yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Assignment Submission & Evaluation Modal */}
        {submittingAsg && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(11, 19, 43, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}>
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '520px',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#0D9488', textTransform: 'uppercase' }}>
                    {submittingAsg.courseName || 'Coursework'}
                  </span>
                  <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: '2px 0 6px 0' }}>
                    {submittingAsg.title}
                  </h3>
                  <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
                    {submittingAsg.dueDate ? `Due: ${new Date(submittingAsg.dueDate).toLocaleString()}` : 'Due Soon'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSubmittingAsg(null);
                    setSubmitSuccess('');
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
                >
                  <X size={20} />
                </button>
              </div>

              {submitSuccess ? (
                <div style={{
                  padding: '20px',
                  backgroundColor: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  borderRadius: '12px',
                  color: '#065F46',
                  fontSize: '14px',
                  fontWeight: 600,
                  textAlign: 'center',
                }}>
                  <CheckCircle2 size={36} color="#059669" style={{ margin: '0 auto 10px' }} />
                  <div>{submitSuccess}</div>
                </div>
              ) : submittingAsg.submitted ? (
                <div>
                  <div style={{
                    padding: '16px',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    marginBottom: '16px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ backgroundColor: '#D1FAE5', color: '#065F46', fontSize: '12px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px' }}>
                        Submitted
                      </span>
                      {submittingAsg.receiptToken && (
                        <span style={{ fontSize: '12px', color: '#64748B', fontFamily: 'monospace' }}>
                          Receipt: {submittingAsg.receiptToken}
                        </span>
                      )}
                    </div>
                    {submittingAsg.marks !== null && submittingAsg.marks !== undefined && submittingAsg.marksPublished ? (
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>Evaluated Score</div>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F766E' }}>
                          {submittingAsg.marks} / {submittingAsg.maxMarks || 20}
                        </div>
                      </div>
                    ) : (
                      <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
                        Your submission has been securely recorded with an automated tamper-proof receipt token. Awaiting faculty evaluation.
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setSubmittingAsg(null)}
                    style={{
                      width: '100%',
                      backgroundColor: '#0B132B',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '11px',
                      fontSize: '14px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Close
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitAssignment}>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Upload Submission File (PDF, DOCX, ZIP) *
                    </label>
                    <input
                      type="file"
                      required
                      onChange={(e) => setSubmitFile(e.target.files[0])}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px dashed #CBD5E1',
                        borderRadius: '10px',
                        backgroundColor: '#F8FAFC',
                        fontSize: '13px',
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Notes or Remarks (Optional)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Add any notes or context about your submission..."
                      value={submitText}
                      onChange={(e) => setSubmitText(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '10px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13px',
                        resize: 'vertical',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setSubmittingAsg(null)}
                      style={{ background: 'transparent', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '10px 16px', fontSize: '13px', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      style={{
                        backgroundColor: '#0F766E',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '10px 20px',
                        fontSize: '13.5px',
                        fontWeight: 700,
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Assignment'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
