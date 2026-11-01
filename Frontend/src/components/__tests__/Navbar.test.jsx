import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Navbar from '../Navbar';
import * as AuthContextModule from '../../context/AuthContext';
import api from '../../services/api';

vi.mock('../../services/api');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Navbar component', () => {
  const mockUser = { id: 1, name: 'Student One', email: 's1@test.com', role: 'STUDENT' };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: mockUser,
      logout: vi.fn(),
    });
  });

  it('renders brand and fetches notification counts', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/notifications/unread-count') {
        return Promise.resolve({ data: { unreadCount: 2 } });
      }
      if (url === '/notifications') {
        return Promise.resolve({
          data: [
            { id: 101, title: 'Assignment Due', message: 'Submit lab 1', isRead: false, read: false, targetUrl: '/courses/1?tab=assignments' },
            { id: 102, title: 'Announcement', message: 'Class cancelled', isRead: false, read: false, targetUrl: '/courses/1' },
          ],
        });
      }
      return Promise.resolve({ data: {} });
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <Navbar onOpenAuth={vi.fn()} />
        </MemoryRouter>
      );
    });

    // Unread count badge '2' is rendered
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('toggles notification dropdown and handles click-to-read with navigation', async () => {
    const notifications = [
      { id: 201, title: 'Grades Published', message: 'Assignment graded', isRead: false, read: false, targetUrl: '/courses/5?batch=12&tab=assignments' },
    ];

    api.get.mockImplementation((url) => {
      if (url === '/notifications/unread-count') {
        return Promise.resolve({ data: { unreadCount: 1 } });
      }
      if (url === '/notifications') {
        return Promise.resolve({ data: notifications });
      }
      return Promise.resolve({ data: {} });
    });
    api.patch.mockResolvedValue({ data: {} });

    await act(async () => {
      render(
        <MemoryRouter>
          <Navbar onOpenAuth={vi.fn()} />
        </MemoryRouter>
      );
    });

    const bellBtn = screen.getByTitle('Notifications');

    // Click bell to open dropdown
    await act(async () => {
      bellBtn.click();
    });

    expect(screen.getByText('Grades Published')).toBeInTheDocument();

    // Click on notification
    const notifItem = screen.getByText('Grades Published').closest('div');
    await act(async () => {
      notifItem.click();
    });

    // Expect PATCH call to mark as read
    expect(api.patch).toHaveBeenCalledWith('/notifications/201/read');
    // Expect navigation to targetUrl
    expect(mockNavigate).toHaveBeenCalledWith('/courses/5?batch=12&tab=assignments');
  });
});
