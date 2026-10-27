import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  BarChart3, Download, UserPlus, Lock, Unlock, CheckCircle2, 
  AlertCircle, Users, FileCheck, Eye, Layers, X, Send
} from 'lucide-react';

export default function BatchAnalyticsDesk({ courseId, batches, onBatchStatusChanged }) {
  const [selectedBatchId, setSelectedBatchId] = useState(batches && batches.length > 0 ? batches[0].id : null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Add Students Modal
  const [isAddStudentsModalOpen, setIsAddStudentsModalOpen] = useState(false);
  const [emailsInput, setEmailsInput] = useState('');
  const [addingStudents, setAddingStudents] = useState(false);

  // Status Toggling
  const [togglingStatus, setTogglingStatus] = useState(false);

  useEffect(() => {
    if (batches && batches.length > 0 && !selectedBatchId) {
      setSelectedBatchId(batches[0].id);
    }
  }, [batches]);

  const fetchAnalytics = async () => {
    if (!selectedBatchId) return;
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/analytics/batches/${selectedBatchId}`);
      setAnalytics(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load batch analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedBatchId) {
      fetchAnalytics();
    }
  }, [selectedBatchId]);

  const handleExportGrades = async () => {
    if (!selectedBatchId) return;
    try {
      const response = await fetch(`http://localhost:8081/api/v1/batches/${selectedBatchId}/export-grades`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('cm_token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to export grades CSV');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `batch_${selectedBatchId}_grades.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || 'Error downloading grades CSV');
    }
  };

  const handleExportRoster = async () => {
    if (!selectedBatchId) return;
    try {
      const response = await fetch(`http://localhost:8081/api/v1/batches/${selectedBatchId}/export-roster`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('cm_token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to export roster CSV');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `batch_${selectedBatchId}_roster.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || 'Error downloading roster CSV');
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedBatchId) return;
    setTogglingStatus(true);
    try {
      const res = await api.patch(`/batches/${selectedBatchId}/toggle-status`);
      setSuccessMsg(`Batch status changed to ${res.data.status}`);
      if (onBatchStatusChanged) onBatchStatusChanged();
      await fetchAnalytics();
    } catch (err) {
      alert(err.message || 'Failed to toggle batch status');
    } finally {
      setTogglingStatus(false);
    }
  };

  const handleAddStudents = async (e) => {
    e.preventDefault();
    if (!selectedBatchId || !emailsInput.trim()) return;
    setAddingStudents(true);
    setError('');
    try {
      const emails = emailsInput
        .split(/[\n,]+/)
        .map(e => e.trim())
        .filter(e => e.length > 0);

      const res = await api.post(`/batches/${selectedBatchId}/students`, { emails });
      setSuccessMsg(res.message || 'Students added successfully');
      setIsAddStudentsModalOpen(false);
      setEmailsInput('');
      await fetchAnalytics();
    } catch (err) {
      setError(err.message || 'Failed to add students');
    } finally {
      setAddingStudents(false);
    }
  };

  const currentBatch = batches.find(b => b.id === selectedBatchId);
  const isClosed = currentBatch?.status === 'CLOSED';

  return (
    <div>
      {/* Header and Batch Selector */}
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
              Batch Analytics & Gradebook
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>
              Monitor coursework completion rates, on-time submissions, and download CSV gradebooks.
            </p>
          </div>

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

        {/* Quick Batch Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setIsAddStudentsModalOpen(true)}
            className="btn-outline"
            style={{ minHeight: '38px', fontSize: '0.84rem', padding: '0 0.85rem' }}
          >
            <UserPlus size={15} />
            <span>Add by Email</span>
          </button>

          <button
            onClick={handleToggleStatus}
            disabled={togglingStatus}
            className="btn-outline"
            style={{
              minHeight: '38px',
              fontSize: '0.84rem',
              padding: '0 0.85rem',
              color: isClosed ? 'var(--success)' : 'var(--danger-text)',
              borderColor: isClosed ? 'var(--success)' : 'var(--danger-bg)',
            }}
          >
            {isClosed ? <Unlock size={15} /> : <Lock size={15} />}
            <span>{isClosed ? 'Reopen Batch' : 'Close Batch'}</span>
          </button>
        </div>
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

      {/* Analytics Dashboard Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--ink-muted)' }}>
          Computing batch analytics...
        </div>
      ) : !analytics ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--ink-muted)' }}>
          No analytics available.
        </div>
      ) : (
        <div>
          {/* Top Metrics Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1.25rem',
            marginBottom: '2rem',
          }}>
            {/* Card 1: Submission Rate */}
            <div className="rounded-card-1" style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border)',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-card)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink-muted)' }}>Coursework Completion</span>
                <BarChart3 size={18} color="var(--primary)" />
              </div>
              <div style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--ink)', fontFamily: 'var(--font-code)', marginBottom: '0.5rem' }}>
                {analytics.submissionRate}%
              </div>
              <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--border)', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{ width: `${analytics.submissionRate}%`, height: '100%', backgroundColor: 'var(--primary)' }} />
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', marginTop: '0.5rem' }}>
                {analytics.totalSubmissions} submissions across {analytics.totalAssignments} assignments
              </div>
            </div>

            {/* Card 2: On-Time vs Late */}
            <div className="rounded-card-1" style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border)',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-card)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink-muted)' }}>Submission Timeliness</span>
                <FileCheck size={18} color="var(--success)" />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.65rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--success)', fontFamily: 'var(--font-code)' }}>
                  {analytics.onTimeSubmissions}
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', fontWeight: 600 }}>On-Time</span>
                <span style={{ fontSize: '1.25rem', color: 'var(--warning-text)', fontWeight: 700, fontFamily: 'var(--font-code)', marginLeft: 'auto' }}>
                  {analytics.lateSubmissions}
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', fontWeight: 600 }}>Late</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', marginTop: '0.75rem' }}>
                Timestamps verified via digital receipt tokens
              </div>
            </div>

            {/* Card 3: Active Students */}
            <div className="rounded-card-1" style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border)',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-card)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink-muted)' }}>Enrolled Cohort</span>
                <Users size={18} color="var(--primary)" />
              </div>
              <div style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--ink)', fontFamily: 'var(--font-code)', marginBottom: '0.5rem' }}>
                {analytics.activeStudents}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>
                {analytics.pendingStudents > 0 ? `${analytics.pendingStudents} requests awaiting approval` : 'All students actively enrolled'}
              </div>
            </div>

            {/* Card 4: Resource Engagement */}
            <div className="rounded-card-1" style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border)',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-card)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink-muted)' }}>Material Views</span>
                <Eye size={18} color="var(--primary)" />
              </div>
              <div style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--ink)', fontFamily: 'var(--font-code)', marginBottom: '0.5rem' }}>
                {analytics.totalResourceViews}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>
                Total views across {analytics.totalCourseResources} permanent course resources
              </div>
            </div>
          </div>

          {/* Export Center Banner */}
          <div className="rounded-card-2" style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border)',
            padding: '2rem',
            boxShadow: 'var(--shadow-card)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.5rem',
          }}>
            <div>
              <h3 className="font-display" style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--ink)', marginBottom: '0.35rem' }}>
                Official CSV Exports
              </h3>
              <p style={{ color: 'var(--ink-muted)', fontSize: '0.88rem' }}>
                Export full gradebook with assignment breakdown and verified submission status, or student roster.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                onClick={handleExportGrades}
                className="btn-primary"
                style={{ minHeight: '44px', padding: '0 1.25rem', fontSize: '0.88rem' }}
              >
                <Download size={16} />
                <span>Download Gradebook (CSV)</span>
              </button>

              <button
                onClick={handleExportRoster}
                className="btn-outline"
                style={{ minHeight: '44px', padding: '0 1.25rem', fontSize: '0.88rem' }}
              >
                <Download size={16} />
                <span>Download Roster (CSV)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Students by Email Modal */}
      {isAddStudentsModalOpen && (
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
            maxWidth: '500px',
            padding: '2rem',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-modal)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 className="font-display" style={{ fontSize: '1.35rem', fontWeight: 700 }}>
                Directly Enroll Students
              </h3>
              <button onClick={() => setIsAddStudentsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="var(--ink-muted)" />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', marginBottom: '1.25rem' }}>
              Enter student email addresses (separated by commas or new lines) to enroll them directly into this cohort.
            </p>

            <form onSubmit={handleAddStudents}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Student Email Addresses *
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder="rahul@geu.ac.in&#10;priya@geu.ac.in&#10;amit@geu.ac.in"
                  value={emailsInput}
                  onChange={(e) => setEmailsInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-input)',
                    fontSize: '0.9rem',
                    fontFamily: 'var(--font-code)',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsAddStudentsModalOpen(false)}
                  className="btn-outline"
                  style={{ minHeight: '40px', padding: '0 1.25rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingStudents}
                  className="btn-primary"
                  style={{ minHeight: '40px', padding: '0 1.5rem' }}
                >
                  {addingStudents ? 'Enrolling...' : 'Enroll Students'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
