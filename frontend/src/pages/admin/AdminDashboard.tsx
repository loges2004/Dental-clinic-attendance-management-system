import { useQuery } from '@tanstack/react-query';
import { attendanceService } from '../../services/attendanceService';
import { leaveService } from '../../services/leaveService';
import { employeeService } from '../../services/branchService';
import { Users, CalendarCheck, Clock, AlertCircle, CheckCircle2, BookOpen, Building2, Timer } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
}

function StatCard({ label, value, icon, color, onClick }: StatCardProps) {
  return (
    <div
      className="stat-card"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default', transition: 'all 0.2s' }}
    >
      <div className="stat-card-icon" style={{ background: `${color}18` }}>
        <div style={{ color }}>{icon}</div>
      </div>
      <div className="stat-card-value" style={{ color }}>{value}</div>
      <div className="stat-card-label">{label}</div>
    </div>
  );
}

function formatMinutes(totalMins?: number | null) {
  if (!totalMins) return '0h 00m';
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return `${hrs}h ${mins.toString().padStart(2, '0')}m`;
}

export default function AdminDashboard({ onNavigate }: { onNavigate: (p: string) => void }) {
  const today = new Date().toISOString().split('T')[0];

  const { data: todayAttendance } = useQuery({
    queryKey: ['attendance-today-all'],
    queryFn: () => attendanceService.getHistory({ startDate: today, endDate: today }),
    refetchInterval: 30000,
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
  const lateStaffList = todayAttendance?.filter(a => a.isLate) || [];
  const onLeave = todayAttendance?.filter(a => a.status === 'ON_LEAVE').length || 0;

  const absent = Math.max(0, totalEmp - todayTotal);
  const pendingCount = pendingLeaves?.length || 0;

  const recentCheckins = todayAttendance?.slice(0, 10) || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Welcome */}
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Clinic Attendance Overview</h1>
        <p style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          {' · '}Auto-refreshes every 30s
        </p>
      </div>

      {/* Key Stats */}
      <div className="stat-grid">
        <StatCard label="Total Staff" value={totalEmp} icon={<Users size={20} />} color="var(--cyan)" onClick={() => onNavigate('employees')} />
        <StatCard label="Present Today" value={present} icon={<CheckCircle2 size={20} />} color="var(--emerald)" onClick={() => onNavigate('attendance-today')} />
        <StatCard label="Late Today" value={late} icon={<Clock size={20} />} color="var(--amber)" onClick={() => onNavigate('attendance-today')} />
        <StatCard label="Absent Today" value={absent} icon={<AlertCircle size={20} />} color="var(--rose)" />
        <StatCard label="On Leave" value={onLeave} icon={<CalendarCheck size={20} />} color="var(--violet)" onClick={() => onNavigate('leave-requests')} />
        <StatCard label="Pending Leaves" value={pendingCount} icon={<BookOpen size={20} />} color="var(--amber)" onClick={() => onNavigate('leave-requests')} />
      </div>

      {/* Late Staff Alert Banner (If Any) */}
      {lateStaffList.length > 0 && (
        <div
          className="glass-card"
          style={{
            padding: '1rem 1.25rem',
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1.5px solid rgba(245, 158, 11, 0.35)',
            cursor: 'pointer',
          }}
          onClick={() => onNavigate('attendance-today')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--r-sm)', background: 'rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={18} color="var(--amber)" />
              </div>
              <div>
                <div style={{ fontWeight: 800, color: '#fbbf24', fontSize: '0.95rem' }}>
                  {lateStaffList.length} Staff Member{lateStaffList.length !== 1 ? 's' : ''} Arrived Late Today
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-2)', marginTop: 2 }}>
                  {lateStaffList.map(l => `${l.employee.firstName} ${l.employee.lastName} (${new Date(l.checkInAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })})`).join(', ')}
                </div>
              </div>
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--amber)' }}>
              View Details →
            </span>
          </div>
        </div>
      )}

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
          <div>
            <h2 style={{ fontWeight: 800, fontSize: '1.05rem' }}>Today's Staff Activity</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Real-time check-in, check-out and total working hours</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('attendance-today')}>
            View All ({todayTotal}) →
          </button>
        </div>
        {!recentCheckins.length ? (
          <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: '1.5rem', fontSize: '0.875rem' }}>
            No attendance records for today yet
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {recentCheckins.map(a => {
              const isCurrentlyIn = a.currentSessionStatus === 'CHECKED_IN';
              return (
                <div
                  key={a.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem 0.9rem',
                    borderRadius: 'var(--r-sm)',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-1)' }}>
                      {a.employee.firstName} {a.employee.lastName}
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginLeft: '0.4rem', fontWeight: 500 }}>
                        ({a.employee.user?.role?.name || a.employee.designation || 'Staff'})
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: 2 }}>
                      {a.branch?.name} · In: {new Date(a.checkInAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      {a.checkOutAt && ` · Out: ${new Date(a.checkOutAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--cyan)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Timer size={13} /> {formatMinutes(a.totalWorkMinutes)}
                    </div>
                    {a.isLate && (
                      <span className="badge badge-amber" style={{ fontSize: '0.72rem', fontWeight: 800 }}>
                        LATE
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.6rem',
                        borderRadius: '4px',
                        background: isCurrentlyIn ? 'rgba(16,185,129,0.18)' : 'rgba(244,63,94,0.12)',
                        color: isCurrentlyIn ? 'var(--emerald)' : 'var(--rose)',
                      }}
                    >
                      {isCurrentlyIn ? 'IN CLINIC' : 'OUT'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Navigation Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
        <button
          className="glass-card"
          style={{ padding: '1.1rem', border: 'none', cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
          onClick={() => onNavigate('employees')}
        >
          <Users size={22} color="var(--cyan)" />
          <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-1)' }}>Manage Staff</span>
        </button>
        <button
          className="glass-card"
          style={{ padding: '1.1rem', border: 'none', cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
          onClick={() => onNavigate('attendance-today')}
        >
          <Clock size={22} color="var(--amber)" />
          <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-1)' }}>Missed Punches & Hours</span>
        </button>
        <button
          className="glass-card"
          style={{ padding: '1.1rem', border: 'none', cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
          onClick={() => onNavigate('branches')}
        >
          <Building2 size={22} color="var(--primary-light)" />
          <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-1)' }}>Branches</span>
        </button>
      </div>
    </div>
  );
}
