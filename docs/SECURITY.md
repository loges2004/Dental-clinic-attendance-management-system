# Security Architecture

## Highlights
- **JWT + Refresh Token Cookie**: Short-lived JWT (15 mins) + HttpOnly SameSite secure refresh cookie.
- **BCrypt Password Hashing**: Strong default cost factor.
- **Role-Based Authorization**: `@PreAuthorize("hasRole('ADMIN')")` guarding branch management, employee modifications, leave approvals, and monthly attendance purging.
- **Audit Logs**: Every administrative and attendance alteration is saved to an immutable `audit_logs` table.
