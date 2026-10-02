package com.v3dental.attendance.employee;

import com.v3dental.attendance.audit.AuditLogRepository;
import com.v3dental.attendance.audit.AuditService;
import com.v3dental.attendance.attendance.AttendanceRepository;
import com.v3dental.attendance.branch.Branch;
import com.v3dental.attendance.branch.BranchRepository;
import com.v3dental.attendance.leave.LeavePeriodRepository;
import com.v3dental.attendance.leave.LeaveRequestRepository;
import com.v3dental.attendance.leave.LeaveTransactionRepository;
import com.v3dental.attendance.user.Role;
import com.v3dental.attendance.user.RoleRepository;
import com.v3dental.attendance.user.User;
import com.v3dental.attendance.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
public class EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final BranchRepository branchRepository;
    private final AttendanceRepository attendanceRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final LeavePeriodRepository leavePeriodRepository;
    private final LeaveTransactionRepository leaveTransactionRepository;
    private final AuditLogRepository auditLogRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    public List<Employee> getAllEmployees() {
        return employeeRepository.findAll();
    }

    public Employee getEmployeeById(Long id) {
        return employeeRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Employee not found with id: " + id));
    }

    @Transactional
    public Employee createEmployee(CreateEmployeeRequest req, User adminUser) {
        Role role = roleRepository.findByName(req.getRoleName())
            .orElseThrow(() -> new RuntimeException("Role not found: " + req.getRoleName()));

        Branch branch = branchRepository.findById(req.getBranchId())
            .orElseThrow(() -> new RuntimeException("Branch not found: " + req.getBranchId()));

        String email = StringUtils.hasText(req.getEmail()) ? req.getEmail().trim() : null;

        User user = User.builder()
            .username(req.getUsername().trim())
            .passwordHash(passwordEncoder.encode(req.getPassword()))
            .email(email)
            .role(role)
            .isActive(true)
            .build();
        User savedUser = userRepository.save(user);

        Employee emp = Employee.builder()
            .user(savedUser)
            .employeeCode(req.getEmployeeCode().trim())
            .firstName(req.getFirstName().trim())
            .lastName(req.getLastName() != null ? req.getLastName().trim() : "")
            .phone(req.getPhone())
            .designation(req.getDesignation())
            .department(req.getDepartment())
            .branch(branch)
            .joiningDate(req.getJoiningDate())
            .monthlyLeaveEntitlement(req.getMonthlyLeaveEntitlement())
            .isActive(true)
            .build();

        Employee saved = employeeRepository.save(emp);
        auditService.logAction(adminUser, "EMPLOYEE_CREATED", "EMPLOYEE", saved.getId(), "Created employee: " + saved.getEmployeeCode());
        return saved;
    }

    @Transactional
    public Employee updateEmployee(Long id, CreateEmployeeRequest req, User adminUser) {
        Employee emp = getEmployeeById(id);
        emp.setFirstName(req.getFirstName().trim());
        emp.setLastName(req.getLastName() != null ? req.getLastName().trim() : "");
        emp.setPhone(req.getPhone());
        emp.setDesignation(req.getDesignation());
        emp.setDepartment(req.getDepartment());
        if (req.getMonthlyLeaveEntitlement() != null) {
            emp.setMonthlyLeaveEntitlement(req.getMonthlyLeaveEntitlement());
        }

        if (req.getBranchId() != null) {
            Branch b = branchRepository.findById(req.getBranchId()).orElse(emp.getBranch());
            emp.setBranch(b);
        }

        // Update User fields if present
        User u = emp.getUser();
        if (u != null) {
            if (req.getEmail() != null) {
                u.setEmail(StringUtils.hasText(req.getEmail()) ? req.getEmail().trim() : null);
            }
            if (StringUtils.hasText(req.getPassword())) {
                u.setPasswordHash(passwordEncoder.encode(req.getPassword()));
            }
            if (StringUtils.hasText(req.getRoleName())) {
                roleRepository.findByName(req.getRoleName()).ifPresent(u::setRole);
            }
            userRepository.save(u);
        }

        Employee saved = employeeRepository.save(emp);
        auditService.logAction(adminUser, "EMPLOYEE_UPDATED", "EMPLOYEE", saved.getId(), "Updated employee details: " + saved.getEmployeeCode());
        return saved;
    }

    @Transactional
    public Employee toggleEmployeeStatus(Long id, boolean active, User adminUser) {
        Employee emp = getEmployeeById(id);
        emp.setIsActive(active);
        if (emp.getUser() != null) {
            emp.getUser().setIsActive(active);
            userRepository.save(emp.getUser());
        }
        Employee saved = employeeRepository.save(emp);
        auditService.logAction(adminUser, active ? "EMPLOYEE_REACTIVATED" : "EMPLOYEE_DISABLED", "EMPLOYEE", id, "Toggled status to " + active);
        return saved;
    }

    @Transactional
    public void deleteEmployee(Long id, User adminUser) {
        Employee emp = getEmployeeById(id);
        String name = emp.getFirstName() + " " + emp.getLastName();
        String code = emp.getEmployeeCode();
        User u = emp.getUser();
        Long userId = u != null ? u.getId() : null;

        // 1. Delete associated leave transactions
        leaveTransactionRepository.deleteByEmployeeIdOrCreatedById(id, userId != null ? userId : -1L);

        // 2. Delete associated leave periods & leave requests
        leavePeriodRepository.deleteByEmployeeId(id);
        leaveRequestRepository.deleteByEmployeeId(id);

        // 3. Delete attendance records
        attendanceRepository.deleteByEmployeeId(id);

        // 4. Nullify audit log user references to avoid FK constraint
        if (userId != null) {
            auditLogRepository.nullifyUser(userId);
        }

        // 5. Delete employee record
        employeeRepository.delete(emp);

        // 6. Delete user account
        if (u != null) {
            userRepository.delete(u);
        }

        auditService.logAction(adminUser, "EMPLOYEE_DELETED", "EMPLOYEE", id, "Deleted employee: " + name + " (" + code + ")");
    }
}
