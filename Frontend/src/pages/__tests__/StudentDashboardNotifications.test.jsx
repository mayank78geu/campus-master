import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StudentDashboard from '../StudentDashboard';
import * as AuthContextModule from '../../context/AuthContext';
import api from '../../services/api';

vi.mock('../../services/api');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams('tab=notifications'), vi.fn()],
  };
});

describe('StudentDashboard Announcement & Notification Read Status', () => {
  const mockUser = { id: 1, name: 'Alice Student', email: 'alice@test.com', role: 'STUDENT' };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: mockUser,
      logout: vi.fn(),
    });
  });

  it('normalizes read: true from backend Jackson serialization and marks announcements as Read', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/notifications') {
        return Promise.resolve({
          data: [
            {
              id: 50,
              title: 'Physics Lab Rescheduled',
              message: 'Lab will now take place in Room 402 on Wednesday.',
              eventType: 'ANNOUNCEMENT',
              priority: 'IMPORTANT',
              authorName: 'Prof. Miller',
              read: true, // Backend Jackson format without isRead
              createdAt: '2026-11-19T10:00:00',
            },
          ],
        });
      }
      if (url === '/notifications/unread-count') {
        return Promise.resolve({ data: { unreadCount: 0 } });
      }
      if (url === '/courses') return Promise.resolve({ data: [] });
      if (url === '/assignments/student/deadlines') return Promise.resolve({ data: [] });
      if (url === '/resources/recent') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: {} });
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <StudentDashboard />
        </MemoryRouter>
      );
    });

    // Unread count should be 0 because read: true is normalized
    expect(screen.getByText('Unread (0)')).toBeInTheDocument();
    expect(screen.getByText('Announcements (1)')).toBeInTheDocument();

    // The announcement should have 'Read' status badge
    expect(screen.getByText('Read')).toBeInTheDocument();
  });

  it('allows marking an unread announcement as read and triggers API patch', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/notifications') {
        return Promise.resolve({
          data: [
            {
              id: 55,
              title: 'Urgent System Maintenance',
              message: 'The lab server will be down tonight.',
              eventType: 'ANNOUNCEMENT',
              priority: 'URGENT',
              authorName: 'Prof. Davis',
              read: false,
              isRead: false,
              createdAt: '2026-11-19T10:00:00',
            },
          ],
        });
      }
      if (url === '/notifications/unread-count') {
        return Promise.resolve({ data: { unreadCount: 1 } });
      }
      if (url === '/courses') return Promise.resolve({ data: [] });
      if (url === '/assignments/student/deadlines') return Promise.resolve({ data: [] });
      if (url === '/resources/recent') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: {} });
    });

    api.patch.mockResolvedValue({ success: true });

    await act(async () => {
      render(
        <MemoryRouter>
          <StudentDashboard />
        </MemoryRouter>
      );
    });

    // Check unread count is 1
    expect(screen.getByText('Unread (1)')).toBeInTheDocument();

    // Click 'Mark read' button
    const markReadBtn = screen.getByRole('button', { name: /mark read/i });
    await act(async () => {
      fireEvent.click(markReadBtn);
    });

    // Verify PATCH was sent to mark it as read
    expect(api.patch).toHaveBeenCalledWith('/notifications/55/read');

    // After marking read, the read status badge should appear
    expect(screen.getByText('Read')).toBeInTheDocument();
  });
});
