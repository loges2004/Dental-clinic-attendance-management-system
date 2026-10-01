package com.v3dental.attendance.employee;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {
    Optional<Employee> findByUserId(Long userId);
    Optional<Employee> findByEmployeeCode(String employeeCode);
    List<Employee> findByBranchId(Long branchId);
    List<Employee> findByIsActiveTrue();
    boolean existsByEmployeeCode(String employeeCode);
}
