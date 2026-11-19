package com.campusmaster.campusmaster.correctness;

import com.campusmaster.campusmaster.dto.auth.RegisterRequest;
import com.campusmaster.campusmaster.dto.course.UnitRequest;
import com.campusmaster.campusmaster.entity.*;
import com.campusmaster.campusmaster.repository.*;
import com.campusmaster.campusmaster.security.FileSignatureService;
import com.campusmaster.campusmaster.security.JwtUtils;
import com.campusmaster.campusmaster.security.UserDetailsImpl;
import com.campusmaster.campusmaster.service.AuthService;
import com.campusmaster.campusmaster.service.BatchService;
import com.campusmaster.campusmaster.service.CourseService;
import com.campusmaster.campusmaster.service.ResourceService;
import com.campusmaster.campusmaster.service.SubmissionService;
import com.campusmaster.campusmaster.service.storage.CloudinaryStorageService;
import com.campusmaster.campusmaster.service.storage.LocalStorageService;
import com.cloudinary.Cloudinary;
import com.cloudinary.Uploader;
import com.cloudinary.Url;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@Transactional
public class Phase1CorrectnessTests {

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
    private NotificationRepository notificationRepository;

    @Autowired
    private UnitRepository unitRepository;

    @Autowired
    private ResourceRepository resourceRepository;

    @Autowired
    private AuthService authService;

    @Autowired
    private BatchService batchService;

    @Autowired
    private CourseService courseService;

    @Autowired
    private ResourceService resourceService;

    @Autowired
    private SubmissionService submissionService;

    @Autowired
    private LocalStorageService localStorageService;

    @Autowired
    private FileSignatureService fileSignatureService;

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private ObjectMapper objectMapper = new ObjectMapper();

    private User facultyUser;
    private User studentUser;
    private User otherStudentUser;
    private String facultyToken;
    private String studentToken;
    private Course testCourse;
    private Batch testBatch;

