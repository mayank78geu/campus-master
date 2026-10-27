package com.campusmaster.campusmaster.service;

import com.campusmaster.campusmaster.dto.batch.BatchResponse;
import com.campusmaster.campusmaster.dto.batch.CreateBatchRequest;
import com.campusmaster.campusmaster.dto.batch.EnrollmentResponse;
import com.campusmaster.campusmaster.entity.*;
import com.campusmaster.campusmaster.repository.BatchRepository;
import com.campusmaster.campusmaster.repository.CourseRepository;
import com.campusmaster.campusmaster.repository.EnrollmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BatchService {

    private final BatchRepository batchRepository;
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;

    private static final String CHARACTERS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // Removed ambiguous chars 0, 1, I, O
    private static final int CODE_LENGTH = 6;
    private final SecureRandom random = new SecureRandom();

    private String generateUniqueJoinCode() {
        String code;
        int attempts = 0;
        do {
            StringBuilder sb = new StringBuilder(CODE_LENGTH);
            for (int i = 0; i < CODE_LENGTH; i++) {
                sb.append(CHARACTERS.charAt(random.nextInt(CHARACTERS.length())));
            }
            code = sb.toString();
            attempts++;
            if (attempts > 50) {
                code = code + System.currentTimeMillis() % 1000;
                break;
            }
        } while (batchRepository.existsByJoinCode(code));
        return code;
    }

    @Transactional
    public BatchResponse createBatch(Long courseId, CreateBatchRequest request, User faculty) {
        Course course = courseRepository.findById(courseId)
            .orElseThrow(() -> new IllegalArgumentException("Course not found with id: " + courseId));

        validateFacultyOwnership(course, faculty);

        if (course.isArchived()) {
            throw new IllegalStateException("Cannot create a batch in an archived course");
        }

        Batch batch = Batch.builder()
            .course(course)
            .name(request.getName().trim())
            .term(request.getTerm() != null ? request.getTerm().trim() : null)
            .startDate(request.getStartDate())
            .endDate(request.getEndDate())
            .joinCode(generateUniqueJoinCode())
            .joinMode(request.getJoinMode() != null ? request.getJoinMode() : JoinMode.AUTO_APPROVE)
            .status(BatchStatus.ACTIVE)
            .build();

        batch = batchRepository.save(batch);
        return BatchResponse.fromEntity(batch);
    }

    @Transactional(readOnly = true)
    public List<BatchResponse> getBatchesByCourse(Long courseId, User user) {
        Course course = courseRepository.findById(courseId)
            .orElseThrow(() -> new IllegalArgumentException("Course not found with id: " + courseId));

        return batchRepository.findByCourseOrderByCreatedAtDesc(course).stream()
            .map(BatchResponse::fromEntity)
            .collect(Collectors.toList());
    }

    @Transactional
    public BatchResponse regenerateJoinCode(Long batchId, User faculty) {
        Batch batch = batchRepository.findById(batchId)
            .orElseThrow(() -> new IllegalArgumentException("Batch not found with id: " + batchId));

        validateFacultyOwnership(batch.getCourse(), faculty);
        batch.setJoinCode(generateUniqueJoinCode());
        return BatchResponse.fromEntity(batch);
    }

    @Transactional
    public EnrollmentResponse joinBatchWithCode(String joinCode, User student) {
        if (student.getRole() != Role.STUDENT) {
            throw new AccessDeniedException("Only students can join batches with a join code");
        }

        String normalizedCode = joinCode.trim().toUpperCase();
        Batch batch = batchRepository.findByJoinCode(normalizedCode)
            .orElseThrow(() -> new IllegalArgumentException("Invalid join code: " + joinCode));

        if (batch.getStatus() == BatchStatus.CLOSED || batch.getCourse().isArchived()) {
            throw new IllegalStateException("This batch is closed or its course has been archived");
        }

        // Check if student is already enrolled in this batch
        var existing = enrollmentRepository.findByStudentAndBatch(student, batch);
        if (existing.isPresent()) {
            Enrollment enrollment = existing.get();
            if (enrollment.getStatus() == EnrollmentStatus.ACTIVE) {
                return EnrollmentResponse.fromEntity(enrollment);
            }
            if (enrollment.getStatus() == EnrollmentStatus.PENDING) {
                throw new IllegalStateException("Your join request is pending approval by faculty");
            }
            // If previously removed, re-enroll
            enrollment.setStatus(batch.getJoinMode() == JoinMode.AUTO_APPROVE ? 
                EnrollmentStatus.ACTIVE : EnrollmentStatus.PENDING);
            return EnrollmentResponse.fromEntity(enrollment);
        }

        EnrollmentStatus initialStatus = (batch.getJoinMode() == JoinMode.AUTO_APPROVE) 
            ? EnrollmentStatus.ACTIVE 
            : EnrollmentStatus.PENDING;

        Enrollment enrollment = Enrollment.builder()
            .student(student)
            .batch(batch)
            .status(initialStatus)
            .build();

        enrollment = enrollmentRepository.save(enrollment);
        return EnrollmentResponse.fromEntity(enrollment);
    }

    @Transactional(readOnly = true)
    public List<EnrollmentResponse> getBatchRoster(Long batchId, User faculty) {
        Batch batch = batchRepository.findById(batchId)
            .orElseThrow(() -> new IllegalArgumentException("Batch not found with id: " + batchId));

        validateFacultyOwnership(batch.getCourse(), faculty);

        return enrollmentRepository.findByBatchOrderByJoinedAtDesc(batch).stream()
            .map(EnrollmentResponse::fromEntity)
            .collect(Collectors.toList());
    }

    @Transactional
    public EnrollmentResponse updateEnrollmentStatus(Long batchId, Long enrollmentId, EnrollmentStatus status, User faculty) {
        Batch batch = batchRepository.findById(batchId)
            .orElseThrow(() -> new IllegalArgumentException("Batch not found with id: " + batchId));

        validateFacultyOwnership(batch.getCourse(), faculty);

        Enrollment enrollment = enrollmentRepository.findById(enrollmentId)
            .orElseThrow(() -> new IllegalArgumentException("Enrollment not found with id: " + enrollmentId));

        if (!enrollment.getBatch().getId().equals(batchId)) {
            throw new IllegalArgumentException("Enrollment does not belong to this batch");
        }

        enrollment.setStatus(status);
        return EnrollmentResponse.fromEntity(enrollment);
    }

    private void validateFacultyOwnership(Course course, User faculty) {
        boolean isOwner = course.getOwner().getId().equals(faculty.getId());
        boolean isCoFaculty = course.getCoFaculty().stream().anyMatch(f -> f.getId().equals(faculty.getId()));
        if (!isOwner && !isCoFaculty) {
            throw new AccessDeniedException("You do not have permission to manage batches for this course");
        }
    }
}
