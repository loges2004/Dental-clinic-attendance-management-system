# Architecture Overview

## Architecture Overview
The system follows a clean package-by-feature modular monolith pattern in Spring Boot, with a decoupled React TypeScript PWA frontend.

```text
+-------------------------------------------------------+
|                    React PWA Client                   |
|       (Vite, TypeScript, React Query, Axios)          |
+-------------------------------------------------------+
                           |
                     HTTPS / JSON REST
                           v
+-------------------------------------------------------+
|                 Spring Boot 3 Backend                 |
|  - Spring Security (JWT Access & HttpOnly Cookie)     |
|  - Package-by-Feature (auth, employee, attendance,    |
|    leave, branch, shift, report, audit)               |
|  - Haversine Geofence Engine                          |
|  - Leave Ledger Engine                                |
+-------------------------------------------------------+
                           |
                      Spring Data JPA
                           v
+-------------------------------------------------------+
|                 PostgreSQL Database                   |
|   (Flyway Migrations, Indexed Query Patterns)         |
+-------------------------------------------------------+
```

## Modular Backend Structure
```text
com.v3dental.attendance
 ├── auth          # Login, JWT, Refresh Tokens, Password Encoder
 ├── user          # User credentials & Roles
 ├── employee      # Staff management & monthly entitlement
 ├── branch        # Geofence location (lat, lng, radius, accuracy)
 ├── shift         # Shift times, grace period, late thresholds
 ├── attendance    # GPS Check-in/out engine & status calculator
 ├── location      # Haversine distance calculator & anti-spoofing
 ├── leave         # Monthly ledger engine, approval flows, adjustments
 ├── report        # Daily/Weekly/Monthly aggregations & exports
 ├── audit         # Immutable audit logging
 └── common        # DTOs, Exception handlers, Utilities
```
