import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leaveService } from '../../services/leaveService';
import { CheckCircle2, XCircle, BookOpen, Search, UserCheck } from 'lucide-react';
import { showAlert } from '../../utils/alerts';

function formatDate(d?: string) {
  if (!d) return '--';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(d?: string | null) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function LeaveRequestsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  const [searchTerm, setSearchTerm] = useState('');
  const [rejectionInput, setRejectionInput] = useState<{ id: number; reason: string } | null>(null);

  const { data: allRequests } = useQuery({
    queryKey: ['leave-requests', 'ALL'],
    queryFn: () => leaveService.getAllLeaveRequests('ALL'),
  });

  const { data: requests, isLoading } = useQuery({
    queryKey: ['leave-requests', filter],
    queryFn: () => leaveService.getAllLeaveRequests(filter),
  });

  const approveMut = useMutation({
    mutationFn: (id: number) => leaveService.approveLeave(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave-requests'] });
      qc.invalidateQueries({ queryKey: ['leave-pending'] });
      qc.invalidateQueries({ queryKey: ['attendance-today-all'] });
      showAlert.success('Leave Approved!', 'Leave application has been approved and leave balance deducted.');
    },
    onError: (err: any) => showAlert.error('Approval Failed', err.response?.data?.message || 'Could not approve leave.'),
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => leaveService.rejectLeave(id, reason),
    onSuccess: () => {
      setRejectionInput(null);
      qc.invalidateQueries({ queryKey: ['leave-requests'] });
      qc.invalidateQueries({ queryKey: ['leave-pending'] });
      showAlert.success('Leave Rejected', 'Leave request has been marked as rejected.');
    },
    onError: (err: any) => showAlert.error('Rejection Failed', err.response?.data?.message || 'Could not reject leave.'),
  });

  const handleApprove = async (id: number, empName: string) => {
    const ok = await showAlert.confirm(`Approve leave for ${empName}?`, 'This will deduct from employee leave balance.', 'Yes, Approve');
    if (ok) approveMut.mutate(id);
  };

  const pendingCount = allRequests?.filter(r => r.status === 'PENDING').length || 0;
  const approvedCount = allRequests?.filter(r => r.status === 'APPROVED').length || 0;
  const rejectedCount = allRequests?.filter(r => r.status === 'REJECTED').length || 0;
  const totalCount = allRequests?.length || 0;

  const STATUS_TABS: Array<{ id: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'; label: string; count: number }> = [
    { id: 'PENDING', label: 'Pending', count: pendingCount },
    { id: 'APPROVED', label: 'Approved', count: approvedCount },
    { id: 'REJECTED', label: 'Rejected', count: rejectedCount },
    { id: 'ALL', label: 'All Requests', count: totalCount },
  ];

  const filteredRequests = (requests || []).filter(lr => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const name = `${lr.employee.firstName} ${lr.employee.lastName}`.toLowerCase();
    const code = (lr.employee.employeeCode || '').toLowerCase();
    const branch = (lr.employee.branch?.name || '').toLowerCase();
    return name.includes(term) || code.includes(term) || branch.includes(term);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Leave Requests</h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>Review, approve, and track staff leave applications</p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', overflow: 'auto', paddingBottom: '0.25rem' }}>
          {STATUS_TABS.map(tab => (
            <button
              key={tab.id}
              className={`btn btn-sm ${filter === tab.id ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilter(tab.id)}
              style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <span>{tab.label}</span>
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '0.1rem 0.45rem',
                  borderRadius: '10px',
                  background: filter === tab.id ? 'rgba(255,255,255,0.25)' : 'var(--bg-surface)',
                  fontWeight: 700
                }}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: 220 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
          <input
            className="form-input"
            style={{ paddingLeft: '2rem', height: '34px', fontSize: '0.82rem' }}
            placeholder="Search employee / branch..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : !filteredRequests.length ? (
        <div className="glass-card p-6" style={{ textAlign: 'center', color: 'var(--text-2)' }}>
          <BookOpen size={40} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
          <p>No {filter !== 'ALL' ? filter.toLowerCase() : ''} leave requests found{searchTerm ? ` matching "${searchTerm}"` : ''}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredRequests.map(lr => (
            <div key={lr.id} className="glass-card" style={{ padding: '1.1rem 1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.65rem' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.98rem' }}>
                    {lr.employee.firstName} {lr.employee.lastName}
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginLeft: '0.4rem', fontWeight: 500 }}>
                      ({lr.employee.employeeCode || `ID: ${lr.employee.id}`})
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
                    {lr.employee.branch?.name || 'All Branches'} · {lr.employee.designation || lr.employee.user?.role?.name?.replace('_', ' ')}
                  </div>
                </div>
                <span className={`badge ${lr.status === 'APPROVED' ? 'badge-emerald' : lr.status === 'PENDING' ? 'badge-amber' : lr.status === 'REJECTED' ? 'badge-rose' : 'badge-gray'}`}>
                  {lr.status}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.82rem', marginBottom: '0.65rem' }}>
                <span style={{ color: 'var(--text-2)' }}>📋 <strong>{lr.leaveType?.name}</strong> ({lr.durationType?.replace('_', ' ') || 'FULL DAY'})</span>
                <span style={{ color: 'var(--text-2)' }}>📅 {formatDate(lr.startDate)} – {formatDate(lr.endDate)}</span>
                <span style={{ color: 'var(--primary-light)', fontWeight: 700 }}>{lr.duration} day{lr.duration !== 1 ? 's' : ''}</span>
              </div>

              <div style={{ fontSize: '0.84rem', color: 'var(--text-2)', marginBottom: '0.65rem', background: 'var(--bg-surface)', padding: '0.55rem 0.8rem', borderRadius: 'var(--r-sm)' }}>
                <strong>Reason:</strong> {lr.reason}
              </div>

              {/* Pending Action Buttons */}
              {lr.status === 'PENDING' && (
                <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1, minWidth: 110 }}
                    onClick={() => handleApprove(lr.id, `${lr.employee.firstName} ${lr.employee.lastName}`)}
                    disabled={approveMut.isPending}
                    id={`approve-leave-${lr.id}`}
                  >
                    <CheckCircle2 size={14} /> Approve Leave
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    style={{ flex: 1, minWidth: 110 }}
                    onClick={() => setRejectionInput({ id: lr.id, reason: '' })}
                    id={`reject-leave-${lr.id}`}
                  >
                    <XCircle size={14} /> Reject Leave
                  </button>
                </div>
              )}

              {/* Approver Details Display (User Requirement: Mention which admin approved) */}
              {lr.status === 'APPROVED' && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.8rem',
                  color: 'var(--emerald)',
                  background: 'rgba(16, 185, 129, 0.10)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  padding: '0.45rem 0.8rem',
                  borderRadius: 'var(--r-sm)',
                  marginTop: '0.5rem',
                  width: 'fit-content'
                }}>
                  <UserCheck size={15} />
                  <span>
                    <strong>Approved by:</strong> {lr.approvedBy?.username || 'Admin'} {lr.approvedAt ? `on ${formatDateTime(lr.approvedAt)}` : ''}
                  </span>
                </div>
              )}

              {/* Rejection Details Display */}
              {lr.status === 'REJECTED' && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                  fontSize: '0.8rem',
                  color: 'var(--rose)',
                  background: 'rgba(244, 63, 94, 0.10)',
                  border: '1px solid rgba(244, 63, 94, 0.25)',
                  padding: '0.45rem 0.8rem',
                  borderRadius: 'var(--r-sm)',
                  marginTop: '0.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                    <XCircle size={14} />
                    <span>Rejected by: {lr.approvedBy?.username || 'Admin'} {lr.approvedAt ? `on ${formatDateTime(lr.approvedAt)}` : ''}</span>
                  </div>
                  {lr.rejectionReason && (
                    <div style={{ marginLeft: '1.25rem', fontSize: '0.78rem' }}>
                      <strong>Reason:</strong> {lr.rejectionReason}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Rejection Modal */}
      {rejectionInput && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-title">Reject Leave Request</div>
            <div className="modal-body">Provide a reason for rejecting this leave request for employee notification.</div>
            <textarea
              className="form-textarea"
              placeholder="Enter rejection reason..."
              value={rejectionInput.reason}
              onChange={e => setRejectionInput(r => r ? { ...r, reason: e.target.value } : null)}
              style={{ marginBottom: '1rem', minHeight: 90 }}
            />
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-ghost btn-full" onClick={() => setRejectionInput(null)}>Cancel</button>
              <button
                className="btn btn-danger btn-full"
                disabled={!rejectionInput.reason.trim() || rejectMut.isPending}
                onClick={() => rejectMut.mutate({ id: rejectionInput.id, reason: rejectionInput.reason })}
              >
                {rejectMut.isPending ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
