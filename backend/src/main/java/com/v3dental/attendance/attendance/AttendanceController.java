package com.v3dental.attendance.attendance;

import com.v3dental.attendance.user.User;
import com.v3dental.attendance.user.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceService attendanceService;
    private final UserRepository userRepository;

    @PostMapping("/check-in")
    public ResponseEntity<Attendance> checkIn(@Valid @RequestBody CheckInRequest request, Authentication authentication) {
        Attendance attendance = attendanceService.checkIn(authentication.getName(), request);
        return ResponseEntity.ok(attendance);
    }

    @PostMapping("/check-out")
    public ResponseEntity<Attendance> checkOut(@Valid @RequestBody CheckOutRequest request, Authentication authentication) {
        Attendance attendance = attendanceService.checkOut(authentication.getName(), request);
        return ResponseEntity.ok(attendance);
    }

    @PostMapping("/forgot-checkout")
    public ResponseEntity<Attendance> forgotCheckOut(@Valid @RequestBody ForgotCheckOutRequest request, Authentication authentication) {
        Attendance attendance = attendanceService.forgotCheckOut(authentication.getName(), request);
        return ResponseEntity.ok(attendance);
    }

    @GetMapping("/today")
    public ResponseEntity<Attendance> getTodayAttendance(Authentication authentication) {
        Optional<Attendance> attendanceOpt = attendanceService.getTodayAttendance(authentication.getName());
        return attendanceOpt.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.noContent().build());
    }

    @GetMapping("/history")
    public ResponseEntity<List<Attendance>> getAttendanceHistory(
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
        @RequestParam(required = false) Long branchId,
        @RequestParam(required = false) Long employeeId
    ) {
        List<Attendance> history = attendanceService.getAttendanceHistory(startDate, endDate, branchId, employeeId);
        return ResponseEntity.ok(history);
    }

    @PutMapping("/{id}/correct")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Attendance> correctAttendance(
        @PathVariable Long id,
        @RequestBody AttendanceCorrectionRequest request,
        Authentication authentication
    ) {
        User admin = userRepository.findByUsername(authentication.getName()).orElse(null);
        Attendance corrected = attendanceService.correctAttendance(id, request, admin);
        return ResponseEntity.ok(corrected);
    }
}
