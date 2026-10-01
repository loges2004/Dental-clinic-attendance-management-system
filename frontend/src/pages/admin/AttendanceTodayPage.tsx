import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { attendanceService } from '../../services/attendanceService';
import { branchService } from '../../services/branchService';
import { CalendarCheck, Filter } from 'lucide-react';

function formatTime(iso?: string | null) {
  if (!iso) return '--';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function statusBadge(status: string, isLate: boolean) {
  const cls = status === 'PRESENT' ? 'badge-emerald' : status === 'LATE' ? 'badge-amber' : status === 'ON_LEAVE' ? 'badge-cyan' : status === 'ABSENT' ? 'badge-rose' : 'badge-gray';
  return (
    <div style={{ display: 'flex', gap: '0.35rem' }}>
      <span className={`badge ${cls}`}>{status}</span>
      {isLate && <span className="badge badge-amber">Late</span>}
    </div>
  );
}

export default function AttendanceTodayPage() {
  const today = new Date().toISOString().split('T')[0];
  const [branchId, setBranchId] = useState<string>('');

  const { data: attendance, isLoading } = useQuery({
    queryKey: ['attendance-all-today', branchId],
    queryFn: () => attendanceService.getHistory({
      startDate: today, endDate: today,
      ...(branchId ? { branchId: Number(branchId) } : {})
    }),
    refetchInterval: 30000,
  });

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchService.getAllBranches(),
  });

  const checkedIn = attendance?.filter(a => a.checkInAt && !a.checkOutAt).length || 0;
  const late = attendance?.filter(a => a.isLate).length || 0;
  const checkedOut = attendance?.filter(a => a.checkOutAt).length || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Today's Attendance</h1>
        <p style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          {' · '}Auto-refreshes every 30s
        </p>
      </div>

      {/* Live Summary */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(6,182,212,0.15)' }}><CalendarCheck size={20} color="var(--cyan)" /></div>
          <div className="stat-card-value" style={{ color: 'var(--cyan)' }}>{checkedIn}</div>
          <div className="stat-card-label">Currently In</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(16,185,129,0.15)' }}><CalendarCheck size={20} color="var(--emerald)" /></div>
          <div className="stat-card-value" style={{ color: 'var(--emerald)' }}>{checkedOut}</div>
          <div className="stat-card-label">Checked Out</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(245,158,11,0.15)' }}><CalendarCheck size={20} color="var(--amber)" /></div>
          <div className="stat-card-value" style={{ color: 'var(--amber)' }}>{late}</div>
          <div className="stat-card-label">Late Today</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(139,92,246,0.15)' }}><CalendarCheck size={20} color="var(--violet)" /></div>
          <div className="stat-card-value" style={{ color: 'var(--violet)' }}>{attendance?.length || 0}</div>
          <div className="stat-card-label">Total Entries</div>
        </div>
      </div>

      {/* Filter */}
      <div className="glass-card" style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <Filter size={16} color="var(--text-3)" />
        <select
          className="form-select"
          style={{ maxWidth: 220, flex: 1 }}
          value={branchId}
          onChange={e => setBranchId(e.target.value)}
        >
          <option value="">All Branches</option>
          {branches?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {/* Attendance List */}
      {isLoading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : !attendance?.length ? (
        <div className="glass-card p-6" style={{ textAlign: 'center', color: 'var(--text-2)' }}>
          <CalendarCheck size={40} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
          <p>No attendance records for today</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {attendance.map(a => (
            <div key={a.id} className="glass-card" style={{ padding: '0.9rem 1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                    {a.employee.firstName} {a.employee.lastName}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '0.1rem' }}>
                    {a.branch.name} · {a.shift?.name || 'Default Shift'}
                  </div>
                </div>
                {statusBadge(a.status, a.isLate)}
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.55rem', fontSize: '0.82rem', flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--emerald)' }}>↑ {formatTime(a.checkInAt)}</span>
                <span style={{ color: 'var(--rose)' }}>↓ {formatTime(a.checkOutAt)}</span>
                {a.checkInDistance != null && (
                  <span style={{ color: 'var(--text-3)' }}>GPS: {a.checkInDistance}m</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
