-- Migration V3: Attendance Regularization & Manual Entry Support
ALTER TABLE attendance ALTER COLUMN check_in_latitude DROP NOT NULL;
ALTER TABLE attendance ALTER COLUMN check_in_longitude DROP NOT NULL;
ALTER TABLE attendance ALTER COLUMN check_in_accuracy DROP NOT NULL;
ALTER TABLE attendance ALTER COLUMN check_in_distance DROP NOT NULL;

CREATE TABLE IF NOT EXISTS attendance_regularization_requests (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    requested_check_in TIME NOT NULL,
    requested_check_out TIME,
    reason TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    rejection_reason TEXT,
    reviewed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
