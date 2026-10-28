package com.v3dental.attendance.report;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SalaryAttendanceSummaryDto {
    private int sNo;
    private Long employeeId;
    private String employeeCode;
    private String employeeName;
    private String month;
    private String fromDate;
    private String toDate;
    private int totalDays;          // Total calendar days in range including Sundays
    private int totalWorkingDays;   // Total clinic working days
    private int presentDays;        // Days attended (including Sunday shifts)
    private int leaveDays;          // Approved leave days
    private int absentDays;         // Absent days on working days
    private String totalWorkingHours;
    private long totalWorkMinutes;
    private int lateCount;
    private long totalLateMinutes;
    private String designation;
    private String branchName;
}
