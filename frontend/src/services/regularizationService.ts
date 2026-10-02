import api from './api';
import type { AttendanceRegularizationRequest, RegularizationApplyDto, ManualAttendanceEntryDto, Attendance } from '../types';

export const regularizationService = {
  async apply(data: RegularizationApplyDto): Promise<AttendanceRegularizationRequest> {
    const res = await api.post<AttendanceRegularizationRequest>('/attendance/regularization/apply', data);
    return res.data;
  },

  async getMyRequests(): Promise<AttendanceRegularizationRequest[]> {
    const res = await api.get<AttendanceRegularizationRequest[]>('/attendance/regularization/my');
    return res.data;
  },

  async getAllRequests(status?: string): Promise<AttendanceRegularizationRequest[]> {
    const res = await api.get<AttendanceRegularizationRequest[]>('/attendance/regularization/all', {
      params: status ? { status } : {},
    });
    return res.data;
  },

  async approve(id: number): Promise<AttendanceRegularizationRequest> {
    const res = await api.post<AttendanceRegularizationRequest>(`/attendance/regularization/${id}/approve`);
    return res.data;
  },

  async reject(id: number, reason: string): Promise<AttendanceRegularizationRequest> {
    const res = await api.post<AttendanceRegularizationRequest>(`/attendance/regularization/${id}/reject`, { reason });
    return res.data;
  },

  async createManualAttendance(data: ManualAttendanceEntryDto): Promise<Attendance> {
    const res = await api.post<Attendance>('/attendance/regularization/manual-entry', data);
    return res.data;
  },
};
