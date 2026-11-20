import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CourseSpacePage from '../CourseSpacePage';
import api from '../../services/api';

vi.mock('../../services/api');
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Dr. Faculty', role: 'FACULTY' },
  }),
}));

describe('CourseSpacePage Resource Modify & Delete', () => {
  const mockCourse = {
    id: 1,
    name: 'Database Management Systems',
    code: 'DBMS',
    units: [
      { id: 11, title: 'Relational Model', sortOrder: 1 },
      { id: 12, title: 'Normalization', sortOrder: 2 },
    ],
  };

  const mockBatches = [
    { id: 101, name: 'Batch A', term: 'Sem 3 · 2026–27', joinCode: 'DBMS-101' },
  ];

  const mockResources = [
    {
      id: 501,
      title: 'Normalization Lecture Slides',
      description: 'Covers 1NF, 2NF, 3NF and BCNF with examples',
      resourceType: 'FILE',
      fileName: 'normalization_slides.pdf',
      fileUrl: '/files/normalization_slides.pdf',
      currentVersion: 1,
      unitId: 12,
      isPublished: true,
      createdAt: '2026-11-19T10:00:00',
    },
    {
      id: 502,
      title: 'YouTube: SQL Joins Tutorial',
      description: 'Video explaining inner and outer joins',
      resourceType: 'URL',
      externalUrl: 'https://youtube.com/watch?v=sqljoins',
      unitId: 11,
      isPublished: true,
      createdAt: '2026-11-19T11:00:00',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url.includes('/courses/1/batches')) return Promise.resolve({ data: mockBatches });
      if (url.includes('/courses/1/resources')) return Promise.resolve({ data: mockResources });
      if (url.includes('/courses/1')) return Promise.resolve({ data: mockCourse });
      if (url.includes('/faculty/join-requests')) return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });
  });

  it('renders resources with faculty edit and delete buttons', async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/courses/1']}>
          <Routes>
            <Route path="/courses/:id" element={<CourseSpacePage />} />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(screen.getByText('Normalization Lecture Slides')).toBeInTheDocument();
    expect(screen.getByText('YouTube: SQL Joins Tutorial')).toBeInTheDocument();

    const editButtons = screen.getAllByTitle('Edit Resource');
    const deleteButtons = screen.getAllByTitle('Delete Resource');
    expect(editButtons.length).toBe(2);
    expect(deleteButtons.length).toBe(2);
  });

  it('opens edit modal with prefilled data and submits update', async () => {
    api.put.mockResolvedValueOnce({ data: { success: true } });

    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/courses/1']}>
          <Routes>
            <Route path="/courses/:id" element={<CourseSpacePage />} />
          </Routes>
        </MemoryRouter>
      );
    });

    const editButtons = screen.getAllByTitle('Edit Resource');
    await act(async () => {
      fireEvent.click(editButtons[0]);
    });

    // Check modal opened with prefilled title
    expect(screen.getByText('Edit Resource')).toBeInTheDocument();
    const titleInput = screen.getByDisplayValue('Normalization Lecture Slides');
    expect(titleInput).toBeInTheDocument();

    // Edit title
    fireEvent.change(titleInput, { target: { value: 'Advanced Normalization Slides (Updated)' } });

    // Submit form
    const saveButton = screen.getByText('Save Changes');
    await act(async () => {
      fireEvent.click(saveButton);
    });

    expect(api.put).toHaveBeenCalledWith(
      '/resources/501',
      expect.objectContaining({
        title: 'Advanced Normalization Slides (Updated)',
      })
    );
  });

  it('opens delete confirmation modal and calls delete endpoint', async () => {
    api.delete.mockResolvedValueOnce({ data: { success: true } });

    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/courses/1']}>
          <Routes>
            <Route path="/courses/:id" element={<CourseSpacePage />} />
          </Routes>
        </MemoryRouter>
      );
    });

    const deleteButtons = screen.getAllByTitle('Delete Resource');
    await act(async () => {
      fireEvent.click(deleteButtons[0]);
    });

    // Verify confirmation modal opened
    expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument();
    expect(screen.getByText('"Normalization Lecture Slides"')).toBeInTheDocument();

    // Click Delete in modal
    const confirmDeleteBtn = screen.getByText('Delete Resource', { selector: 'button[type="button"]' });
    await act(async () => {
      fireEvent.click(confirmDeleteBtn);
    });

    expect(api.delete).toHaveBeenCalledWith('/resources/501');
  });
});
