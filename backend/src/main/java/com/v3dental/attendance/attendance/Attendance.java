package com.v3dental.attendance.attendance;

import com.v3dental.attendance.branch.Branch;
import com.v3dental.attendance.employee.Employee;
import com.v3dental.attendance.shift.Shift;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "attendance", uniqueConstraints = {
    @UniqueConstraint(name = "uk_employee_attendance_date", columnNames = {"employee_id", "attendance_date"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Attendance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "branch_id", nullable = false)
    private Branch branch;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "shift_id")
    private Shift shift;

    @Column(name = "attendance_date", nullable = false)
    private LocalDate attendanceDate;

    // Check-in Telemetry
    @Column(name = "check_in_at", nullable = false)
    private OffsetDateTime checkInAt;

    @Column(name = "check_in_latitude", nullable = false, precision = 10, scale = 8)
    private BigDecimal checkInLatitude;

    @Column(name = "check_in_longitude", nullable = false, precision = 11, scale = 8)
    private BigDecimal checkInLongitude;

    @Column(name = "check_in_accuracy", nullable = false, precision = 6, scale = 2)
    private BigDecimal checkInAccuracy;

    @Column(name = "check_in_distance", nullable = false, precision = 8, scale = 2)
    private BigDecimal checkInDistance;

    // Check-out Telemetry
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

    @Column(nullable = false, length = 30)
    private String status; // PRESENT, LATE, EARLY_CHECKOUT, ABSENT, HALF_DAY, ON_LEAVE

    @Column(name = "is_late", nullable = false)
    private Boolean isLate = false;

    @Column(name = "is_early_checkout", nullable = false)
    private Boolean isEarlyCheckout = false;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
        updatedAt = OffsetDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
