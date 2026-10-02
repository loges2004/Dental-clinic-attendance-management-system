package com.v3dental.attendance.attendance;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AttendancePunchSessionRepository extends JpaRepository<AttendancePunchSession, Long> {
    List<AttendancePunchSession> findByAttendanceIdOrderBySessionNumberAsc(Long attendanceId);
    Optional<AttendancePunchSession> findFirstByAttendanceIdAndCheckOutAtIsNullOrderBySessionNumberDesc(Long attendanceId);
}
