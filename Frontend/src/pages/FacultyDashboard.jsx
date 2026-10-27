import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Plus, BookOpen, Users, Layers, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';

export default function FacultyDashboard() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [program, setProgram] = useState('MCA');
  const [semester, setSemester] = useState('Semester 3');
  const [description, setDescription] = useState('');
  const [units, setUnits] = useState(['Unit 1: Introduction', 'Unit 2: Core Concepts']);
  const [creating, setCreating] = useState(false);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/courses');
      setCourses(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

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
      // Reset form
      setName('');
      setCode('');
      setDescription('');
      setUnits(['Unit 1: Introduction', 'Unit 2: Core Concepts']);
      await fetchCourses();
    } catch (err) {
      setError(err.message || 'Failed to create course');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        marginBottom: '2.5rem',
      }}>
        <div>
          <div className="badge-chip" style={{ marginBottom: '0.5rem' }}>Faculty Console</div>
          <h1 className="font-display" style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--ink)' }}>
            Course Spaces
          </h1>
          <p style={{ color: 'var(--ink-secondary)', fontSize: '0.95rem' }}>
            Permanent spaces for notes, units, and batches. Created once, reused every semester.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary"
          style={{ minHeight: '48px', padding: '0 1.5rem' }}
        >
          <Plus size={18} />
          <span>Create New Course</span>
        </button>
      </div>

      {error && (
        <div style={{
          padding: '0.75rem 1rem',
          backgroundColor: 'var(--danger-bg)',
          color: 'var(--danger-text)',
          borderRadius: '10px',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.9rem',
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Courses List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--ink-muted)' }}>
          Loading your courses...
        </div>
      ) : courses.length === 0 ? (
        <div className="rounded-card-1" style={{
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
            backgroundColor: 'var(--primary-soft)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
          }}>
            <BookOpen size={28} />
          </div>
          <h3 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            No courses created yet
          </h3>
          <p style={{ color: 'var(--ink-muted)', maxWidth: '420px', margin: '0 auto 1.5rem', fontSize: '0.95rem' }}>
            Create your first permanent course space to upload units, slides, and generate batch join codes for students.
          </p>
          <button onClick={() => setIsModalOpen(true)} className="btn-primary">
            <Plus size={18} />
            <span>Create Course Now</span>
          </button>
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
              className="rounded-card-1"
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--border)',
                padding: '1.75rem',
                boxShadow: 'var(--shadow-card)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
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
                    {course.semester || 'Current Term'}
                  </span>
                </div>

                <h3 className="font-display" style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '0.5rem', lineHeight: 1.25 }}>
                  {course.name}
                </h3>

                <p style={{
                  color: 'var(--ink-muted)',
                  fontSize: '0.88rem',
                  lineHeight: 1.5,
                  marginBottom: '1.25rem',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {course.description || 'No description provided.'}
                </p>

                <div style={{
                  display: 'flex',
                  gap: '1rem',
                  fontSize: '0.82rem',
                  color: 'var(--ink-secondary)',
                  padding: '0.75rem 0',
                  borderTop: '1px solid var(--border)',
                  borderBottom: '1px solid var(--border)',
                  marginBottom: '1.25rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Layers size={15} color="var(--primary)" />
                    <span><strong>{course.units ? course.units.length : 0}</strong> Units</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Users size={15} color="var(--info-text)" />
                    <span><strong>{course.batchesCount || 0}</strong> Batches</span>
                  </div>
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
                <span>Manage Course & Batches</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Create Course Modal */}
      {isModalOpen && (
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
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem',
            boxShadow: 'var(--shadow-elevation)',
            border: '1px solid var(--border)',
          }}>
            <h2 className="font-display" style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.35rem' }}>
              Create Permanent Course Space
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--ink-muted)', marginBottom: '1.5rem' }}>
              Define the syllabus units once. You will be able to attach batches and share join codes right after.
            </p>

            <form onSubmit={handleCreateCourse}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                    Course Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Database Management Systems"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border-input)', fontSize: '0.9rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                    Course Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="MCA-301"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border-input)', fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                    Program
                  </label>
                  <input
                    type="text"
                    placeholder="MCA / B.Tech / BCA"
                    value={program}
                    onChange={(e) => setProgram(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border-input)', fontSize: '0.9rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                    Semester
                  </label>
                  <input
                    type="text"
                    placeholder="Semester 3"
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border-input)', fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                  Description
                </label>
                <textarea
                  rows="2"
                  placeholder="Course overview and syllabus references..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border-input)', fontSize: '0.9rem', resize: 'vertical' }}
                />
              </div>

              {/* Units Builder */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                    Course Units & Topics ({units.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddUnitField}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    + Add Unit
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {units.map((unit, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        value={unit}
                        onChange={(e) => handleUnitChange(idx, e.target.value)}
                        placeholder={`Unit ${idx + 1}`}
                        style={{ flex: 1, padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-input)', fontSize: '0.85rem' }}
                      />
                      {units.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveUnitField(idx)}
                          style={{ background: 'none', border: 'none', color: 'var(--danger-text)', cursor: 'pointer', fontSize: '0.85rem' }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '9999px', padding: '0.6rem 1.25rem', fontSize: '0.88rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-primary"
                  style={{ minHeight: '44px', padding: '0 1.5rem', fontSize: '0.88rem' }}
                >
                  {creating ? 'Creating Course...' : 'Create Course Space'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
