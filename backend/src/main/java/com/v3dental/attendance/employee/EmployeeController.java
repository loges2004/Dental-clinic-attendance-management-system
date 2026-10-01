package com.v3dental.attendance.employee;

import com.v3dental.attendance.user.User;
import com.v3dental.attendance.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/employees")
@RequiredArgsConstructor
public class EmployeeController {

    private final EmployeeService employeeService;
    private final UserRepository userRepository;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Employee>> getAllEmployees() {
        return ResponseEntity.ok(employeeService.getAllEmployees());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Employee> getEmployeeById(@PathVariable Long id) {
        return ResponseEntity.ok(employeeService.getEmployeeById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Employee> createEmployee(@RequestBody CreateEmployeeRequest request, Authentication authentication) {
        User admin = userRepository.findByUsername(authentication.getName()).orElse(null);
        return ResponseEntity.ok(employeeService.createEmployee(request, admin));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Employee> updateEmployee(@PathVariable Long id, @RequestBody CreateEmployeeRequest request, Authentication authentication) {
        User admin = userRepository.findByUsername(authentication.getName()).orElse(null);
        return ResponseEntity.ok(employeeService.updateEmployee(id, request, admin));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Employee> toggleStatus(@PathVariable Long id, @RequestParam boolean active, Authentication authentication) {
        User admin = userRepository.findByUsername(authentication.getName()).orElse(null);
        return ResponseEntity.ok(employeeService.toggleEmployeeStatus(id, active, admin));
    }
}
