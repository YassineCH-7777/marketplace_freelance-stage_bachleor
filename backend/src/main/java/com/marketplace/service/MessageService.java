package com.marketplace.service;

import com.marketplace.dto.message.ConversationDto;
import com.marketplace.dto.message.MessageDto;
import com.marketplace.entity.Conversation;
import com.marketplace.entity.FreelancerProfile;
import com.marketplace.entity.Message;
import com.marketplace.entity.User;
import com.marketplace.exception.ResourceNotFoundException;
import com.marketplace.exception.UnauthorizedException;
import com.marketplace.repository.ConversationRepository;
import com.marketplace.repository.FreelancerProfileRepository;
import com.marketplace.repository.MessageRepository;
import com.marketplace.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final FreelancerProfileRepository freelancerProfileRepository;

    @Transactional
    public ConversationDto createConversation(Long clientId, Long freelancerId) {
        User client = userRepository.findById(clientId).orElseThrow();
        FreelancerProfile freelancer = freelancerProfileRepository.findByUserId(freelancerId)
                .orElseThrow(() -> new ResourceNotFoundException("Profil freelance introuvable"));

        Conversation conversation = conversationRepository
                .findByClient_IdAndFreelancer_User_IdAndOrderIsNull(clientId, freelancerId)
                .orElseGet(() -> conversationRepository.save(Conversation.builder()
                        .client(client)
                        .freelancer(freelancer)
                        .lastMessageAt(LocalDateTime.now())
                        .build()));

        return mapToConversationDto(conversation);
    }

    public List<ConversationDto> getUserConversations(Long userId) {
        return conversationRepository.findByClient_IdOrFreelancer_User_Id(userId, userId)
                .stream()
                .map(this::mapToConversationDto)
                .collect(Collectors.toList());
    }

    public List<MessageDto> getMessages(Long conversationId, Long userId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation introuvable"));
        if (!isParticipant(conversation, userId)) {
            throw new UnauthorizedException("AccÃ¨s refusÃ©");
        }
        return messageRepository.findByConversation_IdOrderByCreatedAtAsc(conversationId)
                .stream()
                .map(this::mapToMessageDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public MessageDto sendMessage(Long conversationId, Long senderId, String content) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation introuvable"));
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable"));

        if (!isParticipant(conversation, senderId)) {
            throw new UnauthorizedException("AccÃ¨s refusÃ©");
        }

        Message message = Message.builder()
                .conversation(conversation)
                .sender(sender)
                .content(content)
                .isRead(false)
                .build();

        conversation.setLastMessageAt(LocalDateTime.now());
        conversationRepository.save(conversation);

        return mapToMessageDto(messageRepository.save(message));
    }

    private boolean isParticipant(Conversation conversation, Long userId) {
        return conversation.getClient().getId().equals(userId)
                || conversation.getFreelancer().getUser().getId().equals(userId);
    }

    private ConversationDto mapToConversationDto(Conversation conversation) {
        return ConversationDto.builder()
                .id(conversation.getId())
                .clientId(conversation.getClient().getId())
                .clientEmail(conversation.getClient().getEmail())
                .freelancerId(conversation.getFreelancer().getUser().getId())
                .freelancerEmail(conversation.getFreelancer().getUser().getEmail())
                .updatedAt(conversation.getUpdatedAt())
                .build();
    }

    private MessageDto mapToMessageDto(Message message) {
        return MessageDto.builder()
                .id(message.getId())
                .conversationId(message.getConversation().getId())
                .senderId(message.getSender().getId())
                .senderEmail(message.getSender().getEmail())
                .content(message.getContent())
                .isRead(message.isRead())
                .createdAt(message.getCreatedAt())
                .build();
    }
}
