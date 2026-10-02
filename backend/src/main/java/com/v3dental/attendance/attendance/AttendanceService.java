package com.v3dental.attendance.attendance;

import com.v3dental.attendance.audit.AuditService;
import com.v3dental.attendance.branch.Branch;
import com.v3dental.attendance.employee.Employee;
import com.v3dental.attendance.employee.EmployeeRepository;
import com.v3dental.attendance.leave.LeaveRequest;
import com.v3dental.attendance.leave.LeaveRequestRepository;
import com.v3dental.attendance.location.GeofenceService;
import com.v3dental.attendance.shift.Shift;
import com.v3dental.attendance.shift.ShiftRepository;
import com.v3dental.attendance.user.User;
import com.v3dental.attendance.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AttendanceService {

    private final AttendanceRepository attendanceRepository;
    private final AttendancePunchSessionRepository punchSessionRepository;
    private final EmployeeRepository employeeRepository;
    private final ShiftRepository shiftRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final GeofenceService geofenceService;
    private final UserRepository userRepository;
    private final AuditService auditService;

    private static final ZoneId CLINIC_ZONE = ZoneId.of("Asia/Kolkata");

    @Transactional
    public Attendance checkIn(String username, CheckInRequest request) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found"));

        Employee employee = employeeRepository.findByUserId(user.getId())
            .orElseThrow(() -> new RuntimeException("Employee record not found for user"));

        if (!Boolean.TRUE.equals(employee.getIsActive())) {
            throw new RuntimeException("Inactive employee account cannot check in");
        }

        Branch branch = employee.getBranch();
        if (branch == null || !Boolean.TRUE.equals(branch.getIsActive())) {
            throw new RuntimeException("Assigned branch is inactive or not found");
        }

        // Validate Coordinates & GPS Accuracy
        if (geofenceService.isAbnormalCoordinates(request.getLatitude(), request.getLongitude())) {
            throw new IllegalArgumentException("Invalid GPS coordinates detected");
        }

        if (!geofenceService.isAccuracyValid(request.getAccuracy(), branch.getMaxGpsAccuracyMeters())) {
            throw new IllegalArgumentException("Location accuracy is too low (" + request.getAccuracy() + "m). Please try again with better GPS signal.");
        }

        double distanceMeters = geofenceService.calculateDistanceMeters(
            request.getLatitude().doubleValue(),
            request.getLongitude().doubleValue(),
            branch.getLatitude().doubleValue(),
            branch.getLongitude().doubleValue()
        );

        if (!geofenceService.isWithinGeofence(distanceMeters, branch.getAllowedRadiusMeters())) {
            throw new IllegalStateException(String.format("You are outside the allowed branch location. Distance: %.1fm (Allowed: %.1fm)",
                distanceMeters, branch.getAllowedRadiusMeters().doubleValue()));
        }

        LocalDate today = LocalDate.now(CLINIC_ZONE);
        OffsetDateTime nowServer = OffsetDateTime.now(CLINIC_ZONE);
        LocalTime currentTime = nowServer.toLocalTime();

        Optional<Attendance> existingOpt = attendanceRepository.findByEmployeeIdAndAttendanceDate(employee.getId(), today);

        if (existingOpt.isPresent()) {
            Attendance existing = existingOpt.get();
            if ("CHECKED_IN".equalsIgnoreCase(existing.getCurrentSessionStatus())) {
                throw new IllegalStateException("Already checked in for the current session. Please check out before checking in again.");
            }

            // Start a new session (e.g., returning from lunch or break)
            int sessionNumber = (existing.getSessions() != null ? existing.getSessions().size() : 0) + 1;
            AttendancePunchSession newSession = AttendancePunchSession.builder()
                .attendance(existing)
                .sessionNumber(sessionNumber)
                .checkInAt(nowServer)
                .checkInLatitude(request.getLatitude())
                .checkInLongitude(request.getLongitude())
                .checkInAccuracy(request.getAccuracy())
                .checkInDistance(BigDecimal.valueOf(distanceMeters).setScale(2, RoundingMode.HALF_UP))
                .durationMinutes(0)
                .notes(request.getNotes())
                .build();

            if (existing.getSessions() == null) {
                existing.setSessions(new ArrayList<>());
            }
            existing.getSessions().add(newSession);
            existing.setCurrentSessionStatus("CHECKED_IN");
            Attendance saved = attendanceRepository.save(existing);

            auditService.logAction(user, "CHECK_IN_SESSION_" + sessionNumber, "ATTENDANCE", saved.getId(),
                "Checked in for Session #" + sessionNumber + " at " + branch.getName() + " (Distance: " + String.format("%.1fm", distanceMeters) + ")");
            return saved;
        }

        // First check-in of the day
        List<Shift> shifts = shiftRepository.findByBranchId(branch.getId());
        Shift assignedShift = shifts.isEmpty() ? null : shifts.get(0);

        boolean isLate = false;
        String status = "PRESENT";

        if (assignedShift != null) {
            LocalTime shiftStart = assignedShift.getStartTime();
            LocalTime graceEnd = shiftStart.plusMinutes(assignedShift.getGracePeriodMinutes());
            if (currentTime.isAfter(graceEnd)) {
                isLate = true;
                status = "LATE";
            }
        }

        List<LeaveRequest> approvedLeaves = leaveRequestRepository.findApprovedLeaveOnDate(employee.getId(), today);
        if (!approvedLeaves.isEmpty()) {
            status = "ON_LEAVE";
        }

        Attendance attendance = Attendance.builder()
            .employee(employee)
            .branch(branch)
            .shift(assignedShift)
            .attendanceDate(today)
            .checkInAt(nowServer)
            .checkInLatitude(request.getLatitude())
            .checkInLongitude(request.getLongitude())
            .checkInAccuracy(request.getAccuracy())
            .checkInDistance(BigDecimal.valueOf(distanceMeters).setScale(2, RoundingMode.HALF_UP))
            .status(status)
            .isLate(isLate)
            .notes(request.getNotes())
            .totalWorkMinutes(0)
            .currentSessionStatus("CHECKED_IN")
            .sessions(new ArrayList<>())
            .build();

        AttendancePunchSession initialSession = AttendancePunchSession.builder()
            .attendance(attendance)
            .sessionNumber(1)
            .checkInAt(nowServer)
            .checkInLatitude(request.getLatitude())
            .checkInLongitude(request.getLongitude())
            .checkInAccuracy(request.getAccuracy())
            .checkInDistance(BigDecimal.valueOf(distanceMeters).setScale(2, RoundingMode.HALF_UP))
            .durationMinutes(0)
            .notes(request.getNotes())
            .build();

        attendance.getSessions().add(initialSession);
        Attendance saved = attendanceRepository.save(attendance);

        auditService.logAction(user, "CHECK_IN", "ATTENDANCE", saved.getId(),
            "Checked in at " + branch.getName() + " (Distance: " + String.format("%.1fm", distanceMeters) + ")");
        return saved;
    }

    @Transactional
    public Attendance checkOut(String username, CheckOutRequest request) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found"));

        Employee employee = employeeRepository.findByUserId(user.getId())
            .orElseThrow(() -> new RuntimeException("Employee record not found"));

        LocalDate today = LocalDate.now(CLINIC_ZONE);
        Attendance attendance = attendanceRepository.findByEmployeeIdAndAttendanceDate(employee.getId(), today)
            .orElseThrow(() -> new IllegalStateException("No active check-in record found for today"));

        if ("CHECKED_OUT".equalsIgnoreCase(attendance.getCurrentSessionStatus())) {
            throw new IllegalStateException("Already checked out for the current session. Please check in to start a new session.");
        }

        Branch branch = attendance.getBranch();

        if (geofenceService.isAbnormalCoordinates(request.getLatitude(), request.getLongitude())) {
            throw new IllegalArgumentException("Invalid GPS coordinates detected");
        }

        if (!geofenceService.isAccuracyValid(request.getAccuracy(), branch.getMaxGpsAccuracyMeters())) {
            throw new IllegalArgumentException("Location accuracy is too low. Please try again with better GPS signal.");
        }

        double distanceMeters = geofenceService.calculateDistanceMeters(
            request.getLatitude().doubleValue(),
            request.getLongitude().doubleValue(),
            branch.getLatitude().doubleValue(),
            branch.getLongitude().doubleValue()
        );

        if (!geofenceService.isWithinGeofence(distanceMeters, branch.getAllowedRadiusMeters())) {
            throw new IllegalStateException(String.format("You are outside the allowed branch location for check-out. Distance: %.1fm", distanceMeters));
        }

        OffsetDateTime nowServer = OffsetDateTime.now(CLINIC_ZONE);
        LocalTime currentTime = nowServer.toLocalTime();

        boolean isEarly = false;
        if (attendance.getShift() != null) {
            LocalTime shiftEnd = attendance.getShift().getEndTime();
            if (currentTime.isBefore(shiftEnd)) {
                isEarly = true;
            }
        }

        // Close the active session
        List<AttendancePunchSession> sessions = attendance.getSessions();
        AttendancePunchSession openSession = null;
        if (sessions != null && !sessions.isEmpty()) {
            for (int i = sessions.size() - 1; i >= 0; i--) {
                if (sessions.get(i).getCheckOutAt() == null) {
                    openSession = sessions.get(i);
                    break;
                }
            }
        }

        if (openSession != null) {
            openSession.setCheckOutAt(nowServer);
            openSession.setCheckOutLatitude(request.getLatitude());
            openSession.setCheckOutLongitude(request.getLongitude());
            openSession.setCheckOutAccuracy(request.getAccuracy());
            openSession.setCheckOutDistance(BigDecimal.valueOf(distanceMeters).setScale(2, RoundingMode.HALF_UP));

            long sessionMins = Duration.between(openSession.getCheckInAt(), nowServer).toMinutes();
            openSession.setDurationMinutes((int) Math.max(0, sessionMins));
        }

        // Calculate cumulative total minutes across all sessions
        int totalMins = 0;
        if (sessions != null) {
            totalMins = sessions.stream()
                .mapToInt(s -> s.getDurationMinutes() != null ? s.getDurationMinutes() : 0)
                .sum();
        }

        attendance.setCheckOutAt(nowServer);
        attendance.setCheckOutLatitude(request.getLatitude());
        attendance.setCheckOutLongitude(request.getLongitude());
        attendance.setCheckOutAccuracy(request.getAccuracy());
        attendance.setCheckOutDistance(BigDecimal.valueOf(distanceMeters).setScale(2, RoundingMode.HALF_UP));
        attendance.setIsEarlyCheckout(isEarly);
        attendance.setTotalWorkMinutes(totalMins);
        attendance.setCurrentSessionStatus("CHECKED_OUT");

        if (request.getNotes() != null && !request.getNotes().isBlank()) {
            attendance.setNotes((attendance.getNotes() != null ? attendance.getNotes() + " | " : "") + request.getNotes());
        }

        Attendance saved = attendanceRepository.save(attendance);
        auditService.logAction(user, "CHECK_OUT", "ATTENDANCE", saved.getId(),
            "Checked out at " + branch.getName() + " (Session completed. Total working hours today: " + (totalMins / 60) + "h " + (totalMins % 60) + "m)");
        return saved;
    }

    public Optional<Attendance> getTodayAttendance(String username) {
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) return Optional.empty();
        Employee emp = employeeRepository.findByUserId(user.getId()).orElse(null);
        if (emp == null) return Optional.empty();
        return attendanceRepository.findByEmployeeIdAndAttendanceDate(emp.getId(), LocalDate.now(CLINIC_ZONE));
    }

    public List<Attendance> getAttendanceHistory(LocalDate startDate, LocalDate endDate, Long branchId, Long employeeId) {
        LocalDate start = (startDate != null) ? startDate : LocalDate.now(CLINIC_ZONE).minusDays(30);
        LocalDate end = (endDate != null) ? endDate : LocalDate.now(CLINIC_ZONE);

        if (employeeId != null) {
            return attendanceRepository.findByEmployeeIdAndAttendanceDateBetweenOrderByAttendanceDateDesc(employeeId, start, end);
        } else if (branchId != null) {
            return attendanceRepository.findByBranchIdAndAttendanceDateBetweenOrderByAttendanceDateDesc(branchId, start, end);
        } else {
            return attendanceRepository.findByAttendanceDateBetweenOrderByAttendanceDateDesc(start, end);
        }
    }

    @Transactional
    public Attendance correctAttendance(Long id, AttendanceCorrectionRequest req, User adminUser) {
        Attendance attendance = attendanceRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Attendance record not found"));

        if (req.getCheckInAt() != null) attendance.setCheckInAt(req.getCheckInAt());
        if (req.getCheckOutAt() != null) attendance.setCheckOutAt(req.getCheckOutAt());
        if (req.getStatus() != null) attendance.setStatus(req.getStatus());
        if (req.getReason() != null) {
            attendance.setNotes((attendance.getNotes() != null ? attendance.getNotes() + " | Corrected: " : "Corrected: ") + req.getReason());
        }

        if (attendance.getCheckInAt() != null && attendance.getCheckOutAt() != null) {
            long totalMins = Duration.between(attendance.getCheckInAt(), attendance.getCheckOutAt()).toMinutes();
            attendance.setTotalWorkMinutes((int) Math.max(0, totalMins));
        }

        Attendance saved = attendanceRepository.save(attendance);
        auditService.logAction(adminUser, "ATTENDANCE_CORRECTED", "ATTENDANCE", saved.getId(), "Corrected attendance record. Reason: " + req.getReason());
        return saved;
    }
}
