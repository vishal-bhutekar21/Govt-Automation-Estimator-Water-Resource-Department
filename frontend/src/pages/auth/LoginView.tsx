import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { GovtEmblem } from '../../components/common/GovtEmblem';
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  Building2,
  FileCheck2,
  Scale,
  Sparkles,
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const [email, setEmail] = useState('engineer@jigaon.gov.in');
  const [password, setPassword] = useState('Engineer@12345');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Verifying credentials...');
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setLoadingMessage('Authenticating institutional credentials...');

    try {
      await login(email, password);
      setLoadingMessage('Establishing secure session with Jigaon Registry...');
      setTimeout(() => {
        navigate('/dashboard');
      }, 500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Authentication failed. Please check credentials.');
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (roleEmail: string, rolePass: string) => {
    setEmail(roleEmail);
    setPassword(rolePass);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Soft Ambient Background Glow */}
      <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] bg-gov-navy-600/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] bg-gov-teal-600/15 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Authentication Card */}
      <div className="max-w-md w-full z-10 space-y-6">
        {/* Emblem & Portal Identity */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-soft-lg">
            <GovtEmblem size="lg" variant="color" />
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-bold text-gov-saffron uppercase tracking-widest">
              Government of Maharashtra • Water Resources Department
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              House Valuation & Estimation System
            </h1>
            <p className="text-xs text-slate-400">
              Jigaon Major Irrigation Project Sub-Division No. 2, Nandura
            </p>
          </div>
        </div>

        {/* Login Form Container */}
        <Card className="p-6 sm:p-8 bg-white/95 backdrop-blur-xl border border-white/40 shadow-soft-xl rounded-gov-lg space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900">Officer Sign In</h2>
            <p className="text-xs text-slate-500">Enter your institutional credentials to access valuation cases</p>
          </div>

          {error && (
            <div className="p-3 rounded-gov-md bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium animate-fadeIn">
              {error}
            </div>
          )}

          {isLoading ? (
            /* Elegant Smooth Loading Animation */
            <div className="py-10 text-center space-y-4">
              <div className="relative w-12 h-12 mx-auto">
                <div className="w-12 h-12 rounded-full border-4 border-slate-100 border-t-gov-navy animate-spin" />
                <GovtEmblem size="sm" variant="color" className="absolute inset-0 m-auto scale-75 opacity-80" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-bold text-slate-900">{loadingMessage}</div>
                <div className="text-[11px] text-slate-500 font-medium">Please wait a moment</div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Official Email ID</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="officer@jigaon.gov.in"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-gov-md focus:border-gov-navy focus:ring-1 focus:ring-gov-navy transition-all outline-none text-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Access Key / Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-gov-md focus:border-gov-navy focus:ring-1 focus:ring-gov-navy transition-all outline-none text-slate-800"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full justify-center bg-gov-navy hover:bg-gov-navy-900 font-bold"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Sign In to Portal
              </Button>
            </form>
          )}

          {/* Clean 1-Click Fast Access Section */}
          <div className="pt-4 border-t border-slate-100 space-y-2.5">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">
              Demonstration & Fast Field Access
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('engineer@jigaon.gov.in', 'Engineer@12345')}
                className="px-3 py-2 text-xs rounded-gov-md bg-slate-50 border border-slate-200/80 text-slate-800 hover:bg-gov-teal-50 hover:border-gov-teal hover:text-gov-teal font-semibold transition-all text-center"
              >
                Assistant Engineer
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@jigaon.gov.in', 'Admin@12345')}
                className="px-3 py-2 text-xs rounded-gov-md bg-slate-50 border border-slate-200/80 text-slate-800 hover:bg-gov-navy-50 hover:border-gov-navy hover:text-gov-navy font-semibold transition-all text-center"
              >
                Executive Engineer
              </button>
            </div>
          </div>
        </Card>

        {/* Security and Compliance Footer */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-gov-teal" />
            <span>Land Acquisition & Rehabilitation Valuation Portal</span>
          </div>
          <div className="text-[10px] text-slate-500">
            Water Resources Department • Government of Maharashtra
          </div>
        </div>
      </div>
    </div>
  );
};
