import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { attendanceService } from '../../services/attendanceService';
import { leaveService } from '../../services/leaveService';
import { useAuth } from '../../context/AuthContext';
import {
  Clock, CheckCircle2, XCircle, MapPin,
  WifiOff, RefreshCw, Navigation, AlertTriangle,
  LogIn, LogOut, Hourglass
} from 'lucide-react';

interface GPSState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  status: 'idle' | 'acquiring' | 'ready' | 'error' | 'denied';
  error?: string;
}

// Detect if the error is a location/geofence error from backend
function isOutsideLocationError(msg: string): boolean {
  return /outside|location|distance|geofence|radius/i.test(msg);
}

export default function AttendancePage({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { user } = useAuth();
  const [gps, setGps] = useState<GPSState>({ latitude: null, longitude: null, accuracy: null, status: 'idle' });
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error' | 'location'; text: string } | null>(null);
  const [tick, setTick] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Live clock
  useEffect(() => {
    timerRef.current = setInterval(() => setTick(t => t + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

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
          setGps(g => ({ ...g, status: 'denied', error: 'Location permission denied. Please enable GPS in browser settings.' }));
        } else {
          setGps(g => ({ ...g, status: 'error', error: 'Could not get your location. Please retry.' }));
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  useEffect(() => { acquireGPS(); }, [acquireGPS]);

  const handleCheckIn = async () => {
    if (gps.status !== 'ready' || !gps.latitude || !gps.longitude || !gps.accuracy) {
      acquireGPS();
      return;
    }
    setActionLoading(true); setActionMsg(null);
    try {
      await attendanceService.checkIn(gps.latitude, gps.longitude, gps.accuracy);
      setActionMsg({ type: 'success', text: '\u2713 Checked in successfully! You are inside the clinic.' });
      refetch();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Check-in failed';
      if (isOutsideLocationError(msg)) {
        setActionMsg({ type: 'location', text: msg });
      } else {
        setActionMsg({ type: 'error', text: msg });
      }
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
      setActionMsg({ type: 'success', text: '\u2713 Checked out successfully! Have a great day.' });
      refetch();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Check-out failed';
      if (isOutsideLocationError(msg)) {
        setActionMsg({ type: 'location', text: msg });
      } else {
        setActionMsg({ type: 'error', text: msg });
      }
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

  const calcDuration = (inIso?: string | null, outIso?: string | null): string => {
    if (!inIso) return '--';
    const inT = new Date(inIso).getTime();
    const outT = outIso ? new Date(outIso).getTime() : now.getTime();
    const diffMs = outT - inT;
    const hrs = Math.floor(diffMs / 3600000);
    const mins = Math.floor((diffMs % 3600000) / 60000);
    return `${hrs}h ${mins}m`;
  };

  const greeting = now.getHours() < 12 ? 'Good Morning' : now.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Header Info */}
      <div className="glass-card p-5">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>{greeting}!</h2>
            <p style={{ color: 'var(--text-2)', fontSize: '0.9rem' }}>
              {user?.firstName} \u00b7 {user?.branchName}
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

      {/* GPS Status pill */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        {gps.status === 'idle' && (
          <button className="gps-status acquiring" style={{ cursor: 'pointer', border: 'none' }} onClick={acquireGPS}>
            <Navigation size={14} /> Tap to enable GPS location
          </button>
        )}
        {gps.status === 'acquiring' && (
          <div className="gps-status acquiring">
            <div className="gps-dot" /> Acquiring GPS signal...
          </div>
        )}
        {gps.status === 'ready' && (
          <div className="gps-status inside">
            <div className="gps-dot" /> GPS Ready \u00b7 Accuracy \u00b1{Math.round(gps.accuracy!)}m
          </div>
        )}
        {(gps.status === 'error' || gps.status === 'denied') && (
          <button className="gps-status outside" style={{ cursor: 'pointer', border: '1px solid rgba(244,63,94,0.30)' }} onClick={acquireGPS}>
            <WifiOff size={14} /> {gps.error || 'GPS error — Retry'}
          </button>
        )}
      </div>

      {/* Main Action Card */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div className="checkin-hero">
          {/* --- NOT CHECKED IN --- */}
          {!isCheckedIn && (
            <>
              <button
                className="checkin-btn"
                onClick={handleCheckIn}
                disabled={actionLoading}
                id="checkin-button"
              >
                {actionLoading
                  ? <RefreshCw size={36} style={{ animation: 'spin 1s linear infinite' }} />
                  : <LogIn size={40} />}
                <span>{actionLoading ? 'Processing\u2026' : 'CHECK IN'}</span>
              </button>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-3)', textAlign: 'center' }}>
                {gps.status !== 'ready'
                  ? 'Enable GPS first, then tap to check in'
                  : 'GPS ready \u00b7 Tap to record attendance'}
              </p>
            </>
          )}

          {/* --- CHECKED IN, NOT CHECKED OUT --- */}
          {isCheckedIn && !isCheckedOut && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--emerald)', fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  <CheckCircle2 size={18} /> Inside Clinic \u00b7 Checked in at {formatTime(att?.checkInAt)}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginBottom: '0.35rem' }}>
                  <Hourglass size={12} style={{ display: 'inline', marginRight: 4 }} />
                  Duration: {calcDuration(att?.checkInAt)}
                </div>
                {att?.isLate && <span className="badge badge-amber">Late Arrival</span>}
              </div>
              <button
                className="checkin-btn checkout"
                onClick={handleCheckOut}
                disabled={actionLoading}
                id="checkout-button"
              >
                {actionLoading
                  ? <RefreshCw size={36} style={{ animation: 'spin 1s linear infinite' }} />
                  : <LogOut size={40} />}
                <span>{actionLoading ? 'Processing\u2026' : 'CHECK OUT'}</span>
              </button>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-3)', textAlign: 'center' }}>
                {gps.status !== 'ready' ? 'Enable GPS first to check out' : 'Tap to record check-out time'}
              </p>
            </>
          )}

          {/* --- FULLY DONE --- */}
          {isCheckedIn && isCheckedOut && (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <CheckCircle2 size={56} color="var(--emerald)" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: '0.5rem' }}>All Done for Today!</h3>
              <p style={{ color: 'var(--text-2)', fontSize: '0.9rem' }}>
                {formatTime(att?.checkInAt)} \u2192 {formatTime(att?.checkOutAt)}
                &nbsp;\u00b7&nbsp;
                <strong>{calcDuration(att?.checkInAt, att?.checkOutAt)}</strong> total
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

        {/* Action Message */}
        {actionMsg && (
          <div style={{ margin: '0 1.25rem 1.25rem' }}>
            {actionMsg.type === 'location' ? (
              /* ── OUTSIDE LOCATION ERROR ── */
              <div style={{
                padding: '1rem',
                borderRadius: 'var(--r-sm)',
                background: 'rgba(245,158,11,0.12)',
                border: '1px solid rgba(245,158,11,0.35)',
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'flex-start',
              }}>
                <MapPin size={22} color="var(--amber)" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--amber)', marginBottom: '0.3rem' }}>
                    \u26a0\ufe0f You are outside the clinic location
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-2)', lineHeight: 1.5 }}>
                    {actionMsg.text}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: '0.4rem' }}>
                    Please move closer to your clinic and try again.
                  </div>
                </div>
              </div>
            ) : (
              /* ── SUCCESS / GENERIC ERROR ── */
              <div style={{
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
        )}
      </div>

      {/* Today's Details — shown after check-in */}
      {att && (
        <div className="glass-card p-5">
          <h3 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '1rem', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={16} /> Today's Attendance Details
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
          {att.checkInDistance != null && (
            <div className="attend-info-row">
              <span className="attend-info-label">Distance from Branch</span>
              <span className="attend-info-value" style={{ color: 'var(--emerald)' }}>{att.checkInDistance}m \u2713 Inside</span>
            </div>
          )}
          {att.checkOutAt ? (
            <>
              <div className="attend-info-row">
                <span className="attend-info-label">Check Out</span>
                <span className="attend-info-value">{formatTime(att.checkOutAt)}</span>
              </div>
              <div className="attend-info-row">
                <span className="attend-info-label">Total Duration</span>
                <span className="attend-info-value" style={{ color: 'var(--primary-light)', fontWeight: 700 }}>
                  {calcDuration(att.checkInAt, att.checkOutAt)}
                </span>
              </div>
            </>
          ) : (
            <div className="attend-info-row">
              <span className="attend-info-label">Duration (live)</span>
              <span className="attend-info-value" style={{ color: 'var(--cyan)', fontWeight: 700 }}>
                {calcDuration(att.checkInAt)} \u25cf
              </span>
            </div>
          )}
          <div className="attend-info-row">
            <span className="attend-info-label">Status</span>
            <span className={`badge ${att.status === 'PRESENT' || att.status === 'ON_LEAVE' ? 'badge-emerald' : att.status === 'LATE' ? 'badge-amber' : 'badge-rose'}`}>
              {att.status}
            </span>
          </div>
          {att.isLate && (
            <div className="attend-info-row">
              <span className="attend-info-label">Punctuality</span>
              <span className="badge badge-amber">Late Arrival</span>
            </div>
          )}
          {att.isEarlyCheckout && (
            <div className="attend-info-row">
              <span className="attend-info-label">Checkout</span>
              <span className="badge badge-rose">Early Checkout</span>
            </div>
          )}
        </div>
      )}

      {/* Leave Balance */}
      {leaveBalance && (
        <div className="glass-card p-5">
          <h3 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '1rem', color: 'var(--text-2)' }}>
            Leave Balance \u2014 This Month
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
