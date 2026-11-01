package com.campusmaster.campusmaster.repository;

import com.campusmaster.campusmaster.entity.Announcement;
import com.campusmaster.campusmaster.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AnnouncementRepository extends JpaRepository<Announcement, Long> {
    List<Announcement> findByAuthorOrderByCreatedAtDesc(User author);
    List<Announcement> findAllByOrderByCreatedAtDesc();
}
