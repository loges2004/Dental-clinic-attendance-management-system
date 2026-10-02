import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { attendanceService } from '../../services/attendanceService';
import { Trash2, AlertTriangle, FileText, Table } from 'lucide-react';
import { showAlert } from '../../utils/alerts';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function ArchivePage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  const { data: summary, isLoading, refetch } = useQuery({
    queryKey: ['archive-summary', year, month],
    queryFn: () => attendanceService.getArchiveSummary(year, month),
  });

  const handleDelete = async () => {
    if (deleteConfirm !== 'DELETE') return;
    setDeleting(true);
    try {
      const result = await attendanceService.deleteMonthlyRecords(year, month);
      showAlert.success('Records Deleted!', `${result.deletedRecordsCount} records permanently deleted for ${MONTHS[month-1]} ${year}`);
      setShowDeleteModal(false);
      setDeleteConfirm('');
      refetch();
    } catch (err: any) {
      showAlert.error('Delete Failed', err.response?.data?.message || 'Could not purge records.');
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

      {/* Export Section */}
      <div className="glass-card p-5">
        <h3 style={{ fontWeight: 700, marginBottom: '0.75rem', fontSize: '1rem' }}>Export Reports</h3>
        <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', marginBottom: '1rem' }}>
          Download attendance records for {MONTHS[month-1]} {year} before purging.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            onClick={() => attendanceService.downloadExcel(year, month)}
            id="export-excel-btn"
          >
            <Table size={16} /> Export Excel (.xlsx)
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => attendanceService.downloadPdf(year, month)}
            id="export-pdf-btn"
          >
            <FileText size={16} /> Export PDF (.pdf)
          </button>
        </div>
      </div>

      {/* Danger Zone: Purge Records */}
      <div className="glass-card p-5" style={{ border: '1px solid rgba(244,63,94,0.30)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
          <AlertTriangle size={20} color="var(--rose)" />
          <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--rose)' }}>Purge Monthly Records</h3>
        </div>
        <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', marginBottom: '1rem' }}>
          Permanently delete attendance logs for <strong>{MONTHS[month-1]} {year}</strong>. This action is irreversible. Ensure you have downloaded the backup export first.
        </p>
        <button
          className="btn btn-danger"
          onClick={() => setShowDeleteModal(true)}
          disabled={!summary || summary.totalAttendanceRecords === 0}
          id="purge-records-btn"
        >
          <Trash2 size={16} /> Purge {MONTHS[month-1]} {year} Records
        </button>
      </div>

      {/* Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-title" style={{ color: 'var(--rose)' }}>⚠️ Permanent Deletion Warning</div>
            <div className="modal-body">
              <p style={{ marginBottom: '1rem' }}>
                You are about to permanently delete <strong>{summary?.totalAttendanceRecords}</strong> attendance records for <strong>{MONTHS[month-1]} {year}</strong>.
              </p>
              <p style={{ marginBottom: '1rem', color: 'var(--rose)', fontWeight: 600 }}>
                This data cannot be recovered.
              </p>
              <p style={{ marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                Type <strong>DELETE</strong> to confirm:
              </p>
              <input
                className="form-input"
                value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
                placeholder="Type DELETE"
                style={{ marginBottom: '1rem' }}
                id="delete-confirm-input"
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-ghost btn-full" onClick={() => { setShowDeleteModal(false); setDeleteConfirm(''); }}>Cancel</button>
              <button
                className="btn btn-danger btn-full"
                disabled={deleteConfirm !== 'DELETE' || deleting}
                onClick={handleDelete}
                id="confirm-delete-btn"
              >
                {deleting ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
