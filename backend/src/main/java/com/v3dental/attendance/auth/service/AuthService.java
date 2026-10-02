package com.v3dental.attendance.auth.service;

import com.v3dental.attendance.audit.AuditService;
import com.v3dental.attendance.auth.dto.AuthResponse;
import com.v3dental.attendance.auth.dto.ChangePasswordRequest;
import com.v3dental.attendance.auth.dto.LoginRequest;
import com.v3dental.attendance.auth.dto.UserDto;
import com.v3dental.attendance.auth.security.JwtUtils;
import com.v3dental.attendance.employee.Employee;
import com.v3dental.attendance.employee.EmployeeRepository;
import com.v3dental.attendance.user.User;
import com.v3dental.attendance.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;
    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final UserDetailsService userDetailsService;
    private final AuditService auditService;
    private final PasswordEncoder passwordEncoder;

    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );

        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        String accessToken = jwtUtils.generateAccessToken(userDetails);
        String refreshToken = jwtUtils.generateRefreshToken(userDetails);

        User user = userRepository.findByUsername(request.getUsername())
            .orElseThrow(() -> new RuntimeException("User not found"));

        UserDto userDto = buildUserDto(user);
        auditService.logAction(user, "LOGIN", "USER", user.getId(), "User logged in successfully");

        return AuthResponse.builder()
            .token(accessToken)
            .refreshToken(refreshToken)
            .user(userDto)
            .build();
    }

    public UserDto getCurrentUser(String username) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found"));
        return buildUserDto(user);
    }

    public AuthResponse refreshToken(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new IllegalArgumentException("Refresh token is required");
        }

        String username = jwtUtils.getUsernameFromToken(refreshToken);
        UserDetails userDetails = userDetailsService.loadUserByUsername(username);

        if (!jwtUtils.validateToken(refreshToken, userDetails)) {
            throw new IllegalArgumentException("Invalid or expired refresh token");
        }

        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found"));

        String newAccessToken = jwtUtils.generateAccessToken(userDetails);
        String newRefreshToken = jwtUtils.generateRefreshToken(userDetails);

        return AuthResponse.builder()
            .token(newAccessToken)
            .refreshToken(newRefreshToken)
            .user(buildUserDto(user))
            .build();
    }

    @Transactional
    public void changePassword(String username, ChangePasswordRequest request) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Current password is incorrect");
        }

        if (request.getNewPassword() == null || request.getNewPassword().length() < 6) {
            throw new IllegalArgumentException("New password must be at least 6 characters long");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        auditService.logAction(user, "PASSWORD_CHANGED", "USER", user.getId(), "User changed password successfully");
    }

    public UserDto buildUserDto(User user) {
        Employee employee = employeeRepository.findByUserId(user.getId()).orElse(null);

        return UserDto.builder()
            .userId(user.getId())
            .employeeId(employee != null ? employee.getId() : null)
            .username(user.getUsername())
            .email(user.getEmail())
            .role(user.getRole().getName())
            .employeeCode(employee != null ? employee.getEmployeeCode() : null)
            .firstName(employee != null ? employee.getFirstName() : "Clinic")
            .lastName(employee != null ? employee.getLastName() : "User")
            .designation(employee != null ? employee.getDesignation() : user.getRole().getName())
            .department(employee != null ? employee.getDepartment() : "General")
            .branchId(employee != null && employee.getBranch() != null ? employee.getBranch().getId() : null)
            .branchName(employee != null && employee.getBranch() != null ? employee.getBranch().getName() : "All Branches")
            .branchCode(employee != null && employee.getBranch() != null ? employee.getBranch().getCode() : "ALL")
            .monthlyLeaveEntitlement(employee != null ? employee.getMonthlyLeaveEntitlement() : null)
            .build();
    }
}
