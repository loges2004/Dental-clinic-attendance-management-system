package com.v3dental.attendance.leave;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class LeaveAdjustmentRequest {
    @NotNull(message = "Employee ID is required")
    private Long employeeId;

    @NotNull(message = "Adjustment amount is required")
    private BigDecimal amount; // e.g. +1.0 or -0.5

    @NotBlank(message = "Reason for adjustment is required")
    private String reason;
}
