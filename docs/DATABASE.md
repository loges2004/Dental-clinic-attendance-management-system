# Database Specification & Schema Properties Guide — V3 Dental Clinic

This document details the exact PostgreSQL database architecture, schema properties, table specifications, and environment variable requirements for the **V3 Dental Clinic Attendance & Employee Management System**.

---

## 1. Database Overview & Engine

- **Engine**: PostgreSQL 15+ (Compatible with local Docker PostgreSQL and Supabase Free Tier).
- **Migration Tool**: Flyway 9+ (Auto-executes on backend startup).
- **Timezone**: `Asia/Kolkata` (UTC+05:30) for all timestamp columns.
- **Default Database Name**: `v3_dental_attendance`
- **Default Port**: `5432`

---

## 2. Environment Variables & Connection Properties

Below is the complete list of all database and application environment variables required to run the system:

| Environment Variable | Description | Default / Example Value | Used By |
| :--- | :--- | :--- | :--- |
| `POSTGRES_DB` | PostgreSQL Database Name | `v3_dental_attendance` | Docker Compose / Database |
| `POSTGRES_USER` | Database Master Username | `v3_clinic_user` | Docker Compose / Database |
| `POSTGRES_PASSWORD` | Database Master Password | `v3_clinic_secure_pass_2026` | Docker Compose / Database |
| `POSTGRES_PORT` | PostgreSQL Exposed Port | `5432` | Docker Compose |
| `DATABASE_URL` | JDBC Connection URL | `jdbc:postgresql://localhost:5432/v3_dental_attendance` | Spring Boot Backend |
| `DATABASE_USERNAME` | Spring Data DB Username | `v3_clinic_user` | Spring Boot Backend |
| `DATABASE_PASSWORD` | Spring Data DB Password | `v3_clinic_secure_pass_2026` | Spring Boot Backend |
| `SERVER_PORT` | Backend HTTP Port | `8080` | Spring Boot Backend |
| `SPRING_PROFILES_ACTIVE` | Active Spring Profile | `dev` / `prod` | Spring Boot Backend |
| `JWT_SECRET` | 64-char Hex Secret for JWT Tokens | `404E635266556A5...` | Spring Security Auth |
| `JWT_ACCESS_EXPIRATION_MS` | Access Token TTL (ms) | `900000` (15 mins) | Auth Engine |
| `JWT_REFRESH_EXPIRATION_MS` | Refresh Token TTL (ms) | `604800000` (7 days) | Auth Engine |
| `CORS_ALLOWED_ORIGINS` | Allowed Frontend URLs | `http://localhost:5173,http://localhost:3000` | Security Policy |
| `APP_TIMEZONE` | Clinic Application Timezone | `Asia/Kolkata` | System Scheduler & Calculations |
| `VITE_API_BASE_URL` | API Endpoint Base URL | `http://localhost:8080/api` | React Frontend |

---

## 3. Comprehensive Entity & Table Properties

### 3.1 `roles` Table
Stores role-based permissions (`ADMIN`, `DOCTOR`, `SISTER`, `OTHER_STAFF`).

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `BIGSERIAL` | `PRIMARY KEY` | Unique role ID |
| `name` | `VARCHAR(50)` | `UNIQUE, NOT NULL` | Role identifier (e.g. `ADMIN`) |
| `description` | `VARCHAR(255)` | Nullable | Human-readable role description |

---

