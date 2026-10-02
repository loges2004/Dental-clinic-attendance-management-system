import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { branchService } from '../../services/branchService';
import { employeeService } from '../../services/branchService';
import { Users, Plus, Pencil, Trash2, X } from 'lucide-react';
import type { Employee } from '../../types';

function roleBadge(role: string) {
  const map: Record<string, string> = {
    ADMIN: 'badge-violet', DOCTOR: 'badge-cyan',
    SISTER: 'badge-emerald', OTHER_STAFF: 'badge-gray',
  };
  return <span className={`badge ${map[role] || 'badge-gray'}`}>{role.replace('_', ' ')}</span>;
}

const EMPTY_FORM = {
  username: '', password: '', email: '', roleName: 'DOCTOR',
  employeeCode: '', firstName: '', lastName: '', phone: '',
  designation: '', department: '', branchId: '', joiningDate: '',
  monthlyLeaveEntitlement: '1.5',
};

export default function EmployeesPage() {
  const queryClient = useQueryClient();

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [editEmp, setEditEmp] = useState<Employee | null>(null);
  const [editForm, setEditForm] = useState({
    firstName: '', lastName: '', phone: '', designation: '',
    department: '', branchId: '', monthlyLeaveEntitlement: '', email: '',
  });
  const [editMsg, setEditMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);

  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeeService.getAllEmployees(),
  });
  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchService.getAllBranches(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => employeeService.createEmployee(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setFormMsg({ type: 'success', text: '\u2713 Employee added successfully!' });
      setForm({ ...EMPTY_FORM });
    },
    onError: (err: any) => {
      setFormMsg({ type: 'error', text: err.response?.data?.message || 'Failed to create employee' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => employeeService.updateEmployee(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setEditMsg({ type: 'success', text: '\u2713 Updated successfully!' });
      setTimeout(() => setEditEmp(null), 800);
    },
    onError: (err: any) => {
      setEditMsg({ type: 'error', text: err.response?.data?.message || 'Failed to update employee' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => employeeService.deleteEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to delete employee');
    },
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setFormMsg(null);
    createMutation.mutate({
      ...form,
      branchId: Number(form.branchId),
      monthlyLeaveEntitlement: Number(form.monthlyLeaveEntitlement),
      joiningDate: form.joiningDate || null,
      email: form.email || null,
    });
  };

  const openEdit = (emp: Employee) => {
    setEditEmp(emp);
    setEditMsg(null);
    setEditForm({
      firstName: emp.firstName,
      lastName: emp.lastName,
      phone: emp.phone || '',
      designation: emp.designation || '',
      department: emp.department || '',
      branchId: String(emp.branch?.id || ''),
      monthlyLeaveEntitlement: String(emp.monthlyLeaveEntitlement),
      email: (emp as any).user?.email || '',
    });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEmp) return;
    setEditMsg(null);
    updateMutation.mutate({
      id: editEmp.id,
      data: {
        ...editForm,
        branchId: Number(editForm.branchId) || null,
        monthlyLeaveEntitlement: Number(editForm.monthlyLeaveEntitlement),
        email: editForm.email || null,
      },
    });
  };

  const inp = (value: string, onChange: (v: string) => void, opts: any = {}) => (
    <input className="form-input" value={value} onChange={e => onChange(e.target.value)} {...opts} />
  );
  const fg = (label: string, children: React.ReactNode) => (
    <div className="form-group"><label className="form-label">{label}</label>{children}</div>
  );
  const alertBox = (msg: { type: 'success' | 'error'; text: string }) => (
    <div style={{ padding: '0.65rem 0.9rem', borderRadius: 'var(--r-sm)', fontSize: '0.85rem', fontWeight: 600,
      background: msg.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)',
      color: msg.type === 'success' ? 'var(--emerald)' : 'var(--rose)',
      border: `1px solid ${msg.type === 'success' ? 'rgba(16,185,129,0.30)' : 'rgba(244,63,94,0.30)'}` }}>
      {msg.text}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Staff Directory</h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>Manage clinic employees and their assignments</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setShowAdd(!showAdd); setFormMsg(null); }} id="add-employee-btn">
          <Plus size={16} /> Add Staff
        </button>
      </div>

      {/* ADD FORM */}
      {showAdd && (
        <div className="glass-card p-5">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontWeight: 700 }}>Add New Employee</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}><X size={16} /></button>
          </div>
          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div className="form-grid">
              <div className="form-group"><label className="form-label">First Name *</label>{inp(form.firstName, v => setForm(f => ({ ...f, firstName: v })), { placeholder: 'First name', required: true })}</div>
              <div className="form-group"><label className="form-label">Last Name *</label>{inp(form.lastName, v => setForm(f => ({ ...f, lastName: v })), { placeholder: 'Last name', required: true })}</div>
            </div>
            <div className="form-grid">
              <div className="form-group"><label className="form-label">Username *</label>{inp(form.username, v => setForm(f => ({ ...f, username: v })), { placeholder: 'Login username', autoCapitalize: 'none', required: true })}</div>
              <div className="form-group"><label className="form-label">Password *</label>{inp(form.password, v => setForm(f => ({ ...f, password: v })), { type: 'password', placeholder: 'Initial password', required: true })}</div>
            </div>
            <div className="form-grid">
              <div className="form-group"><label className="form-label">Employee Code *</label>{inp(form.employeeCode, v => setForm(f => ({ ...f, employeeCode: v })), { placeholder: 'EMP-001', required: true })}</div>
              <div className="form-group"><label className="form-label">Phone (optional)</label>{inp(form.phone, v => setForm(f => ({ ...f, phone: v })), { type: 'tel', placeholder: '+91 XXXXX XXXXX' })}</div>
            </div>
            {fg('Gmail / Email (optional)', inp(form.email, v => setForm(f => ({ ...f, email: v })), { type: 'email', placeholder: 'e.g. staff@gmail.com' }))}
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Role *</label>
                <select className="form-select" value={form.roleName} onChange={e => setForm(f => ({ ...f, roleName: e.target.value }))}>
                  <option value="DOCTOR">Doctor</option>
                  <option value="SISTER">Sister / Nurse</option>
                  <option value="OTHER_STAFF">Other Staff</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Branch *</label>
                <select className="form-select" value={form.branchId} onChange={e => setForm(f => ({ ...f, branchId: e.target.value }))} required>
                  <option value="">Select branch</option>
                  {branches?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-grid">
              {fg('Designation (optional)', inp(form.designation, v => setForm(f => ({ ...f, designation: v })), { placeholder: 'e.g. Senior Dentist' }))}
              {fg('Department (optional)', inp(form.department, v => setForm(f => ({ ...f, department: v })), { placeholder: 'e.g. Orthodontics' }))}
            </div>
            <div className="form-grid">
              {fg('Joining Date (optional)', inp(form.joiningDate, v => setForm(f => ({ ...f, joiningDate: v })), { type: 'date' }))}
              {fg('Monthly Leave (days)', inp(form.monthlyLeaveEntitlement, v => setForm(f => ({ ...f, monthlyLeaveEntitlement: v })), { type: 'number', min: 0, max: 30, step: 0.5 }))}
            </div>
            {formMsg && alertBox(formMsg)}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)} style={{ flex: 1 }}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={createMutation.isPending} style={{ flex: 2 }} id="save-employee-btn">
                {createMutation.isPending ? 'Saving...' : 'Add Employee'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT MODAL */}
      {editEmp && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
          <div className="glass-card p-5" style={{ width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', margin: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontWeight: 700 }}>Edit — {editEmp.firstName} {editEmp.lastName}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditEmp(null)}><X size={16} /></button>
            </div>
            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div className="form-grid">
                <div className="form-group"><label className="form-label">First Name *</label>{inp(editForm.firstName, v => setEditForm(f => ({ ...f, firstName: v })), { required: true })}</div>
                <div className="form-group"><label className="form-label">Last Name *</label>{inp(editForm.lastName, v => setEditForm(f => ({ ...f, lastName: v })), { required: true })}</div>
              </div>
              {fg('Gmail / Email (optional)', inp(editForm.email, v => setEditForm(f => ({ ...f, email: v })), { type: 'email', placeholder: 'e.g. staff@gmail.com' }))}
              {fg('Phone (optional)', inp(editForm.phone, v => setEditForm(f => ({ ...f, phone: v })), { type: 'tel', placeholder: '+91 XXXXX XXXXX' }))}
              <div className="form-grid">
                {fg('Designation (optional)', inp(editForm.designation, v => setEditForm(f => ({ ...f, designation: v })), { placeholder: 'e.g. Senior Dentist' }))}
                {fg('Department (optional)', inp(editForm.department, v => setEditForm(f => ({ ...f, department: v })), { placeholder: 'e.g. Orthodontics' }))}
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Branch</label>
                  <select className="form-select" value={editForm.branchId} onChange={e => setEditForm(f => ({ ...f, branchId: e.target.value }))}>
                    <option value="">Select branch</option>
                    {branches?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                {fg('Monthly Leave (days)', inp(editForm.monthlyLeaveEntitlement, v => setEditForm(f => ({ ...f, monthlyLeaveEntitlement: v })), { type: 'number', min: 0, max: 30, step: 0.5 }))}
              </div>
              {editMsg && alertBox(editMsg)}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setEditEmp(null)} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={updateMutation.isPending} style={{ flex: 2 }}>
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
          <div className="glass-card p-5" style={{ maxWidth: '400px', width: '100%', margin: '1rem', textAlign: 'center' }}>
            <Trash2 size={36} style={{ color: 'var(--rose)', margin: '0 auto 0.75rem' }} />
            <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Delete Employee?</h3>
            <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              This will permanently delete <strong>{deleteTarget.firstName} {deleteTarget.lastName}</strong> ({deleteTarget.employeeCode}) and their login account. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn" style={{ flex: 1, background: 'var(--rose)', color: '#fff' }}
                disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(deleteTarget.id)}>
                {deleteMutation.isPending ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EMPLOYEE LIST */}
      {isLoading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {employees?.map(emp => (
            <div key={emp.id} className="glass-card" style={{ padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700 }}>{emp.firstName} {emp.lastName}</span>
                    {roleBadge(emp.user?.role?.name || '')}
                    {!emp.isActive && <span className="badge badge-rose">Inactive</span>}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: '0.2rem' }}>
                    {emp.employeeCode} · {emp.branch?.name}{emp.designation ? ` · ${emp.designation}` : ''}
                  </div>
                  {(emp as any).user?.email && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: '0.1rem' }}>
                      \u2709 {(emp as any).user.email}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--primary-light)', fontWeight: 600 }}>
                    {emp.monthlyLeaveEntitlement} days/mo
                  </span>
                  <button className="btn btn-ghost btn-sm" title="Edit" onClick={() => openEdit(emp)} style={{ padding: '0.3rem 0.55rem' }}>
                    <Pencil size={14} />
                  </button>
                  <button className="btn btn-ghost btn-sm" title="Delete" onClick={() => setDeleteTarget(emp)} style={{ padding: '0.3rem 0.55rem', color: 'var(--rose)' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!employees?.length && (
            <div className="glass-card p-6" style={{ textAlign: 'center', color: 'var(--text-2)' }}>
              <Users size={40} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
              <p>No employees found. Add your first staff member.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
