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
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HexFormat;
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
    private final CourseAccessService courseAccessService;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private String generateReceiptToken(Long assignmentId) {
        byte[] randomBytes = new byte[16];
        SECURE_RANDOM.nextBytes(randomBytes);
        return "RCP-" + assignmentId + "-" + HexFormat.of().formatHex(randomBytes).toUpperCase();
    }

    @Transactional
    public SubmissionResponse submitAssignment(Long assignmentId, String textContent, List<MultipartFile> files, User student) {
        if (student.getRole() == Role.STUDENT && !student.isProfileCompleted()) {
            throw new BadRequestException("Please complete your student profile before submitting assignments.");
        }

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

        Optional<Submission> existingOpt = submissionRepository.findByAssignmentIdAndStudentId(assignmentId, student.getId());
        boolean wasRejected = existingOpt.isPresent() && existingOpt.get().getStatus() == SubmissionStatus.REJECTED;

        // If assignment deadline passed and late policy blocks, allow only if student was asked to resubmit
        if (isLate && assignment.getLatePolicy() == LatePolicy.BLOCK_AFTER_DEADLINE && !wasRejected) {
            throw new BadRequestException("Submissions are closed for this assignment. Deadline has passed.");
        }

        Submission submission;

        if (existingOpt.isPresent()) {
            submission = existingOpt.get();
            submission.setVersion(submission.getVersion() + 1);
            submission.setSubmittedAt(now);
            submission.setLate(isLate);
            if (textContent != null) {
                submission.setTextContent(textContent);
            }
            // Per D3: Keep the same receipt token per assignment+student
            // Reset marks, feedback, marksPublished flag
            submission.setMarks(null);
            submission.setFeedback(null);
            submission.setMarksPublished(false);
            submission.setStatus(SubmissionStatus.SUBMITTED);
            submission.setRejectionReason(null);
            submission.setRejectedAt(null);
            // Replace previous attachments
            submission.getAttachments().clear();
        } else {
            submission = Submission.builder()
                .assignment(assignment)
                .student(student)
                .submittedAt(now)
                .isLate(isLate)
                .textContent(textContent)
                .receiptToken(generateReceiptToken(assignment.getId()))
                .version(1)
                .marksPublished(false)
                .status(SubmissionStatus.SUBMITTED)
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

        // Notify faculty owner and co-faculty (FUN-17)
        Course course = batch.getCourse();
        String notifMsg = student.getName() + " submitted assignment '" + assignment.getTitle() + "' (" + batch.getName() + ")" + (isLate ? " [LATE]" : "") + ". Receipt: " + submission.getReceiptToken();
        String targetUrl = "/courses/" + course.getId() + "?batch=" + batch.getId() + "&tab=assignments";

        notificationService.notifyUser(
            course.getOwner(),
            "New Submission: " + assignment.getTitle(),
            notifMsg,
            "SUBMISSION_RECEIVED",
            targetUrl
        );
        if (course.getCoFaculty() != null) {
            for (User coFaculty : course.getCoFaculty()) {
                notificationService.notifyUser(
                    coFaculty,
                    "New Submission: " + assignment.getTitle(),
                    notifMsg,
                    "SUBMISSION_RECEIVED",
                    targetUrl
                );
            }
        }

        return mapToResponse(submission);
    }

    @Transactional(readOnly = true)
    public List<SubmissionResponse> getAssignmentSubmissions(Long assignmentId, User faculty) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
            .orElseThrow(() -> new ResourceNotFoundException("Assignment not found"));

        Course course = assignment.getBatch().getCourse();
        courseAccessService.requireFacultyOf(course, faculty);

        List<Submission> submissions = submissionRepository.findByAssignmentId(assignmentId);
        return submissions.stream()
            .map(s -> mapToResponse(s, faculty))
            .collect(Collectors.toList());
    }

    @Transactional
    public SubmissionResponse gradeSubmission(Long submissionId, GradeSubmissionRequest request, User faculty) {
        Submission submission = submissionRepository.findById(submissionId)
            .orElseThrow(() -> new ResourceNotFoundException("Submission not found"));

        Assignment assignment = submission.getAssignment();
        Course course = assignment.getBatch().getCourse();
        courseAccessService.requireFacultyOf(course, faculty);

        if (request.getMarks() < 0 || request.getMarks() > assignment.getMaxMarks()) {
            throw new BadRequestException("Marks must be between 0 and " + assignment.getMaxMarks());
        }

        if (submission.isMarksPublished() && !Boolean.TRUE.equals(request.getRegrade())) {
            throw new BadRequestException("Submission has already been published. Set regrade=true to re-grade.");
        }

        submission.setMarks(request.getMarks());
        submission.setFeedback(request.getFeedback());
        submission.setStatus(SubmissionStatus.EVALUATED);
        submission.setRejectionReason(null);
        submission.setRejectedAt(null);
        submission = submissionRepository.save(submission);

        if (submission.isMarksPublished() && Boolean.TRUE.equals(request.getRegrade())) {
            notificationService.notifyUser(
                submission.getStudent(),
                "Grades Updated: " + assignment.getTitle(),
                "Your marks and feedback for assignment '" + assignment.getTitle() + "' have been updated. Score: " + submission.getMarks() + "/" + assignment.getMaxMarks(),
                "GRADES_PUBLISHED",
                "/courses/" + course.getId() + "?batch=" + assignment.getBatch().getId() + "&tab=assignments"
            );
        }

        return mapToResponse(submission, faculty);
    }

    @Transactional
    public SubmissionResponse rejectSubmission(Long submissionId, com.campusmaster.campusmaster.dto.assignment.RejectSubmissionRequest request, User faculty) {
        Submission submission = submissionRepository.findById(submissionId)
            .orElseThrow(() -> new ResourceNotFoundException("Submission not found"));

        Assignment assignment = submission.getAssignment();
        Course course = assignment.getBatch().getCourse();
        courseAccessService.requireFacultyOf(course, faculty);

        submission.setStatus(SubmissionStatus.REJECTED);
        submission.setRejectionReason(request.getReason() != null ? request.getReason().trim() : "Resubmission requested by instructor");
        submission.setRejectedAt(LocalDateTime.now());
        submission.setMarks(null);
        submission.setMarksPublished(false);
        submission = submissionRepository.save(submission);

        notificationService.notifyUser(
            submission.getStudent(),
            "Submission Rejected: " + assignment.getTitle(),
            "Your submission for assignment '" + assignment.getTitle() + "' was rejected by the instructor. Reason: " + submission.getRejectionReason() + ". Please resubmit your work.",
            "SUBMISSION_REJECTED",
            "/courses/" + course.getId() + "?batch=" + assignment.getBatch().getId() + "&tab=assignments"
        );

        return mapToResponse(submission, faculty);
    }

    @Transactional(readOnly = true)
    public SubmissionResponse getSubmissionByReceipt(String receiptToken, User user) {
        Submission submission = submissionRepository.findByReceiptToken(receiptToken)
            .orElseThrow(() -> new ResourceNotFoundException("Submission receipt not found"));

        Course course = submission.getAssignment().getBatch().getCourse();
        boolean isFaculty = courseAccessService.isFacultyOf(course, user);
        boolean isSubmittingStudent = user != null && user.getId().equals(submission.getStudent().getId());

        if (!isFaculty && !isSubmittingStudent) {
            throw new AccessDeniedException("Access denied: You are not authorized to view this receipt");
        }

        return mapToResponse(submission, user);
    }

    @Transactional(readOnly = true)
    public List<SubmissionResponse> getFacultyPendingSubmissions(User faculty) {
        return submissionRepository.findByAssignment_Batch_Course_OwnerAndMarksIsNullOrderBySubmittedAtDesc(faculty)
            .stream()
            .map(s -> mapToResponse(s, faculty))
            .collect(Collectors.toList());
    }

    private SubmissionResponse mapToResponse(Submission s, User viewer) {
        boolean isFaculty = viewer != null && courseAccessService.isFacultyOf(s.getAssignment().getBatch().getCourse(), viewer);
        boolean canSeeMarks = isFaculty || s.isMarksPublished();

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
            .marks(canSeeMarks ? s.getMarks() : null)
            .feedback(canSeeMarks ? s.getFeedback() : null)
            .marksPublished(s.isMarksPublished())
            .status(s.getStatus())
            .rejectionReason(s.getRejectionReason())
            .rejectedAt(s.getRejectedAt())
            .version(s.getVersion())
            .attachments(s.getAttachments().stream().map(att ->
                SubmissionResponse.AttachmentDto.builder()
                    .id(att.getId())
                    .fileName(att.getFileName())
                    .fileUrl(storageService.getDownloadUrl(att.getFileUrl()))
                    .fileSize(att.getFileSize())
                    .build()
            ).collect(Collectors.toList()))
            .build();
    }

    private SubmissionResponse mapToResponse(Submission s) {
        return mapToResponse(s, null);
    }
}
