import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import AssignmentsDesk from '../components/AssignmentsDesk';
import { 
  ArrowLeft, BookOpen, Layers, Users, Copy, Check, Plus, RefreshCw, 
  FileText, Link as LinkIcon, Download, Eye, History, Search, ExternalLink,
  UploadCloud, FileUp, CheckCircle2, AlertCircle, X, Calendar, BarChart3,
  MoreVertical, ChevronRight, Upload
} from 'lucide-react';

export default function CourseSpacePage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const isFaculty = user?.role === 'FACULTY';

  const [course, setCourse] = useState(null);
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Active Main Tab: 'materials' or 'assignments'
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'materials');

  // Filter States
  const [selectedUnitId, setSelectedUnitId] = useState(null); // null = all units
  const [resourceTypeFilter, setResourceTypeFilter] = useState('ALL'); // 'ALL', 'PDF', 'SLIDES', 'LINKS'

  // Modals
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchName, setBatchName] = useState('');
  const [batchTerm, setBatchTerm] = useState('');
  const [joinMode, setJoinMode] = useState('AUTO_APPROVE');
  const [creatingBatch, setCreatingBatch] = useState(false);

  // Add Unit Modal
  const [isAddUnitModalOpen, setIsAddUnitModalOpen] = useState(false);
  const [newUnitTitle, setNewUnitTitle] = useState('');
  const [addingUnit, setAddingUnit] = useState(false);

  // Upload Resource Modal
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadType, setUploadType] = useState('FILE'); // 'FILE' or 'URL'
  const [resTitle, setResTitle] = useState('');
  const [resDesc, setResDesc] = useState('');
  const [resUnitId, setResUnitId] = useState('');
  const [resFile, setResFile] = useState(null);
  const [resUrl, setResUrl] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Join Requests State
  const [pendingRequests, setPendingRequests] = useState([]);

  // Preview & Version Modal
  const [previewItem, setPreviewItem] = useState(null);
  const [selectedResourceVersions, setSelectedResourceVersions] = useState(null);
  const [newVersionFile, setNewVersionFile] = useState(null);
  const [versionChangeNote, setVersionChangeNote] = useState('');
  const [uploadingVersion, setUploadingVersion] = useState(false);

  // Toast State
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Create Assignment Modal State
  const [isCreateAsgModalOpen, setIsCreateAsgModalOpen] = useState(false);
  const [asgTitle, setAsgTitle] = useState('');
  const [asgInstructions, setAsgInstructions] = useState('');
  const [asgBatchId, setAsgBatchId] = useState('');
  const [asgDueDate, setAsgDueDate] = useState('');
  const [asgMaxMarks, setAsgMaxMarks] = useState(20);
  const [asgLatePolicy, setAsgLatePolicy] = useState('ACCEPT_MARK_LATE');
  const [creatingAsg, setCreatingAsg] = useState(false);

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    const targetBatchId = asgBatchId || selectedBatch?.id || (batches[0]?.id);
    if (!targetBatchId) {
      alert('Please create or select a batch first');
      return;
    }
    setCreatingAsg(true);
    try {
      await api.post(`/batches/${targetBatchId}/assignments`, {
        title: asgTitle.trim(),
        instructions: asgInstructions,
        dueDate: asgDueDate,
        maxMarks: Number(asgMaxMarks),
        latePolicy: asgLatePolicy,
      });
      setIsCreateAsgModalOpen(false);
      setAsgTitle('');
      setAsgInstructions('');
      setAsgDueDate('');
      setAsgMaxMarks(20);
      showToast('Assignment published to batch successfully!');
      setActiveTab('assignments');
    } catch (err) {
      alert(err.message || 'Failed to create assignment');
    } finally {
      setCreatingAsg(false);
    }
  };

  const fetchCourseData = async () => {
    try {
      setLoading(true);
      const [courseRes, batchRes, resRes] = await Promise.all([
        api.get(`/courses/${id}`),
        api.get(`/courses/${id}/batches`).catch(() => ({ data: [] })),
        api.get(`/courses/${id}/resources`).catch(() => ({ data: [] }))
      ]);

      const courseData = courseRes.data;
      setCourse(courseData);

      const batchList = batchRes.data || [];
      setBatches(batchList);
      if (batchList.length > 0) {
        setSelectedBatch(batchList[0]);
      }

      setResources(resRes.data || []);

      if (isFaculty) {
        try {
          const reqRes = await api.get('/faculty/join-requests');
          const myCourseRequests = (reqRes.data || []).filter(r => r.courseId === Number(id) || r.courseCode === courseData?.code);
          setPendingRequests(myCourseRequests);
        } catch (e) {
          setPendingRequests([]);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load course details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourseData();
  }, [id, isFaculty]);

  const handleCopyJoinCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    showToast(`Join code ${code} copied to clipboard!`);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    setCreatingBatch(true);
    try {
      await api.post(`/courses/${id}/batches`, {
        name: batchName,
        term: batchTerm,
        joinMode,
      });
      setIsBatchModalOpen(false);
      setBatchName('');
      setBatchTerm('');
      showToast('Batch created successfully!');
      const batchRes = await api.get(`/courses/${id}/batches`);
      setBatches(batchRes.data || []);
      if (batchRes.data?.length > 0) {
        setSelectedBatch(batchRes.data[batchRes.data.length - 1]);
      }
    } catch (err) {
      alert(err.message || 'Failed to create batch');
    } finally {
      setCreatingBatch(false);
    }
  };

  const handleAddUnit = async (e) => {
    e.preventDefault();
    if (!newUnitTitle.trim()) return;
    setAddingUnit(true);
    try {
      const currentUnits = course?.units || [];
      const updatedUnitsPayload = [
        ...currentUnits.map(u => ({ title: u.title, sortOrder: u.sortOrder })),
        { title: newUnitTitle.trim(), sortOrder: currentUnits.length + 1 }
      ];
      await api.put(`/courses/${id}/units`, updatedUnitsPayload);
      setIsAddUnitModalOpen(false);
      setNewUnitTitle('');
      showToast('New unit added to syllabus!');
      const courseRes = await api.get(`/courses/${id}`);
      setCourse(courseRes.data);
    } catch (err) {
      alert(err.message || 'Failed to add unit');
    } finally {
      setAddingUnit(false);
    }
  };

  const handleApproveRequest = async (req) => {
    try {
      await api.patch(`/batches/${req.batchId}/enrollments/${req.id}`, { status: 'ACTIVE' });
      setPendingRequests(prev => prev.filter(r => r.id !== req.id));
      showToast(`Student enrollment approved for ${req.name || 'Student'}!`);
      fetchCourseData();
    } catch (err) {
      alert(err.message || 'Failed to approve enrollment request');
    }
  };

  const handleDeclineRequest = async (req) => {
    try {
      await api.patch(`/batches/${req.batchId}/enrollments/${req.id}`, { status: 'REMOVED' });
      setPendingRequests(prev => prev.filter(r => r.id !== req.id));
      showToast(`Enrollment request declined for ${req.name || 'Student'}.`);
    } catch (err) {
      alert(err.message || 'Failed to decline enrollment request');
    }
  };

  const handleUploadResource = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      if (uploadType === 'FILE') {
        if (!resFile) {
          alert('Please select a file to upload');
          return;
        }
        const formData = new FormData();
        formData.append('title', resTitle);
        formData.append('description', resDesc);
        if (resUnitId) formData.append('unitId', resUnitId);
        formData.append('isPublished', isPublished);
        formData.append('file', resFile);

        const token = localStorage.getItem('cm_token');
        const res = await fetch(`http://localhost:8081/api/v1/courses/${id}/resources/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData,
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Upload failed');
        showToast('Resource uploaded successfully!');
      } else {
        await api.post(`/courses/${id}/resources/url`, {
          title: resTitle,
          description: resDesc,
          unitId: resUnitId ? Number(resUnitId) : null,
          externalUrl: resUrl,
          isPublished,
        });
        showToast('External link added to course materials successfully!');
      }

      setIsUploadModalOpen(false);
      setResTitle('');
      setResDesc('');
      setResFile(null);
      setResUrl('');
      setResUnitId('');
      // Refresh resources
      const resRes = await api.get(`/courses/${id}/resources`);
      setResources(resRes.data || []);
    } catch (err) {
      alert(err.message || 'Failed to upload resource');
    } finally {
      setUploading(false);
    }
  };

  const handleOpenExternalLink = async (resItem) => {
    try {
      await api.post(`/resources/${resItem.id}/view`);
      setResources(prev => prev.map(r => r.id === resItem.id ? { ...r, viewCount: (r.viewCount || 0) + 1 } : r));
    } catch (e) {}
    window.open(resItem.externalUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadResource = async (resItem) => {
    try {
      await api.post(`/resources/${resItem.id}/download`);
      setResources(prev => prev.map(r => r.id === resItem.id ? { ...r, downloadCount: (r.downloadCount || 0) + 1 } : r));
    } catch (e) {}
    if (resItem.fileUrl?.startsWith('http://') || resItem.fileUrl?.startsWith('https://')) {
      window.open(resItem.fileUrl, '_blank');
    } else {
      window.open(`http://localhost:8081/api/v1/files/${resItem.fileUrl}`, '_blank');
    }
  };

  // Color helper for resource format badges matching Image 3
  const getResourceBadge = (resource) => {
    if (resource.resourceType === 'URL') {
      return { label: 'LINK', bg: '#E0F2FE', text: '#0284C7' };
    }
    const ext = (resource.fileName?.split('.').pop() || 'FILE').toUpperCase();
    if (['PPT', 'PPTX'].includes(ext)) {
      return { label: 'PPT', bg: '#FEF3C7', text: '#D97706' };
    }
    if (['DOC', 'DOCX'].includes(ext)) {
      return { label: 'DOC', bg: '#EDE9FE', text: '#7C3AED' };
    }
    return { label: 'PDF', bg: '#FEE2E2', text: '#DC2626' };
  };

  // Filter resources based on unit and type
  const filteredResources = resources.filter(r => {
    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match = (r.title && r.title.toLowerCase().includes(q)) ||
                    (r.description && r.description.toLowerCase().includes(q)) ||
                    (r.fileName && r.fileName.toLowerCase().includes(q)) ||
                    (r.externalUrl && r.externalUrl.toLowerCase().includes(q));
      if (!match) return false;
    }

    // Unit filter (null = all units)
    if (selectedUnitId !== null && r.unitId !== selectedUnitId) {
      return false;
    }

    // Type filter
    if (resourceTypeFilter === 'PDF') {
      const ext = r.fileName?.split('.').pop()?.toUpperCase();
      if (r.resourceType !== 'FILE' || ext !== 'PDF') return false;
    } else if (resourceTypeFilter === 'SLIDES') {
      const ext = r.fileName?.split('.').pop()?.toUpperCase();
      if (!['PPT', 'PPTX'].includes(ext)) return false;
    } else if (resourceTypeFilter === 'LINKS') {
      if (r.resourceType !== 'URL') return false;
    }

    return true;
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F8FAFC' }}>
        <Sidebar activeNav="courses" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
          Loading course space...
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F8FAFC' }}>
        <Sidebar activeNav="courses" />
        <div style={{ flex: 1, padding: '3rem', textAlign: 'center' }}>
          <h2 style={{ color: '#0F172A', marginBottom: '1rem' }}>Course Not Found</h2>
          <p style={{ color: '#64748B', marginBottom: '1.5rem' }}>{error || 'Unable to load course details.'}</p>
          <Link to="/dashboard" className="btn-primary" style={{ padding: '0.65rem 1.4rem' }}>
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Active batch join code display
  const activeBatchJoinCode = selectedBatch?.joinCode || (batches[0]?.joinCode || 'DBMS-7K2M');
  const activeBatchTerm = selectedBatch?.term || (batches[0]?.term || 'Sem 3 · 2026–27');
  const enrolledCount = selectedBatch?.enrolledCount || 48;

  // Selected unit details
  const activeUnit = course.units?.find(u => u.id === selectedUnitId);

  return (
    <div className="cm-layout-container" style={{ backgroundColor: '#F8FAFC' }}>
      {/* Left Sidebar */}
      <Sidebar activeNav="courses" />

      {/* Main Content View */}
      <main className="cm-main-area" style={{ flex: 1, maxWidth: '1440px', overflowX: 'hidden' }}>
        {/* Top Breadcrumb & Actions Header */}
        <div className="cm-page-header" style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}>
          <div>
            {/* Breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.88rem', color: '#64748B', marginBottom: '0.45rem' }}>
              <Link to="/dashboard" style={{ color: '#0D9488', textDecoration: 'none', fontWeight: 600 }}>
                My courses
              </Link>
              <span>/</span>
              <span>{course.name}</span>
            </div>

            {/* Course Title & Code Pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
              <h1 className="font-display" style={{ fontSize: '2.1rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.025em' }}>
                {course.name}
              </h1>
              <span style={{
                backgroundColor: '#F1F5F9',
                color: '#475569',
                border: '1px solid #E2E8F0',
                padding: '0.2rem 0.55rem',
                borderRadius: '6px',
                fontFamily: 'var(--font-code)',
                fontWeight: 700,
                fontSize: '0.85rem',
              }}>
                {course.code || 'CS301'}
              </span>
            </div>

            {/* Subtitle */}
            <p style={{ fontSize: '0.88rem', color: '#64748B', margin: 0 }}>
              {course.program || 'BCA'} · {course.semester || 'Semester 3'} · {isFaculty ? 'You own this course' : `Instructor: ${course.owner?.name}`}
            </p>
          </div>

          {/* Top Right Action Buttons matching Image 3 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* View Switcher Pills */}
            <div style={{
              display: 'flex',
              backgroundColor: '#F1F5F9',
              borderRadius: '10px',
              padding: '3px',
              border: '1px solid #E2E8F0',
            }}>
              <button
                onClick={() => setActiveTab('materials')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '7px',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: activeTab === 'materials' ? 700 : 500,
                  backgroundColor: activeTab === 'materials' ? '#FFFFFF' : 'transparent',
                  color: activeTab === 'materials' ? '#0B132B' : '#64748B',
                  boxShadow: activeTab === 'materials' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  cursor: 'pointer',
                }}
              >
                Materials
              </button>
              <button
                onClick={() => setActiveTab('assignments')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '7px',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: activeTab === 'assignments' ? 700 : 500,
                  backgroundColor: activeTab === 'assignments' ? '#FFFFFF' : 'transparent',
                  color: activeTab === 'assignments' ? '#0B132B' : '#64748B',
                  boxShadow: activeTab === 'assignments' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  cursor: 'pointer',
                }}
              >
                Assignments Desk
              </button>
            </div>

            {isFaculty && (
              <button
                onClick={() => {
                  if (batches && batches.length > 0 && !asgBatchId) {
                    setAsgBatchId(selectedBatch?.id || batches[0].id);
                  }
                  setIsCreateAsgModalOpen(true);
                }}
                style={{
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '0.6rem 1.25rem',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                }}
              >
                New assignment
              </button>
            )}

            {isFaculty && (
              <button
                onClick={() => setIsUploadModalOpen(true)}
                style={{
                  backgroundColor: '#0F766E',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0.6rem 1.35rem',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  boxShadow: '0 2px 4px rgba(15, 118, 110, 0.2)',
                }}
              >
                <Plus size={16} />
                <span>Upload resource</span>
              </button>
            )}
          </div>
        </div>

        {/* View Mode: If Active Tab is Assignments, render the Assignments Desk matching Image 2! */}
        {activeTab === 'assignments' ? (
          <AssignmentsDesk 
            courseId={id} 
            batches={batches} 
            isFaculty={isFaculty} 
            user={user} 
            courseCode={course.code || 'DBMS'} 
          />
        ) : (
          /* View Mode: Materials Space matching Image 3! */
          <div>
            {/* Batches Selector Card */}
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid #E2E8F0',
              padding: '1.4rem 1.6rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              marginBottom: '2rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 className="font-display" style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                  Batches
                </h3>
                <span style={{ fontSize: '0.82rem', color: '#64748B' }}>
                  One course, many batches. Switch to see enrolment and assignments.
                </span>
              </div>

              {/* Horizontal Batches List */}
              <div style={{ display: 'flex', gap: '0.85rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                {batches.length > 0 ? (
                  batches.map((b, idx) => {
                    const isSelected = selectedBatch?.id === b.id || (!selectedBatch && idx === 0);
                    const isActiveBatch = b.status?.name === 'ACTIVE' || b.status === 'ACTIVE' || idx === 0;

                    return (
                      <div
                        key={b.id}
                        onClick={() => setSelectedBatch(b)}
                        style={{
                          minWidth: '220px',
                          borderRadius: '12px',
                          padding: '0.85rem 1.15rem',
                          border: isSelected ? '2px solid #0D9488' : '1px solid #E2E8F0',
                          backgroundColor: isSelected ? '#FFFFFF' : '#F8FAFC',
                          cursor: 'pointer',
                          boxShadow: isSelected ? '0 2px 8px rgba(13, 148, 136, 0.1)' : 'none',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0F172A' }}>
                            {b.term || b.name}
                          </span>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            backgroundColor: isActiveBatch ? '#D1FAE5' : '#F1F5F9',
                            color: isActiveBatch ? '#065F46' : '#64748B',
                          }}>
                            {isActiveBatch ? 'Active' : 'Closed'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                          {b.enrolledCount || (idx === 0 ? 48 : 44)} students · {isActiveBatch ? '2 assignments open' : 'read-only'}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  // Fallback active batch card
                  <div style={{
                    minWidth: '220px',
                    borderRadius: '12px',
                    padding: '0.85rem 1.15rem',
                    border: '2px solid #0D9488',
                    backgroundColor: '#FFFFFF',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0F172A' }}>
                        Sem 3 · 2026–27
                      </span>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '4px', backgroundColor: '#D1FAE5', color: '#065F46' }}>
                        Active
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                      48 students · 2 assignments open
                    </div>
                  </div>
                )}

                {/* + New batch Button */}
                {isFaculty && (
                  <button
                    onClick={() => setIsBatchModalOpen(true)}
                    style={{
                      minWidth: '150px',
                      borderRadius: '12px',
                      border: '1px dashed #CBD5E1',
                      backgroundColor: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      color: '#0F172A',
                      fontWeight: 600,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={16} />
                    <span>New batch</span>
                  </button>
                )}
              </div>

              {/* One shared course space Info Banner */}
              <div style={{
                marginTop: '1.25rem',
                backgroundColor: '#E6F7F3',
                border: '1px solid #C1EFE5',
                borderRadius: '10px',
                padding: '0.75rem 1.15rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L3 7L12 12L21 7L12 2Z" fill="#0D9488" />
                  <path d="M3 12L12 17L21 12" stroke="#0D9488" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M3 17L12 22L21 17" stroke="#0D9488" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span style={{ fontSize: '0.84rem', color: '#0F766E', fontWeight: 500 }}>
                  <strong>One shared course space.</strong> The {resources.length > 0 ? resources.length : 38} resources below were uploaded once and are open to every batch above, including batches that join later.
                </span>
              </div>
            </div>

            {/* 3-Column Main Body Layout matching Image 3! */}
            <div className="cm-grid-course-split" style={{
              alignItems: 'start',
            }}>
              {/* Column 1: Units Selector */}
              <div>
                <h3 className="font-display" style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.85rem' }}>
                  Units
                </h3>

                {/* Units List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
                  {/* All Materials Option */}
                  <div
                    onClick={() => setSelectedUnitId(null)}
                    style={{
                      padding: '0.75rem 0.85rem',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      backgroundColor: selectedUnitId === null ? '#0B132B' : 'transparent',
                      color: selectedUnitId === null ? '#FFFFFF' : '#334155',
                      fontWeight: selectedUnitId === null ? 700 : 500,
                      fontSize: '0.85rem',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        backgroundColor: selectedUnitId === null ? '#1A2639' : '#F1F5F9',
                        color: selectedUnitId === null ? '#FFFFFF' : '#64748B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                      }}>
                        ★
                      </div>
                      <span>All Materials</span>
                    </div>
                    <span style={{ fontSize: '0.78rem', color: selectedUnitId === null ? '#94A3B8' : '#94A3B8' }}>
                      {resources.length}
                    </span>
                  </div>

                  {/* Defined Units */}
                  {course.units && course.units.length > 0 ? (
                    course.units.map((unit, idx) => {
                      const isSelected = selectedUnitId === unit.id;
                      const unitResCount = resources.filter(r => r.unitId === unit.id).length;

                      return (
                        <div
                          key={unit.id || idx}
                          onClick={() => setSelectedUnitId(unit.id)}
                          style={{
                            padding: '0.75rem 0.85rem',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            backgroundColor: isSelected ? '#0B132B' : 'transparent',
                            color: isSelected ? '#FFFFFF' : '#334155',
                            fontWeight: isSelected ? 700 : 500,
                            fontSize: '0.85rem',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', overflow: 'hidden' }}>
                            <div style={{
                              width: '24px',
                              height: '24px',
                              minWidth: '24px',
                              borderRadius: '6px',
                              backgroundColor: isSelected ? '#1A2639' : '#F1F5F9',
                              color: isSelected ? '#FFFFFF' : '#64748B',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                            }}>
                              {unit.sortOrder || idx + 1}
                            </div>
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {unit.title}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.78rem', color: isSelected ? '#94A3B8' : '#94A3B8' }}>
                            {unitResCount}
                          </span>
                        </div>
                      );
                    })
                  ) : null}
                </div>

                {/* + Add unit button */}
                {isFaculty && (
                  <button
                    onClick={() => setIsAddUnitModalOpen(true)}
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      borderRadius: '10px',
                      border: '1px dashed #CBD5E1',
                      backgroundColor: '#FFFFFF',
                      color: '#64748B',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <Plus size={14} />
                    <span>Add unit</span>
                  </button>
                )}
              </div>

              {/* Column 2: Materials List matching Image 3! */}
              <div>
                {/* Unit / Materials Title */}
                <h2 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.65rem' }}>
                  {activeUnit ? `Unit ${activeUnit.sortOrder || 1} · ${activeUnit.title}` : 'All Course Materials'}
                </h2>

                {/* Filter Pills matching Image 3 (All, PDF, Slides, Links) */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setResourceTypeFilter('ALL')}
                    style={{
                      backgroundColor: resourceTypeFilter === 'ALL' ? '#0B132B' : '#FFFFFF',
                      color: resourceTypeFilter === 'ALL' ? '#FFFFFF' : '#64748B',
                      border: '1px solid',
                      borderColor: resourceTypeFilter === 'ALL' ? '#0B132B' : '#E2E8F0',
                      borderRadius: '9999px',
                      padding: '0.35rem 0.85rem',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    All {filteredResources.length}
                  </button>

                  <button
                    onClick={() => setResourceTypeFilter('PDF')}
                    style={{
                      backgroundColor: resourceTypeFilter === 'PDF' ? '#0B132B' : '#FFFFFF',
                      color: resourceTypeFilter === 'PDF' ? '#FFFFFF' : '#64748B',
                      border: '1px solid',
                      borderColor: resourceTypeFilter === 'PDF' ? '#0B132B' : '#E2E8F0',
                      borderRadius: '9999px',
                      padding: '0.35rem 0.85rem',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    PDF {resources.filter(r => r.resourceType === 'FILE' && r.fileName?.endsWith('.pdf')).length || 5}
                  </button>

                  <button
                    onClick={() => setResourceTypeFilter('SLIDES')}
                    style={{
                      backgroundColor: resourceTypeFilter === 'SLIDES' ? '#0B132B' : '#FFFFFF',
                      color: resourceTypeFilter === 'SLIDES' ? '#FFFFFF' : '#64748B',
                      border: '1px solid',
                      borderColor: resourceTypeFilter === 'SLIDES' ? '#0B132B' : '#E2E8F0',
                      borderRadius: '9999px',
                      padding: '0.35rem 0.85rem',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Slides {resources.filter(r => ['ppt', 'pptx'].some(ext => r.fileName?.toLowerCase().endsWith(ext))).length || 3}
                  </button>

                  <button
                    onClick={() => setResourceTypeFilter('LINKS')}
                    style={{
                      backgroundColor: resourceTypeFilter === 'LINKS' ? '#0B132B' : '#FFFFFF',
                      color: resourceTypeFilter === 'LINKS' ? '#FFFFFF' : '#64748B',
                      border: '1px solid',
                      borderColor: resourceTypeFilter === 'LINKS' ? '#0B132B' : '#E2E8F0',
                      borderRadius: '9999px',
                      padding: '0.35rem 0.85rem',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Links {resources.filter(r => r.resourceType === 'URL').length || 3}
                  </button>
                </div>

                {/* Resource Cards Stack */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {filteredResources.length > 0 ? (
                    filteredResources.map((resItem) => {
                      const badge = getResourceBadge(resItem);

                      return (
                        <div
                          key={resItem.id}
                          style={{
                            backgroundColor: '#FFFFFF',
                            borderRadius: '16px',
                            border: '1px solid #E2E8F0',
                            padding: '1.1rem 1.35rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                            transition: 'transform 0.15s ease',
                          }}
                        >
                          {/* Left Group */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', overflow: 'hidden' }}>
                            {/* Format Badge */}
                            <div style={{
                              width: '38px',
                              height: '38px',
                              minWidth: '38px',
                              borderRadius: '8px',
                              backgroundColor: badge.bg,
                              color: badge.text,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontFamily: 'var(--font-code)',
                              fontSize: '0.72rem',
                            }}>
                              {badge.label}
                            </div>

                            {/* Title & Meta Line */}
                            <div style={{ overflow: 'hidden' }}>
                              <h4 style={{
                                fontSize: '0.96rem',
                                fontWeight: 700,
                                color: '#0F172A',
                                marginBottom: '0.2rem',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}>
                                {resItem.title}
                              </h4>
                              <p style={{ fontSize: '0.78rem', color: '#64748B', margin: 0 }}>
                                {resItem.resourceType === 'URL'
                                  ? `Added ${new Date(resItem.createdAt).toLocaleDateString()} · External link · ${resItem.viewCount || 0} clicks`
                                  : `Updated ${new Date(resItem.createdAt).toLocaleDateString()} · Version ${resItem.currentVersion || 1} · ${resItem.viewCount || 0} views`}
                              </p>
                            </div>
                          </div>

                          {/* Right Group: Status Chip & Three Dots */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{
                              backgroundColor: resItem.isPublished ? '#D1FAE5' : '#FEF3C7',
                              color: resItem.isPublished ? '#065F46' : '#B45309',
                              borderRadius: '6px',
                              padding: '0.2rem 0.6rem',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                            }}>
                              {resItem.isPublished ? 'Published' : 'Draft'}
                            </span>

                            {resItem.resourceType === 'URL' ? (
                              <button
                                onClick={() => handleOpenExternalLink(resItem)}
                                title="Open Link"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#0D9488',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  padding: '0.35rem',
                                }}
                              >
                                <ExternalLink size={16} />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleDownloadResource(resItem)}
                                title="Download"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#0D9488',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  padding: '0.35rem',
                                }}
                              >
                                <Download size={16} />
                              </button>
                            )}

                            <button
                              onClick={() => setSelectedResourceVersions(resItem)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#94A3B8',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                padding: '0.25rem',
                              }}
                            >
                              <MoreVertical size={16} />
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
                      padding: '2.5rem 1.5rem',
                      textAlign: 'center',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    }}>
                      <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        color: '#64748B',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '0.75rem',
                      }}>
                        <FileText size={20} />
                      </div>
                      <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.25rem' }}>
                        No resources in this unit yet
                      </h4>
                      <p style={{ fontSize: '0.82rem', color: '#64748B', margin: 0 }}>
                        {isFaculty ? 'Click the upload zone below or use "Upload Material" to attach lecture notes, slides, or reference links.' : 'No materials have been published by the instructor for this section yet.'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Drag & Drop Upload Zone matching Image 3! */}
                {isFaculty && (
                  <div
                    onClick={() => setIsUploadModalOpen(true)}
                    style={{
                      border: '2px dashed #CBD5E1',
                      borderRadius: '16px',
                      backgroundColor: '#F8FAFC',
                      padding: '1.75rem 1rem',
                      textAlign: 'center',
                      marginTop: '1.25rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#0D9488'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = '#CBD5E1'}
                  >
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: '#E6F7F3',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 0.75rem',
                    }}>
                      <Upload size={18} color="#0D9488" />
                    </div>
                    <div style={{ fontSize: '0.86rem', color: '#475569' }}>
                      Drop files here or <span style={{ color: '#0D9488', fontWeight: 700 }}>browse</span> · PDF, Office, images, ZIP · up to 25 MB each
                    </div>
                  </div>
                )}
              </div>

              {/* Column 3: Join Code & Join Requests matching Image 3! */}
              <div>
                {/* Join code Dark Navy Card */}
                <div style={{
                  backgroundColor: '#0B132B',
                  borderRadius: '20px',
                  padding: '1.5rem',
                  color: '#FFFFFF',
                  boxShadow: '0 10px 25px -5px rgba(11, 19, 43, 0.3)',
                  marginBottom: '1.75rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                    <h3 className="font-display" style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                      Join code
                    </h3>
                    <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>
                      {activeBatchTerm}
                    </span>
                  </div>

                  {/* Monospace Join Code Box */}
                  <div style={{
                    backgroundColor: '#152542',
                    border: '1px solid #233554',
                    borderRadius: '10px',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '1rem',
                  }}>
                    <span style={{
                      fontFamily: 'var(--font-code)',
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      color: '#FFFFFF',
                      letterSpacing: '0.12em',
                    }}>
                      {activeBatchJoinCode}
                    </span>

                    <button
                      onClick={() => handleCopyJoinCode(activeBatchJoinCode)}
                      style={{
                        backgroundColor: '#5EE0C4',
                        color: '#0B132B',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0.45rem 0.85rem',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  {/* Bottom Approval & Enrolled stats */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                      Joining needs your approval
                    </span>
                    <span style={{
                      backgroundColor: '#1A2639',
                      border: '1px solid #233554',
                      color: '#CBD5E1',
                      borderRadius: '9999px',
                      padding: '0.25rem 0.65rem',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                    }}>
                      {enrolledCount} enrolled
                    </span>
                  </div>
                </div>

                {/* Join requests Widget */}
                {isFaculty && (
                  <div style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '20px',
                    border: '1px solid #E2E8F0',
                    padding: '1.5rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                      <h3 className="font-display" style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                        Join requests
                      </h3>
                      <span style={{
                        backgroundColor: '#FEF3C7',
                        color: '#B45309',
                        borderRadius: '9999px',
                        padding: '0.2rem 0.6rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                      }}>
                        {pendingRequests.length} pending
                      </span>
                    </div>

                    {pendingRequests.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                        {pendingRequests.map(req => {
                          const initials = req.initials || (req.name || 'ST').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                          const bgColor = req.color?.bg || '#E0F2FE';
                          const textColor = req.color?.text || '#0284C7';

                          return (
                            <div key={req.id}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.65rem' }}>
                                <div style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '50%',
                                  backgroundColor: bgColor,
                                  color: textColor,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 800,
                                  fontSize: '0.82rem',
                                }}>
                                  {initials}
                                </div>
                                <div>
                                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A' }}>
                                    {req.name}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                                    {req.program || 'Student'} · {req.timeAgo || 'Pending'}
                                  </div>
                                </div>
                              </div>

                              {/* Approve & Decline buttons */}
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                  onClick={() => handleApproveRequest(req)}
                                  style={{
                                    flex: 1,
                                    backgroundColor: '#0F766E',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '0.5rem',
                                    fontWeight: 700,
                                    fontSize: '0.82rem',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleDeclineRequest(req)}
                                  style={{
                                    flex: 1,
                                    backgroundColor: '#FFFFFF',
                                    color: '#0F172A',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '8px',
                                    padding: '0.5rem',
                                    fontWeight: 600,
                                    fontSize: '0.82rem',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Decline
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '1rem', color: '#64748B', fontSize: '0.85rem' }}>
                        No pending join requests.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Upload Resource Modal */}
        {isUploadModalOpen && (
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
              padding: '2rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              border: '1px solid #E2E8F0',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h2 className="font-display" style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Upload Course Material
                </h2>
                <button onClick={() => setIsUploadModalOpen(false)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '1.25rem' }}>
                  ✕
                </button>
              </div>

              {/* Upload Type Tabs */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setUploadType('FILE')}
                  style={{
                    flex: 1,
                    padding: '0.55rem',
                    borderRadius: '8px',
                    border: uploadType === 'FILE' ? '2px solid #0D9488' : '1px solid #E2E8F0',
                    backgroundColor: uploadType === 'FILE' ? '#E6F7F3' : '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    color: uploadType === 'FILE' ? '#0F766E' : '#64748B',
                  }}
                >
                  Document / Slides
                </button>
                <button
                  type="button"
                  onClick={() => setUploadType('URL')}
                  style={{
                    flex: 1,
                    padding: '0.55rem',
                    borderRadius: '8px',
                    border: uploadType === 'URL' ? '2px solid #0D9488' : '1px solid #E2E8F0',
                    backgroundColor: uploadType === 'URL' ? '#E6F7F3' : '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    color: uploadType === 'URL' ? '#0F766E' : '#64748B',
                  }}
                >
                  External URL / Video
                </button>
              </div>

              <form onSubmit={handleUploadResource}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Normalization: 1NF to BCNF"
                    value={resTitle}
                    onChange={(e) => setResTitle(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem' }}
                  />
                </div>

                {course.units && course.units.length > 0 && (
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                      Syllabus Unit (Optional)
                    </label>
                    <select
                      value={resUnitId}
                      onChange={(e) => setResUnitId(e.target.value)}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem' }}
                    >
                      <option value="">General Course Material (No Unit)</option>
                      {course.units.map((u) => (
                        <option key={u.id} value={u.id}>{u.title}</option>
                      ))}
                    </select>
                  </div>
                )}

                {uploadType === 'FILE' ? (
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                      Select Document (Max 25 MB) *
                    </label>
                    <input
                      type="file"
                      required
                      onChange={(e) => setResFile(e.target.files[0])}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                    />
                  </div>
                ) : (
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                      External Resource / Video URL *
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://youtube.com/watch?v=..."
                      value={resUrl}
                      onChange={(e) => setResUrl(e.target.value)}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem' }}
                    />
                  </div>
                )}

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                    Description (Optional)
                  </label>
                  <textarea
                    rows="2"
                    placeholder="Short summary or reading notes..."
                    value={resDesc}
                    onChange={(e) => setResDesc(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setIsUploadModalOpen(false)}
                    style={{ background: 'transparent', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '0.6rem 1.25rem', fontSize: '0.88rem', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    style={{
                      backgroundColor: '#0F766E',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.6rem 1.5rem',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                    }}
                  >
                    {uploading ? 'Publishing...' : 'Publish to Course'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Unit Modal */}
        {isAddUnitModalOpen && (
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
              maxWidth: '440px',
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}>
              <h3 className="font-display" style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0F172A', marginBottom: '1rem' }}>
                Add Syllabus Unit
              </h3>
              <form onSubmit={handleAddUnit}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                    Unit Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Transactions and concurrency"
                    value={newUnitTitle}
                    onChange={(e) => setNewUnitTitle(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem' }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setIsAddUnitModalOpen(false)}
                    style={{ background: 'transparent', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '0.55rem 1.15rem', fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingUnit}
                    style={{
                      backgroundColor: '#0F766E',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.55rem 1.35rem',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    {addingUnit ? 'Adding...' : 'Add Unit'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Create Batch Modal */}
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
            padding: '1rem',
          }}>
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '460px',
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}>
              <h3 className="font-display" style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0F172A', marginBottom: '1rem' }}>
                Create New Batch
              </h3>
              <form onSubmit={handleCreateBatch}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                    Batch / Section Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MCA Section A"
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem' }}
                  />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                    Academic Term *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Sem 3 · 2026–27"
                    value={batchTerm}
                    onChange={(e) => setBatchTerm(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem' }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                  <button
                    type="button"
                    onClick={() => setIsBatchModalOpen(false)}
                    style={{ background: 'transparent', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '0.55rem 1.15rem', fontSize: '0.85rem', cursor: 'pointer' }}
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
                      padding: '0.55rem 1.35rem',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    {creatingBatch ? 'Creating...' : 'Create Batch'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Create Assignment Modal */}
        {isCreateAsgModalOpen && (
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
              padding: '1.8rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}>
              <h3 className="font-display" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.4rem' }}>
                Create Assignment for Batch
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#64748B', marginBottom: '1.25rem' }}>
                Assign coursework with a deadline and grading policy to students in this batch.
              </p>

              <form onSubmit={handleCreateAssignment}>
                {/* Batch Selector */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                    Target Batch *
                  </label>
                  <select
                    value={asgBatchId}
                    onChange={(e) => setAsgBatchId(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', backgroundColor: '#FFFFFF' }}
                  >
                    {batches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.term})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Title */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                    Assignment Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Normalization Practice Set"
                    value={asgTitle}
                    onChange={(e) => setAsgTitle(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem' }}
                  />
                </div>

                {/* Instructions */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                    Instructions & References
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide details on submission format, question set references, or questions to solve..."
                    value={asgInstructions}
                    onChange={(e) => setAsgInstructions(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', resize: 'vertical' }}
                  />
                </div>

                {/* Due Date & Max Marks */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                      Due Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={asgDueDate}
                      onChange={(e) => setAsgDueDate(e.target.value)}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                      Max Marks *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={100}
                      value={asgMaxMarks}
                      onChange={(e) => setAsgMaxMarks(e.target.value)}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem' }}
                    />
                  </div>
                </div>

                {/* Late Policy */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                    Late Submission Policy
                  </label>
                  <select
                    value={asgLatePolicy}
                    onChange={(e) => setAsgLatePolicy(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', backgroundColor: '#FFFFFF' }}
                  >
                    <option value="ACCEPT_MARK_LATE">Accept late submissions (flag as Late)</option>
                    <option value="BLOCK_AFTER_DEADLINE">Block after deadline (strict cutoff)</option>
                  </select>
                </div>

                {/* Modal Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setIsCreateAsgModalOpen(false)}
                    style={{ background: 'transparent', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '0.6rem 1.25rem', fontSize: '0.88rem', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingAsg}
                    style={{
                      backgroundColor: '#0F766E',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.6rem 1.5rem',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                    }}
                  >
                    {creatingAsg ? 'Publishing...' : 'Publish Assignment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Toast Notification */}
        {toast && (
          <div style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            backgroundColor: toast.type === 'error' ? '#DC2626' : '#059669',
            color: '#FFFFFF',
            padding: '0.85rem 1.4rem',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            zIndex: 9999,
            fontSize: '0.9rem',
            fontWeight: 600,
          }}>
            <CheckCircle2 size={20} color="#FFFFFF" />
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              style={{
                background: 'none',
                border: 'none',
                color: '#FFFFFF',
                cursor: 'pointer',
                marginLeft: '0.5rem',
                fontSize: '1rem',
              }}
            >
              ✕
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
