package com.v3dental.attendance.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDto {
    private Long userId;
    private Long employeeId;
    private String username;
    private String email;
    private String role; // ADMIN, DOCTOR, SISTER, OTHER_STAFF
    private String employeeCode;
    private String firstName;
    private String lastName;
    private String designation;
    private String department;
    private Long branchId;
    private String branchName;
    private String branchCode;
    private BigDecimal monthlyLeaveEntitlement;
}
