import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import iconUrl from '../../assets/icon.png';

export const SuperAdminLoginView: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await login(email.trim(), password);
      setTimeout(() => navigate('/super-admin/users'), 400);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid Super Admin credentials.');
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 font-sans"
      style={{ background: 'linear-gradient(150deg, #070e1a 0%, #0c1a2f 50%, #0d2540 100%)' }}
    >
      {/* Ambient glow effects */}
      <div
        className="fixed top-0 left-0 w-full h-full pointer-events-none"
        style={{ zIndex: 0 }}
      >
        <div
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #e09f3e, transparent 70%)', filter: 'blur(60px)' }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #0f766e, transparent 70%)', filter: 'blur(60px)' }}
        />
      </div>

      <div className="relative z-10 w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div
            className="inline-flex p-3 rounded-2xl"
            style={{
              background: 'rgba(255,255,255,0.08)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.15)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            <img src={iconUrl} alt="Maharashtra Govt" className="w-12 h-12 object-contain" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1">
              Restricted Access
            </div>
            <h1 className="text-xl font-black text-white tracking-tight">
              Super Admin Authorization
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Officer provisioning & credential management
            </p>
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-6 space-y-4"
          style={{
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}
        >
          {/* Lock Badge */}
          <div className="flex items-center gap-2 pb-3 border-b border-white/10">
            <div
              className="p-1.5 rounded-lg"
              style={{ background: 'rgba(224,159,62,0.15)', border: '1px solid rgba(224,159,62,0.3)' }}
            >
              <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <span className="text-xs font-bold text-white/80">Master Access Credentials Required</span>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-xl text-xs font-medium" style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.3)', color: '#fca5a5' }}>
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="py-8 flex flex-col items-center gap-4">
              <div className="relative w-12 h-12">
                <svg className="w-12 h-12 animate-spin" viewBox="0 0 48 48" fill="none">
                  <circle cx="24" cy="24" r="20" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                  <path d="M24 4a20 20 0 0 1 20 20" stroke="#e09f3e" strokeWidth="3" strokeLinecap="round" />
                </svg>
                <img src={iconUrl} alt="" className="w-5 h-5 absolute inset-0 m-auto object-contain" />
              </div>
              <div className="text-xs font-semibold text-slate-300">Authenticating super admin...</div>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-3.5">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-white/70">Super Admin Email</label>
                <div className="relative">
                  <svg className="w-4 h-4 text-white/30 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vishal.bhutekar1@gmail.com"
                    className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl outline-none text-white placeholder:text-white/25 font-medium"
                    style={{
                      background: 'rgba(255,255,255,0.07)',
                      border: '1px solid rgba(255,255,255,0.15)',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = 'rgba(224,159,62,0.6)')}
                    onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.15)')}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-white/70">Master Password</label>
                <div className="relative">
                  <svg className="w-4 h-4 text-white/30 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-9 py-2.5 text-xs rounded-xl outline-none text-white font-mono placeholder:text-white/25"
                    style={{
                      background: 'rgba(255,255,255,0.07)',
                      border: '1px solid rgba(255,255,255,0.15)',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = 'rgba(224,159,62,0.6)')}
                    onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.15)')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-white/30 hover:text-white/70 transition-colors"
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
                className="w-full py-3 rounded-xl text-sm font-black text-white flex items-center justify-center gap-2 transition-all duration-200 hover:opacity-90 active:scale-[0.99] mt-1"
                style={{
                  background: 'linear-gradient(135deg, #e09f3e 0%, #c47f28 100%)',
                  boxShadow: '0 4px 20px rgba(224,159,62,0.4)',
                }}
              >
                Access Officer Portal
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </form>
          )}
        </div>

        {/* Back link */}
        <div className="text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors font-semibold"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Standard Officer Login
          </Link>
        </div>
      </div>
    </div>
  );
};
