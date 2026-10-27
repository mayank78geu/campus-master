package com.campusmaster.campusmaster.repository;

import com.campusmaster.campusmaster.entity.Course;
import com.campusmaster.campusmaster.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CourseRepository extends JpaRepository<Course, Long> {
    
    // Find courses owned by faculty or where faculty is in coFaculty
    @Query("SELECT DISTINCT c FROM Course c LEFT JOIN c.coFaculty f WHERE (c.owner = :faculty OR f = :faculty) AND c.isArchived = false ORDER BY c.createdAt DESC")
    List<Course> findAllActiveByFaculty(@Param("faculty") User faculty);

    // Find all courses accessible by faculty including archived
    @Query("SELECT DISTINCT c FROM Course c LEFT JOIN c.coFaculty f WHERE c.owner = :faculty OR f = :faculty ORDER BY c.createdAt DESC")
    List<Course> findAllByFaculty(@Param("faculty") User faculty);

    // Find courses where student is enrolled in an active batch
    @Query("SELECT DISTINCT c FROM Course c JOIN c.batches b JOIN b.enrollments e WHERE e.student = :student AND e.status = 'ACTIVE' AND b.status = 'ACTIVE' ORDER BY c.createdAt DESC")
    List<Course> findAllActiveByStudent(@Param("student") User student);
}
