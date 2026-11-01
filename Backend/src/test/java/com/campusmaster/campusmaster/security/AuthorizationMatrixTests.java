package com.campusmaster.campusmaster.security;

import com.campusmaster.campusmaster.entity.*;
import com.campusmaster.campusmaster.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class AuthorizationMatrixTests {

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
    private ResourceRepository resourceRepository;

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private User ownerFaculty;
    private User coFaculty;
    private User otherFaculty;
    private User enrolledStudent;
    private User nonEnrolledStudent;

    private Course courseA;
    private Batch batchA;
    private Batch batchA2;
    private Assignment assignmentA;
    private Submission submissionA;
    private Resource publishedResource;
    private Resource draftResource;

    private String tokenOwner;
    private String tokenCoFaculty;
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
                .email("owner.auth@test.com")
                .password(passwordEncoder.encode("Password123!"))
                .role(Role.FACULTY)
                .isVerified(true)
                .build());

        coFaculty = userRepository.save(User.builder()
                .name("Co-Faculty")
                .email("cofaculty.auth@test.com")
                .password(passwordEncoder.encode("Password123!"))
                .role(Role.FACULTY)
                .isVerified(true)
                .build());

        otherFaculty = userRepository.save(User.builder()
                .name("Other Faculty")
                .email("other.auth@test.com")
                .password(passwordEncoder.encode("Password123!"))
                .role(Role.FACULTY)
                .isVerified(true)
                .build());

        enrolledStudent = userRepository.save(User.builder()
                .name("Enrolled Student")
                .email("enrolled.auth@test.com")
                .password(passwordEncoder.encode("Password123!"))
                .role(Role.STUDENT)
                .isVerified(true)
                .build());

        nonEnrolledStudent = userRepository.save(User.builder()
                .name("Non-Enrolled Student")
                .email("nonenrolled.auth@test.com")
                .password(passwordEncoder.encode("Password123!"))
                .role(Role.STUDENT)
                .isVerified(true)
                .build());

        courseA = courseRepository.save(Course.builder()
                .code("AUTH101")
                .name("Authorization Testing Course")
                .owner(ownerFaculty)
                .coFaculty(new HashSet<>(Set.of(coFaculty)))
                .build());

        batchA = batchRepository.save(Batch.builder()
                .name("Batch A1")
                .course(courseA)
                .joinCode("AUTHBATCH1")
                .joinMode(JoinMode.AUTO_APPROVE)
                .status(BatchStatus.ACTIVE)
                .build());

        batchA2 = batchRepository.save(Batch.builder()
                .name("Batch A2")
                .course(courseA)
                .joinCode("AUTHBATCH2")
                .joinMode(JoinMode.AUTO_APPROVE)
                .status(BatchStatus.ACTIVE)
                .build());

        enrollmentRepository.save(Enrollment.builder()
                .student(enrolledStudent)
                .batch(batchA)
                .status(EnrollmentStatus.ACTIVE)
                .build());

        assignmentA = assignmentRepository.save(Assignment.builder()
                .title("Matrix Assignment")
                .instructions("Test Instructions")
                .batch(batchA)
                .createdBy(ownerFaculty)
                .dueDate(LocalDateTime.now().plusDays(7))
                .maxMarks(100)
                .latePolicy(LatePolicy.BLOCK_AFTER_DEADLINE)
                .build());

        submissionA = submissionRepository.save(Submission.builder()
                .assignment(assignmentA)
                .student(enrolledStudent)
                .receiptToken("RCP-AUTH101-TEST1234567890ABCDEF")
                .submittedAt(LocalDateTime.now())
                .marks(95.0)
                .feedback("Excellent work")
                .marksPublished(false)
                .isLate(false)
                .version(1)
                .build());

        publishedResource = resourceRepository.save(Resource.builder()
                .title("Published Slide Deck")
                .resourceType(ResourceType.FILE)
                .fileUrl("https://example.com/published.pdf")
                .course(courseA)
                .createdBy(ownerFaculty)
                .isPublished(true)
                .build());

        draftResource = resourceRepository.save(Resource.builder()
                .title("Draft Exam Solution")
                .resourceType(ResourceType.FILE)
                .fileUrl("https://example.com/draft.pdf")
                .course(courseA)
                .createdBy(ownerFaculty)
                .isPublished(false)
                .build());

        tokenOwner = "Bearer " + jwtUtils.generateToken(UserDetailsImpl.build(ownerFaculty));
        tokenCoFaculty = "Bearer " + jwtUtils.generateToken(UserDetailsImpl.build(coFaculty));
        tokenOtherFaculty = "Bearer " + jwtUtils.generateToken(UserDetailsImpl.build(otherFaculty));
        tokenEnrolled = "Bearer " + jwtUtils.generateToken(UserDetailsImpl.build(enrolledStudent));
        tokenNonEnrolled = "Bearer " + jwtUtils.generateToken(UserDetailsImpl.build(nonEnrolledStudent));
    }

    // 1. GET /api/v1/courses/{id}/batches
    @Test
    @DisplayName("Matrix: GET /api/v1/courses/{id}/batches")
    void testBatchesAuthorizationMatrix() throws Exception {
        // Anonymous -> 401
        mockMvc.perform(get("/api/v1/courses/" + courseA.getId() + "/batches"))
                .andExpect(status().isUnauthorized());

        // Student not enrolled -> 403
        mockMvc.perform(get("/api/v1/courses/" + courseA.getId() + "/batches")
                .header("Authorization", tokenNonEnrolled))
                .andExpect(status().isForbidden());

        // Student enrolled -> 200, joinCode is null
        mockMvc.perform(get("/api/v1/courses/" + courseA.getId() + "/batches")
                .header("Authorization", tokenEnrolled))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].joinCode").doesNotExist());

        // Other faculty -> 403
        mockMvc.perform(get("/api/v1/courses/" + courseA.getId() + "/batches")
                .header("Authorization", tokenOtherFaculty))
                .andExpect(status().isForbidden());

        // Co-faculty -> 200, joinCode visible
        mockMvc.perform(get("/api/v1/courses/" + courseA.getId() + "/batches")
                .header("Authorization", tokenCoFaculty))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].joinCode", notNullValue()));

        // Owner faculty -> 200, joinCode visible
        mockMvc.perform(get("/api/v1/courses/" + courseA.getId() + "/batches")
                .header("Authorization", tokenOwner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].joinCode", notNullValue()));
    }

    // 2. GET /api/v1/batches/{id}/assignments
    @Test
    @DisplayName("Matrix: GET /api/v1/batches/{id}/assignments")
    void testBatchAssignmentsAuthorizationMatrix() throws Exception {
        // Anonymous -> 401
        mockMvc.perform(get("/api/v1/batches/" + batchA.getId() + "/assignments"))
                .andExpect(status().isUnauthorized());

        // Student not enrolled -> 403
        mockMvc.perform(get("/api/v1/batches/" + batchA.getId() + "/assignments")
                .header("Authorization", tokenNonEnrolled))
                .andExpect(status().isForbidden());

        // Student enrolled -> 200
        mockMvc.perform(get("/api/v1/batches/" + batchA.getId() + "/assignments")
                .header("Authorization", tokenEnrolled))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].title", is("Matrix Assignment")));

        // Other faculty -> 403
        mockMvc.perform(get("/api/v1/batches/" + batchA.getId() + "/assignments")
                .header("Authorization", tokenOtherFaculty))
                .andExpect(status().isForbidden());

        // Co-faculty -> 200
        mockMvc.perform(get("/api/v1/batches/" + batchA.getId() + "/assignments")
                .header("Authorization", tokenCoFaculty))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].title", is("Matrix Assignment")));

        // Owner faculty -> 200
        mockMvc.perform(get("/api/v1/batches/" + batchA.getId() + "/assignments")
                .header("Authorization", tokenOwner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].title", is("Matrix Assignment")));
    }

    // 3. GET /api/v1/courses/{id}/resources
    @Test
    @DisplayName("Matrix: GET /api/v1/courses/{id}/resources")
    void testResourcesAuthorizationMatrix() throws Exception {
        // Anonymous -> 401
        mockMvc.perform(get("/api/v1/courses/" + courseA.getId() + "/resources"))
                .andExpect(status().isUnauthorized());

        // Student not enrolled -> 403
        mockMvc.perform(get("/api/v1/courses/" + courseA.getId() + "/resources")
                .header("Authorization", tokenNonEnrolled))
                .andExpect(status().isForbidden());

        // Student enrolled -> 200 (drafts filtered out)
        mockMvc.perform(get("/api/v1/courses/" + courseA.getId() + "/resources")
                .header("Authorization", tokenEnrolled))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].title", is("Published Slide Deck")));

        // Other faculty -> 403
        mockMvc.perform(get("/api/v1/courses/" + courseA.getId() + "/resources")
                .header("Authorization", tokenOtherFaculty))
                .andExpect(status().isForbidden());

        // Co-faculty -> 200 (both published and drafts visible)
        mockMvc.perform(get("/api/v1/courses/" + courseA.getId() + "/resources")
                .header("Authorization", tokenCoFaculty))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(2)));

        // Owner faculty -> 200 (both published and drafts visible)
        mockMvc.perform(get("/api/v1/courses/" + courseA.getId() + "/resources")
                .header("Authorization", tokenOwner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(2)));
    }

    // 4. POST /api/v1/assignments/{id}/clone
    @Test
    @DisplayName("Matrix: POST /api/v1/assignments/{id}/clone")
    void testCloneAssignmentAuthorizationMatrix() throws Exception {
        String jsonPayload = "{\"targetBatchId\":" + batchA2.getId() + ",\"newDueDate\":\"" + LocalDateTime.now().plusDays(10) + "\"}";

        // Anonymous -> 401
        mockMvc.perform(post("/api/v1/assignments/" + assignmentA.getId() + "/clone")
                .contentType(MediaType.APPLICATION_JSON)
                .content(jsonPayload))
                .andExpect(status().isUnauthorized());

        // Student not enrolled -> 403
        mockMvc.perform(post("/api/v1/assignments/" + assignmentA.getId() + "/clone")
                .header("Authorization", tokenNonEnrolled)
                .contentType(MediaType.APPLICATION_JSON)
                .content(jsonPayload))
                .andExpect(status().isForbidden());

        // Student enrolled -> 403
        mockMvc.perform(post("/api/v1/assignments/" + assignmentA.getId() + "/clone")
                .header("Authorization", tokenEnrolled)
                .contentType(MediaType.APPLICATION_JSON)
                .content(jsonPayload))
                .andExpect(status().isForbidden());

        // Other faculty -> 403
        mockMvc.perform(post("/api/v1/assignments/" + assignmentA.getId() + "/clone")
                .header("Authorization", tokenOtherFaculty)
                .contentType(MediaType.APPLICATION_JSON)
                .content(jsonPayload))
                .andExpect(status().isForbidden());

        // Co-faculty -> 200
        mockMvc.perform(post("/api/v1/assignments/" + assignmentA.getId() + "/clone")
                .header("Authorization", tokenCoFaculty)
                .contentType(MediaType.APPLICATION_JSON)
                .content(jsonPayload))
                .andExpect(status().isOk());

        // Owner faculty -> 200
        mockMvc.perform(post("/api/v1/assignments/" + assignmentA.getId() + "/clone")
                .header("Authorization", tokenOwner)
                .contentType(MediaType.APPLICATION_JSON)
                .content(jsonPayload))
                .andExpect(status().isOk());
    }

    // 5. GET /api/v1/submissions/receipt/{receiptToken}
    @Test
    @DisplayName("Matrix: GET /api/v1/submissions/receipt/{receiptToken}")
    void testSubmissionReceiptAuthorizationMatrix() throws Exception {
        String token = submissionA.getReceiptToken();

        // Anonymous -> 401
        mockMvc.perform(get("/api/v1/submissions/receipt/" + token))
                .andExpect(status().isUnauthorized());

        // Another student (non-submitting) -> 403
        mockMvc.perform(get("/api/v1/submissions/receipt/" + token)
                .header("Authorization", tokenNonEnrolled))
                .andExpect(status().isForbidden());

        // Submitting student -> 200 (marks and feedback masked because unpublished)
        mockMvc.perform(get("/api/v1/submissions/receipt/" + token)
                .header("Authorization", tokenEnrolled))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.marks").doesNotExist())
                .andExpect(jsonPath("$.data.feedback").doesNotExist());

        // Other faculty -> 403
        mockMvc.perform(get("/api/v1/submissions/receipt/" + token)
                .header("Authorization", tokenOtherFaculty))
                .andExpect(status().isForbidden());

        // Co-faculty -> 200 (marks visible even though unpublished)
        mockMvc.perform(get("/api/v1/submissions/receipt/" + token)
                .header("Authorization", tokenCoFaculty))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.marks", is(95.0)))
                .andExpect(jsonPath("$.data.feedback", is("Excellent work")));

        // Owner faculty -> 200 (marks visible even though unpublished)
        mockMvc.perform(get("/api/v1/submissions/receipt/" + token)
                .header("Authorization", tokenOwner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.marks", is(95.0)))
                .andExpect(jsonPath("$.data.feedback", is("Excellent work")));
    }

    // 6. GET /api/v1/batches/{id}/export-grades
    @Test
    @DisplayName("Matrix: GET /api/v1/batches/{id}/export-grades")
    void testExportGradesAuthorizationMatrix() throws Exception {
        // Anonymous -> 401
        mockMvc.perform(get("/api/v1/batches/" + batchA.getId() + "/export-grades"))
                .andExpect(status().isUnauthorized());

        // Non-enrolled student -> 403
        mockMvc.perform(get("/api/v1/batches/" + batchA.getId() + "/export-grades")
                .header("Authorization", tokenNonEnrolled))
                .andExpect(status().isForbidden());

        // Enrolled student -> 403
        mockMvc.perform(get("/api/v1/batches/" + batchA.getId() + "/export-grades")
                .header("Authorization", tokenEnrolled))
                .andExpect(status().isForbidden());

        // Other faculty -> 403
        mockMvc.perform(get("/api/v1/batches/" + batchA.getId() + "/export-grades")
                .header("Authorization", tokenOtherFaculty))
                .andExpect(status().isForbidden());

        // Co-faculty -> 200
        mockMvc.perform(get("/api/v1/batches/" + batchA.getId() + "/export-grades")
                .header("Authorization", tokenCoFaculty))
                .andExpect(status().isOk());

        // Owner faculty -> 200
        mockMvc.perform(get("/api/v1/batches/" + batchA.getId() + "/export-grades")
                .header("Authorization", tokenOwner))
                .andExpect(status().isOk());
    }

    // 7. POST /api/v1/announcements (COURSE target)
    @Test
    @DisplayName("Matrix: POST /api/v1/announcements (COURSE target)")
    void testAnnouncementsAuthorizationMatrix() throws Exception {
        String jsonPayload = "{\"title\":\"Matrix Announcement\",\"message\":\"Testing authorization matrix for course announcements\",\"targetType\":\"COURSE\",\"courseId\":" + courseA.getId() + "}";

        // Anonymous -> 401
        mockMvc.perform(post("/api/v1/announcements")
                .contentType(MediaType.APPLICATION_JSON)
                .content(jsonPayload))
                .andExpect(status().isUnauthorized());

        // Non-enrolled student -> 400 (Student role cannot broadcast)
        mockMvc.perform(post("/api/v1/announcements")
                .header("Authorization", tokenNonEnrolled)
                .contentType(MediaType.APPLICATION_JSON)
                .content(jsonPayload))
                .andExpect(status().isBadRequest());

        // Enrolled student -> 400 (Student role cannot broadcast)
        mockMvc.perform(post("/api/v1/announcements")
                .header("Authorization", tokenEnrolled)
                .contentType(MediaType.APPLICATION_JSON)
                .content(jsonPayload))
                .andExpect(status().isBadRequest());

        // Other faculty -> 403 (Not course faculty)
        mockMvc.perform(post("/api/v1/announcements")
                .header("Authorization", tokenOtherFaculty)
                .contentType(MediaType.APPLICATION_JSON)
                .content(jsonPayload))
                .andExpect(status().isForbidden());

        // Co-faculty -> 200
        mockMvc.perform(post("/api/v1/announcements")
                .header("Authorization", tokenCoFaculty)
                .contentType(MediaType.APPLICATION_JSON)
                .content(jsonPayload))
                .andExpect(status().isOk());

        // Owner faculty -> 200
        mockMvc.perform(post("/api/v1/announcements")
                .header("Authorization", tokenOwner)
                .contentType(MediaType.APPLICATION_JSON)
                .content(jsonPayload))
                .andExpect(status().isOk());
    }
}
