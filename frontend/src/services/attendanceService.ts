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

  async forgotCheckOut(actualCheckOutTime: string, reason?: string, latitude?: number, longitude?: number, accuracy?: number) {
    const res = await api.post<Attendance>('/attendance/forgot-checkout', {
      actualCheckOutTime,
      reason,
      latitude,
      longitude,
      accuracy,
    });
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

  async downloadPdf(year: number, month: number) {
    const res = await api.get('/attendance/archive/export/pdf', {
      params: { year, month },
      responseType: 'blob',
    });
    const blob = new Blob([res.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `V3_Attendance_${year}_${String(month).padStart(2, '0')}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  async downloadExcel(year: number, month: number) {
    const res = await api.get('/attendance/archive/export/excel', {
      params: { year, month },
      responseType: 'blob',
    });
    const blob = new Blob([res.data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `V3_Attendance_${year}_${String(month).padStart(2, '0')}.csv`);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  async deleteMonthlyRecords(year: number, month: number): Promise<{ message: string; deletedRecordsCount: number }> {
    const res = await api.delete('/attendance/archive', {
      params: { year, month },
      data: { confirmText: 'DELETE' },
    });
    return res.data;
  },
};
