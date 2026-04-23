package com.marketplace.service;

import com.marketplace.dto.message.ConversationDto;
import com.marketplace.dto.message.MessageDto;
import com.marketplace.entity.Conversation;
import com.marketplace.entity.Message;
import com.marketplace.entity.User;
import com.marketplace.repository.ConversationRepository;
import com.marketplace.repository.MessageRepository;
import com.marketplace.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.marketplace.exception.UnauthorizedException;
import com.marketplace.exception.ResourceNotFoundException;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;

    @Transactional
    public ConversationDto createConversation(Long clientId, Long freelancerId) {
        User client = userRepository.findById(clientId).orElseThrow();
        User freelancer = userRepository.findById(freelancerId).orElseThrow();

        // Optional: Ensure a conversation doesn't already exist to avoid duplicates
        // Skipping advanced checks for MVP

        Conversation conversation = Conversation.builder()
                .client(client)
                .freelancer(freelancer)
                .build();
        
        return mapToConversationDto(conversationRepository.save(conversation));
    }

    public List<ConversationDto> getUserConversations(Long userId) {
        return conversationRepository.findByClient_IdOrFreelancer_Id(userId, userId)
                .stream().map(this::mapToConversationDto).collect(Collectors.toList());
    }

    public List<MessageDto> getMessages(Long conversationId, Long userId) {
        Conversation conversation = conversationRepository.findById(conversationId).orElseThrow(() -> new ResourceNotFoundException("Conversation introuvable"));
        if (!conversation.getClient().getId().equals(userId) && !conversation.getFreelancer().getId().equals(userId)) {
            throw new UnauthorizedException("Accès refusé");
        }
        return messageRepository.findByConversation_IdOrderByCreatedAtAsc(conversationId)
                .stream().map(this::mapToMessageDto).collect(Collectors.toList());
    }

    @Transactional
    public MessageDto sendMessage(Long conversationId, Long senderId, String content) {
        Conversation conversation = conversationRepository.findById(conversationId).orElseThrow(() -> new ResourceNotFoundException("Conversation introuvable"));
        User sender = userRepository.findById(senderId).orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable"));
        
        if (!conversation.getClient().getId().equals(senderId) && !conversation.getFreelancer().getId().equals(senderId)) {
            throw new UnauthorizedException("Accès refusé");
        }

        Message message = Message.builder()
                .conversation(conversation)
                .sender(sender)
                .content(content)
                .isRead(false)
                .build();

        return mapToMessageDto(messageRepository.save(message));
    }

    private ConversationDto mapToConversationDto(Conversation c) {
        return ConversationDto.builder()
                .id(c.getId())
                .clientId(c.getClient().getId())
                .clientEmail(c.getClient().getEmail())
                .freelancerId(c.getFreelancer().getId())
                .freelancerEmail(c.getFreelancer().getEmail())
                .updatedAt(c.getUpdatedAt())
                .build();
    }

    private MessageDto mapToMessageDto(Message m) {
        return MessageDto.builder()
                .id(m.getId())
                .conversationId(m.getConversation().getId())
                .senderId(m.getSender().getId())
                .senderEmail(m.getSender().getEmail())
                .content(m.getContent())
                .isRead(m.isRead())
                .createdAt(m.getCreatedAt())
                .build();
    }
}
