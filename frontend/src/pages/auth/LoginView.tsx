import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Building2, Shield, Lock, Mail, ArrowRight, CheckCircle } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState<string>('admin@jigaon.gov.in');
  const [password, setPassword] = useState<string>('Admin@12345');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        'Authentication failed. Please verify your institutional email and password.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSelect = (role: 'admin' | 'engineer') => {
    if (role === 'admin') {
      setEmail('admin@jigaon.gov.in');
      setPassword('Admin@12345');
    } else {
      setEmail('engineer@jigaon.gov.in');
      setPassword('Engineer@12345');
    }
  };

  return (
    <div className="min-h-screen bg-gov-bg flex flex-col justify-between font-sans">
      {/* Top Government Strip */}
      <div className="bg-gov-navy text-white py-2 px-6 border-b border-gov-navy-800 text-xs font-semibold flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-gov-saffron" />
          <span>Government of Maharashtra • Water Resources Department</span>
        </div>
        <div className="text-gov-navy-200 hidden sm:block">
          Official Engineering Valuation Portal
        </div>
      </div>

      {/* Main Login Canvas */}
      <div className="max-w-md w-full mx-auto px-6 py-12">
        <div className="text-center mb-8 space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-gov-navy text-gov-saffron mx-auto flex items-center justify-center shadow-soft-md border border-gov-navy-700">
            <Building2 className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Valuation Portal Login
          </h1>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Automated House Valuation & Estimation Management System (Jigaon Project)
          </p>
        </div>

        <Card variant="default" className="shadow-soft-md border-slate-200/90 p-8 space-y-6">
          {error && (
            <div className="p-3.5 rounded-gov-md bg-rose-50 border border-rose-200 text-rose-800 text-xs leading-relaxed">
              <strong>Error:</strong> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Institutional Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@jigaon.gov.in"
                  className="w-full pl-10 pr-4 py-2.5 rounded-gov-md border border-slate-300 text-sm focus:ring-2 focus:ring-gov-navy focus:border-gov-navy outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-gov-md border border-slate-300 text-sm focus:ring-2 focus:ring-gov-navy focus:border-gov-navy outline-none transition-all"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In to Official Portal
            </Button>
          </form>

          {/* Quick Demo Selector */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">
              Quick One-Click Demo Access
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickSelect('admin')}
                className="p-2.5 rounded-gov-md border border-slate-200 text-left hover:bg-slate-50 transition-colors space-y-0.5"
              >
                <div className="text-xs font-bold text-gov-navy flex items-center gap-1">
                  <Shield className="w-3 h-3 text-gov-saffron" />
                  Admin
                </div>
                <div className="text-[10px] text-slate-500 truncate">admin@jigaon.gov.in</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSelect('engineer')}
                className="p-2.5 rounded-gov-md border border-slate-200 text-left hover:bg-slate-50 transition-colors space-y-0.5"
              >
                <div className="text-xs font-bold text-gov-teal flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-gov-teal" />
                  Estimator
                </div>
                <div className="text-[10px] text-slate-500 truncate">engineer@jigaon.gov.in</div>
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-500 border-t border-slate-200 bg-white">
        Authorized Access Only • Government of Maharashtra • House Valuation Management System
      </footer>
    </div>
  );
};
