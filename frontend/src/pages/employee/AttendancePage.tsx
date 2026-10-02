import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { attendanceService } from '../../services/attendanceService';
import { leaveService } from '../../services/leaveService';
import { useAuth } from '../../context/AuthContext';
import { showAlert } from '../../utils/alerts';
import {
  CheckCircle2, MapPin,
  WifiOff, RefreshCw, Navigation,
  LogIn, LogOut, Clock, ClipboardList
} from 'lucide-react';
import RegularizationRequestModal from '../../components/attendance/RegularizationRequestModal';

interface GPSState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  status: 'idle' | 'acquiring' | 'ready' | 'error' | 'denied';
  error?: string;
}

function isOutsideLocationError(msg: string): boolean {
  return /outside|location|distance|geofence|radius/i.test(msg);
}

export default function AttendancePage({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { user } = useAuth();
  const [gps, setGps] = useState<GPSState>({ latitude: null, longitude: null, accuracy: null, status: 'idle' });
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error' | 'location'; text: string } | null>(null);
  const [showRegModal, setShowRegModal] = useState(false);
  const [, setTick] = useState(0);
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
      setGps({ latitude: null, longitude: null, accuracy: null, status: 'error', error: 'Geolocation is not supported by your browser' });
      return;
    }
    setGps(g => ({ ...g, status: 'acquiring', error: undefined }));
    navigator.geolocation.getCurrentPosition(
      pos => {
        setGps({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
          status: 'ready',
        });
      },
      err => {
        const errorMessages: Record<number, string> = {
          1: 'Location permission was denied. Please allow location access in your browser settings.',
          2: 'Location information is unavailable. Check GPS/Wi-Fi.',
          3: 'Location request timed out. Please try again.',
        };
        setGps({
          latitude: null,
          longitude: null,
          accuracy: null,
          status: err.code === 1 ? 'denied' : 'error',
          error: errorMessages[err.code] || 'Could not acquire location',
        });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  useEffect(() => {
    acquireGPS();
  }, [acquireGPS]);

  const handleCheckIn = async () => {
    if (!gps.latitude || !gps.longitude) {
      acquireGPS();
      showAlert.warning('Acquiring Location', 'Waiting for GPS signal. Please try again in a few moments.');
      return;
    }
    setActionLoading(true);
    setActionMsg(null);
    try {
      await attendanceService.checkIn(
        gps.latitude,
        gps.longitude,
        gps.accuracy || 10
      );
      showAlert.success('Check-in Successful! 🎉', 'You have marked your attendance at the clinic.');
      setActionMsg({ type: 'success', text: 'Checked in successfully!' });
      refetch();
    } catch (err: any) {
      const msg = err.response?.data?.message || (err.response?.status === 403 ? 'Access denied. Please sign in again.' : err.message) || 'Check-in failed';
      if (isOutsideLocationError(msg)) {
        setActionMsg({ type: 'location', text: msg });
        showAlert.error('Outside Clinic Location 📍', msg);
      } else {
        setActionMsg({ type: 'error', text: msg });
        showAlert.error('Check-in Failed', msg);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!gps.latitude || !gps.longitude) {
      acquireGPS();
      showAlert.warning('Acquiring Location', 'Waiting for GPS signal. Please try again in a few moments.');
      return;
    }
    const confirmed = await showAlert.confirm(
      'Confirm Check-out',
      'Are you sure you want to end your shift and check out for today?',
      'Yes, Check Out'
    );
    if (!confirmed) return;

    setActionLoading(true);
    setActionMsg(null);
    try {
      await attendanceService.checkOut(
        gps.latitude,
        gps.longitude,
        gps.accuracy || 10
      );
      showAlert.success('Check-out Successful! 👋', 'Your shift has ended and attendance is finalized.');
      setActionMsg({ type: 'success', text: 'Checked out successfully!' });
      refetch();
    } catch (err: any) {
      const msg = err.response?.data?.message || (err.response?.status === 403 ? 'Access denied. Please sign in again.' : err.message) || 'Check-out failed';
      if (isOutsideLocationError(msg)) {
        setActionMsg({ type: 'location', text: msg });
        showAlert.error('Outside Clinic Location 📍', msg);
      } else {
        setActionMsg({ type: 'error', text: msg });
        showAlert.error('Check-out Failed', msg);
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
              {user?.firstName} · {user?.branchName}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--primary-light)' }}>
              {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>
              {now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
            </div>
          </div>
        </div>
      </div>

      {/* OUT OF LOCATION ERROR CARD */}
      {actionMsg?.type === 'location' && (
        <div className="glass-card" style={{
          background: 'rgba(245, 158, 11, 0.12)',
          border: '1.5px solid rgba(245, 158, 11, 0.45)',
          padding: '1.1rem 1.25rem',
          borderRadius: 'var(--r-md)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              background: 'rgba(245, 158, 11, 0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <MapPin size={20} color="var(--amber)" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fbbf24', marginBottom: '0.25rem' }}>
                Outside Clinic Location
              </div>
              <div style={{ fontSize: '0.85rem', color: '#fef3c7', lineHeight: 1.45 }}>
                {actionMsg.text}
              </div>
              <div style={{ marginTop: '0.6rem', fontSize: '0.78rem', color: 'rgba(254, 243, 199, 0.75)' }}>
                Please ensure you are inside <strong>{user?.branchName}</strong> premises and try again.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OTHER ACTION MESSAGE */}
      {actionMsg && actionMsg.type !== 'location' && (
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

      {/* GPS Status Card */}
      <div className="glass-card p-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: gps.status === 'ready' ? 'rgba(16,185,129,0.15)' : gps.status === 'acquiring' ? 'rgba(6,182,212,0.15)' : 'rgba(244,63,94,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {gps.status === 'ready' ? <Navigation size={16} color="var(--emerald)" /> :
             gps.status === 'acquiring' ? <RefreshCw size={16} color="var(--cyan)" className="spinner" /> :
             <WifiOff size={16} color="var(--rose)" />}
          </div>
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>
              {gps.status === 'ready' ? 'GPS Signal Ready' :
               gps.status === 'acquiring' ? 'Locating device...' :
               gps.status === 'denied' ? 'Location Permission Denied' : 'Location Error'}
            </div>
            {gps.accuracy && (
              <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>
                Accuracy: ±{gps.accuracy}m
              </div>
            )}
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={acquireGPS} disabled={gps.status === 'acquiring'}>
          <RefreshCw size={13} />
        </button>
      </div>

      {/* DYNAMIC ACTION CARD: CHECK IN vs CHECK OUT vs COMPLETED */}
      <div className="glass-card p-6" style={{ textAlign: 'center' }}>
        {!isCheckedIn ? (
          /* STEP 1: NOT CHECKED IN YET -> SHOW CHECK IN BUTTON */
          <div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <button
                className="checkin-btn checkin-btn-in"
                onClick={handleCheckIn}
                disabled={actionLoading || gps.status !== 'ready'}
                id="checkin-action-btn"
                style={{
                  width: 170, height: 170, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0d9488 0%, #06b6d4 100%)',
                  border: '4px solid rgba(255,255,255,0.2)',
                  color: '#ffffff',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  cursor: (actionLoading || gps.status !== 'ready') ? 'not-allowed' : 'pointer',
                  boxShadow: '0 8px 32px rgba(13,148,136,0.45)',
                  transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
                  margin: '0 auto',
                }}
              >
                {actionLoading ? (
                  <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
                ) : (
                  <>
                    <LogIn size={36} style={{ marginBottom: 6 }} />
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '0.04em' }}>CHECK IN</span>
                    <span style={{ fontSize: '0.72rem', opacity: 0.85, marginTop: 2 }}>Start Shift</span>
                  </>
                )}
              </button>
            </div>
            <p style={{ color: 'var(--text-3)', fontSize: '0.82rem' }}>
              {gps.status === 'ready' ? 'Tap button above when inside clinic' : 'Enable GPS to enable Check-In'}
            </p>
          </div>
        ) : !isCheckedOut ? (
          /* STEP 2: CHECKED IN BUT NOT CHECKED OUT -> SHOW CHECK OUT BUTTON */
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: 'var(--r-full)', padding: '0.4rem 1rem', marginBottom: '1.2rem',
              color: 'var(--emerald)', fontSize: '0.85rem', fontWeight: 700
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--emerald)', animation: 'pulse 1.5s infinite' }} />
              ON DUTY · Checked in at {formatTime(att?.checkInAt)}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <button
                className="checkin-btn checkin-btn-out"
                onClick={handleCheckOut}
                disabled={actionLoading || gps.status !== 'ready'}
                id="checkout-action-btn"
                style={{
                  width: 170, height: 170, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)',
                  border: '4px solid rgba(255,255,255,0.2)',
                  color: '#ffffff',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  cursor: (actionLoading || gps.status !== 'ready') ? 'not-allowed' : 'pointer',
                  boxShadow: '0 8px 32px rgba(225,29,72,0.45)',
                  transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
                  margin: '0 auto',
                }}
              >
                {actionLoading ? (
                  <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
                ) : (
                  <>
                    <LogOut size={36} style={{ marginBottom: 6 }} />
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '0.04em' }}>CHECK OUT</span>
                    <span style={{ fontSize: '0.72rem', opacity: 0.85, marginTop: 2 }}>End Shift</span>
                  </>
                )}
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', color: 'var(--text-2)', fontSize: '0.85rem' }}>
              <div>In: <strong style={{ color: 'var(--text-1)' }}>{formatTime(att?.checkInAt)}</strong></div>
              <div>Duration: <strong style={{ color: 'var(--primary-light)' }}>{calcDuration(att?.checkInAt)}</strong></div>
            </div>
          </div>
        ) : (
          /* STEP 3: BOTH CHECKED IN AND CHECKED OUT -> ATTENDANCE COMPLETE */
          <div style={{ padding: '1rem 0' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'rgba(16,185,129,0.15)', border: '2px solid rgba(16,185,129,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1rem', color: 'var(--emerald)'
            }}>
              <CheckCircle2 size={40} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--emerald)', marginBottom: '0.35rem' }}>
              Shift Completed for Today!
            </h3>
            <p style={{ color: 'var(--text-2)', fontSize: '0.85rem', marginBottom: '1.2rem' }}>
              Your attendance has been recorded successfully.
            </p>

            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem',
              background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--r-md)',
              border: '1px solid var(--border)'
            }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>CHECK IN</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--emerald)', marginTop: 2 }}>{formatTime(att?.checkInAt)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>CHECK OUT</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--rose)', marginTop: 2 }}>{formatTime(att?.checkOutAt)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>TOTAL TIME</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--cyan)', marginTop: 2 }}>{calcDuration(att?.checkInAt, att?.checkOutAt)}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TODAY'S SUMMARY DETAILS */}
      {att && (
        <div className="glass-card p-5">
          <h3 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.85rem' }}>Today's Details</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
            <div style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>Status</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: att.status === 'PRESENT' ? 'var(--emerald)' : 'var(--amber)', marginTop: 2 }}>
                {att.status} {att.isLate ? '(Late)' : ''}
              </div>
            </div>
            <div style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>Branch</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-1)', marginTop: 2 }}>
                {att.branch?.name || user?.branchName}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leave Balance Overview */}
      {leaveBalance && (
        <div className="glass-card p-5">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-2)' }}>Monthly Leave Balance</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('leave-apply')}>
              Apply Leave →
            </button>
          </div>
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
        </div>
      )}

      {/* Forgot Check-In / Missed Punch Regularization Card */}
      <div
        className="glass-card p-5"
        style={{
          background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.08) 0%, rgba(20, 184, 166, 0.03) 100%)',
          border: '1px dashed rgba(13, 148, 136, 0.35)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={16} /> Missed Check-In or Left Clinic?
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-2)', marginTop: 2 }}>
              If you worked during shift but forgot to punch GPS or left without checking out, send a request to Admin.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setShowRegModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <ClipboardList size={15} /> Request Regularization
          </button>
        </div>
      </div>

      {/* Regularization Request Modal */}
      <RegularizationRequestModal
        isOpen={showRegModal}
        onClose={() => setShowRegModal(false)}
      />

    </div>
  );
}

