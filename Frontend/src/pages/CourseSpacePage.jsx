import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, BookOpen, Layers, Users, Copy, Check, Plus, RefreshCw, 
  FileText, Link as LinkIcon, Download, Eye, History, Search, ExternalLink,
  UploadCloud, FileUp, Sparkles, CheckCircle2, AlertCircle, X
} from 'lucide-react';

export default function CourseSpacePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const isFaculty = user?.role === 'FACULTY';

  const [course, setCourse] = useState(null);
  const [batches, setBatches] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Active Tab: 'units' or 'batches'
  const [activeTab, setActiveTab] = useState('units');

  // Modals
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchName, setBatchName] = useState('');
  const [batchTerm, setBatchTerm] = useState('');
  const [joinMode, setJoinMode] = useState('AUTO_APPROVE');
  const [creatingBatch, setCreatingBatch] = useState(false);

  // Roster Modal
  const [selectedBatchRoster, setSelectedBatchRoster] = useState(null);
  const [rosterList, setRosterList] = useState([]);
  const [loadingRoster, setLoadingRoster] = useState(false);

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

  // Version History Modal
  const [selectedResourceVersions, setSelectedResourceVersions] = useState(null);
  const [newVersionFile, setNewVersionFile] = useState(null);
  const [versionChangeNote, setVersionChangeNote] = useState('');
  const [uploadingVersion, setUploadingVersion] = useState(false);

  // Preview Modal
  const [previewItem, setPreviewItem] = useState(null);

  const fetchCourseData = async () => {
    try {
      setLoading(true);
      const courseRes = await api.get(`/courses/${id}`);
      setCourse(courseRes.data);

      if (isFaculty) {
        const batchRes = await api.get(`/courses/${id}/batches`);
        setBatches(batchRes.data || []);
      }

      const resRes = await api.get(`/courses/${id}/resources`);
      setResources(resRes.data || []);
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
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
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
      const batchRes = await api.get(`/courses/${id}/batches`);
      setBatches(batchRes.data || []);
    } catch (err) {
      alert(err.message || 'Failed to create batch');
    } finally {
      setCreatingBatch(false);
    }
  };

  const handleRegenerateCode = async (batchId) => {
    if (!window.confirm('Are you sure you want to regenerate this join code? The old code will expire.')) return;
    try {
      await api.post(`/batches/${batchId}/join-code/regenerate`);
      const batchRes = await api.get(`/courses/${id}/batches`);
      setBatches(batchRes.data || []);
    } catch (err) {
      alert(err.message || 'Failed to regenerate join code');
    }
  };

  const handleOpenRoster = async (batch) => {
    setSelectedBatchRoster(batch);
    setLoadingRoster(true);
    try {
      const res = await api.get(`/batches/${batch.id}/enrollments`);
      setRosterList(res.data || []);
    } catch (err) {
      alert(err.message || 'Failed to load roster');
    } finally {
      setLoadingRoster(false);
    }
  };

  const handleUpdateStudentStatus = async (enrollmentId, newStatus) => {
    try {
      await api.patch(`/batches/${selectedBatchRoster.id}/enrollments/${enrollmentId}`, {
        status: newStatus,
      });
      const res = await api.get(`/batches/${selectedBatchRoster.id}/enrollments`);
      setRosterList(res.data || []);
    } catch (err) {
      alert(err.message || 'Failed to update student status');
    }
  };

  // Upload Resource Handler
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
      } else {
        await api.post(`/courses/${id}/resources/url`, {
          title: resTitle,
          description: resDesc,
          unitId: resUnitId ? Number(resUnitId) : null,
          externalUrl: resUrl,
          isPublished,
        });
      }

      setIsUploadModalOpen(false);
      setResTitle('');
      setResDesc('');
      setResFile(null);
      setResUrl('');
      // Refresh resources
      const resRes = await api.get(`/courses/${id}/resources`);
      setResources(resRes.data || []);
    } catch (err) {
      alert(err.message || 'Failed to upload resource');
    } finally {
      setUploading(false);
    }
  };

  // Upload New Version Handler
  const handleUploadNewVersion = async (e) => {
    e.preventDefault();
    if (!newVersionFile) {
      alert('Please select a replacement file');
      return;
    }
    setUploadingVersion(true);
    try {
      const formData = new FormData();
      formData.append('changeNote', versionChangeNote);
      formData.append('file', newVersionFile);

      const token = localStorage.getItem('cm_token');
      const res = await fetch(`http://localhost:8081/api/v1/resources/${selectedResourceVersions.id}/versions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Version upload failed');

      setSelectedResourceVersions(null);
      setNewVersionFile(null);
      setVersionChangeNote('');

      const resRes = await api.get(`/courses/${id}/resources`);
      setResources(resRes.data || []);
    } catch (err) {
      alert(err.message || 'Failed to upload version');
    } finally {
      setUploadingVersion(false);
    }
  };

  const handlePreviewResource = async (resItem) => {
    try {
      await api.post(`/resources/${resItem.id}/view`);
    } catch (e) {}
    setPreviewItem(resItem);
  };

  const handleDownloadResource = async (resItem) => {
    try {
      await api.post(`/resources/${resItem.id}/download`);
    } catch (e) {}
    window.open(`http://localhost:8081/api/v1/files/${resItem.fileUrl}`, '_blank');
  };

  // Filter resources by search query
  const filteredResources = resources.filter(r => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return r.title?.toLowerCase().includes(q) ||
           r.description?.toLowerCase().includes(q) ||
           r.unitTitle?.toLowerCase().includes(q) ||
           r.fileName?.toLowerCase().includes(q);
  });

  if (loading) {
    return <div style={{ maxWidth: '1240px', margin: '4rem auto', textAlign: 'center', color: 'var(--ink-muted)' }}>Loading course space...</div>;
  }

  if (error || !course) {
    return (
      <div style={{ maxWidth: '1240px', margin: '3rem auto', padding: '0 1.5rem' }}>
        <div style={{ padding: '1rem', backgroundColor: 'var(--danger-bg)', color: 'var(--danger-text)', borderRadius: '10px' }}>
          {error || 'Course not found'}
        </div>
        <Link to="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginTop: '1rem', color: 'var(--primary)', fontWeight: 600 }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
      {/* Breadcrumb Navigation */}
      <Link to="/dashboard" style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        textDecoration: 'none',
        color: 'var(--ink-muted)',
        fontSize: '0.88rem',
        fontWeight: 500,
        marginBottom: '1.25rem',
      }}>
        <ArrowLeft size={16} /> Back to Courses
      </Link>

      {/* Course Hero Banner */}
      <div className="rounded-card-3" style={{
        backgroundColor: '#FFFFFF',
        padding: '2.25rem',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-card)',
        marginBottom: '2rem',
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', marginBottom: '0.65rem' }}>
          <span style={{
            fontFamily: 'var(--font-code)',
            fontSize: '0.85rem',
            fontWeight: 700,
            backgroundColor: 'var(--primary-soft)',
            color: 'var(--primary-dark)',
            padding: '0.25rem 0.75rem',
            borderRadius: '6px',
          }}>
            {course.code}
          </span>
          <span style={{ fontSize: '0.88rem', color: 'var(--ink-muted)', fontWeight: 500 }}>
            {course.program} • {course.semester}
          </span>
          <span className="badge-chip" style={{ marginLeft: 'auto' }}>
            Permanent Course Space
          </span>
        </div>

        <h1 className="font-display" style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--ink)', marginBottom: '0.75rem' }}>
          {course.name}
        </h1>

        <p style={{ color: 'var(--ink-secondary)', fontSize: '0.96rem', maxWidth: '820px', lineHeight: 1.6, marginBottom: '1.25rem' }}>
          {course.description || 'Permanent academic resource space. All units, lecture notes, and assignments belong to this course.'}
        </p>

        <div style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>
          Instructor: <strong>{course.owner?.name}</strong> ({course.owner?.email})
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        borderBottom: '1px solid var(--border)',
        marginBottom: '2rem',
      }}>
        <button
          onClick={() => setActiveTab('units')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'units' ? '3px solid var(--primary)' : '3px solid transparent',
            padding: '0.75rem 1rem',
            fontSize: '1rem',
            fontWeight: 700,
            color: activeTab === 'units' ? 'var(--primary)' : 'var(--ink-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Layers size={18} />
          <span>Course Units & Materials ({resources.length})</span>
        </button>

        {isFaculty && (
          <button
            onClick={() => setActiveTab('batches')}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'batches' ? '3px solid var(--primary)' : '3px solid transparent',
              padding: '0.75rem 1rem',
              fontSize: '1rem',
              fontWeight: 700,
              color: activeTab === 'batches' ? 'var(--primary)' : 'var(--ink-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Users size={18} />
            <span>Batches & Join Codes ({batches.length})</span>
          </button>
        )}
      </div>

      {/* Tab Content: Units & Materials */}
      {activeTab === 'units' && (
        <div>
          {/* Action & Search Bar */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            marginBottom: '1.75rem',
          }}>
            {/* Search Input */}
            <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
              <Search size={16} color="var(--ink-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search notes, slides, units, links..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.75rem 0.65rem 2.25rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-input)',
                  fontSize: '0.88rem',
                  backgroundColor: '#FFFFFF',
                }}
              />
            </div>

            {isFaculty && (
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="btn-primary"
                style={{ minHeight: '44px', padding: '0 1.4rem' }}
              >
                <UploadCloud size={18} />
                <span>Upload Material</span>
              </button>
            )}
          </div>

          {/* Units Sections with Nested Resources */}
          {course.units && course.units.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {course.units.map((unit, index) => {
                const unitResources = filteredResources.filter(r => r.unitId === unit.id);

                return (
                  <div
                    key={unit.id || index}
                    className="rounded-card-1"
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid var(--border)',
                      padding: '1.75rem',
                      boxShadow: 'var(--shadow-subtle)',
                    }}
                  >
                    {/* Unit Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <div style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '8px',
                          backgroundColor: 'var(--primary-soft)',
                          color: 'var(--primary-dark)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontFamily: 'var(--font-code)',
                          fontSize: '0.88rem',
                        }}>
                          {unit.sortOrder || index + 1}
                        </div>
                        <h3 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ink)' }}>
                          {unit.title}
                        </h3>
                      </div>

                      <span className="badge-chip">
                        {unitResources.length} {unitResources.length === 1 ? 'Resource' : 'Resources'}
                      </span>
                    </div>

                    {/* Resources in this Unit */}
                    {unitResources.length === 0 ? (
                      <div style={{
                        padding: '1.5rem',
                        textAlign: 'center',
                        backgroundColor: 'var(--canvas)',
                        borderRadius: '10px',
                        color: 'var(--ink-muted)',
                        fontSize: '0.85rem',
                      }}>
                        No materials uploaded for this unit yet.
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                        {unitResources.map((resItem) => (
                          <div
                            key={resItem.id}
                            style={{
                              backgroundColor: 'var(--surface-alt)',
                              borderRadius: '12px',
                              border: '1px solid var(--border)',
                              padding: '1.2rem',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <span style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  fontFamily: 'var(--font-code)',
                                  backgroundColor: resItem.resourceType === 'FILE' ? 'var(--info-bg)' : 'var(--warning-bg)',
                                  color: resItem.resourceType === 'FILE' ? 'var(--info-text)' : 'var(--warning-text)',
                                  padding: '0.15rem 0.5rem',
                                  borderRadius: '4px',
                                }}>
                                  {resItem.resourceType === 'FILE' ? (resItem.fileName?.split('.').pop()?.toUpperCase() || 'FILE') : 'WEB LINK'}
                                </span>

                                <span style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', fontFamily: 'var(--font-code)' }}>
                                  v{resItem.currentVersion}
                                </span>
                              </div>

                              <h4 className="font-display" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '0.35rem' }}>
                                {resItem.title}
                              </h4>

                              {resItem.description && (
                                <p style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', lineHeight: 1.45, marginBottom: '0.85rem' }}>
                                  {resItem.description}
                                </p>
                              )}
                            </div>

                            <div>
                              {/* View / Download stats for faculty */}
                              {isFaculty && (
                                <div style={{ fontSize: '0.72rem', color: 'var(--ink-muted)', marginBottom: '0.65rem' }}>
                                  👁️ {resItem.viewCount} views • 📥 {resItem.downloadCount} downloads
                                </div>
                              )}

                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {resItem.resourceType === 'FILE' ? (
                                  <>
                                    <button
                                      onClick={() => handlePreviewResource(resItem)}
                                      style={{
                                        flex: 1,
                                        background: '#FFFFFF',
                                        border: '1px solid var(--border)',
                                        borderRadius: '8px',
                                        padding: '0.45rem',
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.3rem',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      <Eye size={14} color="var(--primary)" />
                                      <span>Preview</span>
                                    </button>

                                    <button
                                      onClick={() => handleDownloadResource(resItem)}
                                      style={{
                                        flex: 1,
                                        background: 'var(--primary)',
                                        color: '#FFFFFF',
                                        border: 'none',
                                        borderRadius: '8px',
                                        padding: '0.45rem',
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.3rem',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      <Download size={14} />
                                      <span>Download</span>
                                    </button>

                                    {isFaculty && (
                                      <button
                                        onClick={() => setSelectedResourceVersions(resItem)}
                                        style={{
                                          background: '#FFFFFF',
                                          border: '1px solid var(--border)',
                                          borderRadius: '8px',
                                          padding: '0.45rem',
                                          cursor: 'pointer',
                                        }}
                                        title="Version History & Replace File"
                                      >
                                        <History size={14} />
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  <a
                                    href={resItem.externalUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn-outline"
                                    style={{
                                      width: '100%',
                                      minHeight: '36px',
                                      fontSize: '0.8rem',
                                      padding: '0 0.85rem',
                                      textDecoration: 'none',
                                    }}
                                  >
                                    <span>Open External Link</span>
                                    <ExternalLink size={14} />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid var(--border)' }}>
              No units defined for this course yet.
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Batches (Faculty Only) */}
      {activeTab === 'batches' && isFaculty && (
        <div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}>
            <div>
              <h2 className="font-display" style={{ fontSize: '1.4rem', fontWeight: 700 }}>
                Course Batches
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>
                Each batch is a cohort taking this course. Every batch sees all course units above.
              </p>
            </div>

            <button
              onClick={() => setIsBatchModalOpen(true)}
              className="btn-primary"
              style={{ minHeight: '42px', padding: '0 1.25rem', fontSize: '0.88rem' }}
            >
              <Plus size={16} />
              <span>Create New Batch</span>
            </button>
          </div>

          {batches.length === 0 ? (
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid var(--border)',
              padding: '3rem 2rem',
              textAlign: 'center',
            }}>
              <p style={{ color: 'var(--ink-muted)', marginBottom: '1rem' }}>
                No active batches for this course. Create a batch to generate student join codes.
              </p>
              <button onClick={() => setIsBatchModalOpen(true)} className="btn-primary">
                <Plus size={16} /> Create First Batch
              </button>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
              gap: '1.5rem',
            }}>
              {batches.map((batch) => (
                <div
                  key={batch.id}
                  className="rounded-card-1"
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
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span className="badge-chip">
                        {batch.term || 'Active Cohort'}
                      </span>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: batch.joinMode === 'AUTO_APPROVE' ? 'var(--primary-dark)' : 'var(--warning-text)',
                        backgroundColor: batch.joinMode === 'AUTO_APPROVE' ? 'var(--primary-soft)' : 'var(--warning-bg)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                      }}>
                        {batch.joinMode === 'AUTO_APPROVE' ? 'Auto-Approve' : 'Approval Required'}
                      </span>
                    </div>

                    <h3 className="font-display" style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '1rem' }}>
                      {batch.name}
                    </h3>

                    {/* Prominent Join Code Card from design.html */}
                    <div style={{
                      backgroundColor: 'var(--canvas)',
                      border: '1px dashed var(--border-dashed)',
                      borderRadius: '14px',
                      padding: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '1.25rem',
                    }}>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--ink-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                          Batch Join Code
                        </div>
                        <div style={{
                          fontFamily: 'var(--font-code)',
                          fontSize: '1.45rem',
                          fontWeight: 800,
                          color: 'var(--primary-dark)',
                          letterSpacing: '0.12em',
                        }}>
                          {batch.joinCode}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleCopyJoinCode(batch.joinCode)}
                          style={{
                            background: '#FFFFFF',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            padding: '0.5rem 0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                          title="Copy Code"
                        >
                          {copiedCode === batch.joinCode ? <Check size={14} color="var(--primary)" /> : <Copy size={14} />}
                          <span>{copiedCode === batch.joinCode ? 'Copied!' : 'Copy'}</span>
                        </button>

                        <button
                          onClick={() => handleRegenerateCode(batch.id)}
                          style={{
                            background: '#FFFFFF',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            padding: '0.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                          title="Regenerate Code"
                        >
                          <RefreshCw size={14} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                      onClick={() => handleOpenRoster(batch)}
                      className="btn-outline"
                      style={{
                        flex: 1,
                        minHeight: '40px',
                        fontSize: '0.84rem',
                        padding: '0 1rem',
                      }}
                    >
                      <Users size={15} />
                      <span>View Roster ({batch.enrolledStudentsCount || 0})</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upload Material Modal */}
      {isUploadModalOpen && (
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
            maxWidth: '520px',
            padding: '2rem',
            boxShadow: 'var(--shadow-elevation)',
            border: '1px solid var(--border)',
          }}>
            <h2 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.35rem' }}>
              Upload Course Material
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', marginBottom: '1.25rem' }}>
              Uploaded once to this course space. All current and future batches receive access.
            </p>

            {/* Upload Type Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <button
                type="button"
                onClick={() => setUploadType('FILE')}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  borderRadius: '8px',
                  border: uploadType === 'FILE' ? '2px solid var(--primary)' : '1px solid var(--border)',
                  backgroundColor: uploadType === 'FILE' ? 'var(--primary-soft)' : '#FFFFFF',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Upload File (PDF / Slides / Docs)
              </button>
              <button
                type="button"
                onClick={() => setUploadType('URL')}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  borderRadius: '8px',
                  border: uploadType === 'URL' ? '2px solid var(--primary)' : '1px solid var(--border)',
                  backgroundColor: uploadType === 'URL' ? 'var(--primary-soft)' : '#FFFFFF',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                External URL / Video
              </button>
            </div>

            <form onSubmit={handleUploadResource}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                  Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Normalization Worked Examples"
                  value={resTitle}
                  onChange={(e) => setResTitle(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border-input)', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                  Assign to Course Unit
                </label>
                <select
                  value={resUnitId}
                  onChange={(e) => setResUnitId(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border-input)', fontSize: '0.9rem' }}
                >
                  <option value="">General Course Material (No Unit)</option>
                  {course.units?.map((u) => (
                    <option key={u.id} value={u.id}>{u.title}</option>
                  ))}
                </select>
              </div>

              {uploadType === 'FILE' ? (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                    Select Document (Max 25 MB) *
                  </label>
                  <input
                    type="file"
                    required
                    onChange={(e) => setResFile(e.target.files[0])}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-input)', fontSize: '0.88rem' }}
                  />
                </div>
              ) : (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                    External Resource / Video URL *
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://youtube.com/watch?v=..."
                    value={resUrl}
                    onChange={(e) => setResUrl(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border-input)', fontSize: '0.9rem' }}
                  />
                </div>
              )}

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                  Description (Optional)
                </label>
                <textarea
                  rows="2"
                  placeholder="Notes or instructions for students..."
                  value={resDesc}
                  onChange={(e) => setResDesc(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border-input)', fontSize: '0.9rem', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '9999px', padding: '0.6rem 1.25rem', fontSize: '0.88rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="btn-primary"
                  style={{ minHeight: '44px', padding: '0 1.5rem', fontSize: '0.88rem' }}
                >
                  {uploading ? 'Uploading...' : 'Publish to Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Version History & Replace Modal */}
      {selectedResourceVersions && (
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
            maxWidth: '560px',
            maxHeight: '85vh',
            overflowY: 'auto',
            padding: '2rem',
            boxShadow: 'var(--shadow-elevation)',
            border: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 className="font-display" style={{ fontSize: '1.4rem', fontWeight: 800 }}>
                  Version History
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--ink-muted)' }}>
                  {selectedResourceVersions.title} (Current: v{selectedResourceVersions.currentVersion})
                </p>
              </div>
              <button onClick={() => setSelectedResourceVersions(null)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            {/* Upload New Version Form */}
            <form onSubmit={handleUploadNewVersion} style={{
              backgroundColor: 'var(--canvas)',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              border: '1px solid var(--border)',
            }}>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                Upload Replacement Version
              </h4>
              <div style={{ marginBottom: '0.75rem' }}>
                <input
                  type="file"
                  required
                  onChange={(e) => setNewVersionFile(e.target.files[0])}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <input
                  type="text"
                  placeholder="Change note (e.g. Added section 4 exercises)"
                  value={versionChangeNote}
                  onChange={(e) => setVersionChangeNote(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-input)', fontSize: '0.85rem' }}
                />
              </div>
              <button
                type="submit"
                disabled={uploadingVersion}
                className="btn-primary"
                style={{ width: '100%', minHeight: '38px', fontSize: '0.85rem' }}
              >
                {uploadingVersion ? 'Uploading...' : 'Save New Version'}
              </button>
            </form>

            {/* Prior Versions List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--ink)' }}>
                Revision Log
              </div>
              {selectedResourceVersions.versions?.map((ver) => (
                <div
                  key={ver.id}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                      Version {ver.versionNumber} — {ver.fileName}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>
                      Note: {ver.changeNote || 'No notes'} • {new Date(ver.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <a
                    href={`http://localhost:8081/api/v1/files/${ver.fileUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}
                  >
                    Download
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal for PDF / Image */}
      {previewItem && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 27, 45, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 110,
          padding: '1.5rem',
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '850px',
            height: '80vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-elevation)',
          }}>
            <div style={{
              padding: '0.85rem 1.25rem',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <h4 className="font-display" style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                  {previewItem.title}
                </h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>
                  {previewItem.fileName} • v{previewItem.currentVersion}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => handleDownloadResource(previewItem)}
                  className="btn-primary"
                  style={{ minHeight: '36px', padding: '0 1rem', fontSize: '0.8rem' }}
                >
                  <Download size={14} /> Download
                </button>
                <button onClick={() => setPreviewItem(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem' }}>
                  ✕
                </button>
              </div>
            </div>

            <div style={{ flex: 1, backgroundColor: 'var(--canvas)' }}>
              {previewItem.mimeType?.startsWith('image/') ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '1rem' }}>
                  <img
                    src={`http://localhost:8081/api/v1/files/${previewItem.fileUrl}`}
                    alt={previewItem.title}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px' }}
                  />
                </div>
              ) : (
                <iframe
                  src={`http://localhost:8081/api/v1/files/${previewItem.fileUrl}`}
                  title={previewItem.title}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Batch Modal */}
      {isBatchModalOpen && (
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
            maxWidth: '480px',
            padding: '2rem',
            boxShadow: 'var(--shadow-elevation)',
            border: '1px solid var(--border)',
          }}>
            <h2 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.35rem' }}>
              Create New Batch
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', marginBottom: '1.5rem' }}>
              Students will use the generated join code to access all existing course units.
            </p>

            <form onSubmit={handleCreateBatch}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                  Batch Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MCA 2026-28 Batch B"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border-input)', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                  Term / Semester
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sem 3, 2026-27"
                  value={batchTerm}
                  onChange={(e) => setBatchTerm(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border-input)', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                  Student Join Mode
                </label>
                <select
                  value={joinMode}
                  onChange={(e) => setJoinMode(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border-input)', fontSize: '0.9rem' }}
                >
                  <option value="AUTO_APPROVE">Auto-Approve (Students gain access immediately)</option>
                  <option value="FACULTY_APPROVAL">Faculty Approval Required (Review join requests)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '9999px', padding: '0.6rem 1.25rem', fontSize: '0.88rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingBatch}
                  className="btn-primary"
                  style={{ minHeight: '44px', padding: '0 1.5rem', fontSize: '0.88rem' }}
                >
                  {creatingBatch ? 'Generating Code...' : 'Create Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Roster Modal */}
      {selectedBatchRoster && (
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
            maxWidth: '640px',
            maxHeight: '85vh',
            overflowY: 'auto',
            padding: '2rem',
            boxShadow: 'var(--shadow-elevation)',
            border: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 className="font-display" style={{ fontSize: '1.4rem', fontWeight: 800 }}>
                  {selectedBatchRoster.name} — Student Roster
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--ink-muted)' }}>
                  Join Code: <strong>{selectedBatchRoster.joinCode}</strong> • {rosterList.length} Students
                </p>
              </div>
              <button
                onClick={() => setSelectedBatchRoster(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {loadingRoster ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>Loading roster...</div>
            ) : rosterList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: 'var(--canvas)', borderRadius: '12px' }}>
                No students enrolled in this batch yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {rosterList.map((enr) => (
                  <div
                    key={enr.id}
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: '10px',
                      backgroundColor: 'var(--canvas)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--ink)' }}>
                        {enr.studentName}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>
                        {enr.studentEmail} • Joined {new Date(enr.joinedAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        backgroundColor: enr.status === 'ACTIVE' ? 'var(--primary-soft)' : (enr.status === 'PENDING' ? 'var(--warning-bg)' : 'var(--danger-bg)'),
                        color: enr.status === 'ACTIVE' ? 'var(--primary-dark)' : (enr.status === 'PENDING' ? 'var(--warning-text)' : 'var(--danger-text)'),
                      }}>
                        {enr.status}
                      </span>

                      {enr.status === 'PENDING' && (
                        <button
                          onClick={() => handleUpdateStudentStatus(enr.id, 'ACTIVE')}
                          style={{
                            background: 'var(--primary)',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '0.3rem 0.6rem',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          Approve
                        </button>
                      )}

                      {enr.status === 'ACTIVE' && (
                        <button
                          onClick={() => handleUpdateStudentStatus(enr.id, 'REMOVED')}
                          style={{
                            background: 'transparent',
                            color: 'var(--danger-text)',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            padding: '0.3rem 0.6rem',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
