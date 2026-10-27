import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  Plus, Calendar, Clock, CheckCircle2, AlertCircle, FileText, Download, 
  ExternalLink, Copy, Check, Award, Send, X, Layers, Users, RefreshCw
} from 'lucide-react';

export default function AssignmentsDesk({ courseId, batches, isFaculty, user }) {
  const [selectedBatchId, setSelectedBatchId] = useState(batches && batches.length > 0 ? batches[0].id : null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSubmissionsDeskOpen, setIsSubmissionsDeskOpen] = useState(false);
  const [activeAssignment, setActiveAssignment] = useState(null);

  // Create Assignment State
  const [newTitle, setNewTitle] = useState('');
  const [newInstructions, setNewInstructions] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newMaxMarks, setNewMaxMarks] = useState(100);
  const [newLatePolicy, setNewLatePolicy] = useState('BLOCK_AFTER_DEADLINE');
  const [creating, setCreating] = useState(false);

  // Clone Assignment State
  const [targetBatchId, setTargetBatchId] = useState('');
  const [cloneDueDate, setCloneDueDate] = useState('');
  const [cloning, setCloning] = useState(false);

  // Student Submission State
  const [submissionText, setSubmissionText] = useState('');
  const [submissionFiles, setSubmissionFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [digitalReceipt, setDigitalReceipt] = useState(null);
  const [copiedReceipt, setCopiedReceipt] = useState(false);

  // Faculty Review Desk State
  const [submissionsList, setSubmissionsList] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [gradingMarks, setGradingMarks] = useState({});
  const [gradingFeedback, setGradingFeedback] = useState({});
  const [savingGradeId, setSavingGradeId] = useState(null);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (batches && batches.length > 0 && !selectedBatchId) {
      setSelectedBatchId(batches[0].id);
    }
  }, [batches]);

  const fetchAssignments = async () => {
    if (!selectedBatchId) return;
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/batches/${selectedBatchId}/assignments`);
      setAssignments(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedBatchId) {
      fetchAssignments();
    }
  }, [selectedBatchId]);

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!selectedBatchId) return;
    setCreating(true);
    setError('');
    setSuccessMsg('');
    try {
      await api.post(`/batches/${selectedBatchId}/assignments`, {
        title: newTitle.trim(),
        instructions: newInstructions,
        dueDate: newDueDate,
        maxMarks: Number(newMaxMarks),
        latePolicy: newLatePolicy,
      });
      setSuccessMsg('Assignment published to batch successfully!');
      setIsCreateModalOpen(false);
      // Reset form
      setNewTitle('');
      setNewInstructions('');
      setNewDueDate('');
      setNewMaxMarks(100);
      setNewLatePolicy('BLOCK_AFTER_DEADLINE');
      await fetchAssignments();
    } catch (err) {
      setError(err.message || 'Failed to create assignment');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenCloneModal = (asg) => {
    setActiveAssignment(asg);
    const otherBatches = batches.filter(b => b.id !== selectedBatchId);
    setTargetBatchId(otherBatches.length > 0 ? otherBatches[0].id : '');
    setCloneDueDate(asg.dueDate ? asg.dueDate.slice(0, 16) : '');
    setIsCloneModalOpen(true);
  };

  const handleCloneAssignment = async (e) => {
    e.preventDefault();
    if (!activeAssignment || !targetBatchId) return;
    setCloning(true);
    setError('');
    try {
      await api.post(`/assignments/${activeAssignment.id}/clone`, {
        targetBatchId: Number(targetBatchId),
        newDueDate: cloneDueDate,
      });
      setSuccessMsg(`Assignment '${activeAssignment.title}' cloned to target batch successfully!`);
      setIsCloneModalOpen(false);
    } catch (err) {
      setError(err.message || 'Failed to clone assignment');
    } finally {
      setCloning(false);
    }
  };

  const handleOpenSubmitModal = (asg) => {
    setActiveAssignment(asg);
    setSubmissionText(asg.mySubmission?.textContent || '');
    setSubmissionFiles([]);
    setIsSubmitModalOpen(true);
  };

  const handleSubmitAssignment = async (e) => {
    e.preventDefault();
    if (!activeAssignment) return;
    setSubmitting(true);
    setError('');
    try {
      const formData = new FormData();
      if (submissionText.trim()) {
        formData.append('textContent', submissionText.trim());
      }
      for (let i = 0; i < submissionFiles.length; i++) {
        formData.append('files', submissionFiles[i]);
      }

      const res = await api.post(`/assignments/${activeAssignment.id}/submissions`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setDigitalReceipt(res.data);
      setIsSubmitModalOpen(false);
      setSuccessMsg('Submission received! Digital confirmation receipt generated.');
      await fetchAssignments();
    } catch (err) {
      setError(err.message || 'Failed to submit assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenSubmissionsDesk = async (asg) => {
    setActiveAssignment(asg);
    setIsSubmissionsDeskOpen(true);
    setLoadingSubmissions(true);
    try {
      const res = await api.get(`/assignments/${asg.id}/submissions`);
      setSubmissionsList(res.data || []);

      // Populate grading maps
      const marksMap = {};
      const feedbackMap = {};
      (res.data || []).forEach(sub => {
        if (sub.marks !== null) marksMap[sub.id] = sub.marks;
        if (sub.feedback) feedbackMap[sub.id] = sub.feedback;
      });
      setGradingMarks(marksMap);
      setGradingFeedback(feedbackMap);
    } catch (err) {
      setError(err.message || 'Failed to load submissions');
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleSaveGrade = async (subId) => {
    setSavingGradeId(subId);
    try {
      const marks = Number(gradingMarks[subId]);
      const feedback = gradingFeedback[subId] || '';
      await api.patch(`/submissions/${subId}/grade`, { marks, feedback });
      // Update local state
      setSubmissionsList(prev => prev.map(s => s.id === subId ? { ...s, marks, feedback } : s));
    } catch (err) {
      alert(err.message || 'Failed to save grade');
    } finally {
      setSavingGradeId(null);
    }
  };

  const handlePublishGrades = async () => {
    if (!activeAssignment) return;
    if (!window.confirm('Publish all graded marks to students? Enrolled students will be notified.')) return;
    setPublishing(true);
    try {
      await api.post(`/assignments/${activeAssignment.id}/publish-grades`);
      setSuccessMsg('Grades published to students!');
      setSubmissionsList(prev => prev.map(s => ({ ...s, marksPublished: true })));
      await fetchAssignments();
    } catch (err) {
      alert(err.message || 'Failed to publish grades');
    } finally {
      setPublishing(false);
    }
  };

  const formatDueDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div>
      {/* Header & Batch Selector */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        marginBottom: '1.75rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h2 className="font-display" style={{ fontSize: '1.4rem', fontWeight: 800 }}>
              Coursework & Assignments
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>
              {isFaculty 
                ? 'Create assignments, set late policies, review student submissions, and release private grades.'
                : 'Submit work before deadlines, receive digital receipts, and view your private grades & feedback.'}
            </p>
          </div>

          {/* Batch Selector (if multiple batches exist) */}
          {batches && batches.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--surface-alt)', padding: '0.35rem 0.75rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink-muted)' }}>Cohort Batch:</span>
              <select
                value={selectedBatchId || ''}
                onChange={(e) => setSelectedBatchId(Number(e.target.value))}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontFamily: 'inherit',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  color: 'var(--ink)',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                {batches.map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({b.term || 'Active'})</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {isFaculty && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-primary"
            style={{ minHeight: '44px', padding: '0 1.4rem' }}
          >
            <Plus size={18} />
            <span>Create Assignment</span>
          </button>
        )}
      </div>

      {/* Messages */}
      {successMsg && (
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
          <span>{successMsg}</span>
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

      {/* Assignments List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--ink-muted)' }}>
          Loading assignments...
        </div>
      ) : assignments.length === 0 ? (
        <div className="rounded-card-1" style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid var(--border)',
          padding: '3.5rem 2rem',
          textAlign: 'center',
        }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            backgroundColor: 'var(--info-bg)',
            color: 'var(--info-text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
          }}>
            <Calendar size={24} />
          </div>
          <h3 className="font-display" style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.4rem' }}>
            No Coursework Assigned Yet
          </h3>
          <p style={{ color: 'var(--ink-muted)', fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto 1rem' }}>
            {isFaculty 
              ? 'Click "Create Assignment" above to assign problem sets, project milestones, or lab exercises.'
              : 'Your faculty has not posted any assignments for this batch yet.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {assignments.map((asg) => {
            const isDuePassed = new Date(asg.dueDate) < new Date();
            const studentSubmitted = asg.mySubmission !== null;
            const mySub = asg.mySubmission;

            return (
              <div
                key={asg.id}
                className="rounded-card-1"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--border)',
                  padding: '1.75rem',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ flex: 1, minWidth: '280px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: 'var(--surface-muted)',
                        color: 'var(--ink)',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '6px',
                        fontFamily: 'var(--font-code)',
                      }}>
                        Max: {asg.maxMarks} Marks
                      </span>

                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: asg.latePolicy === 'BLOCK_AFTER_DEADLINE' ? 'var(--danger-bg)' : 'var(--warning-bg)',
                        color: asg.latePolicy === 'BLOCK_AFTER_DEADLINE' ? 'var(--danger-text)' : 'var(--warning-text)',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '6px',
                      }}>
                        {asg.latePolicy === 'BLOCK_AFTER_DEADLINE' ? 'No Late Submissions' : 'Accepts Late (Flagged)'}
                      </span>

                      {!isFaculty && studentSubmitted && (
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: mySub.marksPublished ? 'var(--success-soft)' : 'var(--info-bg)',
                          color: mySub.marksPublished ? 'var(--success)' : 'var(--info-text)',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                        }}>
                          {mySub.marksPublished ? `Graded: ${mySub.marks}/${asg.maxMarks}` : 'Submitted for Grading'}
                        </span>
                      )}
                    </div>

                    <h3 className="font-display" style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--ink)', marginBottom: '0.5rem' }}>
                      {asg.title}
                    </h3>

                    {asg.instructions && (
                      <p style={{ color: 'var(--ink-secondary)', fontSize: '0.92rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: '1rem' }}>
                        {asg.instructions}
                      </p>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '0.84rem', color: 'var(--ink-muted)', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Clock size={15} color={isDuePassed ? 'var(--danger-text)' : 'var(--primary)'} />
                        <span>Deadline: <strong style={{ color: isDuePassed ? 'var(--danger-text)' : 'var(--ink)' }}>{formatDueDate(asg.dueDate)}</strong></span>
                      </div>

                      {isFaculty && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Users size={15} />
                          <span>Submissions: <strong>{asg.submissionCount || 0}</strong> / {asg.totalStudents || 0} students</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Area */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '180px' }}>
                    {isFaculty ? (
                      <>
                        <button
                          onClick={() => handleOpenSubmissionsDesk(asg)}
                          className="btn-primary"
                          style={{ minHeight: '40px', fontSize: '0.88rem', padding: '0 1rem' }}
                        >
                          <span>Review Submissions ({asg.submissionCount || 0})</span>
                        </button>

                        {batches && batches.length > 1 && (
                          <button
                            onClick={() => handleOpenCloneModal(asg)}
                            className="btn-outline"
                            style={{ minHeight: '38px', fontSize: '0.84rem', padding: '0 0.85rem' }}
                          >
                            <span>Clone to Batch</span>
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleOpenSubmitModal(asg)}
                          disabled={isDuePassed && asg.latePolicy === 'BLOCK_AFTER_DEADLINE'}
                          className="btn-primary"
                          style={{ minHeight: '40px', fontSize: '0.88rem', padding: '0 1.25rem' }}
                        >
                          <Send size={15} />
                          <span>{studentSubmitted ? 'Resubmit Solution' : 'Submit Solution'}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Student Submission Feedback Banner (Private to Student) */}
                {!isFaculty && studentSubmitted && (
                  <div style={{
                    marginTop: '1.25rem',
                    padding: '1.15rem',
                    borderRadius: '12px',
                    backgroundColor: 'var(--canvas)',
                    border: '1px solid var(--border)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Award size={18} color="var(--primary)" />
                        <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--ink)' }}>
                          Submission Status & Digital Receipt
                        </span>
                      </div>
                      <span style={{ fontFamily: 'var(--font-code)', fontSize: '0.78rem', color: 'var(--primary-dark)', fontWeight: 700 }}>
                        {mySub.receiptToken}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', marginBottom: '0.75rem' }}>
                      Submitted at {new Date(mySub.submittedAt).toLocaleString()} {mySub.late ? '(Marked Late)' : '(On Time)'} • Version {mySub.version}
                    </div>

                    {mySub.marksPublished ? (
                      <div style={{ padding: '0.85rem', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', fontWeight: 600 }}>Your Private Score:</span>
                          <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-dark)', fontFamily: 'var(--font-code)' }}>
                            {mySub.marks} / {asg.maxMarks}
                          </span>
                        </div>
                        {mySub.feedback && (
                          <div style={{ fontSize: '0.88rem', color: 'var(--ink)', marginTop: '0.35rem', fontStyle: 'italic' }}>
                            "{mySub.feedback}"
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.84rem', color: 'var(--ink-muted)', fontStyle: 'italic' }}>
                        Your work is safely recorded. Grades and private feedback will appear here once released by the instructor.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Create Assignment */}
      {isCreateModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}>
          <div className="rounded-card-1" style={{
            backgroundColor: '#FFFFFF',
            width: '100%',
            maxWidth: '560px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-modal)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 className="font-display" style={{ fontSize: '1.35rem', fontWeight: 700 }}>
                Create New Assignment
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="var(--ink-muted)" />
              </button>
            </div>

            <form onSubmit={handleCreateAssignment}>
              <div style={{ marginBottom: '1.15rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Assignment Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Assignment 2: Normalization & Indexing"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-input)',
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.15rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Instructions / Problem Description
                </label>
                <textarea
                  rows={4}
                  placeholder="Specify problem statements, submission requirements, and expected schema design..."
                  value={newInstructions}
                  onChange={(e) => setNewInstructions(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-input)',
                    fontSize: '0.9rem',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.15rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Due Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-input)',
                      fontSize: '0.88rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Maximum Marks
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={newMaxMarks}
                    onChange={(e) => setNewMaxMarks(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-input)',
                      fontSize: '0.88rem',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Late Submission Policy
                </label>
                <select
                  value={newLatePolicy}
                  onChange={(e) => setNewLatePolicy(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-input)',
                    fontSize: '0.9rem',
                  }}
                >
                  <option value="BLOCK_AFTER_DEADLINE">Block Submissions After Deadline</option>
                  <option value="ACCEPT_MARK_LATE">Accept and Mark as "Late"</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="btn-outline"
                  style={{ minHeight: '40px', padding: '0 1.25rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-primary"
                  style={{ minHeight: '40px', padding: '0 1.5rem' }}
                >
                  {creating ? 'Publishing...' : 'Publish Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Student Submit Solution */}
      {isSubmitModalOpen && activeAssignment && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}>
          <div className="rounded-card-1" style={{
            backgroundColor: '#FFFFFF',
            width: '100%',
            maxWidth: '560px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-modal)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 className="font-display" style={{ fontSize: '1.35rem', fontWeight: 700 }}>
                  Submit Assignment
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>
                  {activeAssignment.title}
                </p>
              </div>
              <button onClick={() => setIsSubmitModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="var(--ink-muted)" />
              </button>
            </div>

            <form onSubmit={handleSubmitAssignment}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Written Solution / Notes (Optional)
                </label>
                <textarea
                  rows={4}
                  placeholder="Paste solution text, repository link, or notes for the faculty..."
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-input)',
                    fontSize: '0.9rem',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Upload Solution Files (PDF, Images, ZIP, DOCX)
                </label>
                <input
                  type="file"
                  multiple
                  onChange={(e) => setSubmissionFiles(Array.from(e.target.files))}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px dashed var(--border-dashed)',
                    fontSize: '0.85rem',
                    backgroundColor: 'var(--surface-alt)',
                  }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', marginTop: '0.35rem', display: 'block' }}>
                  Max 25 MB per file. A digital confirmation receipt with server timestamp will be issued upon upload.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="btn-outline"
                  style={{ minHeight: '40px', padding: '0 1.25rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary"
                  style={{ minHeight: '40px', padding: '0 1.5rem' }}
                >
                  {submitting ? 'Submitting & Generating Receipt...' : 'Confirm Submission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Digital Confirmation Receipt */}
      {digitalReceipt && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '1rem',
        }}>
          <div className="rounded-card-1" style={{
            backgroundColor: '#FFFFFF',
            width: '100%',
            maxWidth: '500px',
            padding: '2rem',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-modal)',
            textAlign: 'center',
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: 'var(--success-soft)',
              color: 'var(--success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
            }}>
              <CheckCircle2 size={32} />
            </div>

            <h3 className="font-display" style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--ink)', marginBottom: '0.35rem' }}>
              Submission Confirmed
            </h3>
            <p style={{ color: 'var(--ink-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Your coursework was received by the server. Keep this digital receipt for verification.
            </p>

            <div style={{
              backgroundColor: 'var(--canvas)',
              border: '1px dashed var(--border-dashed)',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              textAlign: 'left',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--ink-muted)', textTransform: 'uppercase' }}>
                  Digital Receipt Token
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(digitalReceipt.receiptToken);
                    setCopiedReceipt(true);
                    setTimeout(() => setCopiedReceipt(false), 2000);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.2rem',
                  }}
                >
                  {copiedReceipt ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedReceipt ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div style={{ fontFamily: 'var(--font-code)', fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-dark)', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                {digitalReceipt.receiptToken}
              </div>

              <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div>Timestamp: <strong>{new Date(digitalReceipt.submittedAt).toLocaleString()}</strong></div>
                <div>Status: <strong style={{ color: digitalReceipt.late ? 'var(--warning-text)' : 'var(--success)' }}>{digitalReceipt.late ? 'Late Submission' : 'On-Time Submission'}</strong></div>
                <div>Version: <strong>v{digitalReceipt.version}</strong></div>
              </div>
            </div>

            <button
              onClick={() => setDigitalReceipt(null)}
              className="btn-primary"
              style={{ width: '100%', minHeight: '42px' }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* MODAL 4: Faculty Submissions Review Desk */}
      {isSubmissionsDeskOpen && activeAssignment && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1.5rem',
        }}>
          <div className="rounded-card-1" style={{
            backgroundColor: '#FFFFFF',
            width: '100%',
            maxWidth: '1000px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-modal)',
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              padding: '1.5rem 2rem',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span className="badge-chip">Grading Desk</span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--ink-muted)' }}>Max: {activeAssignment.maxMarks} marks</span>
                </div>
                <h3 className="font-display" style={{ fontSize: '1.4rem', fontWeight: 800 }}>
                  {activeAssignment.title}
                </h3>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  onClick={handlePublishGrades}
                  disabled={publishing}
                  className="btn-primary"
                  style={{ minHeight: '40px', padding: '0 1.25rem', fontSize: '0.88rem' }}
                >
                  <Award size={16} />
                  <span>{publishing ? 'Publishing...' : 'Publish All Grades'}</span>
                </button>

                <button onClick={() => setIsSubmissionsDeskOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={22} color="var(--ink-muted)" />
                </button>
              </div>
            </div>

            {/* Submissions Content Table */}
            <div style={{ padding: '1.5rem 2rem', overflowY: 'auto', flex: 1 }}>
              {loadingSubmissions ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--ink-muted)' }}>
                  Loading submissions...
                </div>
              ) : submissionsList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--ink-muted)' }}>
                  No submissions received yet for this assignment.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {submissionsList.map((sub) => (
                    <div
                      key={sub.id}
                      style={{
                        padding: '1.25rem',
                        borderRadius: '12px',
                        backgroundColor: 'var(--canvas)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <div>
                          <strong style={{ fontSize: '1rem', color: 'var(--ink)' }}>{sub.studentName}</strong>
                          <span style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', marginLeft: '0.5rem' }}>({sub.studentEmail})</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            backgroundColor: sub.late ? 'var(--warning-bg)' : 'var(--success-soft)',
                            color: sub.late ? 'var(--warning-text)' : 'var(--success)',
                          }}>
                            {sub.late ? 'Late' : 'On-Time'}
                          </span>

                          <span style={{ fontFamily: 'var(--font-code)', fontSize: '0.72rem', color: 'var(--ink-muted)' }}>
                            {sub.receiptToken}
                          </span>
                        </div>
                      </div>

                      {/* Text content if present */}
                      {sub.textContent && (
                        <div style={{
                          backgroundColor: '#FFFFFF',
                          padding: '0.75rem',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          fontSize: '0.86rem',
                          marginBottom: '0.75rem',
                          color: 'var(--ink-secondary)',
                          whiteSpace: 'pre-wrap',
                        }}>
                          {sub.textContent}
                        </div>
                      )}

                      {/* Attachments if present */}
                      {sub.attachments && sub.attachments.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.85rem' }}>
                          {sub.attachments.map(att => (
                            <a
                              key={att.id}
                              href={`http://localhost:8081${att.fileUrl}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.35rem 0.65rem',
                                borderRadius: '6px',
                                backgroundColor: '#FFFFFF',
                                border: '1px solid var(--border)',
                                fontSize: '0.8rem',
                                color: 'var(--primary)',
                                textDecoration: 'none',
                                fontWeight: 600,
                              }}
                            >
                              <FileText size={14} />
                              <span>{att.fileName}</span>
                              <Download size={13} />
                            </a>
                          ))}
                        </div>
                      )}

                      {/* Grading Input Row */}
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: '0.75rem',
                        paddingTop: '0.75rem',
                        borderTop: '1px solid rgba(0,0,0,0.06)',
                      }}>
                        <div style={{ width: '130px' }}>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max={activeAssignment.maxMarks}
                            placeholder={`Marks (/${activeAssignment.maxMarks})`}
                            value={gradingMarks[sub.id] !== undefined ? gradingMarks[sub.id] : ''}
                            onChange={(e) => setGradingMarks({ ...gradingMarks, [sub.id]: e.target.value })}
                            style={{
                              width: '100%',
                              padding: '0.45rem 0.65rem',
                              borderRadius: '6px',
                              border: '1px solid var(--border-input)',
                              fontSize: '0.85rem',
                              fontFamily: 'var(--font-code)',
                              fontWeight: 700,
                            }}
                          />
                        </div>

                        <div style={{ flex: 1, minWidth: '220px' }}>
                          <input
                            type="text"
                            placeholder="Private feedback to student..."
                            value={gradingFeedback[sub.id] || ''}
                            onChange={(e) => setGradingFeedback({ ...gradingFeedback, [sub.id]: e.target.value })}
                            style={{
                              width: '100%',
                              padding: '0.45rem 0.65rem',
                              borderRadius: '6px',
                              border: '1px solid var(--border-input)',
                              fontSize: '0.85rem',
                            }}
                          />
                        </div>

                        <button
                          onClick={() => handleSaveGrade(sub.id)}
                          disabled={savingGradeId === sub.id}
                          className="btn-outline"
                          style={{ minHeight: '34px', fontSize: '0.8rem', padding: '0 0.85rem' }}
                        >
                          {savingGradeId === sub.id ? 'Saving...' : 'Save Grade'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Clone Assignment into Another Batch */}
      {isCloneModalOpen && activeAssignment && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}>
          <div className="rounded-card-1" style={{
            backgroundColor: '#FFFFFF',
            width: '100%',
            maxWidth: '480px',
            padding: '2rem',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-modal)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 className="font-display" style={{ fontSize: '1.35rem', fontWeight: 700 }}>
                Clone Assignment to Batch
              </h3>
              <button onClick={() => setIsCloneModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="var(--ink-muted)" />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', marginBottom: '1.25rem' }}>
              Clone <strong>"{activeAssignment.title}"</strong> into another cohort batch with a shifted deadline.
            </p>

            <form onSubmit={handleCloneAssignment}>
              <div style={{ marginBottom: '1.15rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Target Batch *
                </label>
                <select
                  required
                  value={targetBatchId}
                  onChange={(e) => setTargetBatchId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-input)',
                    fontSize: '0.9rem',
                  }}
                >
                  <option value="">Select Target Batch</option>
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.term || 'Active'})</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Shifted Due Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={cloneDueDate}
                  onChange={(e) => setCloneDueDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-input)',
                    fontSize: '0.88rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsCloneModalOpen(false)}
                  className="btn-outline"
                  style={{ minHeight: '40px', padding: '0 1.25rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={cloning}
                  className="btn-primary"
                  style={{ minHeight: '40px', padding: '0 1.5rem' }}
                >
                  {cloning ? 'Cloning...' : 'Confirm Clone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
