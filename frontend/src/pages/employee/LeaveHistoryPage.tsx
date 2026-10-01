import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leaveService } from '../../services/leaveService';
import { Trash2 } from 'lucide-react';

function leaveStatusBadge(status: string) {
  const map: Record<string, string> = {
    PENDING: 'badge-amber', APPROVED: 'badge-emerald',
    REJECTED: 'badge-rose', CANCELLED: 'badge-gray',
  };
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>;
}

function formatDate(d?: string) {
  if (!d) return '--';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function LeaveHistoryPage() {
  const queryClient = useQueryClient();

  const { data: history, isLoading } = useQuery({
    queryKey: ['leave-history-mine'],
    queryFn: () => leaveService.getMyLeaveHistory(),
  });

  const { data: balance } = useQuery({
    queryKey: ['leave-balance'],
    queryFn: () => leaveService.getMyBalance(),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => leaveService.cancelLeaveRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-history-mine'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balance'] });
    },
  });

  const handleCancel = (id: number) => {
    if (window.confirm('Are you sure you want to cancel/delete this leave request?')) {
      cancelMutation.mutate(id);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>My Leave History</h1>
        <p style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>All your leave requests and their status</p>
      </div>

      {/* Balance */}
      {balance && (
        <div className="glass-card p-5">
          <h3 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-2)', marginBottom: '0.75rem' }}>This Month's Balance</h3>
          <div className="leave-balance-grid">
            <div className="leave-balance-item">
              <div className="leave-balance-num" style={{ color: 'var(--cyan)' }}>{balance.totalEntitlement}</div>
              <div className="leave-balance-label">Entitled</div>
            </div>
            <div className="leave-balance-item">
              <div className="leave-balance-num" style={{ color: 'var(--rose)' }}>{balance.used}</div>
              <div className="leave-balance-label">Used</div>
            </div>
            <div className="leave-balance-item">
              <div className="leave-balance-num" style={{ color: 'var(--amber)' }}>{balance.pending}</div>
              <div className="leave-balance-label">Pending</div>
            </div>
            <div className="leave-balance-item">
              <div className="leave-balance-num" style={{ color: 'var(--emerald)' }}>{balance.remaining}</div>
              <div className="leave-balance-label">Available</div>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : !history?.length ? (
        <div className="glass-card p-6" style={{ textAlign: 'center', color: 'var(--text-2)' }}>
          <p>No leave requests found</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {history.map(lr => (
            <div key={lr.id} className="glass-card" style={{ padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{lr.leaveType?.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginTop: '0.2rem' }}>
                    {formatDate(lr.startDate)} – {formatDate(lr.endDate)} · {lr.duration} day{lr.duration !== 1 ? 's' : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {leaveStatusBadge(lr.status)}
                  {lr.status === 'PENDING' && (
                    <button
                      className="btn-danger btn-sm"
                      onClick={() => handleCancel(lr.id)}
                      disabled={cancelMutation.isPending}
                      title="Cancel Request"
                      style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      <Trash2 size={13} /> Cancel
                    </button>
                  )}
                </div>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-2)', marginTop: '0.6rem' }}>
                {lr.reason}
              </div>
              {lr.rejectionReason && (
                <div style={{ fontSize: '0.78rem', color: 'var(--rose)', marginTop: '0.35rem' }}>
                  Rejection reason: {lr.rejectionReason}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
