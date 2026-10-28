package com.v3dental.attendance.report;

import com.v3dental.attendance.attendance.Attendance;
import com.v3dental.attendance.attendance.AttendanceRepository;
import com.v3dental.attendance.audit.AuditService;
import com.v3dental.attendance.employee.Employee;
import com.v3dental.attendance.employee.EmployeeRepository;
import com.v3dental.attendance.leave.LeaveRequest;
import com.v3dental.attendance.leave.LeaveRequestRepository;
import com.v3dental.attendance.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final AttendanceRepository attendanceRepository;
    private final EmployeeRepository employeeRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final AuditService auditService;

    private static final ZoneId CLINIC_ZONE = ZoneId.of("Asia/Kolkata");
    private static final DateTimeFormatter DISPLAY_DATE_FORMAT = DateTimeFormatter.ofPattern("dd-MMM-yyyy", Locale.ENGLISH);
    private static final DateTimeFormatter MONTH_YEAR_FORMAT = DateTimeFormatter.ofPattern("MMMM yyyy", Locale.ENGLISH);

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

    public List<SalaryAttendanceSummaryDto> getSalaryAttendanceSummary(int year, int month) {
        return getSalaryAttendanceSummary(year, month, null, null);
    }

    /**
     * Calculates the employee-level salary and attendance summary for a given month or custom date range.
     * Total Days: All calendar days in the period (INCLUDING Sundays).
     * Total Working Days: Clinic working days (Monday - Saturday).
     * Present Days: All days attended (including any Sunday duty/shifts).
     * Structure:
     * S.No. | Employee ID | Employee Name | Month | From Date | To Date | Total Days | Total Working Days | Present Days | Leave Days | Absent Days | Total Working Hours | Late Count | Total Late Minutes
     */
    public List<SalaryAttendanceSummaryDto> getSalaryAttendanceSummary(int year, int month, LocalDate customFrom, LocalDate customTo) {
        YearMonth ym = YearMonth.of(year, month);
        LocalDate fromDate = (customFrom != null) ? customFrom : ym.atDay(1);
        LocalDate toDate = (customTo != null) ? customTo : ym.atEndOfMonth();

        if (fromDate.isAfter(toDate)) {
            LocalDate tmp = fromDate;
            fromDate = toDate;
            toDate = tmp;
        }

        // All calendar and operating clinic days in the range (All Sundays included - not excluded!)
        List<LocalDate> allDates = new ArrayList<>();
        List<LocalDate> workingDates = new ArrayList<>();

        LocalDate cur = fromDate;
        while (!cur.isAfter(toDate)) {
            allDates.add(cur);
            workingDates.add(cur); // Every day including all Sundays is counted as a clinic operating day
            cur = cur.plusDays(1);
        }

        int totalDays = allDates.size(); // Total days including Sundays
        int totalWorkingDays = workingDates.size(); // Total operating working days including all Sundays

        List<Employee> employees = employeeRepository.findAll().stream()
            .filter(e -> Boolean.TRUE.equals(e.getIsActive()))
            .sorted(Comparator.comparing(Employee::getFirstName, String.CASE_INSENSITIVE_ORDER))
            .collect(Collectors.toList());

        List<Attendance> attendanceRecords = attendanceRepository.findByAttendanceDateBetweenOrderByAttendanceDateDesc(fromDate, toDate);
        List<LeaveRequest> approvedLeaves = leaveRequestRepository.findApprovedLeavesBetween(fromDate, toDate);

        Map<Long, List<Attendance>> attByEmp = attendanceRecords.stream()
            .filter(a -> a.getEmployee() != null)
            .collect(Collectors.groupingBy(a -> a.getEmployee().getId()));

        Map<Long, List<LeaveRequest>> leavesByEmp = approvedLeaves.stream()
            .filter(lr -> lr.getEmployee() != null)
            .collect(Collectors.groupingBy(lr -> lr.getEmployee().getId()));

        String monthStr = fromDate.format(MONTH_YEAR_FORMAT);
        String fromStr = fromDate.format(DISPLAY_DATE_FORMAT);
        String toStr = toDate.format(DISPLAY_DATE_FORMAT);

        List<SalaryAttendanceSummaryDto> results = new ArrayList<>();
        int sNo = 1;

        for (Employee emp : employees) {
            List<Attendance> empAtts = attByEmp.getOrDefault(emp.getId(), Collections.emptyList());
            List<LeaveRequest> empLeaves = leavesByEmp.getOrDefault(emp.getId(), Collections.emptyList());

            // Distinct dates attended on any day within range (including Sunday shifts!)
            Set<LocalDate> attendedDates = empAtts.stream()
                .filter(a -> "PRESENT".equalsIgnoreCase(a.getStatus()) || "LATE".equalsIgnoreCase(a.getStatus())
                    || "HALF_DAY".equalsIgnoreCase(a.getStatus()) || a.getCheckInAt() != null)
                .map(Attendance::getAttendanceDate)
                .filter(allDates::contains)
                .collect(Collectors.toSet());

            int presentDays = attendedDates.size();

            // Approved leave days within range (that were not attended)
            Set<LocalDate> leaveDates = new HashSet<>();
            for (LeaveRequest lr : empLeaves) {
                LocalDate lCur = lr.getStartDate().isBefore(fromDate) ? fromDate : lr.getStartDate();
                LocalDate lEnd = lr.getEndDate().isAfter(toDate) ? toDate : lr.getEndDate();
                while (!lCur.isAfter(lEnd)) {
                    if (allDates.contains(lCur) && !attendedDates.contains(lCur)) {
                        leaveDates.add(lCur);
                    }
                    lCur = lCur.plusDays(1);
                }
            }
            int leaveDays = leaveDates.size();

            // Absent days on working days (where employee was neither present nor on approved leave)
            long absentCount = workingDates.stream()
                .filter(d -> !attendedDates.contains(d) && !leaveDates.contains(d))
                .count();
            int absentDays = (int) absentCount;

            // Total working hours (including Sunday shifts)
            long totalMinutes = empAtts.stream()
                .mapToLong(a -> a.getTotalWorkMinutes() != null ? a.getTotalWorkMinutes() : 0)
                .sum();
            long hrs = totalMinutes / 60;
            long mins = totalMinutes % 60;
            String totalWorkingHours = hrs + "h " + (mins < 10 ? "0" + mins : mins) + "m";

            // Late count and late minutes
            int lateCount = (int) empAtts.stream().filter(a -> Boolean.TRUE.equals(a.getIsLate())).count();
            long totalLateMinutes = 0;

            for (Attendance a : empAtts) {
                if (Boolean.TRUE.equals(a.getIsLate()) && a.getCheckInAt() != null) {
                    LocalTime checkInTime = a.getCheckInAt().atZoneSameInstant(CLINIC_ZONE).toLocalTime();
                    LocalTime baseline = LocalTime.of(9, 15);
                    if (a.getShift() != null) {
                        baseline = a.getShift().getStartTime().plusMinutes(a.getShift().getGracePeriodMinutes());
                    }
                    if (checkInTime.isAfter(baseline)) {
                        totalLateMinutes += Math.max(0, Duration.between(baseline, checkInTime).toMinutes());
                    }
                }
            }

            String empName = (emp.getFirstName() + " " + (emp.getLastName() != null ? emp.getLastName() : "")).trim();
            String branchName = (emp.getBranch() != null) ? emp.getBranch().getName() : "All Branches";
            String designation = emp.getDesignation() != null ? emp.getDesignation() : "Staff";

            results.add(SalaryAttendanceSummaryDto.builder()
                .sNo(sNo++)
                .employeeId(emp.getId())
                .employeeCode(emp.getEmployeeCode() != null ? emp.getEmployeeCode() : "EMP" + emp.getId())
                .employeeName(empName)
                .month(monthStr)
                .fromDate(fromStr)
                .toDate(toStr)
                .totalDays(totalDays)
                .totalWorkingDays(totalWorkingDays)
                .presentDays(presentDays)
                .leaveDays(leaveDays)
                .absentDays(absentDays)
                .totalWorkingHours(totalWorkingHours)
                .totalWorkMinutes(totalMinutes)
                .lateCount(lateCount)
                .totalLateMinutes(totalLateMinutes)
                .designation(designation)
                .branchName(branchName)
                .build());
        }

        return results;
    }

    public byte[] generateMonthlyPdfReport(int year, int month) {
        return generateMonthlyPdfReport(year, month, null, null);
    }

    public byte[] generateMonthlyPdfReport(int year, int month, LocalDate customFrom, LocalDate customTo) {
        List<SalaryAttendanceSummaryDto> summaryList = getSalaryAttendanceSummary(year, month, customFrom, customTo);
        YearMonth ym = YearMonth.of(year, month);
        LocalDate fromDate = (customFrom != null) ? customFrom : ym.atDay(1);
        LocalDate toDate = (customTo != null) ? customTo : ym.atEndOfMonth();

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        com.lowagie.text.Document document = new com.lowagie.text.Document(com.lowagie.text.PageSize.A4.rotate(), 15, 15, 20, 20);

        try {
            com.lowagie.text.pdf.PdfWriter.getInstance(document, out);
            document.open();

            java.awt.Color tealPrimary = new java.awt.Color(13, 148, 136); // #0d9488
            com.lowagie.text.Font titleFont = com.lowagie.text.FontFactory.getFont(com.lowagie.text.FontFactory.HELVETICA_BOLD, 17, tealPrimary);
            com.lowagie.text.Font subtitleFont = com.lowagie.text.FontFactory.getFont(com.lowagie.text.FontFactory.HELVETICA_BOLD, 11, new java.awt.Color(55, 65, 81));
            com.lowagie.text.Font metaFont = com.lowagie.text.FontFactory.getFont(com.lowagie.text.FontFactory.HELVETICA, 8.5f, new java.awt.Color(107, 114, 128));
            com.lowagie.text.Font headerFont = com.lowagie.text.FontFactory.getFont(com.lowagie.text.FontFactory.HELVETICA_BOLD, 7.8f, java.awt.Color.WHITE);
            com.lowagie.text.Font cellFont = com.lowagie.text.FontFactory.getFont(com.lowagie.text.FontFactory.HELVETICA, 7.5f, new java.awt.Color(17, 24, 39));
            com.lowagie.text.Font cellBoldFont = com.lowagie.text.FontFactory.getFont(com.lowagie.text.FontFactory.HELVETICA_BOLD, 7.5f, new java.awt.Color(17, 24, 39));

            // Header Section
            com.lowagie.text.Paragraph title = new com.lowagie.text.Paragraph("V3 DENTAL CLINIC", titleFont);
            title.setAlignment(com.lowagie.text.Element.ALIGN_CENTER);
            document.add(title);

            com.lowagie.text.Paragraph subtitle = new com.lowagie.text.Paragraph("STAFF ATTENDANCE & SALARY CALCULATION ARCHIVE", subtitleFont);
            subtitle.setAlignment(com.lowagie.text.Element.ALIGN_CENTER);
            subtitle.setSpacingAfter(4);
            document.add(subtitle);

            com.lowagie.text.Paragraph meta = new com.lowagie.text.Paragraph(
                "Period: " + fromDate.format(DISPLAY_DATE_FORMAT) + " to " + toDate.format(DISPLAY_DATE_FORMAT) +
                " (" + fromDate.format(MONTH_YEAR_FORMAT) + ")   |   Total Staff: " + summaryList.size() +
                "   |   Generated: " + LocalDate.now().format(DISPLAY_DATE_FORMAT),
                metaFont
            );
            meta.setAlignment(com.lowagie.text.Element.ALIGN_CENTER);
            meta.setSpacingAfter(12);
            document.add(meta);

            // Table with 14 Columns (including Total Days with Sundays & Total Working Days):
            com.lowagie.text.pdf.PdfPTable table = new com.lowagie.text.pdf.PdfPTable(14);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{1.0f, 1.8f, 3.4f, 2.2f, 2.1f, 2.1f, 1.6f, 1.7f, 1.5f, 1.4f, 1.4f, 2.2f, 1.4f, 1.6f});

            String[] headers = {
                "S.No.", "Employee ID", "Employee Name", "Month", "From Date", "To Date",
                "Total Days", "Total Working Days", "Present Days", "Leave Days", "Absent Days",
                "Total Working Hours", "Late Count", "Total Late Minutes"
            };

            for (String h : headers) {
                com.lowagie.text.pdf.PdfPCell cell = new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase(h, headerFont));
                cell.setBackgroundColor(tealPrimary);
                cell.setHorizontalAlignment(com.lowagie.text.Element.ALIGN_CENTER);
                cell.setVerticalAlignment(com.lowagie.text.Element.ALIGN_MIDDLE);
                cell.setPadding(5);
                table.addCell(cell);
            }

            java.awt.Color rowBgAlt = new java.awt.Color(248, 250, 252);
            java.awt.Color rowBgWhite = java.awt.Color.WHITE;

            int idx = 0;
            for (SalaryAttendanceSummaryDto row : summaryList) {
                java.awt.Color currentBg = (idx % 2 == 0) ? rowBgWhite : rowBgAlt;

                addTableCell(table, String.valueOf(row.getSNo()), cellFont, currentBg, com.lowagie.text.Element.ALIGN_CENTER);
                addTableCell(table, row.getEmployeeCode(), cellFont, currentBg, com.lowagie.text.Element.ALIGN_CENTER);
                addTableCell(table, row.getEmployeeName(), cellBoldFont, currentBg, com.lowagie.text.Element.ALIGN_LEFT);
                addTableCell(table, row.getMonth(), cellFont, currentBg, com.lowagie.text.Element.ALIGN_CENTER);
                addTableCell(table, row.getFromDate(), cellFont, currentBg, com.lowagie.text.Element.ALIGN_CENTER);
                addTableCell(table, row.getToDate(), cellFont, currentBg, com.lowagie.text.Element.ALIGN_CENTER);
                addTableCell(table, String.valueOf(row.getTotalDays()), cellBoldFont, currentBg, com.lowagie.text.Element.ALIGN_CENTER);
                addTableCell(table, String.valueOf(row.getTotalWorkingDays()), cellFont, currentBg, com.lowagie.text.Element.ALIGN_CENTER);
                addTableCell(table, String.valueOf(row.getPresentDays()), cellBoldFont, currentBg, com.lowagie.text.Element.ALIGN_CENTER);
                addTableCell(table, String.valueOf(row.getLeaveDays()), cellFont, currentBg, com.lowagie.text.Element.ALIGN_CENTER);
                addTableCell(table, String.valueOf(row.getAbsentDays()), cellFont, currentBg, com.lowagie.text.Element.ALIGN_CENTER);
                addTableCell(table, row.getTotalWorkingHours(), cellBoldFont, currentBg, com.lowagie.text.Element.ALIGN_CENTER);
                addTableCell(table, String.valueOf(row.getLateCount()), cellFont, currentBg, com.lowagie.text.Element.ALIGN_CENTER);
                addTableCell(table, String.valueOf(row.getTotalLateMinutes()), cellFont, currentBg, com.lowagie.text.Element.ALIGN_CENTER);

                idx++;
            }

            document.add(table);

            com.lowagie.text.Paragraph footer = new com.lowagie.text.Paragraph(
                "Confidential — V3 Dental Clinic Attendance Management System — Official Monthly Salary Calculation Sheet",
                metaFont
            );
            footer.setAlignment(com.lowagie.text.Element.ALIGN_CENTER);
            footer.setSpacingBefore(12);
            document.add(footer);

            document.close();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate PDF salary archive report: " + e.getMessage(), e);
        }

        return out.toByteArray();
    }

    private void addTableCell(com.lowagie.text.pdf.PdfPTable table, String text, com.lowagie.text.Font font, java.awt.Color bg, int alignment) {
        com.lowagie.text.pdf.PdfPCell cell = new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase(text != null ? text : "", font));
        cell.setBackgroundColor(bg);
        cell.setHorizontalAlignment(alignment);
        cell.setVerticalAlignment(com.lowagie.text.Element.ALIGN_MIDDLE);
        cell.setPadding(4);
        table.addCell(cell);
    }

    public byte[] generateMonthlyExcelCsvReport(int year, int month) {
        return generateMonthlyExcelCsvReport(year, month, null, null);
    }

    public byte[] generateMonthlyExcelCsvReport(int year, int month, LocalDate customFrom, LocalDate customTo) {
        List<SalaryAttendanceSummaryDto> summaryList = getSalaryAttendanceSummary(year, month, customFrom, customTo);

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            // Write UTF-8 BOM so Excel opens CSV with proper encoding
            out.write(new byte[]{(byte) 0xEF, (byte) 0xBB, (byte) 0xBF});
        } catch (Exception ignored) {}

        PrintWriter writer = new PrintWriter(out, true, StandardCharsets.UTF_8);

        // Header with Total Days (Sunday included) & Total Working Days
        writer.println("S.No.,Employee ID,Employee Name,Month,From Date,To Date,Total Days,Total Working Days,Present Days,Leave Days,Absent Days,Total Working Hours,Late Count,Total Late Minutes");

        for (SalaryAttendanceSummaryDto row : summaryList) {
            writer.println(String.format("%d,\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",%d,%d,%d,%d,%d,\"%s\",%d,%d",
                row.getSNo(),
                escapeCsv(row.getEmployeeCode()),
                escapeCsv(row.getEmployeeName()),
                escapeCsv(row.getMonth()),
                row.getFromDate(),
                row.getToDate(),
                row.getTotalDays(),
                row.getTotalWorkingDays(),
                row.getPresentDays(),
                row.getLeaveDays(),
                row.getAbsentDays(),
                row.getTotalWorkingHours(),
                row.getLateCount(),
                row.getTotalLateMinutes()
            ));
        }

        writer.flush();
        return out.toByteArray();
    }

    private String escapeCsv(String str) {
        if (str == null) return "";
        return str.replace("\"", "\"\"");
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
