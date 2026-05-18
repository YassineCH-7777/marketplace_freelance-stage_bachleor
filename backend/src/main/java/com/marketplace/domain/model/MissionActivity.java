package com.marketplace.domain.model;

import com.marketplace.domain.enums.MissionActivityType;
import com.marketplace.domain.enums.OrderStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

@Entity
@Table(name = "mission_activities")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MissionActivity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_user_id")
    private User actor;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "mission_activity_type")
    private MissionActivityType type;

    @Column(nullable = false, length = 180)
    private String title;

    @Column
    private String details;

    @Column(name = "progress_snapshot")
    private Integer progressSnapshot;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "status_snapshot", columnDefinition = "order_status")
    private OrderStatus statusSnapshot;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
