import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceService } from '../../services/attendanceService';
import { showAlert } from '../../utils/alerts';
import { X, Clock, Edit3, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { Attendance } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  attendance: Attendance | null;
  onSuccess?: () => void;
}

function toTimeString(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

export default function CorrectAttendanceModal({ isOpen, onClose, attendance, onSuccess }: Props) {
  const queryClient = useQueryClient();

  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('');
  const [status, setStatus] = useState<string>('PRESENT');
  const [reason, setReason] = useState('Employee forgot to check out when leaving clinic');

  useEffect(() => {
    if (attendance) {
      setCheckInTime(toTimeString(attendance.checkInAt));
      setCheckOutTime(toTimeString(attendance.checkOutAt));
      setStatus(attendance.status || 'PRESENT');
      if (attendance.suspiciousReason) {
        setReason(`Resolved: ${attendance.suspiciousReason}`);
      } else {
        setReason('Corrected departure time - employee forgot to check out');
      }
    }
  }, [attendance]);

  const correctMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => attendanceService.correctAttendance(id, data),
    onSuccess: () => {
      showAlert.success('Hours Corrected! 👏', 'The attendance session and working hours have been updated.');
      queryClient.invalidateQueries({ queryKey: ['attendance-all-today'] });
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to correct attendance';
      showAlert.error('Correction Failed', msg);
    },
  });

  if (!isOpen || !attendance) return null;

  // Calculate live preview duration
  let previewHours = '';
  if (checkInTime && checkOutTime) {
    const [inH, inM] = checkInTime.split(':').map(Number);
    const [outH, outM] = checkOutTime.split(':').map(Number);
    const inTotal = inH * 60 + inM;
    const outTotal = outH * 60 + outM;
    const diff = outTotal - inTotal;
    if (diff >= 0) {
      const h = Math.floor(diff / 60);
      const m = diff % 60;
      previewHours = `${h} hrs ${m.toString().padStart(2, '0')} mins`;
    } else {
      previewHours = 'Invalid (Check-out before Check-in)';
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkInTime) {
      showAlert.warning('Missing Time', 'Please provide a valid check-in time.');
      return;
    }
    if (!reason.trim()) {
      showAlert.warning('Reason Required', 'Please provide a brief reason for this correction.');
      return;
    }

    const dateStr = attendance.attendanceDate;
    const checkInIso = `${dateStr}T${checkInTime}:00+05:30`;
    const checkOutIso = checkOutTime ? `${dateStr}T${checkOutTime}:00+05:30` : undefined;

    correctMutation.mutate({
      id: attendance.id,
      data: {
        checkInAt: checkInIso,
        checkOutAt: checkOutIso,
        status,
        reason: reason.trim(),
      },
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
        zIndex: 1100,
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
          maxWidth: '520px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'var(--bg-surface-elevated, #161e2e)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          borderRadius: 'var(--r-lg)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '8px',
                background: 'rgba(6, 182, 212, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--cyan)',
              }}
            >
              <Edit3 size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-1)' }}>
                Correct Attendance & Working Hours
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>
                {attendance.employee.firstName} {attendance.employee.lastName} · {attendance.attendanceDate}
              </p>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div
            style={{
              padding: '1.25rem 1.5rem',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            {/* Suspicious notice if flagged */}
            {(attendance.isSuspicious || attendance.isAutoCheckout) && (
              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  borderRadius: 'var(--r-md)',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                }}
              >
                <AlertTriangle size={18} color="var(--amber)" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: '0.8rem', color: '#fef3c7' }}>
                  <strong>Flagged Record:</strong>{' '}
                  {attendance.suspiciousReason || (attendance.isAutoCheckout ? 'Auto-Closed session' : 'Abnormally long session detected')}
                </div>
              </div>
            )}

            {/* Time Adjustments Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  <Clock size={13} style={{ display: 'inline', marginRight: 4 }} />
                  Actual Check-In Time *
                </label>
                <input
                  type="time"
                  className="form-input"
                  value={checkInTime}
                  onChange={e => setCheckInTime(e.target.value)}
                  required
                  style={{ fontWeight: 700 }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  <Clock size={13} style={{ display: 'inline', marginRight: 4 }} />
                  Actual Check-Out Time
                </label>
                <input
                  type="time"
                  className="form-input"
                  value={checkOutTime}
                  onChange={e => setCheckOutTime(e.target.value)}
                  style={{ fontWeight: 700 }}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 2 }}>
                  Set actual departure time (e.g. 10:20)
                </span>
              </div>
            </div>

            {/* Calculated Work Duration Preview */}
            {previewHours && (
              <div
                style={{
                  background: 'rgba(6, 182, 212, 0.1)',
                  border: '1px solid rgba(6, 182, 212, 0.25)',
                  borderRadius: 'var(--r-md)',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '0.82rem', color: 'var(--cyan)', fontWeight: 600 }}>
                  Calculated Working Hours:
                </span>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-1)' }}>
                  {previewHours}
                </span>
              </div>
            )}

            {/* Status Selector */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>
                Attendance Status
              </label>
              <select
                className="form-select"
                value={status}
                onChange={e => setStatus(e.target.value)}
              >
                <option value="PRESENT">PRESENT</option>
                <option value="LATE">LATE</option>
                <option value="HALF_DAY">HALF_DAY</option>
                <option value="ABSENT">ABSENT</option>
              </select>
            </div>

            {/* Reason */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>
                Correction Reason / Audit Note *
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Left clinic at 10:20 AM, forgot to checkout"
                value={reason}
                onChange={e => setReason(e.target.value)}
                required
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 2 }}>
                This reason will be recorded in the audit log and attendance history notes.
              </span>
            </div>
          </div>

          {/* Footer Actions */}
          <div
            style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
            }}
          >
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={correctMutation.isPending || !checkInTime}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <CheckCircle2 size={16} />
              {correctMutation.isPending ? 'Saving Correction...' : 'Save & Recalculate Hours'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
