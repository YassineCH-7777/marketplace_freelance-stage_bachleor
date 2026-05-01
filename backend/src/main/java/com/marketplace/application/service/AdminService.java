package com.marketplace.application.service;

import com.marketplace.web.dto.admin.AdminStatsDto;
import com.marketplace.web.dto.order.OrderDto;
import com.marketplace.web.dto.admin.ReportDto;
import com.marketplace.web.dto.service.CategoryDto;
import com.marketplace.web.dto.service.ServiceDto;
import com.marketplace.web.dto.user.UserDto;
import com.marketplace.domain.model.Category;
import com.marketplace.domain.model.Order;
import com.marketplace.domain.model.Report;
import com.marketplace.domain.model.ServiceEntity;
import com.marketplace.domain.model.User;
import com.marketplace.domain.enums.NotificationType;
import com.marketplace.domain.enums.OrderStatus;
import com.marketplace.domain.enums.ReportStatus;
import com.marketplace.domain.enums.ServiceStatus;
import com.marketplace.domain.enums.UserRole;
import com.marketplace.domain.enums.UserStatus;
import com.marketplace.infrastructure.persistence.CategoryRepository;
import com.marketplace.infrastructure.persistence.OrderRepository;
import com.marketplace.infrastructure.persistence.ReportRepository;
import com.marketplace.infrastructure.persistence.ServiceRepository;
import com.marketplace.infrastructure.persistence.UserRepository;
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
    private final NotificationService notificationService;

    @Transactional(readOnly = true)
    public AdminStatsDto getPlatformStatistics() {
        return AdminStatsDto.builder()
                .totalUsers(userRepository.count())
                .totalClients(userRepository.countByRole(UserRole.CLIENT))
                .totalFreelancers(userRepository.countByRole(UserRole.FREELANCER))
                .totalOrders(orderRepository.count())
                .pendingOrders(orderRepository.countByStatus(OrderStatus.PENDING))
                .inProgressOrders(orderRepository.countByStatus(OrderStatus.IN_PROGRESS))
                .completedOrders(orderRepository.countByStatus(OrderStatus.COMPLETED))
                .activeServices(serviceRepository.countByStatus(ServiceStatus.PUBLISHED))
                .suspendedServices(serviceRepository.countByStatus(ServiceStatus.SUSPENDED))
                .totalCategories(categoryRepository.count())
                .totalReports(reportRepository.count())
                .openReports(reportRepository.countByStatus(ReportStatus.OPEN)
                        + reportRepository.countByStatus(ReportStatus.IN_REVIEW))
                .build();
    }

    @Transactional(readOnly = true)
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

    @Transactional
    public void activateUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        user.setStatus(UserStatus.ACTIVE);
        userRepository.save(user);
    }

    @Transactional(readOnly = true)
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

    @Transactional(readOnly = true)
    public List<ServiceDto> getAllServices() {
        return serviceRepository.findAll().stream()
                .map(this::mapToServiceDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<OrderDto> getAllOrders() {
        return orderRepository.findAll().stream()
                .map(this::mapToOrderDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public int sendSystemNotification(String content, String audience) {
        String normalizedContent = content == null ? "" : content.trim();
        if (normalizedContent.length() < 5) {
            throw new RuntimeException("Le contenu de la notification doit contenir au moins 5 caracteres");
        }

        List<User> recipients = userRepository.findAll().stream()
                .filter(user -> user.getStatus() == UserStatus.ACTIVE)
                .filter(user -> matchesAudience(user, audience))
                .toList();

        recipients.forEach(user -> notificationService.createNotification(
                user.getId(),
                NotificationType.SYSTEM,
                normalizedContent));

        return recipients.size();
    }

    // Category Management
    @Transactional(readOnly = true)
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

    private ServiceDto mapToServiceDto(ServiceEntity service) {
        return ServiceDto.builder()
                .id(service.getId())
                .title(service.getTitle())
                .description(service.getDescription())
                .price(service.getPrice())
                .categoryId(service.getCategory().getId())
                .categoryName(service.getCategory().getName())
                .freelancerId(service.getFreelancer().getUser().getId())
                .freelancerEmail(service.getFreelancer().getUser().getEmail())
                .freelancerCity(service.getFreelancer().getUser().getCity())
                .serviceCity(service.getCity())
                .remote(service.isRemote())
                .deliveryTimeDays(service.getDeliveryTimeDays())
                .coverImageUrl(service.getCoverImageUrl())
                .galleryImageUrls(List.of())
                .executionMode(resolveExecutionMode(service))
                .status(service.getStatus().name())
                .build();
    }

    private OrderDto mapToOrderDto(Order order) {
        return OrderDto.builder()
                .id(order.getId())
                .serviceId(order.getService().getId())
                .serviceTitle(order.getService().getTitle())
                .clientId(order.getClient().getId())
                .clientEmail(order.getClient().getEmail())
                .freelancerId(order.getFreelancer().getUser().getId())
                .freelancerEmail(order.getFreelancer().getUser().getEmail())
                .amount(order.getAgreedPrice())
                .status(order.getStatus())
                .requestMessage(order.getRequest() != null ? order.getRequest().getMessage() : null)
                .startDate(order.getStartDate())
                .endDate(order.getEndDate())
                .notes(order.getNotes())
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())
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

    private boolean matchesAudience(User user, String audience) {
        if (audience == null || audience.isBlank() || "ALL".equalsIgnoreCase(audience)) {
            return true;
        }
        return user.getRole().name().equalsIgnoreCase(audience);
    }

    private String resolveExecutionMode(ServiceEntity service) {
        if (!service.isRemote()) {
            return "ON_SITE";
        }

        String city = service.getCity() == null ? "" : service.getCity().trim();
        if (!city.isEmpty() && !"remote".equalsIgnoreCase(city)) {
            return "HYBRID";
        }

        return "REMOTE";
    }
}
