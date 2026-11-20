package com.campusmaster.campusmaster.repository;

import com.campusmaster.campusmaster.entity.AttendanceSession;
import com.campusmaster.campusmaster.entity.AttendanceSessionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceSessionRepository extends JpaRepository<AttendanceSession, Long> {

    List<AttendanceSession> findByCourseIdOrderByCreatedAtDesc(Long courseId);

    Optional<AttendanceSession> findFirstByCourseIdAndStatusOrderByCreatedAtDesc(Long courseId, AttendanceSessionStatus status);

    Optional<AttendanceSession> findByIdAndCourseId(Long id, Long courseId);

    List<AttendanceSession> findByCourseIdAndStatus(Long courseId, AttendanceSessionStatus status);
}
