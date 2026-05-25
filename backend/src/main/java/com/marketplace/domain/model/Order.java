package com.marketplace.domain.model;

import com.marketplace.domain.enums.OrderStatus;
import com.marketplace.domain.enums.PaymentStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

@Entity
@Table(name = "orders") // "Order" is a reserved SQL keyword, so table must be "orders"
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "request_id", unique = true)
    private OrderRequest request;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id")
    private ServiceEntity service;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "proposal_id")
    private Proposal proposal;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    private User client;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "freelancer_id", nullable = false)
    private FreelancerProfile freelancer;

    @Column(name = "agreed_price", nullable = false)
    private BigDecimal agreedPrice;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Builder.Default
    @Column(name = "progress_percentage", nullable = false)
    private Integer progressPercentage = 0;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Builder.Default
    @Column(name = "payment_status", nullable = false, columnDefinition = "payment_status")
    private PaymentStatus paymentStatus = PaymentStatus.UNPAID;

    @Column(name = "notes")
    private String notes;

    @Column(name = "delivery_note")
    private String deliveryNote;

    @Column(name = "revision_request")
    private String revisionRequest;

    @Builder.Default
    @Column(name = "revision_count", nullable = false)
    private Integer revisionCount = 0;

    @Builder.Default
    @Column(name = "max_revision_rounds", nullable = false)
    private Integer maxRevisionRounds = 3;

    @Column(name = "delivered_at")
    private LocalDateTime deliveredAt;

    @Column(name = "dispute_reason")
    private String disputeReason;

    @Column(name = "dispute_admin_notes")
    private String disputeAdminNotes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dispute_opened_by_id")
    private User disputeOpenedBy;

    @Column(name = "dispute_opened_at")
    private LocalDateTime disputeOpenedAt;

    @Column(name = "dispute_resolved_at")
    private LocalDateTime disputeResolvedAt;

    @Column(name = "dispute_resolution")
    private String disputeResolution;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Builder.Default
    @Column(nullable = false, columnDefinition = "order_status")
    private OrderStatus status = OrderStatus.PENDING;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
