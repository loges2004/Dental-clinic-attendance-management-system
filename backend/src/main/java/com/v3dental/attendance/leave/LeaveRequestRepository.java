package com.v3dental.attendance.leave;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;

public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, Long> {
    List<LeaveRequest> findByEmployeeIdOrderByCreatedAtDesc(Long employeeId);
    List<LeaveRequest> findByStatusOrderByCreatedAtDesc(String status);
    List<LeaveRequest> findAllByOrderByCreatedAtDesc();

    @Query("SELECT lr FROM LeaveRequest lr WHERE lr.employee.id = :employeeId AND lr.status = 'APPROVED' AND :checkDate BETWEEN lr.startDate AND lr.endDate")
    List<LeaveRequest> findApprovedLeaveOnDate(@Param("employeeId") Long employeeId, @Param("checkDate") LocalDate checkDate);

    @Query("SELECT lr FROM LeaveRequest lr WHERE lr.status = 'APPROVED' AND :checkDate BETWEEN lr.startDate AND lr.endDate")
    List<LeaveRequest> findAllApprovedLeavesOnDate(@Param("checkDate") LocalDate checkDate);

    @Modifying
    @Query("DELETE FROM LeaveRequest lr WHERE lr.employee.id = :employeeId")
    void deleteByEmployeeId(@Param("employeeId") Long employeeId);
}
