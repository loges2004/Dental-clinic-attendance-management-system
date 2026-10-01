import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { attendanceService } from '../../services/attendanceService';
import { Trash2, AlertTriangle, FileText, Table } from 'lucide-react';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function ArchivePage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<string | null>(null);

  const { data: summary, isLoading, refetch } = useQuery({
    queryKey: ['archive-summary', year, month],
    queryFn: () => attendanceService.getArchiveSummary(year, month),
  });

  const handleDelete = async () => {
    if (deleteConfirm !== 'DELETE') return;
    setDeleting(true);
    try {
      const result = await attendanceService.deleteMonthlyRecords(year, month);
      setDeleteResult(`✓ ${result.deletedRecordsCount} records permanently deleted for ${MONTHS[month-1]} ${year}`);
      setShowDeleteModal(false);
      setDeleteConfirm('');
      refetch();
    } catch (err: any) {
      setDeleteResult(`Error: ${err.response?.data?.message || 'Delete failed'}`);
    } finally {
      setDeleting(false);
    }
  };

  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Attendance Archive</h1>
        <p style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>Export monthly reports and safely purge attendance records</p>
      </div>

      {/* Month Selector */}
      <div className="glass-card p-5">
        <h3 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '1rem' }}>Select Period</h3>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Year</label>
            <select className="form-select" value={year} onChange={e => setYear(Number(e.target.value))}>
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Month</label>
            <select className="form-select" value={month} onChange={e => setMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Summary */}
      {isLoading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : summary && (
        <div className="glass-card p-5">
          <h3 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '1rem' }}>
            {MONTHS[month-1]} {year} Summary
          </h3>
          <div className="archive-stat-grid">
            <div className="archive-stat">
              <div className="archive-stat-val" style={{ color: 'var(--cyan)' }}>{summary.totalAttendanceRecords}</div>
              <div className="archive-stat-lbl">Total Records</div>
            </div>
            <div className="archive-stat">
              <div className="archive-stat-val" style={{ color: 'var(--emerald)' }}>{summary.presentCount}</div>
              <div className="archive-stat-lbl">Present</div>
            </div>
            <div className="archive-stat">
              <div className="archive-stat-val" style={{ color: 'var(--amber)' }}>{summary.lateCount}</div>
              <div className="archive-stat-lbl">Late</div>
            </div>
            <div className="archive-stat">
              <div className="archive-stat-val" style={{ color: 'var(--rose)' }}>{summary.absentCount}</div>
              <div className="archive-stat-lbl">Absent</div>
            </div>
            <div className="archive-stat">
              <div className="archive-stat-val" style={{ color: 'var(--violet)' }}>{summary.onLeaveCount}</div>
              <div className="archive-stat-lbl">On Leave</div>
            </div>
            <div className="archive-stat">
              <div className="archive-stat-val" style={{ color: 'var(--text-2)' }}>{summary.totalDaysInMonth}</div>
              <div className="archive-stat-lbl">Working Days</div>
            </div>
          </div>
        </div>
      )}

      {/* Export Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <button
          className="btn btn-primary btn-full"
          onClick={() => attendanceService.downloadPdf(year, month)}
          id="download-pdf-btn"
        >
          <FileText size={18} /> Download PDF Report — {MONTHS[month-1]} {year}
        </button>
        <button
          className="btn btn-ghost btn-full"
          onClick={() => attendanceService.downloadExcel(year, month)}
          id="download-excel-btn"
        >
          <Table size={18} /> Download Excel / CSV — {MONTHS[month-1]} {year}
        </button>
      </div>

      {deleteResult && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--r-sm)', fontSize: '0.875rem', fontWeight: 600, background: deleteResult.startsWith('✓') ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)', color: deleteResult.startsWith('✓') ? 'var(--emerald)' : 'var(--rose)', border: `1px solid ${deleteResult.startsWith('✓') ? 'rgba(16,185,129,0.30)' : 'rgba(244,63,94,0.30)'}` }}>
          {deleteResult}
        </div>
      )}

      {/* Danger Zone */}
      <div className="glass-card p-5" style={{ borderColor: 'rgba(244,63,94,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
          <AlertTriangle size={18} color="var(--rose)" />
          <h3 style={{ fontWeight: 700, color: 'var(--rose)', fontSize: '0.95rem' }}>Danger Zone</h3>
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-2)', marginBottom: '1rem' }}>
          Permanently delete all attendance records for <strong>{MONTHS[month-1]} {year}</strong>. 
          This action cannot be undone. Download PDF &amp; Excel reports first.
        </p>
        <button
          className="btn btn-danger btn-full"
          onClick={() => { setShowDeleteModal(true); setDeleteConfirm(''); }}
          id="delete-archive-btn"
        >
          <Trash2 size={16} /> Delete {MONTHS[month-1]} {year} Records
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <AlertTriangle size={24} color="var(--rose)" />
              <h2 className="modal-title" style={{ margin: 0 }}>Confirm Permanent Deletion</h2>
            </div>
            <div className="modal-body">
              This will <strong>permanently delete</strong> all attendance records for{' '}
              <strong>{MONTHS[month-1]} {year}</strong>. Make sure you have downloaded and safely stored 
              the report before continuing.
              <br /><br />
              Type <code style={{ background: 'rgba(244,63,94,0.15)', padding: '0.1rem 0.4rem', borderRadius: '4px', color: 'var(--rose)' }}>DELETE</code> to confirm:
            </div>
            <input
              className="form-input"
              style={{ marginBottom: '1rem' }}
              placeholder="Type DELETE to confirm"
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              id="delete-confirm-input"
            />
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-ghost btn-full" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-danger btn-full"
                disabled={deleteConfirm !== 'DELETE' || deleting}
                onClick={handleDelete}
                id="confirm-delete-btn"
              >
                {deleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
