package com.v3dental.attendance.leave;

import com.v3dental.attendance.employee.Employee;
import com.v3dental.attendance.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class LeaveBalanceService {

    private final LeavePeriodRepository leavePeriodRepository;
    private final LeaveTransactionRepository leaveTransactionRepository;

    @Transactional
    public LeavePeriod getOrCreateCurrentPeriod(Employee employee, int year, int month) {
        Optional<LeavePeriod> periodOpt = leavePeriodRepository.findByEmployeeIdAndYearAndMonth(employee.getId(), year, month);
        if (periodOpt.isPresent()) {
            return periodOpt.get();
        }

        BigDecimal entitlement = employee.getMonthlyLeaveEntitlement();
        BigDecimal carried = BigDecimal.ZERO;

        LeavePeriod newPeriod = LeavePeriod.builder()
            .employee(employee)
            .year(year)
            .month(month)
            .totalEntitlement(entitlement)
            .carriedForward(carried)
            .used(BigDecimal.ZERO)
            .pending(BigDecimal.ZERO)
            .adjusted(BigDecimal.ZERO)
            .remaining(entitlement.add(carried))
            .build();

        return leavePeriodRepository.save(newPeriod);
    }

    @Transactional
    public void recordTransaction(Employee employee, LeavePeriod period, LeaveRequest request, String type, BigDecimal amount, String reason, User createdBy) {
        LeaveTransaction transaction = LeaveTransaction.builder()
            .employee(employee)
            .leavePeriod(period)
            .leaveRequest(request)
            .transactionType(type)
            .amount(amount)
            .reason(reason)
            .createdBy(createdBy)
            .build();

        leaveTransactionRepository.save(transaction);

        // Update LeavePeriod balances according to ledger math
        if ("LEAVE_USED".equals(type)) {
            period.setUsed(period.getUsed().add(amount));
        } else if ("LEAVE_ADJUSTMENT".equals(type)) {
            period.setAdjusted(period.getAdjusted().add(amount));
        } else if ("LEAVE_REVERSAL".equals(type)) {
            period.setUsed(period.getUsed().subtract(amount));
        }

        // Available = Entitlement + CarriedForward + Adjustments - Used
        BigDecimal remaining = period.getTotalEntitlement()
            .add(period.getCarriedForward())
            .add(period.getAdjusted())
            .subtract(period.getUsed());

        period.setRemaining(remaining);
        leavePeriodRepository.save(period);
    }
}
