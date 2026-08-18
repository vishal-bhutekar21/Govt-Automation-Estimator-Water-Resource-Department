import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { GovtEmblem } from '../../components/common/GovtEmblem';
import { UserRole } from '../../types';
import {
  UserPlus,
  Mail,
  Lock,
  User,
  Building,
  Briefcase,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';

export const RegisterView: React.FC = () => {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('ESTIMATOR');
  const [designation, setDesignation] = useState('Assistant Engineer (Grade-I)');
  const [department, setDepartment] = useState('Jigaon Major Irrigation Sub-Division No. 2, Nandura');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleRoleChange = (selectedRole: UserRole) => {
    setRole(selectedRole);
    if (selectedRole === 'ADMIN') {
      setDesignation('Executive Engineer (Division Officer)');
    } else if (selectedRole === 'ESTIMATOR') {
      setDesignation('Assistant Engineer (Grade-I / Estimator)');
    } else if (selectedRole === 'CHECKER') {
      setDesignation('Assistant Engineer (Grade-II / Scrutiny)');
    } else {
      setDesignation('Sectional Officer / Revenue Inspector');
    }
  };

  const handleQuickPreset = (presetRole: UserRole, sampleName: string, sampleEmail: string) => {
    setName(sampleName);
    setEmail(sampleEmail);
    setPassword('Govt@12345');
    handleRoleChange(presetRole);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await api.post('/v1/auth/register', {
        name,
        email,
        password,
        role,
        designation,
        department,
      });

      setSuccessMsg(`Officer account for ${name} (${designation}) created successfully!`);
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create officer account.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
      {/* Decorative Soft Background Accent */}
      <div className="max-w-xl w-full space-y-6">
        {/* Header & Official Seal */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-3 rounded-full bg-white border border-slate-200 shadow-soft-sm">
            <GovtEmblem size="lg" />
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-bold text-gov-saffron uppercase tracking-widest">
              Government of Maharashtra • Water Resources Department
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Super Admin: Officer Account Creation
            </h1>
            <p className="text-xs text-slate-500">
              Provision authorized logins for Executive Engineers, Assistant Engineers & Section Officers
            </p>
          </div>
        </div>

        {/* Form Card */}
        <Card className="p-6 sm:p-8 bg-white border border-slate-200 shadow-soft-md rounded-gov-lg space-y-5">
          {error && (
            <div className="p-3 rounded-gov-md bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-gov-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Preset Buttons for Quick Provisioning */}
          <div className="space-y-1.5 border-b border-slate-100 pb-3">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
              Quick Officer Role Presets
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() =>
                  handleQuickPreset('ADMIN', 'Er. Sanjay V. Kulkarni', 'ee.sanjay@jigaon.gov.in')
                }
                className={`px-2 py-1.5 text-xs rounded border transition-all text-center font-medium ${
                  role === 'ADMIN'
                    ? 'bg-gov-navy text-white border-gov-navy font-bold'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                Executive Engineer
              </button>
              <button
                type="button"
                onClick={() =>
                  handleQuickPreset('ESTIMATOR', 'Er. Nitin G. Patil', 'ae.nitin@jigaon.gov.in')
                }
                className={`px-2 py-1.5 text-xs rounded border transition-all text-center font-medium ${
                  role === 'ESTIMATOR'
                    ? 'bg-gov-navy text-white border-gov-navy font-bold'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                Assistant Engineer (Gr-I)
              </button>
              <button
                type="button"
                onClick={() =>
                  handleQuickPreset('CHECKER', 'Er. Priya D. Deshmukh', 'ae.priya@jigaon.gov.in')
                }
                className={`px-2 py-1.5 text-xs rounded border transition-all text-center font-medium ${
                  role === 'CHECKER'
                    ? 'bg-gov-navy text-white border-gov-navy font-bold'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                Assistant Engineer (Gr-II)
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Officer Full Name *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Er. Nitin G. Patil"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-gov-md focus:border-gov-navy focus:ring-1 focus:ring-gov-navy outline-none text-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Official Email ID *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. ae.nitin@jigaon.gov.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-gov-md focus:border-gov-navy focus:ring-1 focus:ring-gov-navy outline-none text-slate-800"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">System Role *</label>
                <select
                  value={role}
                  onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-gov-md bg-white focus:border-gov-navy focus:ring-1 focus:ring-gov-navy outline-none font-medium text-slate-800"
                >
                  <option value="ADMIN">ADMIN (Executive Engineer / Super Admin)</option>
                  <option value="ESTIMATOR">ESTIMATOR (Assistant Engineer Grade-I)</option>
                  <option value="CHECKER">CHECKER (Assistant Engineer Grade-II)</option>
                  <option value="VIEWER">VIEWER (Section Officer / Revenue Inspector)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Official Designation *</label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Assistant Engineer (Grade-I)"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-gov-md focus:border-gov-navy focus:ring-1 focus:ring-gov-navy outline-none text-slate-800"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Department / Sub-Division Office *</label>
              <div className="relative">
                <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Jigaon Major Irrigation Sub-Division No. 2, Nandura"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-gov-md focus:border-gov-navy focus:ring-1 focus:ring-gov-navy outline-none text-slate-800"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Initial Access Password *</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-gov-md focus:border-gov-navy focus:ring-1 focus:ring-gov-navy outline-none text-slate-800 font-mono"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isLoading}
              className="w-full justify-center bg-gov-navy hover:bg-gov-navy-900 font-bold"
              leftIcon={<UserPlus className="w-4 h-4" />}
            >
              Create Officer Account
            </Button>
          </form>

          {/* Footer Navigation */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <Link
              to="/login"
              className="text-slate-600 hover:text-gov-navy font-semibold flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Officer Sign In
            </Link>

            <span className="text-[11px] text-slate-400">
              Authorized Government Personnel Only
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
};
