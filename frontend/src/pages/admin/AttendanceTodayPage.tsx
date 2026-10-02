import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceService } from '../../services/attendanceService';
import { branchService } from '../../services/branchService';
import { regularizationService } from '../../services/regularizationService';
import { showAlert } from '../../utils/alerts';
import ManualAttendanceModal from '../../components/attendance/ManualAttendanceModal';
import {
  CalendarCheck, Filter, Plus, Clock, CheckCircle2,
  XCircle, AlertCircle, ChevronDown, ChevronUp, Timer
} from 'lucide-react';
import type { AttendanceRegularizationRequest, Attendance } from '../../types';

function formatTime(iso?: string | null) {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatMinutes(totalMins?: number | null) {
  if (!totalMins) return '0 hrs 00 mins';
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return `${hrs}h ${mins.toString().padStart(2, '0')}m`;
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
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LATE' | 'IN' | 'OUT'>('ALL');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  // Live Attendance
  const { data: attendance, isLoading, refetch: refetchAttendance } = useQuery({
    queryKey: ['attendance-all-today', branchId],
    queryFn: () => attendanceService.getHistory({
      startDate: today, endDate: today,
      ...(branchId ? { branchId: Number(branchId) } : {})
    }),
    refetchInterval: 15000,
  });

  const filteredAttendance = attendance?.filter(a => {
    if (statusFilter === 'LATE') return a.isLate;
    if (statusFilter === 'IN') return a.currentSessionStatus === 'CHECKED_IN';
    if (statusFilter === 'OUT') return a.currentSessionStatus === 'CHECKED_OUT';
    return true;
  }) || [];


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

  const currentlyInStaff = attendance?.filter(a => a.currentSessionStatus === 'CHECKED_IN').length || 0;
  const late = attendance?.filter(a => a.isLate).length || 0;
  const checkedOutStaff = attendance?.filter(a => a.currentSessionStatus === 'CHECKED_OUT').length || 0;
  const pendingRequests = regRequests?.filter(r => r.status === 'PENDING') || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Attendance & Staff Working Hours</h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            {' · '}Auto-refreshes every 15s
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
              <div className="stat-card-value" style={{ color: 'var(--cyan)' }}>{currentlyInStaff}</div>
              <div className="stat-card-label">Currently In Clinic</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon" style={{ background: 'rgba(16,185,129,0.15)' }}><CalendarCheck size={20} color="var(--emerald)" /></div>
              <div className="stat-card-value" style={{ color: 'var(--emerald)' }}>{checkedOutStaff}</div>
              <div className="stat-card-label">Checked Out (Break/Done)</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon" style={{ background: 'rgba(245,158,11,0.15)' }}><CalendarCheck size={20} color="var(--amber)" /></div>
              <div className="stat-card-value" style={{ color: 'var(--amber)' }}>{late}</div>
              <div className="stat-card-label">Late Today</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon" style={{ background: 'rgba(139,92,246,0.15)' }}><CalendarCheck size={20} color="var(--violet)" /></div>
              <div className="stat-card-value" style={{ color: 'var(--violet)' }}>{attendance?.length || 0}</div>
              <div className="stat-card-label">Total Staff Logged</div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="glass-card" style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 200 }}>
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

            {/* Status Filter Buttons */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setStatusFilter('ALL')}
                style={{
                  background: statusFilter === 'ALL' ? 'var(--primary)' : 'rgba(255,255,255,0.06)',
                  color: statusFilter === 'ALL' ? '#fff' : 'var(--text-2)',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                }}
              >
                All ({attendance?.length || 0})
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setStatusFilter('LATE')}
                style={{
                  background: statusFilter === 'LATE' ? 'var(--amber)' : 'rgba(245,158,11,0.12)',
                  color: statusFilter === 'LATE' ? '#000' : 'var(--amber)',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                }}
              >
                Late Arrivals ({late})
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setStatusFilter('IN')}
                style={{
                  background: statusFilter === 'IN' ? 'var(--emerald)' : 'rgba(16,185,129,0.12)',
                  color: statusFilter === 'IN' ? '#fff' : 'var(--emerald)',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                }}
              >
                Currently In ({currentlyInStaff})
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setStatusFilter('OUT')}
                style={{
                  background: statusFilter === 'OUT' ? 'var(--rose)' : 'rgba(244,63,94,0.12)',
                  color: statusFilter === 'OUT' ? '#fff' : 'var(--rose)',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                }}
              >
                Checked Out ({checkedOutStaff})
              </button>
            </div>
          </div>

          {/* Attendance List */}
          {isLoading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : !filteredAttendance?.length ? (
            <div className="glass-card p-6" style={{ textAlign: 'center', color: 'var(--text-2)' }}>
              <CalendarCheck size={40} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
              <p>No matching attendance records found</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filteredAttendance.map((a: Attendance) => {

                const isCurrentlyIn = a.currentSessionStatus === 'CHECKED_IN';
                const sessions = a.sessions || [];
                const isExpanded = expandedRow === a.id;
                const hoursFormatted = formatMinutes(a.totalWorkMinutes);

                return (
                  <div
                    key={a.id}
                    className="glass-card"
                    style={{
                      padding: '1rem 1.25rem',
                      borderLeft: isCurrentlyIn ? '4px solid var(--emerald)' : '4px solid var(--border)',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                      {/* Left: Employee Info */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-1)' }}>
                            {a.employee.firstName} {a.employee.lastName}
                          </span>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '0.15rem 0.5rem',
                              borderRadius: '4px',
                              background: 'rgba(255,255,255,0.06)',
                              color: 'var(--text-2)',
                            }}
                          >
                            {a.employee.user?.role?.name || a.employee.designation || 'Staff'}
                          </span>
                          {statusBadge(a.status, a.isLate)}
                        </div>

                        <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: '0.2rem' }}>
                          {a.branch?.name || 'Clinic'} · {a.shift?.name || 'Standard Shift'}
                          {a.notes && <span style={{ color: 'var(--cyan)', marginLeft: '0.4rem' }}>({a.notes})</span>}
                        </div>
                      </div>

                      {/* Right: Total Clinic Hours Badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <div
                          style={{
                            background: 'rgba(6, 182, 212, 0.12)',
                            border: '1px solid rgba(6, 182, 212, 0.3)',
                            padding: '0.4rem 0.85rem',
                            borderRadius: 'var(--r-md)',
                            textAlign: 'right',
                          }}
                        >
                          <div style={{ fontSize: '0.68rem', color: 'var(--cyan)', fontWeight: 700, textTransform: 'uppercase' }}>
                            Total Worked Today
                          </div>
                          <div style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                            <Timer size={14} color="var(--cyan)" />
                            {hoursFormatted}
                          </div>
                        </div>

                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '0.35rem 0.7rem',
                            borderRadius: '999px',
                            background: isCurrentlyIn ? 'rgba(16,185,129,0.18)' : 'rgba(244,63,94,0.12)',
                            color: isCurrentlyIn ? 'var(--emerald)' : 'var(--rose)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                          }}
                        >
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: isCurrentlyIn ? 'var(--emerald)' : 'var(--rose)' }} />
                          {isCurrentlyIn ? `In (Session #${sessions.length || 1})` : 'Checked Out'}
                        </span>
                      </div>
                    </div>

                    {/* Punch Times Bar */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '0.75rem',
                        paddingTop: '0.65rem',
                        borderTop: '1px solid rgba(255,255,255,0.05)',
                        fontSize: '0.82rem',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                      }}
                    >
                      <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                        <span style={{ color: 'var(--emerald)' }}>↑ First In: {formatTime(a.checkInAt)}</span>
                        <span style={{ color: a.checkOutAt ? 'var(--rose)' : 'var(--text-3)' }}>
                          ↓ Latest Out: {a.checkOutAt ? formatTime(a.checkOutAt) : 'Currently In Duty'}
                        </span>
                        {a.checkInDistance != null ? (
                          <span style={{ color: 'var(--text-3)' }}>GPS: {a.checkInDistance}m</span>
                        ) : (
                          <span style={{ color: 'var(--cyan)' }}>Manual / Regularized</span>
                        )}
                      </div>

                      {sessions.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setExpandedRow(isExpanded ? null : a.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--primary)',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3,
                          }}
                        >
                          {sessions.length} {sessions.length === 1 ? 'Session' : 'Sessions'} (Breakdown)
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      )}
                    </div>

                    {/* Expandable Session Breakdown */}
                    {isExpanded && sessions.length > 0 && (
                      <div
                        style={{
                          marginTop: '0.75rem',
                          background: 'rgba(0, 0, 0, 0.25)',
                          borderRadius: '8px',
                          padding: '0.75rem 1rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem',
                        }}
                      >
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}>
                          Today's Session Details:
                        </div>
                        {sessions.map((s, idx) => {
                          const isSessIn = !s.checkOutAt;
                          const sessMins = s.durationMinutes || 0;
                          return (
                            <div
                              key={s.id || idx}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '0.8rem',
                                padding: '0.35rem 0',
                                borderBottom: idx < sessions.length - 1 ? '1px dashed rgba(255,255,255,0.06)' : 'none',
                              }}
                            >
                              <div>
                                <strong style={{ color: 'var(--text-1)' }}>Session #{s.sessionNumber || idx + 1}:</strong>{' '}
                                <span style={{ color: 'var(--emerald)' }}>{formatTime(s.checkInAt)}</span>
                                {' → '}
                                <span style={{ color: s.checkOutAt ? 'var(--rose)' : 'var(--cyan)' }}>
                                  {s.checkOutAt ? formatTime(s.checkOutAt) : 'Active In Duty'}
                                </span>
                              </div>
                              <div style={{ fontWeight: 700, color: isSessIn ? 'var(--cyan)' : 'var(--text-1)' }}>
                                {isSessIn ? 'In Progress' : `${Math.floor(sessMins / 60)}h ${sessMins % 60}m`}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
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
