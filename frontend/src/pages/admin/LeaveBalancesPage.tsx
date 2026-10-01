import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leaveService } from '../../services/leaveService';
import api from '../../services/api';
import { Users, Plus, Minus, ArrowUpDown } from 'lucide-react';
import type { Employee, LeavePeriod } from '../../types';

async function getEmployeeBalances(): Promise<{ employee: Employee; balance: LeavePeriod }[]> {
  const res = await api.get('/leave/balances/all');
  return res.data;
}

export default function LeaveBalancesPage() {
  const qc = useQueryClient();
  const [adjustModal, setAdjustModal] = useState<{ employeeId: number; name: string } | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data: balances, isLoading } = useQuery({
    queryKey: ['leave-balances-all'],
    queryFn: getEmployeeBalances,
  });

  const adjustMut = useMutation({
    mutationFn: (data: { employeeId: number; amount: number; reason: string }) =>
      leaveService.adjustLeaveBalance(data.employeeId, data.amount, data.reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave-balances-all'] });
      setMsg({ type: 'success', text: '✓ Leave balance adjusted successfully!' });
      setAdjustModal(null);
      setAmount('');
      setReason('');
    },
    onError: (err: any) => setMsg({ type: 'error', text: err.response?.data?.message || 'Adjustment failed' }),
  });

  const handleAdjust = () => {
    if (!adjustModal || !amount || !reason.trim()) return;
    adjustMut.mutate({ employeeId: adjustModal.employeeId, amount: Number(amount), reason });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Leave Balances</h1>
        <p style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>View and adjust employee leave balances for the current period</p>
      </div>

      {msg && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--r-sm)', fontSize: '0.875rem', fontWeight: 600, background: msg.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)', color: msg.type === 'success' ? 'var(--emerald)' : 'var(--rose)', border: `1px solid ${msg.type === 'success' ? 'rgba(16,185,129,0.30)' : 'rgba(244,63,94,0.30)'}` }}>
          {msg.text}
        </div>
      )}

      {isLoading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : !balances?.length ? (
        <div className="glass-card p-6" style={{ textAlign: 'center', color: 'var(--text-2)' }}>
          <Users size={40} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
          <p>No leave balance data available</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {balances.map(({ employee, balance }) => (
            <div key={employee.id} className="glass-card" style={{ padding: '1.1rem 1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{employee.firstName} {employee.lastName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
                    {employee.employeeCode} · {employee.branch?.name}
                  </div>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setAdjustModal({ employeeId: employee.id, name: `${employee.firstName} ${employee.lastName}` })}
                  id={`adjust-balance-${employee.id}`}
                >
                  <ArrowUpDown size={13} /> Adjust
                </button>
              </div>

              <div className="leave-balance-grid">
                <div className="leave-balance-item">
                  <div className="leave-balance-num" style={{ color: 'var(--cyan)', fontSize: '1.3rem' }}>{balance.totalEntitlement}</div>
                  <div className="leave-balance-label">Entitled</div>
                </div>
                <div className="leave-balance-item">
                  <div className="leave-balance-num" style={{ color: 'var(--rose)', fontSize: '1.3rem' }}>{balance.used}</div>
                  <div className="leave-balance-label">Used</div>
                </div>
                <div className="leave-balance-item">
                  <div className="leave-balance-num" style={{ color: 'var(--amber)', fontSize: '1.3rem' }}>{balance.pending}</div>
                  <div className="leave-balance-label">Pending</div>
                </div>
                <div className="leave-balance-item">
                  <div className="leave-balance-num" style={{ color: 'var(--emerald)', fontSize: '1.3rem' }}>{balance.remaining}</div>
                  <div className="leave-balance-label">Available</div>
                </div>
              </div>

              {balance.adjusted !== 0 && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--violet)', fontWeight: 600 }}>
                  Manual adjustments: {balance.adjusted > 0 ? '+' : ''}{balance.adjusted} day{Math.abs(balance.adjusted) !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Adjust Modal */}
      {adjustModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-title">Adjust Leave Balance</div>
            <div className="modal-body" style={{ marginBottom: '1rem' }}>
              Adjusting leave balance for <strong>{adjustModal.name}</strong>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div className="form-group">
                <label className="form-label">Adjustment (days)</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className={`btn btn-sm ${Number(amount) > 0 ? 'btn-primary' : 'btn-ghost'}`}
                    type="button"
                    onClick={() => setAmount(a => String(Math.abs(Number(a) || 0.5)))}
                  >
                    <Plus size={14} /> Add
                  </button>
                  <button
                    className={`btn btn-sm ${Number(amount) < 0 ? 'btn-danger' : 'btn-ghost'}`}
                    type="button"
                    onClick={() => setAmount(a => String(-Math.abs(Number(a) || 0.5)))}
                  >
                    <Minus size={14} /> Deduct
                  </button>
                </div>
                <input
                  className="form-input"
                  type="number"
                  step="0.5"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="e.g. 1 or -0.5"
                  style={{ marginTop: '0.5rem' }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Reason *</label>
                <textarea
                  className="form-textarea"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Why is this adjustment being made?"
                  rows={2}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn-ghost btn-full" onClick={() => { setAdjustModal(null); setAmount(''); setReason(''); }}>Cancel</button>
                <button
                  className="btn btn-primary btn-full"
                  disabled={!amount || !reason.trim() || adjustMut.isPending}
                  onClick={handleAdjust}
                >
                  {adjustMut.isPending ? 'Adjusting...' : 'Apply Adjustment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
