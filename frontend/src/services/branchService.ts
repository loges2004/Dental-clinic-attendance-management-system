import api from './api';
import type { Branch, Employee } from '../types';

export const branchService = {
  async getAllBranches(): Promise<Branch[]> {
    const res = await api.get<Branch[]>('/branches');
    return res.data;
  },

  async getBranchById(id: number): Promise<Branch> {
    const res = await api.get<Branch>(`/branches/${id}`);
    return res.data;
  },

  async createBranch(data: Partial<Branch>): Promise<Branch> {
    const res = await api.post<Branch>('/branches', data);
    return res.data;
  },

  async updateBranch(id: number, data: Partial<Branch>): Promise<Branch> {
    const res = await api.put<Branch>(`/branches/${id}`, data);
    return res.data;
  },
};

export const employeeService = {
  async getAllEmployees(): Promise<Employee[]> {
    const res = await api.get<Employee[]>('/employees');
    return res.data;
  },

  async getEmployeeById(id: number): Promise<Employee> {
    const res = await api.get<Employee>(`/employees/${id}`);
    return res.data;
  },

  async createEmployee(data: any): Promise<Employee> {
    const res = await api.post<Employee>('/employees', data);
    return res.data;
  },

  async updateEmployee(id: number, data: any): Promise<Employee> {
    const res = await api.put<Employee>(`/employees/${id}`, data);
    return res.data;
  },

  async toggleStatus(id: number, active: boolean): Promise<Employee> {
    const res = await api.patch<Employee>(`/employees/${id}/status`, null, { params: { active } });
    return res.data;
  },

  async deleteEmployee(id: number): Promise<void> {
    await api.delete(`/employees/${id}`);
  },
};
