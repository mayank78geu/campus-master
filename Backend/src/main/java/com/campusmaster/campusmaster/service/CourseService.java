package com.campusmaster.campusmaster.service;

import com.campusmaster.campusmaster.dto.course.CourseResponse;
import com.campusmaster.campusmaster.dto.course.CreateCourseRequest;
import com.campusmaster.campusmaster.dto.course.UnitRequest;
import com.campusmaster.campusmaster.dto.course.UnitResponse;
import com.campusmaster.campusmaster.entity.Course;
import com.campusmaster.campusmaster.entity.Role;
import com.campusmaster.campusmaster.entity.Unit;
import com.campusmaster.campusmaster.entity.User;
import com.campusmaster.campusmaster.exception.BadRequestException;
import com.campusmaster.campusmaster.exception.ResourceNotFoundException;
import com.campusmaster.campusmaster.repository.CourseRepository;
import com.campusmaster.campusmaster.repository.ResourceRepository;
import com.campusmaster.campusmaster.repository.UnitRepository;
import com.campusmaster.campusmaster.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CourseService {

    private final CourseRepository courseRepository;
    private final UnitRepository unitRepository;
    private final UserRepository userRepository;
    private final ResourceRepository resourceRepository;
    private final CourseAccessService courseAccessService;

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
            .orElseThrow(() -> new ResourceNotFoundException("Course not found with id: " + courseId));

        validateCourseAccess(course, user);
        return CourseResponse.fromEntity(course);
    }

    @Transactional
    public List<UnitResponse> updateUnits(Long courseId, List<UnitRequest> unitRequests, User faculty) {
        Course course = courseRepository.findById(courseId)
            .orElseThrow(() -> new ResourceNotFoundException("Course not found with id: " + courseId));

        validateFacultyOwnership(course, faculty);

        List<Unit> currentUnits = unitRepository.findByCourseOrderBySortOrderAsc(course);
        Map<Long, Unit> existingUnits = currentUnits.stream()
            .collect(Collectors.toMap(Unit::getId, Function.identity()));

        Set<Long> requestedIds = (unitRequests != null) ? unitRequests.stream()
            .map(UnitRequest::getId)
            .filter(Objects::nonNull)
            .collect(Collectors.toSet()) : Set.of();

        // Identify units to remove
        List<Unit> unitsToRemove = currentUnits.stream()
            .filter(u -> !requestedIds.contains(u.getId()))
            .collect(Collectors.toList());

        for (Unit u : unitsToRemove) {
            if (resourceRepository.existsByUnit(u)) {
                throw new IllegalStateException("Cannot delete unit '" + u.getTitle() + "' because resources are attached to it");
            }
            unitRepository.delete(u);
            course.getUnits().remove(u);
        }

        List<Unit> resultUnits = new ArrayList<>();
        if (unitRequests != null) {
            int fallbackOrder = 1;
            for (UnitRequest req : unitRequests) {
                if (req.getTitle() == null || req.getTitle().trim().isEmpty()) {
                    continue;
                }
                int sortOrder = req.getSortOrder() > 0 ? req.getSortOrder() : fallbackOrder++;
                if (req.getId() != null && existingUnits.containsKey(req.getId())) {
                    Unit existing = existingUnits.get(req.getId());
                    existing.setTitle(req.getTitle().trim());
                    existing.setSortOrder(sortOrder);
                    resultUnits.add(existing);
                } else {
                    Unit newUnit = Unit.builder()
                        .course(course)
                        .title(req.getTitle().trim())
                        .sortOrder(sortOrder)
                        .build();
                    resultUnits.add(newUnit);
                }
            }
        }

        unitRepository.saveAll(resultUnits);
        course.getUnits().clear();
        course.getUnits().addAll(resultUnits);

        return resultUnits.stream().map(UnitResponse::fromEntity).collect(Collectors.toList());
    }

    @Transactional
    public CourseResponse archiveCourse(Long courseId, User faculty) {
        Course course = courseRepository.findById(courseId)
            .orElseThrow(() -> new ResourceNotFoundException("Course not found with id: " + courseId));

        validateFacultyOwnership(course, faculty);
        course.setArchived(true);
        return CourseResponse.fromEntity(course);
    }

    @Transactional
    public CourseResponse addCoFaculty(Long courseId, String coFacultyEmail, User owner) {
        Course course = courseRepository.findById(courseId)
            .orElseThrow(() -> new ResourceNotFoundException("Course not found with id: " + courseId));

        if (!course.getOwner().getId().equals(owner.getId())) {
            throw new AccessDeniedException("Only the course owner can invite co-faculty");
        }

        User coFaculty = userRepository.findByEmail(coFacultyEmail.trim().toLowerCase())
            .orElseThrow(() -> new ResourceNotFoundException("Faculty user not found with email: " + coFacultyEmail));

        if (coFaculty.getRole() != Role.FACULTY) {
            throw new BadRequestException("User is not a faculty account");
        }

        course.getCoFaculty().add(coFaculty);
        return CourseResponse.fromEntity(course);
    }

    @Transactional
    public CourseResponse transferOwnership(Long courseId, String newOwnerEmail, User currentOwner) {
        Course course = courseRepository.findById(courseId)
            .orElseThrow(() -> new ResourceNotFoundException("Course not found with id: " + courseId));

        if (!course.getOwner().getId().equals(currentOwner.getId())) {
            throw new AccessDeniedException("Only the course owner can transfer ownership");
        }

        User newOwner = userRepository.findByEmail(newOwnerEmail.trim().toLowerCase())
            .orElseThrow(() -> new ResourceNotFoundException("Faculty user not found with email: " + newOwnerEmail));

        if (newOwner.getRole() != Role.FACULTY) {
            throw new BadRequestException("Target user is not a faculty account");
        }

        // Add current owner to coFaculty so they don't abruptly lose access unless desired
        course.getCoFaculty().add(currentOwner);
        course.getCoFaculty().remove(newOwner);
        course.setOwner(newOwner);
        return CourseResponse.fromEntity(course);
    }

    private void validateFacultyOwnership(Course course, User faculty) {
        courseAccessService.requireFacultyOf(course, faculty);
    }

    private void validateCourseAccess(Course course, User user) {
        if (user.getRole() == Role.FACULTY) {
            courseAccessService.requireFacultyOf(course, user);
        } else {
            courseAccessService.requireMemberOf(course, user);
        }
    }
}
