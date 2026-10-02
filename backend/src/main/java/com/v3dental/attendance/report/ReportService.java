package com.v3dental.attendance.report;

import com.v3dental.attendance.attendance.Attendance;
import com.v3dental.attendance.attendance.AttendanceRepository;
import com.v3dental.attendance.audit.AuditService;
import com.v3dental.attendance.employee.EmployeeRepository;
import com.v3dental.attendance.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.PrintWriter;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final AttendanceRepository attendanceRepository;
    private final EmployeeRepository employeeRepository;
    private final AuditService auditService;

    public MonthlyArchiveSummaryDto getMonthlySummary(int year, int month) {
        YearMonth ym = YearMonth.of(year, month);
        LocalDate startDate = ym.atDay(1);
        LocalDate endDate = ym.atEndOfMonth();

        List<Attendance> records = attendanceRepository.findByAttendanceDateBetweenOrderByAttendanceDateDesc(startDate, endDate);
        long totalEmployees = employeeRepository.count();

        long present = records.stream().filter(r -> "PRESENT".equals(r.getStatus()) || "LATE".equals(r.getStatus())).count();
        long late = records.stream().filter(r -> Boolean.TRUE.equals(r.getIsLate())).count();
        long onLeave = records.stream().filter(r -> "ON_LEAVE".equals(r.getStatus())).count();
        long absent = records.stream().filter(r -> "ABSENT".equals(r.getStatus())).count();

        return MonthlyArchiveSummaryDto.builder()
            .year(year)
            .month(month)
            .monthName(ym.getMonth().name())
            .totalEmployeeCount(totalEmployees)
            .totalAttendanceRecords(records.size())
            .presentCount(present)
            .lateCount(late)
            .absentCount(absent)
            .onLeaveCount(onLeave)
            .totalDaysInMonth(ym.lengthOfMonth())
            .build();
    }

    public byte[] generateMonthlyPdfReport(int year, int month) {
        YearMonth ym = YearMonth.of(year, month);
        LocalDate startDate = ym.atDay(1);
        LocalDate endDate = ym.atEndOfMonth();
        List<Attendance> records = attendanceRepository.findByAttendanceDateBetweenOrderByAttendanceDateDesc(startDate, endDate);

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        PrintWriter writer = new PrintWriter(out);

        writer.println("%PDF-1.4");
        writer.println("% V3 Dental Clinic - Attendance Report for " + ym.getMonth().name() + " " + year);
        writer.println("==================================================================================");
        writer.println("V3 DENTAL CLINIC — MONTHLY ATTENDANCE ARCHIVE REPORT");
        writer.println("Period: " + ym.getMonth().name() + " " + year + " (" + startDate + " to " + endDate + ")");
        writer.println("Generated At: " + java.time.OffsetDateTime.now());
        writer.println("Total Records: " + records.size());
        writer.println("==================================================================================");
        writer.println(String.format("%-12s | %-12s | %-20s | %-15s | %-10s | %-10s | %-12s | %-10s",
            "Date", "Emp Code", "Employee Name", "Branch", "Check In", "Check Out", "Total Hours", "Status"));
        writer.println("--------------------------------------------------------------------------------------------------");

        for (Attendance a : records) {
            String checkIn = (a.getCheckInAt() != null) ? a.getCheckInAt().format(DateTimeFormatter.ofPattern("HH:mm")) : "--:--";
            String checkOut = (a.getCheckOutAt() != null) ? a.getCheckOutAt().format(DateTimeFormatter.ofPattern("HH:mm")) : "--:--";
            String empName = a.getEmployee().getFirstName() + " " + a.getEmployee().getLastName();
            int totalMins = a.getTotalWorkMinutes() != null ? a.getTotalWorkMinutes() : 0;
            String totalHours = (totalMins / 60) + "h " + (totalMins % 60) + "m";
            writer.println(String.format("%-12s | %-12s | %-20s | %-15s | %-10s | %-10s | %-12s | %-10s",
                a.getAttendanceDate(), a.getEmployee().getEmployeeCode(), empName, a.getBranch().getCode(), checkIn, checkOut, totalHours, a.getStatus()));
        }

        writer.println("==================================================================================================");
        writer.println("END OF REPORT — V3 DENTAL CLINIC ATTENDANCE SYSTEM");
        writer.flush();
        return out.toByteArray();
    }

    public byte[] generateMonthlyExcelCsvReport(int year, int month) {
        YearMonth ym = YearMonth.of(year, month);
        LocalDate startDate = ym.atDay(1);
        LocalDate endDate = ym.atEndOfMonth();
        List<Attendance> records = attendanceRepository.findByAttendanceDateBetweenOrderByAttendanceDateDesc(startDate, endDate);

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        PrintWriter writer = new PrintWriter(out);

        writer.println("Date,Employee Code,Employee Name,Designation,Branch,Shift,Check In Time,Check Out Time,Total Work Minutes,Total Work Hours,Status,Is Late,Is Early Checkout");

        for (Attendance a : records) {
            String checkIn = (a.getCheckInAt() != null) ? a.getCheckInAt().toString() : "";
            String checkOut = (a.getCheckOutAt() != null) ? a.getCheckOutAt().toString() : "";
            String empName = a.getEmployee().getFirstName() + " " + a.getEmployee().getLastName();
            String shiftName = (a.getShift() != null) ? a.getShift().getName() : "N/A";
            int totalMins = a.getTotalWorkMinutes() != null ? a.getTotalWorkMinutes() : 0;
            String totalHoursFormatted = String.format("%.2f hrs (%dh %dm)", totalMins / 60.0, totalMins / 60, totalMins % 60);

            writer.println(String.format("%s,\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",%d,\"%s\",\"%s\",%b,%b",
                a.getAttendanceDate(),
                a.getEmployee().getEmployeeCode(),
                empName,
                a.getEmployee().getDesignation(),
                a.getBranch().getName(),
                shiftName,
                checkIn,
                checkOut,
                totalMins,
                totalHoursFormatted,
                a.getStatus(),
                a.getIsLate(),
                a.getIsEarlyCheckout()
            ));
        }


        writer.flush();
        return out.toByteArray();
    }

    @Transactional
    public int deleteMonthlyAttendanceRecords(int year, int month, User adminUser) {
        YearMonth ym = YearMonth.of(year, month);
        LocalDate startDate = ym.atDay(1);
        LocalDate endDate = ym.atEndOfMonth();

        int deletedCount = attendanceRepository.deleteByAttendanceDateBetween(startDate, endDate);
        auditService.logAction(adminUser, "ATTENDANCE_DELETED", "ATTENDANCE", null,
            "Purged " + deletedCount + " attendance records for month: " + ym.getMonth().name() + " " + year);

        return deletedCount;
    }
}
