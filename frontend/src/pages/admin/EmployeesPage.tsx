import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { branchService } from '../../services/branchService';
import { employeeService } from '../../services/branchService';
import { Users, Plus, Pencil, Trash2, X } from 'lucide-react';
import { showAlert } from '../../utils/alerts';
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

  const [editEmp, setEditEmp] = useState<Employee | null>(null);
  const [editForm, setEditForm] = useState({
    firstName: '', lastName: '', phone: '', designation: '',
    department: '', branchId: '', monthlyLeaveEntitlement: '', email: '',
  });

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
      showAlert.success('Staff Added Successfully!', 'New employee account has been created.');
      setForm({ ...EMPTY_FORM });
      setShowAdd(false);
    },
    onError: (err: any) => {
      showAlert.error('Failed to Add Staff', err.response?.data?.message || 'Could not register employee.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => employeeService.updateEmployee(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      showAlert.success('Updated Successfully!', 'Staff details have been updated.');
      setEditEmp(null);
    },
    onError: (err: any) => {
      showAlert.error('Update Failed', err.response?.data?.message || 'Could not update employee details.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => employeeService.deleteEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      showAlert.success('Deleted Successfully!', 'Staff member and their account have been removed.');
    },
    onError: (err: any) => {
      showAlert.error('Delete Failed', err.response?.data?.message || 'Failed to delete employee.');
    },
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
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

  const handleDelete = async (emp: Employee) => {
    const ok = await showAlert.confirm(
      `Delete ${emp.firstName} ${emp.lastName}?`,
      `Are you sure you want to delete staff (${emp.employeeCode})? This action cannot be undone.`,
      'Yes, Delete Staff'
    );
    if (ok) {
      deleteMutation.mutate(emp.id);
    }
  };

  const inp = (value: string, onChange: (v: string) => void, opts: any = {}) => (
    <input className="form-input" value={value} onChange={e => onChange(e.target.value)} {...opts} />
  );
  const fg = (label: string, children: React.ReactNode) => (
    <div className="form-group"><label className="form-label">{label}</label>{children}</div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Staff Management</h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>Add, edit, assign branches, and manage dental clinic staff</p>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => { setShowAdd(s => !s); }}
          id="add-employee-btn"
        >
          <Plus size={16} /> {showAdd ? 'Cancel' : 'Add Staff'}
        </button>
      </div>

      {/* ADD EMPLOYEE FORM */}
      {showAdd && (
        <div className="glass-card p-5" style={{ border: '1px solid var(--primary-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
            <h3 style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--primary-light)' }}>Register New Staff Member</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}><X size={16} /></button>
          </div>

          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Mandatory Details
            </div>
            <div className="form-grid">
              {fg('First Name *', inp(form.firstName, v => setForm(f => ({ ...f, firstName: v })), { required: true, placeholder: 'e.g. John' }))}
              {fg('Last Name *', inp(form.lastName, v => setForm(f => ({ ...f, lastName: v })), { required: true, placeholder: 'e.g. Doe' }))}
            </div>

            <div className="form-grid">
              {fg('Employee Code *', inp(form.employeeCode, v => setForm(f => ({ ...f, employeeCode: v })), { required: true, placeholder: 'e.g. DOC001' }))}
              {fg('Role *', (
                <select className="form-select" value={form.roleName} onChange={e => setForm(f => ({ ...f, roleName: e.target.value }))}>
                  <option value="DOCTOR">Doctor</option>
                  <option value="SISTER">Sister / Nurse</option>
                  <option value="OTHER_STAFF">Other Staff</option>
                  <option value="ADMIN">Admin</option>
                </select>
              ))}
            </div>

            <div className="form-grid">
              {fg('Login Username *', inp(form.username, v => setForm(f => ({ ...f, username: v })), { required: true, placeholder: 'e.g. jdoe' }))}
              {fg('Login Password *', inp(form.password, v => setForm(f => ({ ...f, password: v })), { type: 'password', required: true, placeholder: 'Min 6 chars' }))}
            </div>

            {fg('Assigned Branch *', (
              <select className="form-select" required value={form.branchId} onChange={e => setForm(f => ({ ...f, branchId: e.target.value }))}>
                <option value="">-- Select Branch --</option>
                {branches?.map(b => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
              </select>
            ))}

            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.5rem' }}>
              Optional Details (Leave blank if not available)
            </div>

            <div className="form-grid">
              {fg('Email / Gmail (Optional)', inp(form.email, v => setForm(f => ({ ...f, email: v })), { type: 'email', placeholder: 'doctor@example.com' }))}
              {fg('Phone Number (Optional)', inp(form.phone, v => setForm(f => ({ ...f, phone: v })), { placeholder: '+91 9876543210' }))}
            </div>

            <div className="form-grid">
              {fg('Designation (Optional)', inp(form.designation, v => setForm(f => ({ ...f, designation: v })), { placeholder: 'e.g. Senior Dental Surgeon' }))}
              {fg('Department (Optional)', inp(form.department, v => setForm(f => ({ ...f, department: v })), { placeholder: 'e.g. Orthodontics' }))}
            </div>

            <div className="form-grid">
              {fg('Joining Date (Optional)', inp(form.joiningDate, v => setForm(f => ({ ...f, joiningDate: v })), { type: 'date' }))}
              {fg('Monthly Leave Entitlement', inp(form.monthlyLeaveEntitlement, v => setForm(f => ({ ...f, monthlyLeaveEntitlement: v })), { type: 'number', step: '0.5', placeholder: '1.5' }))}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowAdd(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={createMutation.isPending || !form.branchId}>
                {createMutation.isPending ? 'Saving...' : 'Save & Register Staff'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT MODAL */}
      {editEmp && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 520, width: '92%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontWeight: 800, fontSize: '1.1rem' }}>Edit: {editEmp.firstName} {editEmp.lastName}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditEmp(null)}><X size={16} /></button>
            </div>

            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div className="form-grid">
                {fg('First Name *', inp(editForm.firstName, v => setEditForm(f => ({ ...f, firstName: v })), { required: true }))}
                {fg('Last Name *', inp(editForm.lastName, v => setEditForm(f => ({ ...f, lastName: v })), { required: true }))}
              </div>

              <div className="form-grid">
                {fg('Email / Gmail (Optional)', inp(editForm.email, v => setEditForm(f => ({ ...f, email: v })), { type: 'email' }))}
                {fg('Phone (Optional)', inp(editForm.phone, v => setEditForm(f => ({ ...f, phone: v }))))}
              </div>

              <div className="form-grid">
                {fg('Designation (Optional)', inp(editForm.designation, v => setEditForm(f => ({ ...f, designation: v }))))}
                {fg('Department (Optional)', inp(editForm.department, v => setEditForm(f => ({ ...f, department: v }))))}
              </div>

              <div className="form-grid">
                {fg('Branch', (
                  <select className="form-select" value={editForm.branchId} onChange={e => setEditForm(f => ({ ...f, branchId: e.target.value }))}>
                    <option value="">-- No Change --</option>
                    {branches?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                ))}
                {fg('Monthly Leave Entitlement', inp(editForm.monthlyLeaveEntitlement, v => setEditForm(f => ({ ...f, monthlyLeaveEntitlement: v })), { type: 'number', step: '0.5' }))}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setEditEmp(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
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
                      ✉ {(emp as any).user.email}
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
                  <button className="btn btn-ghost btn-sm" title="Delete" onClick={() => handleDelete(emp)} style={{ padding: '0.3rem 0.55rem', color: 'var(--rose)' }}>
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
