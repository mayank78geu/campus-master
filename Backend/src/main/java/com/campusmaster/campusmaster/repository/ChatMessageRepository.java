package com.campusmaster.campusmaster.repository;

import com.campusmaster.campusmaster.entity.Batch;
import com.campusmaster.campusmaster.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findByBatchOrderByCreatedAtAsc(Batch batch);
    List<ChatMessage> findTop100ByBatchOrderByCreatedAtAsc(Batch batch);
    Optional<ChatMessage> findByIdAndBatch(Long id, Batch batch);
}
