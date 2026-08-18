import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { GovtEmblem } from '../common/GovtEmblem';
import {
  LayoutDashboard,
  FolderKanban,
  FileSpreadsheet,
  BookOpenCheck,
  Percent,
  History,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Building,
  CheckCircle,
} from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export const Sidebar: React.FC = () => {
  const location = useLocation();

  const primaryNav: NavItem[] = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Projects Registry', path: '/projects', icon: FolderKanban },
    { name: 'Valuation Cases', path: '/cases', icon: FileSpreadsheet, badge: 'Active' },
  ];

  const standardsNav: NavItem[] = [
    { name: 'PWD CSR Rate Database', path: '/rates', icon: BookOpenCheck },
    { name: '7% Y.P. Factors Table', path: '/depreciation-factors', icon: Percent },
    { name: 'System Audit Trail', path: '/audit-logs', icon: History },
  ];

  return (
    <aside className="w-64 bg-[#0c1a2f] text-slate-200 flex flex-col border-r border-slate-800/80 shadow-soft-lg shrink-0 select-none h-full">
      {/* Portal Branding Header */}
      <div className="p-4 border-b border-slate-800/80 bg-[#081220]/70 flex items-center gap-3">
        <div className="p-1 rounded-full bg-white shadow-soft-xs shrink-0 flex items-center justify-center">
          <GovtEmblem size="sm" />
        </div>
        <div className="leading-tight overflow-hidden">
          <div className="text-[10px] font-extrabold text-gov-saffron uppercase tracking-widest truncate">
            Government of Maharashtra
          </div>
          <div className="text-xs font-bold text-white tracking-tight truncate">
            Valuation & Estimation
          </div>
          <div className="text-[10px] text-slate-400 font-medium truncate">
            Water Resources Dept.
          </div>
        </div>
      </div>

      {/* Main Navigation Links */}
      <div className="flex-1 px-3 py-5 space-y-6 overflow-y-auto scrollbar-thin">
        {/* Core Valuation Workflow */}
        <div className="space-y-1.5">
          <div className="px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 flex items-center justify-between">
            <span>Valuation Management</span>
          </div>
          {primaryNav.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/dashboard' && location.pathname.startsWith(item.path));

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`group relative flex items-center justify-between px-3 py-2.5 rounded-gov-md text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-gov-teal-700 to-gov-teal-800 text-white shadow-soft-sm border-l-4 border-gov-saffron pl-2.5'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive
                        ? 'text-white'
                        : 'text-slate-400 group-hover:text-gov-teal-300'
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {item.badge && !isActive && (
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/90" />}
                </div>
              </NavLink>
            );
          })}
        </div>

        {/* Standards & Governance */}
        <div className="space-y-1.5">
          <div className="px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 flex items-center justify-between">
            <span>Standards & Auditing</span>
          </div>
          {standardsNav.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`group relative flex items-center justify-between px-3 py-2.5 rounded-gov-md text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-gov-teal-700 to-gov-teal-800 text-white shadow-soft-sm border-l-4 border-gov-saffron pl-2.5'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive
                        ? 'text-white'
                        : 'text-slate-400 group-hover:text-gov-teal-300'
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/90" />}
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Division Office & Integrity Footer */}
      <div className="p-3.5 border-t border-slate-800/80 bg-[#081220]/80 space-y-2">
        <div className="p-2 rounded bg-slate-800/40 border border-slate-700/60 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-white">
            <Building className="w-3.5 h-3.5 text-gov-saffron" />
            <span className="truncate">Jigaon Sub-Division No. 2</span>
          </div>
          <div className="text-[10px] text-slate-400 truncate">
            Nandura, Dist. Buldhana
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
          <div className="flex items-center gap-1 text-emerald-400 font-semibold">
            <CheckCircle className="w-3 h-3" />
            <span>CSR 2014-15</span>
          </div>
          <span className="font-mono text-slate-500">v2.4.0</span>
        </div>
      </div>
    </aside>
  );
};
