import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { regularizationService } from '../../services/regularizationService';
import { showAlert } from '../../utils/alerts';
import { X, Clock, Calendar, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function RegularizationRequestModal({ isOpen, onClose }: Props) {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  const [date, setDate] = useState(today);
  const [checkInTime, setCheckInTime] = useState('09:00');
  const [checkOutTime, setCheckOutTime] = useState('18:00');
  const [reason, setReason] = useState('');
  const [tab, setTab] = useState<'apply' | 'history'>('apply');

  // Fetch employee's regularization requests
  const { data: myRequests, isLoading: loadingHistory, refetch: refetchHistory } = useQuery({
    queryKey: ['my-regularization-requests'],
    queryFn: () => regularizationService.getMyRequests(),
    enabled: isOpen,
  });

  const applyMutation = useMutation({
    mutationFn: regularizationService.apply,
    onSuccess: () => {
      showAlert.success('Request Submitted', 'Your missed check-in request has been sent to Admin for approval.');
      setReason('');
      queryClient.invalidateQueries({ queryKey: ['my-regularization-requests'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
      setTab('history');
      refetchHistory();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to submit request';
      showAlert.error('Submission Failed', msg);
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      showAlert.warning('Missing Date', 'Please select the attendance date.');
      return;
    }
    if (!checkInTime) {
      showAlert.warning('Missing Time', 'Please provide the check-in time.');
      return;
    }
    if (!reason.trim()) {
      showAlert.warning('Missing Reason', 'Please enter a reason why check-in was missed.');
      return;
    }

    applyMutation.mutate({
      attendanceDate: date,
      requestedCheckInTime: checkInTime,
      requestedCheckOutTime: checkOutTime || undefined,
      reason: reason.trim(),
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(10, 15, 30, 0.82)',
        backdropFilter: 'blur(6px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'var(--bg-surface-elevated, #161e2e)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg, 16px)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.2rem 1.5rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-1)' }}>
              Missed Check-In Request
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginTop: 2 }}>
              Forgot to check in or check out? Request attendance regularization.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-2)',
              cursor: 'pointer',
              padding: '0.4rem',
              borderRadius: '8px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
          <button
            type="button"
            onClick={() => setTab('apply')}
            style={{
              flex: 1,
              padding: '0.75rem',
              fontWeight: 600,
              fontSize: '0.88rem',
              border: 'none',
              cursor: 'pointer',
              background: tab === 'apply' ? 'rgba(13, 148, 136, 0.15)' : 'transparent',
              color: tab === 'apply' ? 'var(--primary)' : 'var(--text-2)',
              borderBottom: tab === 'apply' ? '2px solid var(--primary)' : '2px solid transparent',
            }}
          >
            New Request
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('history');
              refetchHistory();
            }}
            style={{
              flex: 1,
              padding: '0.75rem',
              fontWeight: 600,
              fontSize: '0.88rem',
              border: 'none',
              cursor: 'pointer',
              background: tab === 'history' ? 'rgba(13, 148, 136, 0.15)' : 'transparent',
              color: tab === 'history' ? 'var(--primary)' : 'var(--text-2)',
              borderBottom: tab === 'history' ? '2px solid var(--primary)' : '2px solid transparent',
            }}
          >
            My Past Requests {myRequests && myRequests.length > 0 && `(${myRequests.length})`}
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>
          {tab === 'apply' ? (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '0.4rem' }}>
                  <Calendar size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                  Attendance Date *
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={date}
                  max={today}
                  onChange={e => setDate(e.target.value)}
                  required
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '0.4rem' }}>
                    <Clock size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                    Actual In Time *
                  </label>
                  <input
                    type="time"
                    className="form-input"
                    value={checkInTime}
                    onChange={e => setCheckInTime(e.target.value)}
                    required
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '0.4rem' }}>
                    <Clock size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                    Actual Out Time
                  </label>
                  <input
                    type="time"
                    className="form-input"
                    value={checkOutTime}
                    onChange={e => setCheckOutTime(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '0.4rem' }}>
                  Reason for Missed Check-In *
                </label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="e.g. Attended duty from 9 AM to 6 PM, but forgot to punch GPS in mobile / phone network issue."
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  required
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-ghost" onClick={onClose} disabled={applyMutation.isPending}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={applyMutation.isPending}>
                  {applyMutation.isPending ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          ) : (
            <div>
              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-3)' }}>Loading requests...</div>
              ) : !myRequests || myRequests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-3)' }}>
                  <AlertCircle size={36} style={{ opacity: 0.5, margin: '0 auto 0.5rem' }} />
                  <p>No regularization requests submitted yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {myRequests.map(req => {
                    const statusColor =
                      req.status === 'APPROVED' ? 'var(--emerald)' : req.status === 'REJECTED' ? 'var(--rose)' : 'var(--amber)';
                    return (
                      <div
                        key={req.id}
                        style={{
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          padding: '0.9rem',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-1)' }}>
                              {req.attendanceDate}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-2)', marginTop: 2 }}>
                              Requested: In {req.requestedCheckInTime} {req.requestedCheckOutTime ? `· Out ${req.requestedCheckOutTime}` : ''}
                            </div>
                          </div>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              padding: '0.2rem 0.6rem',
                              borderRadius: '4px',
                              background: req.status === 'APPROVED' ? 'rgba(16,185,129,0.15)' : req.status === 'REJECTED' ? 'rgba(244,63,94,0.15)' : 'rgba(245,158,11,0.15)',
                              color: statusColor,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            {req.status === 'APPROVED' && <CheckCircle size={12} />}
                            {req.status === 'REJECTED' && <XCircle size={12} />}
                            {req.status === 'PENDING' && <AlertCircle size={12} />}
                            {req.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginTop: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: 4 }}>
                          "{req.reason}"
                        </div>
                        {req.rejectionReason && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--rose)', marginTop: '0.4rem' }}>
                            Admin Note: {req.rejectionReason}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
