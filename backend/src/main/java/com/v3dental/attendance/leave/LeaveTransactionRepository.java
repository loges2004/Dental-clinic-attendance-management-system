package com.v3dental.attendance.leave;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface LeaveTransactionRepository extends JpaRepository<LeaveTransaction, Long> {
    List<LeaveTransaction> findByEmployeeIdOrderByCreatedAtDesc(Long employeeId);

    @Modifying
    @Query("DELETE FROM LeaveTransaction lt WHERE lt.employee.id = :employeeId OR (lt.createdBy IS NOT NULL AND lt.createdBy.id = :userId)")
    void deleteByEmployeeIdOrCreatedById(@Param("employeeId") Long employeeId, @Param("userId") Long userId);
}
