package com.v3dental.attendance.attendance;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class AttendanceSchedulerService {

    private final AttendanceService attendanceService;

    /**
     * Periodically check for expired or abandoned open punch sessions every 15 minutes.
     * Automatically checks out sessions that have exceeded shift end time (+45m grace)
     * or maximum continuous session limit (8 hours) to prevent "ghost hours".
     */
    @Scheduled(cron = "0 */15 * * * *")
    public void runPeriodicAutoCheckout() {
        try {
            log.debug("Running periodic auto-checkout inspection for open attendance sessions...");
            attendanceService.autoCheckoutExpiredSessions();
        } catch (Exception e) {
            log.error("Failed to execute periodic auto-checkout: {}", e.getMessage(), e);
        }
    }

    /**
     * Daily cleanup at 23:55 to ensure any remaining open sessions from today
     * are cleanly closed before the day rolls over.
     */
    @Scheduled(cron = "0 55 23 * * *")
    public void runEndOfDayAutoCheckout() {
        try {
            log.info("Running end-of-day auto-checkout cleanup for remaining open sessions...");
            attendanceService.autoCheckoutEndOfDay();
        } catch (Exception e) {
            log.error("Failed to execute end-of-day auto-checkout: {}", e.getMessage(), e);
        }
    }
}
