package com.marketplace.service;

import com.marketplace.enums.UserRole;
import com.marketplace.model.ClientRequestDraft;
import com.marketplace.model.FreelancerProfileDraft;
import com.marketplace.model.User;
import com.marketplace.persistence.ClientRequestDraftRepository;
import com.marketplace.persistence.FreelancerProfileDraftRepository;
import com.marketplace.persistence.UserRepository;
import com.marketplace.dto.assistant.ClientRequestDraftDto;
import com.marketplace.dto.assistant.ClientRequestDraftRequest;
import com.marketplace.dto.assistant.FreelancerProfileDraftDto;
import com.marketplace.dto.assistant.FreelancerProfileDraftRequest;
import com.marketplace.exception.BusinessException;
import com.marketplace.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AiDraftService {

    private final UserRepository userRepository;
    private final ClientRequestDraftRepository clientRequestDraftRepository;
    private final FreelancerProfileDraftRepository freelancerProfileDraftRepository;

    @Transactional
    public ClientRequestDraftDto saveClientRequestDraft(ClientRequestDraftRequest request) {
        User client = getUser(request.getUserId());
        ensureRole(client, UserRole.CLIENT, "Ce brouillon est reserve aux clients.");

        ClientRequestDraft draft = ClientRequestDraft.builder()
                .client(client)
                .category(normalize(request.getCategory()))
                .city(normalize(request.getCity()))
                .mode(normalize(request.getMode()))
                .budget(normalizePositiveAmount(request.getBudget(), "Le budget doit etre positif."))
                .deadlineDays(normalizePositiveInteger(request.getDeadlineDays(), "Le delai doit etre positif."))
                .objective(normalize(request.getObjective()))
                .deliverables(normalizeList(request.getDeliverables()))
                .build();

        return mapClientDraft(clientRequestDraftRepository.save(draft));
    }

    @Transactional
    public FreelancerProfileDraftDto saveFreelancerProfileDraft(FreelancerProfileDraftRequest request) {
        User user = getUser(request.getUserId());
        ensureRole(user, UserRole.FREELANCER, "Ce brouillon est reserve aux freelances.");

        FreelancerProfileDraft draft = freelancerProfileDraftRepository.findByUser_Id(user.getId())
                .orElseGet(() -> FreelancerProfileDraft.builder().user(user).build());

        draft.setHeadline(normalize(request.getHeadline()));
        draft.setProfessionalBio(normalize(request.getProfessionalBio()));
        draft.setSkills(normalizeList(request.getSkills()));
        draft.setCity(normalize(request.getCity()));
        draft.setAvailability(normalize(request.getAvailability()));
        draft.setHourlyRate(normalizePositiveAmount(request.getHourlyRate(), "Le tarif horaire doit etre positif."));
        draft.setPortfolioUrl(normalize(request.getPortfolioUrl()));
        draft.setPrimaryCategories(normalizeList(request.getPrimaryCategories()));
        draft.setRemoteMode(normalize(request.getRemoteMode()));
        draft.setProfileCompletionScore(resolveProfileCompletionScore(request, draft));

        return mapFreelancerDraft(freelancerProfileDraftRepository.save(draft));
    }

    private User getUser(Long userId) {
        if (userId == null) {
            throw new BusinessException("userId est obligatoire.", HttpStatus.BAD_REQUEST);
        }

        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable"));
    }

    private void ensureRole(User user, UserRole expectedRole, String message) {
        if (user.getRole() != expectedRole) {
            throw new BusinessException(message, HttpStatus.FORBIDDEN);
        }
    }

    private BigDecimal normalizePositiveAmount(BigDecimal value, String errorMessage) {
        if (value == null) {
            return null;
        }
        if (value.compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessException(errorMessage, HttpStatus.BAD_REQUEST);
        }
        return value;
    }

    private Integer normalizePositiveInteger(Integer value, String errorMessage) {
        if (value == null) {
            return null;
        }
        if (value < 0) {
            throw new BusinessException(errorMessage, HttpStatus.BAD_REQUEST);
        }
        return value;
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private List<String> normalizeList(List<String> values) {
        if (values == null) {
            return List.of();
        }
        return values.stream()
                .map(this::normalize)
                .filter(value -> value != null)
                .distinct()
                .toList();
    }

    private Integer resolveProfileCompletionScore(FreelancerProfileDraftRequest request, FreelancerProfileDraft draft) {
        if (request.getProfileCompletionScore() != null) {
            return Math.max(0, Math.min(100, request.getProfileCompletionScore()));
        }

        int filledFields = 0;
        filledFields += draft.getHeadline() != null ? 1 : 0;
        filledFields += draft.getProfessionalBio() != null ? 1 : 0;
        filledFields += !draft.getSkills().isEmpty() ? 1 : 0;
        filledFields += draft.getCity() != null ? 1 : 0;
        filledFields += draft.getAvailability() != null ? 1 : 0;
        filledFields += draft.getHourlyRate() != null ? 1 : 0;
        filledFields += draft.getPortfolioUrl() != null ? 1 : 0;
        filledFields += !draft.getPrimaryCategories().isEmpty() ? 1 : 0;
        filledFields += draft.getRemoteMode() != null ? 1 : 0;

        return Math.round((filledFields / 9f) * 100);
    }

    private ClientRequestDraftDto mapClientDraft(ClientRequestDraft draft) {
        return ClientRequestDraftDto.builder()
                .id(draft.getId())
                .userId(draft.getClient().getId())
                .category(draft.getCategory())
                .city(draft.getCity())
                .mode(draft.getMode())
                .budget(draft.getBudget())
                .deadlineDays(draft.getDeadlineDays())
                .objective(draft.getObjective())
                .deliverables(draft.getDeliverables())
                .createdAt(draft.getCreatedAt())
                .updatedAt(draft.getUpdatedAt())
                .build();
    }

    private FreelancerProfileDraftDto mapFreelancerDraft(FreelancerProfileDraft draft) {
        return FreelancerProfileDraftDto.builder()
                .id(draft.getId())
                .userId(draft.getUser().getId())
                .headline(draft.getHeadline())
                .professionalBio(draft.getProfessionalBio())
                .skills(draft.getSkills())
                .city(draft.getCity())
                .availability(draft.getAvailability())
                .hourlyRate(draft.getHourlyRate())
                .portfolioUrl(draft.getPortfolioUrl())
                .primaryCategories(draft.getPrimaryCategories())
                .remoteMode(draft.getRemoteMode())
                .profileCompletionScore(draft.getProfileCompletionScore())
                .createdAt(draft.getCreatedAt())
                .updatedAt(draft.getUpdatedAt())
                .build();
    }
}
