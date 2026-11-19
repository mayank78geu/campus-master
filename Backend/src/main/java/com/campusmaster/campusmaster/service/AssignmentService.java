package com.campusmaster.campusmaster.service;

import com.campusmaster.campusmaster.dto.assignment.AssignmentResponse;
import com.campusmaster.campusmaster.dto.assignment.CloneAssignmentRequest;
import com.campusmaster.campusmaster.dto.assignment.CreateAssignmentRequest;
import com.campusmaster.campusmaster.dto.assignment.DeadlineResponse;
import com.campusmaster.campusmaster.dto.assignment.SubmissionResponse;
import com.campusmaster.campusmaster.entity.*;
import com.campusmaster.campusmaster.exception.BadRequestException;
import com.campusmaster.campusmaster.exception.ResourceNotFoundException;
import com.campusmaster.campusmaster.repository.*;
import com.campusmaster.campusmaster.service.storage.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AssignmentService {

    private final AssignmentRepository assignmentRepository;
    private final SubmissionRepository submissionRepository;
    private final BatchRepository batchRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final NotificationService notificationService;
    private final CourseAccessService courseAccessService;
    private final StorageService storageService;

    @Transactional
    public AssignmentResponse createAssignment(Long batchId, CreateAssignmentRequest request, User user) {
        Batch batch = batchRepository.findById(batchId)
            .orElseThrow(() -> new ResourceNotFoundException("Batch not found"));

        Course course = batch.getCourse();
        courseAccessService.requireFacultyOf(course, user);

        Assignment assignment = Assignment.builder()
            .batch(batch)
            .title(request.getTitle())
            .instructions(request.getInstructions())
            .dueDate(request.getDueDate())
            .maxMarks(request.getMaxMarks() != null ? request.getMaxMarks() : 100)
            .latePolicy(request.getLatePolicy() != null ? request.getLatePolicy() : LatePolicy.BLOCK_AFTER_DEADLINE)
            .createdBy(user)
            .build();

        if (request.getAttachments() != null) {
            for (CreateAssignmentRequest.AttachmentDto attDto : request.getAttachments()) {
                AssignmentAttachment att = AssignmentAttachment.builder()
                    .assignment(assignment)
                    .fileName(attDto.getFileName())
                    .fileUrl(attDto.getFileUrl())
                    .fileSize(attDto.getFileSize())
                    .build();
                assignment.getAttachments().add(att);
            }
        }

        assignment = assignmentRepository.save(assignment);

        // Notify enrolled students in batch
        notificationService.notifyBatchStudents(
            batch,
            "New Assignment: " + assignment.getTitle(),
            "Assignment '" + assignment.getTitle() + "' was assigned in " + course.getName() + " (" + batch.getName() + "). Due: " + assignment.getDueDate().toLocalDate(),
            "ASSIGNMENT_CREATED",
            "/courses/" + course.getId() + "?batch=" + batch.getId() + "&tab=assignments"
        );

        return mapToResponse(assignment, user);
    }

    @Transactional(readOnly = true)
    public List<AssignmentResponse> getBatchAssignments(Long batchId, User user) {
        Batch batch = batchRepository.findById(batchId)
            .orElseThrow(() -> new ResourceNotFoundException("Batch not found"));
        courseAccessService.requireMemberOfBatch(batch, user);

        List<Assignment> assignments = assignmentRepository.findByBatchIdOrderByDueDateAsc(batchId);
        return assignments.stream()
            .map(a -> mapToResponse(a, user))
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AssignmentResponse getAssignmentById(Long id, User user) {
        Assignment assignment = assignmentRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Assignment not found"));
        courseAccessService.requireMemberOfBatch(assignment.getBatch(), user);
        return mapToResponse(assignment, user);
    }

    @Transactional
    public AssignmentResponse cloneAssignment(Long assignmentId, CloneAssignmentRequest request, User user) {
        Assignment source = assignmentRepository.findById(assignmentId)
            .orElseThrow(() -> new ResourceNotFoundException("Source assignment not found"));

        Batch targetBatch = batchRepository.findById(request.getTargetBatchId())
            .orElseThrow(() -> new ResourceNotFoundException("Target batch not found"));

        // SEC-07: Require faculty authorization on both source course and target course
        courseAccessService.requireFacultyOf(source.getBatch().getCourse(), user);
        courseAccessService.requireFacultyOf(targetBatch.getCourse(), user);

        Course course = targetBatch.getCourse();
        Assignment cloned = Assignment.builder()
            .batch(targetBatch)
            .title(source.getTitle())
            .instructions(source.getInstructions())
            .dueDate(request.getNewDueDate())
            .maxMarks(source.getMaxMarks())
            .latePolicy(source.getLatePolicy())
            .createdBy(user)
            .build();

        for (AssignmentAttachment att : source.getAttachments()) {
            cloned.getAttachments().add(AssignmentAttachment.builder()
                .assignment(cloned)
                .fileName(att.getFileName())
                .fileUrl(att.getFileUrl())
                .fileSize(att.getFileSize())
                .build());
        }

        cloned = assignmentRepository.save(cloned);

        // Notify enrolled students in target batch
        notificationService.notifyBatchStudents(
            targetBatch,
            "New Assignment: " + cloned.getTitle(),
            "Assignment '" + cloned.getTitle() + "' was assigned in " + course.getName() + " (" + targetBatch.getName() + "). Due: " + cloned.getDueDate().toLocalDate(),
            "ASSIGNMENT_CREATED",
            "/courses/" + course.getId() + "?batch=" + targetBatch.getId() + "&tab=assignments"
        );

        return mapToResponse(cloned, user);
    }

    @Transactional
    public void publishGrades(Long assignmentId, User user) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
            .orElseThrow(() -> new ResourceNotFoundException("Assignment not found"));

        Course course = assignment.getBatch().getCourse();
        courseAccessService.requireFacultyOf(course, user);

        List<Submission> submissions = submissionRepository.findByAssignmentId(assignmentId);
        for (Submission s : submissions) {
            if (!s.isMarksPublished() && s.getMarks() != null) {
                s.setMarksPublished(true);
                submissionRepository.save(s);

                // Notify individual student privately
                notificationService.notifyUser(
                    s.getStudent(),
                    "Grades Published: " + assignment.getTitle(),
                    "Your marks and feedback for assignment '" + assignment.getTitle() + "' are now available. Score: " + s.getMarks() + "/" + assignment.getMaxMarks(),
                    "GRADES_PUBLISHED",
                    "/courses/" + course.getId() + "?batch=" + assignment.getBatch().getId() + "&tab=assignments"
                );
            }
        }
    }

    @Transactional(readOnly = true)
    public List<DeadlineResponse> getUpcomingDeadlines(User student) {
        List<Enrollment> enrollments = enrollmentRepository.findByStudentAndStatusOrderByJoinedAtDesc(student, EnrollmentStatus.ACTIVE);
        List<Long> batchIds = enrollments.stream().map(e -> e.getBatch().getId()).collect(Collectors.toList());

        if (batchIds.isEmpty()) {
            return new ArrayList<>();
        }

        List<Assignment> assignments = assignmentRepository.findByBatchIdInOrderByDueDateAsc(batchIds);
        List<DeadlineResponse> deadlines = new ArrayList<>();

        for (Assignment a : assignments) {
            Optional<Submission> submissionOpt = submissionRepository.findByAssignmentIdAndStudentId(a.getId(), student.getId());
            boolean submitted = submissionOpt.isPresent();
            boolean isLate = submitted && submissionOpt.get().isLate();
            Double marks = (submitted && submissionOpt.get().isMarksPublished()) ? submissionOpt.get().getMarks() : null;
            boolean marksPublished = submitted && submissionOpt.get().isMarksPublished();
            String receiptToken = submitted ? submissionOpt.get().getReceiptToken() : null;

            deadlines.add(DeadlineResponse.builder()
                .assignmentId(a.getId())
                .batchId(a.getBatch().getId())
                .batchName(a.getBatch().getName())
                .courseId(a.getBatch().getCourse().getId())
                .courseName(a.getBatch().getCourse().getName())
                .courseCode(a.getBatch().getCourse().getCode())
                .title(a.getTitle())
                .dueDate(a.getDueDate())
                .maxMarks(a.getMaxMarks())
                .latePolicy(a.getLatePolicy())
                .submitted(submitted)
                .isLate(isLate)
                .marks(marks)
                .marksPublished(marksPublished)
                .receiptToken(receiptToken)
                .build());
        }

        return deadlines;
    }

    private AssignmentResponse mapToResponse(Assignment assignment, User user) {
        Batch batch = assignment.getBatch();
        Course course = batch.getCourse();

        long submissionCount = submissionRepository.countByAssignmentId(assignment.getId());
        long totalStudents = batch.getEnrollments().stream()
            .filter(e -> e.getStatus() == EnrollmentStatus.ACTIVE)
            .count();

        SubmissionResponse mySubmissionDto = null;
        if (user != null && user.getRole() == Role.STUDENT) {
            Optional<Submission> mySub = submissionRepository.findByAssignmentIdAndStudentId(assignment.getId(), user.getId());
            if (mySub.isPresent()) {
                Submission s = mySub.get();
                mySubmissionDto = SubmissionResponse.builder()
                    .id(s.getId())
                    .assignmentId(assignment.getId())
                    .studentId(s.getStudent().getId())
                    .studentName(s.getStudent().getName())
                    .studentEmail(s.getStudent().getEmail())
                    .submittedAt(s.getSubmittedAt())
                    .isLate(s.isLate())
                    .textContent(s.getTextContent())
                    .receiptToken(s.getReceiptToken())
                    .marks(s.isMarksPublished() ? s.getMarks() : null)
                    .feedback(s.isMarksPublished() ? s.getFeedback() : null)
                    .marksPublished(s.isMarksPublished())
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
        }

        return AssignmentResponse.builder()
            .id(assignment.getId())
            .batchId(batch.getId())
            .batchName(batch.getName())
            .courseId(course.getId())
            .courseName(course.getName())
            .courseCode(course.getCode())
            .title(assignment.getTitle())
            .instructions(assignment.getInstructions())
            .dueDate(assignment.getDueDate())
            .maxMarks(assignment.getMaxMarks())
            .latePolicy(assignment.getLatePolicy())
            .createdByName(assignment.getCreatedBy() != null ? assignment.getCreatedBy().getName() : "")
            .createdAt(assignment.getCreatedAt())
            .submissionCount(submissionCount)
            .totalStudents(totalStudents)
            .mySubmission(mySubmissionDto)
            .attachments(assignment.getAttachments().stream().map(att ->
                AssignmentResponse.AttachmentDto.builder()
                    .id(att.getId())
                    .fileName(att.getFileName())
                    .fileUrl(storageService.getDownloadUrl(att.getFileUrl()))
                    .fileSize(att.getFileSize())
                    .build()
            ).collect(Collectors.toList()))
            .build();
    }
}
