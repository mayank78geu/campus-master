package com.campusmaster.campusmaster.repository;

import com.campusmaster.campusmaster.entity.Course;
import com.campusmaster.campusmaster.entity.Resource;
import com.campusmaster.campusmaster.entity.Unit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ResourceRepository extends JpaRepository<Resource, Long> {

    List<Resource> findByCourseOrderByCreatedAtDesc(Course course);

    List<Resource> findByCourseAndIsPublishedTrueOrderByCreatedAtDesc(Course course);

    List<Resource> findByCourseAndUnitOrderByCreatedAtDesc(Course course, Unit unit);

    List<Resource> findByCourseAndUnitAndIsPublishedTrueOrderByCreatedAtDesc(Course course, Unit unit);

    @Query("SELECT r FROM Resource r WHERE r.course = :course AND " +
           "(LOWER(r.title) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           " LOWER(r.description) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           " LOWER(r.fileName) LIKE LOWER(CONCAT('%', :query, '%')))")
    List<Resource> searchInCourse(@Param("course") Course course, @Param("query") String query);
}
