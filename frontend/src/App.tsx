import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/auth/LoginPage';
import Sidebar from './components/layout/Sidebar';
import MobileBottomNav from './components/layout/MobileBottomNav';
import { Menu, Bell } from 'lucide-react';

// Employee Pages
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import AttendancePage from './pages/employee/AttendancePage';
import AttendanceHistoryPage from './pages/employee/AttendanceHistoryPage';
import LeaveApplyPage from './pages/employee/LeaveApplyPage';
import LeaveHistoryPage from './pages/employee/LeaveHistoryPage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AttendanceTodayPage from './pages/admin/AttendanceTodayPage';
import EmployeesPage from './pages/admin/EmployeesPage';
import BranchesPage from './pages/admin/BranchesPage';
import ShiftsPage from './pages/admin/ShiftsPage';
import LeaveRequestsPage from './pages/admin/LeaveRequestsPage';
import LeaveBalancesPage from './pages/admin/LeaveBalancesPage';
import ArchivePage from './pages/admin/ArchivePage';

function AppShell() {
  const { user, loading, isAdmin } = useAuth();
  const [activePage, setActivePage] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
        <div style={{ width: 64, height: 64, background: '#ffffff', borderRadius: 16, padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 40px rgba(13,148,136,0.40)' }}>
          <img src="/logo.png" alt="V3 Dental" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <div className="spinner" />
        <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', fontWeight: 500 }}>Loading V3 Dental…</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const renderPage = () => {
    if (isAdmin) {
      switch (activePage) {
        case 'dashboard':           return <AdminDashboard onNavigate={setActivePage} />;
        case 'employees':           return <EmployeesPage />;
        case 'branches':            return <BranchesPage />;
        case 'shifts':              return <ShiftsPage />;
        case 'attendance-today':    return <AttendanceTodayPage />;
        case 'attendance-history':  return <AttendanceHistoryPage />;
        case 'attendance-archive':  return <ArchivePage />;
        case 'leave-requests':      return <LeaveRequestsPage />;
        case 'leave-balances':      return <LeaveBalancesPage />;
        default:                    return <AdminDashboard onNavigate={setActivePage} />;
      }
    } else {
      switch (activePage) {
        case 'dashboard':           return <EmployeeDashboard onNavigate={setActivePage} />;
        case 'attendance-today':    return <AttendancePage onNavigate={setActivePage} />;
        case 'attendance-history':  return <AttendanceHistoryPage />;
        case 'leave-apply':         return <LeaveApplyPage />;
        case 'leave-history':       return <LeaveHistoryPage />;
        default:                    return <EmployeeDashboard onNavigate={setActivePage} />;
      }
    }
  };

  const pageTitle: Record<string, string> = {
    'dashboard': 'Dashboard',
    'employees': 'Staff Directory',
    'branches': 'Branches',
    'shifts': 'Shifts',
    'attendance-today': isAdmin ? "Today's Attendance" : 'Check In / Out',
    'attendance-history': 'Attendance History',
    'attendance-archive': 'Archive & Export',
    'leave-requests': 'Leave Requests',
    'leave-balances': 'Leave Balances',
    'leave-apply': 'Apply Leave',
    'leave-history': 'Leave History',
  };

  return (
    <div className="app-shell">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      <div className="main-content">
        {/* Mobile Header */}
        <header className="mobile-header">
          <button
            onClick={() => setMobileMenuOpen(true)}
            style={{ background: 'none', border: 'none', color: 'var(--text-1)', padding: '0.25rem', cursor: 'pointer' }}
            id="mobile-menu-btn"
          >
            <Menu size={24} />
          </button>
          <span style={{ fontWeight: 700, fontSize: '1rem', fontFamily: 'var(--font-heading)' }}>
            {pageTitle[activePage] || 'V3 Dental'}
          </span>
          <button style={{ background: 'none', border: 'none', color: 'var(--text-3)', padding: '0.25rem', cursor: 'pointer' }}>
            <Bell size={20} />
          </button>
        </header>

        {/* Desktop Header */}
        <header className="page-header" style={{ display: 'var(--desktop-header-display, flex)' }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{pageTitle[activePage] || 'Dashboard'}</h2>
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>
            {user.firstName} {user.lastName} · {user.branchName || 'All Branches'}
          </div>
        </header>

        {/* Page Content */}
        <main className="page-body">
          {renderPage()}
        </main>
      </div>

      <MobileBottomNav activePage={activePage} onNavigate={setActivePage} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
