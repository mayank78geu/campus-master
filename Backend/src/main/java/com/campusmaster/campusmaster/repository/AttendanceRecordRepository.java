package com.campusmaster.campusmaster.repository;

import com.campusmaster.campusmaster.entity.AttendanceRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, Long> {

    boolean existsBySessionIdAndStudentId(Long sessionId, Long studentId);

    Optional<AttendanceRecord> findBySessionIdAndStudentId(Long sessionId, Long studentId);

    List<AttendanceRecord> findBySessionIdOrderByMarkedAtAsc(Long sessionId);

    List<AttendanceRecord> findByStudentIdOrderByMarkedAtDesc(Long studentId);

    List<AttendanceRecord> findBySession_CourseIdAndStudentIdOrderByMarkedAtDesc(Long courseId, Long studentId);

    long countBySessionId(Long sessionId);
}
