package com.campusmaster.campusmaster.service;

import com.campusmaster.campusmaster.entity.Batch;
import com.campusmaster.campusmaster.entity.Course;
import com.campusmaster.campusmaster.entity.EnrollmentStatus;
import com.campusmaster.campusmaster.entity.Role;
import com.campusmaster.campusmaster.entity.User;
import com.campusmaster.campusmaster.repository.EnrollmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CourseAccessService {

    private final EnrollmentRepository enrollmentRepository;

    public boolean isFacultyOf(Course course, User user) {
        if (user == null || course == null) {
            return false;
        }
        boolean isOwner = course.getOwner() != null && course.getOwner().getId().equals(user.getId());
        boolean isCoFaculty = course.getCoFaculty() != null &&
                course.getCoFaculty().stream().anyMatch(f -> f.getId().equals(user.getId()));
        return isOwner || isCoFaculty;
    }

    public void requireFacultyOf(Course course, User user) {
        if (!isFacultyOf(course, user)) {
            throw new AccessDeniedException("Access denied: You are not authorized faculty for course " + (course != null ? course.getCode() : ""));
        }
    }

    public boolean isMemberOf(Course course, User user) {
        if (user == null || course == null) {
            return false;
        }
        if (isFacultyOf(course, user)) {
            return true;
        }
        if (user.getRole() == Role.STUDENT) {
            return enrollmentRepository.existsByStudentAndBatch_CourseAndStatus(user, course, EnrollmentStatus.ACTIVE);
        }
        return false;
    }

    public void requireMemberOf(Course course, User user) {
        if (!isMemberOf(course, user)) {
            throw new AccessDeniedException("Access denied: You are not an active member of this course");
        }
    }

    public boolean isMemberOfBatch(Batch batch, User user) {
        if (user == null || batch == null) {
            return false;
        }
        if (isFacultyOf(batch.getCourse(), user)) {
            return true;
        }
        if (user.getRole() == Role.STUDENT) {
            return enrollmentRepository.existsByStudentAndBatchAndStatus(user, batch, EnrollmentStatus.ACTIVE);
        }
        return false;
    }

    public void requireMemberOfBatch(Batch batch, User user) {
        if (!isMemberOfBatch(batch, user)) {
            throw new AccessDeniedException("Access denied: You are not an active member of this batch");
        }
    }
}
