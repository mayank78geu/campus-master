package com.campusmaster.campusmaster.repository;

import com.campusmaster.campusmaster.entity.Submission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface SubmissionRepository extends JpaRepository<Submission, Long> {
    List<Submission> findByAssignmentId(Long assignmentId);
    Optional<Submission> findByAssignmentIdAndStudentId(Long assignmentId, Long studentId);
    List<Submission> findByStudentId(Long studentId);
    Optional<Submission> findByReceiptToken(String receiptToken);
    long countByAssignmentId(Long assignmentId);
    long countByAssignmentIdAndIsLate(Long assignmentId, boolean isLate);
}
