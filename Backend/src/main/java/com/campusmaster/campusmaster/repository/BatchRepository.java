package com.campusmaster.campusmaster.repository;

import com.campusmaster.campusmaster.entity.Batch;
import com.campusmaster.campusmaster.entity.Course;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface BatchRepository extends JpaRepository<Batch, Long> {
    Optional<Batch> findByJoinCode(String joinCode);
    boolean existsByJoinCode(String joinCode);
    List<Batch> findByCourseOrderByCreatedAtDesc(Course course);
}
