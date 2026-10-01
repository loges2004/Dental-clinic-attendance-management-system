package com.v3dental.attendance.leave;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface LeaveTransactionRepository extends JpaRepository<LeaveTransaction, Long> {
    List<LeaveTransaction> findByEmployeeIdOrderByCreatedAtDesc(Long employeeId);
}
