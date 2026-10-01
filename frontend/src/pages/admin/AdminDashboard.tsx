import { useQuery } from '@tanstack/react-query';
import { attendanceService } from '../../services/attendanceService';
import { leaveService } from '../../services/leaveService';
import { employeeService } from '../../services/branchService';
import { Users, CalendarCheck, Clock, AlertCircle, CheckCircle2, BookOpen, Building2 } from 'lucide-react';

interface StatCardProps { label: string; value: number | string; icon: React.ReactNode; color: string; }
function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-card-icon" style={{ background: `${color}18` }}>
        <div style={{ color }}>{icon}</div>
      </div>
      <div className="stat-card-value" style={{ color }}>{value}</div>
      <div className="stat-card-label">{label}</div>
    </div>
  );
}

export default function AdminDashboard({ onNavigate }: { onNavigate: (p: string) => void }) {
  const today = new Date().toISOString().split('T')[0];

  const { data: todayAttendance } = useQuery({
    queryKey: ['attendance-today-all'],
    queryFn: () => attendanceService.getHistory({ startDate: today, endDate: today }),
    refetchInterval: 60000,
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeeService.getAllEmployees(),
  });

  const { data: pendingLeaves } = useQuery({
    queryKey: ['leave-pending'],
    queryFn: () => leaveService.getAllLeaveRequests('PENDING'),
  });

  const totalEmp = employees?.length || 0;
  const todayTotal = todayAttendance?.length || 0;
  const present = todayAttendance?.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length || 0;
  const late = todayAttendance?.filter(a => a.isLate).length || 0;
  const onLeave = todayAttendance?.filter(a => a.status === 'ON_LEAVE').length || 0;

  const absent = totalEmp - todayTotal;
  const pendingCount = pendingLeaves?.length || 0;

  const recentCheckins = todayAttendance?.slice(0, 8) || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Welcome */}
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Dashboard</h1>
        <p style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Key Stats */}
      <div className="stat-grid">
        <StatCard label="Total Staff" value={totalEmp} icon={<Users size={20} />} color="var(--cyan)" />
        <StatCard label="Present Today" value={present} icon={<CheckCircle2 size={20} />} color="var(--emerald)" />
        <StatCard label="Absent Today" value={absent} icon={<AlertCircle size={20} />} color="var(--rose)" />
        <StatCard label="Late Today" value={late} icon={<Clock size={20} />} color="var(--amber)" />
        <StatCard label="On Leave" value={onLeave} icon={<CalendarCheck size={20} />} color="var(--violet)" />
        <StatCard label="Pending Leaves" value={pendingCount} icon={<BookOpen size={20} />} color="var(--amber)" />
      </div>

      {/* Pending Leave Alerts */}
      {pendingCount > 0 && (
        <div
          className="glass-card"
          style={{ padding: '1rem 1.25rem', borderColor: 'rgba(245,158,11,0.35)', cursor: 'pointer' }}
          onClick={() => onNavigate('leave-requests')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: 'var(--r-sm)', background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={18} color="var(--amber)" />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--amber)' }}>{pendingCount} Leave Request{pendingCount !== 1 ? 's' : ''} Awaiting Approval</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>Tap to review and approve</div>
            </div>
          </div>
        </div>
      )}

      {/* Today's Attendance List */}
      <div className="glass-card p-5">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontWeight: 700, fontSize: '1rem' }}>Today's Attendance</h2>
          <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('attendance-today')}>
            View All
          </button>
        </div>
        {!recentCheckins.length ? (
          <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: '1.5rem', fontSize: '0.875rem' }}>
            No attendance records for today yet
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {recentCheckins.map(a => (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    {a.employee.firstName} {a.employee.lastName}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
                    {a.branch.name} · {new Date(a.checkInAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                  <span className={`badge ${a.status === 'PRESENT' ? 'badge-emerald' : a.isLate ? 'badge-amber' : 'badge-cyan'}`}>
                    {a.isLate ? 'Late' : a.status}
                  </span>
                  {!a.checkOutAt && <span className="badge badge-gray">IN</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <button
          className="glass-card"
          style={{ padding: '1.1rem', border: 'none', cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
          onClick={() => onNavigate('employees')}
        >
          <Users size={24} color="var(--cyan)" />
          <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-1)' }}>Manage Staff</span>
        </button>
        <button
          className="glass-card"
          style={{ padding: '1.1rem', border: 'none', cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
          onClick={() => onNavigate('branches')}
        >
          <Building2 size={24} color="var(--primary-light)" />
          <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-1)' }}>Branches</span>
        </button>
      </div>
    </div>
  );
}
