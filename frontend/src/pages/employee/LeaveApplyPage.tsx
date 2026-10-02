import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { leaveService } from '../../services/leaveService';
import { showAlert } from '../../utils/alerts';

export default function LeaveApplyPage() {
  const [form, setForm] = useState({
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    durationType: 'FULL_DAY' as 'FULL_DAY' | 'HALF_DAY',
    reason: '',
  });
  const [loading, setLoading] = useState(false);

  const { data: leaveTypes } = useQuery({
    queryKey: ['leave-types'],
    queryFn: () => leaveService.getLeaveTypes(),
  });

  const { data: balance, refetch: refetchBalance } = useQuery({
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
    if (!form.leaveTypeId || !form.startDate || !form.endDate || !form.reason.trim()) {
      showAlert.warning('Incomplete Form', 'Please fill in all required fields (Leave Type, Dates, Reason).');
      return;
    }
    if (duration <= 0) {
      showAlert.warning('Invalid Date Range', 'End date must be on or after the start date.');
      return;
    }
    setLoading(true);
    try {
      await leaveService.applyForLeave({
        leaveTypeId: Number(form.leaveTypeId),
        startDate: form.startDate,
        endDate: form.endDate,
        duration,
        durationType: form.durationType,
        reason: form.reason.trim(),
      });
      showAlert.success('Leave Request Submitted!', 'Your application has been submitted to admin for approval.');
      setForm({ leaveTypeId: '', startDate: '', endDate: '', durationType: 'FULL_DAY', reason: '' });
      refetchBalance();
    } catch (err: any) {
      showAlert.error('Submission Failed', err.response?.data?.message || 'Could not submit leave request.');
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
              required
              id="leave-type-select"
            >
              <option value="">Select Leave Type</option>
              {leaveTypes?.map(lt => (
                <option key={lt.id} value={lt.id}>{lt.name} ({lt.code})</option>
              ))}
            </select>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Start Date *</label>
              <input
                className="form-input"
                type="date"
                value={form.startDate}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                required
                id="leave-start-date"
              />
            </div>
            <div className="form-group">
              <label className="form-label">End Date *</label>
              <input
                className="form-input"
                type="date"
                value={form.endDate}
                onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                required
                id="leave-end-date"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Duration Type</label>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                className={`btn btn-sm ${form.durationType === 'FULL_DAY' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setForm(f => ({ ...f, durationType: 'FULL_DAY' }))}
              >
                Full Day ({calcDuration()} day{calcDuration() !== 1 ? 's' : ''})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${form.durationType === 'HALF_DAY' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setForm(f => ({ ...f, durationType: 'HALF_DAY' }))}
              >
                Half Day (0.5 days)
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Reason *</label>
            <textarea
              className="form-textarea"
              placeholder="Please provide a clear reason for your leave..."
              value={form.reason}
              onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              required
              rows={3}
              id="leave-reason-input"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
            id="leave-submit-btn"
          >
            {loading ? 'Submitting...' : 'Submit Leave Request'}
          </button>
        </form>
      </div>
    </div>
  );
}
