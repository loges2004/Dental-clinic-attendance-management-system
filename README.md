# V3 Dental Clinic — Attendance, GPS & Employee Management System

A production-quality, lightweight attendance, GPS geofence verification, and leave management web application built specifically for **V3 Dental Clinic** (Saibaba Colony & Kannappa Nagar branches).

---

## Key Features

- 📍 **GPS Geofenced Attendance**: Validates location & GPS accuracy during check-in/check-out.
- 🏢 **Multi-Branch Support**: Manages Saibaba Colony & Kannappa Nagar branches from a single admin panel.
- 👥 **Role-Based Access**: Role management for `ADMIN`, `DOCTOR`, `SISTER`, and `OTHER_STAFF`.
- 📅 **Monthly Leave & Ledger**: Entitlement tracking per employee with decimal support (0.5 half-days), ledger transaction logging, and pending/approved leave handling.
- 📦 **Low DB Footprint & Monthly Archiving**: Safe PDF/Excel monthly report export with scoped attendance history cleanup.
- 📱 **Installable PWA**: Responsive React PWA for mobile & desktop staff attendance verification.

---

## Tech Stack

- **Backend**: Java 21/25, Spring Boot 3, Spring Security, Spring Data JPA, Hibernate, PostgreSQL, Flyway, JWT, Lombok.
- **Frontend**: React 18, TypeScript, Vite, TanStack Query, Axios, Lucide Icons, Vanilla CSS design tokens.
- **Database**: PostgreSQL (Docker for local, Supabase Free Tier for production).
- **Tooling**: Docker Compose, Maven.

---

## Documentation

Comprehensive documentation can be found in the [`docs/`](./docs/) directory:
- [Product Requirements](./docs/PRODUCT_REQUIREMENTS.md)
- [Architecture Overview](./docs/ARCHITECTURE.md)
- [Database & Schemas](./docs/DATABASE.md)
- [API Specifications](./docs/API.md)
- [Security Model](./docs/SECURITY.md)
- [GPS & Attendance Engine](./docs/ATTENDANCE.md)
- [Leave Ledger Management](./docs/LEAVE_MANAGEMENT.md)
- [Monthly Archiving & Purging](./docs/ATTENDANCE_ARCHIVE.md)
- [Local Development Setup](./docs/LOCAL_SETUP.md)
- [Free-Tier Deployment Guide](./docs/DEPLOYMENT.md)

---

## Quick Start (Local Development)

### 1. Prerequisites
- Docker & Docker Compose
- JDK 21 or later
- Node.js 18 or later
- Maven

### 2. Run Database
```bash
docker-compose up -d
```

### 3. Start Backend
```bash
cd backend
mvn spring-boot:run
```

### 4. Start Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## License
Proprietary — Built exclusively for V3 Dental Clinic.
