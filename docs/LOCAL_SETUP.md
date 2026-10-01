# Local Setup & Environment Properties Guide — V3 Dental Clinic

This document provides a step-by-step walkthrough to set up, configure, run, and test the **V3 Dental Clinic Attendance Management System** locally.

---

## 1. System Requirements

- **Java JDK**: JDK 21 or JDK 25 installed and configured in `PATH`.
- **Node.js**: Node 18+ & npm.
- **Maven**: Maven 3.8+.
- **Docker & Docker Compose**: For running PostgreSQL database locally.

---

## 2. Environment Setup (Step-by-Step)

### Step 1: Clone / Navigate to Project Directory
```bash
cd "e:\OneDrive\Documents\Dental clinic attendance management system"
```

### Step 2: Configure Environment Variables
Copy `.env.example` to create `.env`:
```bash
copy .env.example .env
```

Review and configure `.env` variables if needed:
```env
# Database Settings
POSTGRES_DB=v3_dental_attendance
POSTGRES_USER=v3_clinic_user
POSTGRES_PASSWORD=v3_clinic_secure_pass_2026
POSTGRES_PORT=5432

# Backend Connection String (read by Spring Boot)
DATABASE_URL=jdbc:postgresql://localhost:5432/v3_dental_attendance
DATABASE_USERNAME=v3_clinic_user
DATABASE_PASSWORD=v3_clinic_secure_pass_2026

# Backend Server Port
SERVER_PORT=8080

# Security (JWT Secret key - 64 hex characters)
JWT_SECRET=404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970
JWT_ACCESS_EXPIRATION_MS=900000
JWT_REFRESH_EXPIRATION_MS=604800000

# Application Timezone
APP_TIMEZONE=Asia/Kolkata
```

---

## 3. Step-by-Step Execution

### Step 1: Start PostgreSQL Database Container
Run Docker Compose in the project root:
```bash
docker-compose up -d
```
*This starts PostgreSQL on port `5432` with database `v3_dental_attendance`.*

### Step 2: Start Backend (Spring Boot)
Open a terminal in `backend/`:
```bash
cd backend
mvn spring-boot:run
```
*Flyway automatically creates all database tables and seeds initial clinic data (Admin, Doctors, Nurses, Branches, Shifts).*

### Step 3: Start Frontend (React PWA Mobile UI)
Open a terminal in `frontend/`:
```bash
cd frontend
npm install
npm run dev
```
*Access the Web Application at `http://localhost:5173`.*

---

## 4. Mobile Screen & Attendance Testing

Since attendance is primarily checked in from mobile devices:

1. **Browser Mobile View (Chrome / Edge DevTools)**:
   - Press `F12` or `Ctrl+Shift+I` to open Developer Tools.
   - Click the **Device Toolbar Icon** (`Ctrl+Shift+M`) to toggle mobile screen mode.
   - Select iPhone 14 Pro / Pixel 7 / Mobile S/M/L screen size.
   - Notice the bottom mobile navigation bar (`Attendance`, `Dashboard`, `Leaves`, `Profile`).

2. **Mobile Device Geolocation Emulation**:
   - In DevTools, open `More tools` -> `Sensors`.
   - Set custom location to **Saibaba Colony** (`11.0242`, `76.9427`) or **Kannappa Nagar** (`11.0378`, `76.9634`).
   - Click **Check In** to verify real-time GPS geofence validation!

---

## 5. Default Login Credentials

| Role | Username | Password | Default Branch |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `Admin@V3Dental2026` | Saibaba Colony |
| **Doctor** | `dr_arun` | `Doctor@V3Dental` | Saibaba Colony |
| **Sister / Nurse** | `sister_priya` | `Sister@V3Dental` | Kannappa Nagar |
