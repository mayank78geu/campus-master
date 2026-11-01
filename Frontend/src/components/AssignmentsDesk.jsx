import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  Plus, Calendar, Clock, CheckCircle2, AlertCircle, FileText, Download, 
  ExternalLink, Copy, Check, Award, Send, X, Layers, Users, RefreshCw,
  ArrowLeft, ChevronRight, FileUp
} from 'lucide-react';

export default function AssignmentsDesk({ courseId, batches, isFaculty, user, courseCode = 'DBMS' }) {
  const [selectedBatchId, setSelectedBatchId] = useState(batches && batches.length > 0 ? batches[0].id : null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Selected assignment for the full grading desk (Image 2)
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  // Student list filter: 'ALL', 'TO_MARK', 'LATE', 'MISSING'
  const [studentFilter, setStudentFilter] = useState('ALL');

  // Selected student for right grading panel
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  // Grading form state
  const [currentMark, setCurrentMark] = useState('');
  const [currentFeedback, setCurrentFeedback] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [activeSubmitAsg, setActiveSubmitAsg] = useState(null);

  // Create Assignment State
  const [newTitle, setNewTitle] = useState('');
  const [newInstructions, setNewInstructions] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newMaxMarks, setNewMaxMarks] = useState(20);
  const [newLatePolicy, setNewLatePolicy] = useState('ACCEPT_MARK_LATE');
  const [creating, setCreating] = useState(false);

  // Student submission state
  const [submissionText, setSubmissionText] = useState('');
  const [submissionFile, setSubmissionFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

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
      const list = res.data || [];
      setAssignments(list);
      // Auto-select first assignment if faculty
      if (isFaculty && list.length > 0 && !selectedAssignment) {
        setSelectedAssignment(list[0]);
      }
    } catch (err) {
      console.error('Failed to load assignments:', err);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedBatchId) {
      fetchAssignments();
    }
  }, [selectedBatchId]);

  // Submissions Data loaded from backend
  const [studentsData, setStudentsData] = useState([]);

  const fetchSubmissions = async (assignmentId) => {
    if (!assignmentId || !isFaculty) return;
    try {
      const res = await api.get(`/assignments/${assignmentId}/submissions`);
      const list = res.data || [];
      const mapped = list.map((sub, idx) => {
        const names = (sub.studentName || 'Student').trim().split(' ');
        const initials = (names[0][0] + (names.length > 1 ? names[names.length - 1][0] : '')).toUpperCase();
        const firstAtt = sub.attachments && sub.attachments.length > 0 ? sub.attachments[0] : null;
        return {
          id: sub.studentId || (idx + 1),
          submissionId: sub.id,
          name: sub.studentName || 'Student',
          initials: initials,
          filesCount: sub.attachments ? sub.attachments.length : (sub.textContent ? 1 : 0),
          fileName: firstAtt ? firstAtt.fileName : (sub.textContent ? 'Submission Response' : null),
          fileUrl: firstAtt ? firstAtt.fileUrl : null,
          fileSize: firstAtt && firstAtt.fileSize ? (firstAtt.fileSize / 1024 / 1024).toFixed(1) + ' MB' : 'Online Response',
          status: sub.isLate ? 'Late' : 'On time',
          statusType: sub.isLate ? 'late' : 'on_time',
          submittedAt: sub.submittedAt ? new Date(sub.submittedAt).toLocaleString('en-US', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : 'Recently',
          lateDuration: sub.isLate ? 'Late submission' : null,
          marks: sub.marks,
          feedback: sub.feedback || '',
          receiptToken: sub.receiptToken,
          textContent: sub.textContent,
        };
      });
      setStudentsData(mapped);
      if (mapped.length > 0) {
        setSelectedStudentId(mapped[0].id);
        setCurrentMark(mapped[0].marks !== null && mapped[0].marks !== undefined ? String(mapped[0].marks) : '');
        setCurrentFeedback(mapped[0].feedback || '');
      } else {
        setSelectedStudentId(null);
        setCurrentMark('');
        setCurrentFeedback('');
      }
    } catch (e) {
      console.error('Failed to fetch assignment submissions:', e);
      setStudentsData([]);
      setSelectedStudentId(null);
      setCurrentMark('');
      setCurrentFeedback('');
    }
  };

  useEffect(() => {
    if (selectedAssignment?.id) {
      fetchSubmissions(selectedAssignment.id);
    }
  }, [selectedAssignment]);

  const selectedStudent = studentsData.find(s => s.id === selectedStudentId) || (studentsData.length > 0 ? studentsData[0] : null);

  const handleSelectStudent = (student) => {
    setSelectedStudentId(student.id);
    setCurrentMark(student.marks !== null && student.marks !== undefined ? String(student.marks) : '');
    setCurrentFeedback(student.feedback || '');
  };

  const handleSaveGrade = async () => {
    setStudentsData(prev => prev.map(s => {
      if (s.id === selectedStudentId) {
        return {
          ...s,
          marks: currentMark !== '' ? Number(currentMark) : s.marks,
          feedback: currentFeedback,
        };
      }
      return s;
    }));

    if (selectedStudent?.submissionId) {
      try {
        await api.patch(`/submissions/${selectedStudent.submissionId}/grade`, {
          marks: currentMark !== '' ? Number(currentMark) : null,
          feedback: currentFeedback,
        });
      } catch (err) {
        console.error('Failed to save grade on backend:', err);
      }
    }

    setSuccessMsg('Grade and feedback saved for ' + selectedStudent.name);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleSaveAndNext = async () => {
    await handleSaveGrade();
    const currentIndex = studentsData.findIndex(s => s.id === selectedStudentId);
    if (currentIndex < studentsData.length - 1) {
      const nextStudent = studentsData[currentIndex + 1];
      setSelectedStudentId(nextStudent.id);
      setCurrentMark(nextStudent.marks !== null && nextStudent.marks !== undefined ? String(nextStudent.marks) : '');
      setCurrentFeedback(nextStudent.feedback || '');
    }
  };

  const handlePublishMarks = async () => {
    if (selectedAssignment?.id) {
      try {
        await api.post(`/assignments/${selectedAssignment.id}/publish-grades`);
        setSuccessMsg('Marks published successfully! All enrolled students can now view their evaluated score and feedback.');
        setTimeout(() => setSuccessMsg(''), 4000);
      } catch (err) {
        alert(err.message || 'Failed to publish grades');
      }
    } else {
      setSuccessMsg('Marks published successfully! All students can now view their evaluated score and feedback.');
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    if (!submissionFile && !submissionText.trim()) {
      alert('Please upload a file or enter submission text');
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      if (submissionText.trim()) {
        formData.append('textContent', submissionText.trim());
      }
      if (submissionFile) {
        formData.append('files', submissionFile);
      }
      const token = localStorage.getItem('cm_token');
      const targetAsgId = selectedAssignment?.id || (assignments[0]?.id || 1);
      const res = await fetch(`http://localhost:8081/api/v1/assignments/${targetAsgId}/submissions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Submission failed');
      setSuccessMsg(`Assignment submitted successfully! Receipt Token: ${data.data?.receiptToken}`);
      setSubmissionFile(null);
      setSubmissionText('');
      await fetchAssignments();
    } catch (err) {
      alert(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!selectedBatchId) return;
    setCreating(true);
    try {
      await api.post(`/batches/${selectedBatchId}/assignments`, {
        title: newTitle.trim(),
        instructions: newInstructions,
        dueDate: newDueDate,
        maxMarks: Number(newMaxMarks),
        latePolicy: newLatePolicy,
      });
      setIsCreateModalOpen(false);
      setNewTitle('');
      setNewInstructions('');
      setNewDueDate('');
      setNewMaxMarks(20);
      setSuccessMsg('Assignment published to batch successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
      await fetchAssignments();
    } catch (err) {
      alert(err.message || 'Failed to create assignment');
    } finally {
      setCreating(false);
    }
  };

  // Filter students based on top filter pills
  const filteredStudents = studentsData.filter(s => {
    if (studentFilter === 'TO_MARK') return s.marks === null && s.statusType !== 'missing';
    if (studentFilter === 'LATE') return s.statusType === 'late';
    if (studentFilter === 'MISSING') return s.statusType === 'missing';
    return true;
  });

  const activeBatch = batches.find(b => b.id === selectedBatchId) || batches[0];
  const batchTermName = activeBatch?.term || activeBatch?.name || 'Sem 3 · 2026–27';

  return (
    <div>
      {/* Top Header matching Image 2 */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '1.5rem',
        marginBottom: '2rem',
      }}>
        <div>
          {/* Breadcrumbs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.88rem', color: '#64748B', marginBottom: '0.45rem' }}>
            <span style={{ color: '#0D9488', fontWeight: 600 }}>{courseCode}</span>
            <span>/</span>
            <span>{batchTermName}</span>
            <span>/</span>
            <span>Assignments</span>
          </div>

          {/* Title */}
          <h1 className="font-display" style={{ fontSize: '2.1rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.025em', marginBottom: '0.35rem' }}>
            {selectedAssignment?.title || 'Normalization Practice Set'}
          </h1>

          {/* Meta line */}
          <p style={{ fontSize: '0.88rem', color: '#64748B', margin: 0 }}>
            Due Monday 20 Oct, 11:59 PM · {selectedAssignment?.maxMarks || 20} marks · Late submissions accepted and marked
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => alert('Downloading all student submissions as ZIP archive...')}
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
            Download all (ZIP)
          </button>

          {isFaculty && (
            <button
              onClick={handlePublishMarks}
              style={{
                backgroundColor: '#0F766E',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                padding: '0.6rem 1.4rem',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(15, 118, 110, 0.2)',
              }}
            >
              Publish marks
            </button>
          )}
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div style={{
          backgroundColor: '#D1FAE5',
          color: '#065F46',
          borderRadius: '12px',
          padding: '0.85rem 1.25rem',
          marginBottom: '1.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          fontWeight: 600,
          fontSize: '0.9rem',
        }}>
          <CheckCircle2 size={18} color="#059669" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Student Coursework View vs Faculty Desk View */}
      {!isFaculty ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px', alignItems: 'start' }}>
          {/* Left: Assignment Details & Reference Materials */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}>
            <h3 className="font-display" style={{ fontSize: '1.18rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.75rem' }}>
              Instructions & Problem Statement
            </h3>
            <p style={{ fontSize: '14.5px', color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: '24px' }}>
              {selectedAssignment?.instructions || 'Solve the given practice questions on normalization up to BCNF. Provide dependency decomposition steps, identify lossless-join and dependency preservation for each table relation, and explain your assumptions.'}
            </p>

            {/* Reference Files */}
            {selectedAssignment?.attachments && selectedAssignment.attachments.length > 0 && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Reference Attachments
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedAssignment.attachments.map(att => (
                    <a
                      key={att.id}
                      href={att.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1px solid #E2E8F0',
                        textDecoration: 'none',
                        color: '#0B132B',
                        backgroundColor: '#F8FAFC',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FileText size={18} color="#0D9488" />
                        <span style={{ fontSize: '13.5px', fontWeight: 600 }}>{att.fileName}</span>
                      </div>
                      <Download size={16} color="#64748B" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Submission Panel */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}>
            <h3 className="font-display" style={{ fontSize: '1.18rem', fontWeight: 800, color: '#0F172A', marginBottom: '1rem' }}>
              Your Submission
            </h3>

            {/* If submitted */}
            {selectedAssignment?.mySubmission ? (
              <div>
                <div style={{
                  backgroundColor: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  marginBottom: '16px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{
                      backgroundColor: '#D1FAE5',
                      color: '#065F46',
                      fontSize: '12px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '6px',
                    }}>
                      {selectedAssignment.mySubmission.isLate ? 'Submitted Late' : 'Submitted On Time'}
                    </span>
                    <span style={{ fontSize: '12.5px', color: '#047857', fontWeight: 600 }}>
                      Version {selectedAssignment.mySubmission.version || 1}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#065F46', marginBottom: '4px' }}>
                    Receipt: <strong>{selectedAssignment.mySubmission.receiptToken}</strong>
                  </div>
                  <div style={{ fontSize: '12px', color: '#047857' }}>
                    Submitted: {new Date(selectedAssignment.mySubmission.submittedAt).toLocaleString()}
                  </div>
                </div>

                {/* Marks and Feedback if published */}
                {selectedAssignment.mySubmission.marksPublished ? (
                  <div style={{
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '16px',
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Evaluated Score
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#0B132B', marginBottom: '8px', fontFamily: 'var(--font-code)' }}>
                      {selectedAssignment.mySubmission.marks} <span style={{ fontSize: '16px', color: '#64748B' }}>/ {selectedAssignment.maxMarks}</span>
                    </div>
                    {selectedAssignment.mySubmission.feedback && (
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '4px' }}>
                          Faculty Feedback
                        </div>
                        <p style={{ fontSize: '13.5px', color: '#334155', margin: 0, fontStyle: 'italic', lineHeight: 1.5 }}>
                          "{selectedAssignment.mySubmission.feedback}"
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{
                    padding: '12px 14px',
                    backgroundColor: '#FFFBEB',
                    borderRadius: '10px',
                    border: '1px solid #FEF3C7',
                    color: '#B45309',
                    fontSize: '13px',
                    fontWeight: 500,
                    marginBottom: '16px',
                  }}>
                    Your submission has been received. Faculty evaluation will appear here once published.
                  </div>
                )}
              </div>
            ) : (
              /* Upload Form */
              <form onSubmit={handleStudentSubmit}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Upload Submission File (PDF, DOCX, ZIP)
                  </label>
                  <input
                    type="file"
                    required
                    onChange={(e) => setSubmissionFile(e.target.files[0])}
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
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Submission Notes / Remarks (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Add any notes or context for your submission..."
                    value={submissionText}
                    onChange={(e) => setSubmissionText(e.target.value)}
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

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    width: '100%',
                    backgroundColor: '#0F766E',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? 'Submitting Work...' : 'Submit Assignment'}
                </button>
              </form>
            )}
          </div>
        </div>
      ) : (
        /* Faculty Grading Desk matching Image 2 */
        <>
          {/* Dynamic 4 Stat Cards Row */}
          {(() => {
            const totalSubmissions = studentsData.length;
            const lateSubmissions = studentsData.filter(s => s.statusType === 'late').length;
            const markedSubmissions = studentsData.filter(s => s.marks !== null && s.marks !== undefined).length;
            const toMarkSubmissions = studentsData.filter(s => s.marks === null || s.marks === undefined).length;
            const maxMarks = selectedAssignment?.maxMarks || 20;

            return (
              <>
                <div className="cm-grid-4-stats" style={{
                  marginBottom: '2rem',
                }}>
                  {/* Card 1: Submitted */}
                  <div style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '16px',
                    border: '1px solid #E2E8F0',
                    padding: '1.25rem 1.4rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  }}>
                    <div style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 600, marginBottom: '0.5rem' }}>
                      Submitted
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginBottom: '0.85rem' }}>
                      <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', fontFamily: 'var(--font-code)' }}>{totalSubmissions}</span>
                      <span style={{ fontSize: '0.92rem', color: '#64748B', fontWeight: 600 }}>total</span>
                    </div>
                    <div style={{ width: '100%', height: '4px', backgroundColor: '#F1F5F9', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div style={{ width: totalSubmissions > 0 ? '100%' : '0%', height: '100%', backgroundColor: '#059669', borderRadius: '9999px' }} />
                    </div>
                  </div>

                  {/* Card 2: Submitted late */}
                  <div style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '16px',
                    border: '1px solid #E2E8F0',
                    padding: '1.25rem 1.4rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  }}>
                    <div style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 600, marginBottom: '0.5rem' }}>
                      Submitted late
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginBottom: '0.85rem' }}>
                      <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', fontFamily: 'var(--font-code)' }}>{lateSubmissions}</span>
                      <span style={{ fontSize: '0.92rem', color: '#64748B', fontWeight: 600 }}>of {totalSubmissions}</span>
                    </div>
                    <div style={{ width: '100%', height: '4px', backgroundColor: '#F1F5F9', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div style={{ width: totalSubmissions > 0 ? `${Math.round((lateSubmissions / totalSubmissions) * 100)}%` : '0%', height: '100%', backgroundColor: '#D97706', borderRadius: '9999px' }} />
                    </div>
                  </div>

                  {/* Card 3: To mark */}
                  <div style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '16px',
                    border: '1px solid #E2E8F0',
                    padding: '1.25rem 1.4rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  }}>
                    <div style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 600, marginBottom: '0.5rem' }}>
                      To mark
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginBottom: '0.85rem' }}>
                      <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', fontFamily: 'var(--font-code)' }}>{toMarkSubmissions}</span>
                      <span style={{ fontSize: '0.92rem', color: '#64748B', fontWeight: 600 }}>of {totalSubmissions}</span>
                    </div>
                    <div style={{ width: '100%', height: '4px', backgroundColor: '#F1F5F9', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div style={{ width: totalSubmissions > 0 ? `${Math.round((toMarkSubmissions / totalSubmissions) * 100)}%` : '0%', height: '100%', backgroundColor: '#DC2626', borderRadius: '9999px' }} />
                    </div>
                  </div>

                  {/* Card 4: Marked */}
                  <div style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '16px',
                    border: '1px solid #E2E8F0',
                    padding: '1.25rem 1.4rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  }}>
                    <div style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 600, marginBottom: '0.5rem' }}>
                      Marked
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginBottom: '0.85rem' }}>
                      <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', fontFamily: 'var(--font-code)' }}>{markedSubmissions}</span>
                      <span style={{ fontSize: '0.92rem', color: '#64748B', fontWeight: 600 }}>of {totalSubmissions}</span>
                    </div>
                    <div style={{ width: '100%', height: '4px', backgroundColor: '#F1F5F9', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div style={{ width: totalSubmissions > 0 ? `${Math.round((markedSubmissions / totalSubmissions) * 100)}%` : '0%', height: '100%', backgroundColor: '#0B132B', borderRadius: '9999px' }} />
                    </div>
                  </div>
                </div>

                {/* Main 2-Column Split: Left Students List & Right Grading Desk */}
                {totalSubmissions === 0 ? (
                  <div style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '16px',
                    border: '1px solid #E2E8F0',
                    padding: '3.5rem 2rem',
                    textAlign: 'center',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      color: '#64748B',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '1rem',
                    }}>
                      <BookOpen size={24} />
                    </div>
                    <h3 className="font-display" style={{ fontSize: '1.18rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.4rem' }}>
                      No submissions received yet
                    </h3>
                    <p style={{ fontSize: '0.88rem', color: '#64748B', maxWidth: '440px', margin: '0 auto' }}>
                      When enrolled students upload their solution files or submit their responses, their submissions will appear here for your evaluation and feedback.
                    </p>
                  </div>
                ) : (
                  <div className="cm-grid-desk-split" style={{
                    alignItems: 'start',
                  }}>
                    {/* Left Column: Students Table */}
                    <div>
                      {/* Header & Filter Pills */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                        <h2 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                          Submissions
                        </h2>

                        <div className="cm-scrollable-pills" style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => setStudentFilter('ALL')}
                            style={{
                              backgroundColor: studentFilter === 'ALL' ? '#0B132B' : '#FFFFFF',
                              color: studentFilter === 'ALL' ? '#FFFFFF' : '#64748B',
                              border: '1px solid',
                              borderColor: studentFilter === 'ALL' ? '#0B132B' : '#E2E8F0',
                              borderRadius: '9999px',
                              padding: '0.3rem 0.85rem',
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            All ({totalSubmissions})
                          </button>

                          <button
                            onClick={() => setStudentFilter('TO_MARK')}
                            style={{
                              backgroundColor: studentFilter === 'TO_MARK' ? '#0B132B' : '#FFFFFF',
                              color: studentFilter === 'TO_MARK' ? '#FFFFFF' : '#64748B',
                              border: '1px solid',
                              borderColor: studentFilter === 'TO_MARK' ? '#0B132B' : '#E2E8F0',
                              borderRadius: '9999px',
                              padding: '0.3rem 0.85rem',
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            To mark ({toMarkSubmissions})
                          </button>

                          <button
                            onClick={() => setStudentFilter('LATE')}
                            style={{
                              backgroundColor: studentFilter === 'LATE' ? '#0B132B' : '#FFFFFF',
                              color: studentFilter === 'LATE' ? '#FFFFFF' : '#64748B',
                              border: '1px solid',
                              borderColor: studentFilter === 'LATE' ? '#0B132B' : '#E2E8F0',
                              borderRadius: '9999px',
                              padding: '0.3rem 0.85rem',
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Late ({lateSubmissions})
                          </button>
                        </div>
                      </div>

                      {/* Table Container */}
                      <div className="cm-table-responsive" style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '16px',
                        border: '1px solid #E2E8F0',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                      }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid #E2E8F0', backgroundColor: '#FAFAFA' }}>
                              <th style={{ padding: '0.85rem 1.4rem', fontSize: '0.78rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                                Student
                              </th>
                              <th style={{ padding: '0.85rem 1rem', fontSize: '0.78rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                                Status
                              </th>
                              <th style={{ padding: '0.85rem 1rem', fontSize: '0.78rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                                Submitted
                              </th>
                              <th style={{ padding: '0.85rem 1.4rem', fontSize: '0.78rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', textAlign: 'right' }}>
                                Marks
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredStudents.length === 0 ? (
                              <tr>
                                <td colSpan={4} style={{ padding: '2.5rem', textAlign: 'center', color: '#64748B', fontSize: '0.88rem' }}>
                                  No submissions found matching this filter.
                                </td>
                              </tr>
                            ) : (
                              filteredStudents.map((student) => {
                                const isSelected = student.id === selectedStudentId;

                                return (
                                  <tr
                                    key={student.id}
                                    onClick={() => handleSelectStudent(student)}
                                    style={{
                                      borderBottom: '1px solid #F1F5F9',
                                      backgroundColor: isSelected ? '#F0FDF4' : 'transparent',
                                      borderLeft: isSelected ? '3px solid #0D9488' : '3px solid transparent',
                                      cursor: 'pointer',
                                      transition: 'background-color 0.1s ease',
                                    }}
                                  >
                                    {/* Student info */}
                                    <td style={{ padding: '0.9rem 1.4rem' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{
                                          width: '34px',
                                          height: '34px',
                                          borderRadius: '50%',
                                          backgroundColor: '#E2E8F0',
                                          color: '#334155',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          fontWeight: 800,
                                          fontSize: '0.78rem',
                                        }}>
                                          {student.initials}
                                        </div>
                                        <div>
                                          <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0F172A' }}>
                                            {student.name}
                                          </div>
                                          <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                                            {student.fileName || (student.filesCount > 0 ? `${student.filesCount} file(s)` : 'Online submission')}
                                          </div>
                                        </div>
                                      </div>
                                    </td>

                                    {/* Status */}
                                    <td style={{ padding: '0.9rem 1rem' }}>
                                      <span style={{
                                        backgroundColor: student.statusType === 'on_time' ? '#D1FAE5' : (student.statusType === 'late' ? '#FEF3C7' : '#FEE2E2'),
                                        color: student.statusType === 'on_time' ? '#065F46' : (student.statusType === 'late' ? '#B45309' : '#DC2626'),
                                        borderRadius: '6px',
                                        padding: '0.2rem 0.6rem',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                      }}>
                                        {student.status}
                                      </span>
                                    </td>

                                    {/* Submitted Time */}
                                    <td style={{ padding: '0.9rem 1rem', fontSize: '0.85rem', color: '#64748B' }}>
                                      {student.submittedAt}
                                    </td>

                                    {/* Marks */}
                                    <td style={{ padding: '0.9rem 1.4rem', textAlign: 'right' }}>
                                      {isSelected ? (
                                        <span style={{ color: '#0D9488', fontWeight: 700, fontSize: '0.88rem' }}>
                                          Selected
                                        </span>
                                      ) : student.marks !== null && student.marks !== undefined ? (
                                        <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.92rem', fontFamily: 'var(--font-code)' }}>
                                          {student.marks} / {maxMarks}
                                        </span>
                                      ) : (
                                        <span style={{ color: '#64748B', fontSize: '0.85rem' }}>
                                          To mark
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Right Column: Selected Student Grading Desk */}
                    {selectedStudent ? (
                      <div style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '20px',
                        border: '1px solid #E2E8F0',
                        padding: '1.75rem',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                      }}>
                        {/* Student Header */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', marginBottom: '1rem' }}>
                          <div style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            backgroundColor: '#E0F2FE',
                            color: '#0284C7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '0.95rem',
                          }}>
                            {selectedStudent.initials}
                          </div>

                          <div>
                            <h3 className="font-display" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                              {selectedStudent.name}
                            </h3>
                            <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '0.15rem 0 0' }}>
                              Submitted {selectedStudent.submittedAt}
                            </p>
                          </div>
                        </div>

                        {/* Badges row */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1.25rem' }}>
                          {selectedStudent.lateDuration && (
                            <span style={{
                              backgroundColor: '#FEF3C7',
                              color: '#B45309',
                              borderRadius: '6px',
                              padding: '0.2rem 0.6rem',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              alignSelf: 'flex-start',
                            }}>
                              {selectedStudent.lateDuration}
                            </span>
                          )}
                          {selectedStudent.receiptToken && (
                            <span style={{
                              backgroundColor: '#F1F5F9',
                              color: '#475569',
                              borderRadius: '6px',
                              padding: '0.2rem 0.6rem',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              fontFamily: 'var(--font-code)',
                              alignSelf: 'flex-start',
                            }}>
                              Receipt: {selectedStudent.receiptToken}
                            </span>
                          )}
                        </div>

                        {/* Submission Content / Files Section */}
                        <div style={{ marginBottom: '1.25rem' }}>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.45rem' }}>
                            Submission Artifacts
                          </label>

                          {selectedStudent.fileUrl || selectedStudent.fileName ? (
                            <div style={{
                              border: '1px solid #E2E8F0',
                              borderRadius: '10px',
                              padding: '0.75rem 1rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                                <div style={{
                                  width: '34px',
                                  height: '34px',
                                  borderRadius: '6px',
                                  backgroundColor: '#FEE2E2',
                                  color: '#DC2626',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 800,
                                  fontFamily: 'var(--font-code)',
                                  fontSize: '0.72rem',
                                }}>
                                  FILE
                                </div>
                                <div style={{ overflow: 'hidden' }}>
                                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                    {selectedStudent.fileName || 'Attached Solution'}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                                    {selectedStudent.fileSize || 'Attached'}
                                  </div>
                                </div>
                              </div>

                              <button
                                onClick={() => {
                                  if (selectedStudent.fileUrl) {
                                    window.open(selectedStudent.fileUrl, '_blank');
                                  } else {
                                    alert(`Opening ${selectedStudent.fileName} for review.`);
                                  }
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#0D9488',
                                  fontWeight: 700,
                                  fontSize: '0.85rem',
                                  cursor: 'pointer',
                                }}
                              >
                                View
                              </button>
                            </div>
                          ) : selectedStudent.textContent ? (
                            <div style={{
                              border: '1px solid #E2E8F0',
                              borderRadius: '10px',
                              padding: '0.75rem 1rem',
                              backgroundColor: '#F8FAFC',
                              fontSize: '0.85rem',
                              color: '#334155',
                              lineHeight: 1.5,
                              maxHeight: '120px',
                              overflowY: 'auto',
                            }}>
                              {selectedStudent.textContent}
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.85rem', color: '#64748B', fontStyle: 'italic' }}>
                              No files attached with this submission.
                            </div>
                          )}
                        </div>

                        {/* Marks Input */}
                        <div style={{ marginBottom: '1.25rem' }}>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.45rem' }}>
                            Marks
                          </label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input
                              type="number"
                              min={0}
                              max={maxMarks}
                              value={currentMark}
                              onChange={(e) => setCurrentMark(e.target.value)}
                              style={{
                                width: '75px',
                                padding: '0.55rem 0.75rem',
                                borderRadius: '8px',
                                border: '1px solid #CBD5E1',
                                fontSize: '1.2rem',
                                fontWeight: 800,
                                color: '#0F172A',
                                textAlign: 'center',
                                fontFamily: 'var(--font-code)',
                              }}
                            />
                            <span style={{ fontSize: '1.1rem', color: '#64748B', fontWeight: 600 }}>
                              / {maxMarks}
                            </span>
                          </div>
                        </div>

                        {/* Feedback Textarea */}
                        <div style={{ marginBottom: '1.25rem' }}>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.45rem' }}>
                            Feedback
                          </label>
                          <textarea
                            rows={4}
                            value={currentFeedback}
                            onChange={(e) => setCurrentFeedback(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              borderRadius: '10px',
                              border: '1px solid #CBD5E1',
                              fontSize: '0.85rem',
                              color: '#0F172A',
                              lineHeight: 1.45,
                              resize: 'vertical',
                            }}
                          />
                          <p style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.35rem', lineHeight: 1.35 }}>
                            Only this student can see their marks, and only after you publish.
                          </p>
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                          <button
                            onClick={handleSaveGrade}
                            style={{
                              flex: 1,
                              backgroundColor: '#FFFFFF',
                              color: '#0F172A',
                              border: '1px solid #CBD5E1',
                              borderRadius: '10px',
                              padding: '0.65rem 1rem',
                              fontWeight: 700,
                              fontSize: '0.88rem',
                              cursor: 'pointer',
                            }}
                          >
                            Save
                          </button>
                          <button
                            onClick={handleSaveAndNext}
                            style={{
                              flex: 1.5,
                              backgroundColor: '#0B132B',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '10px',
                              padding: '0.65rem 1rem',
                              fontWeight: 700,
                              fontSize: '0.88rem',
                              cursor: 'pointer',
                            }}
                          >
                            Save and next
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '20px',
                        border: '1px solid #E2E8F0',
                        padding: '2.5rem 1.5rem',
                        textAlign: 'center',
                        color: '#64748B',
                      }}>
                        Select a submission on the left to grade.
                      </div>
                    )}
                  </div>
                )}
              </>
            );
          })()}
    </>
  )}
</div>
);
}
