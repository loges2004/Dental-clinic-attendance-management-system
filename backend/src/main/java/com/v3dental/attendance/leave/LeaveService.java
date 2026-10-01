package com.v3dental.attendance.leave;

import com.v3dental.attendance.audit.AuditService;
import com.v3dental.attendance.employee.Employee;
import com.v3dental.attendance.employee.EmployeeRepository;
import com.v3dental.attendance.user.User;
import com.v3dental.attendance.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@Service
@RequiredArgsConstructor
public class LeaveService {

    private final LeaveTypeRepository leaveTypeRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final LeaveTransactionRepository leaveTransactionRepository;
    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final LeaveBalanceService leaveBalanceService;
    private final AuditService auditService;

    private static final ZoneId CLINIC_ZONE = ZoneId.of("Asia/Kolkata");

    public List<LeaveType> getActiveLeaveTypes() {
        return leaveTypeRepository.findByIsActiveTrue();
    }

    public LeavePeriod getEmployeeCurrentBalance(String username) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found"));
        Employee emp = employeeRepository.findByUserId(user.getId())
            .orElseThrow(() -> new RuntimeException("Employee record not found"));

        LocalDate today = LocalDate.now(CLINIC_ZONE);
        return leaveBalanceService.getOrCreateCurrentPeriod(emp, today.getYear(), today.getMonthValue());
    }

    @Transactional
    public LeaveRequest applyForLeave(String username, LeaveApplicationRequest req) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found"));
        Employee emp = employeeRepository.findByUserId(user.getId())
            .orElseThrow(() -> new RuntimeException("Employee record not found"));

        LeaveType leaveType = leaveTypeRepository.findById(req.getLeaveTypeId())
            .orElseThrow(() -> new RuntimeException("Invalid leave type ID"));

        LeaveRequest request = LeaveRequest.builder()
            .employee(emp)
            .leaveType(leaveType)
            .startDate(req.getStartDate())
            .endDate(req.getEndDate())
            .duration(req.getDuration())
            .durationType(req.getDurationType())
            .reason(req.getReason())
            .status("PENDING")
            .build();

        LeaveRequest saved = leaveRequestRepository.save(request);

        // Update pending count in leave period
        LocalDate today = LocalDate.now(CLINIC_ZONE);
        LeavePeriod period = leaveBalanceService.getOrCreateCurrentPeriod(emp, today.getYear(), today.getMonthValue());
        period.setPending(period.getPending().add(req.getDuration()));

        auditService.logAction(user, "LEAVE_APPLIED", "LEAVE_REQUEST", saved.getId(), "Applied for " + req.getDuration() + " day(s) leave");
        return saved;
    }

    public List<LeaveRequest> getMyLeaveHistory(String username) {
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) return List.of();
        Employee emp = employeeRepository.findByUserId(user.getId()).orElse(null);
        if (emp == null) return List.of();
        return leaveRequestRepository.findByEmployeeIdOrderByCreatedAtDesc(emp.getId());
    }

    public List<LeaveRequest> getAllLeaveRequests(String status) {
        if (status != null && !status.isBlank()) {
            return leaveRequestRepository.findByStatusOrderByCreatedAtDesc(status.toUpperCase());
        }
        return leaveRequestRepository.findAllByOrderByCreatedAtDesc();
    }

    @Transactional
    public LeaveRequest approveLeave(Long requestId, User adminUser) {
        LeaveRequest request = leaveRequestRepository.findById(requestId)
            .orElseThrow(() -> new RuntimeException("Leave request not found"));

        if (!"PENDING".equals(request.getStatus())) {
            throw new IllegalStateException("Leave request is already " + request.getStatus());
        }

        Employee emp = request.getEmployee();
        LocalDate startDate = request.getStartDate();
        LeavePeriod period = leaveBalanceService.getOrCreateCurrentPeriod(emp, startDate.getYear(), startDate.getMonthValue());

        // Update Request status
        request.setStatus("APPROVED");
        request.setApprovedBy(adminUser);
        request.setApprovedAt(java.time.OffsetDateTime.now(CLINIC_ZONE));
        LeaveRequest saved = leaveRequestRepository.save(request);

        // Reduce pending & record ledger transaction
        period.setPending(period.getPending().subtract(request.getDuration()));
        leaveBalanceService.recordTransaction(emp, period, saved, "LEAVE_USED", request.getDuration(), "Approved leave request #" + saved.getId(), adminUser);

        auditService.logAction(adminUser, "LEAVE_APPROVED", "LEAVE_REQUEST", saved.getId(), "Approved leave for " + emp.getFirstName());
        return saved;
    }

    @Transactional
    public LeaveRequest rejectLeave(Long requestId, String rejectionReason, User adminUser) {
        LeaveRequest request = leaveRequestRepository.findById(requestId)
            .orElseThrow(() -> new RuntimeException("Leave request not found"));

        if (!"PENDING".equals(request.getStatus())) {
            throw new IllegalStateException("Leave request is already " + request.getStatus());
        }

        request.setStatus("REJECTED");
        request.setRejectionReason(rejectionReason);
        LeaveRequest saved = leaveRequestRepository.save(request);

        // Clear pending amount
        Employee emp = request.getEmployee();
        LocalDate startDate = request.getStartDate();
        LeavePeriod period = leaveBalanceService.getOrCreateCurrentPeriod(emp, startDate.getYear(), startDate.getMonthValue());
        period.setPending(period.getPending().subtract(request.getDuration()));

        auditService.logAction(adminUser, "LEAVE_REJECTED", "LEAVE_REQUEST", saved.getId(), "Rejected leave request #" + saved.getId());
        return saved;
    }

    @Transactional
    public LeaveRequest cancelLeaveRequest(Long requestId, String username) {
        LeaveRequest request = leaveRequestRepository.findById(requestId)
            .orElseThrow(() -> new RuntimeException("Leave request not found"));

        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found"));

        Employee emp = request.getEmployee();
        if (!emp.getUser().getId().equals(user.getId()) && !"ADMIN".equals(user.getRole().getName())) {
            throw new IllegalStateException("You are not authorized to cancel this leave request");
        }

        if (!"PENDING".equals(request.getStatus())) {
            throw new IllegalStateException("Only PENDING leave requests can be cancelled");
        }

        request.setStatus("CANCELLED");
        LeaveRequest saved = leaveRequestRepository.save(request);

        // Reduce pending amount in leave period
        LocalDate startDate = request.getStartDate();
        LeavePeriod period = leaveBalanceService.getOrCreateCurrentPeriod(emp, startDate.getYear(), startDate.getMonthValue());
        if (period.getPending().compareTo(request.getDuration()) >= 0) {
            period.setPending(period.getPending().subtract(request.getDuration()));
        } else {
            period.setPending(java.math.BigDecimal.ZERO);
        }

        auditService.logAction(user, "LEAVE_CANCELLED", "LEAVE_REQUEST", saved.getId(), "Cancelled leave request #" + saved.getId());
        return saved;
    }

    @Transactional
    public LeavePeriod adjustLeaveBalance(LeaveAdjustmentRequest req, User adminUser) {
        Employee emp = employeeRepository.findById(req.getEmployeeId())
            .orElseThrow(() -> new RuntimeException("Employee not found"));

        LocalDate today = LocalDate.now(CLINIC_ZONE);
        LeavePeriod period = leaveBalanceService.getOrCreateCurrentPeriod(emp, today.getYear(), today.getMonthValue());

        leaveBalanceService.recordTransaction(emp, period, null, "LEAVE_ADJUSTMENT", req.getAmount(), req.getReason(), adminUser);

        auditService.logAction(adminUser, "LEAVE_ADJUSTED", "LEAVE_PERIOD", period.getId(), "Adjusted leave balance by " + req.getAmount() + ". Reason: " + req.getReason());
        return period;
    }

    public List<LeaveTransaction> getLeaveTransactions(Long employeeId) {
        return leaveTransactionRepository.findByEmployeeIdOrderByCreatedAtDesc(employeeId);
    }
}
