import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { attendanceService } from '../../services/attendanceService';
import { leaveService } from '../../services/leaveService';
import { useAuth } from '../../context/AuthContext';
import {
  Clock, CheckCircle2, XCircle,
  WifiOff, RefreshCw, Navigation
} from 'lucide-react';

interface GPSState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  status: 'idle' | 'acquiring' | 'ready' | 'error' | 'denied';
  error?: string;
}

export default function AttendancePage({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { user } = useAuth();
  const [gps, setGps] = useState<GPSState>({ latitude: null, longitude: null, accuracy: null, status: 'idle' });
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data: todayAttendance, refetch } = useQuery({
    queryKey: ['attendance-today'],
    queryFn: () => attendanceService.getToday(),
    refetchInterval: 30000,
  });

  const { data: leaveBalance } = useQuery({
    queryKey: ['leave-balance'],
    queryFn: () => leaveService.getMyBalance(),
  });

  const acquireGPS = useCallback(() => {
    if (!navigator.geolocation) {
      setGps(g => ({ ...g, status: 'error', error: 'GPS not supported on this device' }));
      return;
    }
    setGps(g => ({ ...g, status: 'acquiring' }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          status: 'ready',
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGps(g => ({ ...g, status: 'denied', error: 'Location permission denied. Please enable GPS.' }));
        } else {
          setGps(g => ({ ...g, status: 'error', error: 'Could not get your location. Try again.' }));
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  useEffect(() => {
    acquireGPS();
  }, [acquireGPS]);

  const handleCheckIn = async () => {
    if (gps.status !== 'ready' || !gps.latitude || !gps.longitude || !gps.accuracy) {
      acquireGPS();
      return;
    }
    setActionLoading(true); setActionMsg(null);
    try {
      await attendanceService.checkIn(gps.latitude, gps.longitude, gps.accuracy);
      setActionMsg({ type: 'success', text: '✓ Checked in successfully!' });
      refetch();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Check-in failed';
      setActionMsg({ type: 'error', text: msg });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (gps.status !== 'ready' || !gps.latitude || !gps.longitude || !gps.accuracy) {
      acquireGPS();
      return;
    }
    setActionLoading(true); setActionMsg(null);
    try {
      await attendanceService.checkOut(gps.latitude, gps.longitude, gps.accuracy);
      setActionMsg({ type: 'success', text: '✓ Checked out successfully!' });
      refetch();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Check-out failed';
      setActionMsg({ type: 'error', text: msg });
    } finally {
      setActionLoading(false);
    }
  };

  const att = todayAttendance;
  const isCheckedIn = !!att?.checkInAt;
  const isCheckedOut = !!att?.checkOutAt;
  const now = new Date();

  const formatTime = (iso: string | null | undefined) => {
    if (!iso) return '--:--';
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Header Info */}
      <div className="glass-card p-5">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Good {now.getHours() < 12 ? 'Morning' : now.getHours() < 17 ? 'Afternoon' : 'Evening'}!</h2>
            <p style={{ color: 'var(--text-2)', fontSize: '0.9rem' }}>
              {user?.firstName} · {user?.branchName}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--primary-light)' }}>
              {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>
              {now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          </div>
        </div>
      </div>

      {/* GPS Status */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        {gps.status === 'idle' && (
          <button className="gps-status acquiring" style={{ cursor: 'pointer', border: 'none' }} onClick={acquireGPS}>
            <Navigation size={14} />
            Tap to enable GPS location
          </button>
        )}
        {gps.status === 'acquiring' && (
          <div className="gps-status acquiring">
            <div className="gps-dot" />
            Acquiring GPS signal...
          </div>
        )}
        {gps.status === 'ready' && (
          <div className="gps-status inside">
            <div className="gps-dot" />
            GPS Ready · Accuracy ±{Math.round(gps.accuracy!)}m
          </div>
        )}
        {(gps.status === 'error' || gps.status === 'denied') && (
          <button className="gps-status outside" style={{ cursor: 'pointer', border: '1px solid rgba(244,63,94,0.30)' }} onClick={acquireGPS}>
            <WifiOff size={14} />
            {gps.error || 'GPS error — Retry'}
          </button>
        )}
      </div>

      {/* Check In / Out Hero */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div className="checkin-hero">
          {!isCheckedIn ? (
            <>
              <button
                className="checkin-btn"
                onClick={handleCheckIn}
                disabled={actionLoading}
                id="checkin-button"
              >
                {actionLoading ? <RefreshCw size={36} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle2 size={40} />}
                <span>{actionLoading ? 'Processing…' : 'CHECK IN'}</span>
              </button>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-3)', textAlign: 'center' }}>
                {gps.status !== 'ready' ? 'Enable GPS first, then tap to check in' : 'GPS ready · Tap to record attendance'}
              </p>
            </>
          ) : !isCheckedOut ? (
            <>
              <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                <div style={{ color: 'var(--emerald)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  ✓ Checked in at {formatTime(att?.checkInAt)}
                </div>
                {att?.isLate && <span className="badge badge-amber">Late</span>}
              </div>
              <button
                className="checkin-btn checkout"
                onClick={handleCheckOut}
                disabled={actionLoading}
                id="checkout-button"
              >
                {actionLoading ? <RefreshCw size={36} style={{ animation: 'spin 1s linear infinite' }} /> : <XCircle size={40} />}
                <span>{actionLoading ? 'Processing…' : 'CHECK OUT'}</span>
              </button>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-3)', textAlign: 'center' }}>
                {gps.status !== 'ready' ? 'Enable GPS first to check out' : 'Tap to record check-out time'}
              </p>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <CheckCircle2 size={56} color="var(--emerald)" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: '0.5rem' }}>All Done for Today!</h3>
              <p style={{ color: 'var(--text-2)', fontSize: '0.9rem' }}>
                {formatTime(att?.checkInAt)} → {formatTime(att?.checkOutAt)}
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                <span className={`badge ${att?.isLate ? 'badge-amber' : 'badge-emerald'}`}>
                  {att?.isLate ? 'Late' : 'On Time'}
                </span>
                {att?.isEarlyCheckout && <span className="badge badge-rose">Early Checkout</span>}
                <span className="badge badge-cyan">{att?.status}</span>
              </div>
            </div>
          )}
        </div>

        {/* Action message */}
        {actionMsg && (
          <div style={{
            margin: '0 1.25rem 1.25rem',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--r-sm)',
            fontSize: '0.875rem',
            fontWeight: 600,
            background: actionMsg.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)',
            color: actionMsg.type === 'success' ? 'var(--emerald)' : 'var(--rose)',
            border: `1px solid ${actionMsg.type === 'success' ? 'rgba(16,185,129,0.30)' : 'rgba(244,63,94,0.30)'}`,
          }}>
            {actionMsg.text}
          </div>
        )}
      </div>

      {/* Today's Details */}
      {att && (
        <div className="glass-card p-5">
          <h3 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '1rem', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={16} /> Today's Details
          </h3>
          <div className="attend-info-row">
            <span className="attend-info-label">Branch</span>
            <span className="attend-info-value">{att.branch?.name}</span>
          </div>
          <div className="attend-info-row">
            <span className="attend-info-label">Shift</span>
            <span className="attend-info-value">{att.shift?.name || 'Default Shift'}</span>
          </div>
          <div className="attend-info-row">
            <span className="attend-info-label">Check In</span>
            <span className="attend-info-value">{formatTime(att.checkInAt)}</span>
          </div>
          {att.checkInDistance && (
            <div className="attend-info-row">
              <span className="attend-info-label">Distance from Branch</span>
              <span className="attend-info-value" style={{ color: 'var(--emerald)' }}>{att.checkInDistance}m</span>
            </div>
          )}
          {att.checkOutAt && (
            <div className="attend-info-row">
              <span className="attend-info-label">Check Out</span>
              <span className="attend-info-value">{formatTime(att.checkOutAt)}</span>
            </div>
          )}
          <div className="attend-info-row">
            <span className="attend-info-label">Status</span>
            <span className={`badge ${att.status === 'PRESENT' || att.status === 'ON_LEAVE' ? 'badge-emerald' : att.status === 'LATE' ? 'badge-amber' : 'badge-rose'}`}>
              {att.status}
            </span>
          </div>
        </div>
      )}

      {/* Leave Balance */}
      {leaveBalance && (
        <div className="glass-card p-5">
          <h3 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '1rem', color: 'var(--text-2)' }}>
            Leave Balance — This Month
          </h3>
          <div className="leave-balance-grid">
            <div className="leave-balance-item">
              <div className="leave-balance-num" style={{ color: 'var(--cyan)' }}>{leaveBalance.totalEntitlement}</div>
              <div className="leave-balance-label">Entitled</div>
            </div>
            <div className="leave-balance-item">
              <div className="leave-balance-num" style={{ color: 'var(--rose)' }}>{leaveBalance.used}</div>
              <div className="leave-balance-label">Used</div>
            </div>
            <div className="leave-balance-item">
              <div className="leave-balance-num" style={{ color: 'var(--amber)' }}>{leaveBalance.pending}</div>
              <div className="leave-balance-label">Pending</div>
            </div>
            <div className="leave-balance-item">
              <div className="leave-balance-num" style={{ color: 'var(--emerald)' }}>{leaveBalance.remaining}</div>
              <div className="leave-balance-label">Available</div>
            </div>
          </div>
          <button
            className="btn btn-ghost btn-full btn-sm"
            style={{ marginTop: '1rem' }}
            onClick={() => onNavigate('leave-apply')}
          >
            Apply for Leave
          </button>
        </div>
      )}
    </div>
  );
}
