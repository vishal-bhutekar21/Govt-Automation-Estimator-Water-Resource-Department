import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { GovtEmblem } from '../common/GovtEmblem';
import { Button } from '../ui/Button';
import {
  LogOut,
  Calendar,
  ShieldCheck,
} from 'lucide-react';

interface HeaderProps {
  currentCaseNumber?: string;
  currentOwnerName?: string;
}

export const Header: React.FC<HeaderProps> = () => {
  const { user, logout } = useAuth();
  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const isSuperAdmin = user?.email?.toLowerCase().includes('vishal') || user?.role === 'ADMIN';

  const getRoleBadge = () => {
    if (user?.email?.toLowerCase().includes('vishal')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
          <ShieldCheck className="w-3 h-3 text-amber-700" />
          SUPER ADMIN
        </span>
      );
    }
    if (user?.role === 'ADMIN') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-900 border border-blue-200">
          EXECUTIVE ENGINEER
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-100 text-teal-900 border border-teal-200">
        ASSISTANT ENGINEER
      </span>
    );
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-soft-xs min-w-0">
      {/* Left: Official Maharashtra Seal & Department Branding */}
      <div className="flex items-center gap-3 min-w-0">
        <GovtEmblem size="md" variant="color" className="drop-shadow-sm shrink-0" />

        <div className="border-l border-slate-200 pl-3 min-w-0">
          <div className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
            Govt. of Maharashtra • Water Resources Department
          </div>
          <h1 className="text-xs sm:text-sm font-extrabold text-gov-navy leading-snug tracking-tight truncate">
            Jigaon Major Irrigation Project <span className="text-slate-400 font-normal">|</span> Sub-Div. No. 2
          </h1>
        </div>
      </div>



      {/* Right: Date, Role Pill, Officer Profile & Sign Out */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        <div className="hidden md:flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
          <Calendar className="w-3.5 h-3.5 text-gov-teal" />
          <span>{currentDate}</span>
        </div>

        <div className="h-5 w-[1px] bg-slate-200 hidden md:block" />

        {/* Officer Profile with Role Badge */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gov-navy text-white flex items-center justify-center font-bold text-xs shadow-soft-xs shrink-0">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'O'}
          </div>
          <div className="text-left hidden sm:block">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[130px] md:max-w-[170px]">
                {user?.name || 'Authorized Officer'}
              </span>
              {getRoleBadge()}
            </div>
            <div className="text-[10px] text-slate-500 font-medium leading-tight truncate max-w-[200px]">
              {user?.designation || 'Irrigation Authority'}
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={logout}
          leftIcon={<LogOut className="w-3.5 h-3.5" />}
          className="text-slate-600 hover:text-rose-700 hover:border-rose-200 text-xs px-2.5 sm:px-3"
        >
          <span className="hidden sm:inline">Sign Out</span>
        </Button>
      </div>
    </header>
  );
};
