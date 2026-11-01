package com.campusmaster.campusmaster.chat;

import com.campusmaster.campusmaster.entity.*;
import com.campusmaster.campusmaster.repository.*;
import com.campusmaster.campusmaster.security.JwtUtils;
import com.campusmaster.campusmaster.security.UserDetailsImpl;
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

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class BatchChatIntegrationTests {

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
    private ChatMessageRepository chatMessageRepository;

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private User facultyUser;
    private User studentInBatch;
    private User studentInBatch2;
    private User studentNotInBatch;

    private Course course;
    private Batch batch1;
    private Batch batch2;

    private String tokenFaculty;
    private String tokenStudentInBatch;
    private String tokenStudentInBatch2;
    private String tokenStudentNotInBatch;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();

        facultyUser = userRepository.save(User.builder()
                .name("Prof. Turing")
                .email("prof.turing@chat.test.com")
                .password(passwordEncoder.encode("Password123!"))
                .role(Role.FACULTY)
                .isVerified(true)
                .build());

        studentInBatch = userRepository.save(User.builder()
                .name("Alice Wonder")
                .email("alice@chat.test.com")
                .password(passwordEncoder.encode("Password123!"))
                .role(Role.STUDENT)
                .isVerified(true)
                .build());

        studentInBatch2 = userRepository.save(User.builder()
                .name("Bob Builder")
                .email("bob@chat.test.com")
                .password(passwordEncoder.encode("Password123!"))
                .role(Role.STUDENT)
                .isVerified(true)
                .build());

        studentNotInBatch = userRepository.save(User.builder()
                .name("Eve Hacker")
                .email("eve@chat.test.com")
                .password(passwordEncoder.encode("Password123!"))
                .role(Role.STUDENT)
                .isVerified(true)
                .build());

        course = courseRepository.save(Course.builder()
                .code("CHAT201")
                .name("Real-Time Systems")
                .owner(facultyUser)
                .build());

        batch1 = batchRepository.save(Batch.builder()
                .name("Section A")
                .term("Autumn 2026")
                .course(course)
                .joinCode("CHAT_SECA")
                .joinMode(JoinMode.AUTO_APPROVE)
                .status(BatchStatus.ACTIVE)
                .build());

        batch2 = batchRepository.save(Batch.builder()
                .name("Section B")
                .term("Autumn 2026")
                .course(course)
                .joinCode("CHAT_SECB")
                .joinMode(JoinMode.AUTO_APPROVE)
                .status(BatchStatus.ACTIVE)
                .build());

        enrollmentRepository.save(Enrollment.builder()
                .student(studentInBatch)
                .batch(batch1)
                .status(EnrollmentStatus.ACTIVE)
                .build());

        enrollmentRepository.save(Enrollment.builder()
                .student(studentInBatch2)
                .batch(batch1)
                .status(EnrollmentStatus.ACTIVE)
                .build());

        // studentNotInBatch is NOT enrolled in batch1 (only batch2)
        enrollmentRepository.save(Enrollment.builder()
                .student(studentNotInBatch)
                .batch(batch2)
                .status(EnrollmentStatus.ACTIVE)
                .build());

        assignmentRepository.save(Assignment.builder()
                .title("Distributed Queue Assignment")
                .instructions("Build a queue")
                .batch(batch1)
                .createdBy(facultyUser)
                .dueDate(LocalDateTime.now().plusDays(5))
                .maxMarks(50)
                .latePolicy(LatePolicy.ACCEPT_MARK_LATE)
                .build());

        tokenFaculty = jwtUtils.generateToken(UserDetailsImpl.build(facultyUser));
        tokenStudentInBatch = jwtUtils.generateToken(UserDetailsImpl.build(studentInBatch));
        tokenStudentInBatch2 = jwtUtils.generateToken(UserDetailsImpl.build(studentInBatch2));
        tokenStudentNotInBatch = jwtUtils.generateToken(UserDetailsImpl.build(studentNotInBatch));
    }

    @Test
    @DisplayName("Enrolled student can post message to batch chat and fetch message history")
    void enrolledStudent_canSendMessage_and_getChatHistory() throws Exception {
        // Alice posts message in Section A
        mockMvc.perform(post("/api/v1/batches/" + batch1.getId() + "/chat/messages")
                        .header("Authorization", "Bearer " + tokenStudentInBatch)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"Hey everyone, anyone working on the assignment?\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.content", is("Hey everyone, anyone working on the assignment?")))
                .andExpect(jsonPath("$.data.senderName", is("Alice Wonder")))
                .andExpect(jsonPath("$.data.senderRole", is("STUDENT")))
                .andExpect(jsonPath("$.data.isDeleted", is(false)))
                .andExpect(jsonPath("$.data.batchId", is(batch1.getId().intValue())));

        // Alice reads chat history
        mockMvc.perform(get("/api/v1/batches/" + batch1.getId() + "/chat/messages")
                        .header("Authorization", "Bearer " + tokenStudentInBatch))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].content", is("Hey everyone, anyone working on the assignment?")))
                .andExpect(jsonPath("$.data[0].isSelf", is(true)));

        // Bob (also in Section A) reads chat history
        mockMvc.perform(get("/api/v1/batches/" + batch1.getId() + "/chat/messages")
                        .header("Authorization", "Bearer " + tokenStudentInBatch2))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].isSelf", is(false)));
    }

    @Test
    @DisplayName("Non-enrolled student cannot read or post to batch chat (403 Forbidden)")
    void nonEnrolledStudent_cannotSendMessage_or_readChat() throws Exception {
        // Eve is not in batch1, attempts to post
        mockMvc.perform(post("/api/v1/batches/" + batch1.getId() + "/chat/messages")
                        .header("Authorization", "Bearer " + tokenStudentNotInBatch)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"Unauthorized message!\"}"))
                .andExpect(status().isForbidden());

        // Eve attempts to read batch1 chat
        mockMvc.perform(get("/api/v1/batches/" + batch1.getId() + "/chat/messages")
                        .header("Authorization", "Bearer " + tokenStudentNotInBatch))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Student can delete own message for everyone, leaving deleted audit history")
    void student_canDeleteOwnMessage_leavingDeletedAuditRecord() throws Exception {
        // Alice creates message
        ChatMessage msg = chatMessageRepository.save(ChatMessage.builder()
                .batch(batch1)
                .sender(studentInBatch)
                .content("Oops, wrong batch message!")
                .isDeleted(false)
                .build());

        // Alice deletes for everyone
        mockMvc.perform(delete("/api/v1/batches/" + batch1.getId() + "/chat/messages/" + msg.getId())
                        .header("Authorization", "Bearer " + tokenStudentInBatch))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.isDeleted", is(true)))
                .andExpect(jsonPath("$.data.content", is("This message was deleted")))
                .andExpect(jsonPath("$.data.deletedAt", notNullValue()));

        // When reading history, message is present with isDeleted = true
        mockMvc.perform(get("/api/v1/batches/" + batch1.getId() + "/chat/messages")
                        .header("Authorization", "Bearer " + tokenStudentInBatch2))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].isDeleted", is(true)))
                .andExpect(jsonPath("$.data[0].content", is("This message was deleted")));
    }

    @Test
    @DisplayName("Another student cannot delete someone else's message (403 Forbidden)")
    void otherStudent_cannotDeleteMessage_ofAnotherStudent() throws Exception {
        ChatMessage msg = chatMessageRepository.save(ChatMessage.builder()
                .batch(batch1)
                .sender(studentInBatch)
                .content("Alice's message")
                .isDeleted(false)
                .build());

        // Bob tries to delete Alice's message
        mockMvc.perform(delete("/api/v1/batches/" + batch1.getId() + "/chat/messages/" + msg.getId())
                        .header("Authorization", "Bearer " + tokenStudentInBatch2))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Faculty can delete any message in the batch as moderator")
    void faculty_canDeleteAnyMessage_inBatch() throws Exception {
        ChatMessage msg = chatMessageRepository.save(ChatMessage.builder()
                .batch(batch1)
                .sender(studentInBatch)
                .content("Inappropriate content")
                .isDeleted(false)
                .build());

        // Faculty deletes message
        mockMvc.perform(delete("/api/v1/batches/" + batch1.getId() + "/chat/messages/" + msg.getId())
                        .header("Authorization", "Bearer " + tokenFaculty))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.isDeleted", is(true)));
    }

    @Test
    @DisplayName("BatchResponse returns real-time dynamic active students and open assignments count")
    void batchResponse_includesRealTimeCounts() throws Exception {
        mockMvc.perform(get("/api/v1/courses/" + course.getId() + "/batches")
                        .header("Authorization", "Bearer " + tokenFaculty))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[1].enrolledStudentsCount", is(2)))
                .andExpect(jsonPath("$.data[1].activeAssignmentsCount", is(1)))
                .andExpect(jsonPath("$.data[1].enrolledCount", is(2)))
                .andExpect(jsonPath("$.data[1].activeStudentCount", is(2)));
    }
}
