package com.v3dental.attendance.attendance;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface AttendanceRepository extends JpaRepository<Attendance, Long> {
    Optional<Attendance> findByEmployeeIdAndAttendanceDate(Long employeeId, LocalDate attendanceDate);
    
    List<Attendance> findByAttendanceDate(LocalDate attendanceDate);
    
    List<Attendance> findByBranchIdAndAttendanceDate(Long branchId, LocalDate attendanceDate);

    List<Attendance> findByEmployeeIdAndAttendanceDateBetweenOrderByAttendanceDateDesc(Long employeeId, LocalDate startDate, LocalDate endDate);

    List<Attendance> findByAttendanceDateBetweenOrderByAttendanceDateDesc(LocalDate startDate, LocalDate endDate);

    List<Attendance> findByBranchIdAndAttendanceDateBetweenOrderByAttendanceDateDesc(Long branchId, LocalDate startDate, LocalDate endDate);

    @Modifying
    @Query("DELETE FROM Attendance a WHERE a.attendanceDate BETWEEN :startDate AND :endDate")
    int deleteByAttendanceDateBetween(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    @Query("SELECT COUNT(a) FROM Attendance a WHERE a.attendanceDate BETWEEN :startDate AND :endDate")
    long countByAttendanceDateBetween(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
}
