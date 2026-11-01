package com.campusmaster.campusmaster.service;

import com.campusmaster.campusmaster.dto.chat.ChatMessageRequest;
import com.campusmaster.campusmaster.dto.chat.ChatMessageResponse;
import com.campusmaster.campusmaster.entity.Batch;
import com.campusmaster.campusmaster.entity.ChatMessage;
import com.campusmaster.campusmaster.entity.User;
import com.campusmaster.campusmaster.exception.ResourceNotFoundException;
import com.campusmaster.campusmaster.repository.BatchRepository;
import com.campusmaster.campusmaster.repository.ChatMessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatMessageRepository chatMessageRepository;
    private final BatchRepository batchRepository;
    private final CourseAccessService courseAccessService;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional(readOnly = true)
    public List<ChatMessageResponse> getChatHistory(Long batchId, User currentUser) {
        Batch batch = batchRepository.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Batch not found with id: " + batchId));
        courseAccessService.requireMemberOfBatch(batch, currentUser);

        List<ChatMessage> messages = chatMessageRepository.findTop100ByBatchOrderByCreatedAtAsc(batch);
        return messages.stream()
                .map(m -> ChatMessageResponse.fromEntity(m, currentUser.getId()))
                .toList();
    }

    @Transactional
    public ChatMessageResponse sendMessage(Long batchId, ChatMessageRequest request, User currentUser) {
        Batch batch = batchRepository.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Batch not found with id: " + batchId));
        courseAccessService.requireMemberOfBatch(batch, currentUser);

        ChatMessage chatMessage = ChatMessage.builder()
                .batch(batch)
                .sender(currentUser)
                .content(request.getContent().trim())
                .isDeleted(false)
                .build();

        ChatMessage saved = chatMessageRepository.save(chatMessage);
        ChatMessageResponse response = ChatMessageResponse.fromEntity(saved, currentUser.getId());

        // Broadcast to WebSocket subscribers on /topic/batch/{batchId}
        try {
            messagingTemplate.convertAndSend("/topic/batch/" + batchId, response);
        } catch (Exception e) {
            // Log but don't fail transactional persist
        }

        return response;
    }

    @Transactional
    public ChatMessageResponse deleteMessage(Long batchId, Long messageId, User currentUser) {
        Batch batch = batchRepository.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Batch not found with id: " + batchId));
        courseAccessService.requireMemberOfBatch(batch, currentUser);

        ChatMessage message = chatMessageRepository.findByIdAndBatch(messageId, batch)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found with id: " + messageId));

        boolean isAuthor = message.getSender().getId().equals(currentUser.getId());
        boolean isFaculty = courseAccessService.isFacultyOf(batch.getCourse(), currentUser);

        if (!isAuthor && !isFaculty) {
            throw new AccessDeniedException("Access denied: You can only delete your own messages");
        }

        message.setDeleted(true);
        message.setDeletedAt(LocalDateTime.now());
        ChatMessage saved = chatMessageRepository.save(message);

        ChatMessageResponse response = ChatMessageResponse.fromEntity(saved, currentUser.getId());

        // Broadcast deletion event to WebSocket subscribers so all clients update the message in real time
        try {
            messagingTemplate.convertAndSend("/topic/batch/" + batchId, response);
        } catch (Exception e) {
            // Log but don't fail transactional persist
        }

        return response;
    }
}
