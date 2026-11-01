package com.campusmaster.campusmaster.service;

import com.campusmaster.campusmaster.dto.announcement.AnnouncementResponse;
import com.campusmaster.campusmaster.dto.announcement.CreateAnnouncementRequest;
import com.campusmaster.campusmaster.entity.*;
import com.campusmaster.campusmaster.exception.BadRequestException;
import com.campusmaster.campusmaster.exception.ResourceNotFoundException;
import com.campusmaster.campusmaster.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AnnouncementService {

    private final AnnouncementRepository announcementRepository;
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final BatchRepository batchRepository;

    @Transactional
    public AnnouncementResponse createAnnouncement(CreateAnnouncementRequest request, User author) {
        if (author.getRole() != Role.FACULTY) {
            throw new BadRequestException("Only faculty members can broadcast announcements");
        }

        Course course = null;
        Batch batch = null;
        List<Batch> targetBatches = new ArrayList<>();
        Set<User> recipients = new HashSet<>();
        String audienceText = "General (All Students)";

        switch (request.getTargetType()) {
            case GENERAL:
                // All active student accounts across all batches
                List<User> allStudents = userRepository.findByRole(Role.STUDENT);
                recipients.addAll(allStudents);
                audienceText = "General (All Students)";
                break;

            case COURSE:
                if (request.getCourseId() == null) {
                    throw new BadRequestException("courseId is required for COURSE target type");
                }
                course = courseRepository.findById(request.getCourseId())
                    .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + request.getCourseId()));

                if (!course.getOwner().getId().equals(author.getId())) {
                    throw new BadRequestException("You can only announce to courses created by you");
                }

                if (course.getBatches() != null) {
                    for (Batch b : course.getBatches()) {
                        if (b.getStatus() == BatchStatus.ACTIVE && b.getEnrollments() != null) {
                            targetBatches.add(b);
                            for (Enrollment e : b.getEnrollments()) {
                                if (e.getStatus() == EnrollmentStatus.ACTIVE && e.getStudent() != null) {
                                    recipients.add(e.getStudent());
                                }
                            }
                        }
                    }
                }
                audienceText = "Course: " + course.getName() + " (" + course.getCode() + ") - All Batches";
                break;

            case BATCH:
                if (request.getBatchId() == null) {
                    throw new BadRequestException("batchId is required for BATCH target type");
                }
                batch = batchRepository.findById(request.getBatchId())
                    .orElseThrow(() -> new ResourceNotFoundException("Batch not found: " + request.getBatchId()));

                if (!batch.getCourse().getOwner().getId().equals(author.getId())) {
                    throw new BadRequestException("You can only announce to batches of your courses");
                }

                targetBatches.add(batch);
                course = batch.getCourse();
                if (batch.getEnrollments() != null) {
                    for (Enrollment e : batch.getEnrollments()) {
                        if (e.getStatus() == EnrollmentStatus.ACTIVE && e.getStudent() != null) {
                            recipients.add(e.getStudent());
                        }
                    }
                }
                audienceText = "Batch: " + batch.getName() + " · " + batch.getCourse().getName();
                break;

            case SELECTIVE_BATCHES:
                if (request.getBatchIds() == null || request.getBatchIds().isEmpty()) {
                    throw new BadRequestException("batchIds list cannot be empty for SELECTIVE_BATCHES target type");
                }
                List<Batch> foundBatches = batchRepository.findAllById(request.getBatchIds());
                if (foundBatches.isEmpty()) {
                    throw new BadRequestException("No valid batches found for the provided IDs");
                }

                for (Batch b : foundBatches) {
                    if (!b.getCourse().getOwner().getId().equals(author.getId())) {
                        throw new BadRequestException("Batch " + b.getName() + " does not belong to your courses");
                    }
                    targetBatches.add(b);
                    if (b.getEnrollments() != null) {
                        for (Enrollment e : b.getEnrollments()) {
                            if (e.getStatus() == EnrollmentStatus.ACTIVE && e.getStudent() != null) {
                                recipients.add(e.getStudent());
                            }
                        }
                    }
                }
                String names = foundBatches.stream().map(Batch::getName).collect(Collectors.joining(", "));
                audienceText = "Selective (" + foundBatches.size() + " Batches: " + names + ")";
                break;

            default:
                throw new BadRequestException("Unknown target type: " + request.getTargetType());
        }

        Announcement announcement = Announcement.builder()
            .author(author)
            .title(request.getTitle().trim())
            .message(request.getMessage().trim())
            .targetType(request.getTargetType())
            .course(course)
            .batch(batch)
            .targetBatches(targetBatches)
            .targetAudienceText(audienceText)
            .priority(request.getPriority() != null ? request.getPriority() : AnnouncementPriority.NORMAL)
            .status(AnnouncementStatus.ACTIVE)
            .recipientCount(recipients.size())
            .build();

        Announcement savedAnnouncement = announcementRepository.save(announcement);

        // Deliver notification directly to each recipient's notification section
        String authorDisplayName = author.getName();
        if (!authorDisplayName.startsWith("Prof.")) {
            authorDisplayName = "Prof. " + authorDisplayName;
        }

        List<Notification> notificationsToSave = new ArrayList<>();
        for (User recipient : recipients) {
            Notification notif = Notification.builder()
                .recipient(recipient)
                .title(savedAnnouncement.getTitle())
                .message(savedAnnouncement.getMessage())
                .eventType("ANNOUNCEMENT")
                .targetUrl("/dashboard?tab=notifications")
                .isRead(false)
                .announcement(savedAnnouncement)
                .priority(savedAnnouncement.getPriority().name())
                .authorName(authorDisplayName)
                .build();
            notificationsToSave.add(notif);
        }

        if (!notificationsToSave.isEmpty()) {
            notificationRepository.saveAll(notificationsToSave);
        }

        log.info("Announcement '{}' broadcasted by {} to {} recipients", 
            savedAnnouncement.getTitle(), author.getEmail(), savedAnnouncement.getRecipientCount());

        return AnnouncementResponse.fromEntity(savedAnnouncement);
    }

    @Transactional(readOnly = true)
    public List<AnnouncementResponse> getFacultyAnnouncements(User author) {
        List<Announcement> list = announcementRepository.findByAuthorOrderByCreatedAtDesc(author);
        return list.stream().map(AnnouncementResponse::fromEntity).collect(Collectors.toList());
    }

    @Transactional
    public AnnouncementResponse revertAnnouncement(Long id, User author) {
        Announcement announcement = announcementRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Announcement not found: " + id));

        if (!announcement.getAuthor().getId().equals(author.getId())) {
            throw new BadRequestException("You can only revert announcements created by yourself");
        }

        if (announcement.getStatus() == AnnouncementStatus.REVERTED) {
            throw new BadRequestException("Announcement is already reverted");
        }

        announcement.setStatus(AnnouncementStatus.REVERTED);
        announcement.setRevertedAt(LocalDateTime.now());
        Announcement updated = announcementRepository.save(announcement);

        // Instantly delete notifications for this announcement so students no longer see it
        notificationRepository.deleteByAnnouncementId(announcement.getId());

        log.info("Announcement '{}' (ID: {}) was reverted by {}", announcement.getTitle(), id, author.getEmail());

        return AnnouncementResponse.fromEntity(updated);
    }

    @Transactional
    public void deleteAnnouncement(Long id, User author) {
        Announcement announcement = announcementRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Announcement not found: " + id));

        if (!announcement.getAuthor().getId().equals(author.getId())) {
            throw new BadRequestException("You can only delete announcements created by yourself");
        }

        notificationRepository.deleteByAnnouncementId(announcement.getId());
        announcementRepository.delete(announcement);

        log.info("Announcement ID: {} deleted by {}", id, author.getEmail());
    }
}
