package com.v3dental.attendance.attendance.regularization;

import com.v3dental.attendance.attendance.Attendance;
import com.v3dental.attendance.attendance.AttendanceRepository;
import com.v3dental.attendance.audit.AuditService;
import com.v3dental.attendance.branch.Branch;
import com.v3dental.attendance.employee.Employee;
import com.v3dental.attendance.employee.EmployeeRepository;
import com.v3dental.attendance.shift.Shift;
import com.v3dental.attendance.shift.ShiftRepository;
import com.v3dental.attendance.user.User;
import com.v3dental.attendance.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AttendanceRegularizationService {

    private final AttendanceRegularizationRepository regularizationRepository;
    private final AttendanceRepository attendanceRepository;
    private final EmployeeRepository employeeRepository;
    private final ShiftRepository shiftRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    private static final ZoneId CLINIC_ZONE = ZoneId.of("Asia/Kolkata");

    @Transactional
    public AttendanceRegularizationRequest apply(String username, RegularizationApplyDto dto) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found"));
        Employee employee = employeeRepository.findByUserId(user.getId())
            .orElseThrow(() -> new RuntimeException("Employee record not found"));

        AttendanceRegularizationRequest req = AttendanceRegularizationRequest.builder()
            .employee(employee)
            .attendanceDate(dto.getAttendanceDate())
            .requestedCheckIn(dto.getRequestedCheckIn())
            .requestedCheckOut(dto.getRequestedCheckOut())
            .reason(dto.getReason())
            .status("PENDING")
            .build();

        AttendanceRegularizationRequest saved = regularizationRepository.save(req);
        auditService.logAction(user, "REGULARIZATION_APPLIED", "ATTENDANCE_REGULARIZATION", saved.getId(),
            "Applied for attendance regularization for date " + dto.getAttendanceDate());
        return saved;
    }

    public List<AttendanceRegularizationRequest> getMyRequests(String username) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found"));
        Employee employee = employeeRepository.findByUserId(user.getId())
            .orElseThrow(() -> new RuntimeException("Employee record not found"));
        return regularizationRepository.findByEmployeeIdOrderByCreatedAtDesc(employee.getId());
    }

    public List<AttendanceRegularizationRequest> getAllRequests(String status) {
        if (status != null && !status.equalsIgnoreCase("ALL")) {
            return regularizationRepository.findByStatusOrderByCreatedAtDesc(status.toUpperCase());
        }
        return regularizationRepository.findAllByOrderByCreatedAtDesc();
    }

    @Transactional
    public AttendanceRegularizationRequest approve(Long requestId, User adminUser) {
        AttendanceRegularizationRequest req = regularizationRepository.findById(requestId)
            .orElseThrow(() -> new RuntimeException("Regularization request not found"));

        if (!"PENDING".equalsIgnoreCase(req.getStatus())) {
            throw new IllegalStateException("Request is already " + req.getStatus());
        }

        Employee employee = req.getEmployee();
        Branch branch = employee.getBranch();
        LocalDate date = req.getAttendanceDate();

        Optional<Attendance> existingOpt = attendanceRepository.findByEmployeeIdAndAttendanceDate(employee.getId(), date);
        Attendance att = existingOpt.orElseGet(() -> Attendance.builder()
            .employee(employee)
            .branch(branch)
            .attendanceDate(date)
            .build());

        List<Shift> shifts = shiftRepository.findByBranchId(branch.getId());
        Shift shift = shifts.isEmpty() ? null : shifts.get(0);
        att.setShift(shift);

        OffsetDateTime inTime = date.atTime(req.getRequestedCheckIn()).atZone(CLINIC_ZONE).toOffsetDateTime();
        att.setCheckInAt(inTime);

        int workMinutes = 0;
        if (req.getRequestedCheckOut() != null) {
            OffsetDateTime outTime = date.atTime(req.getRequestedCheckOut()).atZone(CLINIC_ZONE).toOffsetDateTime();
            att.setCheckOutAt(outTime);
            workMinutes = (int) Math.max(0, java.time.Duration.between(inTime, outTime).toMinutes());
            att.setCurrentSessionStatus("CHECKED_OUT");
        } else {
            att.setCurrentSessionStatus("CHECKED_IN");
        }

        att.setTotalWorkMinutes(workMinutes);
        att.setCheckInLatitude(branch.getLatitude());
        att.setCheckInLongitude(branch.getLongitude());
        att.setCheckInAccuracy(BigDecimal.valueOf(10.0));
        att.setCheckInDistance(BigDecimal.ZERO);

        boolean isLate = false;
        if (shift != null) {
            LocalTime graceEnd = shift.getStartTime().plusMinutes(shift.getGracePeriodMinutes());
            if (req.getRequestedCheckIn().isAfter(graceEnd)) {
                isLate = true;
            }
        }

        att.setIsLate(isLate);
        att.setStatus(isLate ? "LATE" : "PRESENT");
        att.setNotes("Regularized by Admin: " + req.getReason());

        if (att.getSessions() == null) {
            att.setSessions(new java.util.ArrayList<>());
        }
        att.getSessions().clear();
        att.getSessions().add(com.v3dental.attendance.attendance.AttendancePunchSession.builder()
            .attendance(att)
            .sessionNumber(1)
            .checkInAt(inTime)
            .checkOutAt(att.getCheckOutAt())
            .durationMinutes(workMinutes)
            .notes(att.getNotes())
            .build());

        attendanceRepository.save(att);

        req.setStatus("APPROVED");
        req.setReviewedBy(adminUser);
        req.setReviewedAt(OffsetDateTime.now(CLINIC_ZONE));
        AttendanceRegularizationRequest savedReq = regularizationRepository.save(req);

        auditService.logAction(adminUser, "REGULARIZATION_APPROVED", "ATTENDANCE_REGULARIZATION", requestId,
            "Approved regularization for " + employee.getFirstName() + " " + employee.getLastName() + " on " + date);
        return savedReq;
    }

    @Transactional
    public AttendanceRegularizationRequest reject(Long requestId, String reason, User adminUser) {
        AttendanceRegularizationRequest req = regularizationRepository.findById(requestId)
            .orElseThrow(() -> new RuntimeException("Regularization request not found"));

        if (!"PENDING".equalsIgnoreCase(req.getStatus())) {
            throw new IllegalStateException("Request is already " + req.getStatus());
        }

        req.setStatus("REJECTED");
        req.setRejectionReason(reason);
        req.setReviewedBy(adminUser);
        req.setReviewedAt(OffsetDateTime.now(CLINIC_ZONE));
        AttendanceRegularizationRequest savedReq = regularizationRepository.save(req);

        auditService.logAction(adminUser, "REGULARIZATION_REJECTED", "ATTENDANCE_REGULARIZATION", requestId,
            "Rejected regularization for " + req.getEmployee().getFirstName() + ". Reason: " + reason);
        return savedReq;
    }

    @Transactional
    public Attendance createManualAttendance(ManualAttendanceEntryDto dto, User adminUser) {
        Employee employee = employeeRepository.findById(dto.getEmployeeId())
            .orElseThrow(() -> new RuntimeException("Employee not found with id: " + dto.getEmployeeId()));
        Branch branch = employee.getBranch();
        LocalDate date = dto.getAttendanceDate();

        Optional<Attendance> existingOpt = attendanceRepository.findByEmployeeIdAndAttendanceDate(employee.getId(), date);
        Attendance att = existingOpt.orElseGet(() -> Attendance.builder()
            .employee(employee)
            .branch(branch)
            .attendanceDate(date)
            .build());

        List<Shift> shifts = shiftRepository.findByBranchId(branch.getId());
        Shift shift = shifts.isEmpty() ? null : shifts.get(0);
        att.setShift(shift);

        OffsetDateTime inTime = date.atTime(dto.getCheckInTime()).atZone(CLINIC_ZONE).toOffsetDateTime();
        att.setCheckInAt(inTime);

        int workMinutes = 0;
        if (dto.getCheckOutTime() != null) {
            OffsetDateTime outTime = date.atTime(dto.getCheckOutTime()).atZone(CLINIC_ZONE).toOffsetDateTime();
            att.setCheckOutAt(outTime);
            workMinutes = (int) Math.max(0, java.time.Duration.between(inTime, outTime).toMinutes());
            att.setCurrentSessionStatus("CHECKED_OUT");
        } else {
            att.setCurrentSessionStatus("CHECKED_IN");
        }

        att.setTotalWorkMinutes(workMinutes);
        att.setCheckInLatitude(branch.getLatitude());
        att.setCheckInLongitude(branch.getLongitude());
        att.setCheckInAccuracy(BigDecimal.valueOf(10.0));
        att.setCheckInDistance(BigDecimal.ZERO);

        boolean isLate = false;
        if (shift != null) {
            LocalTime graceEnd = shift.getStartTime().plusMinutes(shift.getGracePeriodMinutes());
            if (dto.getCheckInTime().isAfter(graceEnd)) {
                isLate = true;
            }
        }
        att.setIsLate(isLate);
        att.setStatus(dto.getStatus() != null ? dto.getStatus() : (isLate ? "LATE" : "PRESENT"));
        att.setNotes("Manual Entry by Admin: " + (dto.getReason() != null ? dto.getReason() : "Regularized"));

        if (att.getSessions() == null) {
            att.setSessions(new java.util.ArrayList<>());
        }
        att.getSessions().clear();
        att.getSessions().add(com.v3dental.attendance.attendance.AttendancePunchSession.builder()
            .attendance(att)
            .sessionNumber(1)
            .checkInAt(inTime)
            .checkOutAt(att.getCheckOutAt())
            .durationMinutes(workMinutes)
            .notes(att.getNotes())
            .build());

        Attendance saved = attendanceRepository.save(att);
        auditService.logAction(adminUser, "MANUAL_ATTENDANCE_CREATED", "ATTENDANCE", saved.getId(),
            "Manually recorded attendance for " + employee.getFirstName() + " " + employee.getLastName() + " on " + date);
        return saved;
    }

}
