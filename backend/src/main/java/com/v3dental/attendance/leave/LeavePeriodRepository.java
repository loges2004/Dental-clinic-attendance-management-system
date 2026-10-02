package com.v3dental.attendance.leave;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface LeavePeriodRepository extends JpaRepository<LeavePeriod, Long> {
    Optional<LeavePeriod> findByEmployeeIdAndYearAndMonth(Long employeeId, Integer year, Integer month);
    List<LeavePeriod> findByYearAndMonth(Integer year, Integer month);

    @Modifying
    @Query("DELETE FROM LeavePeriod lp WHERE lp.employee.id = :employeeId")
    void deleteByEmployeeId(@Param("employeeId") Long employeeId);
}
