import api from './api';
import type { Attendance, MonthlyArchiveSummary } from '../types';

export const attendanceService = {
  async checkIn(latitude: number, longitude: number, accuracy: number) {
    const res = await api.post<Attendance>('/attendance/check-in', { latitude, longitude, accuracy });
    return res.data;
  },

  async checkOut(latitude: number, longitude: number, accuracy: number) {
    const res = await api.post<Attendance>('/attendance/check-out', { latitude, longitude, accuracy });
    return res.data;
  },

  async getToday(): Promise<Attendance | null> {
    try {
      const res = await api.get<Attendance>('/attendance/today');
      return res.data;
    } catch (err: any) {
      if (err.response?.status === 204) return null;
      throw err;
    }
  },

  async getHistory(params?: { startDate?: string; endDate?: string; branchId?: number; employeeId?: number }) {
    const res = await api.get<Attendance[]>('/attendance/history', { params });
    return res.data;
  },

  async getArchiveSummary(year: number, month: number): Promise<MonthlyArchiveSummary> {
    const res = await api.get<MonthlyArchiveSummary>('/attendance/archive', { params: { year, month } });
    return res.data;
  },

  downloadPdf(year: number, month: number) {
    window.open(`/api/attendance/archive/export/pdf?year=${year}&month=${month}`, '_blank');
  },

  downloadExcel(year: number, month: number) {
    window.open(`/api/attendance/archive/export/excel?year=${year}&month=${month}`, '_blank');
  },

  async deleteMonthlyRecords(year: number, month: number): Promise<{ message: string; deletedRecordsCount: number }> {
    const res = await api.delete('/attendance/archive', {
      params: { year, month },
      data: { confirmText: 'DELETE' },
    });
    return res.data;
  },
};
