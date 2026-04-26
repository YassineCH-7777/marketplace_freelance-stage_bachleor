package com.marketplace.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.marketplace.entity.Category;
import com.marketplace.entity.FreelancerProfile;
import com.marketplace.entity.ServiceEntity;
import com.marketplace.entity.User;
import com.marketplace.enums.ServiceStatus;
import com.marketplace.enums.UserRole;
import com.marketplace.enums.UserStatus;
import com.marketplace.repository.CategoryRepository;
import com.marketplace.repository.ConversationRepository;
import com.marketplace.repository.FreelancerProfileRepository;
import com.marketplace.repository.MessageRepository;
import com.marketplace.repository.NotificationRepository;
import com.marketplace.repository.OrderRepository;
import com.marketplace.repository.OrderRequestRepository;
import com.marketplace.repository.ReportRepository;
import com.marketplace.repository.ReviewRepository;
import com.marketplace.repository.ServiceImageRepository;
import com.marketplace.repository.ServiceRepository;
import com.marketplace.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(
        properties = {
                "spring.autoconfigure.exclude=" +
                        "org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration," +
                        "org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration"
        }
)
@EnableAutoConfiguration(exclude = {
        DataSourceAutoConfiguration.class,
        HibernateJpaAutoConfiguration.class
})
@AutoConfigureMockMvc
class ApiIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private ServiceRepository serviceRepository;

    @MockBean
    private ServiceImageRepository serviceImageRepository;

    @MockBean
    private CategoryRepository categoryRepository;

    @MockBean
    private FreelancerProfileRepository freelancerProfileRepository;

    @MockBean
    private OrderRepository orderRepository;

    @MockBean
    private OrderRequestRepository orderRequestRepository;

    @MockBean
    private ReviewRepository reviewRepository;

    @MockBean
    private ReportRepository reportRepository;

    @MockBean
    private NotificationRepository notificationRepository;

    @MockBean
    private ConversationRepository conversationRepository;

    @MockBean
    private MessageRepository messageRepository;

    @Test
    void freelancerCreateServiceReturnsCompleteDto() throws Exception {
        User freelancerUser = freelancerUser(13L, "freelancer1@marketplace.com", "Casablanca");
        FreelancerProfile profile = freelancerProfile(6L, freelancerUser);
        Category category = category(2L, "Developpement web");

        when(userRepository.findById(13L)).thenReturn(Optional.of(freelancerUser));
        when(freelancerProfileRepository.findByUserId(13L)).thenReturn(Optional.of(profile));
        when(categoryRepository.findById(2L)).thenReturn(Optional.of(category));
        when(serviceRepository.save(any(ServiceEntity.class))).thenAnswer(invocation -> {
            ServiceEntity service = invocation.getArgument(0);
            service.setId(99L);
            return service;
        });

        mockMvc.perform(post("/api/freelancer/services")
                        .with(SecurityMockMvcRequestPostProcessors.user(freelancerUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateServiceRequest(
                                "QA API Service",
                                "Service cree automatiquement pour tester le backend.",
                                new BigDecimal("199.99"),
                                2L
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(99))
                .andExpect(jsonPath("$.title").value("QA API Service"))
                .andExpect(jsonPath("$.categoryName").value("Developpement web"))
                .andExpect(jsonPath("$.freelancerId").value(13))
                .andExpect(jsonPath("$.freelancerEmail").value("freelancer1@marketplace.com"))
                .andExpect(jsonPath("$.freelancerCity").value("Casablanca"))
                .andExpect(jsonPath("$.status").value("ACTIVE"));
    }

    @Test
    void publicServicesExposeMappedFreelancerFields() throws Exception {
        User freelancerUser = freelancerUser(13L, "freelancer1@marketplace.com", "Marrakech");
        FreelancerProfile profile = freelancerProfile(6L, freelancerUser);
        Category category = category(2L, "Developpement web");
        ServiceEntity service = ServiceEntity.builder()
                .id(7L)
                .title("Creation de site web professionnel")
                .slug("creation-site")
                .shortDescription("Short")
                .description("Description complete du service")
                .price(new BigDecimal("1500.00"))
                .status(ServiceStatus.PUBLISHED)
                .category(category)
                .freelancer(profile)
                .city("Marrakech")
                .deliveryTimeDays(14)
                .remote(true)
                .build();

        when(serviceRepository.findByStatus(ServiceStatus.PUBLISHED)).thenReturn(List.of(service));

        mockMvc.perform(get("/api/public/services"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(7))
                .andExpect(jsonPath("$[0].freelancerId").value(13))
                .andExpect(jsonPath("$[0].freelancerEmail").value("freelancer1@marketplace.com"))
                .andExpect(jsonPath("$[0].freelancerCity").value("Marrakech"))
                .andExpect(jsonPath("$[0].status").value("ACTIVE"));
    }

    @Test
    void publicCategoriesExposeOnlyActiveCategories() throws Exception {
        Category activeCategory = category(2L, "Developpement web");
        Category inactiveCategory = category(3L, "Categorie archivee");
        inactiveCategory.setActive(false);

        when(categoryRepository.findAll()).thenReturn(List.of(activeCategory, inactiveCategory));

        mockMvc.perform(get("/api/public/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(2))
                .andExpect(jsonPath("$[0].name").value("Developpement web"));
    }

    @Test
    void freelancerCanUploadServiceImage() throws Exception {
        User freelancerUser = freelancerUser(13L, "freelancer1@marketplace.com", "Casablanca");
        MockMultipartFile image = new MockMultipartFile(
                "image",
                "cover.png",
                MediaType.IMAGE_PNG_VALUE,
                new byte[] {1, 2, 3, 4}
        );

        mockMvc.perform(multipart("/api/freelancer/uploads/image")
                        .file(image)
                        .with(SecurityMockMvcRequestPostProcessors.user(freelancerUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.url").exists())
                .andExpect(jsonPath("$.fileName").value("cover.png"))
                .andExpect(jsonPath("$.contentType").value(MediaType.IMAGE_PNG_VALUE));
    }

    @Test
    void adminEndpointRejectsClientUser() throws Exception {
        User clientUser = clientUser(20L, "client1@marketplace.com");

        mockMvc.perform(get("/api/admin/users")
                        .with(SecurityMockMvcRequestPostProcessors.user(clientUser)))
                .andExpect(status().isForbidden());
    }

    private User freelancerUser(Long id, String email, String city) {
        return User.builder()
                .id(id)
                .email(email)
                .password("hashed")
                .firstName("Free")
                .lastName("Lancer")
                .city(city)
                .role(UserRole.FREELANCER)
                .status(UserStatus.ACTIVE)
                .build();
    }

    private User clientUser(Long id, String email) {
        return User.builder()
                .id(id)
                .email(email)
                .password("hashed")
                .firstName("Client")
                .lastName("User")
                .role(UserRole.CLIENT)
                .status(UserStatus.ACTIVE)
                .build();
    }

    private FreelancerProfile freelancerProfile(Long id, User user) {
        return FreelancerProfile.builder()
                .id(id)
                .user(user)
                .skills(List.of("Java", "React"))
                .averageRating(BigDecimal.ZERO)
                .totalReviews(0)
                .completedOrders(0)
                .build();
    }

    private Category category(Long id, String name) {
        return Category.builder()
                .id(id)
                .name(name)
                .slug("developpement-web")
                .description("Category")
                .isActive(true)
                .build();
    }

    private record CreateServiceRequest(
            String title,
            String description,
            BigDecimal price,
            Long categoryId
    ) {}
}
