package com.v3dental.attendance.attendance;

import lombok.Data;
import java.time.OffsetDateTime;

@Data
public class AttendanceCorrectionRequest {
    private OffsetDateTime checkInAt;
    private OffsetDateTime checkOutAt;
    private String status;
    private String reason;
    private Long sessionId;
    private Integer totalWorkMinutes;
}
