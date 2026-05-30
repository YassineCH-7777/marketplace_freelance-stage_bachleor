package com.marketplace.model;

import com.marketplace.enums.MissionMilestoneStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "mission_milestones")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MissionMilestone {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @Column(nullable = false, length = 160)
    private String title;

    @Column
    private String description;

    @Column
    private BigDecimal amount;

    @Column
    private LocalDate deadline;

    @Column(name = "timer_duration_minutes")
    private Integer timerDurationMinutes;

    @Column(name = "timer_started_at")
    private LocalDateTime timerStartedAt;

    @Column(name = "timer_completed_at")
    private LocalDateTime timerCompletedAt;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Builder.Default
    @Column(nullable = false, columnDefinition = "mission_milestone_status")
    private MissionMilestoneStatus status = MissionMilestoneStatus.PENDING;

    @Builder.Default
    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
