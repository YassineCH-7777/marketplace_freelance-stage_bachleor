package com.marketplace.service;

import com.marketplace.dto.admin.AdminStatsDto;
import com.marketplace.dto.order.OrderDto;
import com.marketplace.dto.admin.ReportDto;
import com.marketplace.dto.service.CategoryDto;
import com.marketplace.dto.service.ServiceDto;
import com.marketplace.dto.user.UserDto;
import com.marketplace.model.Category;
import com.marketplace.model.Fee;
import com.marketplace.model.Order;
import com.marketplace.model.Report;
import com.marketplace.model.ServiceEntity;
import com.marketplace.model.User;
import com.marketplace.enums.NotificationType;
import com.marketplace.enums.OrderStatus;
import com.marketplace.enums.ReportStatus;
import com.marketplace.enums.ServiceStatus;
import com.marketplace.enums.UserRole;
import com.marketplace.enums.UserStatus;
import com.marketplace.persistence.CategoryRepository;
import com.marketplace.persistence.FeeRepository;
import com.marketplace.persistence.OrderRepository;
import com.marketplace.persistence.ReportRepository;
import com.marketplace.persistence.ServiceRepository;
import com.marketplace.persistence.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
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
    private final FeeRepository feeRepository;

    /**
     * Calcule les statistiques globales affichees dans le tableau de bord admin.
     */
    @Transactional(readOnly = true)
    public AdminStatsDto getPlatformStatistics() {
        List<Fee> fees = feeRepository.findAllByOrderByCreatedAtDesc();
        YearMonth currentMonth = YearMonth.now();
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
                .feeTransactions(fees.size())
                .totalFees(sumFeeValues(fees, Fee::getFeeAmount))
                .currentMonthFees(sumFeeValues(
                        fees.stream()
                                .filter(fee -> fee.getCreatedAt() != null
                                        && YearMonth.from(fee.getCreatedAt()).equals(currentMonth))
                                .toList(),
                        Fee::getFeeAmount))
                .freelancerPayouts(sumFeeValues(fees, Fee::getFreelancerAmount))
                .feesByCategory(groupFeeAmounts(fees, this::resolveFeeCategory))
                .feesByCity(groupFeeAmounts(fees, this::resolveFeeCity))
                .feesByMonth(groupFeeAmounts(fees, fee -> fee.getCreatedAt() != null
                        ? YearMonth.from(fee.getCreatedAt()).toString()
                        : "Date inconnue"))
                .build();
    }

    /**
     * Recupere tous les utilisateurs avec leurs informations de supervision.
     */
    @Transactional(readOnly = true)
    public List<UserDto> getAllUsers() {
        return userRepository.findAll().stream().map(this::mapToUserDto).collect(Collectors.toList());
    }

    /**
     * Suspend un utilisateur afin de bloquer son acces a la plateforme.
     */
    @Transactional
    public void suspendUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        user.setStatus(UserStatus.SUSPENDED);
        userRepository.save(user);
    }

    /**
     * Reactive un utilisateur suspendu ou en attente de moderation.
     */
    @Transactional
    public void activateUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        user.setStatus(UserStatus.ACTIVE);
        userRepository.save(user);
    }

    /**
     * Liste tous les signalements pour traitement admin.
     */
    @Transactional(readOnly = true)
    public List<ReportDto> getAllReports() {
        return reportRepository.findAll().stream().map(this::mapToReportDto).collect(Collectors.toList());
    }

    /**
     * Marque un signalement comme resolu avec les notes d'analyse.
     */
    @Transactional
    public void resolveReport(Long reportId, String adminNotes) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Signalement introuvable"));
        report.setStatus(ReportStatus.RESOLVED);
        report.setAdminNotes(adminNotes);
        reportRepository.save(report);
    }

    /**
     * Change le statut de moderation d'une offre.
     */
    @Transactional
    public void moderateService(Long serviceId, ServiceStatus status) {
        ServiceEntity service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new RuntimeException("Service introuvable"));
        service.setStatus(status);
        serviceRepository.save(service);
    }

    /**
     * Liste toutes les offres, y compris celles non publiees.
     */
    @Transactional(readOnly = true)
    public List<ServiceDto> getAllServices() {
        return serviceRepository.findAll().stream()
                .map(this::mapToServiceDto)
                .collect(Collectors.toList());
    }

    /**
     * Liste toutes les commandes pour le suivi global de la plateforme.
     */
    @Transactional(readOnly = true)
    public List<OrderDto> getAllOrders() {
        return orderRepository.findAll().stream()
                .map(this::mapToOrderDto)
                .collect(Collectors.toList());
    }

    /**
     * Envoie une notification systeme aux utilisateurs actifs de l'audience ciblee.
     */
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
    /**
     * Recupere les categories admin, actives ou inactives.
     */
    @Transactional(readOnly = true)
    public List<CategoryDto> getAllCategories() {
        return categoryRepository.findAll().stream().map(this::mapToCategoryDto).collect(Collectors.toList());
    }

    /**
     * Cree une categorie et genere son slug.
     */
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

    /**
     * Met a jour une categorie existante et son slug.
     */
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
        String serviceTitle = null;
        Long serviceId = null;
        if (order.getService() != null) {
            serviceId = order.getService().getId();
            serviceTitle = order.getService().getTitle();
        } else if (order.getProposal() != null && order.getProposal().getServiceRequest() != null) {
            serviceTitle = order.getProposal().getServiceRequest().getTitle();
        }

        return OrderDto.builder()
                .id(order.getId())
                .serviceId(serviceId)
                .serviceTitle(serviceTitle)
                .clientId(order.getClient().getId())
                .clientEmail(order.getClient().getEmail())
                .freelancerId(order.getFreelancer().getUser().getId())
                .freelancerEmail(order.getFreelancer().getUser().getEmail())
                .amount(order.getAgreedPrice())
                .feePercentage(order.getFee() != null ? order.getFee().getFeePercentage() : null)
                .feeAmount(order.getFee() != null ? order.getFee().getFeeAmount() : null)
                .freelancerAmount(order.getFee() != null ? order.getFee().getFreelancerAmount() : null)
                .feeCreatedAt(order.getFee() != null ? order.getFee().getCreatedAt() : null)
                .status(order.getStatus())
                .progressPercentage(order.getProgressPercentage())
                .paymentStatus(order.getPaymentStatus())
                .requestMessage(order.getRequest() != null ? order.getRequest().getMessage() : null)
                .startDate(order.getStartDate())
                .endDate(order.getEndDate())
                .dueDate(order.getDueDate())
                .notes(order.getNotes())
                .deliveryNote(order.getDeliveryNote())
                .revisionRequest(order.getRevisionRequest())
                .deliveredAt(order.getDeliveredAt())
                .disputeReason(order.getDisputeReason())
                .disputeAdminNotes(order.getDisputeAdminNotes())
                .disputeOpenedById(order.getDisputeOpenedBy() != null ? order.getDisputeOpenedBy().getId() : null)
                .disputeOpenedByEmail(order.getDisputeOpenedBy() != null ? order.getDisputeOpenedBy().getEmail() : null)
                .disputeOpenedAt(order.getDisputeOpenedAt())
                .disputeResolvedAt(order.getDisputeResolvedAt())
                .disputeResolution(order.getDisputeResolution())
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

    private BigDecimal sumFeeValues(List<Fee> fees, Function<Fee, BigDecimal> valueExtractor) {
        return fees.stream()
                .map(valueExtractor)
                .filter(value -> value != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private Map<String, BigDecimal> groupFeeAmounts(List<Fee> fees, Function<Fee, String> keyExtractor) {
        Map<String, BigDecimal> result = new LinkedHashMap<>();
        fees.forEach(fee -> result.merge(
                normalizeFinancialLabel(keyExtractor.apply(fee)),
                fee.getFeeAmount(),
                BigDecimal::add));
        return result;
    }

    private String resolveFeeCategory(Fee fee) {
        Order order = fee.getOrder();
        if (order.getService() != null && order.getService().getCategory() != null) {
            return order.getService().getCategory().getName();
        }
        if (order.getProposal() != null
                && order.getProposal().getServiceRequest() != null
                && order.getProposal().getServiceRequest().getCategory() != null) {
            return order.getProposal().getServiceRequest().getCategory().getName();
        }
        return null;
    }

    private String resolveFeeCity(Fee fee) {
        Order order = fee.getOrder();
        if (order.getService() != null) {
            return order.getService().getCity();
        }
        if (order.getProposal() != null && order.getProposal().getServiceRequest() != null) {
            return order.getProposal().getServiceRequest().getCity();
        }
        return null;
    }

    private String normalizeFinancialLabel(String label) {
        return label == null || label.isBlank() ? "Non renseigne" : label.trim();
    }
}
