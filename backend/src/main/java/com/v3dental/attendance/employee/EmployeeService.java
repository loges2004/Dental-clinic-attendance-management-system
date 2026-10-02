package com.v3dental.attendance.employee;

import com.v3dental.attendance.audit.AuditService;
import com.v3dental.attendance.branch.Branch;
import com.v3dental.attendance.branch.BranchRepository;
import com.v3dental.attendance.user.Role;
import com.v3dental.attendance.user.RoleRepository;
import com.v3dental.attendance.user.User;
import com.v3dental.attendance.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final BranchRepository branchRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    public List<Employee> getAllEmployees() {
        return employeeRepository.findAll();
    }

    public Employee getEmployeeById(Long id) {
        return employeeRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Employee not found with ID: " + id));
    }

    @Transactional
    public Employee createEmployee(CreateEmployeeRequest req, User adminUser) {
        if (userRepository.existsByUsername(req.getUsername())) {
            throw new RuntimeException("Username already exists");
        }
        if (employeeRepository.existsByEmployeeCode(req.getEmployeeCode())) {
            throw new RuntimeException("Employee code already exists");
        }

        Role role = roleRepository.findByName(req.getRoleName())
            .orElseThrow(() -> new RuntimeException("Role not found: " + req.getRoleName()));

        Branch branch = branchRepository.findById(req.getBranchId())
            .orElseThrow(() -> new RuntimeException("Branch not found"));

        User user = User.builder()
            .username(req.getUsername())
            .passwordHash(passwordEncoder.encode(req.getPassword()))
            .email(req.getEmail())
            .role(role)
            .isActive(true)
            .build();

        Employee employee = Employee.builder()
            .user(user)
            .employeeCode(req.getEmployeeCode())
            .firstName(req.getFirstName())
            .lastName(req.getLastName())
            .phone(req.getPhone())
            .designation(req.getDesignation())
            .department(req.getDepartment())
            .branch(branch)
            .joiningDate(req.getJoiningDate())
            .isActive(true)
            .monthlyLeaveEntitlement(req.getMonthlyLeaveEntitlement())
            .build();

        Employee saved = employeeRepository.save(employee);
        auditService.logAction(adminUser, "EMPLOYEE_CREATED", "EMPLOYEE", saved.getId(), "Created employee: " + saved.getFirstName() + " " + saved.getLastName());
        return saved;
    }

    @Transactional
    public Employee updateEmployee(Long id, CreateEmployeeRequest req, User adminUser) {
        Employee emp = getEmployeeById(id);
        emp.setFirstName(req.getFirstName());
        emp.setLastName(req.getLastName());
        emp.setPhone(req.getPhone());
        emp.setDesignation(req.getDesignation());
        emp.setDepartment(req.getDepartment());
        emp.setMonthlyLeaveEntitlement(req.getMonthlyLeaveEntitlement());

        if (req.getBranchId() != null) {
            Branch b = branchRepository.findById(req.getBranchId()).orElse(emp.getBranch());
            emp.setBranch(b);
        }

        Employee saved = employeeRepository.save(emp);
        auditService.logAction(adminUser, "EMPLOYEE_UPDATED", "EMPLOYEE", saved.getId(), "Updated employee details: " + saved.getEmployeeCode());
        return saved;
    }

    @Transactional
    public Employee toggleEmployeeStatus(Long id, boolean active, User adminUser) {
        Employee emp = getEmployeeById(id);
        emp.setIsActive(active);
        emp.getUser().setIsActive(active);
        Employee saved = employeeRepository.save(emp);
        auditService.logAction(adminUser, active ? "EMPLOYEE_REACTIVATED" : "EMPLOYEE_DISABLED", "EMPLOYEE", id, "Toggled status to " + active);
        return saved;
    }

    @Transactional
    public void deleteEmployee(Long id, User adminUser) {
        Employee emp = getEmployeeById(id);
        String name = emp.getFirstName() + " " + emp.getLastName();
        String code = emp.getEmployeeCode();
        auditService.logAction(adminUser, "EMPLOYEE_DELETED", "EMPLOYEE", id, "Deleted employee: " + name + " (" + code + ")");
        employeeRepository.delete(emp);
    }
}
