export type UserRole = 'ADMIN' | 'DOCTOR' | 'SISTER' | 'OTHER_STAFF';

export interface UserDto {
  userId: number;
  employeeId: number | null;
  username: string;
  email: string;
  role: UserRole;
  employeeCode: string | null;
  firstName: string;
  lastName: string;
  designation: string | null;
  department: string | null;
  branchId: number | null;
  branchName: string | null;
  branchCode: string | null;
  monthlyLeaveEntitlement: number | null;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: UserDto;
}

export interface Branch {
  id: number;
  name: string;
  code: string;
  address: string | null;
  latitude: number;
  longitude: number;
  allowedRadiusMeters: number;
  maxGpsAccuracyMeters: number;
  isActive: boolean;
}

export interface Employee {
  id: number;
  user: {
    id: number;
    username: string;
    email: string;
    role: { id: number; name: UserRole };
    isActive: boolean;
  };
  employeeCode: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  designation: string | null;
  department: string | null;
  branch: Branch;
  joiningDate: string;
  isActive: boolean;
  monthlyLeaveEntitlement: number;
}

export interface Shift {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  gracePeriodMinutes: number;
  isActive: boolean;
}

export interface Attendance {
  id: number;
  employee: Employee;
  branch: Branch;
  shift: Shift | null;
  attendanceDate: string;
  checkInAt: string;
  checkInLatitude: number;
  checkInLongitude: number;
  checkInAccuracy: number;
  checkInDistance: number;
  checkOutAt: string | null;
  checkOutLatitude: number | null;
  checkOutLongitude: number | null;
  checkOutAccuracy: number | null;
  checkOutDistance: number | null;
  status: 'PRESENT' | 'LATE' | 'EARLY_CHECKOUT' | 'ABSENT' | 'HALF_DAY' | 'ON_LEAVE';
  isLate: boolean;
  isEarlyCheckout: boolean;
  notes: string | null;
}

export interface LeaveType {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
}

export interface LeavePeriod {
  id: number;
  year: number;
  month: number;
  totalEntitlement: number;
  carriedForward: number;
  used: number;
  pending: number;
  adjusted: number;
  remaining: number;
}

export interface LeaveRequest {
  id: number;
  employee: Employee;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  duration: number;
  durationType: 'FULL_DAY' | 'HALF_DAY';
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  rejectionReason?: string;
  createdAt: string;
}

export interface MonthlyArchiveSummary {
  year: number;
  month: number;
  monthName: string;
  totalEmployeeCount: number;
  totalAttendanceRecords: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  onLeaveCount: number;
  totalDaysInMonth: number;
}
