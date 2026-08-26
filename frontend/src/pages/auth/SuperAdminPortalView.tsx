import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
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
  Trash2,
  Users,
  LayoutDashboard,
  LogOut,
  Search,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface OfficerUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  designation: string;
  createdAt: string;
}

export const SuperAdminPortalView: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [users, setUsers] = useState<OfficerUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [isLoadingList, setIsLoadingList] = useState(true);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('ESTIMATOR');
  const [designation, setDesignation] = useState('Assistant Engineer (Grade-I / Estimator)');
  const [department, setDepartment] = useState('Jigaon Major Irrigation Sub-Division No. 2, Nandura');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setIsLoadingList(true);
      const res = await api.get<{ users: OfficerUser[] }>('/v1/auth/users');
      setUsers(res.data.users);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = (selectedRole: UserRole) => {
    setRole(selectedRole);
    if (selectedRole === 'ADMIN') {
      setDesignation('Executive Engineer (Sanctioning Authority)');
    } else if (selectedRole === 'ESTIMATOR') {
      setDesignation('Assistant Engineer (Grade-I / Estimator)');
    } else if (selectedRole === 'CHECKER') {
      setDesignation('Assistant Engineer (Grade-II / Scrutiny)');
    } else {
      setDesignation('Sectional Officer / Revenue Inspector');
    }
  };

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let generated = 'Gov@';
    for (let i = 0; i < 6; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(generated);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await api.post('/v1/auth/register', {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        designation,
        department,
      });

      setSuccessMsg(`Officer account for ${name} created successfully.`);
      setName('');
      setEmail('');
      setPassword('');
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create officer account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string, userName: string) => {
    if (!window.confirm(`Confirm removing credentials for ${userName}?`)) {
      return;
    }

    try {
      await api.delete(`/v1/auth/users/${id}`);
      fetchUsers();
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.department.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Header with High-Visibility Dashboard Navigation Button */}
      <header className="bg-[#0B2545] text-white border-b border-slate-800 px-4 sm:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-soft-sm sticky top-0 z-30">
        <div className="flex items-center gap-3.5">
          <div className="p-1 rounded-full bg-white shadow-soft-xs shrink-0 flex items-center justify-center">
            <GovtEmblem size="sm" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-amber-300 uppercase tracking-widest">
              Government of Maharashtra • Water Resources Department
            </div>
            <h1 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
              Super Administrator & User Management Portal
            </h1>
          </div>
        </div>

        {/* Prominent Action Buttons */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-black text-xs hover:bg-amber-300 transition-all shadow-soft-xs hover:shadow-soft-sm active:scale-95"
          >
            <LayoutDashboard className="w-4 h-4 text-slate-950" />
            <span>← Return to Main Dashboard</span>
          </button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              logout();
              navigate('/login');
            }}
            leftIcon={<LogOut className="w-3.5 h-3.5 text-slate-300" />}
            className="text-slate-200 border-white/20 hover:bg-white/10 text-xs h-9 px-3"
          >
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-6 min-w-0">
        {/* Main Grid: Form on Left (5 Cols), Directory on Right (7 Cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Section 1: Create Officer Account (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="p-5 sm:p-6 bg-white border border-slate-200 shadow-soft-xs rounded-2xl space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5">
                <div className="p-2 rounded-xl bg-slate-900 text-white shadow-soft-xs">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Create & Provision Officer Account</h2>
                  <p className="text-[11px] text-slate-500">Issue official departmental access credentials</p>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
                {/* Role Selection */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Officer Role *</label>
                  <select
                    value={role}
                    onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-800 focus:bg-white focus:border-slate-900 outline-none"
                  >
                    <option value="ESTIMATOR">Assistant Engineer (Valuation Estimator)</option>
                    <option value="ADMIN">Executive Engineer (Sanction Authority)</option>
                    <option value="CHECKER">Technical Checker / Scrutiny Officer</option>
                    <option value="VIEWER">Revenue Inspector / Viewer</option>
                  </select>
                </div>

                {/* Officer Name */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Full Name *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Er. Nitin G. Patil"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:border-slate-900 outline-none bg-slate-50 focus:bg-white text-xs"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Official Department Email *</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. nitin.patil@jigaon.gov.in"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:border-slate-900 outline-none bg-slate-50 focus:bg-white text-xs"
                    />
                  </div>
                </div>

                {/* Designation */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Official Designation *</label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:border-slate-900 outline-none bg-slate-50 focus:bg-white text-xs"
                    />
                  </div>
                </div>

                {/* Department */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Sub-Division / Office *</label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:border-slate-900 outline-none bg-slate-50 focus:bg-white text-xs"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700">Account Password *</label>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="text-[11px] font-bold text-teal-700 hover:underline flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      Auto-Generate
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Gov@Pass2026"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl font-mono focus:border-slate-900 outline-none bg-slate-50 focus:bg-white text-xs"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isSubmitting}
                  className="w-full justify-center bg-slate-900 hover:bg-slate-800 font-bold py-2.5 rounded-xl text-xs mt-2"
                  leftIcon={<UserPlus className="w-4 h-4" />}
                >
                  + Create Officer Account
                </Button>
              </form>
            </Card>
          </div>

          {/* Section 2: Registered Officers Directory (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="bg-white border border-slate-200 shadow-soft-xs rounded-2xl overflow-hidden p-0">
              {/* Header & Search */}
              <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-slate-100 text-slate-800">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        Authorized Officers Directory ({users.length})
                      </h2>
                      <p className="text-[11px] text-slate-500">Active user accounts with system access</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={fetchUsers}
                    leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                    className="text-xs h-8 px-2.5"
                  >
                    Refresh
                  </Button>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search officer name, email, designation..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-slate-900 outline-none"
                    />
                  </div>

                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 focus:border-slate-900 outline-none"
                  >
                    <option value="ALL">All Roles ({users.length})</option>
                    <option value="ADMIN">Executive Engineers</option>
                    <option value="ESTIMATOR">Assistant Engineers</option>
                    <option value="CHECKER">Checkers</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto w-full scrollbar-thin">
                <table className="w-full text-left text-xs border-collapse min-w-[520px]">
                  <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider text-[10px] border-b border-slate-200 font-bold">
                    <tr>
                      <th className="py-3 px-4">Officer Name & Email</th>
                      <th className="py-3 px-3">Role</th>
                      <th className="py-3 px-3">Designation / Division</th>
                      <th className="py-3 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoadingList ? (
                      <tr>
                        <td colSpan={4} className="py-10 text-center text-slate-400">
                          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-300" />
                          Loading officers directory...
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400">
                          No matching officers found.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const isSuper = u.email.toLowerCase().includes('vishal.bhutekar');
                        return (
                          <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">{u.name}</div>
                              <div className="text-[11px] font-mono text-slate-500">{u.email}</div>
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span className="text-[11px] font-bold text-slate-700">
                                {u.role === 'ADMIN' ? 'Executive Eng.' : u.role === 'ESTIMATOR' ? 'Assistant Eng.' : u.role}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-600">
                              <div className="font-medium text-slate-800">{u.designation}</div>
                              <div className="text-[10px] text-slate-400 truncate max-w-[180px]">
                                {u.department}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right whitespace-nowrap">
                              {isSuper ? (
                                <span className="text-[10px] text-slate-400 font-bold italic">
                                  Primary Admin
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleDeleteUser(u.id, u.name)}
                                  className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors inline-flex items-center gap-1"
                                  title="Revoke access"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

