import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leaveService } from '../../services/leaveService';
import { CheckCircle2, XCircle, BookOpen } from 'lucide-react';

function formatDate(d?: string) {
  if (!d) return '--';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function LeaveRequestsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('PENDING');
  const [rejectionInput, setRejectionInput] = useState<{ id: number; reason: string } | null>(null);

  const { data: requests, isLoading } = useQuery({
    queryKey: ['leave-requests', filter],
    queryFn: () => leaveService.getAllLeaveRequests(filter),
  });

  const approveMut = useMutation({
    mutationFn: (id: number) => leaveService.approveLeave(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-requests'] }),
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => leaveService.rejectLeave(id, reason),
    onSuccess: () => { setRejectionInput(null); qc.invalidateQueries({ queryKey: ['leave-requests'] }); },
  });

  const STATUS_TABS = ['PENDING', 'APPROVED', 'REJECTED', 'ALL'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Leave Requests</h1>
        <p style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>Review and manage staff leave applications</p>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', overflow: 'auto', paddingBottom: '0.25rem' }}>
        {STATUS_TABS.map(s => (
          <button
            key={s}
            className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter(s)}
            style={{ whiteSpace: 'nowrap' }}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : !requests?.length ? (
        <div className="glass-card p-6" style={{ textAlign: 'center', color: 'var(--text-2)' }}>
          <BookOpen size={40} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
          <p>No {filter !== 'ALL' ? filter.toLowerCase() : ''} leave requests</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {requests.map(lr => (
            <div key={lr.id} className="glass-card" style={{ padding: '1.1rem 1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.65rem' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                    {lr.employee.firstName} {lr.employee.lastName}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
                    {lr.employee.branch?.name} · {lr.employee.user?.role?.name?.replace('_', ' ')}
                  </div>
                </div>
                <span className={`badge ${lr.status === 'APPROVED' ? 'badge-emerald' : lr.status === 'PENDING' ? 'badge-amber' : lr.status === 'REJECTED' ? 'badge-rose' : 'badge-gray'}`}>
                  {lr.status}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.82rem', marginBottom: '0.65rem' }}>
                <span style={{ color: 'var(--text-2)' }}>📋 {lr.leaveType?.name}</span>
                <span style={{ color: 'var(--text-2)' }}>📅 {formatDate(lr.startDate)} – {formatDate(lr.endDate)}</span>
                <span style={{ color: 'var(--primary-light)', fontWeight: 700 }}>{lr.duration} day{lr.duration !== 1 ? 's' : ''}</span>
              </div>

              <div style={{ fontSize: '0.82rem', color: 'var(--text-2)', marginBottom: '0.65rem' }}>
                {lr.reason}
              </div>

              {lr.status === 'PENDING' && (
                <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1, minWidth: 100 }}
                    onClick={() => approveMut.mutate(lr.id)}
                    disabled={approveMut.isPending}
                    id={`approve-leave-${lr.id}`}
                  >
                    <CheckCircle2 size={14} /> Approve
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    style={{ flex: 1, minWidth: 100 }}
                    onClick={() => setRejectionInput({ id: lr.id, reason: '' })}
                    id={`reject-leave-${lr.id}`}
                  >
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              )}

              {lr.rejectionReason && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--rose)' }}>
                  Rejection reason: {lr.rejectionReason}
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
            <div className="modal-body">Provide a reason for rejecting this leave request.</div>
            <textarea
              className="form-textarea"
              placeholder="Rejection reason..."
              value={rejectionInput.reason}
              onChange={e => setRejectionInput(r => r ? { ...r, reason: e.target.value } : null)}
              style={{ marginBottom: '1rem' }}
            />
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-ghost btn-full" onClick={() => setRejectionInput(null)}>Cancel</button>
              <button
                className="btn btn-danger btn-full"
                disabled={!rejectionInput.reason.trim() || rejectMut.isPending}
                onClick={() => rejectMut.mutate({ id: rejectionInput.id, reason: rejectionInput.reason })}
              >
                {rejectMut.isPending ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
