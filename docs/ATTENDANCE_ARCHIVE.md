# Monthly Attendance Archive & Data Retention

## Purpose
To maintain low database storage consumption on Supabase PostgreSQL free tier, the system allows the Admin to archive and safely delete attendance records month-by-month.

## Safety Workflow
1. Select Year & Month (e.g. `September 2026`).
2. Generate & Download PDF Monthly Attendance Report.
3. Generate & Download Excel/CSV Monthly Attendance Data.
4. Trigger Delete Action -> Confirmation Modal requires explicit user confirmation.
5. Scoped SQL Deletion (`DELETE FROM attendance WHERE attendance_date BETWEEN ...`).
6. Employees, Branches, Shifts, Leave Records, and Audit Logs are strictly PRESERVED.
