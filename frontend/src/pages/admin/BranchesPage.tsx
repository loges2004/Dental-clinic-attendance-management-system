import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { branchService } from '../../services/branchService';
import { Building2, MapPin, Edit2 } from 'lucide-react';

export default function BranchesPage() {
  const { data: branches, isLoading, refetch } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchService.getAllBranches(),
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const startEdit = (b: any) => {
    setEditingId(b.id);
    setEditForm({ ...b });
  };

  const handleSave = async () => {
    setSaving(true); setMsg(null);
    try {
      await branchService.updateBranch(editingId!, editForm);
      setMsg({ type: 'success', text: '✓ Branch settings updated!' });
      setEditingId(null);
      refetch();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Update failed' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Branch Management</h1>
        <p style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>Configure geofence coordinates and GPS radius for each clinic branch</p>
      </div>

      {msg && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--r-sm)', fontSize: '0.875rem', fontWeight: 600, background: msg.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)', color: msg.type === 'success' ? 'var(--emerald)' : 'var(--rose)', border: `1px solid ${msg.type === 'success' ? 'rgba(16,185,129,0.30)' : 'rgba(244,63,94,0.30)'}` }}>
          {msg.text}
        </div>
      )}

      {isLoading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {branches?.map(branch => (
            <div key={branch.id} className="glass-card p-5">
              {editingId === branch.id && editForm ? (
                <div>
                  <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Edit {branch.name}</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div className="form-group">
                      <label className="form-label">Branch Name</label>
                      <input className="form-input" value={editForm.name} onChange={e => setEditForm((f: any) => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Address</label>
                      <input className="form-input" value={editForm.address || ''} onChange={e => setEditForm((f: any) => ({ ...f, address: e.target.value }))} />
                    </div>
                    <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label">Latitude</label>
                        <input className="form-input" type="number" step="any" value={editForm.latitude} onChange={e => setEditForm((f: any) => ({ ...f, latitude: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Longitude</label>
                        <input className="form-input" type="number" step="any" value={editForm.longitude} onChange={e => setEditForm((f: any) => ({ ...f, longitude: e.target.value }))} />
                      </div>
                    </div>
                    <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label">Allowed Radius (meters)</label>
                        <input className="form-input" type="number" value={editForm.allowedRadiusMeters} onChange={e => setEditForm((f: any) => ({ ...f, allowedRadiusMeters: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Max GPS Accuracy (meters)</label>
                        <input className="form-input" type="number" value={editForm.maxGpsAccuracyMeters} onChange={e => setEditForm((f: any) => ({ ...f, maxGpsAccuracyMeters: e.target.value }))} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button className="btn btn-ghost" onClick={() => setEditingId(null)} style={{ flex: 1 }}>Cancel</button>
                      <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ flex: 2 }}>
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: 40, height: 40, borderRadius: 'var(--r-sm)', background: 'rgba(13,148,136,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Building2 size={20} color="var(--primary-light)" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700 }}>{branch.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{branch.code}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span className={`badge ${branch.isActive ? 'badge-emerald' : 'badge-rose'}`}>
                        {branch.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <button className="btn btn-ghost btn-sm" onClick={() => startEdit(branch)} id={`edit-branch-${branch.id}`}>
                        <Edit2 size={14} />
                      </button>
                    </div>
                  </div>

                  {branch.address && (
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-2)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <MapPin size={13} /> {branch.address}
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.6rem' }}>
                    <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--r-sm)', padding: '0.65rem', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>GPS Location</div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, fontFamily: 'monospace', color: 'var(--cyan)' }}>
                        {branch.latitude}, {branch.longitude}
                      </div>
                    </div>
                    <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--r-sm)', padding: '0.65rem', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Allowed Radius</div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary-light)' }}>{branch.allowedRadiusMeters}m</div>
                    </div>
                    <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--r-sm)', padding: '0.65rem', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Max GPS Accuracy</div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--amber)' }}>{branch.maxGpsAccuracyMeters}m</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
