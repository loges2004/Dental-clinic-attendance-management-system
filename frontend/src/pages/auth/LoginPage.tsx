import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Activity, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) { setError('Username and password are required'); return; }
    setLoading(true); setError('');
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Background orbs */}
      <div className="login-bg-orb" style={{ width:400, height:400, background:'rgba(13,148,136,0.12)', top:'-100px', left:'-100px' }} />
      <div className="login-bg-orb" style={{ width:300, height:300, background:'rgba(6,182,212,0.08)', bottom:'-50px', right:'-50px' }} />

      <div className="login-card">
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:'2rem' }}>
          <div style={{ display:'flex', justifyContent:'center', marginBottom:'1rem' }}>
            <div style={{ width:72, height:72, background:'#ffffff', borderRadius:18, padding:6, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 30px rgba(13,148,136,0.40)' }}>
              <img src="/logo.png" alt="V3 Dental" style={{ width:'100%', height:'100%', objectFit:'contain' }} />
            </div>
          </div>
          <h1 style={{ fontSize:'1.5rem', fontWeight:800, marginBottom:'0.25rem' }}>V3 Dental Clinic</h1>
          <p style={{ color:'var(--text-2)', fontSize:'0.875rem' }}>Attendance & Staff Management</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              id="login-username"
              className="form-input"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position:'relative' }}>
              <input
                id="login-password"
                className="form-input"
                type={showPass ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ paddingRight:'2.75rem' }}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{ position:'absolute', right:'0.75rem', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text-3)', cursor:'pointer', padding:'0.25rem' }}
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ background:'rgba(244,63,94,0.12)', border:'1px solid rgba(244,63,94,0.30)', borderRadius:'var(--r-sm)', padding:'0.65rem 0.9rem', fontSize:'0.85rem', color:'#fca5a5', display:'flex', alignItems:'center', gap:'0.5rem' }}>
              {error}
            </div>
          )}

          <button
            id="login-submit-btn"
            type="submit"
            className="btn btn-primary btn-full"
            style={{ marginTop:'0.5rem', padding:'0.85rem', fontSize:'1rem' }}
            disabled={loading}
          >
            {loading ? (
              <><div className="spinner" style={{ width:20, height:20, borderWidth:2 }} /> Signing in...</>
            ) : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop:'1.5rem', textAlign:'center', color:'var(--text-3)', fontSize:'0.75rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', justifyContent:'center' }}>
            <Activity size={14} />
            GPS-Verified Attendance System
          </div>
          <div style={{ marginTop:'0.25rem' }}>Saibaba Colony &amp; Kannappa Nagar</div>
        </div>
      </div>
    </div>
  );
}
