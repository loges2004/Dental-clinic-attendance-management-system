-- Migration V4: Multiple Attendance Sessions and Daily Working Hours Calculation
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS total_work_minutes INT NOT NULL DEFAULT 0;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS current_session_status VARCHAR(20) NOT NULL DEFAULT 'CHECKED_IN';

CREATE TABLE IF NOT EXISTS attendance_punch_sessions (
    id BIGSERIAL PRIMARY KEY,
    attendance_id BIGINT NOT NULL REFERENCES attendance(id) ON DELETE CASCADE,
    session_number INT NOT NULL DEFAULT 1,
    check_in_at TIMESTAMP WITH TIME ZONE NOT NULL,
    check_in_latitude NUMERIC(10,8),
    check_in_longitude NUMERIC(11,8),
    check_in_accuracy NUMERIC(6,2),
    check_in_distance NUMERIC(8,2),
    check_out_at TIMESTAMP WITH TIME ZONE,
    check_out_latitude NUMERIC(10,8),
    check_out_longitude NUMERIC(11,8),
    check_out_accuracy NUMERIC(6,2),
    check_out_distance NUMERIC(8,2),
    duration_minutes INT DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_punch_sessions_attendance ON attendance_punch_sessions(attendance_id);

-- Backfill initial session for existing attendance records
INSERT INTO attendance_punch_sessions (
    attendance_id,
    session_number,
    check_in_at,
    check_in_latitude,
    check_in_longitude,
    check_in_accuracy,
    check_in_distance,
    check_out_at,
    check_out_latitude,
    check_out_longitude,
    check_out_accuracy,
    check_out_distance,
    duration_minutes,
    notes,
    created_at
)
SELECT
    a.id,
    1,
    a.check_in_at,
    a.check_in_latitude,
    a.check_in_longitude,
    a.check_in_accuracy,
    a.check_in_distance,
    a.check_out_at,
    a.check_out_latitude,
    a.check_out_longitude,
    a.check_out_accuracy,
    a.check_out_distance,
    CASE 
        WHEN a.check_out_at IS NOT NULL THEN GREATEST(0, (EXTRACT(EPOCH FROM (a.check_out_at - a.check_in_at)) / 60)::INT)
        ELSE 0
    END,
    a.notes,
    COALESCE(a.created_at, CURRENT_TIMESTAMP)
FROM attendance a
WHERE NOT EXISTS (
    SELECT 1 FROM attendance_punch_sessions ps WHERE ps.attendance_id = a.id
);

-- Update cumulative total_work_minutes & current_session_status on attendance master table
UPDATE attendance a
SET 
    total_work_minutes = COALESCE((
        SELECT SUM(ps.duration_minutes) 
        FROM attendance_punch_sessions ps 
        WHERE ps.attendance_id = a.id AND ps.duration_minutes IS NOT NULL
    ), 0),
    current_session_status = CASE WHEN a.check_out_at IS NOT NULL THEN 'CHECKED_OUT' ELSE 'CHECKED_IN' END;
