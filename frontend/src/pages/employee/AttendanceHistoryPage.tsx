import { useQuery } from '@tanstack/react-query';
import { attendanceService } from '../../services/attendanceService';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';

function statusBadge(status: string, isLate: boolean) {
  const cls = status === 'PRESENT' ? 'badge-emerald'
    : status === 'LATE' ? 'badge-amber'
    : status === 'ON_LEAVE' ? 'badge-cyan'
    : status === 'ABSENT' ? 'badge-rose'
    : 'badge-gray';
  return (
    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
      <span className={`badge ${cls}`}>{status}</span>
      {isLate && <span className="badge badge-amber">Late</span>}
    </div>
  );
}

function formatTime(iso?: string | null) {
  if (!iso) return '--';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function AttendanceHistoryPage() {
  const { user, isAdmin } = useAuth();
  const { data: history, isLoading } = useQuery({
    queryKey: ['attendance-history', user?.employeeId],
    queryFn: () => attendanceService.getHistory(
      isAdmin ? {} : { employeeId: user?.employeeId ?? undefined }
    ),
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Attendance History</h1>
        <p style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>Last 30 days of attendance records</p>
      </div>

      {isLoading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : !history?.length ? (
        <div className="glass-card p-6" style={{ textAlign: 'center', color: 'var(--text-2)' }}>
          <CheckCircle2 size={40} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
          <p>No attendance records found</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {history.map(a => (
            <div key={a.id} className="glass-card" style={{ padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{formatDate(a.attendanceDate)}</div>
                  {isAdmin && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: '0.1rem' }}>
                      {a.employee.firstName} {a.employee.lastName} · {a.branch.name}
                    </div>
                  )}
                </div>
                {statusBadge(a.status, a.isLate)}
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.65rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', color: 'var(--emerald)' }}>
                  <CheckCircle2 size={14} />
                  In: {formatTime(a.checkInAt)}
                  {a.checkInDistance != null && (
                    <span style={{ color: 'var(--text-3)', marginLeft: '0.25rem' }}>({a.checkInDistance}m)</span>
                  )}
                </div>
                {a.checkOutAt ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', color: 'var(--rose)' }}>
                    <AlertCircle size={14} />
                    Out: {formatTime(a.checkOutAt)}
                    {a.isEarlyCheckout && <span className="badge badge-rose" style={{ fontSize: '0.65rem' }}>Early</span>}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Clock size={14} />
                    Not checked out
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
