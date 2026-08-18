import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { GovtEmblem } from '../../components/common/GovtEmblem';
import {
  ShieldAlert,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  ArrowLeft,
  Key,
} from 'lucide-react';

export const SuperAdminLoginView: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSuperAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await login(email.trim(), password);
      setTimeout(() => {
        navigate('/super-admin/users');
      }, 500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid Super Admin credentials.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
      <div className="max-w-md w-full space-y-6">
        {/* Header with Official Emblem */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-3 rounded-full bg-white border border-slate-200 shadow-soft-sm">
            <GovtEmblem size="lg" />
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-bold text-gov-saffron uppercase tracking-widest">
              State Government Administration Portal
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Super Admin Authorization
            </h1>
            <p className="text-xs text-slate-500">
              Provision and manage officer credentials for Water Resources Department
            </p>
          </div>
        </div>

        {/* Super Admin Login Card */}
        <Card className="p-6 sm:p-8 bg-white border-2 border-slate-200 shadow-soft-lg rounded-gov-lg space-y-5">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-800">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Super Admin Sign In</h2>
              <p className="text-[11px] text-slate-500">Authorized administrative access only</p>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-gov-md bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium animate-fadeIn">
              {error}
            </div>
          )}

          <form onSubmit={handleSuperAdminLogin} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700">Super Admin Email ID</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vishal.bhutekar1@gmai.com"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-gov-md focus:border-gov-navy focus:ring-1 focus:ring-gov-navy transition-all outline-none text-slate-800"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700">Master Access Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-gov-md focus:border-gov-navy focus:ring-1 focus:ring-gov-navy transition-all outline-none text-slate-800 font-mono"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isLoading}
              className="w-full justify-center bg-gov-navy hover:bg-gov-navy-900 font-bold shadow-soft-sm"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Access Officer Management
            </Button>
          </form>

          {/* Footer Back Link */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <Link
              to="/login"
              className="text-slate-600 hover:text-gov-navy font-semibold flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Standard Login
            </Link>

            <span className="text-[10px] text-slate-400">
              Encrypted Audit Session
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
};
