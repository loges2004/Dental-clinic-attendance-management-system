package com.v3dental.attendance.report;

import com.v3dental.attendance.user.User;
import com.v3dental.attendance.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/attendance/archive")
@RequiredArgsConstructor
public class ArchiveController {

    private final ReportService reportService;
    private final UserRepository userRepository;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MonthlyArchiveSummaryDto> getArchiveSummary(
        @RequestParam int year,
        @RequestParam int month
    ) {
        return ResponseEntity.ok(reportService.getMonthlySummary(year, month));
    }

    @GetMapping("/export/pdf")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<byte[]> exportPdf(
        @RequestParam int year,
        @RequestParam int month
    ) {
        byte[] pdfBytes = reportService.generateMonthlyPdfReport(year, month);
        String filename = String.format("V3_Attendance_%d_%02d.pdf", year, month);

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
            .contentType(MediaType.APPLICATION_PDF)
            .body(pdfBytes);
    }

    @GetMapping("/export/excel")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<byte[]> exportExcel(
        @RequestParam int year,
        @RequestParam int month
    ) {
        byte[] excelBytes = reportService.generateMonthlyExcelCsvReport(year, month);
        String filename = String.format("V3_Attendance_%d_%02d.csv", year, month);

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
            .contentType(MediaType.parseMediaType("text/csv"))
            .body(excelBytes);
    }

    @DeleteMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> deleteMonthlyAttendance(
        @RequestParam int year,
        @RequestParam int month,
        @RequestBody Map<String, String> body,
        Authentication authentication
    ) {
        String confirmation = body.getOrDefault("confirmText", "");
        if (!"DELETE".equalsIgnoreCase(confirmation)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Explicit confirmation keyword 'DELETE' is required to confirm purging records."));
        }

        User admin = userRepository.findByUsername(authentication.getName()).orElse(null);
        int deletedCount = reportService.deleteMonthlyAttendanceRecords(year, month, admin);

        return ResponseEntity.ok(Map.of(
            "message", "Successfully purged " + deletedCount + " attendance records for period " + month + "/" + year,
            "deletedRecordsCount", deletedCount,
            "year", year,
            "month", month
        ));
    }
}
