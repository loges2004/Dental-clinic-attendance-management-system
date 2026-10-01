package com.v3dental.attendance.report;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MonthlyArchiveSummaryDto {
    private int year;
    private int month;
    private String monthName;
    private long totalEmployeeCount;
    private long totalAttendanceRecords;
    private long presentCount;
    private long lateCount;
    private long absentCount;
    private long onLeaveCount;
    private int totalDaysInMonth;
}
