package com.campusmaster.campusmaster.service;

import com.campusmaster.campusmaster.dto.notification.NotificationResponse;
import com.campusmaster.campusmaster.entity.Course;
import com.campusmaster.campusmaster.entity.EnrollmentStatus;
import com.campusmaster.campusmaster.entity.Notification;
import com.campusmaster.campusmaster.entity.User;
import com.campusmaster.campusmaster.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    @Transactional
    public void notifyUser(User recipient, String title, String message, String eventType, String targetUrl) {
        Notification notification = Notification.builder()
            .recipient(recipient)
            .title(title)
            .message(message)
            .eventType(eventType)
            .targetUrl(targetUrl)
            .isRead(false)
            .build();
        notificationRepository.save(notification);
    }

    @Transactional
    public void notifyCourseStudents(Course course, String title, String message, String eventType, String targetUrl) {
        course.getBatches().stream()
            .filter(b -> b.getStatus().name().equals("ACTIVE"))
            .flatMap(b -> b.getEnrollments().stream())
            .filter(e -> e.getStatus() == EnrollmentStatus.ACTIVE)
            .map(e -> e.getStudent())
            .distinct()
            .forEach(student -> notifyUser(student, title, message, eventType, targetUrl));
    }

    @Transactional
    public void notifyBatchStudents(com.campusmaster.campusmaster.entity.Batch batch, String title, String message, String eventType, String targetUrl) {
        batch.getEnrollments().stream()
            .filter(e -> e.getStatus() == EnrollmentStatus.ACTIVE)
            .map(e -> e.getStudent())
            .distinct()
            .forEach(student -> notifyUser(student, title, message, eventType, targetUrl));
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> getUserNotifications(User user) {
        return notificationRepository.findByRecipientOrderByCreatedAtDesc(user).stream()
            .map(NotificationResponse::fromEntity)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(User user) {
        return notificationRepository.countByRecipientAndIsReadFalse(user);
    }

    @Transactional
    public void markAsRead(Long id, User user) {
        Notification notification = notificationRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Notification not found: " + id));

        if (!notification.getRecipient().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Cannot modify notification belonging to another user");
        }

        notification.setRead(true);
    }

    @Transactional
    public void markAllAsRead(User user) {
        List<Notification> unread = notificationRepository.findByRecipientOrderByCreatedAtDesc(user);
        for (Notification n : unread) {
            n.setRead(true);
        }
    }
}
