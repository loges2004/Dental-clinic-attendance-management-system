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
        com.lowagie.text.Document document = new com.lowagie.text.Document(com.lowagie.text.PageSize.A4.rotate(), 20, 20, 25, 25);

        try {
            com.lowagie.text.pdf.PdfWriter.getInstance(document, out);
            document.open();

            // Fonts
            java.awt.Color teal = new java.awt.Color(13, 148, 136); // #0d9488
            com.lowagie.text.Font titleFont = com.lowagie.text.FontFactory.getFont(com.lowagie.text.FontFactory.HELVETICA_BOLD, 18, teal);
            com.lowagie.text.Font subtitleFont = com.lowagie.text.FontFactory.getFont(com.lowagie.text.FontFactory.HELVETICA_BOLD, 12, new java.awt.Color(55, 65, 81));
            com.lowagie.text.Font metaFont = com.lowagie.text.FontFactory.getFont(com.lowagie.text.FontFactory.HELVETICA, 9, new java.awt.Color(107, 114, 128));
            com.lowagie.text.Font headerFont = com.lowagie.text.FontFactory.getFont(com.lowagie.text.FontFactory.HELVETICA_BOLD, 9, java.awt.Color.WHITE);
            com.lowagie.text.Font cellFont = com.lowagie.text.FontFactory.getFont(com.lowagie.text.FontFactory.HELVETICA, 8.5f, new java.awt.Color(17, 24, 39));
            com.lowagie.text.Font cellBoldFont = com.lowagie.text.FontFactory.getFont(com.lowagie.text.FontFactory.HELVETICA_BOLD, 8.5f, new java.awt.Color(17, 24, 39));

            // Header Section
            com.lowagie.text.Paragraph title = new com.lowagie.text.Paragraph("V3 DENTAL CLINIC", titleFont);
            title.setAlignment(com.lowagie.text.Element.ALIGN_CENTER);
            document.add(title);

            com.lowagie.text.Paragraph subtitle = new com.lowagie.text.Paragraph("MONTHLY STAFF ATTENDANCE ARCHIVE REPORT", subtitleFont);
            subtitle.setAlignment(com.lowagie.text.Element.ALIGN_CENTER);
            subtitle.setSpacingAfter(4);
            document.add(subtitle);

            com.lowagie.text.Paragraph meta = new com.lowagie.text.Paragraph(
                "Period: " + ym.getMonth().name() + " " + year + " (" + startDate + " to " + endDate + ")   |   Total Attendance Records: " + records.size() + "   |   Exported: " + LocalDate.now(),
                metaFont
            );
            meta.setAlignment(com.lowagie.text.Element.ALIGN_CENTER);
            meta.setSpacingAfter(14);
            document.add(meta);

            // Table with 9 Columns
            com.lowagie.text.pdf.PdfPTable table = new com.lowagie.text.pdf.PdfPTable(9);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{1.8f, 1.8f, 3.2f, 2.2f, 2.2f, 1.6f, 1.6f, 1.8f, 1.8f});

            String[] headers = {"Date", "Emp Code", "Employee Name", "Role", "Branch", "Check In", "Check Out", "Total Hours", "Status"};

            for (String h : headers) {
                com.lowagie.text.pdf.PdfPCell cell = new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase(h, headerFont));
                cell.setBackgroundColor(teal);
                cell.setHorizontalAlignment(com.lowagie.text.Element.ALIGN_CENTER);
                cell.setVerticalAlignment(com.lowagie.text.Element.ALIGN_MIDDLE);
                cell.setPadding(6);
                table.addCell(cell);
            }

            java.awt.Color rowBgAlt = new java.awt.Color(248, 250, 252); // #f8fafc
            java.awt.Color rowBgWhite = java.awt.Color.WHITE;
            DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("HH:mm");

            int idx = 0;
            for (Attendance a : records) {
                java.awt.Color currentBg = (idx % 2 == 0) ? rowBgWhite : rowBgAlt;

                String dateStr = a.getAttendanceDate() != null ? a.getAttendanceDate().toString() : "--";
                String empCode = (a.getEmployee() != null && a.getEmployee().getEmployeeCode() != null) ? a.getEmployee().getEmployeeCode() : "--";
                String empName = (a.getEmployee() != null) ? a.getEmployee().getFirstName() + " " + a.getEmployee().getLastName() : "Staff";
                String role = (a.getEmployee() != null && a.getEmployee().getUser() != null && a.getEmployee().getUser().getRole() != null)
                    ? a.getEmployee().getUser().getRole().getName()
                    : ((a.getEmployee() != null && a.getEmployee().getDesignation() != null) ? a.getEmployee().getDesignation() : "Staff");
                String branch = (a.getBranch() != null) ? a.getBranch().getName() : "--";
                String checkIn = (a.getCheckInAt() != null) ? a.getCheckInAt().format(timeFormatter) : "--:--";
                String checkOut = (a.getCheckOutAt() != null) ? a.getCheckOutAt().format(timeFormatter) : "--:--";

                int totalMins = a.getTotalWorkMinutes() != null ? a.getTotalWorkMinutes() : 0;
                String totalHours = (totalMins / 60) + "h " + (totalMins % 60) + "m";
                String status = a.getStatus() != null ? a.getStatus() : "PRESENT";

                addTableCell(table, dateStr, cellFont, currentBg, com.lowagie.text.Element.ALIGN_CENTER);
                addTableCell(table, empCode, cellFont, currentBg, com.lowagie.text.Element.ALIGN_CENTER);
                addTableCell(table, empName, cellBoldFont, currentBg, com.lowagie.text.Element.ALIGN_LEFT);
                addTableCell(table, role, cellFont, currentBg, com.lowagie.text.Element.ALIGN_CENTER);
                addTableCell(table, branch, cellFont, currentBg, com.lowagie.text.Element.ALIGN_CENTER);
                addTableCell(table, checkIn, cellFont, currentBg, com.lowagie.text.Element.ALIGN_CENTER);
                addTableCell(table, checkOut, cellFont, currentBg, com.lowagie.text.Element.ALIGN_CENTER);
                addTableCell(table, totalHours, cellBoldFont, currentBg, com.lowagie.text.Element.ALIGN_CENTER);

                // Status with distinctive color
                java.awt.Color statusColor = new java.awt.Color(5, 150, 105); // Green
                if ("LATE".equalsIgnoreCase(status)) statusColor = new java.awt.Color(217, 119, 6);
                else if ("ABSENT".equalsIgnoreCase(status)) statusColor = new java.awt.Color(220, 38, 38);
                else if ("ON_LEAVE".equalsIgnoreCase(status)) statusColor = new java.awt.Color(2, 132, 199);

                com.lowagie.text.Font statusFont = com.lowagie.text.FontFactory.getFont(com.lowagie.text.FontFactory.HELVETICA_BOLD, 8.5f, statusColor);
                addTableCell(table, status, statusFont, currentBg, com.lowagie.text.Element.ALIGN_CENTER);

                idx++;
            }

            document.add(table);

            com.lowagie.text.Paragraph footer = new com.lowagie.text.Paragraph("Confidential — V3 Dental Clinic Attendance Management System — Auto-Generated Official Archive", metaFont);
            footer.setAlignment(com.lowagie.text.Element.ALIGN_CENTER);
            footer.setSpacingBefore(14);
            document.add(footer);

            document.close();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate PDF report: " + e.getMessage(), e);
        }

        return out.toByteArray();
    }

    private void addTableCell(com.lowagie.text.pdf.PdfPTable table, String text, com.lowagie.text.Font font, java.awt.Color bg, int alignment) {
        com.lowagie.text.pdf.PdfPCell cell = new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase(text != null ? text : "", font));
        cell.setBackgroundColor(bg);
        cell.setHorizontalAlignment(alignment);
        cell.setVerticalAlignment(com.lowagie.text.Element.ALIGN_MIDDLE);
        cell.setPadding(5);
        table.addCell(cell);
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
