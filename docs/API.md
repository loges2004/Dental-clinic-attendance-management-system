# REST API Specifications

## Authentication
- `POST /api/auth/login` (Body: `{ username, password }`)
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/me`

## Branches
- `GET /api/branches`
- `POST /api/branches`
- `GET /api/branches/{id}`
- `PUT /api/branches/{id}`

## Employees
- `GET /api/employees`
- `POST /api/employees`
- `GET /api/employees/{id}`
- `PUT /api/employees/{id}`

## Attendance
- `POST /api/attendance/check-in` (Body: `{ latitude, longitude, accuracy }`)
- `POST /api/attendance/check-out` (Body: `{ latitude, longitude, accuracy }`)
- `GET /api/attendance/today`
- `GET /api/attendance/history`

## Leave
- `POST /api/leave/requests`
- `GET /api/leave/balance`
- `PATCH /api/leave/requests/{id}/approve`
- `PATCH /api/leave/requests/{id}/reject`
- `POST /api/leave/adjustments`

## Archive & Export
- `GET /api/attendance/archive?year=YYYY&month=MM`
- `GET /api/attendance/archive/export/pdf?year=YYYY&month=MM`
- `GET /api/attendance/archive/export/excel?year=YYYY&month=MM`
- `DELETE /api/attendance/archive?year=YYYY&month=MM` (Admin only)
