package com.campusmaster.campusmaster.service;

import com.campusmaster.campusmaster.dto.course.CourseResponse;
import com.campusmaster.campusmaster.dto.course.CreateCourseRequest;
import com.campusmaster.campusmaster.dto.course.UnitRequest;
import com.campusmaster.campusmaster.dto.course.UnitResponse;
import com.campusmaster.campusmaster.entity.Course;
import com.campusmaster.campusmaster.entity.Role;
import com.campusmaster.campusmaster.entity.Unit;
import com.campusmaster.campusmaster.entity.User;
import com.campusmaster.campusmaster.repository.CourseRepository;
import com.campusmaster.campusmaster.repository.UnitRepository;
import com.campusmaster.campusmaster.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CourseService {

    private final CourseRepository courseRepository;
    private final UnitRepository unitRepository;
    private final UserRepository userRepository;

    @Transactional
    public CourseResponse createCourse(CreateCourseRequest request, User faculty) {
        if (faculty.getRole() != Role.FACULTY) {
            throw new AccessDeniedException("Only faculty can create courses");
        }

        Course course = Course.builder()
            .name(request.getName().trim())
            .code(request.getCode().trim().toUpperCase())
            .program(request.getProgram() != null ? request.getProgram().trim() : null)
            .semester(request.getSemester() != null ? request.getSemester().trim() : null)
            .description(request.getDescription())
            .owner(faculty)
            .build();

        course = courseRepository.save(course);

        // Add initial units if provided
        if (request.getInitialUnits() != null && !request.getInitialUnits().isEmpty()) {
            List<Unit> units = new ArrayList<>();
            int order = 1;
            for (String unitTitle : request.getInitialUnits()) {
                if (unitTitle != null && !unitTitle.trim().isEmpty()) {
                    Unit unit = Unit.builder()
                        .course(course)
                        .title(unitTitle.trim())
                        .sortOrder(order++)
                        .build();
                    units.add(unit);
                }
            }
            if (!units.isEmpty()) {
                unitRepository.saveAll(units);
                course.getUnits().addAll(units);
            }
        }

        return CourseResponse.fromEntity(course);
    }

    @Transactional(readOnly = true)
    public List<CourseResponse> getCoursesForUser(User user) {
        if (user.getRole() == Role.FACULTY) {
            return courseRepository.findAllByFaculty(user).stream()
                .map(CourseResponse::fromEntity)
                .collect(Collectors.toList());
        } else {
            return courseRepository.findAllActiveByStudent(user).stream()
                .map(CourseResponse::fromEntity)
                .collect(Collectors.toList());
        }
    }

    @Transactional(readOnly = true)
    public CourseResponse getCourseById(Long courseId, User user) {
        Course course = courseRepository.findById(courseId)
            .orElseThrow(() -> new IllegalArgumentException("Course not found with id: " + courseId));

        validateCourseAccess(course, user);
        return CourseResponse.fromEntity(course);
    }

    @Transactional
    public List<UnitResponse> updateUnits(Long courseId, List<UnitRequest> unitRequests, User faculty) {
        Course course = courseRepository.findById(courseId)
            .orElseThrow(() -> new IllegalArgumentException("Course not found with id: " + courseId));

        validateFacultyOwnership(course, faculty);

        // Remove existing units and save updated list
        course.getUnits().clear();
        courseRepository.flush();

        List<Unit> newUnits = new ArrayList<>();
        int order = 1;
        for (UnitRequest req : unitRequests) {
            if (req.getTitle() != null && !req.getTitle().trim().isEmpty()) {
                newUnits.add(Unit.builder()
                    .course(course)
                    .title(req.getTitle().trim())
                    .sortOrder(order++)
                    .build());
            }
        }
        unitRepository.saveAll(newUnits);
        course.getUnits().addAll(newUnits);

        return newUnits.stream().map(UnitResponse::fromEntity).collect(Collectors.toList());
    }

    @Transactional
    public CourseResponse archiveCourse(Long courseId, User faculty) {
        Course course = courseRepository.findById(courseId)
            .orElseThrow(() -> new IllegalArgumentException("Course not found with id: " + courseId));

        validateFacultyOwnership(course, faculty);
        course.setArchived(true);
        return CourseResponse.fromEntity(course);
    }

    @Transactional
    public CourseResponse addCoFaculty(Long courseId, String coFacultyEmail, User owner) {
        Course course = courseRepository.findById(courseId)
            .orElseThrow(() -> new IllegalArgumentException("Course not found with id: " + courseId));

        if (!course.getOwner().getId().equals(owner.getId())) {
            throw new AccessDeniedException("Only the course owner can invite co-faculty");
        }

        User coFaculty = userRepository.findByEmail(coFacultyEmail.trim().toLowerCase())
            .orElseThrow(() -> new IllegalArgumentException("Faculty user not found with email: " + coFacultyEmail));

        if (coFaculty.getRole() != Role.FACULTY) {
            throw new IllegalArgumentException("User is not a faculty account");
        }

        course.getCoFaculty().add(coFaculty);
        return CourseResponse.fromEntity(course);
    }

    private void validateFacultyOwnership(Course course, User faculty) {
        boolean isOwner = course.getOwner().getId().equals(faculty.getId());
        boolean isCoFaculty = course.getCoFaculty().stream().anyMatch(f -> f.getId().equals(faculty.getId()));
        if (!isOwner && !isCoFaculty) {
            throw new AccessDeniedException("You do not have permission to manage this course");
        }
    }

    private void validateCourseAccess(Course course, User user) {
        if (user.getRole() == Role.FACULTY) {
            validateFacultyOwnership(course, user);
        } else {
            // Student access check: must be enrolled in at least one batch
            boolean isEnrolled = course.getBatches().stream()
                .flatMap(b -> b.getEnrollments().stream())
                .anyMatch(e -> e.getStudent().getId().equals(user.getId()) && e.getStatus().name().equals("ACTIVE"));
            if (!isEnrolled) {
                throw new AccessDeniedException("You are not enrolled in this course");
            }
        }
    }
}
