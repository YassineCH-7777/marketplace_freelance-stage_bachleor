package com.marketplace.web.controller;

import com.marketplace.application.service.AttachmentService;
import com.marketplace.domain.model.User;
import com.marketplace.web.dto.attachment.AttachmentDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/attachments")
@RequiredArgsConstructor
public class AttachmentController {

    private final AttachmentService attachmentService;

    @PostMapping("/messages/{messageId}")
    public ResponseEntity<List<AttachmentDto>> uploadMessageAttachments(
            @PathVariable Long messageId,
            @AuthenticationPrincipal User user,
            @RequestParam("files") List<MultipartFile> files,
            @RequestParam(value = "type", required = false) String type) {
        ensureAuthenticated(user);
        return ResponseEntity.ok(attachmentService.uploadMessageAttachments(messageId, user.getId(), files, type));
    }

    @PostMapping("/service-requests/{requestId}")
    public ResponseEntity<List<AttachmentDto>> uploadServiceRequestAttachments(
            @PathVariable Long requestId,
            @AuthenticationPrincipal User user,
            @RequestParam("files") List<MultipartFile> files,
            @RequestParam(value = "type", defaultValue = "BRIEF") String type) {
        ensureAuthenticated(user);
        return ResponseEntity.ok(attachmentService.uploadServiceRequestAttachments(requestId, user.getId(), files, type));
    }

    @PostMapping("/orders/{orderId}")
    public ResponseEntity<List<AttachmentDto>> uploadOrderAttachments(
            @PathVariable Long orderId,
            @AuthenticationPrincipal User user,
            @RequestParam("files") List<MultipartFile> files,
            @RequestParam(value = "type", defaultValue = "DELIVERY_PROOF") String type) {
        ensureAuthenticated(user);
        return ResponseEntity.ok(attachmentService.uploadOrderAttachments(orderId, user.getId(), files, type));
    }

    private void ensureAuthenticated(User user) {
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Utilisateur non connecte");
        }
    }
}
