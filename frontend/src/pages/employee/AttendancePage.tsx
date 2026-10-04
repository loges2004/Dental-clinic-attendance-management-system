import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { attendanceService } from '../../services/attendanceService';
import { leaveService } from '../../services/leaveService';
import { useAuth } from '../../context/AuthContext';
import { showAlert } from '../../utils/alerts';
import {
  MapPin, WifiOff, RefreshCw, Navigation,
  LogIn, LogOut, Clock, ClipboardList, History, X,
  AlertTriangle
} from 'lucide-react';

import RegularizationRequestModal from '../../components/attendance/RegularizationRequestModal';

interface GPSState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  status: 'idle' | 'acquiring' | 'refining' | 'ready' | 'error' | 'denied';
  error?: string;
}

function isOutsideLocationError(msg: string): boolean {
  return /outside\s+the\s+allowed|outside\s+branch|outside\s+clinic|geofence|accuracy\s+is\s+too\s+low/i.test(msg);
}

function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function AttendancePage({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { user } = useAuth();
  const [gps, setGps] = useState<GPSState>({ latitude: null, longitude: null, accuracy: null, status: 'idle' });
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error' | 'location'; text: string } | null>(null);
  const [showRegModal, setShowRegModal] = useState(false);
  const [showForgotCheckoutModal, setShowForgotCheckoutModal] = useState(false);
  const [showLongSessionModal, setShowLongSessionModal] = useState(false);
  const [hasPromptedDeparture, setHasPromptedDeparture] = useState(false);
  const [forgotCheckoutTime, setForgotCheckoutTime] = useState('');
  const [forgotCheckoutReason, setForgotCheckoutReason] = useState('');
  const [forgotCheckoutLoading, setForgotCheckoutLoading] = useState(false);
  const [, setTick] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Live clock
  useEffect(() => {
    timerRef.current = setInterval(() => setTick(t => t + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const { data: todayAttendance, refetch } = useQuery({
    queryKey: ['attendance-today'],
    queryFn: () => attendanceService.getToday(),
    refetchInterval: 15000,
  });

  const { data: leaveBalance } = useQuery({
    queryKey: ['leave-balance'],
    queryFn: () => leaveService.getMyBalance(),
  });

  // Continuous High-Accuracy GPS Watcher
  const startGpsWatcher = useCallback(() => {
    if (!navigator.geolocation) {
      setGps({ latitude: null, longitude: null, accuracy: null, status: 'error', error: 'Geolocation is not supported by your browser' });
      return;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    setGps(g => ({ ...g, status: 'acquiring', error: undefined }));

    watchIdRef.current = navigator.geolocation.watchPosition(
      pos => {
        const acc = Math.round(pos.coords.accuracy);
        setGps({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: acc,
          status: 'ready',
          error: undefined,
        });
      },
      err => {
        const errorMessages: Record<number, string> = {
          1: 'Location permission was denied. Please allow location access in your browser settings.',
          2: 'Location information is unavailable. Please turn on phone GPS.',
          3: 'Location request timed out. Please try again.',
        };
        setGps({
          latitude: null,
          longitude: null,
          accuracy: null,
          status: err.code === 1 ? 'denied' : 'error',
          error: errorMessages[err.code] || 'Could not acquire GPS location',
        });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );

  }, []);

  useEffect(() => {
    startGpsWatcher();
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [startGpsWatcher]);

  const att = todayAttendance;
  const sessions = att?.sessions || [];
  const currentSessionStatus = att?.currentSessionStatus || 'CHECKED_OUT';
  const isCurrentlyIn = att && currentSessionStatus === 'CHECKED_IN';
  const hasEverCheckedInToday = !!att?.checkInAt;
  const sessionCount = sessions.length;
  const now = new Date();

  // Find active open session if checked in
  const activeSession = isCurrentlyIn ? sessions[sessions.length - 1] : null;

  // Proactive Departure Detection: If checked in and phone detects user is outside clinic (> radius + 200m)
  useEffect(() => {
    if (!isCurrentlyIn || !gps.latitude || !gps.longitude || gps.status !== 'ready') return;
    const branch = att?.branch;
    if (!branch?.latitude || !branch?.longitude) return;

    const dist = calculateDistanceMeters(
      gps.latitude,
      gps.longitude,
      Number(branch.latitude),
      Number(branch.longitude)
    );

    const allowedRadius = branch.allowedRadiusMeters || 100;
    // When employee is clearly away from clinic (> radius + 200m) with reliable GPS precision
    if (dist > allowedRadius + 200 && (!gps.accuracy || gps.accuracy < 250)) {
      if (!hasPromptedDeparture && !showForgotCheckoutModal && !showLongSessionModal) {
        setHasPromptedDeparture(true);
        const timeNow = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        setForgotCheckoutTime(timeNow);
        setShowForgotCheckoutModal(true);
      }
    }
  }, [gps.latitude, gps.longitude, gps.status, gps.accuracy, isCurrentlyIn, att?.branch, hasPromptedDeparture, showForgotCheckoutModal, showLongSessionModal]);

  const handleCheckIn = async () => {
    if (!gps.latitude || !gps.longitude) {
      startGpsWatcher();
      showAlert.warning('Acquiring Location', 'Waiting for GPS signal. Please allow location access and try again.');
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
      const isReEntry = hasEverCheckedInToday;
      showAlert.success(
        isReEntry ? 'Checked In Again! 👏' : 'Check-in Successful! 🎉',
        isReEntry ? `Session #${sessionCount + 1} started. Welcome back!` : 'Your attendance for today has started.'
      );
      setActionMsg({ type: 'success', text: isReEntry ? 'Returned to clinic. Session active!' : 'Checked in successfully!' });
      refetch();
    } catch (err: any) {
      const msg = err.response?.data?.message || (err.response?.status === 403 ? 'Access denied. Please sign in again.' : err.message) || 'Check-in failed';
      if (isOutsideLocationError(msg)) {
        setActionMsg({ type: 'location', text: msg });
        showAlert.error('Location Check 📍', msg);
      } else {
        setActionMsg({ type: 'error', text: msg });
        showAlert.error('Check-in Failed', msg);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const executeCheckOut = async () => {
    if (!gps.latitude || !gps.longitude) {
      startGpsWatcher();
      showAlert.warning('Acquiring Location', 'Waiting for GPS signal. Please try again in a few moments.');
      return;
    }

    setActionLoading(true);
    setActionMsg(null);

    try {
      await attendanceService.checkOut(
        gps.latitude,
        gps.longitude,
        gps.accuracy || 10
      );
      showAlert.success('Check-out Recorded! 👋', 'Session time saved. You can check in again anytime when you return.');
      setActionMsg({ type: 'success', text: 'Checked out successfully!' });
      refetch();
    } catch (err: any) {
      const msg = err.response?.data?.message || (err.response?.status === 403 ? 'Access denied. Please sign in again.' : err.message) || 'Check-out failed';
      if (isOutsideLocationError(msg)) {
        setActionMsg({ type: 'location', text: msg });
        const defaultTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        setForgotCheckoutTime(defaultTime);
        setShowForgotCheckoutModal(true);
      } else {
        setActionMsg({ type: 'error', text: msg });
        showAlert.error('Check-out Failed', msg);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!gps.latitude || !gps.longitude) {
      startGpsWatcher();
      showAlert.warning('Acquiring Location', 'Waiting for GPS signal. Please try again in a few moments.');
      return;
    }

    const sessionStartMs = activeSession?.checkInAt ? new Date(activeSession.checkInAt).getTime() : 0;
    const sessionMins = sessionStartMs ? Math.max(0, Math.floor((now.getTime() - sessionStartMs) / 60000)) : 0;

    // Detect if session is excessively long (>= 4.5 hours / 270 mins)
    if (sessionMins >= 270) {
      setShowLongSessionModal(true);
      return;
    }

    const confirmed = await showAlert.confirm(
      'Confirm Check-Out',
      'Are you checking out for Lunch / Break or Shift End?',
      'Yes, Check Out'
    );
    if (!confirmed) return;

    await executeCheckOut();
  };

  const handleForgotCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotCheckoutTime) {
      showAlert.warning('Missing Time', 'Please enter the time you left the clinic.');
      return;
    }

    setForgotCheckoutLoading(true);
    try {
      await attendanceService.forgotCheckOut(
        forgotCheckoutTime,
        forgotCheckoutReason.trim() || 'Left clinic, remote check-out recorded',
        gps.latitude || undefined,
        gps.longitude || undefined,
        gps.accuracy || undefined
      );
      showAlert.success('Session Closed! 👋', `Your departure at ${forgotCheckoutTime} has been saved. Timer stopped.`);
      setShowForgotCheckoutModal(false);
      setForgotCheckoutReason('');
      setActionMsg(null);
      refetch();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Could not complete remote check-out';
      showAlert.error('Check-out Failed', msg);
    } finally {
      setForgotCheckoutLoading(false);
    }
  };


  const formatTime = (iso: string | null | undefined) => {
    if (!iso) return '--:--';
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  // Compute live total minutes (completed sessions + active open session)
  const computeLiveTotalWork = () => {
    let completedMins = att?.totalWorkMinutes || 0;
    if (isCurrentlyIn && activeSession?.checkInAt) {
      const startMs = new Date(activeSession.checkInAt).getTime();
      const currentMs = now.getTime();
      const currentMins = Math.max(0, Math.floor((currentMs - startMs) / 60000));
      const totalMins = completedMins + currentMins;
      const hrs = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      return `${hrs} hrs ${mins.toString().padStart(2, '0')} mins`;
    }
    const hrs = Math.floor(completedMins / 60);
    const mins = completedMins % 60;
    return `${hrs} hrs ${mins.toString().padStart(2, '0')} mins`;
  };

  // Duration for a specific session
  const getSessionDuration = (inIso?: string | null, outIso?: string | null) => {
    if (!inIso) return '--';
    const startMs = new Date(inIso).getTime();
    const endMs = outIso ? new Date(outIso).getTime() : now.getTime();
    const diffMins = Math.max(0, Math.floor((endMs - startMs) / 60000));
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hrs}h ${mins}m`;
  };

  const greeting = now.getHours() < 12 ? 'Good Morning' : now.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: 'calc(140px + env(safe-area-inset-bottom, 20px))' }}>

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

      {/* OUT OF LOCATION / COARSE GPS CARD */}
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
                Outside Clinic Location / Weak GPS
              </div>
              <div style={{ fontSize: '0.85rem', color: '#fef3c7', lineHeight: 1.45 }}>
                {actionMsg.text}
              </div>
              <div style={{ marginTop: '0.6rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{ background: 'var(--amber)', color: '#000', fontWeight: 700 }}
                  onClick={startGpsWatcher}
                >
                  <RefreshCw size={13} style={{ marginRight: 4 }} /> Refresh GPS
                </button>
                {isCurrentlyIn && (
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    style={{ background: 'var(--rose)', borderColor: 'var(--rose)', fontWeight: 700 }}
                    onClick={() => {
                      const defaultTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                      setForgotCheckoutTime(defaultTime);
                      setShowForgotCheckoutModal(true);
                    }}
                  >
                    <LogOut size={13} style={{ marginRight: 4 }} /> Forgot Check-Out? Close Session →
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => setShowRegModal(true)}
                  style={{ color: '#fbbf24', borderColor: 'rgba(251, 191, 36, 0.4)' }}
                >
                  Request Regularization →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GPS Status Card */}
      <div
        className="glass-card p-4"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderLeft: gps.status === 'ready' ? '4px solid var(--emerald)' : gps.status === 'acquiring' ? '4px solid var(--cyan)' : '4px solid var(--rose)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: gps.status === 'ready' ? 'rgba(16,185,129,0.15)' : gps.status === 'acquiring' ? 'rgba(6,182,212,0.15)' : 'rgba(244,63,94,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {gps.status === 'ready' ? <Navigation size={18} color="var(--emerald)" /> :
             gps.status === 'acquiring' ? <RefreshCw size={18} color="var(--cyan)" className="spinner" /> :
             <WifiOff size={18} color="var(--rose)" />}
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-1)' }}>
              {gps.status === 'ready' ? (gps.accuracy && gps.accuracy > 250 ? 'Location Signal (Coarse Network/Wi-Fi)' : 'Location Signal (GPS Active)') :
               gps.status === 'acquiring' ? 'Acquiring GPS Signal...' :
               gps.status === 'denied' ? 'Location Permission Denied' : 'Location Error'}
            </div>
            <div style={{ fontSize: '0.75rem', color: gps.status === 'ready' ? (gps.accuracy && gps.accuracy > 250 ? 'var(--amber)' : 'var(--emerald)') : 'var(--text-3)', marginTop: 2 }}>
              {gps.accuracy ? (
                <span>GPS Accuracy: ±{gps.accuracy}m {gps.accuracy > 250 ? '(Turn on phone GPS for exact precision)' : '· High Precision'}</span>
              ) : (
                'Waiting for device coordinates...'
              )}
            </div>
          </div>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={startGpsWatcher}
          disabled={gps.status === 'acquiring'}
          title="Refresh GPS Signal"
        >
          <RefreshCw size={14} className={gps.status === 'acquiring' ? 'spinner' : ''} />
        </button>
      </div>


      {/* CUMULATIVE WORK HOURS HERO CARD */}
      {hasEverCheckedInToday && (
        <div
          className="glass-card p-4"
          style={{
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.12) 0%, rgba(13, 148, 136, 0.08) 100%)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Clinic Hours Worked Today
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--text-1)', marginTop: 2 }}>
              {computeLiveTotalWork()}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                padding: '0.3rem 0.8rem',
                borderRadius: '999px',
                background: isCurrentlyIn ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.15)',
                color: isCurrentlyIn ? 'var(--emerald)' : 'var(--rose)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: isCurrentlyIn ? 'var(--emerald)' : 'var(--rose)', animation: isCurrentlyIn ? 'pulse 1.5s infinite' : 'none' }} />
              {isCurrentlyIn ? `Currently In (Session #${sessionCount})` : 'Checked Out (Break / Off Duty)'}
            </span>
          </div>
        </div>
      )}

      {/* DYNAMIC ACTION CARD: MULTI-SESSION CHECK IN / CHECK OUT */}
      <div className="glass-card p-6" style={{ textAlign: 'center' }}>
        {isCurrentlyIn ? (
          /* STATE A: CURRENTLY CHECKED IN -> ACTION IS CHECK OUT */
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              background: 'rgba(16,185,129,0.12)',
              border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: 'var(--r-full)',
              padding: '0.35rem 0.85rem',
              marginBottom: '1.1rem',
              color: 'var(--emerald)',
              fontSize: '0.8rem',
              fontWeight: 700,
              maxWidth: '100%',
              flexWrap: 'wrap',
              textAlign: 'center',
              lineHeight: 1.4
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--emerald)', animation: 'pulse 1.5s infinite', flexShrink: 0 }} />
              <span>ON DUTY · Session #{sessionCount} started at {formatTime(activeSession?.checkInAt)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <button
                className="checkin-btn checkin-btn-out"
                onClick={handleCheckOut}
                disabled={actionLoading || gps.status === 'denied'}
                id="checkout-action-btn"
                style={{
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)',
                  border: '4px solid rgba(255,255,255,0.2)',
                  color: '#ffffff',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  cursor: (actionLoading || gps.status === 'denied') ? 'not-allowed' : 'pointer',
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
                    <span style={{ fontSize: '0.72rem', opacity: 0.85, marginTop: 2 }}>Lunch / Break / End</span>
                  </>
                )}
              </button>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '0.5rem',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)',
              padding: '0.65rem 0.85rem',
              maxWidth: 320,
              margin: '0 auto',
              fontSize: '0.8rem'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Session In</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-1)', marginTop: 2 }}>{formatTime(activeSession?.checkInAt)}</div>
              </div>
              <div style={{ textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Current Session</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--cyan)', marginTop: 2 }}>{getSessionDuration(activeSession?.checkInAt)}</div>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{
                  color: 'var(--rose)',
                  fontSize: '0.78rem',
                  whiteSpace: 'normal',
                  lineHeight: 1.35,
                  maxWidth: '100%',
                  textAlign: 'center',
                  padding: '0.45rem 0.75rem',
                  background: 'rgba(244, 63, 94, 0.08)',
                  border: '1px dashed rgba(244, 63, 94, 0.3)',
                  borderRadius: 'var(--r-sm)',
                  margin: '0.85rem auto 0',
                  display: 'inline-block'
                }}
                onClick={() => {
                  const defaultTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                  setForgotCheckoutTime(defaultTime);
                  setShowForgotCheckoutModal(true);
                }}
              >
                Outside clinic already? Tap here to complete Missed Check-Out
              </button>
            </div>
          </div>
        ) : (
          /* STATE B: NOT CHECKED IN OR RETURN FROM LUNCH -> ACTION IS CHECK IN */
          <div>
            {hasEverCheckedInToday && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: 'var(--r-full)',
                padding: '0.35rem 0.85rem',
                marginBottom: '1.1rem',
                color: 'var(--amber)',
                fontSize: '0.8rem',
                fontWeight: 700,
                maxWidth: '100%',
                flexWrap: 'wrap',
                textAlign: 'center',
                lineHeight: 1.4
              }}>
                <Clock size={14} style={{ flexShrink: 0 }} />
                <span>Checked Out (On Break / Lunch) · Total: {computeLiveTotalWork()}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <button
                className="checkin-btn checkin-btn-in"
                onClick={handleCheckIn}
                disabled={actionLoading || gps.status === 'denied'}
                id="checkin-action-btn"
                style={{
                  borderRadius: '50%',
                  background: hasEverCheckedInToday
                    ? 'linear-gradient(135deg, #0284c7 0%, #0d9488 100%)'
                    : 'linear-gradient(135deg, #0d9488 0%, #06b6d4 100%)',
                  border: '4px solid rgba(255,255,255,0.2)',
                  color: '#ffffff',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  cursor: (actionLoading || gps.status === 'denied') ? 'not-allowed' : 'pointer',
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
                    <span style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '0.04em' }}>
                      {hasEverCheckedInToday ? 'CHECK IN AGAIN' : 'CHECK IN'}
                    </span>
                    <span style={{ fontSize: '0.72rem', opacity: 0.85, marginTop: 2 }}>
                      {hasEverCheckedInToday ? 'Return from Lunch / Break' : 'Start Morning Shift'}
                    </span>
                  </>
                )}
              </button>
            </div>
            <p style={{ color: 'var(--text-3)', fontSize: '0.82rem' }}>
              {gps.status === 'ready' ? 'Tap button when inside clinic' : 'Enable device Location / GPS to Check-In'}
            </p>
          </div>
        )}
      </div>

      {/* TODAY'S SESSIONS BREAKDOWN */}
      {sessions && sessions.length > 0 && (
        <div className="glass-card p-5">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <h3 style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <History size={16} color="var(--primary)" /> Today's Working Sessions ({sessions.length})
            </h3>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--cyan)' }}>
              Total: {computeLiveTotalWork()}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {sessions.map((s, idx) => {
              const isSessionActive = !s.checkOutAt;
              return (
                <div
                  key={s.id || idx}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--r-sm)',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-1)' }}>
                      Session #{s.sessionNumber || idx + 1}
                      {isSessionActive && (
                        <span style={{ marginLeft: '0.5rem', fontSize: '0.72rem', color: 'var(--emerald)', background: 'rgba(16,185,129,0.15)', padding: '0.15rem 0.5rem', borderRadius: 4 }}>
                          Active Now
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginTop: 2 }}>
                      <span style={{ color: 'var(--emerald)' }}>↑ {formatTime(s.checkInAt)}</span>
                      {'  ·  '}
                      <span style={{ color: s.checkOutAt ? 'var(--rose)' : 'var(--text-3)' }}>
                        ↓ {s.checkOutAt ? formatTime(s.checkOutAt) : 'In Progress'}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.92rem', fontWeight: 800, color: isSessionActive ? 'var(--cyan)' : 'var(--text-1)' }}>
                      {getSessionDuration(s.checkInAt, s.checkOutAt)}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>Duration</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TODAY'S GENERAL SUMMARY */}
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
              <Clock size={16} /> Missed Check-In or Weak GPS Signal?
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-2)', marginTop: 2 }}>
              If indoor GPS is weak or you forgot to punch in, submit a quick regularization request to Admin.
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

      {/* Extra bottom clearance for mobile navigation bar */}
      <div style={{ height: 40, flexShrink: 0 }} />

      {/* Regularization Request Modal */}
      <RegularizationRequestModal
        isOpen={showRegModal}
        onClose={() => setShowRegModal(false)}
      />

      {/* Forgot Check-Out Modal (Outside Clinic) */}
      {showForgotCheckoutModal && (
        <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={() => setShowForgotCheckoutModal(false)}>
          <div className="modal" style={{ maxWidth: 440, width: '94%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: 'rgba(244,63,94,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--rose)'
                }}>
                  <LogOut size={20} />
                </div>
                <div>
                  <h3 style={{ fontWeight: 800, fontSize: '1.1rem' }}>Forgot to Check Out?</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Record your departure & stop the timer</p>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowForgotCheckoutModal(false)}><X size={16} /></button>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '0.85rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--text-3)' }}>Session Started At:</span>
                <strong style={{ color: 'var(--text-1)' }}>{formatTime(activeSession?.checkInAt || att?.checkInAt)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                <span style={{ color: 'var(--text-3)' }}>Current Status:</span>
                <span style={{ color: 'var(--amber)', fontWeight: 700 }}>Outside Clinic Premises</span>
              </div>
            </div>

            <form onSubmit={handleForgotCheckoutSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>What time did you leave the clinic? *</label>
                <input
                  type="time"
                  className="form-input"
                  value={forgotCheckoutTime}
                  onChange={e => setForgotCheckoutTime(e.target.value)}
                  required
                  style={{ fontSize: '1.2rem', fontWeight: 700, textAlign: 'center', padding: '0.75rem' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Note / Reason (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Left clinic at shift end, forgot to punch"
                  value={forgotCheckoutReason}
                  onChange={e => setForgotCheckoutReason(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ flex: 1 }}
                  onClick={() => setShowForgotCheckoutModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 2, background: 'linear-gradient(135deg, var(--rose) 0%, #e11d48 100%)' }}
                  disabled={forgotCheckoutLoading || !forgotCheckoutTime}
                >
                  {forgotCheckoutLoading ? 'Closing Session...' : 'Confirm & Check Out'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Smart Long Session Check-Out Warning Modal */}
      {showLongSessionModal && (
        <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={() => setShowLongSessionModal(false)}>
          <div className="modal" style={{ maxWidth: 460, width: '94%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  width: 42, height: 42, borderRadius: '50%',
                  background: 'rgba(245, 158, 11, 0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--amber)'
                }}>
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <h3 style={{ fontWeight: 800, fontSize: '1.1rem' }}>Long Session Detected</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Please verify your check-out departure time</p>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowLongSessionModal(false)}><X size={16} /></button>
            </div>

            <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 'var(--r-md)', padding: '1rem', marginBottom: '1.2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--text-2)' }}>Session Check-In:</span>
                <strong style={{ color: 'var(--emerald)' }}>{formatTime(activeSession?.checkInAt)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--text-2)' }}>Current Time:</span>
                <strong style={{ color: 'var(--cyan)' }}>{now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.4rem', marginTop: '0.4rem' }}>
                <span style={{ color: 'var(--text-2)' }}>Elapsed Duration:</span>
                <strong style={{ color: '#fbbf24', fontWeight: 800 }}>
                  {activeSession?.checkInAt ? `${Math.floor((now.getTime() - new Date(activeSession.checkInAt).getTime()) / 3600000)}h ${Math.floor(((now.getTime() - new Date(activeSession.checkInAt).getTime()) % 3600000) / 60000)}m` : ''}
                </strong>
              </div>
            </div>

            <p style={{ fontSize: '0.84rem', color: 'var(--text-2)', lineHeight: 1.5, marginBottom: '1.2rem' }}>
              Did you work continuously at the clinic until now, or did you leave earlier (e.g. at 10:20 AM, morning shift end, or for lunch)?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #0284c7 0%, #0d9488 100%)',
                  padding: '0.85rem 1rem',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
                onClick={() => {
                  setShowLongSessionModal(false);
                  const defaultTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                  setForgotCheckoutTime(defaultTime);
                  setShowForgotCheckoutModal(true);
                }}
              >
                <Clock size={16} />
                I Left Earlier · Enter Departure Time
              </button>

              <button
                type="button"
                className="btn btn-ghost"
                style={{
                  color: 'var(--text-2)',
                  fontSize: '0.85rem',
                  padding: '0.65rem 1rem',
                  border: '1px solid var(--border)',
                }}
                onClick={async () => {
                  setShowLongSessionModal(false);
                  await executeCheckOut();
                }}
              >
                I Worked Continuously Until Now ({now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })})
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
