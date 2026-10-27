package com.campusmaster.campusmaster.repository;

import com.campusmaster.campusmaster.entity.Course;
import com.campusmaster.campusmaster.entity.Unit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface UnitRepository extends JpaRepository<Unit, Long> {
    List<Unit> findByCourseOrderBySortOrderAsc(Course course);
    void deleteByCourse(Course course);
}
