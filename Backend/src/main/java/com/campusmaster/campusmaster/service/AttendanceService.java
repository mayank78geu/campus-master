package com.campusmaster.campusmaster.service;

import com.campusmaster.campusmaster.dto.attendance.*;
import com.campusmaster.campusmaster.entity.*;
import com.campusmaster.campusmaster.exception.BadRequestException;
import com.campusmaster.campusmaster.exception.ResourceNotFoundException;
import com.campusmaster.campusmaster.exception.UnauthorizedException;
import com.campusmaster.campusmaster.repository.AttendanceRecordRepository;
import com.campusmaster.campusmaster.repository.AttendanceSessionRepository;
import com.campusmaster.campusmaster.repository.CourseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AttendanceService {

    private final AttendanceSessionRepository attendanceSessionRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final CourseRepository courseRepository;
    private final ProfileService profileService;

    private static final String CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    @Transactional
    public AttendanceSessionResponse startSession(Long courseId, StartAttendanceSessionRequest request, User faculty) {
        Course course = courseRepository.findById(courseId)
            .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + courseId));

        validateFacultyAccess(course, faculty);

        // Auto-close any previous active session for this course
        List<AttendanceSession> activeSessions = attendanceSessionRepository.findByCourseIdAndStatus(courseId, AttendanceSessionStatus.ACTIVE);
        for (AttendanceSession active : activeSessions) {
            active.setStatus(AttendanceSessionStatus.CLOSED);
            active.setEndedAt(LocalDateTime.now());
            attendanceSessionRepository.save(active);
        }

        int duration = request.getDurationMinutes() > 0 ? request.getDurationMinutes() : 10;
        String sessionCode = generateSessionCode();
        String initialToken = generateSecureToken();
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expiresAt = now.plusMinutes(duration);

        AttendanceSession session = AttendanceSession.builder()
            .course(course)
            .createdBy(faculty)
            .title(request.getTitle().trim())
            .sessionCode(sessionCode)
            .status(AttendanceSessionStatus.ACTIVE)
            .currentQrToken(initialToken)
            .tokenGeneratedAt(now)
            .durationMinutes(duration)
            .expiresAt(expiresAt)
            .build();

        session = attendanceSessionRepository.save(session);
        return AttendanceSessionResponse.fromEntity(session, 0);
    }

    @Transactional
    public QrTokenResponse refreshQrToken(Long sessionId, User faculty) {
        AttendanceSession session = attendanceSessionRepository.findById(sessionId)
            .orElseThrow(() -> new ResourceNotFoundException("Attendance session not found: " + sessionId));

        validateFacultyAccess(session.getCourse(), faculty);

        if (session.getStatus() != AttendanceSessionStatus.ACTIVE || session.isExpired()) {
            if (session.getStatus() == AttendanceSessionStatus.ACTIVE) {
                session.setStatus(AttendanceSessionStatus.EXPIRED);
                attendanceSessionRepository.save(session);
            }
            throw new BadRequestException("Attendance session has closed or expired. QR rotation stopped.");
        }

        // Generate next token - previous token is now rejected server-side
        String nextToken = generateSecureToken();
        session.setCurrentQrToken(nextToken);
        session.setTokenGeneratedAt(LocalDateTime.now());
        attendanceSessionRepository.save(session);

        long attendeesCount = attendanceRecordRepository.countBySessionId(sessionId);

        return QrTokenResponse.builder()
            .sessionId(session.getId())
            .sessionCode(session.getSessionCode())
            .qrToken(nextToken)
            .tokenGeneratedAt(session.getTokenGeneratedAt())
            .expiresAt(session.getExpiresAt())
            .refreshIntervalSeconds(5)
            .attendeesCount(attendeesCount)
            .build();
    }

    @Transactional
    public AttendanceSessionResponse endSession(Long sessionId, User faculty) {
        AttendanceSession session = attendanceSessionRepository.findById(sessionId)
            .orElseThrow(() -> new ResourceNotFoundException("Attendance session not found: " + sessionId));

        validateFacultyAccess(session.getCourse(), faculty);

        session.setStatus(AttendanceSessionStatus.CLOSED);
        session.setEndedAt(LocalDateTime.now());
        AttendanceSession saved = attendanceSessionRepository.save(session);

        long attendeesCount = attendanceRecordRepository.countBySessionId(sessionId);
        return AttendanceSessionResponse.fromEntity(saved, attendeesCount);
    }

    @Transactional
    public List<AttendanceSessionResponse> getCourseSessions(Long courseId, User user) {
        Course course = courseRepository.findById(courseId)
            .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + courseId));

        if (user.getRole() == Role.STUDENT) {
            profileService.validateStudentProfileComplete(user);
        }

        List<AttendanceSession> sessions = attendanceSessionRepository.findByCourseIdOrderByCreatedAtDesc(courseId);
        LocalDateTime now = LocalDateTime.now();

        return sessions.stream().map(s -> {
            if (s.getStatus() == AttendanceSessionStatus.ACTIVE && s.isExpired()) {
                s.setStatus(AttendanceSessionStatus.EXPIRED);
                attendanceSessionRepository.save(s);
            }
            long count = attendanceRecordRepository.countBySessionId(s.getId());
            return AttendanceSessionResponse.fromEntity(s, count);
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AttendanceRecordResponse> getSessionRecords(Long sessionId, User faculty) {
        AttendanceSession session = attendanceSessionRepository.findById(sessionId)
            .orElseThrow(() -> new ResourceNotFoundException("Attendance session not found: " + sessionId));

        validateFacultyAccess(session.getCourse(), faculty);

        List<AttendanceRecord> records = attendanceRecordRepository.findBySessionIdOrderByMarkedAtAsc(sessionId);
        return records.stream().map(AttendanceRecordResponse::fromEntity).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AttendanceSessionResponse getSessionDetails(Long sessionId, User faculty) {
        AttendanceSession session = attendanceSessionRepository.findById(sessionId)
            .orElseThrow(() -> new ResourceNotFoundException("Attendance session not found: " + sessionId));

        validateFacultyAccess(session.getCourse(), faculty);
        long count = attendanceRecordRepository.countBySessionId(sessionId);
        return AttendanceSessionResponse.fromEntity(session, count);
    }

    @Transactional
    public AttendanceRecordResponse markAttendance(Long sessionId, MarkAttendanceRequest request, User student) {
        // Enforce Student Profile Completion Gate
        profileService.validateStudentProfileComplete(student);

        AttendanceSession session = attendanceSessionRepository.findById(sessionId)
            .orElseThrow(() -> new ResourceNotFoundException("Attendance session not found: " + sessionId));

        // Auto-expire check
        if (session.getStatus() == AttendanceSessionStatus.ACTIVE && session.isExpired()) {
            session.setStatus(AttendanceSessionStatus.EXPIRED);
            attendanceSessionRepository.save(session);
        }

        String submittedToken = request.getQrToken() != null ? request.getQrToken().trim() : "";
        String submittedCode = request.getSessionCode() != null ? request.getSessionCode().trim() : "";

        // Check 1: QR token is valid and is the current one
        if (!submittedToken.equals(session.getCurrentQrToken())) {
            throw new BadRequestException("Invalid or expired QR token. The QR regenerates every 5 seconds; please scan the live code currently shown on the screen.");
        }

        // Check 2: Session is still active
        if (session.getStatus() != AttendanceSessionStatus.ACTIVE || session.isExpired()) {
            throw new BadRequestException("Attendance session has closed or expired. Scans are no longer accepted.");
        }

        // Check 3: Code matches
        if (!session.getSessionCode().equalsIgnoreCase(submittedCode)) {
            throw new BadRequestException("Incorrect session code. Please enter the 6-character code shown by your instructor.");
        }

        // Check 4: Student has not already marked attendance in this session
        if (attendanceRecordRepository.existsBySessionIdAndStudentId(session.getId(), student.getId())) {
            throw new BadRequestException("You have already marked attendance for this session.");
        }

        // Snapshot student profile at the moment of attendance marking
        AttendanceRecord record = AttendanceRecord.builder()
            .session(session)
            .student(student)
            .studentName(student.getName())
            .courseName(student.getCourse() != null && !student.getCourse().isBlank() ? student.getCourse() : session.getCourse().getName())
            .section(student.getSection() != null && !student.getSection().isBlank() ? student.getSection() : "N/A")
            .classRollNo(student.getClassRollNo() != null && !student.getClassRollNo().isBlank() ? student.getClassRollNo() : "N/A")
            .studentIdCode(student.getStudentId() != null && !student.getStudentId().isBlank() ? student.getStudentId() : "N/A")
            .markedAt(LocalDateTime.now())
            .build();

        AttendanceRecord saved = attendanceRecordRepository.save(record);
        return AttendanceRecordResponse.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public List<AttendanceRecordResponse> getStudentCourseAttendance(Long courseId, User student) {
        profileService.validateStudentProfileComplete(student);
        List<AttendanceRecord> records = attendanceRecordRepository.findBySession_CourseIdAndStudentIdOrderByMarkedAtDesc(courseId, student.getId());
        return records.stream().map(AttendanceRecordResponse::fromEntity).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public byte[] exportSessionRecordsCsv(Long sessionId, User faculty) {
        AttendanceSession session = attendanceSessionRepository.findById(sessionId)
            .orElseThrow(() -> new ResourceNotFoundException("Attendance session not found: " + sessionId));

        validateFacultyAccess(session.getCourse(), faculty);

        List<AttendanceRecord> records = attendanceRecordRepository.findBySessionIdOrderByMarkedAtAsc(sessionId);
        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

        StringBuilder sb = new StringBuilder();
        sb.append("Student Name,Student ID,Course,Section,Class Roll No,Marked At\n");

        for (AttendanceRecord r : records) {
            sb.append("\"").append(escapeCsv(r.getStudentName())).append("\",")
              .append("\"").append(escapeCsv(r.getStudentIdCode())).append("\",")
              .append("\"").append(escapeCsv(r.getCourseName())).append("\",")
              .append("\"").append(escapeCsv(r.getSection())).append("\",")
              .append("\"").append(escapeCsv(r.getClassRollNo())).append("\",")
              .append("\"").append(r.getMarkedAt() != null ? dtf.format(r.getMarkedAt()) : "").append("\"\n");
        }

        return sb.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    private void validateFacultyAccess(Course course, User faculty) {
        boolean isOwner = course.getOwner().getId().equals(faculty.getId());
        boolean isCoFaculty = course.getCoFaculty() != null &&
            course.getCoFaculty().stream().anyMatch(u -> u.getId().equals(faculty.getId()));

        if (!isOwner && !isCoFaculty) {
            throw new UnauthorizedException("You do not have faculty permission to manage attendance for this course.");
        }
    }

    private String generateSessionCode() {
        StringBuilder sb = new StringBuilder(6);
        for (int i = 0; i < 6; i++) {
            sb.append(CODE_CHARS.charAt(RANDOM.nextInt(CODE_CHARS.length())));
        }
        return sb.toString();
    }

    private String generateSecureToken() {
        return "CM_ATT_" + UUID.randomUUID().toString().replace("-", "") + "_" + System.currentTimeMillis();
    }

    private String escapeCsv(String str) {
        if (str == null) return "";
        return str.replace("\"", "\"\"");
    }
}
