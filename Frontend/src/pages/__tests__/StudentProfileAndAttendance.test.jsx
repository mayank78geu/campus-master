import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StudentProfilePage from '../StudentProfilePage';
import FacultyAttendanceTab from '../../components/FacultyAttendanceTab';
import StudentAttendanceTab from '../../components/StudentAttendanceTab';
import api from '../../services/api';

vi.mock('../../services/api');

const mockUpdateUser = vi.fn();
const mockLogout = vi.fn();

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 2,
      name: 'Ishu Kumar',
      email: 'ishu@campusmaster.edu',
      role: 'STUDENT',
      studentId: '',
      course: '',
      section: '',
      classRollNo: '',
      phoneNumber: '',
      isProfileCompleted: false,
    },
    updateUser: mockUpdateUser,
    logout: mockLogout,
  }),
}));

describe('Student Profile Completion & Attendance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('StudentProfilePage', () => {
    it('renders profile completion form for student with incomplete profile', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          id: 2,
          name: 'Ishu Kumar',
          email: 'ishu@campusmaster.edu',
          studentId: '',
          course: '',
          section: '',
          classRollNo: '',
          phoneNumber: '',
          isProfileCompleted: false,
        },
      });

      render(
        <MemoryRouter>
          <StudentProfilePage />
        </MemoryRouter>
      );

      expect(screen.getByText(/Complete Your Student Profile/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/e\.g\. 2023CS042/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/e\.g\. B\.Tech CSE/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/e\.g\. Section A/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/e\.g\. 24/i)).toBeInTheDocument();
    });

    it('validates phone number and submits completed profile', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          id: 2,
          name: 'Ishu Kumar',
          email: 'ishu@campusmaster.edu',
        },
      });

      api.put.mockResolvedValueOnce({
        data: {
          id: 2,
          name: 'Ishu Kumar',
          email: 'ishu@campusmaster.edu',
          studentId: '2023CS042',
          course: 'B.Tech CSE',
          section: 'A',
          classRollNo: '24',
          phoneNumber: '9876543210',
          isProfileCompleted: true,
        },
      });

      render(
        <MemoryRouter>
          <StudentProfilePage />
        </MemoryRouter>
      );

      // Fill in details
      fireEvent.change(screen.getByPlaceholderText(/e\.g\. 2023CS042/i), {
        target: { value: '2023CS042' },
      });
      fireEvent.change(screen.getByPlaceholderText(/e\.g\. B\.Tech CSE/i), {
        target: { value: 'B.Tech CSE' },
      });
      fireEvent.change(screen.getByPlaceholderText(/e\.g\. Section A/i), {
        target: { value: 'A' },
      });
      fireEvent.change(screen.getByPlaceholderText(/e\.g\. 24/i), {
        target: { value: '24' },
      });
      fireEvent.change(screen.getByPlaceholderText(/e\.g\. 9876543210/i), {
        target: { value: '9876543210' },
      });

      const submitBtn = screen.getByRole('button', { name: /Complete Registration/i });
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      expect(api.put).toHaveBeenCalledWith('/profile', {
        name: 'Ishu Kumar',
        studentId: '2023CS042',
        course: 'B.Tech CSE',
        section: 'A',
        classRollNo: '24',
        phoneNumber: '9876543210',
      });
    });
  });

  describe('FacultyAttendanceTab', () => {
    it('renders faculty attendance dashboard with start session and history', async () => {
      api.get.mockResolvedValueOnce({
        data: [
          {
            id: 10,
            courseId: 1,
            title: 'Lecture 1: Intro to DB',
            sessionCode: 'K9X2P4',
            status: 'CLOSED',
            durationMinutes: 10,
            attendeesCount: 35,
            createdAt: '2026-11-20T10:00:00',
          },
        ],
      });

      render(
        <MemoryRouter>
          <FacultyAttendanceTab courseId={1} courseCode="DBMS" courseName="Database Systems" />
        </MemoryRouter>
      );

      expect(await screen.findByText(/Faculty Attendance Desk/i)).toBeInTheDocument();
      expect(screen.getByText(/Start Attendance/i)).toBeInTheDocument();
      expect(screen.getByText(/Lecture 1: Intro to DB/i)).toBeInTheDocument();
      expect(screen.getByText(/Code: K9X2P4/i)).toBeInTheDocument();
    });

    it('displays active session with fixed session code', async () => {
      api.get.mockResolvedValueOnce({
        data: [
          {
            id: 11,
            courseId: 1,
            title: 'Lecture 2: Normalization',
            sessionCode: 'A8B2C4',
            currentQrToken: 'CM_ATT_TOKEN_123',
            status: 'ACTIVE',
            durationMinutes: 10,
            expiresAt: new Date(Date.now() + 600000).toISOString(),
            attendeesCount: 5,
            createdAt: new Date().toISOString(),
          },
        ],
      });

      render(
        <MemoryRouter>
          <FacultyAttendanceTab courseId={1} courseCode="DBMS" courseName="Database Systems" />
        </MemoryRouter>
      );

      expect(await screen.findByText(/Live Attendance Active/i)).toBeInTheDocument();
      expect(screen.getAllByText('A8B2C4').length).toBeGreaterThan(0);
      expect(screen.getByText(/End Attendance/i)).toBeInTheDocument();
    });
  });

  describe('StudentAttendanceTab', () => {
    it('renders student attendance portal and past records', async () => {
      api.get
        .mockResolvedValueOnce({ data: [] }) // sessions
        .mockResolvedValueOnce({
          data: [
            {
              id: 99,
              sessionId: 10,
              studentName: 'Ishu Kumar',
              studentIdCode: '2023CS042',
              courseName: 'DBMS',
              section: 'A',
              classRollNo: '24',
              markedAt: '2026-11-20T10:05:00',
            },
          ],
        }); // my-records

      render(
        <MemoryRouter>
          <StudentAttendanceTab
            courseId={1}
            courseCode="DBMS"
            courseName="Database Systems"
            user={{ id: 2, name: 'Ishu Kumar' }}
          />
        </MemoryRouter>
      );

      expect(await screen.findByText(/Student Attendance Portal/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Scan QR Code/i })).toBeInTheDocument();
      expect(screen.getByText(/1 Sessions Attended/i)).toBeInTheDocument();
      expect(screen.getByText(/ID: 2023CS042/i)).toBeInTheDocument();
    });
  });
});
