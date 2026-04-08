import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, PlusCircle, Users, LogOut, Building2, Shield } from 'lucide-react';
import { OfficerRole, hasMinRole } from '@fir/shared';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/authStore';

const primaryNavItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/firs', label: 'FIR Records', icon: FileText },
  { to: '/firs/new', label: 'New FIR', icon: PlusCircle },
  { to: '/station', label: 'Station', icon: Building2 },
];

export function Sidebar() {
  const { logout } = useAuth();
  const officer = useAuthStore((s) => s.officer);
  const canViewOfficers = officer ? hasMinRole(officer.role, OfficerRole.SENIOR_OFFICER) : false;

  return (
    <aside className="flex w-64 flex-col bg-slate-900 text-white">
      <div className="border-b border-slate-700 p-6">
        <div className="mb-1 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 text-blue-200">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <p className="text-lg font-bold leading-tight">FIR System</p>
            <p className="text-xs text-slate-400">Station workspace</p>
          </div>
        </div>
        <p className="truncate text-xs text-slate-300">{officer?.stationName}</p>
        <p className="text-xs text-slate-500">{officer?.stationCode}</p>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {primaryNavItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}

        {canViewOfficers && (
          <NavLink
            to="/officers"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )
            }
          >
            <Users className="h-4 w-4 shrink-0" />
            Officers
          </NavLink>
        )}
      </nav>

      <div className="border-t border-slate-700 p-4">
        <div className="mb-3">
          <p className="truncate text-sm font-medium">{officer?.fullName}</p>
          <p className="text-xs text-slate-400">
            {officer?.rank} | {officer?.badgeNumber}
          </p>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-xs text-slate-400 transition-colors hover:text-red-400"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
