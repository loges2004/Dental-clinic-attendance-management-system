package com.v3dental.attendance.config;

import com.v3dental.attendance.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${ADMIN_PASSWORD:V3@08062025}")
    private String adminPassword;

    @Value("${DOCTOR_PASSWORD:Doctor@V3Dental}")
    private String doctorPassword;

    @Value("${SISTER_PASSWORD:Sister@V3Dental}")
    private String sisterPassword;

    @Override
    public void run(String... args) {
        log.info("Securely initializing user password hashes from environment configuration...");

        userRepository.findByUsername("admin").ifPresent(user -> {
            user.setPasswordHash(passwordEncoder.encode(adminPassword));
            userRepository.save(user);
        });

        userRepository.findByUsername("dr_arun").ifPresent(user -> {
            user.setPasswordHash(passwordEncoder.encode(doctorPassword));
            userRepository.save(user);
        });

        userRepository.findByUsername("sister_priya").ifPresent(user -> {
            user.setPasswordHash(passwordEncoder.encode(sisterPassword));
            userRepository.save(user);
        });

        log.info("User security hashes initialized successfully.");
    }
}
