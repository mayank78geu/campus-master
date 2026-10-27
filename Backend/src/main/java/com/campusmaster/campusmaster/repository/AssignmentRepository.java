package com.campusmaster.campusmaster.repository;

import com.campusmaster.campusmaster.entity.Assignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AssignmentRepository extends JpaRepository<Assignment, Long> {
    List<Assignment> findByBatchIdOrderByDueDateAsc(Long batchId);
    List<Assignment> findByBatchIdInOrderByDueDateAsc(List<Long> batchIds);
}
