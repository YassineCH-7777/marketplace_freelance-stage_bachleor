package com.marketplace.controller;

import com.marketplace.dto.message.ConversationDto;
import com.marketplace.dto.message.MessageDto;
import com.marketplace.model.User;
import com.marketplace.service.MessageService;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;

    @GetMapping("/conversations")
    public ResponseEntity<List<ConversationDto>> getConversations(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(messageService.getUserConversations(user.getId()));
    }

    @PostMapping("/conversations")
    public ResponseEntity<ConversationDto> createConversation(
            @AuthenticationPrincipal User user, 
            @RequestParam Long targetUserId, 
            @RequestParam(required = false) String targetRole) {
        return ResponseEntity.ok(messageService.createConversationForUser(user.getId(), targetUserId));
    }

    @PostMapping("/conversations/orders/{orderId}")
    public ResponseEntity<ConversationDto> createOrderConversation(
            @AuthenticationPrincipal User user,
            @PathVariable Long orderId) {
        return ResponseEntity.ok(messageService.createConversationForOrder(user.getId(), orderId));
    }

    @GetMapping("/conversations/{id}")
    public ResponseEntity<List<MessageDto>> getMessages(@PathVariable Long id, @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(messageService.getMessages(id, user.getId()));
    }

    @DeleteMapping("/conversations/{id}")
    public ResponseEntity<Void> deleteConversation(@PathVariable Long id, @AuthenticationPrincipal User user) {
        messageService.deleteConversation(id, user.getId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/conversations/{id}")
    public ResponseEntity<MessageDto> sendMessage(
            @PathVariable Long id, 
            @AuthenticationPrincipal User user, 
            @RequestBody MessageDto dto) {
        return ResponseEntity.ok(messageService.sendMessage(id, user.getId(), dto.getContent()));
    }

    @PutMapping("/{id}/important")
    public ResponseEntity<MessageDto> updateMessageImportance(
            @PathVariable Long id,
            @AuthenticationPrincipal User user,
            @RequestBody MessageDto dto) {
        return ResponseEntity.ok(messageService.updateMessageImportance(id, user.getId(), dto.isImportant()));
    }
}
