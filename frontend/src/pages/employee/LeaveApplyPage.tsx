import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { leaveService } from '../../services/leaveService';

export default function LeaveApplyPage() {
  const [form, setForm] = useState({
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    durationType: 'FULL_DAY' as 'FULL_DAY' | 'HALF_DAY',
    reason: '',
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data: leaveTypes } = useQuery({
    queryKey: ['leave-types'],
    queryFn: () => leaveService.getLeaveTypes(),
  });

  const { data: balance } = useQuery({
    queryKey: ['leave-balance'],
    queryFn: () => leaveService.getMyBalance(),
  });

  const calcDuration = () => {
    if (!form.startDate || !form.endDate) return 0;
    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    const days = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
    return form.durationType === 'HALF_DAY' ? 0.5 : days;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const duration = calcDuration();
    if (!form.leaveTypeId || !form.startDate || !form.endDate || !form.reason) {
      setMsg({ type: 'error', text: 'All fields are required' });
      return;
    }
    if (duration <= 0) {
      setMsg({ type: 'error', text: 'End date must be on or after start date' });
      return;
    }
    setLoading(true); setMsg(null);
    try {
      await leaveService.applyForLeave({
        leaveTypeId: Number(form.leaveTypeId),
        startDate: form.startDate,
        endDate: form.endDate,
        duration,
        durationType: form.durationType,
        reason: form.reason,
      });
      setMsg({ type: 'success', text: '✓ Leave request submitted successfully!' });
      setForm({ leaveTypeId: '', startDate: '', endDate: '', durationType: 'FULL_DAY', reason: '' });
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to submit leave request' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Apply for Leave</h1>
        <p style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>Submit a new leave request for admin approval</p>
      </div>

      {/* Balance Summary */}
      {balance && (
        <div className="glass-card p-5">
          <h3 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-2)', marginBottom: '0.75rem' }}>Current Month Balance</h3>
          <div className="leave-balance-grid">
            <div className="leave-balance-item">
              <div className="leave-balance-num" style={{ color: 'var(--cyan)' }}>{balance.totalEntitlement}</div>
              <div className="leave-balance-label">Entitled</div>
            </div>
            <div className="leave-balance-item">
              <div className="leave-balance-num" style={{ color: 'var(--rose)' }}>{balance.used}</div>
              <div className="leave-balance-label">Used</div>
            </div>
            <div className="leave-balance-item">
              <div className="leave-balance-num" style={{ color: 'var(--amber)' }}>{balance.pending}</div>
              <div className="leave-balance-label">Pending</div>
            </div>
            <div className="leave-balance-item">
              <div className="leave-balance-num" style={{ color: 'var(--emerald)' }}>{balance.remaining}</div>
              <div className="leave-balance-label">Available</div>
            </div>
          </div>
        </div>
      )}

      {/* Application Form */}
      <div className="glass-card p-5">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Leave Type *</label>
            <select
              className="form-select"
              value={form.leaveTypeId}
              onChange={e => setForm(f => ({ ...f, leaveTypeId: e.target.value }))}
            >
              <option value="">Select leave type</option>
              {leaveTypes?.map(lt => (
                <option key={lt.id} value={lt.id}>{lt.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Duration Type</label>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {['FULL_DAY', 'HALF_DAY'].map(dt => (
                <label
                  key={dt}
                  style={{
                    flex: 1,
                    padding: '0.65rem',
                    borderRadius: 'var(--r-sm)',
                    border: `2px solid ${form.durationType === dt ? 'var(--primary)' : 'var(--border)'}`,
                    background: form.durationType === dt ? 'rgba(13,148,136,0.12)' : 'var(--bg-input)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: form.durationType === dt ? 'var(--primary-light)' : 'var(--text-2)',
                    transition: 'all 0.2s',
                    userSelect: 'none',
                  }}
                >
                  <input
                    type="radio"
                    name="durationType"
                    value={dt}
                    checked={form.durationType === dt}
                    onChange={() => setForm(f => ({ ...f, durationType: dt as any }))}
                    style={{ display: 'none' }}
                  />
                  {dt === 'FULL_DAY' ? '☀ Full Day' : '🌤 Half Day'}
                </label>
              ))}
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Start Date *</label>
              <input
                className="form-input"
                type="date"
                value={form.startDate}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="form-group">
              <label className="form-label">End Date *</label>
              <input
                className="form-input"
                type="date"
                value={form.endDate}
                onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                min={form.startDate || new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          {form.startDate && form.endDate && (
            <div style={{ padding: '0.65rem 0.9rem', background: 'rgba(13,148,136,0.08)', borderRadius: 'var(--r-sm)', border: '1px solid var(--primary-border)', fontSize: '0.85rem', color: 'var(--primary-light)', fontWeight: 600 }}>
              Duration: {calcDuration()} day{calcDuration() !== 1 ? 's' : ''}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Reason *</label>
            <textarea
              className="form-textarea"
              placeholder="Please provide the reason for your leave request..."
              value={form.reason}
              onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              rows={3}
            />
          </div>

          {msg && (
            <div style={{
              padding: '0.75rem 1rem', borderRadius: 'var(--r-sm)', fontSize: '0.875rem', fontWeight: 600,
              background: msg.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)',
              color: msg.type === 'success' ? 'var(--emerald)' : 'var(--rose)',
              border: `1px solid ${msg.type === 'success' ? 'rgba(16,185,129,0.30)' : 'rgba(244,63,94,0.30)'}`,
            }}>
              {msg.text}
            </div>
          )}

          <button
            id="leave-submit-btn"
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
          >
            {loading ? 'Submitting...' : 'Submit Leave Request'}
          </button>
        </form>
      </div>
    </div>
  );
}
