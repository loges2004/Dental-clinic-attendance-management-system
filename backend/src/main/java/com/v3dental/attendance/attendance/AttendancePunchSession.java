package com.v3dental.attendance.attendance;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "attendance_punch_sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendancePunchSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attendance_id", nullable = false)
    @JsonBackReference
    private Attendance attendance;

    @Column(name = "session_number", nullable = false)
    @Builder.Default
    private Integer sessionNumber = 1;


    // Session Check-In
    @Column(name = "check_in_at", nullable = false)
    private OffsetDateTime checkInAt;

    @Column(name = "check_in_latitude", precision = 10, scale = 8)
    private BigDecimal checkInLatitude;

    @Column(name = "check_in_longitude", precision = 11, scale = 8)
    private BigDecimal checkInLongitude;

    @Column(name = "check_in_accuracy", precision = 6, scale = 2)
    private BigDecimal checkInAccuracy;

    @Column(name = "check_in_distance", precision = 8, scale = 2)
    private BigDecimal checkInDistance;

    // Session Check-Out
    @Column(name = "check_out_at")
    private OffsetDateTime checkOutAt;

    @Column(name = "check_out_latitude", precision = 10, scale = 8)
    private BigDecimal checkOutLatitude;

    @Column(name = "check_out_longitude", precision = 11, scale = 8)
    private BigDecimal checkOutLongitude;

    @Column(name = "check_out_accuracy", precision = 6, scale = 2)
    private BigDecimal checkOutAccuracy;

    @Column(name = "check_out_distance", precision = 8, scale = 2)
    private BigDecimal checkOutDistance;

    @Column(name = "duration_minutes")
    @Builder.Default
    private Integer durationMinutes = 0;


    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }
}
