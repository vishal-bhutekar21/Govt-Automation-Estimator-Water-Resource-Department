import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { GovtEmblem } from '../common/GovtEmblem';
import { Button } from '../ui/Button';
import {
  User,
  LogOut,
  Search,
  CheckCircle2,
  Calendar,
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

  return (
    <header className="h-16 bg-white border-b border-slate-200/90 px-6 flex items-center justify-between sticky top-0 z-30 shadow-soft-xs">
      {/* Left: Official Maharashtra Seal & Department Branding */}
      <div className="flex items-center gap-3.5">
        <GovtEmblem size="md" variant="color" className="drop-shadow-sm" />

        <div className="border-l border-slate-200 pl-3.5">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">
            Government of Maharashtra • Water Resources Department
          </div>
          <h1 className="text-sm font-extrabold text-gov-navy leading-snug tracking-tight mt-0.5">
            Jigaon Major Irrigation Project <span className="text-slate-400 font-normal">|</span> Sub-Division No. 2
          </h1>
        </div>
      </div>

      {/* Center: Clean Search Bar */}
      <div className="hidden lg:flex items-center flex-1 max-w-md mx-8">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search valuation cases, owner name, survey no..."
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-gov-md border border-slate-200 bg-slate-50/70 focus:bg-white focus:border-gov-navy focus:ring-1 focus:ring-gov-navy transition-all outline-none text-slate-700"
          />
        </div>
      </div>

      {/* Right: Date, Officer Credentials & Sign Out (Clean & Uncluttered) */}
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
          <Calendar className="w-3.5 h-3.5 text-gov-teal" />
          <span>{currentDate}</span>
        </div>

        <div className="h-5 w-[1px] bg-slate-200 hidden md:block" />

        {/* Minimalist Officer Profile (No Cluttered Chips) */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gov-navy text-white flex items-center justify-center font-bold text-xs shadow-soft-xs">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'O'}
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-xs font-bold text-slate-900 leading-tight">
              {user?.name || 'Authorized Officer'}
            </div>
            <div className="text-[10px] text-slate-500 font-medium leading-tight">
              {user?.designation || 'Irrigation Authority'}
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={logout}
          leftIcon={<LogOut className="w-3.5 h-3.5" />}
          className="text-slate-600 hover:text-rose-700 hover:border-rose-200"
        >
          Sign Out
        </Button>
      </div>
    </header>
  );
};
