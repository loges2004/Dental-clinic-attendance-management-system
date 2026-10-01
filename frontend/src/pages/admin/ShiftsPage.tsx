import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Clock, Plus, Edit2 } from 'lucide-react';
import type { Shift } from '../../types';

async function getShifts(): Promise<Shift[]> {
  const res = await api.get<Shift[]>('/shifts');
  return res.data;
}

async function createShift(data: Partial<Shift>): Promise<Shift> {
  const res = await api.post<Shift>('/shifts', data);
  return res.data;
}

async function updateShift(id: number, data: Partial<Shift>): Promise<Shift> {
  const res = await api.put<Shift>(`/shifts/${id}`, data);
  return res.data;
}

export default function ShiftsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', startTime: '09:00', endTime: '18:00', gracePeriodMinutes: '15' });
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data: shifts, isLoading } = useQuery({ queryKey: ['shifts'], queryFn: getShifts });

  const createMut = useMutation({
    mutationFn: (d: Partial<Shift>) => createShift(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shifts'] });
      setMsg({ type: 'success', text: '✓ Shift created!' });
      resetForm();
    },
    onError: (err: any) => setMsg({ type: 'error', text: err.response?.data?.message || 'Create failed' }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Shift> }) => updateShift(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shifts'] });
      setMsg({ type: 'success', text: '✓ Shift updated!' });
      resetForm();
    },
    onError: (err: any) => setMsg({ type: 'error', text: err.response?.data?.message || 'Update failed' }),
  });

  const resetForm = () => {
    setForm({ name: '', startTime: '09:00', endTime: '18:00', gracePeriodMinutes: '15' });
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (s: Shift) => {
    setEditingId(s.id);
    setForm({ name: s.name, startTime: s.startTime, endTime: s.endTime, gracePeriodMinutes: String(s.gracePeriodMinutes) });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); setMsg(null);
    const data = { name: form.name, startTime: form.startTime, endTime: form.endTime, gracePeriodMinutes: Number(form.gracePeriodMinutes) };
    if (editingId) updateMut.mutate({ id: editingId, data });
    else createMut.mutate(data);
  };

  const isSaving = createMut.isPending || updateMut.isPending;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Shift Management</h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>Configure work shifts and grace periods</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setShowForm(true); }} id="add-shift-btn">
          <Plus size={16} /> New Shift
        </button>
      </div>

      {msg && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--r-sm)', fontSize: '0.875rem', fontWeight: 600, background: msg.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)', color: msg.type === 'success' ? 'var(--emerald)' : 'var(--rose)', border: `1px solid ${msg.type === 'success' ? 'rgba(16,185,129,0.30)' : 'rgba(244,63,94,0.30)'}` }}>
          {msg.text}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="glass-card p-5">
          <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>{editingId ? 'Edit Shift' : 'Create New Shift'}</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div className="form-group">
              <label className="form-label">Shift Name *</label>
              <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Morning Shift" />
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Start Time *</label>
                <input className="form-input" type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">End Time *</label>
                <input className="form-input" type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Grace Period (minutes)</label>
              <input className="form-input" type="number" min="0" max="60" value={form.gracePeriodMinutes} onChange={e => setForm(f => ({ ...f, gracePeriodMinutes: e.target.value }))} />
              <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: '0.2rem' }}>
                Employees arriving within this many minutes after start time are still marked On Time
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" className="btn btn-ghost" onClick={resetForm} style={{ flex: 1 }}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={isSaving || !form.name} style={{ flex: 2 }}>
                {isSaving ? 'Saving...' : editingId ? 'Update Shift' : 'Create Shift'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Shift List */}
      {isLoading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {shifts?.map(s => (
            <div key={s.id} className="glass-card" style={{ padding: '1.1rem 1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 'var(--r-sm)', background: 'rgba(6,182,212,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock size={18} color="var(--cyan)" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700 }}>{s.name}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-2)' }}>
                      {s.startTime} → {s.endTime}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="badge badge-cyan">{s.gracePeriodMinutes}min grace</span>
                  <span className={`badge ${s.isActive ? 'badge-emerald' : 'badge-rose'}`}>
                    {s.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <button className="btn btn-ghost btn-sm" onClick={() => startEdit(s)}>
                    <Edit2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!shifts?.length && (
            <div className="glass-card p-6" style={{ textAlign: 'center', color: 'var(--text-2)' }}>
              <Clock size={40} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
              <p>No shifts configured. Create your first shift.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
