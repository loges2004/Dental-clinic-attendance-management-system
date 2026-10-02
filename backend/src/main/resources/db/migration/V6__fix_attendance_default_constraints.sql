-- Migration V6: Ensure default values and non-null safety for attendance status flags
ALTER TABLE attendance ALTER COLUMN is_early_checkout SET DEFAULT FALSE;
ALTER TABLE attendance ALTER COLUMN is_late SET DEFAULT FALSE;
ALTER TABLE attendance ALTER COLUMN total_work_minutes SET DEFAULT 0;
ALTER TABLE attendance ALTER COLUMN current_session_status SET DEFAULT 'CHECKED_IN';

UPDATE attendance SET is_early_checkout = FALSE WHERE is_early_checkout IS NULL;
UPDATE attendance SET is_late = FALSE WHERE is_late IS NULL;
UPDATE attendance SET total_work_minutes = 0 WHERE total_work_minutes IS NULL;
UPDATE attendance SET current_session_status = 'CHECKED_IN' WHERE current_session_status IS NULL;
