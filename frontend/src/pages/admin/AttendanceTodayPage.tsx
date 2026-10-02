import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceService } from '../../services/attendanceService';
import { branchService } from '../../services/branchService';
import { regularizationService } from '../../services/regularizationService';
import { showAlert } from '../../utils/alerts';
import ManualAttendanceModal from '../../components/attendance/ManualAttendanceModal';
import { CalendarCheck, Filter, Plus, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import type { AttendanceRegularizationRequest } from '../../types';

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
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];
  const [branchId, setBranchId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'live' | 'requests'>('live');
  const [showManualModal, setShowManualModal] = useState(false);

  // Live Attendance
  const { data: attendance, isLoading, refetch: refetchAttendance } = useQuery({
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

  // Regularization Requests
  const { data: regRequests, isLoading: loadingReg, refetch: refetchReg } = useQuery({
    queryKey: ['all-regularization-requests'],
    queryFn: () => regularizationService.getAllRequests(),
    refetchInterval: 20000,
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => regularizationService.approve(id),
    onSuccess: () => {
      showAlert.success('Approved!', 'Attendance regularization has been approved and logged.');
      queryClient.invalidateQueries({ queryKey: ['all-regularization-requests'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-all-today'] });
      refetchAttendance();
      refetchReg();
    },
    onError: (err: any) => {
      showAlert.error('Approval Failed', err.response?.data?.message || 'Could not approve request');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => regularizationService.reject(id, reason),
    onSuccess: () => {
      showAlert.success('Rejected', 'Request has been rejected.');
      queryClient.invalidateQueries({ queryKey: ['all-regularization-requests'] });
      refetchReg();
    },
    onError: (err: any) => {
      showAlert.error('Rejection Failed', err.response?.data?.message || 'Could not reject request');
    },
  });

  const handleApprove = async (req: AttendanceRegularizationRequest) => {
    const confirmed = await showAlert.confirm(
      'Approve Request?',
      `Approve missed check-in for ${req.employee.firstName} ${req.employee.lastName} on ${req.attendanceDate} (${req.requestedCheckInTime}${req.requestedCheckOutTime ? ' to ' + req.requestedCheckOutTime : ''})?`,
      'Yes, Approve',
      'question'
    );
    if (confirmed) {
      approveMutation.mutate(req.id);
    }
  };

  const handleReject = async (req: AttendanceRegularizationRequest) => {
    const reason = prompt('Please enter reason for rejection:', 'Not approved by management');
    if (reason !== null) {
      rejectMutation.mutate({ id: req.id, reason: reason.trim() || 'Rejected by Admin' });
    }
  };

  const checkedIn = attendance?.filter(a => a.checkInAt && !a.checkOutAt).length || 0;
  const late = attendance?.filter(a => a.isLate).length || 0;
  const checkedOut = attendance?.filter(a => a.checkOutAt).length || 0;
  const pendingRequests = regRequests?.filter(r => r.status === 'PENDING') || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Attendance & Missed Punches</h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            {' · '}Auto-refreshes every 30s
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowManualModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Plus size={16} /> Manual Attendance Entry
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.25rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab('live')}
          style={{
            padding: '0.6rem 1.2rem',
            borderRadius: 'var(--r-md)',
            fontWeight: 700,
            fontSize: '0.9rem',
            border: 'none',
            cursor: 'pointer',
            background: activeTab === 'live' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
            color: activeTab === 'live' ? '#fff' : 'var(--text-2)',
            transition: 'all 0.2s',
          }}
        >
          Today's Live Records ({attendance?.length || 0})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('requests')}
          style={{
            padding: '0.6rem 1.2rem',
            borderRadius: 'var(--r-md)',
            fontWeight: 700,
            fontSize: '0.9rem',
            border: 'none',
            cursor: 'pointer',
            background: activeTab === 'requests' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
            color: activeTab === 'requests' ? '#fff' : 'var(--text-2)',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span>Missed Check-In Requests</span>
          {pendingRequests.length > 0 && (
            <span
              style={{
                background: 'var(--rose)',
                color: '#fff',
                fontSize: '0.75rem',
                padding: '0.1rem 0.5rem',
                borderRadius: '999px',
                fontWeight: 800,
              }}
            >
              {pendingRequests.length} pending
            </span>
          )}
        </button>
      </div>

      {activeTab === 'live' ? (
        <>
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
                        {a.branch?.name || 'Clinic'} · {a.shift?.name || 'Default Shift'}
                        {a.notes && <span style={{ color: 'var(--cyan)', marginLeft: '0.5rem' }}>({a.notes})</span>}
                      </div>
                    </div>
                    {statusBadge(a.status, a.isLate)}
                  </div>
                  <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.55rem', fontSize: '0.82rem', flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--emerald)' }}>↑ In: {formatTime(a.checkInAt)}</span>
                    <span style={{ color: 'var(--rose)' }}>↓ Out: {formatTime(a.checkOutAt)}</span>
                    {a.checkInDistance != null ? (
                      <span style={{ color: 'var(--text-3)' }}>GPS: {a.checkInDistance}m</span>
                    ) : (
                      <span style={{ color: 'var(--cyan)' }}>Manual / Regularized</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Regularization Requests Tab */
        <div>
          {loadingReg ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : !regRequests?.length ? (
            <div className="glass-card p-6" style={{ textAlign: 'center', color: 'var(--text-2)' }}>
              <Clock size={40} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
              <p>No missed check-in / regularization requests submitted.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {regRequests.map(req => {
                const isPending = req.status === 'PENDING';
                return (
                  <div
                    key={req.id}
                    className="glass-card"
                    style={{
                      padding: '1.1rem 1.35rem',
                      borderLeft: isPending ? '4px solid var(--amber)' : req.status === 'APPROVED' ? '4px solid var(--emerald)' : '4px solid var(--rose)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-1)' }}>
                          {req.employee.firstName} {req.employee.lastName}
                          <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-3)', marginLeft: '0.5rem' }}>
                            ({req.employee.user?.role?.name || req.employee.designation || 'Staff'}) · {req.employee.branch?.name}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--cyan)', marginTop: '0.2rem', fontWeight: 600 }}>
                          Date: {req.attendanceDate} · Requested In: {req.requestedCheckInTime} {req.requestedCheckOutTime ? `· Out: ${req.requestedCheckOutTime}` : ''}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {isPending ? (
                          <>
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              onClick={() => handleApprove(req)}
                              disabled={approveMutation.isPending || rejectMutation.isPending}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                            >
                              <CheckCircle2 size={14} /> Approve
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              onClick={() => handleReject(req)}
                              disabled={approveMutation.isPending || rejectMutation.isPending}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                            >
                              <XCircle size={14} /> Reject
                            </button>
                          </>
                        ) : (
                          <span
                            className={`badge ${req.status === 'APPROVED' ? 'badge-emerald' : 'badge-rose'}`}
                            style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }}
                          >
                            {req.status}
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: '0.75rem',
                        background: 'rgba(0, 0, 0, 0.25)',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '6px',
                        fontSize: '0.84rem',
                        color: 'var(--text-2)',
                      }}
                    >
                      <strong style={{ color: 'var(--text-1)' }}>Reason:</strong> {req.reason}
                    </div>

                    {req.rejectionReason && (
                      <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: 'var(--rose)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <AlertCircle size={14} /> Rejection Note: {req.rejectionReason}
                      </div>
                    )}

                    <div style={{ marginTop: '0.4rem', fontSize: '0.72rem', color: 'var(--text-3)' }}>
                      Submitted: {new Date(req.createdAt).toLocaleString('en-IN')}
                      {req.actionBy && ` · Processed by: ${req.actionBy.username}`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Manual Attendance Modal */}
      <ManualAttendanceModal
        isOpen={showManualModal}
        onClose={() => setShowManualModal(false)}
        onSuccess={() => {
          refetchAttendance();
          refetchReg();
        }}
      />
    </div>
  );
}
