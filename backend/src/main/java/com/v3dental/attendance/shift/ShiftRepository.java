package com.v3dental.attendance.shift;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ShiftRepository extends JpaRepository<Shift, Long> {
    List<Shift> findByBranchId(Long branchId);
    List<Shift> findByIsActiveTrue();
}
