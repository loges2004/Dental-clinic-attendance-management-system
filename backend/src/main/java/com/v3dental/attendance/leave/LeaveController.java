package com.v3dental.attendance.leave;

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
@RequestMapping("/api/leave")
@RequiredArgsConstructor
public class LeaveController {

    private final LeaveService leaveService;
    private final UserRepository userRepository;

    @GetMapping("/types")
    public ResponseEntity<List<LeaveType>> getLeaveTypes() {
        return ResponseEntity.ok(leaveService.getActiveLeaveTypes());
    }

    @GetMapping("/balance")
    public ResponseEntity<LeavePeriod> getMyLeaveBalance(Authentication authentication) {
        return ResponseEntity.ok(leaveService.getEmployeeCurrentBalance(authentication.getName()));
    }

    @PostMapping("/requests")
    public ResponseEntity<LeaveRequest> applyForLeave(@Valid @RequestBody LeaveApplicationRequest request, Authentication authentication) {
        LeaveRequest created = leaveService.applyForLeave(authentication.getName(), request);
        return ResponseEntity.ok(created);
    }

    @GetMapping("/requests/my")
    public ResponseEntity<List<LeaveRequest>> getMyLeaveHistory(Authentication authentication) {
        return ResponseEntity.ok(leaveService.getMyLeaveHistory(authentication.getName()));
    }

    @GetMapping("/requests")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<LeaveRequest>> getAllLeaveRequests(@RequestParam(required = false) String status) {
        return ResponseEntity.ok(leaveService.getAllLeaveRequests(status));
    }

    @PatchMapping("/requests/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<LeaveRequest> approveLeave(@PathVariable Long id, Authentication authentication) {
        User admin = userRepository.findByUsername(authentication.getName()).orElse(null);
        return ResponseEntity.ok(leaveService.approveLeave(id, admin));
    }

    @PatchMapping("/requests/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<LeaveRequest> rejectLeave(
        @PathVariable Long id,
        @RequestBody Map<String, String> body,
        Authentication authentication
    ) {
        User admin = userRepository.findByUsername(authentication.getName()).orElse(null);
        String reason = body.getOrDefault("rejectionReason", "Not specified");
        return ResponseEntity.ok(leaveService.rejectLeave(id, reason, admin));
    }

    @DeleteMapping("/requests/{id}")
    public ResponseEntity<LeaveRequest> cancelLeave(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(leaveService.cancelLeaveRequest(id, authentication.getName()));
    }

    @PostMapping("/adjustments")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<LeavePeriod> adjustLeaveBalance(@Valid @RequestBody LeaveAdjustmentRequest request, Authentication authentication) {
        User admin = userRepository.findByUsername(authentication.getName()).orElse(null);
        return ResponseEntity.ok(leaveService.adjustLeaveBalance(request, admin));
    }

    @GetMapping("/ledger/{employeeId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<LeaveTransaction>> getLeaveLedger(@PathVariable Long employeeId) {
        return ResponseEntity.ok(leaveService.getLeaveTransactions(employeeId));
    }
}
