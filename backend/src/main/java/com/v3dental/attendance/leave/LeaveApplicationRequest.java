package com.v3dental.attendance.leave;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class LeaveApplicationRequest {
    @NotNull(message = "Leave Type ID is required")
    private Long leaveTypeId;

    @NotNull(message = "Start date is required")
    private LocalDate startDate;

    @NotNull(message = "End date is required")
    private LocalDate endDate;

    @NotNull(message = "Duration is required")
    private BigDecimal duration; // e.g. 0.5 for half day, 1.0 for full day

    @NotBlank(message = "Duration type is required")
    private String durationType; // FULL_DAY, HALF_DAY

    @NotBlank(message = "Reason is required")
    private String reason;
}
