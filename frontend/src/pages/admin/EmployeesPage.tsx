import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { branchService } from '../../services/branchService';
import { employeeService } from '../../services/branchService';
import { Users, Plus, Pencil, Trash2, X, KeyRound, Eye, EyeOff } from 'lucide-react';
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
    password: '', roleName: 'DOCTOR',
  });
  const [showEditPass, setShowEditPass] = useState(false);

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
      showAlert.success('Updated Successfully!', 'Staff details and login credentials have been updated.');
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
      showAlert.success('Deleted Successfully!', 'Staff member and all related records have been removed.');
    },
    onError: (err: any) => {
      showAlert.error('Delete Failed', err.response?.data?.message || 'Failed to delete employee. Please ensure you are logged in as Admin.');
    },
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...form,
      branchId: form.branchId === 'BOTH' || form.branchId === 'ALL' || !form.branchId ? null : Number(form.branchId),
      monthlyLeaveEntitlement: Number(form.monthlyLeaveEntitlement),
      joiningDate: form.joiningDate || null,
      email: form.email || null,
    });
  };

  const openEdit = (emp: Employee) => {
    setEditEmp(emp);
    setShowEditPass(false);
    setEditForm({
      firstName: emp.firstName,
      lastName: emp.lastName,
      phone: emp.phone || '',
      designation: emp.designation || '',
      department: emp.department || '',
      branchId: emp.branch?.id ? String(emp.branch.id) : 'BOTH',
      monthlyLeaveEntitlement: String(emp.monthlyLeaveEntitlement),
      email: (emp as any).user?.email || '',
      password: '',
      roleName: emp.user?.role?.name || 'DOCTOR',
    });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEmp) return;
    const branchVal = editForm.branchId === 'BOTH' || editForm.branchId === 'ALL'
      ? 0
      : (editForm.branchId ? Number(editForm.branchId) : null);

    updateMutation.mutate({
      id: editEmp.id,
      data: {
        ...editForm,
        branchId: branchVal,
        monthlyLeaveEntitlement: Number(editForm.monthlyLeaveEntitlement),
        email: editForm.email || null,
        password: editForm.password.trim() || undefined,
        roleName: editForm.roleName,
      },
    });
  };

  const handleDelete = async (emp: Employee) => {
    const ok = await showAlert.confirm(
      `Delete ${emp.firstName} ${emp.lastName}?`,
      `Are you sure you want to delete staff (${emp.employeeCode})? This will permanently delete their account, attendance logs, and leave records. This action cannot be undone.`,
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
          <p style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>Add, edit, reset passwords, and manage dental clinic staff</p>
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
                <select
                  className="form-select"
                  value={form.roleName}
                  onChange={e => {
                    const newRole = e.target.value;
                    setForm(f => ({
                      ...f,
                      roleName: newRole,
                      branchId: newRole === 'ADMIN' && (!f.branchId || f.branchId === '') ? 'BOTH' : f.branchId,
                    }));
                  }}
                >
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
                <option value="BOTH">Both Branches (Kannappa Nagar & Saibaba Colony)</option>
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

      {/* EDIT MODAL WITH PASSWORD RESET */}
      {editEmp && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 520, width: '94%', maxHeight: 'calc(100dvh - 2rem)', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontWeight: 800, fontSize: '1.1rem' }}>Edit: {editEmp.firstName} {editEmp.lastName}</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Employee Code: {editEmp.employeeCode} · User: {editEmp.user?.username}</span>
              </div>
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
                {fg('Role', (
                  <select className="form-select" value={editForm.roleName} onChange={e => setEditForm(f => ({ ...f, roleName: e.target.value }))}>
                    <option value="DOCTOR">Doctor</option>
                    <option value="SISTER">Sister / Nurse</option>
                    <option value="OTHER_STAFF">Other Staff</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                ))}
                {fg('Monthly Leave Entitlement', inp(editForm.monthlyLeaveEntitlement, v => setEditForm(f => ({ ...f, monthlyLeaveEntitlement: v })), { type: 'number', step: '0.5' }))}
              </div>

              {fg('Branch', (
                <select className="form-select" value={editForm.branchId} onChange={e => setEditForm(f => ({ ...f, branchId: e.target.value }))}>
                  <option value="">-- No Change --</option>
                  <option value="BOTH">Both Branches (Kannappa Nagar & Saibaba Colony)</option>
                  {branches?.map(b => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
                </select>
              ))}

              {/* PASSWORD RESET SECTION FOR ADMIN */}
              <div style={{
                background: 'rgba(13,148,136,0.06)',
                border: '1px solid var(--primary-border)',
                borderRadius: 'var(--r-sm)',
                padding: '0.75rem',
                marginTop: '0.25rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem', color: 'var(--primary-light)', fontSize: '0.8rem', fontWeight: 700 }}>
                  <KeyRound size={14} /> Reset Employee Password (Optional)
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    className="form-input"
                    type={showEditPass ? 'text' : 'password'}
                    placeholder="Leave blank to keep current password"
                    value={editForm.password}
                    onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))}
                    style={{ paddingRight: '2.5rem' }}
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPass(s => !s)}
                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}
                  >
                    {showEditPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: '0.25rem' }}>
                  If the employee forgot their password, type a new password here (min 6 characters) to reset it.
                </div>
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
                    {emp.employeeCode} · <span style={{ color: !emp.branch ? 'var(--primary-light)' : 'inherit', fontWeight: !emp.branch ? 600 : 400 }}>{emp.branch ? `${emp.branch.name} (${emp.branch.code})` : 'Both Branches (Kannappa Nagar & Saibaba Colony)'}</span>{emp.designation ? ` · ${emp.designation}` : ''}
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
                  <button className="btn btn-ghost btn-sm" title="Edit & Reset Password" onClick={() => openEdit(emp)} style={{ padding: '0.3rem 0.55rem' }}>
                    <Pencil size={14} />
                  </button>
                  <button className="btn btn-ghost btn-sm" title="Delete Staff" onClick={() => handleDelete(emp)} style={{ padding: '0.3rem 0.55rem', color: 'var(--rose)' }}>
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
