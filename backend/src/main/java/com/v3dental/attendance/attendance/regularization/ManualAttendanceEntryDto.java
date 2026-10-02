package com.v3dental.attendance.attendance.regularization;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalTime;

@Data
public class ManualAttendanceEntryDto {
    @NotNull(message = "Employee ID is required")
    private Long employeeId;

    @NotNull(message = "Attendance date is required")
    private LocalDate attendanceDate;

    @NotNull(message = "Check-in time is required")
    private LocalTime checkInTime;

    private LocalTime checkOutTime;

    private String status;

    private String reason;
}
