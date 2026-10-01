package com.v3dental.attendance.attendance;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class CheckOutRequest {
    @NotNull(message = "Latitude is required")
    private BigDecimal latitude;

    @NotNull(message = "Longitude is required")
    private BigDecimal longitude;

    @NotNull(message = "GPS Accuracy is required")
    private BigDecimal accuracy;

    private String notes;
}
