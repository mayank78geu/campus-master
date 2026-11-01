package com.campusmaster.campusmaster.repository;

import com.campusmaster.campusmaster.entity.Notification;
import com.campusmaster.campusmaster.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByRecipientOrderByCreatedAtDesc(User recipient);
    long countByRecipientAndIsReadFalse(User recipient);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Query("DELETE FROM Notification n WHERE n.announcement.id = :announcementId")
    void deleteByAnnouncementId(@org.springframework.data.repository.query.Param("announcementId") Long announcementId);
}
