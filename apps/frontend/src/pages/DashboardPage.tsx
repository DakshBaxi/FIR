import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FileText, PlusCircle, Users, Building2 } from 'lucide-react';
import { OfficerRole, hasMinRole } from '@fir/shared';
import { useAuthStore } from '../store/authStore';
import { getMyStation } from '../api/station.api';
import { cn } from '../lib/utils';

export function DashboardPage() {
  const officer = useAuthStore((s) => s.officer);
  const canViewOfficers = officer ? hasMinRole(officer.role, OfficerRole.SENIOR_OFFICER) : false;

  const { data: station } = useQuery({
    queryKey: ['station'],
    queryFn: getMyStation,
  });

  const stats = [
    { label: 'Total FIRs', value: station?._count?.firs ?? 0, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Officers', value: station?._count?.officers ?? 0, icon: Users, color: 'text-green-600', bg: 'bg-green-50' },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Welcome, {officer?.fullName}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {officer?.rank} | {officer?.stationName} ({officer?.stationCode})
        </p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="flex items-center gap-4 rounded-xl border bg-white p-6">
            <div className={cn('rounded-lg p-3', bg)}>
              <Icon className={cn('h-6 w-6', color)} />
            </div>
            <div>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-sm text-slate-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Link
          to="/firs/new"
          className="flex items-center gap-4 rounded-xl bg-blue-600 p-6 text-white transition-colors hover:bg-blue-700"
        >
          <PlusCircle className="h-8 w-8" />
          <div>
            <p className="text-lg font-semibold">File New FIR</p>
            <p className="text-sm text-blue-100">AI-powered incident analysis</p>
          </div>
        </Link>

        <Link
          to="/firs"
          className="flex items-center gap-4 rounded-xl border bg-white p-6 transition-colors hover:bg-slate-50"
        >
          <FileText className="h-8 w-8 text-slate-600" />
          <div>
            <p className="text-lg font-semibold">View FIR Records</p>
            <p className="text-sm text-slate-500">Search and manage FIRs</p>
          </div>
        </Link>

        <Link
          to="/station"
          className="flex items-center gap-4 rounded-xl border bg-white p-6 transition-colors hover:bg-slate-50"
        >
          <Building2 className="h-8 w-8 text-slate-600" />
          <div>
            <p className="text-lg font-semibold">Station Details</p>
            <p className="text-sm text-slate-500">{station?.stationName ?? 'Review registered station information'}</p>
          </div>
        </Link>

        {canViewOfficers && (
          <Link
            to="/officers"
            className="flex items-center gap-4 rounded-xl border bg-white p-6 transition-colors hover:bg-slate-50"
          >
            <Users className="h-8 w-8 text-slate-600" />
            <div>
              <p className="text-lg font-semibold">Manage Officers</p>
              <p className="text-sm text-slate-500">Add or update officer accounts</p>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}
