-- Migration V8: Auto-Checkout and Suspicious Session Flags
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS is_auto_checkout BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS is_suspicious BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS suspicious_reason VARCHAR(255);

ALTER TABLE attendance_punch_sessions ADD COLUMN IF NOT EXISTS is_auto_checkout BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE attendance_punch_sessions ADD COLUMN IF NOT EXISTS is_suspicious BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE attendance_punch_sessions ADD COLUMN IF NOT EXISTS suspicious_reason VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_attendance_suspicious ON attendance(is_suspicious);
CREATE INDEX IF NOT EXISTS idx_attendance_current_session_status ON attendance(current_session_status);
