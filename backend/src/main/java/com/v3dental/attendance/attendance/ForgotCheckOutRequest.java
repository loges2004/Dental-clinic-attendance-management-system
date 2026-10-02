package com.v3dental.attendance.attendance;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalTime;

@Data
public class ForgotCheckOutRequest {
    @NotNull(message = "Actual departure time is required")
    @JsonFormat(pattern = "HH:mm")
    private LocalTime actualCheckOutTime;

    private BigDecimal latitude;
    private BigDecimal longitude;
    private BigDecimal accuracy;

    private String reason;
}
