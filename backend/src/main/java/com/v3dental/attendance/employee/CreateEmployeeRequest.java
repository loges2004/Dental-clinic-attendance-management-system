package com.v3dental.attendance.employee;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class CreateEmployeeRequest {
    private String username;
    private String password;
    private String email;
    private String roleName; // ADMIN, DOCTOR, SISTER, OTHER_STAFF
    private String employeeCode;
    private String firstName;
    private String lastName;
    private String phone;
    private String designation;
    private String department;
    private Long branchId;
    private LocalDate joiningDate;
    private BigDecimal monthlyLeaveEntitlement;
}
