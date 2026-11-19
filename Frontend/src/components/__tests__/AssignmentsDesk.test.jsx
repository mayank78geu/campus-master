import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import AssignmentsDesk from '../AssignmentsDesk';
import api from '../../services/api';

vi.mock('../../services/api');

describe('AssignmentsDesk Component', () => {
  const mockBatches = [
    { id: 10, name: 'Batch A', term: 'Sem 3 · 2026–27', enrolledStudentsCount: 5, activeAssignmentsCount: 0 }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders student empty state when there are no assignments in the batch', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/assignments')) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });

    await act(async () => {
      render(
        <AssignmentsDesk
          courseId={1}
          batches={mockBatches}
          isFaculty={false}
          user={{ id: 100, role: 'STUDENT', name: 'John Doe' }}
          courseCode="CS301"
        />
      );
    });

    expect(screen.getByText("Currently you don't have any assignments")).toBeInTheDocument();
  });

  it('renders faculty empty state when there are no assignments in the batch', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/assignments')) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });

    await act(async () => {
      render(
        <AssignmentsDesk
          courseId={1}
          batches={mockBatches}
          isFaculty={true}
          user={{ id: 1, role: 'FACULTY', name: 'Prof Smith' }}
          courseCode="CS301"
        />
      );
    });

    expect(screen.getByText("No assignments created in this batch yet")).toBeInTheDocument();
    expect(screen.getByText("Create First Assignment")).toBeInTheDocument();
  });

  it('renders faculty assignment desk without going blank when submissions are empty (0 submissions)', async () => {
    const mockAssignments = [
      {
        id: 50,
        title: 'Query Optimization Lab',
        instructions: 'Run EXPLAIN ANALYZE on queries',
        dueDate: '2026-11-20T23:59:00',
        maxMarks: 25,
        latePolicy: 'ACCEPT_MARK_LATE',
      }
    ];

    api.get.mockImplementation((url) => {
      if (url.includes('/assignments/50/submissions')) {
        return Promise.resolve({ data: [] });
      }
      if (url.includes('/assignments')) {
        return Promise.resolve({ data: mockAssignments });
      }
      return Promise.resolve({ data: [] });
    });

    await act(async () => {
      render(
        <AssignmentsDesk
          courseId={1}
          batches={mockBatches}
          isFaculty={true}
          user={{ id: 1, role: 'FACULTY', name: 'Prof Smith' }}
          courseCode="CS301"
        />
      );
    });

    // Verifies the page does NOT go blank and renders the title and 0 submissions empty state
    expect(screen.getAllByText('Query Optimization Lab').length).toBeGreaterThan(0);
    expect(screen.getByText('No submissions received yet')).toBeInTheDocument();
    expect(screen.getByText('Submitted')).toBeInTheDocument();
    expect(screen.getByText('Publish marks')).toBeInTheDocument();
  });

  it('renders all assignments list and allows student to view problem statement and submit form', async () => {
    const mockAssignments = [
      {
        id: 50,
        title: 'Assignment 1',
        instructions: 'Write BCNF normalization proofs',
        dueDate: '2026-11-20T23:59:00',
        maxMarks: 20,
        latePolicy: 'ACCEPT_MARK_LATE',
      },
      {
        id: 51,
        title: 'Assignment 2',
        instructions: 'Write SQL queries',
        dueDate: '2026-11-25T23:59:00',
        maxMarks: 30,
        latePolicy: 'BLOCK_AFTER_DEADLINE',
      }
    ];

    api.get.mockImplementation((url) => {
      if (url.includes('/assignments')) {
        return Promise.resolve({ data: mockAssignments });
      }
      return Promise.resolve({ data: [] });
    });

    await act(async () => {
      render(
        <AssignmentsDesk
          courseId={1}
          batches={mockBatches}
          isFaculty={false}
          user={{ id: 100, role: 'STUDENT', name: 'Student One' }}
          courseCode="CS301"
        />
      );
    });

    expect(screen.getByText('All Assignments (2):')).toBeInTheDocument();
    expect(screen.getAllByText('Assignment 1').length).toBeGreaterThan(0);
    expect(screen.getByText('Assignment 2')).toBeInTheDocument();
    expect(screen.getByText('Write BCNF normalization proofs')).toBeInTheDocument();
    expect(screen.getByText('Submit Assignment')).toBeInTheDocument();
  });
});
