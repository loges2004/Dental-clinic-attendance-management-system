package com.v3dental.attendance.report;

import com.v3dental.attendance.attendance.Attendance;
import com.v3dental.attendance.attendance.AttendanceRepository;
import com.v3dental.attendance.audit.AuditService;
import com.v3dental.attendance.branch.Branch;
import com.v3dental.attendance.employee.Employee;
import com.v3dental.attendance.employee.EmployeeRepository;
import com.v3dental.attendance.user.Role;
import com.v3dental.attendance.user.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReportServiceTest {

    @Mock
    private AttendanceRepository attendanceRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private AuditService auditService;

    @InjectMocks
    private ReportService reportService;

    @Test
    void generateMonthlyPdfReport_producesValidPdfBytes() {
        Role role = Role.builder().name("STAFF").build();
        User user = User.builder().username("nurse1").role(role).build();
        Branch branch = Branch.builder().name("Main Branch").build();
        Employee emp = Employee.builder()
                .employeeCode("EMP001")
                .firstName("Priya")
                .lastName("Dharshini")
                .designation("Senior Nurse")
                .user(user)
                .build();

        Attendance attendance = Attendance.builder()
                .attendanceDate(LocalDate.of(2026, 10, 1))
                .employee(emp)
                .branch(branch)
                .checkInAt(java.time.OffsetDateTime.now().minusHours(8))
                .checkOutAt(java.time.OffsetDateTime.now())
                .totalWorkMinutes(510)
                .status("PRESENT")
                .build();

        when(attendanceRepository.findByAttendanceDateBetweenOrderByAttendanceDateDesc(any(), any()))
                .thenReturn(List.of(attendance));

        byte[] pdfBytes = reportService.generateMonthlyPdfReport(2026, 10);

        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 500, "PDF should contain valid byte content");

        // Real PDF documents always start with %PDF-
        String header = new String(pdfBytes, 0, Math.min(5, pdfBytes.length));
        assertEquals("%PDF-", header, "Generated file should have valid PDF header");
    }
}
