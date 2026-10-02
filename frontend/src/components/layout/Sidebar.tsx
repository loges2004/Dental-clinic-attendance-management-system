import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import ChangePasswordModal from '../auth/ChangePasswordModal';
import {
  LayoutDashboard, Users, Building2, Clock, CalendarCheck, FileText,
  LogOut, ChevronRight, X, Shield, KeyRound,
  ClipboardList, Archive, BookOpen
} from 'lucide-react';

interface NavItemDef { label: string; icon: React.ReactNode; id: string; adminOnly?: boolean; }
interface NavSection { title: string; items: NavItemDef[]; }

const ADMIN_SECTIONS: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', icon: <LayoutDashboard size={17} />, id: 'dashboard' },
    ]
  },
  {
    title: 'Clinic',
    items: [
      { label: 'Branches', icon: <Building2 size={17} />, id: 'branches', adminOnly: true },
      { label: 'Employees', icon: <Users size={17} />, id: 'employees', adminOnly: true },
      { label: 'Shifts', icon: <Clock size={17} />, id: 'shifts', adminOnly: true },
    ]
  },
  {
    title: 'Attendance',
    items: [
      { label: 'Today\'s Attendance', icon: <CalendarCheck size={17} />, id: 'attendance-today' },
      { label: 'History', icon: <ClipboardList size={17} />, id: 'attendance-history' },
      { label: 'Archive', icon: <Archive size={17} />, id: 'attendance-archive', adminOnly: true },
    ]
  },
  {
    title: 'Leave',
    items: [
      { label: 'Leave Requests', icon: <BookOpen size={17} />, id: 'leave-requests' },
      { label: 'Leave Balances', icon: <FileText size={17} />, id: 'leave-balances', adminOnly: true },
    ]
  }
];

const EMPLOYEE_SECTIONS: NavSection[] = [
  {
    title: 'My Work',
    items: [
      { label: 'Dashboard', icon: <LayoutDashboard size={17} />, id: 'dashboard' },
      { label: 'Check In / Out', icon: <CalendarCheck size={17} />, id: 'attendance-today' },
      { label: 'My Attendance', icon: <ClipboardList size={17} />, id: 'attendance-history' },
    ]
  },
  {
    title: 'Leave',
    items: [
      { label: 'Apply Leave', icon: <BookOpen size={17} />, id: 'leave-apply' },
      { label: 'My Leave History', icon: <FileText size={17} />, id: 'leave-history' },
    ]
  }
];

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({ activePage, onNavigate, mobileOpen, onMobileClose }: SidebarProps) {
  const { user, logout, isAdmin } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const sections = isAdmin ? ADMIN_SECTIONS : EMPLOYEE_SECTIONS;

  const handleNav = (id: string) => {
    onNavigate(id);
    onMobileClose();
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.70)', zIndex:990, backdropFilter:'blur(4px)' }}
          onClick={onMobileClose}
        />
      )}

      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon" style={{ background: '#ffffff', padding: '3px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/logo.png" alt="V3 Dental Clinic" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div className="sidebar-logo-text">
            <h2>V3 Dental Clinic</h2>
            <span>{user?.branchName || 'All Branches'}</span>
          </div>
          <button
            onClick={onMobileClose}
            style={{ background:'none', border:'none', color:'var(--text-3)', cursor:'pointer', padding:'0.25rem', display:'none' }}
            className="sidebar-close-btn"
          >
            <X size={20} />
          </button>
        </div>

        {/* User Info Card */}
        <div style={{ padding:'0.75rem 1rem', margin:'0.5rem 0.75rem', background:'rgba(13,148,136,0.08)', border:'1px solid var(--primary-border)', borderRadius:'var(--r-md)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize:'0.85rem', fontWeight:700, color:'var(--text-1)' }}>
              {user?.firstName} {user?.lastName}
            </div>
            <button
              onClick={() => {
                setShowPasswordModal(true);
                onMobileClose();
              }}
              title="Change Password"
              className="btn btn-ghost btn-sm"
              style={{ padding: '0.2rem 0.4rem', color: 'var(--cyan)' }}
            >
              <KeyRound size={13} />
            </button>
          </div>
          <div style={{ fontSize:'0.72rem', color:'var(--primary-light)', marginTop:'0.1rem', display:'flex', alignItems:'center', gap:'0.3rem' }}>
            {isAdmin && <Shield size={11} />}
            {user?.role?.replace('_', ' ')} {user?.designation ? `· ${user.designation}` : ''}
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {sections.map((section) => (
            <div key={section.title} className="sidebar-section">
              <div className="sidebar-section-title">{section.title}</div>
              {section.items
                .filter(item => !item.adminOnly || isAdmin)
                .map(item => (
                  <button
                    key={item.id}
                    className={`nav-item ${activePage === item.id ? 'active' : ''}`}
                    onClick={() => handleNav(item.id)}
                  >
                    {item.icon}
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {activePage === item.id && <ChevronRight size={14} style={{ opacity: 0.6 }} />}
                  </button>
                ))
              }
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <button
            className="nav-item"
            onClick={() => {
              setShowPasswordModal(true);
              onMobileClose();
            }}
            style={{ width: '100%', color: 'var(--cyan)' }}
          >
            <KeyRound size={16} />
            Change Password
          </button>
          <button
            className="nav-item"
            onClick={logout}
            style={{ color: 'var(--rose)', width: '100%' }}
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </>
  );
}
