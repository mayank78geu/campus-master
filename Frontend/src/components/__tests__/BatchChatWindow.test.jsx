import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import BatchChatWindow from '../BatchChatWindow';
import api from '../../services/api';

vi.mock('../../services/api');

vi.mock('@stomp/stompjs', () => {
  return {
    Client: class {
      activate = vi.fn();
      deactivate = vi.fn();
      subscribe = vi.fn();
    },
  };
});

describe('BatchChatWindow Component', () => {
  const mockBatches = [
    { id: 10, name: 'Batch A', term: 'Sem 3 · 2026–27', enrolledStudentsCount: 42 }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty chat state when no messages exist', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/chat/messages')) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });

    await act(async () => {
      render(
        <BatchChatWindow
          courseId={1}
          batches={mockBatches}
          selectedBatch={mockBatches[0]}
          isFaculty={false}
          user={{ id: 100, role: 'STUDENT', name: 'Alice' }}
          courseCode="DBMS"
        />
      );
    });

    expect(screen.getByText('DBMS · Sem 3 · 2026–27 Discussion')).toBeInTheDocument();
    expect(screen.getByText('No messages in this batch yet')).toBeInTheDocument();
  });

  it('renders chat message history and shows soft deleted note when isDeleted is true', async () => {
    const mockMessages = [
      {
        id: 1,
        senderId: 101,
        senderName: 'Bob Student',
        senderRole: 'STUDENT',
        content: 'Anyone free for a study session tonight?',
        isDeleted: false,
        createdAt: '2026-11-02T10:00:00',
      },
      {
        id: 2,
        senderId: 102,
        senderName: 'Charlie',
        senderRole: 'STUDENT',
        content: 'This message was deleted',
        isDeleted: true,
        createdAt: '2026-11-02T10:05:00',
      },
    ];

    api.get.mockImplementation((url) => {
      if (url.includes('/chat/messages')) {
        return Promise.resolve({ data: mockMessages });
      }
      return Promise.resolve({ data: [] });
    });

    await act(async () => {
      render(
        <BatchChatWindow
          courseId={1}
          batches={mockBatches}
          selectedBatch={mockBatches[0]}
          isFaculty={false}
          user={{ id: 100, role: 'STUDENT', name: 'Alice' }}
          courseCode="DBMS"
        />
      );
    });

    expect(screen.getByText('Anyone free for a study session tonight?')).toBeInTheDocument();
    expect(screen.getByText('This message was deleted')).toBeInTheDocument();
  });
});
