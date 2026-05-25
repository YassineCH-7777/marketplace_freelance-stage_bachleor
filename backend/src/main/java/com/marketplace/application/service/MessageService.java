package com.marketplace.application.service;

import com.marketplace.web.dto.message.ConversationDto;
import com.marketplace.web.dto.message.MessageDto;
import com.marketplace.domain.model.Conversation;
import com.marketplace.domain.model.FreelancerProfile;
import com.marketplace.domain.model.Message;
import com.marketplace.domain.model.Order;
import com.marketplace.domain.model.OrderRequest;
import com.marketplace.domain.model.User;
import com.marketplace.domain.enums.NotificationType;
import com.marketplace.domain.enums.UserRole;
import com.marketplace.web.exception.BusinessException;
import com.marketplace.web.exception.ResourceNotFoundException;
import com.marketplace.web.exception.UnauthorizedException;
import com.marketplace.infrastructure.persistence.AttachmentRepository;
import com.marketplace.infrastructure.persistence.ConversationRepository;
import com.marketplace.infrastructure.persistence.FreelancerProfileRepository;
import com.marketplace.infrastructure.persistence.MessageRepository;
import com.marketplace.infrastructure.persistence.OrderRepository;
import com.marketplace.infrastructure.persistence.UserRepository;
import com.marketplace.web.dto.attachment.AttachmentDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final FreelancerProfileRepository freelancerProfileRepository;
    private final AttachmentRepository attachmentRepository;
    private final NotificationService notificationService;

    @Transactional
    public ConversationDto createConversationForUser(Long requesterId, Long targetUserId) {
        if (requesterId.equals(targetUserId)) {
            throw new BusinessException("Impossible de creer une conversation avec soi-meme.", HttpStatus.BAD_REQUEST);
        }

        User requester = userRepository.findById(requesterId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable"));
        User target = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur cible introuvable"));

        Conversation conversation;
        if (requester.getRole() == UserRole.CLIENT && target.getRole() == UserRole.FREELANCER) {
            FreelancerProfile freelancer = getFreelancerProfile(targetUserId);
            conversation = getOrCreateGeneralConversation(requester, freelancer);
        } else if (requester.getRole() == UserRole.FREELANCER && target.getRole() == UserRole.CLIENT) {
            FreelancerProfile freelancer = getFreelancerProfile(requesterId);
            conversation = getOrCreateGeneralConversation(target, freelancer);
        } else {
            throw new BusinessException("La messagerie est reservee aux echanges client/freelance.", HttpStatus.BAD_REQUEST);
        }

        return mapToConversationDto(conversation, requesterId);
    }

    @Transactional
    public ConversationDto createConversationForOrder(Long requesterId, Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Commande introuvable"));

        if (!isOrderParticipant(order, requesterId)) {
            throw new UnauthorizedException("Acces refuse");
        }

        Conversation conversation = ensureOrderConversation(order);
        return mapToConversationDto(conversation, requesterId);
    }

    @Transactional
    public void addOrderRequestOpeningMessage(OrderRequest request) {
        Conversation conversation = getOrCreateGeneralConversation(request.getClient(), request.getService().getFreelancer());
        if (request.getMessage() != null && !request.getMessage().trim().isEmpty()) {
            saveMessage(conversation, request.getClient(), request.getMessage(), true);
        }
    }

    @Transactional
    public Conversation ensureOrderConversation(Order order) {
        return conversationRepository.findByOrder_Id(order.getId())
                .orElseGet(() -> {
                    Conversation conversation = conversationRepository
                            .findByClient_IdAndFreelancer_User_IdAndOrderIsNull(
                                    order.getClient().getId(),
                                    order.getFreelancer().getUser().getId())
                            .orElseGet(() -> Conversation.builder()
                                    .client(order.getClient())
                                    .freelancer(order.getFreelancer())
                                    .lastMessageAt(LocalDateTime.now())
                                    .build());

                    conversation.setOrder(order);
                    if (conversation.getLastMessageAt() == null) {
                        conversation.setLastMessageAt(LocalDateTime.now());
                    }
                    return conversationRepository.save(conversation);
                });
    }

    public List<ConversationDto> getUserConversations(Long userId) {
        return conversationRepository.findByClient_IdOrFreelancer_User_Id(userId, userId)
                .stream()
                .sorted(Comparator.comparing(this::getConversationActivityAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .map(conversation -> mapToConversationDto(conversation, userId))
                .collect(Collectors.toList());
    }

    @Transactional
    public List<MessageDto> getMessages(Long conversationId, Long userId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation introuvable"));
        if (!isParticipant(conversation, userId)) {
            throw new UnauthorizedException("Acces refuse");
        }

        messageRepository.markConversationAsRead(conversationId, userId);
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
            throw new UnauthorizedException("Acces refuse");
        }

        return mapToMessageDto(saveMessage(conversation, sender, content, true));
    }

    @Transactional
    public MessageDto updateMessageImportance(Long messageId, Long userId, boolean important) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message introuvable"));
        if (!isParticipant(message.getConversation(), userId)) {
            throw new UnauthorizedException("Acces refuse");
        }

        message.setImportant(important);
        return mapToMessageDto(messageRepository.save(message));
    }

    private Message saveMessage(Conversation conversation, User sender, String content, boolean notifyRecipient) {
        String normalizedContent = normalizeMessageContent(content);
        Message message = Message.builder()
                .conversation(conversation)
                .sender(sender)
                .content(normalizedContent)
                .isRead(false)
                .build();

        conversation.setLastMessageAt(LocalDateTime.now());
        conversationRepository.save(conversation);

        Message savedMessage = messageRepository.save(message);
        if (notifyRecipient) {
            notifyRecipient(conversation, sender, normalizedContent);
        }
        return savedMessage;
    }

    private String normalizeMessageContent(String content) {
        String normalizedContent = content == null ? "" : content.trim();
        if (normalizedContent.isEmpty()) {
            throw new BusinessException("Le message ne peut pas etre vide.", HttpStatus.BAD_REQUEST);
        }
        if (normalizedContent.length() > 2000) {
            throw new BusinessException("Le message ne peut pas depasser 2000 caracteres.", HttpStatus.BAD_REQUEST);
        }
        return normalizedContent;
    }

    private Conversation getOrCreateGeneralConversation(User client, FreelancerProfile freelancer) {
        validateClient(client);
        return conversationRepository
                .findByClient_IdAndFreelancer_User_IdAndOrderIsNull(client.getId(), freelancer.getUser().getId())
                .orElseGet(() -> conversationRepository.save(Conversation.builder()
                        .client(client)
                        .freelancer(freelancer)
                        .lastMessageAt(LocalDateTime.now())
                        .build()));
    }

    private FreelancerProfile getFreelancerProfile(Long freelancerUserId) {
        return freelancerProfileRepository.findByUserId(freelancerUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Profil freelance introuvable"));
    }

    private void validateClient(User client) {
        if (client.getRole() != UserRole.CLIENT) {
            throw new BusinessException("Le participant client doit avoir le role CLIENT.", HttpStatus.BAD_REQUEST);
        }
    }

    private void notifyRecipient(Conversation conversation, User sender, String content) {
        Long recipientId = conversation.getClient().getId().equals(sender.getId())
                ? conversation.getFreelancer().getUser().getId()
                : conversation.getClient().getId();
        String preview = content.length() > 90 ? content.substring(0, 90) + "..." : content;
        notificationService.createNotification(
                recipientId,
                NotificationType.NEW_MESSAGE,
                "Nouveau message de " + sender.getEmail() + " : " + preview,
                "CONVERSATION",
                conversation.getId());
    }

    private boolean isParticipant(Conversation conversation, Long userId) {
        return conversation.getClient().getId().equals(userId)
                || conversation.getFreelancer().getUser().getId().equals(userId);
    }

    private boolean isOrderParticipant(Order order, Long userId) {
        return order.getClient().getId().equals(userId)
                || order.getFreelancer().getUser().getId().equals(userId);
    }

    private LocalDateTime getConversationActivityAt(Conversation conversation) {
        if (conversation.getLastMessageAt() != null) {
            return conversation.getLastMessageAt();
        }
        if (conversation.getUpdatedAt() != null) {
            return conversation.getUpdatedAt();
        }
        return conversation.getCreatedAt();
    }

    private ConversationDto mapToConversationDto(Conversation conversation, Long viewerId) {
        Optional<Message> lastMessage = messageRepository.findTopByConversation_IdOrderByCreatedAtDesc(conversation.getId());
        return ConversationDto.builder()
                .id(conversation.getId())
                .clientId(conversation.getClient().getId())
                .clientEmail(conversation.getClient().getEmail())
                .freelancerId(conversation.getFreelancer().getUser().getId())
                .freelancerEmail(conversation.getFreelancer().getUser().getEmail())
                .orderId(conversation.getOrder() != null ? conversation.getOrder().getId() : null)
                .lastMessageAt(conversation.getLastMessageAt())
                .lastMessageContent(lastMessage.map(Message::getContent).orElse(null))
                .unreadCount(messageRepository.countUnreadMessages(conversation.getId(), viewerId))
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
                .isImportant(message.isImportant())
                .attachments(safeList(attachmentRepository.findByMessage_IdOrderByCreatedAtAsc(message.getId()))
                        .stream()
                        .map(AttachmentDto::from)
                        .toList())
                .createdAt(message.getCreatedAt())
                .build();
    }

    private <T> List<T> safeList(List<T> values) {
        return values != null ? values : List.of();
    }
}
