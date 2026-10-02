package com.v3dental.attendance.attendance.regularization;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface AttendanceRegularizationRepository extends JpaRepository<AttendanceRegularizationRequest, Long> {
    List<AttendanceRegularizationRequest> findByEmployeeIdOrderByCreatedAtDesc(Long employeeId);
    List<AttendanceRegularizationRequest> findByStatusOrderByCreatedAtDesc(String status);
    List<AttendanceRegularizationRequest> findAllByOrderByCreatedAtDesc();

    @Modifying
    @Query("DELETE FROM AttendanceRegularizationRequest ar WHERE ar.employee.id = :employeeId")
    void deleteByEmployeeId(@Param("employeeId") Long employeeId);
}
