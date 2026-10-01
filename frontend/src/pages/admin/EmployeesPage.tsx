import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { branchService } from '../../services/branchService';
import { employeeService } from '../../services/branchService';
import { Users, Plus } from 'lucide-react';

function roleBadge(role: string) {
  const map: Record<string, string> = { ADMIN: 'badge-violet', DOCTOR: 'badge-cyan', SISTER: 'badge-emerald', OTHER_STAFF: 'badge-gray' };
  return <span className={`badge ${map[role] || 'badge-gray'}`}>{role.replace('_', ' ')}</span>;
}

export default function EmployeesPage() {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    username: '', password: '', email: '', roleName: 'DOCTOR',
    employeeCode: '', firstName: '', lastName: '', phone: '',
    designation: '', department: '', branchId: '', joiningDate: '',
    monthlyLeaveEntitlement: '1.5',
  });
  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: employees, isLoading, refetch } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeeService.getAllEmployees(),
  });

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchService.getAllBranches(),
  });

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setFormMsg(null);
    try {
      await employeeService.createEmployee({
        ...form,
        branchId: Number(form.branchId),
        monthlyLeaveEntitlement: Number(form.monthlyLeaveEntitlement),
      });
      setFormMsg({ type: 'success', text: '✓ Employee added successfully!' });
      refetch();
      setForm({ username: '', password: '', email: '', roleName: 'DOCTOR', employeeCode: '', firstName: '', lastName: '', phone: '', designation: '', department: '', branchId: '', joiningDate: '', monthlyLeaveEntitlement: '1.5' });
    } catch (err: any) {
      setFormMsg({ type: 'error', text: err.response?.data?.message || 'Failed to create employee' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Staff Directory</h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>Manage clinic employees and their assignments</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(!showAdd)} id="add-employee-btn">
          <Plus size={16} /> Add Staff
        </button>
      </div>

      {/* Add Employee Form */}
      {showAdd && (
        <div className="glass-card p-5">
          <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Add New Employee</h3>
          <form onSubmit={handleAddEmployee} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">First Name *</label>
                <input className="form-input" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} placeholder="First name" />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name *</label>
                <input className="form-input" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Last name" />
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Username *</label>
                <input className="form-input" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="Login username" autoCapitalize="none" />
              </div>
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input className="form-input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Initial password" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input className="form-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Email address" />
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Employee Code *</label>
                <input className="form-input" value={form.employeeCode} onChange={e => setForm(f => ({ ...f, employeeCode: e.target.value }))} placeholder="EMP-001" />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 XXXXX XXXXX" />
              </div>
            </div>
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
                <select className="form-select" value={form.branchId} onChange={e => setForm(f => ({ ...f, branchId: e.target.value }))}>
                  <option value="">Select branch</option>
                  {branches?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Designation</label>
                <input className="form-input" value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} placeholder="e.g. Senior Dentist" />
              </div>
              <div className="form-group">
                <label className="form-label">Joining Date *</label>
                <input className="form-input" type="date" value={form.joiningDate} onChange={e => setForm(f => ({ ...f, joiningDate: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Monthly Leave Entitlement (days)</label>
              <input className="form-input" type="number" min="0" max="30" step="0.5" value={form.monthlyLeaveEntitlement} onChange={e => setForm(f => ({ ...f, monthlyLeaveEntitlement: e.target.value }))} />
            </div>

            {formMsg && (
              <div style={{ padding: '0.65rem 0.9rem', borderRadius: 'var(--r-sm)', fontSize: '0.85rem', fontWeight: 600, background: formMsg.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)', color: formMsg.type === 'success' ? 'var(--emerald)' : 'var(--rose)', border: `1px solid ${formMsg.type === 'success' ? 'rgba(16,185,129,0.30)' : 'rgba(244,63,94,0.30)'}` }}>
                {formMsg.text}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)} style={{ flex: 1 }}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 2 }} id="save-employee-btn">
                {saving ? 'Saving...' : 'Add Employee'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Employee List */}
      {isLoading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {employees?.map(emp => (
            <div key={emp.id} className="glass-card" style={{ padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700 }}>{emp.firstName} {emp.lastName}</span>
                    {roleBadge(emp.user?.role?.name || '')}
                    {!emp.isActive && <span className="badge badge-rose">Inactive</span>}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: '0.2rem' }}>
                    {emp.employeeCode} · {emp.branch?.name} · {emp.designation || 'Staff'}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.78rem', color: 'var(--primary-light)', fontWeight: 600 }}>
                  {emp.monthlyLeaveEntitlement} days/mo
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
