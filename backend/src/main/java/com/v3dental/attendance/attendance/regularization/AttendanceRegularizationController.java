package com.v3dental.attendance.attendance.regularization;

import com.v3dental.attendance.attendance.Attendance;
import com.v3dental.attendance.user.User;
import com.v3dental.attendance.user.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/attendance/regularization")
@RequiredArgsConstructor
public class AttendanceRegularizationController {

    private final AttendanceRegularizationService regularizationService;
    private final UserRepository userRepository;

    @PostMapping("/apply")
    public ResponseEntity<AttendanceRegularizationRequest> apply(
        @Valid @RequestBody RegularizationApplyDto dto,
        Authentication authentication
    ) {
        return ResponseEntity.ok(regularizationService.apply(authentication.getName(), dto));
    }

    @GetMapping("/my")
    public ResponseEntity<List<AttendanceRegularizationRequest>> getMyRequests(Authentication authentication) {
        return ResponseEntity.ok(regularizationService.getMyRequests(authentication.getName()));
    }

    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<AttendanceRegularizationRequest>> getAllRequests(@RequestParam(required = false) String status) {
        return ResponseEntity.ok(regularizationService.getAllRequests(status));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AttendanceRegularizationRequest> approve(
        @PathVariable Long id,
        Authentication authentication
    ) {
        User admin = userRepository.findByUsername(authentication.getName()).orElse(null);
        return ResponseEntity.ok(regularizationService.approve(id, admin));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AttendanceRegularizationRequest> reject(
        @PathVariable Long id,
        @RequestBody Map<String, String> body,
        Authentication authentication
    ) {
        User admin = userRepository.findByUsername(authentication.getName()).orElse(null);
        String reason = body.getOrDefault("reason", "Rejected by Admin");
        return ResponseEntity.ok(regularizationService.reject(id, reason, admin));
    }

    @PostMapping("/manual-entry")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Attendance> createManualAttendance(
        @Valid @RequestBody ManualAttendanceEntryDto dto,
        Authentication authentication
    ) {
        User admin = userRepository.findByUsername(authentication.getName()).orElse(null);
        return ResponseEntity.ok(regularizationService.createManualAttendance(dto, admin));
    }
}
