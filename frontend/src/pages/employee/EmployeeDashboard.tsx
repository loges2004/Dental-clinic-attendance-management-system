import { useQuery } from '@tanstack/react-query';
import { attendanceService } from '../../services/attendanceService';
import { leaveService } from '../../services/leaveService';
import { useAuth } from '../../context/AuthContext';
import {
  CalendarCheck, Clock, CheckCircle2, AlertCircle, BookOpen,
  TrendingUp, Zap
} from 'lucide-react';

export default function EmployeeDashboard({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { user } = useAuth();
  const now = new Date();

  const { data: todayAtt } = useQuery({
    queryKey: ['attendance-today'],
    queryFn: () => attendanceService.getToday(),
    refetchInterval: 30000,
  });

  const { data: history } = useQuery({
    queryKey: ['attendance-history-dash'],
    queryFn: () => attendanceService.getHistory(),
  });

  const { data: leaveBalance } = useQuery({
    queryKey: ['leave-balance'],
    queryFn: () => leaveService.getMyBalance(),
  });

  const { data: leaveHistory } = useQuery({
    queryKey: ['leave-history-mine'],
    queryFn: () => leaveService.getMyLeaveHistory(),
  });

  const greetTime = now.getHours() < 12 ? 'Morning' : now.getHours() < 17 ? 'Afternoon' : 'Evening';
  const recentDays = history?.slice(0, 7) || [];
  const presentDays = recentDays.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
  const lateDays = recentDays.filter(a => a.isLate).length;
  const pendingLeaves = leaveHistory?.filter(l => l.status === 'PENDING').length || 0;

  const formatTime = (iso?: string | null) => {
    if (!iso) return '--:--';
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Greeting */}
      <div className="glass-card p-5">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Good {greetTime}!</h1>
            <p style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>
              {user?.firstName} {user?.lastName} · {user?.designation || user?.role}
            </p>
            <p style={{ color: 'var(--text-3)', fontSize: '0.78rem' }}>
              {user?.branchName}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--primary-light)' }}>
              {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>
              {now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
            </div>
          </div>
        </div>
      </div>

      {/* Today's Attendance Status */}
      <div
        className="glass-card"
        style={{ padding: '1.25rem', cursor: 'pointer' }}
        onClick={() => onNavigate('attendance-today')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: todayAtt?.checkOutAt
              ? 'rgba(16,185,129,0.15)' : todayAtt?.checkInAt
              ? 'rgba(6,182,212,0.15)' : 'rgba(245,158,11,0.15)',
            border: `2px solid ${todayAtt?.checkOutAt
              ? 'rgba(16,185,129,0.40)' : todayAtt?.checkInAt
              ? 'rgba(6,182,212,0.40)' : 'rgba(245,158,11,0.40)'}`,
          }}>
            {todayAtt?.checkOutAt ? <CheckCircle2 size={24} color="var(--emerald)" />
              : todayAtt?.checkInAt ? <Clock size={24} color="var(--cyan)" />
              : <AlertCircle size={24} color="var(--amber)" />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>
              {todayAtt?.checkOutAt ? 'Attendance Complete'
                : todayAtt?.checkInAt ? 'Currently Working'
                : 'Not Checked In'}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-2)' }}>
              {todayAtt?.checkInAt
                ? `In: ${formatTime(todayAtt.checkInAt)}${todayAtt.checkOutAt ? ` → Out: ${formatTime(todayAtt.checkOutAt)}` : ' · Tap to check out'}`
                : 'Tap here to check in now'}
            </div>
            {todayAtt?.isLate && <span className="badge badge-amber" style={{ marginTop: '0.3rem' }}>Late</span>}
          </div>
          <Zap size={20} color="var(--text-3)" />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(16,185,129,0.15)' }}>
            <CheckCircle2 size={18} color="var(--emerald)" />
          </div>
          <div className="stat-card-value" style={{ color: 'var(--emerald)', fontSize: '1.6rem' }}>{presentDays}</div>
          <div className="stat-card-label">Present (7d)</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(245,158,11,0.15)' }}>
            <Clock size={18} color="var(--amber)" />
          </div>
          <div className="stat-card-value" style={{ color: 'var(--amber)', fontSize: '1.6rem' }}>{lateDays}</div>
          <div className="stat-card-label">Late (7d)</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(6,182,212,0.15)' }}>
            <TrendingUp size={18} color="var(--cyan)" />
          </div>
          <div className="stat-card-value" style={{ color: 'var(--cyan)', fontSize: '1.6rem' }}>
            {leaveBalance?.remaining ?? '--'}
          </div>
          <div className="stat-card-label">Leave Left</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(139,92,246,0.15)' }}>
            <BookOpen size={18} color="var(--violet)" />
          </div>
          <div className="stat-card-value" style={{ color: 'var(--violet)', fontSize: '1.6rem' }}>{pendingLeaves}</div>
          <div className="stat-card-label">Pending Leaves</div>
        </div>
      </div>

      {/* Recent Attendance */}
      <div className="glass-card p-5">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>Recent Attendance</h3>
          <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('attendance-history')}>
            View All
          </button>
        </div>
        {!recentDays.length ? (
          <p style={{ color: 'var(--text-3)', textAlign: 'center', padding: '1rem', fontSize: '0.875rem' }}>No records yet</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {recentDays.map(a => (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.55rem 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                    {new Date(a.attendanceDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </span>
                  <span style={{ color: 'var(--text-3)', fontSize: '0.78rem', marginLeft: '0.5rem' }}>
                    {formatTime(a.checkInAt)} → {formatTime(a.checkOutAt)}
                  </span>
                </div>
                <span className={`badge ${a.status === 'PRESENT' ? 'badge-emerald' : a.isLate ? 'badge-amber' : 'badge-rose'}`}>
                  {a.isLate ? 'Late' : a.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <button
          className="glass-card"
          style={{ padding: '1.1rem', border: 'none', cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}
          onClick={() => onNavigate('leave-apply')}
        >
          <BookOpen size={22} color="var(--primary-light)" />
          <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-1)' }}>Apply Leave</span>
        </button>
        <button
          className="glass-card"
          style={{ padding: '1.1rem', border: 'none', cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}
          onClick={() => onNavigate('leave-history')}
        >
          <CalendarCheck size={22} color="var(--cyan)" />
          <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-1)' }}>Leave History</span>
        </button>
      </div>
    </div>
  );
}
