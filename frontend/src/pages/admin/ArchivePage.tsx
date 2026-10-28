import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { attendanceService } from '../../services/attendanceService';
import { Trash2, AlertTriangle, FileText, Table, Search, RotateCcw, Calendar, CheckCircle2 } from 'lucide-react';
import { showAlert } from '../../utils/alerts';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function ArchivePage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  // Default from/to dates for selected month
  const padMonth = String(month).padStart(2, '0');
  const daysInMonth = new Date(year, month, 0).getDate();
  const defaultFrom = `${year}-${padMonth}-01`;
  const defaultTo = `${year}-${padMonth}-${String(daysInMonth).padStart(2, '0')}`;

  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);
  const [searchTerm, setSearchTerm] = useState('');

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Month change syncs date range
  const handleMonthChange = (newMonth: number) => {
    setMonth(newMonth);
    const pm = String(newMonth).padStart(2, '0');
    const dim = new Date(year, newMonth, 0).getDate();
    setFromDate(`${year}-${pm}-01`);
    setToDate(`${year}-${pm}-${String(dim).padStart(2, '0')}`);
  };

  const handleYearChange = (newYear: number) => {
    setYear(newYear);
    const pm = String(month).padStart(2, '0');
    const dim = new Date(newYear, month, 0).getDate();
    setFromDate(`${newYear}-${pm}-01`);
    setToDate(`${newYear}-${pm}-${String(dim).padStart(2, '0')}`);
  };

  const resetToFullMonth = () => {
    const pm = String(month).padStart(2, '0');
    const dim = new Date(year, month, 0).getDate();
    setFromDate(`${year}-${pm}-01`);
    setToDate(`${year}-${pm}-${String(dim).padStart(2, '0')}`);
  };

  // High-level summary
  const { data: summary, isLoading: isSummaryLoading, refetch: refetchSummary } = useQuery({
    queryKey: ['archive-summary', year, month],
    queryFn: () => attendanceService.getArchiveSummary(year, month),
  });

  // Detailed employee salary attendance summary
  const { data: salarySummary, isLoading: isSalaryLoading, refetch: refetchSalary } = useQuery({
    queryKey: ['archive-salary-summary', year, month, fromDate, toDate],
    queryFn: () => attendanceService.getSalaryAttendanceSummary({ year, month, fromDate, toDate }),
  });

  const handleDelete = async () => {
    if (deleteConfirm !== 'DELETE') return;
    setDeleting(true);
    try {
      const result = await attendanceService.deleteMonthlyRecords(year, month);
      showAlert.success('Records Deleted!', `${result.deletedRecordsCount} records permanently deleted for ${MONTHS[month-1]} ${year}`);
      setShowDeleteModal(false);
      setDeleteConfirm('');
      refetchSummary();
      refetchSalary();
    } catch (err: any) {
      showAlert.error('Delete Failed', err.response?.data?.message || 'Could not purge records.');
    } finally {
      setDeleting(false);
    }
  };

  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  const filteredSalaryList = (salarySummary || []).filter(row => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      row.employeeName.toLowerCase().includes(term) ||
      row.employeeCode.toLowerCase().includes(term) ||
      (row.designation && row.designation.toLowerCase().includes(term)) ||
      (row.branchName && row.branchName.toLowerCase().includes(term))
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Attendance & Salary Archive</h1>
        <p style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>
          Calculate monthly working days, leaves, hours, and late minutes for salary calculation and export official reports
        </p>
      </div>

      {/* Period & Date Range Filter Card */}
      <div className="glass-card p-5">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 style={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={17} color="var(--primary-light)" /> Select Period & Date Range
          </h3>
          <button className="btn btn-ghost btn-sm" onClick={resetToFullMonth} style={{ fontSize: '0.78rem' }}>
            <RotateCcw size={13} /> Reset to Full Month
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Year</label>
            <select className="form-select" value={year} onChange={e => handleYearChange(Number(e.target.value))}>
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Month</label>
            <select className="form-select" value={month} onChange={e => handleMonthChange(Number(e.target.value))}>
              {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">From Date (Salary Start)</label>
            <input
              type="date"
              className="form-input"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">To Date (Salary End)</label>
            <input
              type="date"
              className="form-input"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Monthly High-Level Summary */}
      {isSummaryLoading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : summary && (
        <div className="glass-card p-5">
          <h3 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '1rem' }}>
            {MONTHS[month-1]} {year} Overview
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
              <div className="archive-stat-lbl">Late Arrivals</div>
            </div>
            <div className="archive-stat">
              <div className="archive-stat-val" style={{ color: 'var(--rose)' }}>{summary.absentCount}</div>
              <div className="archive-stat-lbl">Absent</div>
            </div>
            <div className="archive-stat">
              <div className="archive-stat-val" style={{ color: 'var(--violet)' }}>{summary.onLeaveCount}</div>
              <div className="archive-stat-lbl">Approved Leaves</div>
            </div>
            <div className="archive-stat">
              <div className="archive-stat-val" style={{ color: 'var(--text-1)' }}>{summary.totalDaysInMonth}</div>
              <div className="archive-stat-lbl">Total Days (Inc. Sundays)</div>
            </div>
          </div>
        </div>
      )}

      {/* Export Section (Excel and PDF) */}
      <div className="glass-card p-5">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem' }}>Export Salary & Attendance Report</h3>
            <p style={{ color: 'var(--text-2)', fontSize: '0.84rem' }}>
              Downloads structured table ({fromDate} to {toDate}) with Present Days, Leaves, Working Hours, Late Count & Late Minutes.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              onClick={async () => {
                try {
                  await attendanceService.downloadSalaryExcel({ year, month, fromDate, toDate });
                  showAlert.success('Excel Exported', `Salary attendance report downloaded for ${MONTHS[month-1]} ${year}.`);
                } catch (err: any) {
                  showAlert.error('Export Failed', err.response?.data?.message || 'Could not export Excel file.');
                }
              }}
              id="export-excel-btn"
            >
              <Table size={16} /> Download Excel / CSV
            </button>
            <button
              className="btn btn-ghost"
              onClick={async () => {
                try {
                  await attendanceService.downloadSalaryPdf({ year, month, fromDate, toDate });
                  showAlert.success('PDF Exported', `Official salary archive PDF generated for ${MONTHS[month-1]} ${year}.`);
                } catch (err: any) {
                  showAlert.error('Export Failed', err.response?.data?.message || 'Could not export PDF file.');
                }
              }}
              id="export-pdf-btn"
            >
              <FileText size={16} /> Download PDF (.pdf)
            </button>
          </div>
        </div>
      </div>

      {/* Salary & Attendance Calculation Table (Matching User's Given Structure) */}
      <div className="glass-card p-5">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ fontWeight: 800, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={18} color="var(--emerald)" /> Staff Salary Calculation Summary
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginTop: 2 }}>
              Period: {fromDate} to {toDate} · All Days Including Sundays (No Sundays Excluded) · Working Days = Present + Leave + Absent
            </p>
          </div>

          <div style={{ position: 'relative', width: 240 }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
            <input
              className="form-input"
              style={{ paddingLeft: '2rem', height: '34px', fontSize: '0.82rem' }}
              placeholder="Search employee..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {isSalaryLoading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : !filteredSalaryList.length ? (
          <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: '2rem' }}>
            No staff records found for the selected period
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table" style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                  <th style={{ padding: '0.65rem 0.5rem', whiteSpace: 'nowrap' }}>S.No.</th>
                  <th style={{ padding: '0.65rem 0.6rem', whiteSpace: 'nowrap' }}>Employee ID</th>
                  <th style={{ padding: '0.65rem 0.8rem', textAlign: 'left', whiteSpace: 'nowrap' }}>Employee Name</th>
                  <th style={{ padding: '0.65rem 0.6rem', whiteSpace: 'nowrap' }}>Month</th>
                  <th style={{ padding: '0.65rem 0.6rem', whiteSpace: 'nowrap' }}>From Date</th>
                  <th style={{ padding: '0.65rem 0.6rem', whiteSpace: 'nowrap' }}>To Date</th>
                  <th style={{ padding: '0.65rem 0.6rem', whiteSpace: 'nowrap', color: 'var(--primary-light)' }}>Total Days</th>
                  <th style={{ padding: '0.65rem 0.6rem', whiteSpace: 'nowrap', color: 'var(--cyan)' }}>Total Working Days</th>
                  <th style={{ padding: '0.65rem 0.6rem', whiteSpace: 'nowrap', color: 'var(--emerald)' }}>Present Days</th>
                  <th style={{ padding: '0.65rem 0.6rem', whiteSpace: 'nowrap', color: 'var(--violet)' }}>Leave Days</th>
                  <th style={{ padding: '0.65rem 0.6rem', whiteSpace: 'nowrap', color: 'var(--rose)' }}>Absent Days</th>
                  <th style={{ padding: '0.65rem 0.7rem', whiteSpace: 'nowrap', color: 'var(--primary-light)', fontWeight: 800 }}>Total Working Hours</th>
                  <th style={{ padding: '0.65rem 0.6rem', whiteSpace: 'nowrap', color: 'var(--amber)' }}>Late Count</th>
                  <th style={{ padding: '0.65rem 0.6rem', whiteSpace: 'nowrap', color: 'var(--amber)' }}>Total Late Minutes</th>
                </tr>
              </thead>
              <tbody>
                {filteredSalaryList.map((row) => (
                  <tr
                    key={row.employeeId}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                      textAlign: 'center',
                      transition: 'background 0.15s',
                    }}
                  >
                    <td style={{ padding: '0.65rem 0.5rem', fontWeight: 600 }}>{row.sNo}</td>
                    <td style={{ padding: '0.65rem 0.6rem', fontWeight: 700, color: 'var(--text-2)' }}>{row.employeeCode}</td>
                    <td style={{ padding: '0.65rem 0.8rem', textAlign: 'left', fontWeight: 700 }}>
                      <div>{row.employeeName}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontWeight: 400 }}>{row.designation} · {row.branchName}</div>
                    </td>
                    <td style={{ padding: '0.65rem 0.6rem', color: 'var(--text-2)' }}>{row.month}</td>
                    <td style={{ padding: '0.65rem 0.6rem', color: 'var(--text-2)' }}>{row.fromDate}</td>
                    <td style={{ padding: '0.65rem 0.6rem', color: 'var(--text-2)' }}>{row.toDate}</td>
                    <td style={{ padding: '0.65rem 0.6rem', fontWeight: 800, color: 'var(--primary-light)' }}>{row.totalDays}</td>
                    <td style={{ padding: '0.65rem 0.6rem', fontWeight: 700 }}>{row.totalWorkingDays}</td>
                    <td style={{ padding: '0.65rem 0.6rem' }}>
                      <span className="badge badge-emerald" style={{ fontSize: '0.78rem' }}>{row.presentDays}</span>
                    </td>
                    <td style={{ padding: '0.65rem 0.6rem' }}>
                      <span className="badge badge-cyan" style={{ fontSize: '0.78rem' }}>{row.leaveDays}</span>
                    </td>
                    <td style={{ padding: '0.65rem 0.6rem' }}>
                      <span className={row.absentDays > 0 ? 'badge badge-rose' : 'badge badge-gray'} style={{ fontSize: '0.78rem' }}>
                        {row.absentDays}
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem 0.7rem', fontWeight: 800, color: 'var(--cyan)' }}>
                      {row.totalWorkingHours}
                    </td>
                    <td style={{ padding: '0.65rem 0.6rem' }}>
                      <span className={row.lateCount > 0 ? 'badge badge-amber' : 'badge badge-gray'} style={{ fontSize: '0.78rem' }}>
                        {row.lateCount}
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem 0.6rem', fontWeight: 700, color: row.totalLateMinutes > 0 ? 'var(--amber)' : 'var(--text-3)' }}>
                      {row.totalLateMinutes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
