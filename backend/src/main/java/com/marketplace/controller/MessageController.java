package com.marketplace.controller;

import com.marketplace.dto.message.ConversationDto;
import com.marketplace.dto.message.MessageDto;
import com.marketplace.entity.User;
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
            @RequestParam String targetRole) {
        // Simple mapping: the connected user should safely put his ID in the right slot based on his role.
        if ("FREELANCER".equals(targetRole)) {
            return ResponseEntity.ok(messageService.createConversation(user.getId(), targetUserId));
        } else {
            return ResponseEntity.ok(messageService.createConversation(targetUserId, user.getId()));
        }
    }

    @GetMapping("/conversations/{id}")
    public ResponseEntity<List<MessageDto>> getMessages(@PathVariable Long id, @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(messageService.getMessages(id, user.getId()));
    }

    @PostMapping("/conversations/{id}")
    public ResponseEntity<MessageDto> sendMessage(
            @PathVariable Long id, 
            @AuthenticationPrincipal User user, 
            @RequestBody MessageDto dto) {
        return ResponseEntity.ok(messageService.sendMessage(id, user.getId(), dto.getContent()));
    }
}
