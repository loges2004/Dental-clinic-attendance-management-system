package com.v3dental.attendance.leave;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface LeavePeriodRepository extends JpaRepository<LeavePeriod, Long> {
    Optional<LeavePeriod> findByEmployeeIdAndYearAndMonth(Long employeeId, Integer year, Integer month);
    List<LeavePeriod> findByYearAndMonth(Integer year, Integer month);
}
