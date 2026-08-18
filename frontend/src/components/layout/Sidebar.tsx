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
} from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const Sidebar: React.FC = () => {
  const location = useLocation();

  const primaryNav: NavItem[] = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Projects Registry', path: '/projects', icon: FolderKanban },
    { name: 'Valuation Cases', path: '/cases', icon: FileSpreadsheet },
  ];

  const standardsNav: NavItem[] = [
    { name: 'PWD CSR Rates', path: '/rates', icon: BookOpenCheck },
    { name: '7% Y.P. Factors', path: '/depreciation-factors', icon: Percent },
    { name: 'System Audit Trail', path: '/audit-logs', icon: History },
  ];

  return (
    <aside className="w-64 bg-gov-navy text-white flex flex-col border-r border-gov-navy-900 shadow-soft-md shrink-0 select-none">
      {/* Portal Branding Banner with Maharashtra Seal */}
      <div className="p-4 border-b border-gov-navy-800/80 bg-gov-navy-900/50 flex items-center gap-3">
        <GovtEmblem size="sm" variant="gold" />
        <div className="leading-tight">
          <div className="text-[10px] font-bold text-gov-saffron uppercase tracking-widest">
            Maharashtra Shasan
          </div>
          <div className="text-xs font-extrabold text-white tracking-tight">
            Valuation & Estimation
          </div>
          <div className="text-[10px] text-gov-navy-300">
            Water Resources Dept.
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 px-3 py-5 space-y-6 overflow-y-auto">
        {/* Core Modules */}
        <div className="space-y-1">
          <div className="px-3 text-[10px] font-bold text-gov-navy-400 uppercase tracking-wider mb-2">
            Valuation Management
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
                className={`flex items-center justify-between px-3 py-2.5 rounded-gov-md text-xs font-semibold transition-all group ${
                  isActive
                    ? 'bg-gov-teal text-white shadow-soft-sm'
                    : 'text-slate-300 hover:bg-gov-navy-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                  <span>{item.name}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/80" />}
              </NavLink>
            );
          })}
        </div>

        {/* Standards & Governance */}
        <div className="space-y-1">
          <div className="px-3 text-[10px] font-bold text-gov-navy-400 uppercase tracking-wider mb-2">
            Standards & Governance
          </div>
          {standardsNav.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-3 py-2.5 rounded-gov-md text-xs font-semibold transition-all group ${
                  isActive
                    ? 'bg-gov-teal text-white shadow-soft-sm'
                    : 'text-slate-300 hover:bg-gov-navy-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                  <span>{item.name}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/80" />}
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Footer System Integrity Badge */}
      <div className="p-4 border-t border-gov-navy-800/80 bg-gov-navy-950/50 text-[11px] text-slate-400 space-y-1">
        <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-gov-teal" />
          <span>PWD CSR 2014-15 Compliant</span>
        </div>
        <div className="text-[10px] text-slate-500">
          Compound Interest 7% Y.P. Valuation
        </div>
      </div>
    </aside>
  );
};
