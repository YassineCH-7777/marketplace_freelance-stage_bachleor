package com.marketplace.service;

import com.marketplace.dto.message.ConversationDto;
import com.marketplace.dto.message.MessageDto;
import com.marketplace.entity.Conversation;
import com.marketplace.entity.FreelancerProfile;
import com.marketplace.entity.Message;
import com.marketplace.entity.User;
import com.marketplace.enums.NotificationType;
import com.marketplace.enums.UserRole;
import com.marketplace.exception.BusinessException;
import com.marketplace.exception.UnauthorizedException;
import com.marketplace.repository.ConversationRepository;
import com.marketplace.repository.FreelancerProfileRepository;
import com.marketplace.repository.MessageRepository;
import com.marketplace.repository.OrderRepository;
import com.marketplace.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MessageServiceTest {

    @Mock
    private ConversationRepository conversationRepository;

    @Mock
    private MessageRepository messageRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private FreelancerProfileRepository freelancerProfileRepository;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private MessageService messageService;

    @Test
    void createConversationForUserCreatesPrivateClientFreelancerConversation() {
        User client = user(5L, "client@marketplace.com", UserRole.CLIENT);
        User freelancerUser = user(9L, "freelancer@marketplace.com", UserRole.FREELANCER);
        FreelancerProfile freelancer = FreelancerProfile.builder()
                .id(21L)
                .user(freelancerUser)
                .build();

        when(userRepository.findById(5L)).thenReturn(Optional.of(client));
        when(userRepository.findById(9L)).thenReturn(Optional.of(freelancerUser));
        when(freelancerProfileRepository.findByUserId(9L)).thenReturn(Optional.of(freelancer));
        when(conversationRepository.findByClient_IdAndFreelancer_User_IdAndOrderIsNull(5L, 9L))
                .thenReturn(Optional.empty());
        when(conversationRepository.save(any(Conversation.class))).thenAnswer(invocation -> {
            Conversation saved = invocation.getArgument(0);
            saved.setId(44L);
            saved.setCreatedAt(LocalDateTime.of(2026, 4, 26, 9, 0));
            return saved;
        });
        when(messageRepository.findTopByConversation_IdOrderByCreatedAtDesc(44L)).thenReturn(Optional.empty());
        when(messageRepository.countUnreadMessages(44L, 5L)).thenReturn(0L);

        ConversationDto result = messageService.createConversationForUser(5L, 9L);

        assertThat(result.getId()).isEqualTo(44L);
        assertThat(result.getClientId()).isEqualTo(5L);
        assertThat(result.getFreelancerId()).isEqualTo(9L);
        assertThat(result.getUnreadCount()).isZero();
    }

    @Test
    void sendMessageStoresTrimmedTextAndNotifiesRecipient() {
        User client = user(5L, "client@marketplace.com", UserRole.CLIENT);
        User freelancerUser = user(9L, "freelancer@marketplace.com", UserRole.FREELANCER);
        Conversation conversation = conversation(44L, client, freelancerUser);

        when(conversationRepository.findById(44L)).thenReturn(Optional.of(conversation));
        when(userRepository.findById(5L)).thenReturn(Optional.of(client));
        when(conversationRepository.save(conversation)).thenReturn(conversation);
        when(messageRepository.save(any(Message.class))).thenAnswer(invocation -> {
            Message saved = invocation.getArgument(0);
            saved.setId(77L);
            saved.setCreatedAt(LocalDateTime.of(2026, 4, 26, 10, 30));
            return saved;
        });

        MessageDto result = messageService.sendMessage(44L, 5L, "  Bonjour, pouvez-vous livrer en 3 jours ?  ");

        assertThat(result.getId()).isEqualTo(77L);
        assertThat(result.getContent()).isEqualTo("Bonjour, pouvez-vous livrer en 3 jours ?");
        assertThat(result.isRead()).isFalse();
        assertThat(conversation.getLastMessageAt()).isNotNull();
        verify(notificationService).createNotification(
                eq(9L),
                eq(NotificationType.NEW_MESSAGE),
                contains("client@marketplace.com"),
                eq("CONVERSATION"),
                eq(44L));
    }

    @Test
    void sendMessageRejectsEmptyContent() {
        User client = user(5L, "client@marketplace.com", UserRole.CLIENT);
        User freelancerUser = user(9L, "freelancer@marketplace.com", UserRole.FREELANCER);
        Conversation conversation = conversation(44L, client, freelancerUser);

        when(conversationRepository.findById(44L)).thenReturn(Optional.of(conversation));
        when(userRepository.findById(5L)).thenReturn(Optional.of(client));

        assertThatThrownBy(() -> messageService.sendMessage(44L, 5L, "   "))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void getMessagesMarksMessagesFromOtherParticipantAsRead() {
        User client = user(5L, "client@marketplace.com", UserRole.CLIENT);
        User freelancerUser = user(9L, "freelancer@marketplace.com", UserRole.FREELANCER);
        Conversation conversation = conversation(44L, client, freelancerUser);
        Message incoming = Message.builder()
                .id(88L)
                .conversation(conversation)
                .sender(freelancerUser)
                .content("Voici une precision.")
                .isRead(false)
                .createdAt(LocalDateTime.of(2026, 4, 26, 11, 0))
                .build();

        when(conversationRepository.findById(44L)).thenReturn(Optional.of(conversation));
        when(messageRepository.findByConversation_IdOrderByCreatedAtAsc(44L)).thenReturn(List.of(incoming));

        List<MessageDto> result = messageService.getMessages(44L, 5L);

        verify(messageRepository).markConversationAsRead(44L, 5L);
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getSenderId()).isEqualTo(9L);
    }

    @Test
    void getMessagesRejectsNonParticipant() {
        User client = user(5L, "client@marketplace.com", UserRole.CLIENT);
        User freelancerUser = user(9L, "freelancer@marketplace.com", UserRole.FREELANCER);
        Conversation conversation = conversation(44L, client, freelancerUser);

        when(conversationRepository.findById(44L)).thenReturn(Optional.of(conversation));

        assertThatThrownBy(() -> messageService.getMessages(44L, 99L))
                .isInstanceOf(UnauthorizedException.class);
    }

    private Conversation conversation(Long id, User client, User freelancerUser) {
        FreelancerProfile freelancer = FreelancerProfile.builder()
                .id(21L)
                .user(freelancerUser)
                .build();

        return Conversation.builder()
                .id(id)
                .client(client)
                .freelancer(freelancer)
                .createdAt(LocalDateTime.of(2026, 4, 26, 9, 0))
                .build();
    }

    private User user(Long id, String email, UserRole role) {
        return User.builder()
                .id(id)
                .email(email)
                .password("hashed")
                .role(role)
                .build();
    }
}
