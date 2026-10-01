import api from './api';
import type { LeaveRequest, LeavePeriod, LeaveType } from '../types';

export const leaveService = {
  async getLeaveTypes(): Promise<LeaveType[]> {
    const res = await api.get<LeaveType[]>('/leave/types');
    return res.data;
  },

  async getMyBalance(): Promise<LeavePeriod> {
    const res = await api.get<LeavePeriod>('/leave/balance');
    return res.data;
  },

  async applyForLeave(data: {
    leaveTypeId: number;
    startDate: string;
    endDate: string;
    duration: number;
    durationType: 'FULL_DAY' | 'HALF_DAY';
    reason: string;
  }): Promise<LeaveRequest> {
    const res = await api.post<LeaveRequest>('/leave/requests', data);
    return res.data;
  },

  async getMyLeaveHistory(): Promise<LeaveRequest[]> {
    const res = await api.get<LeaveRequest[]>('/leave/requests/my');
    return res.data;
  },

  async getAllLeaveRequests(status?: string): Promise<LeaveRequest[]> {
    const res = await api.get<LeaveRequest[]>('/leave/requests', { params: { status } });
    return res.data;
  },

  async approveLeave(id: number): Promise<LeaveRequest> {
    const res = await api.patch<LeaveRequest>(`/leave/requests/${id}/approve`);
    return res.data;
  },

  async rejectLeave(id: number, rejectionReason: string): Promise<LeaveRequest> {
    const res = await api.patch<LeaveRequest>(`/leave/requests/${id}/reject`, { rejectionReason });
    return res.data;
  },

  async adjustLeaveBalance(employeeId: number, amount: number, reason: string): Promise<LeavePeriod> {
    const res = await api.post<LeavePeriod>('/leave/adjustments', { employeeId, amount, reason });
    return res.data;
  },

  async cancelLeaveRequest(id: number): Promise<LeaveRequest> {
    const res = await api.delete<LeaveRequest>(`/leave/requests/${id}`);
    return res.data;
  },
};