### 3.2 `users` Table
Handles user credentials and authentication status.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `BIGSERIAL` | `PRIMARY KEY` | Unique user ID |
| `username` | `VARCHAR(100)` | `UNIQUE, NOT NULL` | Login username |
| `password_hash` | `VARCHAR(255)` | `NOT NULL` | BCrypt encrypted password hash |
| `email` | `VARCHAR(150)` | `UNIQUE, NOT NULL` | User email address |
| `role_id` | `BIGINT` | `FOREIGN KEY (roles.id)` | Role reference |
| `is_active` | `BOOLEAN` | `DEFAULT TRUE` | Active/Disabled account status |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT CURRENT_TIMESTAMP` | Account creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `DEFAULT CURRENT_TIMESTAMP` | Account last update timestamp |

---

### 3.3 `branches` Table
Stores branch office metadata and GPS geofencing coordinates.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `BIGSERIAL` | `PRIMARY KEY` | Unique branch ID |
| `name` | `VARCHAR(100)` | `NOT NULL` | Branch name (`Saibaba Colony`, `Kannappa Nagar`) |
| `code` | `VARCHAR(50)` | `UNIQUE, NOT NULL` | Branch shortcode (`SBC`, `KNP`) |
| `address` | `TEXT` | Nullable | Street address |
| `latitude` | `NUMERIC(10,8)` | `NOT NULL` | Clinic latitude center point |
| `longitude` | `NUMERIC(11,8)` | `NOT NULL` | Clinic longitude center point |
| `allowed_radius_meters` | `NUMERIC(6,2)` | `DEFAULT 100.00` | Max distance allowed for check-in (meters) |
| `max_gps_accuracy_meters` | `NUMERIC(6,2)` | `DEFAULT 50.00` | Max allowed mobile device GPS margin error |
| `is_active` | `BOOLEAN` | `DEFAULT TRUE` | Active branch flag |

---

### 3.4 `employees` Table
Stores employee profile details and leave entitlement settings.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `BIGSERIAL` | `PRIMARY KEY` | Unique employee ID |
| `user_id` | `BIGINT` | `UNIQUE, FK (users.id)` | Linked user auth ID |
| `employee_code` | `VARCHAR(50)` | `UNIQUE, NOT NULL` | Employee code (e.g. `EMP-001`) |
| `first_name` | `VARCHAR(100)` | `NOT NULL` | First name |
| `last_name` | `VARCHAR(100)` | `NOT NULL` | Last name |
| `phone` | `VARCHAR(20)` | Nullable | Contact phone number |
| `designation` | `VARCHAR(100)` | Nullable | Job title (e.g. `Head Nurse`) |
| `department` | `VARCHAR(100)` | Nullable | Department (`Nursing`, `Dentistry`) |
| `branch_id` | `BIGINT` | `FK (branches.id)` | Assigned primary branch |
| `joining_date` | `DATE` | `NOT NULL` | Employment start date |
| `is_active` | `BOOLEAN` | `DEFAULT TRUE` | Employment status |
| `monthly_leave_entitlement`| `NUMERIC(4,2)`| `DEFAULT 1.50` | Monthly leave accrued (e.g. 1.5 days) |

---

### 3.5 `shifts` Table
Defines working time windows and grace periods per branch.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `BIGSERIAL` | `PRIMARY KEY` | Unique shift ID |
| `branch_id` | `BIGINT` | `FK (branches.id)` | Target branch |
| `name` | `VARCHAR(100)` | `NOT NULL` | Shift name (e.g. `Saibaba Morning Shift`) |
| `start_time` | `TIME` | `NOT NULL` | Shift start time (e.g. `09:00:00`) |
| `end_time` | `TIME` | `NOT NULL` | Shift end time (e.g. `18:00:00`) |
| `grace_period_minutes` | `INT` | `DEFAULT 15` | Minutes allowed before marked `LATE` |
| `is_active` | `BOOLEAN` | `DEFAULT TRUE` | Active shift flag |

---

### 3.6 `attendance` Table
Primary ledger for daily mobile attendance check-in & check-out logs with GPS telemetry.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `BIGSERIAL` | `PRIMARY KEY` | Unique attendance record ID |
| `employee_id` | `BIGINT` | `FK (employees.id)` | Employee ID |
| `branch_id` | `BIGINT` | `FK (branches.id)` | Branch ID where check-in occurred |
| `shift_id` | `BIGINT` | `FK (shifts.id)` | Assigned shift ID |
| `attendance_date` | `DATE` | `NOT NULL` | Attendance date (`YYYY-MM-DD`) |
| `check_in_at` | `TIMESTAMPTZ` | `NOT NULL` | Check-in timestamp |
| `check_in_latitude` | `NUMERIC(10,8)` | `NOT NULL` | Check-in device latitude |
| `check_in_longitude` | `NUMERIC(11,8)` | `NOT NULL` | Check-in device longitude |
| `check_in_accuracy` | `NUMERIC(6,2)` | `NOT NULL` | Device GPS accuracy (meters) |
| `check_in_distance` | `NUMERIC(8,2)` | `NOT NULL` | Distance from branch center (meters) |
| `check_out_at` | `TIMESTAMPTZ` | Nullable | Check-out timestamp |
| `check_out_latitude` | `NUMERIC(10,8)` | Nullable | Check-out device latitude |
| `check_out_longitude` | `NUMERIC(11,8)` | Nullable | Check-out device longitude |
| `check_out_accuracy` | `NUMERIC(6,2)` | Nullable | Device GPS accuracy (meters) |
| `check_out_distance` | `NUMERIC(8,2)` | Nullable | Distance from branch center (meters) |
| `status` | `VARCHAR(30)` | `NOT NULL` | `PRESENT`, `LATE`, `EARLY_CHECKOUT`, `HALF_DAY`, `ON_LEAVE` |
| `is_late` | `BOOLEAN` | `DEFAULT FALSE` | Late status flag |
| `is_early_checkout` | `BOOLEAN` | `DEFAULT FALSE` | Early checkout status flag |
| `notes` | `TEXT` | Nullable | Employee or admin notes |

---

### 3.7 `leave_periods` & `leave_transactions` Tables
Tracks monthly employee leave snapshots and transactional balance adjustments (additions, deductions, carry forward).

---

## 4. Indexing Strategy for Performance Optimization

1. **`attendance(employee_id, attendance_date)`**: `UNIQUE` index ensuring one daily record per employee while accelerating employee monthly timeline queries.
2. **`attendance(branch_id, attendance_date)`**: Index enabling instant daily attendance summary calculations for branch managers.
3. **`leave_periods(employee_id, year, month)`**: `UNIQUE` composite index providing fast O(1) balance retrieval for leave applications.
4. **`leave_requests(employee_id, status)`**: Index powering the quick-filtering pending leave request queue in the admin dashboard.
