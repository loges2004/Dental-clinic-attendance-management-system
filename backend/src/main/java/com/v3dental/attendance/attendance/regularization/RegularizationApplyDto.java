package com.v3dental.attendance.attendance.regularization;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalTime;

@Data
public class RegularizationApplyDto {
    @NotNull(message = "Attendance date is required")
    private LocalDate attendanceDate;

    @NotNull(message = "Check-in time is required")
    private LocalTime requestedCheckIn;

    private LocalTime requestedCheckOut;

    @NotBlank(message = "Reason is required")
    private String reason;
}
