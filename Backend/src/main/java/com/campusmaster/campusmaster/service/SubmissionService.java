package com.campusmaster.campusmaster.service;

import com.campusmaster.campusmaster.dto.assignment.GradeSubmissionRequest;
import com.campusmaster.campusmaster.dto.assignment.SubmissionResponse;
import com.campusmaster.campusmaster.entity.*;
import com.campusmaster.campusmaster.exception.BadRequestException;
import com.campusmaster.campusmaster.exception.ResourceNotFoundException;
import com.campusmaster.campusmaster.repository.AssignmentRepository;
import com.campusmaster.campusmaster.repository.EnrollmentRepository;
import com.campusmaster.campusmaster.repository.SubmissionRepository;
import com.campusmaster.campusmaster.service.storage.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SubmissionService {

    private final SubmissionRepository submissionRepository;
    private final AssignmentRepository assignmentRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final StorageService storageService;
    private final NotificationService notificationService;

    @Transactional
    public SubmissionResponse submitAssignment(Long assignmentId, String textContent, List<MultipartFile> files, User student) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
            .orElseThrow(() -> new ResourceNotFoundException("Assignment not found"));

        Batch batch = assignment.getBatch();

        // Check if student is actively enrolled
        boolean isEnrolled = enrollmentRepository.findByStudentAndBatch(student, batch)
            .map(e -> e.getStatus() == EnrollmentStatus.ACTIVE)
            .orElse(false);

        if (!isEnrolled) {
            throw new BadRequestException("You are not enrolled in this batch");
        }

        LocalDateTime now = LocalDateTime.now();
        boolean isLate = now.isAfter(assignment.getDueDate());

        if (isLate && assignment.getLatePolicy() == LatePolicy.BLOCK_AFTER_DEADLINE) {
            throw new BadRequestException("Submissions are closed for this assignment. Deadline has passed.");
        }

        Optional<Submission> existingOpt = submissionRepository.findByAssignmentIdAndStudentId(assignmentId, student.getId());
        Submission submission;

        if (existingOpt.isPresent()) {
            submission = existingOpt.get();
            submission.setVersion(submission.getVersion() + 1);
            submission.setSubmittedAt(now);
            submission.setLate(isLate);
            if (textContent != null) {
                submission.setTextContent(textContent);
            }
            submission.setReceiptToken("RCP-" + String.format("%04d", assignment.getId()) + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        } else {
            submission = Submission.builder()
                .assignment(assignment)
                .student(student)
                .submittedAt(now)
                .isLate(isLate)
                .textContent(textContent)
                .receiptToken("RCP-" + String.format("%04d", assignment.getId()) + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .version(1)
                .marksPublished(false)
                .build();
        }

        if (files != null && !files.isEmpty()) {
            for (MultipartFile file : files) {
                if (!file.isEmpty()) {
                    String fileUrl = storageService.storeFile(file, "submissions");
                    SubmissionAttachment att = SubmissionAttachment.builder()
                        .submission(submission)
                        .fileName(file.getOriginalFilename())
                        .fileUrl(fileUrl)
                        .fileSize(file.getSize())
                        .build();
                    submission.getAttachments().add(att);
                }
            }
        }

        submission = submissionRepository.save(submission);

        // Notify faculty owner and co-faculty
        Course course = batch.getCourse();
        notificationService.notifyUser(
            course.getOwner(),
            "New Submission: " + assignment.getTitle(),
            student.getName() + " submitted assignment '" + assignment.getTitle() + "' (" + batch.getName() + ")" + (isLate ? " [LATE]" : "") + ". Receipt: " + submission.getReceiptToken(),
            "SUBMISSION_RECEIVED",
            "/course/" + course.getId() + "/batch/" + batch.getId()
        );

        return mapToResponse(submission);
    }

    @Transactional(readOnly = true)
    public List<SubmissionResponse> getAssignmentSubmissions(Long assignmentId, User faculty) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
            .orElseThrow(() -> new ResourceNotFoundException("Assignment not found"));

        Course course = assignment.getBatch().getCourse();
        boolean isOwner = course.getOwner().getId().equals(faculty.getId());
        boolean isCoFaculty = course.getCoFaculty().stream().anyMatch(f -> f.getId().equals(faculty.getId()));

        if (!isOwner && !isCoFaculty) {
            throw new BadRequestException("Only course faculty can view all submissions");
        }

        List<Submission> submissions = submissionRepository.findByAssignmentId(assignmentId);
        return submissions.stream()
            .map(this::mapToResponse)
            .collect(Collectors.toList());
    }

    @Transactional
    public SubmissionResponse gradeSubmission(Long submissionId, GradeSubmissionRequest request, User faculty) {
        Submission submission = submissionRepository.findById(submissionId)
            .orElseThrow(() -> new ResourceNotFoundException("Submission not found"));

        Assignment assignment = submission.getAssignment();
        Course course = assignment.getBatch().getCourse();
        boolean isOwner = course.getOwner().getId().equals(faculty.getId());
        boolean isCoFaculty = course.getCoFaculty().stream().anyMatch(f -> f.getId().equals(faculty.getId()));

        if (!isOwner && !isCoFaculty) {
            throw new BadRequestException("Only course faculty can grade submissions");
        }

        if (request.getMarks() < 0 || request.getMarks() > assignment.getMaxMarks()) {
            throw new BadRequestException("Marks must be between 0 and " + assignment.getMaxMarks());
        }

        submission.setMarks(request.getMarks());
        submission.setFeedback(request.getFeedback());
        submission = submissionRepository.save(submission);

        return mapToResponse(submission);
    }

    @Transactional(readOnly = true)
    public SubmissionResponse getSubmissionByReceipt(String receiptToken) {
        Submission submission = submissionRepository.findByReceiptToken(receiptToken)
            .orElseThrow(() -> new ResourceNotFoundException("Submission receipt not found"));
        return mapToResponse(submission);
    }

    private SubmissionResponse mapToResponse(Submission s) {
        return SubmissionResponse.builder()
            .id(s.getId())
            .assignmentId(s.getAssignment().getId())
            .studentId(s.getStudent().getId())
            .studentName(s.getStudent().getName())
            .studentEmail(s.getStudent().getEmail())
            .submittedAt(s.getSubmittedAt())
            .isLate(s.isLate())
            .textContent(s.getTextContent())
            .receiptToken(s.getReceiptToken())
            .marks(s.getMarks())
            .feedback(s.getFeedback())
            .marksPublished(s.isMarksPublished())
            .version(s.getVersion())
            .attachments(s.getAttachments().stream().map(att ->
                SubmissionResponse.AttachmentDto.builder()
                    .id(att.getId())
                    .fileName(att.getFileName())
                    .fileUrl(att.getFileUrl())
                    .fileSize(att.getFileSize())
                    .build()
            ).collect(Collectors.toList()))
            .build();
    }
}
