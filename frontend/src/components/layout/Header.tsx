import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import {
  LogOut,
  Calendar,
  Building2,
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
    <header className="h-14 sm:h-16 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-soft-xs min-w-0 w-full">
      {/* Left: Division & Project Context */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <div className="p-2 rounded-lg bg-slate-100 text-gov-navy shrink-0 hidden sm:flex items-center justify-center">
          <Building2 className="w-4 h-4 text-gov-navy" />
        </div>

        <div className="min-w-0">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
            Water Resources Department • Govt. of Maharashtra
          </div>
          <h1 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-snug tracking-tight truncate">
            Jigaon Major Irrigation Project <span className="text-slate-300 font-normal">|</span> Sub-Division No. 2, Nandura
          </h1>
        </div>
      </div>

      {/* Right: Date, Officer Profile & Sign Out */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{currentDate}</span>
        </div>

        <div className="h-4 w-[1px] bg-slate-200 hidden lg:block" />

        {/* Officer Profile Info */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-soft-xs shrink-0">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'V'}
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[130px] md:max-w-[170px]">
              {user?.name?.replace(/\s*\([^)]*\)/g, '') || 'Er. Vishal Bhutekar'}
            </div>
            <div className="text-[10px] text-slate-500 font-medium leading-tight truncate max-w-[170px]">
              {user?.designation || 'Chief System Architect'}
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={logout}
          leftIcon={<LogOut className="w-3.5 h-3.5" />}
          className="text-slate-600 hover:text-rose-700 hover:border-rose-200 text-xs px-2.5 sm:px-3 h-8"
        >
          <span className="hidden sm:inline">Sign Out</span>
        </Button>
      </div>
    </header>
  );
};

