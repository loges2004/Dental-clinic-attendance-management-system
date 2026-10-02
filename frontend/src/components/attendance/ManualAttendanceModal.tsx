import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { regularizationService } from '../../services/regularizationService';
import { employeeService } from '../../services/branchService';
import { showAlert } from '../../utils/alerts';
import { X, Calendar, Clock, UserCheck, FileText } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ManualAttendanceModal({ isOpen, onClose, onSuccess }: Props) {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  const [employeeId, setEmployeeId] = useState<string>('');
  const [date, setDate] = useState(today);
  const [checkInTime, setCheckInTime] = useState('09:00');
  const [checkOutTime, setCheckOutTime] = useState('18:00');
  const [status, setStatus] = useState<'PRESENT' | 'LATE' | 'HALF_DAY'>('PRESENT');
  const [notes, setNotes] = useState('Manual Entry by Admin');

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeeService.getAllEmployees(),
    enabled: isOpen,
  });

  const manualEntryMutation = useMutation({
    mutationFn: regularizationService.createManualAttendance,
    onSuccess: () => {
      showAlert.success('Attendance Recorded', 'Manual attendance has been successfully logged.');
      queryClient.invalidateQueries({ queryKey: ['attendance-all-today'] });
      queryClient.invalidateQueries({ queryKey: ['all-regularization-requests'] });
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to save attendance';
      showAlert.error('Error', msg);
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) {
      showAlert.warning('Select Staff', 'Please select a staff member.');
      return;
    }
    if (!date) {
      showAlert.warning('Select Date', 'Please select the attendance date.');
      return;
    }
    if (!checkInTime) {
      showAlert.warning('Select In-Time', 'Please provide a check-in time.');
      return;
    }

    manualEntryMutation.mutate({
      employeeId: Number(employeeId),
      attendanceDate: date,
      checkInTime,
      checkOutTime: checkOutTime || undefined,
      status,
      notes,
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
          maxWidth: '520px',
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
              Manual Attendance Entry
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginTop: 2 }}>
              Directly record attendance for staff who missed check-in/out.
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

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '0.4rem' }}>
              <UserCheck size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
              Select Staff Member *
            </label>
            <select
              className="form-select"
              value={employeeId}
              onChange={e => setEmployeeId(e.target.value)}
              required
              style={{ width: '100%' }}
            >
              <option value="">-- Choose Employee --</option>
              {employees?.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} ({emp.user?.role?.name || emp.designation || 'Staff'} · {emp.branch?.name})
                </option>
              ))}
            </select>
          </div>

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
                Check-In Time *
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
                Check-Out Time
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
              Attendance Status *
            </label>
            <select
              className="form-select"
              value={status}
              onChange={e => setStatus(e.target.value as any)}
              style={{ width: '100%' }}
            >
              <option value="PRESENT">PRESENT (Full Day)</option>
              <option value="LATE">LATE (Marked Late)</option>
              <option value="HALF_DAY">HALF DAY</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '0.4rem' }}>
              <FileText size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
              Admin Remarks / Notes
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Sister worked morning shift, forgot to punch mobile GPS."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={manualEntryMutation.isPending}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={manualEntryMutation.isPending}>
              {manualEntryMutation.isPending ? 'Saving...' : 'Record Attendance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
