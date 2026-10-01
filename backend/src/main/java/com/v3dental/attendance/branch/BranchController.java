package com.v3dental.attendance.branch;

import com.v3dental.attendance.user.User;
import com.v3dental.attendance.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/branches")
@RequiredArgsConstructor
public class BranchController {

    private final BranchService branchService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<Branch>> getAllBranches() {
        return ResponseEntity.ok(branchService.getAllBranches());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Branch> getBranchById(@PathVariable Long id) {
        return ResponseEntity.ok(branchService.getBranchById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Branch> createBranch(@RequestBody Branch branch, Authentication authentication) {
        User admin = userRepository.findByUsername(authentication.getName()).orElse(null);
        return ResponseEntity.ok(branchService.createBranch(branch, admin));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Branch> updateBranch(@PathVariable Long id, @RequestBody Branch branch, Authentication authentication) {
        User admin = userRepository.findByUsername(authentication.getName()).orElse(null);
        return ResponseEntity.ok(branchService.updateBranch(id, branch, admin));
    }
}
