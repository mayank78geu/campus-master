package com.campusmaster.campusmaster.repository;

import com.campusmaster.campusmaster.entity.Batch;
import com.campusmaster.campusmaster.entity.Enrollment;
import com.campusmaster.campusmaster.entity.EnrollmentStatus;
import com.campusmaster.campusmaster.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface EnrollmentRepository extends JpaRepository<Enrollment, Long> {
    Optional<Enrollment> findByStudentAndBatch(User student, Batch batch);
    boolean existsByStudentAndBatch(User student, Batch batch);
    List<Enrollment> findByBatchOrderByJoinedAtDesc(Batch batch);
    List<Enrollment> findByBatchAndStatusOrderByJoinedAtDesc(Batch batch, EnrollmentStatus status);
    List<Enrollment> findByStudentAndStatusOrderByJoinedAtDesc(User student, EnrollmentStatus status);
}
