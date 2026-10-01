-- V3 Dental Clinic Initial Database Schema Migration
-- Author: V3 Dental Clinic System Architect

-- 1. Roles
CREATE TABLE roles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(255)
);

INSERT INTO roles (name, description) VALUES
('ADMIN', 'Clinic Administrator with full management access'),
('DOCTOR', 'Clinic Doctor'),
('SISTER', 'Clinic Nurse / Sister'),
('OTHER_STAFF', 'Clinic Support & Administrative Staff');

-- 2. Users (Authentication)
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    role_id BIGINT NOT NULL REFERENCES roles(id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Branches (Saibaba Colony & Kannappa Nagar)
CREATE TABLE branches (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    address TEXT,
    latitude NUMERIC(10, 8) NOT NULL,
    longitude NUMERIC(11, 8) NOT NULL,
    allowed_radius_meters NUMERIC(6, 2) NOT NULL DEFAULT 100.00,
    max_gps_accuracy_meters NUMERIC(6, 2) NOT NULL DEFAULT 50.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed V3 Dental Clinic Branches (Coordinates configurable by admin)
INSERT INTO branches (name, code, address, latitude, longitude, allowed_radius_meters, max_gps_accuracy_meters, is_active) VALUES
('Saibaba Colony', 'SBC', 'Saibaba Colony, Coimbatore, Tamil Nadu', 11.02420000, 76.94270000, 100.00, 50.00, TRUE),
('Kannappa Nagar', 'KNP', 'Kannappa Nagar, Rathinapuri, Coimbatore, Tamil Nadu', 11.03780000, 76.96340000, 100.00, 50.00, TRUE);

-- 4. Employees
CREATE TABLE employees (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL REFERENCES users(id),
    employee_code VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    designation VARCHAR(100),
    department VARCHAR(100),
    branch_id BIGINT NOT NULL REFERENCES branches(id),
    joining_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    monthly_leave_entitlement NUMERIC(4, 2) NOT NULL DEFAULT 1.50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Shifts
CREATE TABLE shifts (
    id BIGSERIAL PRIMARY KEY,
    branch_id BIGINT REFERENCES branches(id),
    name VARCHAR(100) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    grace_period_minutes INT NOT NULL DEFAULT 15,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed Default Shifts
INSERT INTO shifts (branch_id, name, start_time, end_time, grace_period_minutes, is_active) VALUES
(1, 'Saibaba Morning Shift', '09:00:00', '18:00:00', 15, TRUE),
(2, 'Kannappa Morning Shift', '09:00:00', '18:00:00', 15, TRUE);

-- 6. Employee Shifts Assignment
CREATE TABLE employee_shifts (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id),
    shift_id BIGINT NOT NULL REFERENCES shifts(id),
    effective_from DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Attendance
CREATE TABLE attendance (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id),
    branch_id BIGINT NOT NULL REFERENCES branches(id),
    shift_id BIGINT REFERENCES shifts(id),
    attendance_date DATE NOT NULL,
    
    check_in_at TIMESTAMP WITH TIME ZONE NOT NULL,
    check_in_latitude NUMERIC(10, 8) NOT NULL,
    check_in_longitude NUMERIC(11, 8) NOT NULL,
    check_in_accuracy NUMERIC(6, 2) NOT NULL,
    check_in_distance NUMERIC(8, 2) NOT NULL,
    
    check_out_at TIMESTAMP WITH TIME ZONE,
    check_out_latitude NUMERIC(10, 8),
    check_out_longitude NUMERIC(11, 8),
    check_out_accuracy NUMERIC(6, 2),
    check_out_distance NUMERIC(8, 2),
    
    status VARCHAR(30) NOT NULL, -- PRESENT, LATE, EARLY_CHECKOUT, ABSENT, HALF_DAY, ON_LEAVE
    is_late BOOLEAN NOT NULL DEFAULT FALSE,
    is_early_checkout BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_employee_attendance_date UNIQUE (employee_id, attendance_date)
);

-- 8. Leave Types
CREATE TABLE leave_types (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO leave_types (code, name, is_active) VALUES
('CASUAL_LEAVE', 'Casual Leave', TRUE),
('SICK_LEAVE', 'Sick Leave', TRUE),
('PERSONAL_LEAVE', 'Personal Leave', TRUE),
('OTHER_LEAVE', 'Other Leave', TRUE);

-- 9. Leave Periods (Monthly balance snapshot)
CREATE TABLE leave_periods (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id),
    year INT NOT NULL,
    month INT NOT NULL,
    total_entitlement NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    carried_forward NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    used NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    pending NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    adjusted NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    remaining NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_employee_leave_period UNIQUE (employee_id, year, month)
);

-- 10. Leave Requests
CREATE TABLE leave_requests (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id),
    leave_type_id BIGINT NOT NULL REFERENCES leave_types(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    duration NUMERIC(4, 2) NOT NULL, -- e.g. 0.5 or 1.0 or 2.0
    duration_type VARCHAR(20) NOT NULL, -- FULL_DAY, HALF_DAY
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, CANCELLED
    approved_by BIGINT REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Leave Ledger Transactions
CREATE TABLE leave_transactions (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id),
    leave_period_id BIGINT NOT NULL REFERENCES leave_periods(id),
    leave_request_id BIGINT REFERENCES leave_requests(id),
    transaction_type VARCHAR(50) NOT NULL, -- LEAVE_ALLOCATION, LEAVE_USED, LEAVE_ADJUSTMENT, LEAVE_REVERSAL, LEAVE_CARRY_FORWARD
    amount NUMERIC(5, 2) NOT NULL,
    reason TEXT,
    created_by BIGINT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Audit Logs
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id BIGINT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Initial Admin User & Sample Staff
-- Passwords BCrypt encoded for:
-- Admin: Admin@V3Dental2026 -> $2a$10$e8gV1S2xR9aV1FqO5xQzU.n2fXkS/6XW9X6h4Y5Gz3m.3.sZ2e
-- Dr. Arun: Doctor@V3Dental -> $2a$10$e8gV1S2xR9aV1FqO5xQzU.n2fXkS/6XW9X6h4Y5Gz3m.3.sZ2e
-- Sister Priya: Sister@V3Dental -> $2a$10$e8gV1S2xR9aV1FqO5xQzU.n2fXkS/6XW9X6h4Y5Gz3m.3.sZ2e
INSERT INTO users (id, username, password_hash, email, role_id, is_active) VALUES
(1, 'admin', '$2a$10$e8gV1S2xR9aV1FqO5xQzU.n2fXkS/6XW9X6h4Y5Gz3m.3.sZ2e', 'admin@v3dental.com', 1, TRUE),
(2, 'dr_arun', '$2a$10$e8gV1S2xR9aV1FqO5xQzU.n2fXkS/6XW9X6h4Y5Gz3m.3.sZ2e', 'arun@v3dental.com', 2, TRUE),
(3, 'sister_priya', '$2a$10$e8gV1S2xR9aV1FqO5xQzU.n2fXkS/6XW9X6h4Y5Gz3m.3.sZ2e', 'priya@v3dental.com', 3, TRUE);

INSERT INTO employees (id, user_id, employee_code, first_name, last_name, phone, designation, department, branch_id, joining_date, is_active, monthly_leave_entitlement) VALUES
(1, 1, 'EMP-001', 'Clinic', 'Admin', '9876543210', 'Chief Administrator', 'Management', 1, '2024-01-01', TRUE, 2.00),
(2, 2, 'EMP-002', 'Arun', 'Kumar', '9876543211', 'Senior Dentist', 'Dentistry', 1, '2024-02-01', TRUE, 1.50),
(3, 3, 'EMP-003', 'Priya', 'Dharshini', '9876543212', 'Head Nurse', 'Nursing', 2, '2024-03-01', TRUE, 2.00);
