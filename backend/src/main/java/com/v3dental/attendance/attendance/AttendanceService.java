package com.v3dental.attendance.attendance;

import com.v3dental.attendance.audit.AuditService;
import com.v3dental.attendance.branch.Branch;
import com.v3dental.attendance.branch.BranchRepository;
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
import org.springframework.util.StringUtils;

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
    private final BranchRepository branchRepository;
    private final GeofenceService geofenceService;
    private final UserRepository userRepository;
    private final AuditService auditService;

    private static final ZoneId CLINIC_ZONE = ZoneId.of("Asia/Kolkata");

    /**
     * Resolves the matching clinic branch for the given GPS coordinates.
     * Prioritizes the employee's assigned home branch; if outside, dynamically checks all other active branches
     * (e.g. for emergency cross-branch duty like Saibaba Colony staff visiting Kannappa Nagar).
     */
    private BranchMatchResult resolveBranchForCoordinates(Employee employee, BigDecimal lat, BigDecimal lng, BigDecimal accuracy) {
        if (geofenceService.isAbnormalCoordinates(lat, lng)) {
            throw new IllegalArgumentException("Invalid GPS coordinates detected");
        }

        List<Branch> activeBranches = branchRepository.findByIsActiveTrue();
        if (activeBranches.isEmpty()) {
            throw new IllegalStateException("No active clinic branches found in system");
        }

        Branch assignedBranch = employee.getBranch();
        Branch closestBranch = null;
        double minDistance = Double.MAX_VALUE;

        // 1. Check assigned home branch first
        if (assignedBranch != null && Boolean.TRUE.equals(assignedBranch.getIsActive())) {
            double dist = geofenceService.calculateDistanceMeters(
                lat.doubleValue(), lng.doubleValue(),
                assignedBranch.getLatitude().doubleValue(), assignedBranch.getLongitude().doubleValue()
            );
            if (geofenceService.isWithinGeofenceAdaptive(dist, assignedBranch.getAllowedRadiusMeters(), accuracy)) {
                return new BranchMatchResult(assignedBranch, dist, false);
            }
            minDistance = dist;
            closestBranch = assignedBranch;
        }

        // 2. Check all other active clinic branches for cross-branch / emergency duty
        for (Branch b : activeBranches) {
            if (assignedBranch != null && b.getId().equals(assignedBranch.getId())) {
                continue;
            }
            double dist = geofenceService.calculateDistanceMeters(
                lat.doubleValue(), lng.doubleValue(),
                b.getLatitude().doubleValue(), b.getLongitude().doubleValue()
            );
            if (dist < minDistance) {
                minDistance = dist;
                closestBranch = b;
            }
            if (geofenceService.isWithinGeofenceAdaptive(dist, b.getAllowedRadiusMeters(), accuracy)) {
                return new BranchMatchResult(b, dist, true);
            }
        }

        // Neither home branch nor any other clinic branch matched within geofence range
        String closestName = closestBranch != null ? closestBranch.getName() : "Clinic";
        throw new IllegalStateException(String.format(
            "You are outside the allowed branch location. Closest branch: %s (Distance: %.1fm)",
            closestName, minDistance));
    }

    private static class BranchMatchResult {
        final Branch branch;
        final double distanceMeters;
        final boolean isCrossBranch;

        BranchMatchResult(Branch branch, double distanceMeters, boolean isCrossBranch) {
            this.branch = branch;
            this.distanceMeters = distanceMeters;
            this.isCrossBranch = isCrossBranch;
        }
    }

    @Transactional
    public Attendance checkIn(String username, CheckInRequest request) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found"));

        Employee employee = employeeRepository.findByUserId(user.getId())
            .orElseThrow(() -> new RuntimeException("Employee record not found for user"));

        if (!Boolean.TRUE.equals(employee.getIsActive())) {
            throw new RuntimeException("Inactive employee account cannot check in");
        }

        BranchMatchResult match = resolveBranchForCoordinates(employee, request.getLatitude(), request.getLongitude(), request.getAccuracy());
        Branch branch = match.branch;
        double distanceMeters = match.distanceMeters;
        boolean isCrossBranch = match.isCrossBranch;

        LocalDate today = LocalDate.now(CLINIC_ZONE);
        OffsetDateTime nowServer = OffsetDateTime.now(CLINIC_ZONE);
        LocalTime currentTime = nowServer.toLocalTime();

        Optional<Attendance> existingOpt = attendanceRepository.findByEmployeeIdAndAttendanceDate(employee.getId(), today);

        if (existingOpt.isPresent()) {
            Attendance existing = existingOpt.get();
            if ("CHECKED_IN".equalsIgnoreCase(existing.getCurrentSessionStatus())) {
                throw new IllegalStateException("Already checked in for the current session. Please check out before checking in again.");
            }

            // Start a new session (e.g., returning from lunch or emergency visit to another branch)
            int sessionNumber = (existing.getSessions() != null ? existing.getSessions().size() : 0) + 1;
            String sessionNotes = request.getNotes();
            if (isCrossBranch) {
                String crossTag = "[Branch: " + branch.getName() + "]";
                sessionNotes = StringUtils.hasText(sessionNotes) ? crossTag + " " + sessionNotes : crossTag;
            }

            AttendancePunchSession newSession = AttendancePunchSession.builder()
                .attendance(existing)
                .sessionNumber(sessionNumber)
                .checkInAt(nowServer)
                .checkInLatitude(request.getLatitude())
                .checkInLongitude(request.getLongitude())
                .checkInAccuracy(request.getAccuracy())
                .checkInDistance(BigDecimal.valueOf(distanceMeters).setScale(2, RoundingMode.HALF_UP))
                .durationMinutes(0)
                .notes(sessionNotes)
                .build();

            if (existing.getSessions() == null) {
                existing.setSessions(new ArrayList<>());
            }
            existing.getSessions().add(newSession);
            existing.setCurrentSessionStatus("CHECKED_IN");
            Attendance saved = attendanceRepository.save(existing);

            String logMsg = "Checked in for Session #" + sessionNumber + " at " + branch.getName() +
                (isCrossBranch ? " (Cross-Branch Duty, Home: " + (employee.getBranch() != null ? employee.getBranch().getName() : "N/A") + ")" : "") +
                " (Distance: " + String.format("%.1fm", distanceMeters) + ")";
            auditService.logAction(user, "CHECK_IN_SESSION_" + sessionNumber, "ATTENDANCE", saved.getId(), logMsg);
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

        String initialNotes = request.getNotes();
        if (isCrossBranch) {
            String crossTag = "[Branch: " + branch.getName() + "]";
            initialNotes = StringUtils.hasText(initialNotes) ? crossTag + " " + initialNotes : crossTag;
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
            .isEarlyCheckout(false)
            .notes(initialNotes)
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
            .notes(initialNotes)
            .build();

        attendance.getSessions().add(initialSession);
        Attendance saved = attendanceRepository.save(attendance);

        String logMsg = "Checked in at " + branch.getName() +
            (isCrossBranch ? " (Cross-Branch Duty, Home: " + (employee.getBranch() != null ? employee.getBranch().getName() : "N/A") + ")" : "") +
            " (Distance: " + String.format("%.1fm", distanceMeters) + ")";
        auditService.logAction(user, "CHECK_IN", "ATTENDANCE", saved.getId(), logMsg);
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

        BranchMatchResult match = resolveBranchForCoordinates(employee, request.getLatitude(), request.getLongitude(), request.getAccuracy());
        Branch branch = match.branch;
        double distanceMeters = match.distanceMeters;

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

    @Transactional
    public Attendance forgotCheckOut(String username, ForgotCheckOutRequest request) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found"));

        Employee employee = employeeRepository.findByUserId(user.getId())
            .orElseThrow(() -> new RuntimeException("Employee record not found"));

        LocalDate today = LocalDate.now(CLINIC_ZONE);
        Attendance attendance = attendanceRepository.findByEmployeeIdAndAttendanceDate(employee.getId(), today)
            .orElseThrow(() -> new IllegalStateException("No active check-in record found for today"));

        if ("CHECKED_OUT".equalsIgnoreCase(attendance.getCurrentSessionStatus())) {
            throw new IllegalStateException("Already checked out for the current session.");
        }

        LocalTime departureTime = request.getActualCheckOutTime();
        if (departureTime == null) {
            throw new IllegalArgumentException("Actual checkout departure time is required");
        }

        OffsetDateTime checkOutDateTime = today.atTime(departureTime).atZone(CLINIC_ZONE).toOffsetDateTime();
        OffsetDateTime nowServer = OffsetDateTime.now(CLINIC_ZONE);

        if (checkOutDateTime.isAfter(nowServer)) {
            checkOutDateTime = nowServer;
        }

        // Close the active open session
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
            if (checkOutDateTime.isBefore(openSession.getCheckInAt())) {
                checkOutDateTime = openSession.getCheckInAt().plusMinutes(1);
            }
            openSession.setCheckOutAt(checkOutDateTime);
            openSession.setCheckOutLatitude(request.getLatitude());
            openSession.setCheckOutLongitude(request.getLongitude());
            openSession.setCheckOutAccuracy(request.getAccuracy());

            long sessionMins = Duration.between(openSession.getCheckInAt(), checkOutDateTime).toMinutes();
            openSession.setDurationMinutes((int) Math.max(0, sessionMins));

            String note = openSession.getNotes() != null ? openSession.getNotes() : "";
            openSession.setNotes(note + " [Remote Check-Out at " + departureTime.toString() + "]");
        }

        int totalMins = 0;
        if (sessions != null) {
            totalMins = sessions.stream()
                .mapToInt(s -> s.getDurationMinutes() != null ? s.getDurationMinutes() : 0)
                .sum();
        }

        attendance.setCheckOutAt(checkOutDateTime);
        attendance.setCheckOutLatitude(request.getLatitude());
        attendance.setCheckOutLongitude(request.getLongitude());
        attendance.setCheckOutAccuracy(request.getAccuracy());
        attendance.setTotalWorkMinutes(totalMins);
        attendance.setCurrentSessionStatus("CHECKED_OUT");

        String remoteTag = "[Remote Check-Out: Left clinic at " + departureTime.toString() + (StringUtils.hasText(request.getReason()) ? " | " + request.getReason() : "") + "]";
        attendance.setNotes((attendance.getNotes() != null ? attendance.getNotes() + " | " : "") + remoteTag);

        Attendance saved = attendanceRepository.save(attendance);
        auditService.logAction(user, "REMOTE_CHECK_OUT", "ATTENDANCE", saved.getId(),
            "Completed Remote Check-Out. Left clinic at " + departureTime.toString() + ". Total Work: " + (totalMins / 60) + "h " + (totalMins % 60) + "m");
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
