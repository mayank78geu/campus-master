package com.campusmaster.campusmaster.correctness;

import com.campusmaster.campusmaster.dto.assignment.GradeSubmissionRequest;
import com.campusmaster.campusmaster.dto.assignment.SubmissionResponse;
import com.campusmaster.campusmaster.dto.batch.EnrollmentResponse;
import com.campusmaster.campusmaster.entity.*;
import com.campusmaster.campusmaster.exception.BadRequestException;
import com.campusmaster.campusmaster.repository.*;
import com.campusmaster.campusmaster.service.AnalyticsService;
import com.campusmaster.campusmaster.service.AssignmentService;
import com.campusmaster.campusmaster.service.BatchService;
import com.campusmaster.campusmaster.service.SubmissionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class ServicePolicyIntegrationTests {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private BatchRepository batchRepository;

    @Autowired
    private EnrollmentRepository enrollmentRepository;

    @Autowired
    private AssignmentRepository assignmentRepository;

    @Autowired
    private SubmissionRepository submissionRepository;

    @Autowired
    private BatchService batchService;

    @Autowired
    private SubmissionService submissionService;

    @Autowired
    private AssignmentService assignmentService;

    @Autowired
    private AnalyticsService analyticsService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private User faculty;
    private User student1;
    private User student2;

    private Course course;
    private Batch autoBatch;
    private Batch approvalBatch;

    @BeforeEach
    void setUp() {
        faculty = userRepository.save(User.builder()
                .name("Faculty Policy")
                .email("faculty.policy@test.com")
                .password(passwordEncoder.encode("Pass123!"))
                .role(Role.FACULTY)
                .isVerified(true)
                .build());

        student1 = userRepository.save(User.builder()
                .name("=Student One")
                .email("student1.policy@test.com")
                .password(passwordEncoder.encode("Pass123!"))
                .role(Role.STUDENT)
                .isVerified(true)
                .build());

        student2 = userRepository.save(User.builder()
                .name("+Student Two")
                .email("student2.policy@test.com")
                .password(passwordEncoder.encode("Pass123!"))
                .role(Role.STUDENT)
                .isVerified(true)
                .build());

        course = courseRepository.save(Course.builder()
                .code("POL101")
                .name("Policy Course")
                .owner(faculty)
                .build());

        autoBatch = batchRepository.save(Batch.builder()
                .name("Auto Approve Batch")
                .course(course)
                .joinCode("AUTOBATCH")
                .joinMode(JoinMode.AUTO_APPROVE)
                .status(BatchStatus.ACTIVE)
                .build());

        approvalBatch = batchRepository.save(Batch.builder()
                .name("Approval Required Batch")
                .course(course)
                .joinCode("APPROVEBATCH")
                .joinMode(JoinMode.FACULTY_APPROVAL)
                .status(BatchStatus.ACTIVE)
                .build());
    }

    // --- Join flow (auto vs approval, re-join) ---
    @Test
    @DisplayName("Join Flow: AUTO_APPROVE produces ACTIVE, APPROVAL_REQUIRED produces PENDING, REJECTED blocks rejoin")
    void testJoinFlowAndRejection() {
        // Auto approve
        EnrollmentResponse autoResp = batchService.joinBatchWithCode("AUTOBATCH", student1);
        assertEquals(EnrollmentStatus.ACTIVE, autoResp.getStatus());

        // Approval required
        EnrollmentResponse appResp = batchService.joinBatchWithCode("APPROVEBATCH", student1);
        assertEquals(EnrollmentStatus.PENDING, appResp.getStatus());

        // Re-joining while pending throws BadRequestException
        assertThrows(BadRequestException.class, () -> batchService.joinBatchWithCode("APPROVEBATCH", student1));

        // Faculty rejects the pending student
        Enrollment appEnrollment = enrollmentRepository.findByStudentAndBatch(student1, approvalBatch).orElseThrow();
        appEnrollment.setStatus(EnrollmentStatus.REJECTED);
        enrollmentRepository.save(appEnrollment);

        // Rejected student attempting to rejoin throws AccessDeniedException
        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                batchService.joinBatchWithCode("APPROVEBATCH", student1));
        assertTrue(ex.getMessage().contains("rejected"));
    }

    // --- Late policy (BLOCK_AFTER_DEADLINE vs ACCEPT_MARK_LATE) ---
    @Test
    @DisplayName("Late Policy: BLOCK_AFTER_DEADLINE blocks, ACCEPT_MARK_LATE accepts with isLate=true")
    void testLatePolicy() {
        // Enroll student in autoBatch
        batchService.joinBatchWithCode("AUTOBATCH", student1);

        // Past deadline assignment with BLOCK_AFTER_DEADLINE
        Assignment blockAssignment = assignmentRepository.save(Assignment.builder()
                .title("Strict Deadline")
                .instructions("No late submissions")
                .batch(autoBatch)
                .createdBy(faculty)
                .dueDate(LocalDateTime.now().minusHours(2))
                .maxMarks(100)
                .latePolicy(LatePolicy.BLOCK_AFTER_DEADLINE)
                .build());

        // Attempting submission after deadline throws BadRequestException
        assertThrows(BadRequestException.class, () ->
                submissionService.submitAssignment(blockAssignment.getId(), "My Work", null, student1));

        // Past deadline assignment with ACCEPT_MARK_LATE
        Assignment acceptLateAssignment = assignmentRepository.save(Assignment.builder()
                .title("Flexible Deadline")
                .instructions("Late allowed")
                .batch(autoBatch)
                .createdBy(faculty)
                .dueDate(LocalDateTime.now().minusHours(2))
                .maxMarks(100)
                .latePolicy(LatePolicy.ACCEPT_MARK_LATE)
                .build());

        // Submission succeeds with isLate = true
        SubmissionResponse subResp = submissionService.submitAssignment(acceptLateAssignment.getId(), "Late work", null, student1);
        assertNotNull(subResp.getReceiptToken());
        assertTrue(subResp.isLate());
    }

    // --- Grading bounds and Regrading ---
    @Test
    @DisplayName("Grading Bounds: marks < 0 or marks > maxMarks rejected; regrade flag required on published")
    void testGradingBoundsAndPublication() {
        batchService.joinBatchWithCode("AUTOBATCH", student1);

        Assignment assignment = assignmentRepository.save(Assignment.builder()
                .title("Graded Work")
                .instructions("Check bounds")
                .batch(autoBatch)
                .createdBy(faculty)
                .dueDate(LocalDateTime.now().plusDays(5))
                .maxMarks(50)
                .latePolicy(LatePolicy.BLOCK_AFTER_DEADLINE)
                .build());

        SubmissionResponse subResp = submissionService.submitAssignment(assignment.getId(), "Valid work", null, student1);

        // Marks < 0 rejected
        GradeSubmissionRequest negRequest = new GradeSubmissionRequest();
        negRequest.setMarks(-5.0);
        negRequest.setFeedback("Negative marks");
        assertThrows(BadRequestException.class, () ->
                submissionService.gradeSubmission(subResp.getId(), negRequest, faculty));

        // Marks > maxMarks (50) rejected
        GradeSubmissionRequest highRequest = new GradeSubmissionRequest();
        highRequest.setMarks(55.0);
        highRequest.setFeedback("Too high");
        assertThrows(BadRequestException.class, () ->
                submissionService.gradeSubmission(subResp.getId(), highRequest, faculty));

        // Valid marks (45 / 50) succeeds
        GradeSubmissionRequest validRequest = new GradeSubmissionRequest();
        validRequest.setMarks(45.0);
        validRequest.setFeedback("Good job");
        SubmissionResponse graded = submissionService.gradeSubmission(subResp.getId(), validRequest, faculty);
        assertEquals(45.0, graded.getMarks());

        // Publish grades
        assignmentService.publishGrades(assignment.getId(), faculty);

        Submission published = submissionRepository.findById(subResp.getId()).orElseThrow();
        assertTrue(published.isMarksPublished());

        // Changing grade without regrade=true throws BadRequestException
        GradeSubmissionRequest changeWithoutRegrade = new GradeSubmissionRequest();
        changeWithoutRegrade.setMarks(48.0);
        changeWithoutRegrade.setFeedback("Regraded");
        assertThrows(BadRequestException.class, () ->
                submissionService.gradeSubmission(subResp.getId(), changeWithoutRegrade, faculty));

        // Changing grade with regrade=true succeeds
        GradeSubmissionRequest changeWithRegrade = new GradeSubmissionRequest();
        changeWithRegrade.setMarks(48.0);
        changeWithRegrade.setFeedback("Regraded");
        changeWithRegrade.setRegrade(true);
        SubmissionResponse regraded = submissionService.gradeSubmission(subResp.getId(), changeWithRegrade, faculty);
        assertEquals(48.0, regraded.getMarks());
    }

    // --- Resubmission mechanics (D3) ---
    @Test
    @DisplayName("Resubmission: retains receipt token, increments version, resets marks and published state")
    void testResubmissionMechanics() {
        batchService.joinBatchWithCode("AUTOBATCH", student1);

        Assignment assignment = assignmentRepository.save(Assignment.builder()
                .title("Resubmit Assignment")
                .instructions("Test resubmit")
                .batch(autoBatch)
                .createdBy(faculty)
                .dueDate(LocalDateTime.now().plusDays(5))
                .maxMarks(100)
                .latePolicy(LatePolicy.BLOCK_AFTER_DEADLINE)
                .build());

        SubmissionResponse sub1 = submissionService.submitAssignment(assignment.getId(), "First version", null, student1);
        String initialToken = sub1.getReceiptToken();
        assertEquals(1, sub1.getVersion());

        // Grade and publish
        GradeSubmissionRequest gradeReq = new GradeSubmissionRequest();
        gradeReq.setMarks(80.0);
        submissionService.gradeSubmission(sub1.getId(), gradeReq, faculty);
        assignmentService.publishGrades(assignment.getId(), faculty);

        Submission subEntity = submissionRepository.findById(sub1.getId()).orElseThrow();
        assertTrue(subEntity.isMarksPublished());

        // Resubmit
        SubmissionResponse sub2 = submissionService.submitAssignment(assignment.getId(), "Second version", null, student1);
        assertEquals(initialToken, sub2.getReceiptToken(), "Receipt token must remain identical per D3");
        assertEquals(2, sub2.getVersion(), "Version must increment");
        assertNull(sub2.getMarks(), "Marks must be reset to null on resubmission");
        assertNull(sub2.getFeedback(), "Feedback must be reset to null on resubmission");
        assertFalse(sub2.isMarksPublished(), "MarksPublished must be reset to false");
    }

    // --- Receipt masking ---
    @Test
    @DisplayName("Receipt Masking: unpublished grades hidden from student, visible to faculty")
    void testReceiptMasking() {
        batchService.joinBatchWithCode("AUTOBATCH", student1);

        Assignment assignment = assignmentRepository.save(Assignment.builder()
                .title("Masked Assignment")
                .instructions("Test receipt masking")
                .batch(autoBatch)
                .createdBy(faculty)
                .dueDate(LocalDateTime.now().plusDays(5))
                .maxMarks(100)
                .latePolicy(LatePolicy.BLOCK_AFTER_DEADLINE)
                .build());

        SubmissionResponse sub = submissionService.submitAssignment(assignment.getId(), "Mask work", null, student1);

        // Grade but do NOT publish
        GradeSubmissionRequest gradeReq = new GradeSubmissionRequest();
        gradeReq.setMarks(90.0);
        gradeReq.setFeedback("Secret draft grade");
        submissionService.gradeSubmission(sub.getId(), gradeReq, faculty);

        // Student fetches by receipt -> marks and feedback are masked (null)
        SubmissionResponse studentView = submissionService.getSubmissionByReceipt(sub.getReceiptToken(), student1);
        assertNull(studentView.getMarks());
        assertNull(studentView.getFeedback());

        // Faculty fetches by receipt -> marks and feedback are visible
        SubmissionResponse facultyView = submissionService.getSubmissionByReceipt(sub.getReceiptToken(), faculty);
        assertEquals(90.0, facultyView.getMarks());
        assertEquals("Secret draft grade", facultyView.getFeedback());
    }

    // --- CSV export safety (SEC-11 formula injection) ---
    @Test
    @DisplayName("CSV Export Safety: formula characters (=, +, -, @) escaped with single quote")
    void testCsvFormulaInjectionEscaping() {
        batchService.joinBatchWithCode("AUTOBATCH", student1); // student1 name starts with '='
        batchService.joinBatchWithCode("AUTOBATCH", student2); // student2 name starts with '+'

        Assignment assignment = assignmentRepository.save(Assignment.builder()
                .title("@DangerousFormula")
                .instructions("Test formula title")
                .batch(autoBatch)
                .createdBy(faculty)
                .dueDate(LocalDateTime.now().plusDays(5))
                .maxMarks(100)
                .latePolicy(LatePolicy.BLOCK_AFTER_DEADLINE)
                .build());

        String gradesCsv = analyticsService.generateGradesCsv(autoBatch.getId(), faculty);
        assertTrue(gradesCsv.contains("''=Student One\"") || gradesCsv.contains("'=Student One"),
                "Formula '=' in student name must be escaped: " + gradesCsv);
        assertTrue(gradesCsv.contains("''+Student Two\"") || gradesCsv.contains("'+Student Two"),
                "Formula '+' in student name must be escaped: " + gradesCsv);
        assertTrue(gradesCsv.contains("'@DangerousFormula"),
                "Formula '@' in assignment title must be escaped: " + gradesCsv);

        String rosterCsv = analyticsService.generateRosterCsv(autoBatch.getId(), faculty);
        assertTrue(rosterCsv.contains("'=Student One") || rosterCsv.contains("''=Student One"));
        assertTrue(rosterCsv.contains("'+Student Two") || rosterCsv.contains("''+Student Two"));
    }
}
