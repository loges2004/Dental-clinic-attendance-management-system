package com.v3dental.attendance.common;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.ZonedDateTime;
import java.time.ZoneId;
import java.util.Map;

@RestController
@RequestMapping("/api/health")
public class HealthCheckController {

    @GetMapping
    public ResponseEntity<Map<String, Object>> getHealth() {
        return ResponseEntity.ok(Map.of(
            "status", "UP",
            "system", "V3 Dental Clinic Attendance System",
            "timestamp", ZonedDateTime.now(ZoneId.of("Asia/Kolkata")).toString(),
            "clinicBranches", java.util.List.of("Saibaba Colony", "Kannappa Nagar")
        ));
    }
}
