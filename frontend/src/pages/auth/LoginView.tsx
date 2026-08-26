import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import iconUrl from '../../assets/icon.png';
import { ShieldCheck, ChevronRight } from 'lucide-react';

export const LoginView: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingStage, setLoadingStage] = useState(0);

  const { login } = useAuth();
  const navigate = useNavigate();

  const loadingMessages = [
    'Verifying departmental credentials...',
    'Establishing encrypted session...',
    'Loading Jigaon Project database...',
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter your official email ID and password.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setLoadingStage(0);

    const stageTimer = setInterval(() => {
      setLoadingStage((prev) => (prev < 2 ? prev + 1 : prev));
    }, 500);

    try {
      await login(email.trim(), password);
      clearInterval(stageTimer);
      setTimeout(() => navigate('/dashboard'), 350);
    } catch (err: any) {
      clearInterval(stageTimer);
      setError(err.response?.data?.message || 'Invalid institutional credentials. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex font-sans"
      style={{ background: 'linear-gradient(135deg, #f0f4f8 0%, #e8edf5 100%)' }}
    >
      {/* Left Decorative Panel */}
      <div
        className="hidden lg:flex lg:w-5/12 flex-col justify-between p-10 relative overflow-hidden shrink-0"
        style={{
          background: 'linear-gradient(160deg, #0c1a2f 0%, #0f2a4a 60%, #0d3a5c 100%)',
        }}
      >
        {/* Decorative background circles */}
        <div
          className="absolute top-[-80px] right-[-80px] w-[320px] h-[320px] rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #e09f3e 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-[-60px] left-[-60px] w-[260px] h-[260px] rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #0f766e 0%, transparent 70%)' }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-5 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #ffffff 0%, transparent 70%)' }}
        />

        {/* Top Brand */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div
              className="p-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 shadow-soft-md"
            >
              <img src={iconUrl} alt="Maharashtra Govt" className="w-10 h-10 object-contain" />
            </div>
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
                Government of Maharashtra
              </div>
              <div className="text-white text-sm font-extrabold leading-tight">
                Water Resources Department
              </div>
            </div>
          </div>

          <h2 className="text-3xl font-black text-white leading-tight mb-3">
            Jigaon Major Irrigation
            <br />
            <span className="text-amber-400">Valuation Engine</span>
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            Deterministic digital valuation & estimation management system for rural submergence
            dwellings and rehabilitation compensation.
          </p>
        </div>

        {/* Feature pills */}
        <div className="relative z-10 space-y-3">
          {[
            { icon: '🏛️', text: 'PWD CSR 2014-15 Standard Abstract Estimation' },
            { icon: '📐', text: '7% Compound Interest Compound Y.P. Depreciation' },
            { icon: '📄', text: 'Official 4-Page Executive Sanction Certificate' },
            { icon: '🔒', text: 'Role-Based Authentication & Clearance Control' },
          ].map(({ icon, text }) => (
            <div
              key={text}
              className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 backdrop-blur-sm"
            >
              <span className="text-base">{icon}</span>
              <span className="text-slate-300 text-xs font-semibold">{text}</span>
            </div>
          ))}
        </div>

        {/* Bottom Tagline */}
        <div className="relative z-10">
          <p className="text-slate-400 text-[11px]">
            Jigaon Major Project Sub-Division No. 2, Nandura • Buldhana Division
          </p>
        </div>
      </div>

      {/* Right Login Form Panel */}
      <div className="flex-1 flex flex-col justify-center items-center p-4 sm:p-8 md:p-12 overflow-y-auto">
        <div className="w-full max-w-md space-y-6 my-auto">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center space-y-2">
            <img
              src={iconUrl}
              alt="Maharashtra Govt"
              className="w-14 h-14 object-contain mx-auto"
            />
            <div className="text-[10px] font-extrabold text-amber-600 uppercase tracking-widest">
              Government of Maharashtra • Water Resources Department
            </div>
          </div>

          {/* Heading */}
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Officer Portal Sign In
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Enter your official credentials to access the valuation engine
            </p>
          </div>

          {/* Login Card */}
          <div
            className="bg-white rounded-2xl p-6 sm:p-7 space-y-5 border border-slate-200/80"
            style={{ boxShadow: '0 8px 32px rgba(12,26,47,0.08), 0 2px 8px rgba(12,26,47,0.04)' }}
          >
            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {isLoading ? (
              /* Premium Loading State */
              <div className="py-8 flex flex-col items-center space-y-4">
                <div className="relative w-14 h-14">
                  {/* Spinning rings */}
                  <svg className="w-14 h-14 animate-spin absolute inset-0" viewBox="0 0 64 64" fill="none">
                    <circle cx="32" cy="32" r="28" stroke="#e2e8f0" strokeWidth="4" />
                    <path d="M32 4a28 28 0 0 1 28 28" stroke="#0c1a2f" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                  {/* Center Emblem */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <img src={iconUrl} alt="" className="w-7 h-7 object-contain" />
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold text-slate-900">{loadingMessages[loadingStage]}</div>
                  <div className="text-xs text-slate-400 mt-0.5">Please wait a moment</div>
                </div>
                {/* Progress Dots */}
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full transition-all duration-300"
                      style={{ background: i <= loadingStage ? '#0c1a2f' : '#e2e8f0' }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                {/* Email Field */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Official Email ID
                  </label>
                  <div className="relative group">
                    <svg
                      className="w-4 h-4 text-slate-400 group-focus-within:text-gov-navy absolute left-3.5 top-3 transition-colors"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="officer@jigaon.gov.in"
                      className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm border-2 border-slate-200 rounded-xl focus:border-gov-navy focus:ring-0 outline-none text-slate-900 transition-all placeholder:text-slate-400"
                      style={{ background: '#fafafa' }}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Access Password
                  </label>
                  <div className="relative group">
                    <svg
                      className="w-4 h-4 text-slate-400 group-focus-within:text-gov-navy absolute left-3.5 top-3 transition-colors"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm border-2 border-slate-200 rounded-xl focus:border-gov-navy focus:ring-0 outline-none text-slate-900 transition-all font-mono"
                      style={{ background: '#fafafa' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 transition-colors"
                    >
                      {showPassword ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl text-xs sm:text-sm font-bold text-white tracking-wide transition-all duration-200 flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.99] shadow-soft-md"
                  style={{
                    background: 'linear-gradient(135deg, #0c1a2f 0%, #16375c 100%)',
                  }}
                >
                  <span>Sign In to Valuation Portal</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>

          {/* Super Admin Link */}
          <div className="text-center">
            <Link
              to="/super-admin/login"
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-gov-navy transition-colors group p-2 rounded-xl hover:bg-slate-200/60"
            >
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span className="group-hover:underline underline-offset-2">
                Super Admin Master Authorization Portal →
              </span>
            </Link>
          </div>

          {/* Footer */}
          <div className="text-center text-[11px] text-slate-400">
            Water Resources Department • Government of Maharashtra
          </div>
        </div>
      </div>
    </div>
  );
};
