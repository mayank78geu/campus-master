package com.campusmaster.campusmaster.security;

import com.campusmaster.campusmaster.dto.assignment.CloneAssignmentRequest;
import com.campusmaster.campusmaster.entity.*;
import com.campusmaster.campusmaster.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.time.LocalDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@Transactional
public class Phase0SecurityTests {

    @Autowired
    private WebApplicationContext webApplicationContext;

    private MockMvc mockMvc;

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
    private JwtUtils jwtUtils;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private ObjectMapper objectMapper = new ObjectMapper();

    private User ownerFaculty;
    private User otherFaculty;
    private User enrolledStudent;
    private User nonEnrolledStudent;

    private Course courseA;
    private Batch batchA;
    private Assignment assignmentA;
    private Submission submissionY;

    private Course courseB;
    private Batch batchB;

    private String tokenOwner;
    private String tokenOtherFaculty;
    private String tokenEnrolled;
    private String tokenNonEnrolled;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();

        ownerFaculty = userRepository.save(User.builder()
                .name("Owner Faculty")
                .email("owner.phase0@test.com")
                .password(passwordEncoder.encode("Password123!"))
                .role(Role.FACULTY)
                .isVerified(true)
                .build());

        otherFaculty = userRepository.save(User.builder()
                .name("Other Faculty")
                .email("other.faculty.phase0@test.com")
                .password(passwordEncoder.encode("Password123!"))
                .role(Role.FACULTY)
                .isVerified(true)
                .build());

        enrolledStudent = userRepository.save(User.builder()
                .name("Enrolled Student Y")
                .email("enrolled.y.phase0@test.com")
                .password(passwordEncoder.encode("Password123!"))
                .role(Role.STUDENT)
                .isVerified(true)
                .build());

        nonEnrolledStudent = userRepository.save(User.builder()
                .name("Non-Enrolled Student X")
                .email("nonenrolled.x.phase0@test.com")
                .password(passwordEncoder.encode("Password123!"))
                .role(Role.STUDENT)
                .isVerified(true)
                .build());

        courseA = courseRepository.save(Course.builder()
                .name("Data Structures A")
                .code("CS-A101")
                .description("Intro to CS")
                .program("MCA")
                .semester("Semester 3")
                .owner(ownerFaculty)
                .isArchived(false)
                .build());

        batchA = batchRepository.save(Batch.builder()
                .name("Batch A-1")
                .course(courseA)
                .joinCode("CODEA1")
                .joinMode(JoinMode.AUTO_APPROVE)
                .status(BatchStatus.ACTIVE)
                .term("Fall 2026")
                .build());

        enrollmentRepository.save(Enrollment.builder()
                .batch(batchA)
                .student(enrolledStudent)
                .status(EnrollmentStatus.ACTIVE)
                .build());

        assignmentA = assignmentRepository.save(Assignment.builder()
                .batch(batchA)
                .createdBy(ownerFaculty)
                .title("Assignment 1")
                .instructions("Complete trees problem")
                .dueDate(LocalDateTime.now().plusDays(7))
                .maxMarks(100)
                .latePolicy(LatePolicy.ACCEPT_MARK_LATE)
                .build());

        submissionY = submissionRepository.save(Submission.builder()
                .assignment(assignmentA)
                .student(enrolledStudent)
                .submittedAt(LocalDateTime.now().minusHours(2))
                .receiptToken("RCP-PHASE0-SEC05-TEST")
                .isLate(false)
                .marks(95.0)
                .feedback("Excellent work")
                .marksPublished(false) // Unpublished!
                .version(1)
                .build());

        courseB = courseRepository.save(Course.builder()
                .name("Algorithms B")
                .code("CS-B201")
                .description("Advanced Algorithms")
                .program("MCA")
                .semester("Semester 3")
                .owner(otherFaculty)
                .isArchived(false)
                .build());

        batchB = batchRepository.save(Batch.builder()
                .name("Batch B-1")
                .course(courseB)
                .joinCode("CODEB1")
                .joinMode(JoinMode.AUTO_APPROVE)
                .status(BatchStatus.ACTIVE)
                .term("Fall 2026")
                .build());

        tokenOwner = jwtUtils.generateToken(UserDetailsImpl.build(ownerFaculty));
        tokenOtherFaculty = jwtUtils.generateToken(UserDetailsImpl.build(otherFaculty));
        tokenEnrolled = jwtUtils.generateToken(UserDetailsImpl.build(enrolledStudent));
        tokenNonEnrolled = jwtUtils.generateToken(UserDetailsImpl.build(nonEnrolledStudent));
    }

    /**
     * SEC-02: Non-enrolled student GET /courses/{id}/batches must return 403 Forbidden.
     * Enrolled student should see batches without joinCode (joinCode == null).
     */
    @Test
    void testSec02_getBatchesByCourse_nonEnrolledStudentForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/courses/" + courseA.getId() + "/batches")
                .header("Authorization", "Bearer " + tokenNonEnrolled))
                .andExpect(status().isForbidden());
    }

    @Test
    void testSec02_getBatchesByCourse_enrolledStudentCannotSeeJoinCode() throws Exception {
        mockMvc.perform(get("/api/v1/courses/" + courseA.getId() + "/batches")
                .header("Authorization", "Bearer " + tokenEnrolled))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].joinCode").doesNotExist());
    }

    /**
     * SEC-03: Non-enrolled student GET /batches/{id}/assignments must return 403 Forbidden.
     */
    @Test
    void testSec03_getBatchAssignments_nonEnrolledStudentForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/batches/" + batchA.getId() + "/assignments")
                .header("Authorization", "Bearer " + tokenNonEnrolled))
                .andExpect(status().isForbidden());
    }

    /**
     * SEC-04: Faculty B GET /courses/{A}/resources must return 403 Forbidden.
     */
    @Test
    void testSec04_getResources_nonOwnerFacultyForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/courses/" + courseA.getId() + "/resources")
                .header("Authorization", "Bearer " + tokenOtherFaculty))
                .andExpect(status().isForbidden());
    }

    /**
     * SEC-05: Student X GET /submissions/receipt/{token of Y} must return 403 Forbidden.
     * And submitting student Y cannot see unpublished marks.
     */
    @Test
    void testSec05_getSubmissionByReceipt_otherStudentForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/submissions/receipt/" + submissionY.getReceiptToken())
                .header("Authorization", "Bearer " + tokenNonEnrolled))
                .andExpect(status().isForbidden());
    }

    @Test
    void testSec05_getSubmissionByReceipt_ownerStudentMasksUnpublishedMarks() throws Exception {
        mockMvc.perform(get("/api/v1/submissions/receipt/" + submissionY.getReceiptToken())
                .header("Authorization", "Bearer " + tokenEnrolled))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.marks").doesNotExist())
                .andExpect(jsonPath("$.data.feedback").doesNotExist());
    }

    /**
     * SEC-07: Faculty B POST /assignments/{A's id}/clone into Batch B must return 403 Forbidden
     * because Faculty B is not faculty of source Course A.
     */
    @Test
    void testSec07_cloneAssignment_nonFacultyOfSourceForbidden() throws Exception {
        String cloneJson = "{\"targetBatchId\":" + batchB.getId() + ",\"newDueDate\":\"" + LocalDateTime.now().plusDays(5) + "\"}";

        mockMvc.perform(post("/api/v1/assignments/" + assignmentA.getId() + "/clone")
                .header("Authorization", "Bearer " + tokenOtherFaculty)
                .contentType(MediaType.APPLICATION_JSON)
                .content(cloneJson))
                .andExpect(status().isForbidden());
    }
}
