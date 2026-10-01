import { LayoutDashboard, CalendarCheck, BookOpen, ClipboardList, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface MobileBottomNavProps {
  activePage: string;
  onNavigate: (page: string) => void;
}

export default function MobileBottomNav({ activePage, onNavigate }: MobileBottomNavProps) {
  const { isAdmin } = useAuth();

  const items = isAdmin ? [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'attendance-today', label: 'Attendance', icon: CalendarCheck },
    { id: 'leave-requests', label: 'Leave', icon: BookOpen },
    { id: 'employees', label: 'Staff', icon: User },
  ] : [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'attendance-today', label: 'Check In', icon: CalendarCheck },
    { id: 'attendance-history', label: 'History', icon: ClipboardList },
    { id: 'leave-apply', label: 'Leave', icon: BookOpen },
  ];

  return (
    <nav className="mobile-bottom-nav">
      <div className="mobile-nav-items">
        {items.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            id={`mobile-nav-${id}`}
            className={`mobile-nav-item ${activePage === id ? 'active' : ''}`}
            onClick={() => onNavigate(id)}
          >
            <Icon size={22} />
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}
