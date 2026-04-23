package com.marketplace.service;

import com.marketplace.dto.admin.AdminStatsDto;
import com.marketplace.dto.admin.ReportDto;
import com.marketplace.dto.service.CategoryDto;
import com.marketplace.dto.user.UserDto;
import com.marketplace.entity.Category;
import com.marketplace.entity.Report;
import com.marketplace.entity.ServiceEntity;
import com.marketplace.entity.User;
import com.marketplace.enums.ReportStatus;
import com.marketplace.enums.ServiceStatus;
import com.marketplace.enums.UserStatus;
import com.marketplace.repository.CategoryRepository;
import com.marketplace.repository.OrderRepository;
import com.marketplace.repository.ReportRepository;
import com.marketplace.repository.ServiceRepository;
import com.marketplace.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final ServiceRepository serviceRepository;
    private final OrderRepository orderRepository;
    private final ReportRepository reportRepository;
    private final CategoryRepository categoryRepository;

    public AdminStatsDto getPlatformStatistics() {
        return AdminStatsDto.builder()
                .totalUsers(userRepository.count())
                .totalOrders(orderRepository.count())
                .activeServices(serviceRepository.countByStatus(ServiceStatus.PUBLISHED))
                .build();
    }

    public List<UserDto> getAllUsers() {
        return userRepository.findAll().stream().map(this::mapToUserDto).collect(Collectors.toList());
    }

    @Transactional
    public void suspendUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        user.setStatus(UserStatus.SUSPENDED);
        userRepository.save(user);
    }

    public List<ReportDto> getAllReports() {
        return reportRepository.findAll().stream().map(this::mapToReportDto).collect(Collectors.toList());
    }

    @Transactional
    public void resolveReport(Long reportId, String adminNotes) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Signalement introuvable"));
        report.setStatus(ReportStatus.RESOLVED);
        report.setAdminNotes(adminNotes);
        reportRepository.save(report);
    }

    @Transactional
    public void moderateService(Long serviceId, ServiceStatus status) {
        ServiceEntity service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new RuntimeException("Service introuvable"));
        service.setStatus(status);
        serviceRepository.save(service);
    }

    // Category Management
    public List<CategoryDto> getAllCategories() {
        return categoryRepository.findAll().stream().map(this::mapToCategoryDto).collect(Collectors.toList());
    }

    @Transactional
    public CategoryDto createCategory(CategoryDto dto) {
        Category category = Category.builder()
                .name(dto.getName())
                .slug(slugify(dto.getName()))
                .description(dto.getDescription())
                .isActive(dto.isActive())
                .build();
        category = categoryRepository.save(category);
        return mapToCategoryDto(category);
    }

    @Transactional
    public CategoryDto updateCategory(Long id, CategoryDto dto) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Categorie introuvable"));
        category.setName(dto.getName());
        category.setSlug(slugify(dto.getName()));
        category.setDescription(dto.getDescription());
        category.setActive(dto.isActive());
        category = categoryRepository.save(category);
        return mapToCategoryDto(category);
    }

    // Mappers
    private UserDto mapToUserDto(User user) {
        return UserDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .role(user.getRole())
                .status(user.getStatus())
                .createdAt(user.getCreatedAt())
                .build();
    }

    private ReportDto mapToReportDto(Report report) {
        return ReportDto.builder()
                .id(report.getId())
                .reporterId(report.getReporter().getId())
                .targetType(report.getTargetType())
                .targetId(report.getTargetId())
                .reason(report.getReason())
                .status(report.getStatus())
                .adminNotes(report.getAdminNotes())
                .createdAt(report.getCreatedAt())
                .build();
    }

    private CategoryDto mapToCategoryDto(Category category) {
        return CategoryDto.builder()
                .id(category.getId())
                .name(category.getName())
                .description(category.getDescription())
                .isActive(category.isActive())
                .build();
    }

    private String slugify(String value) {
        if (value == null || value.isBlank()) {
            return "categorie";
        }
        String slug = value.toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
        return slug.isBlank() ? "categorie" : slug;
    }
}