    @BeforeEach
    public void setup() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext)
            .apply(SecurityMockMvcConfigurers.springSecurity())
            .build();

        long suffix = System.currentTimeMillis();

        facultyUser = userRepository.save(User.builder()
            .name("Prof Test")
            .email("prof.p1." + suffix + "@test.com")
            .password(passwordEncoder.encode("Password123!"))
            .role(Role.FACULTY)
            .build());

        studentUser = userRepository.save(User.builder()
            .name("Student One")
            .email("student1.p1." + suffix + "@test.com")
            .password(passwordEncoder.encode("Password123!"))
            .role(Role.STUDENT)
            .build());

        otherStudentUser = userRepository.save(User.builder()
            .name("Student Two")
            .email("student2.p1." + suffix + "@test.com")
            .password(passwordEncoder.encode("Password123!"))
            .role(Role.STUDENT)
            .build());

        facultyToken = jwtUtils.generateToken(UserDetailsImpl.build(facultyUser));
        studentToken = jwtUtils.generateToken(UserDetailsImpl.build(studentUser));

        testCourse = courseRepository.save(Course.builder()
            .code("CS101-P1-" + suffix)
            .name("Computer Science 101")
            .program("MCA")
            .semester("Semester 1")
            .owner(facultyUser)
            .build());

        testBatch = batchRepository.save(Batch.builder()
            .name("Batch A")
            .joinCode("JOINP1" + (suffix % 10000))
            .course(testCourse)
            .status(BatchStatus.ACTIVE)
            .joinMode(JoinMode.AUTO_APPROVE)
            .build());

        enrollmentRepository.save(Enrollment.builder()
            .student(studentUser)
            .batch(testBatch)
            .status(EnrollmentStatus.ACTIVE)
            .build());
    }

    /**
     * SEC-06: Anonymous GET /api/v1/files/** without signature must return 401.
     */
    @Test
    public void testAnonymousGetFile_shouldReturnUnauthorized() throws Exception {
        mockMvc.perform(get("/api/v1/files/submissions/nonexistent.pdf"))
            .andExpect(status().isUnauthorized());
    }

    /**
     * SEC-06 / D4: Signed URL access with valid HMAC signature succeeds with nosniff header.
     */
    @Test
    public void testSignedGetFile_withValidSignature_shouldReturnFile() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "test_doc.pdf", "application/pdf", "%PDF-1.4 test content".getBytes());
        String storedPath = localStorageService.storeFile(file, "test_uploads");

        String signedUrl = fileSignatureService.generateSignedUrl(storedPath);
        assertNotNull(signedUrl);
        assertTrue(signedUrl.contains("exp="));
        assertTrue(signedUrl.contains("sig="));

        mockMvc.perform(get(signedUrl))
            .andExpect(status().isOk())
            .andExpect(header().string("X-Content-Type-Options", "nosniff"));
    }

    /**
     * SEC-06 / D4: Tampered signature or expired exp must be rejected.
     */
    @Test
    public void testSignedGetFile_withTamperedSignature_shouldReturnUnauthorized() throws Exception {
        mockMvc.perform(get("/api/v1/files/test_uploads/sample.pdf?exp=" + (Instant.now().getEpochSecond() + 300) + "&sig=invalidhexsig12345"))
            .andExpect(status().isUnauthorized());
    }

    /**
     * FUN-04: Malformed JSON should return 400 (not 500).
     */
    @Test
    public void testMalformedJson_shouldReturnBadRequest() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{invalid-json"))
            .andExpect(status().isBadRequest());
    }

    /**
     * FUN-04: Unknown route should return 404 (not 500).
     */
    @Test
    public void testUnknownRoute_shouldReturnNotFound() throws Exception {
        mockMvc.perform(get("/api/v1/non-existent-route-99999")
                .header("Authorization", "Bearer " + studentToken))
            .andExpect(status().isNotFound());
    }

    /**
     * FUN-04: Upload > 25MB should return 413 Payload Too Large.
     */
    @Test
    public void testUploadExceeding25MB_shouldReturn413() throws Exception {
        byte[] largeBytes = new byte[100]; // simulate large upload metadata
        MockMultipartFile oversized = new MockMultipartFile("file", "huge.pdf", "application/pdf", largeBytes) {
            @Override
            public long getSize() {
                return 26L * 1024 * 1024; // 26 MB
            }
        };

        mockMvc.perform(multipart("/api/v1/courses/" + testCourse.getId() + "/resources/upload")
                .file(oversized)
                .param("title", "Huge Resource")
                .header("Authorization", "Bearer " + facultyToken))
            .andExpect(status().isPayloadTooLarge());
    }

    /**
     * FUN-06: publish-grades with one ungraded submission -> ungraded stays unpublished.
     */
    @Test
    public void testPublishGrades_ungradedSubmissionStaysUnpublished() throws Exception {
        Assignment asg = assignmentRepository.save(Assignment.builder()
            .title("Assignment 1")
            .batch(testBatch)
            .createdBy(facultyUser)
            .dueDate(LocalDateTime.now().plusDays(2))
            .maxMarks(100)
            .build());

        // Submission with marks
        Submission s1 = submissionRepository.save(Submission.builder()
            .assignment(asg)
            .student(studentUser)
            .receiptToken("RCP-P1-GRADED-001")
            .marks(85.0)
            .feedback("Good work")
            .marksPublished(false)
            .build());

        // Submission without marks (ungraded)
        Submission s2 = submissionRepository.save(Submission.builder()
            .assignment(asg)
            .student(otherStudentUser)
            .receiptToken("RCP-P1-UNGRADED-002")
            .marks(null)
            .marksPublished(false)
            .build());

        mockMvc.perform(post("/api/v1/assignments/" + asg.getId() + "/publish-grades")
                .header("Authorization", "Bearer " + facultyToken))
            .andExpect(status().isOk());

        Submission reloadedS1 = submissionRepository.findById(s1.getId()).orElseThrow();
        Submission reloadedS2 = submissionRepository.findById(s2.getId()).orElseThrow();

        assertTrue(reloadedS1.isMarksPublished(), "Graded submission marks should be published");
        assertFalse(reloadedS2.isMarksPublished(), "Ungraded submission marks should remain unpublished");
    }

    /**
     * FUN-07 / D3: Resubmission replaces attachments, keeps same receipt token,
     * resets marks/feedback/published, and increments version.
     */
    @Test
    public void testResubmission_semanticsPerDecisionD3() {
        Assignment asg = assignmentRepository.save(Assignment.builder()
            .title("Assignment Resubmit")
            .batch(testBatch)
            .createdBy(facultyUser)
            .dueDate(LocalDateTime.now().plusDays(2))
            .maxMarks(100)
            .build());

        MockMultipartFile file1 = new MockMultipartFile("files", "solution_v1.pdf", "application/pdf", "v1 content".getBytes());
        submissionService.submitAssignment(asg.getId(), "Version 1 text", List.of(file1), studentUser);

        Submission sub1 = submissionRepository.findByAssignmentIdAndStudentId(asg.getId(), studentUser.getId()).orElseThrow();
        String originalReceiptToken = sub1.getReceiptToken();
        assertEquals(1, sub1.getVersion());
        assertEquals(1, sub1.getAttachments().size());

        // Faculty grades it
        sub1.setMarks(90.0);
        sub1.setFeedback("Initial feedback");
        sub1.setMarksPublished(true);
        submissionRepository.save(sub1);

        // Student resubmits
        MockMultipartFile file2 = new MockMultipartFile("files", "solution_v2.pdf", "application/pdf", "v2 updated content".getBytes());
        submissionService.submitAssignment(asg.getId(), "Version 2 text", List.of(file2), studentUser);

        Submission sub2 = submissionRepository.findByAssignmentIdAndStudentId(asg.getId(), studentUser.getId()).orElseThrow();

        assertEquals(2, sub2.getVersion(), "Version should increment to 2");
        assertEquals(originalReceiptToken, sub2.getReceiptToken(), "Receipt token should stay the same per D3");
        assertNull(sub2.getMarks(), "Marks should reset to null on resubmission");
        assertNull(sub2.getFeedback(), "Feedback should reset to null on resubmission");
        assertFalse(sub2.isMarksPublished(), "marksPublished should reset to false");
        assertEquals(1, sub2.getAttachments().size(), "Previous attachments should be replaced");
        assertEquals("solution_v2.pdf", sub2.getAttachments().get(0).getFileName());
    }

    /**
     * FUN-12: Email normalization on registration.
     */
    @Test
    public void testEmailNormalization_duplicatePrevention() {
        RegisterRequest req1 = new RegisterRequest();
        req1.setName("User A");
        req1.setEmail("Normalize@Test.Com");
        req1.setPassword("Password123!");
        req1.setRole(Role.STUDENT);

        authService.register(req1);

        RegisterRequest req2 = new RegisterRequest();
        req2.setName("User A Duplicate");
        req2.setEmail(" normalize@test.com ");
        req2.setPassword("Password123!");
        req2.setRole(Role.STUDENT);

        assertThrows(Exception.class, () -> authService.register(req2));
    }

    /**
     * SEC-08 / FUN-10 / D2: Rejected student cannot self-rejoin with code.
     */
    @Test
    public void testRejectedStudent_cannotSelfRejoin() {
        Enrollment enrollment = enrollmentRepository.findByStudentAndBatch(studentUser, testBatch).orElseThrow();
        enrollment.setStatus(EnrollmentStatus.REJECTED);
        enrollmentRepository.save(enrollment);

        assertThrows(Exception.class, () -> batchService.joinBatchWithCode(testBatch.getJoinCode(), studentUser));
    }

    /**
     * FUN-05: Modifying another user's notification throws 403.
     */
    @Test
    public void testNotificationMarkAsRead_byOtherUser_throwsForbidden() throws Exception {
        Notification notif = notificationRepository.save(Notification.builder()
            .recipient(studentUser)
            .title("Test Notif")
            .message("Message")
            .eventType("GENERAL")
            .isRead(false)
            .build());

        mockMvc.perform(patch("/api/v1/notifications/" + notif.getId() + "/read")
                .header("Authorization", "Bearer " + facultyToken))
            .andExpect(status().isForbidden());
    }

    /**
     * FUN-03: updateUnits diffs correctly and preserves units with resources.
     */
    @Test
    public void testUpdateUnits_withReferencedResources_preservesReferences() {
        Unit unit1 = unitRepository.save(Unit.builder()
            .course(testCourse)
            .title("Unit 1 - Introduction")
            .sortOrder(1)
            .build());

        resourceRepository.save(Resource.builder()
            .course(testCourse)
            .unit(unit1)
            .title("Lecture 1 Notes")
            .resourceType(ResourceType.URL)
            .externalUrl("https://example.com/notes")
            .isPublished(true)
            .createdBy(facultyUser)
            .build());

        // Update units: keep unit1 (rename it), and add unit2
        UnitRequest u1Req = new UnitRequest();
        u1Req.setId(unit1.getId());
        u1Req.setTitle("Unit 1 - Advanced Intro");
        u1Req.setSortOrder(1);

        UnitRequest u2Req = new UnitRequest();
        u2Req.setTitle("Unit 2 - Algorithms");
        u2Req.setSortOrder(2);

        var updated = courseService.updateUnits(testCourse.getId(), List.of(u1Req, u2Req), facultyUser);
        assertEquals(2, updated.size());

        Unit reloadedUnit1 = unitRepository.findById(unit1.getId()).orElseThrow();
        assertEquals("Unit 1 - Advanced Intro", reloadedUnit1.getTitle());

        // Resource still references unit1
        var resources = resourceRepository.findByCourseOrderByCreatedAtDesc(testCourse);
        assertEquals(1, resources.size());
        assertEquals(unit1.getId(), resources.get(0).getUnit().getId());
    }

    /**
     * FUN-02: Cloudinary Storage Provider contract test (Mocked).
     */
    @Test
    public void testCloudinaryStorageService_contract() throws Exception {
        Cloudinary mockCloudinary = Mockito.mock(Cloudinary.class);
        Uploader mockUploader = Mockito.mock(Uploader.class);
        Url mockUrl = Mockito.mock(Url.class);

        when(mockCloudinary.uploader()).thenReturn(mockUploader);
        when(mockCloudinary.url()).thenReturn(mockUrl);
        when(mockUrl.signed(true)).thenReturn(mockUrl);
        when(mockUrl.generate("campusmaster/test.pdf")).thenReturn("https://res.cloudinary.com/test/campusmaster/test.pdf?sig=123");

        when(mockUploader.upload(any(byte[].class), anyMap())).thenReturn(Map.of(
            "secure_url", "https://res.cloudinary.com/test/campusmaster/test.pdf"
        ));

        CloudinaryStorageService service = new CloudinaryStorageService(mockCloudinary);
        MockMultipartFile file = new MockMultipartFile("file", "test.pdf", "application/pdf", "sample data".getBytes());

        String storedUrl = service.storeFile(file, "submissions");
        assertEquals("https://res.cloudinary.com/test/campusmaster/test.pdf", storedUrl);

        String downloadUrl = service.getDownloadUrl("campusmaster/test.pdf");
        assertEquals("https://res.cloudinary.com/test/campusmaster/test.pdf?sig=123", downloadUrl);
    }
}
