package com.campusmaster.campusmaster.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "submissions", indexes = {
    @Index(name = "idx_submission_receipt", columnList = "receiptToken", unique = true),
    @Index(name = "idx_submission_assignment_student", columnList = "assignment_id, student_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Submission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignment_id", nullable = false)
    private Assignment assignment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @Column(nullable = false)
    private LocalDateTime submittedAt;

    @Column(nullable = false)
    @Builder.Default
    private boolean isLate = false;

    @Column(columnDefinition = "LONGTEXT")
    private String textContent;

    @Column(nullable = false, unique = true, length = 64)
    private String receiptToken;

    private Double marks;

    @Column(columnDefinition = "TEXT")
    private String feedback;

    @Column(nullable = false)
    @Builder.Default
    private boolean marksPublished = false;

    @Column(nullable = false)
    @Builder.Default
    private Integer version = 1;

    @OneToMany(mappedBy = "submission", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<SubmissionAttachment> attachments = new ArrayList<>();

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.submittedAt == null) {
            this.submittedAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
