package com.marketplace.service;

import com.marketplace.dto.user.UserDto;
import com.marketplace.entity.User;
import com.marketplace.enums.UserRole;
import com.marketplace.exception.BusinessException;
import com.marketplace.exception.ResourceNotFoundException;
import com.marketplace.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ClientProfileService {

    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public UserDto getProfile(Long userId) {
        User user = getClientUser(userId);
        return mapToDto(user);
    }

    @Transactional
    public UserDto updateProfile(Long userId, UserDto dto) {
        User user = getClientUser(userId);

        user.setFirstName(normalizeRequired(dto.getFirstName(), "Le prenom est obligatoire."));
        user.setLastName(normalizeRequired(dto.getLastName(), "Le nom est obligatoire."));
        user.setPhone(normalizeOptional(dto.getPhone()));
        user.setCity(normalizeOptional(dto.getCity()));

        return mapToDto(userRepository.save(user));
    }

    private User getClientUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Client introuvable"));

        if (user.getRole() != UserRole.CLIENT) {
            throw new BusinessException("Ce profil est reserve aux clients.", HttpStatus.FORBIDDEN);
        }

        return user;
    }

    private String normalizeRequired(String value, String errorMessage) {
        String normalized = value == null ? "" : value.trim();
        if (normalized.length() < 2) {
            throw new BusinessException(errorMessage, HttpStatus.BAD_REQUEST);
        }
        return normalized;
    }

    private String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private UserDto mapToDto(User user) {
        return UserDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .phone(user.getPhone())
                .city(user.getCity())
                .role(user.getRole())
                .status(user.getStatus())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}
