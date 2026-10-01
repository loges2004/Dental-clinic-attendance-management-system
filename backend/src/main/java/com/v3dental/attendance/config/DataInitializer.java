package com.v3dental.attendance.config;

import com.v3dental.attendance.user.User;
import com.v3dental.attendance.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        log.info("Initializing / updating default seed user password hashes...");

        Map<String, String> defaultUsers = Map.of(
            "admin", "Admin@V3Dental2026",
            "dr_arun", "Doctor@V3Dental",
            "sister_priya", "Sister@V3Dental"
        );

        defaultUsers.forEach((username, rawPassword) -> {
            userRepository.findByUsername(username).ifPresent(user -> {
                user.setPasswordHash(passwordEncoder.encode(rawPassword));
                userRepository.save(user);
                log.info("Updated password hash for user: {}", username);
            });
        });
    }
}
