import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Sidebar from '../components/Sidebar';
import { 
  Plus, BookOpen, Users, Layers, ArrowRight, AlertCircle, Sparkles, 
  Check, X, Bell, Search, Copy, CheckCheck, Clock, FileText, CheckCircle2, Award, ExternalLink,
  Megaphone, RotateCcw, Trash2, Send, Radio, Info
} from 'lucide-react';

const BADGE_COLORS = [
  { bg: '#E8F8F5', text: '#0F766E' }, // Teal
  { bg: '#EFF6FF', text: '#1D4ED8' }, // Blue
  { bg: '#F3E8FF', text: '#6D28D9' }, // Purple
  { bg: '#FEF3C7', text: '#B45309' }, // Amber
  { bg: '#FEE2E2', text: '#B91C1C' }, // Red
  { bg: '#ECFDF5', text: '#047857' }, // Emerald
];

export default function FacultyDashboard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeTab = searchParams.get('tab') || 'overview';

  const [courses, setCourses] = useState([]);
  const [courseBatches, setCourseBatches] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState('');

  // Course Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [program, setProgram] = useState('MCA');
  const [semester, setSemester] = useState('Semester 3');
  const [description, setDescription] = useState('');
  const [units, setUnits] = useState([]);
  const [creating, setCreating] = useState(false);

  // Batch Modal State
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [selectedCourseForBatch, setSelectedCourseForBatch] = useState(null);
  const [batchName, setBatchName] = useState('');
  const [batchTerm, setBatchTerm] = useState('Semester 3');
  const [batchJoinMode, setBatchJoinMode] = useState('AUTO_APPROVE');
  const [creatingBatch, setCreatingBatch] = useState(false);

  // Real Join Requests from Database
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Real Submissions Awaiting Grading from Database
  const [submissionsToGrade, setSubmissionsToGrade] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [notifFilter, setNotifFilter] = useState('ALL');

  // Announcements State
  const [announcements, setAnnouncements] = useState([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
  const [announcementFilter, setAnnouncementFilter] = useState('ALL'); // ALL, ACTIVE, REVERTED
  const [announcementSearch, setAnnouncementSearch] = useState('');
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [revertingId, setRevertingId] = useState(null);

  // Announcement Composer Form State
  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');
  const [annTargetType, setAnnTargetType] = useState('GENERAL'); // GENERAL, COURSE, BATCH, SELECTIVE_BATCHES
  const [annCourseId, setAnnCourseId] = useState('');
  const [annBatchId, setAnnBatchId] = useState('');
  const [annBatchIds, setAnnBatchIds] = useState([]);
  const [annPriority, setAnnPriority] = useState('NORMAL'); // NORMAL, IMPORTANT, URGENT
  const [broadcasting, setBroadcasting] = useState(false);

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

  const fetchAnnouncements = async () => {
    try {
      setLoadingAnnouncements(true);
      const res = await api.get('/announcements');
      setAnnouncements(res.data || []);
    } catch (e) {
      console.error(e);
      setAnnouncements([]);
    } finally {
      setLoadingAnnouncements(false);
    }
  };

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!annTitle.trim() || !annMessage.trim()) {
      setError('Please provide both a title and message for the announcement.');
      return;
    }
    if (annTargetType === 'COURSE' && !annCourseId) {
      setError('Please select a course for the course announcement.');
      return;
    }
    if (annTargetType === 'BATCH' && !annBatchId) {
      setError('Please select a specific batch for this announcement.');
      return;
    }
    if (annTargetType === 'SELECTIVE_BATCHES' && annBatchIds.length === 0) {
      setError('Please select at least one batch for selective batches announcement.');
      return;
    }

    try {
      setBroadcasting(true);
      setError('');
      const payload = {
        title: annTitle.trim(),
        message: annMessage.trim(),
        targetType: annTargetType,
        courseId: annTargetType === 'COURSE' ? Number(annCourseId) : null,
        batchId: annTargetType === 'BATCH' ? Number(annBatchId) : null,
        batchIds: annTargetType === 'SELECTIVE_BATCHES' ? annBatchIds.map(Number) : null,
        priority: annPriority,
      };

      const res = await api.post('/announcements', payload);
      setMessage(res.message || 'Announcement broadcasted successfully to students!');
      setTimeout(() => setMessage(''), 4500);
      setIsAnnouncementModalOpen(false);
      // Reset form
      setAnnTitle('');
      setAnnMessage('');
      setAnnTargetType('GENERAL');
      setAnnCourseId('');
      setAnnBatchId('');
      setAnnBatchIds([]);
      setAnnPriority('NORMAL');
      await fetchAnnouncements();
    } catch (err) {
      setError(err.message || 'Failed to broadcast announcement');
    } finally {
      setBroadcasting(false);
    }
  };

  const handleRevertAnnouncement = async (id, title) => {
    if (!window.confirm(`Are you sure you want to revert announcement "${title}"?\n\nThis will instantly revoke and remove all notification messages from the students' notification feeds.`)) {
      return;
    }

    try {
      setRevertingId(id);
      const res = await api.patch(`/announcements/${id}/revert`);
      setMessage(res.message || 'Announcement reverted! Student notifications removed.');
      setTimeout(() => setMessage(''), 4500);
      await fetchAnnouncements();
    } catch (err) {
      setError(err.message || 'Failed to revert announcement');
    } finally {
      setRevertingId(null);
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm('Delete this announcement permanently from history?')) {
      return;
    }
    try {
      await api.delete(`/announcements/${id}`);
      setMessage('Announcement deleted successfully.');
      setTimeout(() => setMessage(''), 3000);
      await fetchAnnouncements();
    } catch (err) {
      setError(err.message || 'Failed to delete announcement');
    }
  };

  const getAllFacultyBatches = () => {
    const list = [];
    courses.forEach(c => {
      const bList = courseBatches[c.id] || [];
      bList.forEach(b => {
        list.push({ ...b, courseName: c.name, courseCode: c.code });
      });
    });
    return list;
  };

  const fetchJoinRequests = async () => {
    try {
      setLoadingRequests(true);
      const res = await api.get('/faculty/join-requests');
      const list = res.data || [];
      const mapped = list.map((r, idx) => {
        const names = (r.studentName || 'Student').trim().split(' ');
        const initials = (names[0][0] + (names.length > 1 ? names[names.length - 1][0] : '')).toUpperCase();
        return {
          id: r.id,
          batchId: r.batchId,
          name: r.studentName,
          email: r.studentEmail,
          initials,
          program: r.courseName || 'Course',
          batchName: r.batchName,
          timeAgo: r.joinedAt ? new Date(r.joinedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Recently',
          color: BADGE_COLORS[idx % BADGE_COLORS.length],
        };
      });
      setPendingRequests(mapped);
    } catch (e) {
      console.error(e);
      setPendingRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  };

  const fetchPendingSubmissions = async () => {
    try {
      setLoadingSubmissions(true);
      const res = await api.get('/faculty/pending-submissions');
      const list = res.data || [];
      const mapped = list.map(sub => ({
        id: sub.id,
        assignmentId: sub.assignmentId,
        studentName: sub.studentName,
        assignmentTitle: sub.assignmentTitle || 'Assignment Deliverable',
        courseName: sub.courseName || 'Course Space',
        courseId: sub.courseId || 2,
        timeAgo: sub.submittedAt ? new Date(sub.submittedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Recently',
        receiptToken: sub.receiptToken,
      }));
      setSubmissionsToGrade(mapped);
    } catch (e) {
      console.error(e);
      setSubmissionsToGrade([]);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  useEffect(() => {
    fetchCourses();
    fetchJoinRequests();
    fetchPendingSubmissions();
  }, []);

  useEffect(() => {
    if (activeTab === 'notifications') {
      fetchNotifications();
    }
    if (activeTab === 'requests') {
      fetchJoinRequests();
    }
    if (activeTab === 'announcements') {
      fetchAnnouncements();
    }
  }, [activeTab]);

  const handleApproveRequest = async (req) => {
    try {
      await api.patch(`/batches/${req.batchId}/enrollments/${req.id}`, { status: 'ACTIVE' });
      setPendingRequests(prev => prev.filter(r => r.id !== req.id));
      setMessage(`Approved join request for ${req.name}!`);
      setTimeout(() => setMessage(''), 3000);
      await fetchCourses();
    } catch (err) {
      setError(err.message || 'Failed to approve request');
    }
  };

  const handleDeclineRequest = async (req) => {
    try {
      await api.patch(`/batches/${req.batchId}/enrollments/${req.id}`, { status: 'REMOVED' });
      setPendingRequests(prev => prev.filter(r => r.id !== req.id));
      setMessage(`Declined join request for ${req.name}.`);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to decline request');
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/courses');
      const coursesList = res.data || [];
      setCourses(coursesList);

      // Fetch real batches for each course
      const batchesMap = {};
      await Promise.all(
        coursesList.map(async (c) => {
          try {
            const bRes = await api.get(`/courses/${c.id}/batches`);
            batchesMap[c.id] = bRes.data || [];
          } catch (e) {
            batchesMap[c.id] = [];
          }
        })
      );
      setCourseBatches(batchesMap);
    } catch (err) {
      setError(err.message || 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUnitField = () => {
    setUnits([...units, `Unit ${units.length + 1}: `]);
  };

  const handleUnitChange = (index, value) => {
    const updated = [...units];
    updated[index] = value;
    setUnits(updated);
  };

  const handleRemoveUnitField = (index) => {
    setUnits(units.filter((_, i) => i !== index));
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const payload = {
        name,
        code,
        program,
        semester,
        description,
        initialUnits: units.filter(u => u.trim().length > 0),
      };
      await api.post('/courses', payload);
      setIsModalOpen(false);
      setName('');
      setCode('');
      setDescription('');
      setUnits([]);
      setMessage('Course Space created successfully!');
      setTimeout(() => setMessage(''), 3000);
      await fetchCourses();
    } catch (err) {
      setError(err.message || 'Failed to create course');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    if (!selectedCourseForBatch) return;
    setCreatingBatch(true);
    setError('');
    try {
      const payload = {
        name: batchName,
        term: batchTerm,
        joinMode: batchJoinMode,
      };
      await api.post(`/courses/${selectedCourseForBatch.id}/batches`, payload);
      setIsBatchModalOpen(false);
      setBatchName('');
      setMessage(`New batch created for ${selectedCourseForBatch.name}!`);
      setTimeout(() => setMessage(''), 3000);
      await fetchCourses();
    } catch (err) {
      setError(err.message || 'Failed to create batch');
    } finally {
      setCreatingBatch(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(''), 2500);
  };

  // Real batches from database
  const allBatches = Object.entries(courseBatches).flatMap(([cId, bList]) => {
    const courseObj = courses.find(c => String(c.id) === String(cId));
    return bList.map(b => ({ ...b, courseName: courseObj?.name, courseCode: courseObj?.code }));
  });

  const totalBatchesCount = allBatches.length;
  const totalStudentsCount = allBatches.reduce((acc, b) => acc + (b.activeStudentCount || 0), 0);

  // Filtered courses
  const filteredCourses = courses.filter(c => {
    if (!searchQuery.trim()) return true;
    const term = searchQuery.toLowerCase();
    return c.name?.toLowerCase().includes(term) || c.code?.toLowerCase().includes(term);
  });

  const unreadNotifsCount = notifications.filter(n => !n.isRead).length;

  // Formatted date string for header matching student view
  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  return (
    <div className="cm-layout-container" style={{ backgroundColor: '#F8FAFC' }}>
      {/* Dark Navy Persistent Sidebar */}
      <Sidebar activeNav={activeTab} />

      {/* Main Faculty Content */}
      <main className="cm-main-area" style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
        {/* Top Header */}
        <div className="cm-page-header" style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '2rem',
        }}>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748B', marginBottom: '0.25rem' }}>
              {todayFormatted} · Faculty Workspace
            </div>
            <h1 className="font-display" style={{
              fontSize: '2rem',
              fontWeight: 800,
              color: '#0F172A',
              letterSpacing: '-0.025em',
              marginBottom: '0.35rem',
            }}>
              {activeTab === 'overview' ? 'Faculty Command Overview' :
               activeTab === 'courses' ? 'Course Spaces & Curriculum' :
               activeTab === 'requests' ? 'Student Join Requests' :
               activeTab === 'announcements' ? 'Announcements Center' :
               'Notification Center'}
            </h1>
            <p style={{ margin: 0, color: '#64748B', fontSize: '0.95rem' }}>
              {activeTab === 'overview' ? 'Live status across your curriculum spaces, batches, student submissions, and join requests.' :
               activeTab === 'courses' ? 'Organize syllabus resources, create semester batches, and manage coursework assignments.' :
               activeTab === 'requests' ? 'Review and approve students who submitted batch join codes.' :
               activeTab === 'announcements' ? 'Broadcast batch-specific, course-level, or general announcements directly to student notifications.' :
               'Real-time updates on assignments, submissions, and course enrollments.'}
            </p>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {activeTab === 'courses' && (
              <div style={{ position: 'relative', width: '260px' }}>
                <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search courses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem 0.6rem 2.4rem',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.88rem',
                    outline: 'none',
                    backgroundColor: '#FFFFFF',
                    fontFamily: 'var(--font-body)',
                  }}
                />
              </div>
            )}

            {activeTab === 'announcements' ? (
              <button
                onClick={() => setIsAnnouncementModalOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: '#0F766E',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0.65rem 1.25rem',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                <Megaphone size={18} />
                <span>Broadcast Announcement</span>
              </button>
            ) : (
              <button
                onClick={() => setIsModalOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: '#0F766E',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0.65rem 1.25rem',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                <Plus size={18} />
                <span>Create Course</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Messages */}
        {message && (
          <div style={{
            padding: '12px 18px',
            backgroundColor: '#ECFDF5',
            color: '#065F46',
            borderRadius: '10px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: 600,
            border: '1px solid #A7F3D0',
          }}>
            <CheckCircle2 size={18} color="#059669" />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#FEF2F2',
            color: '#B91C1C',
            borderRadius: '10px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            border: '1px solid #FEE2E2',
          }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* =========================================================================
            TAB 1: FACULTY OVERVIEW (Real Database Content)
           ========================================================================= */}
        {activeTab === 'overview' && (
          <div>
            {/* 4 Metric Cards */}
            <div className="cm-grid-4-stats" style={{
              marginBottom: '2rem',
            }}>
              <div style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '16px',
                padding: '1.25rem 1.4rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748B' }}>Course Spaces</span>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#E8F8F5', color: '#0F766E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BookOpen size={18} />
                  </div>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0F172A', fontFamily: 'var(--font-code)', marginBottom: '0.25rem', letterSpacing: '-0.02em' }}>
                  {courses.length}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748B' }}>Active syllabus spaces</div>
              </div>

              <div style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '16px',
                padding: '1.25rem 1.4rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748B' }}>Active Batches</span>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#EFF6FF', color: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Layers size={18} />
                  </div>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0F172A', fontFamily: 'var(--font-code)', marginBottom: '0.25rem', letterSpacing: '-0.02em' }}>
                  {totalBatchesCount}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748B' }}>{totalStudentsCount} enrolled students</div>
              </div>

              <div style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '16px',
                padding: '1.25rem 1.4rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748B' }}>Pending Grading</span>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#FEF3C7', color: '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={18} />
                  </div>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0F172A', fontFamily: 'var(--font-code)', marginBottom: '0.25rem', letterSpacing: '-0.02em' }}>
                  {submissionsToGrade.length}
                </div>
                <div style={{ fontSize: '0.78rem', color: submissionsToGrade.length > 0 ? '#B45309' : '#059669', fontWeight: 600 }}>
                  {submissionsToGrade.length > 0 ? 'Needs teacher review' : 'All caught up!'}
                </div>
              </div>

              <div style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '16px',
                padding: '1.25rem 1.4rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748B' }}>Join Requests</span>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#F3E8FF', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={18} />
                  </div>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0F172A', fontFamily: 'var(--font-code)', marginBottom: '0.25rem', letterSpacing: '-0.02em' }}>
                  {pendingRequests.length}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748B' }}>Awaiting verification</div>
              </div>
            </div>

            {/* 2-Column Command Layout */}
            <div className="cm-grid-faculty-split" style={{
              alignItems: 'start',
            }}>
              {/* Left Column: Recent Courses & Submissions Desk */}
              <div>
                {/* Course Spaces Section */}
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h2 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      Active Course Spaces
                    </h2>
                    <Link
                      to="/dashboard?tab=courses"
                      style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0D9488', textDecoration: 'none' }}
                    >
                      View all courses →
                    </Link>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
                    {courses.slice(0, 4).map((course, idx) => {
                      const badgeStyle = BADGE_COLORS[idx % BADGE_COLORS.length];
                      const acronym = (course.name || 'CS').split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase();
                      const batches = courseBatches[course.id] || [];

                      return (
                        <div
                          key={course.id}
                          style={{
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #E2E8F0',
                            borderRadius: '16px',
                            padding: '1.25rem',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            minHeight: '190px',
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
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                              <div style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '10px',
                                backgroundColor: badgeStyle.bg,
                                color: badgeStyle.text,
                                fontWeight: 800,
                                fontFamily: 'var(--font-code)',
                                fontSize: '0.95rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}>
                                {acronym}
                              </div>
                              <span style={{
                                fontFamily: 'var(--font-code)',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                color: '#64748B',
                                backgroundColor: '#F1F5F9',
                                padding: '0.25rem 0.65rem',
                                borderRadius: '6px',
                              }}>
                                {course.code}
                              </span>
                            </div>

                            <h3 className="font-display" style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0F172A', margin: '0 0 0.25rem 0', lineHeight: 1.3 }}>
                              {course.name}
                            </h3>
                            <p style={{ fontSize: '0.82rem', color: '#64748B', margin: 0 }}>
                              {course.program || 'MCA'} · {course.semester || 'Semester 3'}
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
                            <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 500 }}>
                              {batches.length} {batches.length === 1 ? 'batch' : 'batches'}
                            </span>
                            <Link
                              to={`/courses/${course.id}`}
                              style={{
                                color: '#0D9488',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                textDecoration: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <span>Enter Space</span>
                              <ArrowRight size={14} />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Submissions to Grade Section */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h2 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                        Submissions Awaiting Review
                      </h2>
                      <span style={{
                        backgroundColor: '#FEF3C7',
                        color: '#B45309',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        padding: '0.2rem 0.6rem',
                        borderRadius: '9999px',
                        fontFamily: 'var(--font-code)',
                      }}>
                        {submissionsToGrade.length}
                      </span>
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                    {submissionsToGrade.length > 0 ? (
                      submissionsToGrade.map((sub, idx) => (
                        <div
                          key={sub.id}
                          style={{
                            padding: '1rem 1.25rem',
                            borderBottom: idx === submissionsToGrade.length - 1 ? 'none' : '1px solid #F1F5F9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                            <div style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '10px',
                              backgroundColor: '#F1F5F9',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#0F766E',
                            }}>
                              <FileText size={20} />
                            </div>
                            <div>
                              <div className="font-display" style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.2rem' }}>
                                {sub.assignmentTitle}
                              </div>
                              <div style={{ fontSize: '0.82rem', color: '#64748B' }}>
                                Submitted by <strong style={{ color: '#0F172A' }}>{sub.studentName}</strong> · Receipt: <code style={{ fontFamily: 'var(--font-code)', fontSize: '0.82rem', backgroundColor: '#F1F5F9', padding: '0.15rem 0.45rem', borderRadius: '4px', color: '#475569' }}>{sub.receiptToken}</code> · {sub.timeAgo}
                              </div>
                            </div>
                          </div>

                          <Link
                            to={`/courses/${sub.courseId}?tab=assignments`}
                            style={{
                              backgroundColor: '#0F766E',
                              color: '#FFFFFF',
                              borderRadius: '8px',
                              padding: '0.5rem 1.1rem',
                              fontSize: '0.82rem',
                              fontWeight: 600,
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontFamily: 'var(--font-body)',
                            }}
                          >
                            <span>Grade Now</span>
                            <ExternalLink size={13} />
                          </Link>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', color: '#64748B', fontSize: '0.9rem' }}>
                        <CheckCircle2 size={32} color="#059669" style={{ margin: '0 auto 8px' }} />
                        <h3 className="font-display" style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.25rem' }}>All Submissions Graded</h3>
                        <div style={{ fontSize: '0.85rem' }}>There are no student submissions pending review.</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Pending Join Requests & Join Codes */}
              <div>
                {/* Join Requests Widget */}
                <div style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  border: '1px solid #E2E8F0',
                  padding: '1.4rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  marginBottom: '1.5rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h3 className="font-display" style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      Pending Join Requests
                    </h3>
                    <Link to="/dashboard?tab=requests" style={{ fontSize: '0.82rem', color: '#0D9488', fontWeight: 700, textDecoration: 'none' }}>
                      All ({pendingRequests.length})
                    </Link>
                  </div>

                  {pendingRequests.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem 0', color: '#64748B', fontSize: '0.85rem' }}>
                      <Check size={28} color="#059669" style={{ margin: '0 auto 8px' }} />
                      <div style={{ fontWeight: 600 }}>No pending join requests</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {pendingRequests.map(req => (
                        <div
                          key={req.id}
                          style={{
                            padding: '0.75rem 0.85rem',
                            borderRadius: '10px',
                            backgroundColor: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.65rem' }}>
                            <div style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '50%',
                              backgroundColor: req.color.bg,
                              color: req.color.text,
                              fontWeight: 800,
                              fontFamily: 'var(--font-code)',
                              fontSize: '0.8rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}>
                              {req.initials}
                            </div>
                            <div style={{ overflow: 'hidden' }}>
                              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A' }}>{req.name}</div>
                              <div style={{ fontSize: '0.78rem', color: '#64748B' }}>{req.batchName} · {req.timeAgo}</div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => handleApproveRequest(req)}
                              style={{
                                flex: 1,
                                backgroundColor: '#0F766E',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '0.4rem',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                fontFamily: 'var(--font-body)',
                              }}
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleDeclineRequest(req)}
                              style={{
                                flex: 1,
                                backgroundColor: '#FFFFFF',
                                color: '#64748B',
                                border: '1px solid #CBD5E1',
                                borderRadius: '6px',
                                padding: '0.4rem',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                fontFamily: 'var(--font-body)',
                              }}
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Batch Join Codes Quick Reference */}
                <div style={{
                  backgroundColor: '#0B132B',
                  borderRadius: '16px',
                  padding: '1.4rem',
                  color: '#FFFFFF',
                  boxShadow: '0 8px 20px -4px rgba(11, 19, 43, 0.25)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <h3 className="font-display" style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                      Active Batch Codes
                    </h3>
                    <span style={{ fontSize: '0.7rem', color: '#5EE0C4', fontWeight: 700, fontFamily: 'var(--font-code)' }}>STUDENT ACCESS</span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: '#94A3B8', margin: '0 0 1rem 0', lineHeight: 1.4 }}>
                    Share these codes with students to let them self-enroll instantly.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {allBatches.length > 0 ? (
                      allBatches.slice(0, 5).map(batch => (
                        <div
                          key={batch.id}
                          style={{
                            backgroundColor: '#152542',
                            borderRadius: '10px',
                            padding: '0.65rem 0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            border: '1px solid #233554',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFFFFF' }}>{batch.name}</div>
                            <div style={{ fontSize: '0.78rem', color: '#94A3B8' }}>{batch.courseName || batch.term}</div>
                          </div>

                          <button
                            onClick={() => copyToClipboard(batch.joinCode)}
                            style={{
                              backgroundColor: copiedCode === batch.joinCode ? '#10B981' : '#233554',
                              color: copiedCode === batch.joinCode ? '#0B132B' : '#5EE0C4',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '0.35rem 0.75rem',
                              fontSize: '0.8rem',
                              fontFamily: 'var(--font-code)',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <span>{batch.joinCode}</span>
                            {copiedCode === batch.joinCode ? <CheckCheck size={14} /> : <Copy size={13} />}
                          </button>
                        </div>
                      ))
                    ) : (
                      <div style={{ textAlign: 'center', padding: '0.75rem', color: '#94A3B8', fontSize: '0.82rem' }}>
                        No batches created yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: MY COURSES LIBRARY
           ========================================================================= */}
        {activeTab === 'courses' && (
          <div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '5rem 0', color: '#64748B', fontSize: '0.95rem' }}>
                Loading course spaces...
              </div>
            ) : filteredCourses.length === 0 ? (
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                padding: '4rem 2rem',
                textAlign: 'center',
                border: '1px solid #E2E8F0',
                maxWidth: '560px',
                margin: '2.5rem auto',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}>
                <BookOpen size={40} color="#0F766E" style={{ margin: '0 auto 16px' }} />
                <h3 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem' }}>
                  No course spaces found
                </h3>
                <p style={{ color: '#64748B', fontSize: '0.88rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                  Create your first course space to organize syllabus materials and generate batch codes for your students.
                </p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  style={{
                    backgroundColor: '#0F766E',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0.65rem 1.4rem',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  Create Course Now
                </button>
              </div>
            ) : (
              <div className="cm-grid-cards-auto" style={{ gap: '1.25rem' }}>
                {filteredCourses.map((course, idx) => {
                  const badgeStyle = BADGE_COLORS[idx % BADGE_COLORS.length];
                  const acronym = (course.name || 'CS').split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase();
                  const batches = courseBatches[course.id] || [];

                  return (
                    <div
                      key={course.id}
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '16px',
                        padding: '1.5rem',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        minHeight: '210px',
                        transition: 'box-shadow 0.15s ease, transform 0.15s ease',
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.06)';
                        e.currentTarget.style.transform = 'translateY(-3px)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div>
                        {/* Top Row: Acronym + Code Pill */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                          <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '10px',
                            backgroundColor: badgeStyle.bg,
                            color: badgeStyle.text,
                            fontWeight: 800,
                            fontFamily: 'var(--font-code)',
                            fontSize: '0.95rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            {acronym}
                          </div>

                          <span style={{
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            fontFamily: 'var(--font-code)',
                            color: '#64748B',
                            backgroundColor: '#F1F5F9',
                            padding: '0.25rem 0.65rem',
                            borderRadius: '6px',
                          }}>
                            {course.code || 'COURSE'}
                          </span>
                        </div>

                        {/* Course Title */}
                        <h3 className="font-display" style={{
                          fontSize: '1.18rem',
                          fontWeight: 700,
                          color: '#0F172A',
                          marginBottom: '0.35rem',
                          lineHeight: 1.3,
                        }}>
                          {course.name}
                        </h3>

                        {/* Meta info */}
                        <p style={{
                          fontSize: '0.85rem',
                          color: '#64748B',
                          marginBottom: '1rem',
                          lineHeight: 1.5,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}>
                          {course.description || `${course.program || 'MCA'} · ${course.semester || 'Semester 3'}`}
                        </p>

                        {/* Stats pills */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          marginBottom: '1.25rem',
                          padding: '0.65rem 0.85rem',
                          backgroundColor: '#F8FAFC',
                          borderRadius: '10px',
                          border: '1px solid #F1F5F9',
                          fontFamily: 'var(--font-body)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#475569' }}>
                            <Layers size={15} color="#0F766E" />
                            <span><strong>{batches.length}</strong> batches</span>
                          </div>
                          <div style={{ width: '1px', height: '14px', backgroundColor: '#CBD5E1' }} />
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#475569' }}>
                            <BookOpen size={15} color="#0F766E" />
                            <span><strong>{course.units ? course.units.length : 0}</strong> units</span>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <Link
                          to={`/courses/${course.id}`}
                          style={{
                            flex: 1,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            backgroundColor: '#0F766E',
                            color: '#FFFFFF',
                            borderRadius: '10px',
                            padding: '0.6rem 1rem',
                            fontSize: '0.88rem',
                            fontWeight: 600,
                            textDecoration: 'none',
                            fontFamily: 'var(--font-body)',
                          }}
                        >
                          <span>Open Space</span>
                          <ArrowRight size={15} />
                        </Link>
                        <button
                          onClick={() => {
                            setSelectedCourseForBatch(course);
                            setIsBatchModalOpen(true);
                          }}
                          style={{
                            backgroundColor: '#FFFFFF',
                            color: '#0F172A',
                            border: '1px solid #CBD5E1',
                            borderRadius: '10px',
                            padding: '0.6rem 0.85rem',
                            fontSize: '0.88rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontFamily: 'var(--font-body)',
                          }}
                        >
                          <Plus size={16} />
                          <span>Batch</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 3: STUDENT JOIN REQUESTS CONSOLE (Real Database Content)
           ========================================================================= */}
        {activeTab === 'requests' && (
          <div style={{ maxWidth: '840px' }}>
            {loadingRequests ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 0', color: '#64748B', fontSize: '0.92rem' }}>Loading join requests...</div>
            ) : pendingRequests.length === 0 ? (
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '3rem 2rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <Check size={36} color="#059669" style={{ margin: '0 auto 12px' }} />
                <h3 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.4rem' }}>All caught up!</h3>
                <p style={{ color: '#64748B', fontSize: '0.88rem', margin: 0 }}>There are no pending join requests across your course spaces.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {pendingRequests.map(req => (
                  <div
                    key={req.id}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '14px',
                      border: '1px solid #E2E8F0',
                      padding: '1rem 1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        backgroundColor: req.color.bg,
                        color: req.color.text,
                        fontWeight: 800,
                        fontFamily: 'var(--font-code)',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {req.initials}
                      </div>
                      <div>
                        <h4 className="font-display" style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0F172A', margin: '0 0 0.15rem 0' }}>
                          {req.name}
                        </h4>
                        <div style={{ fontSize: '0.82rem', color: '#64748B' }}>
                          {req.email} · {req.batchName} · Requested: {req.timeAgo}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleApproveRequest(req)}
                        style={{
                          backgroundColor: '#0F766E',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '0.45rem 1rem',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontFamily: 'var(--font-body)',
                        }}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleDeclineRequest(req)}
                        style={{
                          backgroundColor: '#FFFFFF',
                          color: '#475569',
                          border: '1px solid #CBD5E1',
                          borderRadius: '8px',
                          padding: '0.45rem 1rem',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontFamily: 'var(--font-body)',
                        }}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 4: FACULTY NOTIFICATION CENTER
           ========================================================================= */}
        {activeTab === 'notifications' && (
          <div style={{ maxWidth: '840px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div className="cm-scrollable-pills" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  onClick={() => setNotifFilter('ALL')}
                  style={{
                    padding: '0.35rem 0.95rem',
                    borderRadius: '9999px',
                    border: '1px solid',
                    borderColor: notifFilter === 'ALL' ? '#0B132B' : '#E2E8F0',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    backgroundColor: notifFilter === 'ALL' ? '#0B132B' : '#FFFFFF',
                    color: notifFilter === 'ALL' ? '#FFFFFF' : '#64748B',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  All ({notifications.length})
                </button>
                <button
                  onClick={() => setNotifFilter('UNREAD')}
                  style={{
                    padding: '0.35rem 0.95rem',
                    borderRadius: '9999px',
                    border: '1px solid',
                    borderColor: notifFilter === 'UNREAD' ? '#0B132B' : '#E2E8F0',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    backgroundColor: notifFilter === 'UNREAD' ? '#0B132B' : '#FFFFFF',
                    color: notifFilter === 'UNREAD' ? '#FFFFFF' : '#64748B',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  Unread ({unreadNotifsCount})
                </button>
              </div>

              <button
                onClick={handleMarkAllNotificationsRead}
                style={{
                  backgroundColor: '#FFFFFF',
                  color: '#0D9488',
                  border: '1px solid #CBD5E1',
                  borderRadius: '10px',
                  padding: '0.5rem 1rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                }}
              >
                Mark all as read
              </button>
            </div>

            {loadingNotifs ? (
              <div style={{ padding: '2.5rem 0', textAlign: 'center', color: '#64748B', fontSize: '0.92rem' }}>Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '3rem 2rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <Bell size={36} color="#94A3B8" style={{ margin: '0 auto 12px' }} />
                <h3 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.4rem' }}>No notifications yet</h3>
                <p style={{ color: '#64748B', fontSize: '0.88rem', margin: 0 }}>You will receive updates when students submit assignments or request to join batches.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {notifications.filter(n => notifFilter === 'ALL' || !n.isRead).map(n => (
                  <div
                    key={n.id}
                    style={{
                      backgroundColor: n.isRead ? '#FFFFFF' : '#F0FDFA',
                      borderRadius: '12px',
                      border: '1px solid ' + (n.isRead ? '#E2E8F0' : '#CCFBF1'),
                      padding: '0.9rem 1.15rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                    }}
                  >
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', margin: '0 0 0.2rem 0' }}>{n.title}</h4>
                      <p style={{ fontSize: '0.85rem', color: '#475569', margin: 0 }}>{n.message}</p>
                    </div>
                    <span style={{ fontSize: '0.78rem', color: '#94A3B8', whiteSpace: 'nowrap', marginLeft: '1rem', fontFamily: 'var(--font-code)' }}>
                      {n.createdAt ? new Date(n.createdAt).toLocaleDateString() : 'Recent'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB: ANNOUNCEMENTS CENTER
           ========================================================================= */}
        {activeTab === 'announcements' && (
          <div>
            {/* Top Stat Metrics */}
            <div className="cm-grid-4-stats" style={{ marginBottom: '1.75rem' }}>
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '1.25rem 1.4rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748B' }}>Total Broadcasts</span>
                  <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: '#E0F2FE', color: '#0369A1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Megaphone size={17} />
                  </div>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0F172A', fontFamily: 'var(--font-code)', marginBottom: '0.25rem', letterSpacing: '-0.02em' }}>
                  {announcements.length}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748B' }}>Lifetime announcements</div>
              </div>

              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '1.25rem 1.4rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748B' }}>Active Broadcasts</span>
                  <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Radio size={17} />
                  </div>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#059669', fontFamily: 'var(--font-code)', marginBottom: '0.25rem', letterSpacing: '-0.02em' }}>
                  {announcements.filter(a => a.status === 'ACTIVE').length}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748B' }}>Visible in student inboxes</div>
              </div>

              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '1.25rem 1.4rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748B' }}>Reverted Back</span>
                  <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: '#FEF2F2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <RotateCcw size={17} />
                  </div>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#DC2626', fontFamily: 'var(--font-code)', marginBottom: '0.25rem', letterSpacing: '-0.02em' }}>
                  {announcements.filter(a => a.status === 'REVERTED').length}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748B' }}>Revoked announcements</div>
              </div>

              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '1.25rem 1.4rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748B' }}>Student Reach</span>
                  <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: '#F3E8FF', color: '#7E22CE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={17} />
                  </div>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0F172A', fontFamily: 'var(--font-code)', marginBottom: '0.25rem', letterSpacing: '-0.02em' }}>
                  {announcements.reduce((acc, curr) => acc + (curr.recipientCount || 0), 0)}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748B' }}>Total student deliveries</div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.5rem',
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              border: '1px solid #E2E8F0',
              padding: '0.85rem 1.25rem',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  onClick={() => setAnnouncementFilter('ALL')}
                  style={{
                    padding: '0.35rem 0.95rem',
                    borderRadius: '9999px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    border: '1px solid',
                    borderColor: announcementFilter === 'ALL' ? '#0B132B' : '#E2E8F0',
                    cursor: 'pointer',
                    backgroundColor: announcementFilter === 'ALL' ? '#0B132B' : '#F1F5F9',
                    color: announcementFilter === 'ALL' ? '#FFFFFF' : '#64748B',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  All ({announcements.length})
                </button>
                <button
                  onClick={() => setAnnouncementFilter('ACTIVE')}
                  style={{
                    padding: '0.35rem 0.95rem',
                    borderRadius: '9999px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    border: '1px solid',
                    borderColor: announcementFilter === 'ACTIVE' ? '#0F766E' : '#E2E8F0',
                    cursor: 'pointer',
                    backgroundColor: announcementFilter === 'ACTIVE' ? '#0F766E' : '#F1F5F9',
                    color: announcementFilter === 'ACTIVE' ? '#FFFFFF' : '#64748B',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  Active ({announcements.filter(a => a.status === 'ACTIVE').length})
                </button>
                <button
                  onClick={() => setAnnouncementFilter('REVERTED')}
                  style={{
                    padding: '0.35rem 0.95rem',
                    borderRadius: '9999px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    border: '1px solid',
                    borderColor: announcementFilter === 'REVERTED' ? '#DC2626' : '#E2E8F0',
                    cursor: 'pointer',
                    backgroundColor: announcementFilter === 'REVERTED' ? '#DC2626' : '#F1F5F9',
                    color: announcementFilter === 'REVERTED' ? '#FFFFFF' : '#64748B',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  Reverted ({announcements.filter(a => a.status === 'REVERTED').length})
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ position: 'relative', width: '240px' }}>
                  <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    placeholder="Search announcements..."
                    value={announcementSearch}
                    onChange={(e) => setAnnouncementSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.75rem 0.45rem 2.2rem',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.85rem',
                      outline: 'none',
                      fontFamily: 'var(--font-body)',
                    }}
                  />
                </div>
                <button
                  onClick={() => setIsAnnouncementModalOpen(true)}
                  style={{
                    backgroundColor: '#0F766E',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0.5rem 1rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  <Plus size={16} />
                  <span>New Broadcast</span>
                </button>
              </div>
            </div>

            {/* Announcements List */}
            {loadingAnnouncements ? (
              <div style={{ padding: '4rem 0', textAlign: 'center', color: '#64748B', fontSize: '0.92rem' }}>
                Loading announcements...
              </div>
            ) : (() => {
              const filtered = announcements
                .filter(a => {
                  if (announcementFilter === 'ACTIVE') return a.status === 'ACTIVE';
                  if (announcementFilter === 'REVERTED') return a.status === 'REVERTED';
                  return true;
                })
                .filter(a => {
                  if (!announcementSearch.trim()) return true;
                  const q = announcementSearch.toLowerCase();
                  return (
                    a.title?.toLowerCase().includes(q) ||
                    a.message?.toLowerCase().includes(q) ||
                    a.targetAudienceText?.toLowerCase().includes(q)
                  );
                });

              if (filtered.length === 0) {
                return (
                  <div style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '16px',
                    border: '1px solid #E2E8F0',
                    padding: '4rem 1.5rem',
                    textAlign: 'center',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  }}>
                    <div style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      backgroundColor: '#E8F8F5',
                      color: '#0F766E',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px',
                    }}>
                      <Megaphone size={28} />
                    </div>
                    <h3 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: '0 0 0.4rem 0' }}>
                      No Announcements Found
                    </h3>
                    <p style={{ color: '#64748B', fontSize: '0.88rem', maxWidth: '440px', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
                      Broadcast general notices, specific course updates, or targeted batch announcements directly to your students' notification feed.
                    </p>
                    <button
                      onClick={() => setIsAnnouncementModalOpen(true)}
                      style={{
                        backgroundColor: '#0F766E',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '0.65rem 1.4rem',
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontFamily: 'var(--font-body)',
                      }}
                    >
                      <Plus size={18} />
                      <span>Broadcast New Announcement</span>
                    </button>
                  </div>
                );
              }

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {filtered.map(ann => {
                    const isReverted = ann.status === 'REVERTED';
                    const isUrgent = ann.priority === 'URGENT';
                    const isImportant = ann.priority === 'IMPORTANT';

                    return (
                      <div
                        key={ann.id}
                        style={{
                          backgroundColor: '#FFFFFF',
                          borderRadius: '16px',
                          border: isReverted ? '1px dashed #CBD5E1' : (isUrgent ? '1.5px solid #FCA5A5' : '1px solid #E2E8F0'),
                          padding: '1.4rem 1.5rem',
                          boxShadow: isReverted ? 'none' : '0 1px 4px rgba(0,0,0,0.03)',
                          opacity: isReverted ? 0.8 : 1,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {/* Top Meta Bar */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {/* Audience Scope Badge */}
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              backgroundColor: ann.targetType === 'GENERAL' ? '#E0F2FE' :
                                               ann.targetType === 'COURSE' ? '#EDE9FE' :
                                               ann.targetType === 'SELECTIVE_BATCHES' ? '#FEF3C7' : '#E8F8F5',
                              color: ann.targetType === 'GENERAL' ? '#0369A1' :
                                     ann.targetType === 'COURSE' ? '#6D28D9' :
                                     ann.targetType === 'SELECTIVE_BATCHES' ? '#B45309' : '#0F766E',
                              padding: '0.2rem 0.65rem',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              fontFamily: 'var(--font-code)',
                            }}>
                              {ann.targetType === 'GENERAL' ? '🌐 All Students (General)' :
                               ann.targetType === 'COURSE' ? `📚 ${ann.targetAudienceText || 'Course-wide'}` :
                               ann.targetType === 'BATCH' ? `👥 ${ann.targetAudienceText || 'Single Batch'}` :
                               `🎯 ${ann.targetAudienceText || 'Selective Batches'}`}
                            </span>

                            {/* Priority Badge */}
                            {isUrgent && (
                              <span style={{
                                backgroundColor: '#FEE2E2',
                                color: '#B91C1C',
                                padding: '0.2rem 0.55rem',
                                borderRadius: '6px',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                letterSpacing: '0.04em',
                                fontFamily: 'var(--font-code)',
                              }}>
                                ⚡ URGENT
                              </span>
                            )}
                            {isImportant && (
                              <span style={{
                                backgroundColor: '#FEF3C7',
                                color: '#B45309',
                                padding: '0.2rem 0.55rem',
                                borderRadius: '6px',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                fontFamily: 'var(--font-code)',
                              }}>
                                ★ IMPORTANT
                              </span>
                            )}

                            {/* Status Badge */}
                            {isReverted ? (
                              <span style={{
                                backgroundColor: '#F1F5F9',
                                color: '#64748B',
                                border: '1px solid #E2E8F0',
                                padding: '0.2rem 0.55rem',
                                borderRadius: '6px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                fontFamily: 'var(--font-code)',
                              }}>
                                ↩ Reverted & Retracted
                              </span>
                            ) : (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                backgroundColor: '#ECFDF5',
                                color: '#047857',
                                padding: '0.2rem 0.55rem',
                                borderRadius: '6px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                fontFamily: 'var(--font-code)',
                              }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                                Active in Students' Feed
                              </span>
                            )}
                          </div>

                          <div style={{ fontSize: '0.78rem', color: '#94A3B8', fontFamily: 'var(--font-code)' }}>
                            {ann.createdAt ? new Date(ann.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Recent'}
                          </div>
                        </div>

                        {/* Title & Message */}
                        <h3 className="font-display" style={{
                          fontSize: '1.18rem',
                          fontWeight: 800,
                          color: '#0F172A',
                          margin: '0 0 0.6rem 0',
                          lineHeight: 1.35,
                          textDecoration: isReverted ? 'line-through' : 'none',
                        }}>
                          {ann.title}
                        </h3>

                        <div style={{
                          backgroundColor: '#F8FAFC',
                          borderRadius: '10px',
                          border: '1px solid #E2E8F0',
                          padding: '0.9rem 1.1rem',
                          fontSize: '0.92rem',
                          color: '#334155',
                          lineHeight: 1.6,
                          whiteSpace: 'pre-wrap',
                          marginBottom: '1rem',
                          fontFamily: 'var(--font-body)',
                        }}>
                          {ann.message}
                        </div>

                        {/* Footer Details & Revert Option */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingTop: '0.85rem',
                          borderTop: '1px solid #F1F5F9',
                          flexWrap: 'wrap',
                          gap: '0.65rem',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.82rem', color: '#64748B' }}>
                            <span>
                              <strong>Audience:</strong> {ann.targetAudienceText}
                            </span>
                            <span>
                              <strong>Delivered:</strong> {ann.recipientCount || 0} students
                            </span>
                            {isReverted && ann.revertedAt && (
                              <span style={{ color: '#DC2626' }}>
                                Reverted on {new Date(ann.revertedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {!isReverted ? (
                              <button
                                onClick={() => handleRevertAnnouncement(ann.id, ann.title)}
                                disabled={revertingId === ann.id}
                                title="Revert announcement: instantly revokes notification from all student dashboards"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  backgroundColor: '#FEF2F2',
                                  color: '#DC2626',
                                  border: '1px solid #FCA5A5',
                                  borderRadius: '8px',
                                  padding: '0.45rem 0.95rem',
                                  fontSize: '0.82rem',
                                  fontWeight: 700,
                                  cursor: revertingId === ann.id ? 'not-allowed' : 'pointer',
                                  transition: 'all 0.15s ease',
                                  fontFamily: 'var(--font-body)',
                                }}
                              >
                                <RotateCcw size={15} />
                                <span>{revertingId === ann.id ? 'Reverting...' : 'Revert Announcement'}</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleDeleteAnnouncement(ann.id)}
                                title="Delete announcement permanently"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  backgroundColor: '#F8FAFC',
                                  color: '#64748B',
                                  border: '1px solid #CBD5E1',
                                  borderRadius: '8px',
                                  padding: '0.45rem 0.85rem',
                                  fontSize: '0.82rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  fontFamily: 'var(--font-body)',
                                }}
                              >
                                <Trash2 size={14} />
                                <span>Delete Record</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* =========================================================================
            CREATE COURSE MODAL
           ========================================================================= */}
        {isModalOpen && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(11, 19, 43, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.25rem',
          }}>
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '560px',
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <h3 className="font-display" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Create Course Space
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateCourse}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem', fontFamily: 'var(--font-body)' }}>
                    Course Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Database Management Systems"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.9rem',
                      outline: 'none',
                      fontFamily: 'var(--font-body)',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem', fontFamily: 'var(--font-body)' }}>
                      Course Code *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. CS301"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.9rem',
                        fontFamily: 'var(--font-code)',
                        fontWeight: 700,
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem', fontFamily: 'var(--font-body)' }}>
                      Program
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. MCA"
                      value={program}
                      onChange={(e) => setProgram(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.9rem',
                        outline: 'none',
                        fontFamily: 'var(--font-body)',
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem', fontFamily: 'var(--font-body)' }}>
                    Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Brief description of the course curriculum..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.9rem',
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'var(--font-body)',
                    }}
                  />
                </div>

                {/* Optional Syllabus Units */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', margin: 0, fontFamily: 'var(--font-body)' }}>
                      Syllabus Units (Optional)
                    </label>
                    <button
                      type="button"
                      onClick={handleAddUnitField}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#0F766E',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: 'var(--font-body)',
                      }}
                    >
                      + Add Unit
                    </button>
                  </div>

                  {units.map((unit, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <input
                        type="text"
                        value={unit}
                        onChange={(e) => handleUnitChange(idx, e.target.value)}
                        placeholder={`Unit ${idx + 1} Title`}
                        style={{
                          flex: 1,
                          padding: '0.55rem 0.75rem',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          fontSize: '0.85rem',
                          fontFamily: 'var(--font-body)',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveUnitField(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#EF4444',
                          cursor: 'pointer',
                        }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    style={{
                      backgroundColor: 'transparent',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      padding: '0.6rem 1.15rem',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    style={{
                      backgroundColor: '#0F766E',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.6rem 1.4rem',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      cursor: creating ? 'not-allowed' : 'pointer',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    {creating ? 'Creating...' : 'Create Course Space'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================================
            CREATE BATCH MODAL
           ========================================================================= */}
        {isBatchModalOpen && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(11, 19, 43, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.25rem',
          }}>
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '480px',
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div>
                  <h3 className="font-display" style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0F172A', margin: '0 0 2px 0' }}>
                    Create New Batch
                  </h3>
                  <div style={{ fontSize: '0.82rem', color: '#64748B' }}>
                    For {selectedCourseForBatch?.name} ({selectedCourseForBatch?.code})
                  </div>
                </div>
                <button
                  onClick={() => setIsBatchModalOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateBatch}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem', fontFamily: 'var(--font-body)' }}>
                    Batch Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MCA 2026-28 Batch A"
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.9rem',
                      outline: 'none',
                      fontFamily: 'var(--font-body)',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem', fontFamily: 'var(--font-body)' }}>
                    Academic Term / Semester
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Semester 3"
                    value={batchTerm}
                    onChange={(e) => setBatchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.9rem',
                      outline: 'none',
                      fontFamily: 'var(--font-body)',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem', fontFamily: 'var(--font-body)' }}>
                    Enrollment Approval Mode
                  </label>
                  <select
                    value={batchJoinMode}
                    onChange={(e) => setBatchJoinMode(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.9rem',
                      backgroundColor: '#FFFFFF',
                      outline: 'none',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    <option value="AUTO_APPROVE">Auto-Approve (Students join immediately with code)</option>
                    <option value="FACULTY_APPROVAL">Manual Approval (Requires faculty confirmation)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
                  <button
                    type="button"
                    onClick={() => setIsBatchModalOpen(false)}
                    style={{
                      backgroundColor: 'transparent',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      padding: '0.6rem 1.15rem',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingBatch}
                    style={{
                      backgroundColor: '#0F766E',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.6rem 1.4rem',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      cursor: creatingBatch ? 'not-allowed' : 'pointer',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    {creatingBatch ? 'Creating...' : 'Create Batch'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================================
            BROADCAST ANNOUNCEMENT MODAL
           ========================================================================= */}
        {isAnnouncementModalOpen && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(11, 19, 43, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.25rem',
          }}>
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '620px',
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#E8F8F5', color: '#0F766E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Megaphone size={20} />
                  </div>
                  <div>
                    <h3 className="font-display" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      Broadcast Announcement
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: '#64748B', margin: 0 }}>
                      Publish an announcement directly to student notifications
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAnnouncementModalOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateAnnouncement}>
                {/* 1. Target Audience Scope Cards */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem', fontFamily: 'var(--font-body)' }}>
                    Select Announcement Scope *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.65rem' }}>
                    {[
                      { id: 'GENERAL', label: 'All Students (General)', desc: 'Deliver to all students across every batch' },
                      { id: 'COURSE', label: 'Specific Course', desc: 'All batches enrolled in a specific course' },
                      { id: 'BATCH', label: 'Specific Batch', desc: 'Target a single class batch' },
                      { id: 'SELECTIVE_BATCHES', label: 'Selective Batches', desc: 'Handpick multiple batches across courses' },
                    ].map(type => (
                      <div
                        key={type.id}
                        onClick={() => {
                          setAnnTargetType(type.id);
                          if (type.id === 'COURSE' && courses.length > 0 && !annCourseId) {
                            setAnnCourseId(courses[0].id.toString());
                          }
                          if (type.id === 'BATCH' && courses.length > 0) {
                            if (!annCourseId) setAnnCourseId(courses[0].id.toString());
                            const firstCourseBatches = courseBatches[courses[0].id] || [];
                            if (firstCourseBatches.length > 0 && !annBatchId) {
                              setAnnBatchId(firstCourseBatches[0].id.toString());
                            }
                          }
                        }}
                        style={{
                          border: annTargetType === type.id ? '2px solid #0F766E' : '1px solid #E2E8F0',
                          backgroundColor: annTargetType === type.id ? '#F0FDFA' : '#FFFFFF',
                          borderRadius: '12px',
                          padding: '0.75rem 0.85rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: annTargetType === type.id ? '#0F766E' : '#0F172A', fontFamily: 'var(--font-body)' }}>
                            {type.label}
                          </span>
                          <input
                            type="radio"
                            name="annTargetType"
                            checked={annTargetType === type.id}
                            onChange={() => {}}
                            style={{ accentColor: '#0F766E' }}
                          />
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B', lineHeight: 1.35, fontFamily: 'var(--font-body)' }}>
                          {type.desc}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Target Specific Dropdown Selectors */}
                {annTargetType === 'COURSE' && (
                  <div style={{ marginBottom: '1.1rem', backgroundColor: '#F8FAFC', padding: '0.85rem', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem', fontFamily: 'var(--font-body)' }}>
                      Select Target Course *
                    </label>
                    <select
                      required
                      value={annCourseId}
                      onChange={(e) => setAnnCourseId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.88rem',
                        outline: 'none',
                        backgroundColor: '#FFFFFF',
                        fontFamily: 'var(--font-body)',
                      }}
                    >
                      <option value="">-- Choose Course --</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.code} · {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {annTargetType === 'BATCH' && (
                  <div style={{ marginBottom: '1.1rem', backgroundColor: '#F8FAFC', padding: '0.85rem', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem', fontFamily: 'var(--font-body)' }}>
                          Course *
                        </label>
                        <select
                          value={annCourseId}
                          onChange={(e) => {
                            setAnnCourseId(e.target.value);
                            const bList = courseBatches[e.target.value] || [];
                            if (bList.length > 0) setAnnBatchId(bList[0].id.toString());
                            else setAnnBatchId('');
                          }}
                          style={{
                            width: '100%',
                            padding: '0.6rem 0.75rem',
                            borderRadius: '8px',
                            border: '1px solid #CBD5E1',
                            fontSize: '0.85rem',
                            outline: 'none',
                            backgroundColor: '#FFFFFF',
                            fontFamily: 'var(--font-body)',
                          }}
                        >
                          <option value="">-- Choose Course --</option>
                          {courses.map(c => (
                            <option key={c.id} value={c.id}>{c.code} · {c.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem', fontFamily: 'var(--font-body)' }}>
                          Target Batch *
                        </label>
                        <select
                          required
                          value={annBatchId}
                          onChange={(e) => setAnnBatchId(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.6rem 0.75rem',
                            borderRadius: '8px',
                            border: '1px solid #CBD5E1',
                            fontSize: '0.85rem',
                            outline: 'none',
                            backgroundColor: '#FFFFFF',
                            fontFamily: 'var(--font-body)',
                          }}
                        >
                          <option value="">-- Choose Batch --</option>
                          {(courseBatches[annCourseId] || []).map(b => (
                            <option key={b.id} value={b.id}>{b.name} ({b.joinCode})</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {annTargetType === 'SELECTIVE_BATCHES' && (
                  <div style={{ marginBottom: '1.1rem', backgroundColor: '#F8FAFC', padding: '0.85rem', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', margin: 0, fontFamily: 'var(--font-body)' }}>
                        Select Target Batches ({annBatchIds.length} chosen) *
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const allB = getAllFacultyBatches().map(b => b.id);
                          if (annBatchIds.length === allB.length) setAnnBatchIds([]);
                          else setAnnBatchIds(allB);
                        }}
                        style={{ background: 'none', border: 'none', color: '#0F766E', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                      >
                        {annBatchIds.length === getAllFacultyBatches().length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', maxHeight: '160px', overflowY: 'auto', padding: '4px' }}>
                      {getAllFacultyBatches().map(b => {
                        const checked = annBatchIds.includes(b.id);
                        return (
                          <div
                            key={b.id}
                            onClick={() => {
                              if (checked) setAnnBatchIds(prev => prev.filter(id => id !== b.id));
                              else setAnnBatchIds(prev => [...prev, b.id]);
                            }}
                            style={{
                              backgroundColor: checked ? '#E8F8F5' : '#FFFFFF',
                              border: checked ? '1.5px solid #0F766E' : '1px solid #CBD5E1',
                              borderRadius: '8px',
                              padding: '0.5rem 0.65rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              cursor: 'pointer',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {}}
                              style={{ accentColor: '#0F766E' }}
                            />
                            <div style={{ overflow: 'hidden' }}>
                              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'var(--font-body)' }}>
                                {b.name}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#64748B', fontFamily: 'var(--font-code)' }}>
                                {b.courseCode} · {b.joinCode}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. Priority Pills */}
                <div style={{ marginBottom: '1.1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.45rem', fontFamily: 'var(--font-body)' }}>
                    Priority Level
                  </label>
                  <div style={{ display: 'flex', gap: '0.65rem' }}>
                    {[
                      { id: 'NORMAL', label: 'Normal', color: '#0F766E', bg: '#E8F8F5' },
                      { id: 'IMPORTANT', label: 'Important', color: '#B45309', bg: '#FEF3C7' },
                      { id: 'URGENT', label: 'Urgent Alert', color: '#B91C1C', bg: '#FEE2E2' },
                    ].map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setAnnPriority(p.id)}
                        style={{
                          flex: 1,
                          padding: '0.5rem 0.75rem',
                          borderRadius: '8px',
                          border: annPriority === p.id ? `2px solid ${p.color}` : '1px solid #E2E8F0',
                          backgroundColor: annPriority === p.id ? p.bg : '#FFFFFF',
                          color: annPriority === p.id ? p.color : '#64748B',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          fontFamily: 'var(--font-body)',
                        }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Title Input */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem', fontFamily: 'var(--font-body)' }}>
                    Announcement Title *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={250}
                    placeholder="e.g. Schedule Change for Lab 4 / Midterm Date Sheet Released"
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.9rem',
                      outline: 'none',
                      fontFamily: 'var(--font-body)',
                    }}
                  />
                </div>

                {/* 5. Message Textarea */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem', fontFamily: 'var(--font-body)' }}>
                    Announcement Content *
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Write your announcement details, instructions, room allocations, or syllabus guidelines here..."
                    value={annMessage}
                    onChange={(e) => setAnnMessage(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.9rem',
                      outline: 'none',
                      resize: 'vertical',
                      lineHeight: 1.5,
                      fontFamily: 'var(--font-body)',
                    }}
                  />
                </div>

                {/* Delivery Notice info */}
                <div style={{
                  backgroundColor: '#F0FDFA',
                  border: '1px solid #CCFBF1',
                  borderRadius: '10px',
                  padding: '0.75rem 0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  fontSize: '0.8rem',
                  color: '#0F766E',
                  marginBottom: '1.4rem',
                  fontFamily: 'var(--font-body)',
                }}>
                  <Info size={18} style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Instant Student Notification:</strong> This announcement will appear immediately in the student's notification center. You can revert this announcement at any point to retract it from students.
                  </div>
                </div>

                {/* Form Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.65rem' }}>
                  <button
                    type="button"
                    onClick={() => setIsAnnouncementModalOpen(false)}
                    style={{
                      padding: '0.6rem 1.15rem',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      backgroundColor: '#FFFFFF',
                      color: '#64748B',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={broadcasting}
                    style={{
                      padding: '0.6rem 1.4rem',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#0F766E',
                      color: '#FFFFFF',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      cursor: broadcasting ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 8px rgba(15, 118, 110, 0.25)',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    <Send size={16} />
                    <span>{broadcasting ? 'Broadcasting...' : 'Broadcast Announcement'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
