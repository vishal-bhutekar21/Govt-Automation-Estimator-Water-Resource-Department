import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import {
  Building2,
  User,
  LogOut,
  Search,
} from 'lucide-react';

interface HeaderProps {
  currentCaseNumber?: string;
  currentOwnerName?: string;
}

export const Header: React.FC<HeaderProps> = () => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-200/90 px-6 flex items-center justify-between sticky top-0 z-30 shadow-soft-xs">
      {/* Left: Department Branding */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-gov-md bg-gradient-to-br from-gov-navy to-gov-navy-900 flex items-center justify-center text-white shadow-soft-sm shrink-0">
          <Building2 className="w-5 h-5 text-gov-saffron" />
        </div>
        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
            Government of Maharashtra
          </div>
          <h1 className="text-sm font-extrabold text-slate-900 leading-snug tracking-tight">
            Water Resources Department • Jigaon Project
          </h1>
        </div>
      </div>

      {/* Center: Quick Search */}
      <div className="hidden lg:flex items-center flex-1 max-w-md mx-8">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search valuation cases, owner name, survey no..."
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-gov-md border border-slate-200 bg-slate-50/70 focus:bg-white focus:border-gov-navy focus:ring-1 focus:ring-gov-navy transition-all outline-none"
          />
        </div>
      </div>

      {/* Right: User Profile & Actions */}
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-gov-md bg-slate-50 border border-slate-200/80">
          <div className="w-7 h-7 rounded-full bg-gov-navy-100 flex items-center justify-center text-gov-navy">
            <User className="w-4 h-4" />
          </div>
          <div className="text-left">
            <div className="text-xs font-bold text-slate-900 leading-none">
              {user?.name || 'Authorized Officer'}
            </div>
            <div className="text-[10px] text-slate-500 font-medium leading-none mt-0.5">
              {user?.designation || user?.department || 'Valuation Authority'}
            </div>
          </div>
          <Badge variant={user?.role === 'ADMIN' ? 'saffron' : 'teal'}>
            {user?.role || 'ESTIMATOR'}
          </Badge>
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
