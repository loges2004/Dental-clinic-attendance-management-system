# Product Requirements Document (PRD)

## Application Name
**V3 Dental Clinic — Attendance, GPS & Employee Management System**

## Scope & Target Clinic
Single-clinic management application specifically designed for **V3 Dental Clinic**.
Current Branches:
1. **Saibaba Colony**
2. **Kannappa Nagar**

## Key User Roles
- `ADMIN`: Full management of branches, employees, shifts, leave approvals, attendance monitoring, report downloads, and monthly attendance archiving/purging.
- `DOCTOR`: Attendance check-in/out via GPS, leave applications, personal attendance and leave history view.
- `SISTER` (Nurse): Attendance check-in/out via GPS, leave applications, personal attendance and leave history view.
- `OTHER_STAFF`: Attendance check-in/out via GPS, leave applications, personal attendance and leave history view.

## Core Non-Functional & Storage Constraints
- Zero selfie / face recognition requirement in MVP.
- No continuous GPS tracking (location captured ONLY on check-in and check-out).
- Designed for low-storage PostgreSQL free tier (Supabase Free Tier).
- Server timestamp enforcement (`Asia/Kolkata` timezone).
- Monthly report download (PDF/Excel) with explicit monthly attendance purge to preserve small DB size.
