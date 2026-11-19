package com.campusmaster.campusmaster.controller;

import com.campusmaster.campusmaster.dto.common.ApiResponse;
import com.campusmaster.campusmaster.dto.chat.ChatMessageRequest;
import com.campusmaster.campusmaster.dto.chat.ChatMessageResponse;
import com.campusmaster.campusmaster.entity.User;
import com.campusmaster.campusmaster.repository.UserRepository;
import com.campusmaster.campusmaster.service.AuthService;
import com.campusmaster.campusmaster.service.ChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;
    private final AuthService authService;
    private final UserRepository userRepository;

    @GetMapping("/batches/{batchId}/chat/messages")
    public ResponseEntity<ApiResponse<List<ChatMessageResponse>>> getChatHistory(@PathVariable Long batchId) {
        User currentUser = authService.getCurrentUser();
        List<ChatMessageResponse> messages = chatService.getChatHistory(batchId, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(messages));
    }

    @PostMapping("/batches/{batchId}/chat/messages")
    public ResponseEntity<ApiResponse<ChatMessageResponse>> sendMessage(
            @PathVariable Long batchId,
            @Valid @RequestBody ChatMessageRequest request) {
        User currentUser = authService.getCurrentUser();
        ChatMessageResponse response = chatService.sendMessage(batchId, request, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(response, "Message sent successfully"));
    }

    @DeleteMapping("/batches/{batchId}/chat/messages/{messageId}")
    public ResponseEntity<ApiResponse<ChatMessageResponse>> deleteMessage(
            @PathVariable Long batchId,
            @PathVariable Long messageId) {
        User currentUser = authService.getCurrentUser();
        ChatMessageResponse response = chatService.deleteMessage(batchId, messageId, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(response, "Message deleted successfully"));
    }

    @MessageMapping("/chat.sendMessage/{batchId}")
    public void handleWsSend(@DestinationVariable Long batchId, @Valid ChatMessageRequest request, Principal principal) {
        if (principal != null) {
            userRepository.findByEmail(principal.getName()).ifPresent(user -> {
                chatService.sendMessage(batchId, request, user);
            });
        }
    }

    @MessageMapping("/chat.deleteMessage/{batchId}/{messageId}")
    public void handleWsDelete(@DestinationVariable Long batchId, @DestinationVariable Long messageId, Principal principal) {
        if (principal != null) {
            userRepository.findByEmail(principal.getName()).ifPresent(user -> {
                chatService.deleteMessage(batchId, messageId, user);
            });
        }
    }
}
