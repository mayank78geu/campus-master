import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import api from '../../services/api';

vi.mock('../../services/api');

function TestConsumer() {
  const { user, loading, login, logout } = useAuth();
  if (loading) return <div>Loading...</div>;
  return (
    <div>
      <div data-testid="user">{user ? user.email : 'No user'}</div>
      <button
        onClick={() => login('prof@campus.edu', 'secret')}
        data-testid="login-btn"
      >
        Login
      </button>
      <button onClick={logout} data-testid="logout-btn">
        Logout
      </button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('restores stored user from localStorage on initial render', () => {
    const savedUser = { id: 1, name: 'Stored User', email: 'stored@test.com', role: 'STUDENT' };
    localStorage.setItem('cm_user', JSON.stringify(savedUser));
    localStorage.setItem('cm_token', 'stored-token');

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('user').textContent).toBe('stored@test.com');
  });

  it('handles login and stores credentials in localStorage', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        id: 10,
        name: 'Prof Test',
        email: 'prof@campus.edu',
        role: 'FACULTY',
        token: 'new-jwt-token',
      },
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('user').textContent).toBe('No user');

    await act(async () => {
      screen.getByTestId('login-btn').click();
    });

    expect(screen.getByTestId('user').textContent).toBe('prof@campus.edu');
    expect(localStorage.getItem('cm_token')).toBe('new-jwt-token');
    expect(JSON.parse(localStorage.getItem('cm_user')).role).toBe('FACULTY');
  });

  it('clears localStorage and user state on logout', () => {
    const savedUser = { id: 1, name: 'Stored User', email: 'stored@test.com', role: 'STUDENT' };
    localStorage.setItem('cm_user', JSON.stringify(savedUser));
    localStorage.setItem('cm_token', 'stored-token');

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('user').textContent).toBe('stored@test.com');

    act(() => {
      screen.getByTestId('logout-btn').click();
    });

    expect(screen.getByTestId('user').textContent).toBe('No user');
    expect(localStorage.getItem('cm_token')).toBeNull();
    expect(localStorage.getItem('cm_user')).toBeNull();
  });
});
