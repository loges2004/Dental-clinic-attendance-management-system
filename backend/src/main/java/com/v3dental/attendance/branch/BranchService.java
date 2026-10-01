package com.v3dental.attendance.branch;

import com.v3dental.attendance.audit.AuditService;
import com.v3dental.attendance.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BranchService {

    private final BranchRepository branchRepository;
    private final AuditService auditService;

    public List<Branch> getAllBranches() {
        return branchRepository.findAll();
    }

    public Branch getBranchById(Long id) {
        return branchRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Branch not found with ID: " + id));
    }

    @Transactional
    public Branch createBranch(Branch branch, User adminUser) {
        Branch saved = branchRepository.save(branch);
        auditService.logAction(adminUser, "BRANCH_CREATED", "BRANCH", saved.getId(), "Created branch: " + saved.getName());
        return saved;
    }

    @Transactional
    public Branch updateBranch(Long id, Branch details, User adminUser) {
        Branch branch = getBranchById(id);
        branch.setName(details.getName());
        branch.setAddress(details.getAddress());
        branch.setLatitude(details.getLatitude());
        branch.setLongitude(details.getLongitude());
        branch.setAllowedRadiusMeters(details.getAllowedRadiusMeters());
        branch.setMaxGpsAccuracyMeters(details.getMaxGpsAccuracyMeters());
        branch.setIsActive(details.getIsActive());

        Branch saved = branchRepository.save(branch);
        auditService.logAction(adminUser, "BRANCH_UPDATED", "BRANCH", saved.getId(), "Updated branch settings: " + saved.getName());
        return saved;
    }
}
