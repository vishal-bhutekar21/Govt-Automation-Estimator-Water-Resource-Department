import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { GovtEmblem } from '../../components/common/GovtEmblem';
import { UserRole } from '../../types';
import {
  UserPlus,
  Mail,
  Lock,
  User,
  Building,
  Briefcase,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  Users,
  ArrowRight,
  LogOut,
  LayoutDashboard,
  Key,
  Search,
  RefreshCw,
  Sparkles,
  ShieldAlert,
  Sliders,
  Award,
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
      setDesignation('Executive Engineer (Division Officer / Sanctioning Authority)');
    } else if (selectedRole === 'ESTIMATOR') {
      setDesignation('Assistant Engineer (Grade-I / Valuation Estimator)');
    } else if (selectedRole === 'CHECKER') {
      setDesignation('Assistant Engineer (Grade-II / Technical Scrutiny)');
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

      setSuccessMsg(`Officer account for ${name} provisioned successfully.`);
      setName('');
      setEmail('');
      setPassword('');
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to provision officer account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string, userName: string) => {
    if (!window.confirm(`Confirm removing access credentials for ${userName}?`)) {
      return;
    }

    try {
      await api.delete(`/v1/auth/users/${id}`);
      fetchUsers();
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  // Stats calculation
  const totalOfficers = users.length;
  const adminCount = users.filter((u) => u.role === 'ADMIN').length;
  const estimatorCount = users.filter((u) => u.role === 'ESTIMATOR').length;
  const otherCount = users.filter((u) => u.role !== 'ADMIN' && u.role !== 'ESTIMATOR').length;

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
      {/* Super Admin Navigation Header */}
      <header className="bg-[#0c1a2f] text-white border-b border-slate-800 px-4 sm:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-soft-md">
        <div className="flex items-center gap-3.5">
          <div className="p-1.5 rounded-full bg-white shadow-soft-xs shrink-0 flex items-center justify-center">
            <GovtEmblem size="sm" />
          </div>
          <div>
            <div className="text-[10px] font-extrabold text-gov-saffron uppercase tracking-widest">
              Government of Maharashtra • Water Resources Department
            </div>
            <h1 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
              <span>Super Administrator & Chief System Architect Portal</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                MASTER ACCESS
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard')}
            leftIcon={<LayoutDashboard className="w-3.5 h-3.5" />}
            className="text-white border-white/30 hover:bg-white/10 text-xs"
          >
            Main Dashboard
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              logout();
              navigate('/login');
            }}
            leftIcon={<LogOut className="w-3.5 h-3.5 text-rose-400" />}
            className="text-slate-300 hover:text-white text-xs"
          >
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 min-w-0">
        {/* Welcome & System Status Bar */}
        <div className="bg-gradient-to-r from-gov-navy via-[#16375c] to-gov-teal rounded-2xl p-6 text-white shadow-soft-md flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-xs font-bold text-amber-300">
              <ShieldCheck className="w-4 h-4" />
              <span>State Land Acquisition & Valuation Engine • Administration</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Officer Provisioning & Clearance Management
            </h2>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              Authorized to create, configure, and audit officer access credentials for Executive Engineers,
              Assistant Engineers, and Valuation Scrutiny officers across Maharashtra WRD divisions.
            </p>
          </div>

          <div className="flex sm:flex-col gap-2 shrink-0 self-start sm:self-auto bg-black/20 p-4 rounded-xl border border-white/10">
            <div className="text-[11px] text-slate-300 font-medium">Logged in Officer:</div>
            <div className="text-sm font-extrabold text-amber-400">Er. Vishal Bhutekar</div>
            <div className="text-[10px] text-slate-400">Chief System Architect / Super Admin</div>
          </div>
        </div>

        {/* Executive KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <Card className="p-5 bg-white border border-slate-200 shadow-soft-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Officers</span>
              <div className="p-2 rounded-lg bg-blue-50 text-blue-800">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900">{totalOfficers}</div>
            <div className="text-[11px] text-slate-500 font-medium">Authorized government accounts</div>
          </Card>

          <Card className="p-5 bg-white border border-slate-200 shadow-soft-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Executive Engineers</span>
              <div className="p-2 rounded-lg bg-amber-50 text-amber-800">
                <Award className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-amber-700">{adminCount}</div>
            <div className="text-[11px] text-slate-500 font-medium">Sanctioning & Approval Authorities</div>
          </Card>

          <Card className="p-5 bg-white border border-slate-200 shadow-soft-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assistant Engineers</span>
              <div className="p-2 rounded-lg bg-teal-50 text-teal-800">
                <Briefcase className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-teal-700">{estimatorCount}</div>
            <div className="text-[11px] text-slate-500 font-medium">Valuation & Measurement Estimators</div>
          </Card>

          <Card className="p-5 bg-white border border-slate-200 shadow-soft-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Division</span>
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-800">
                <Building className="w-5 h-5" />
              </div>
            </div>
            <div className="text-lg font-extrabold text-slate-900 leading-tight">Jigaon Sub-Div. No. 2</div>
            <div className="text-[11px] text-slate-500 font-medium">Nandura, Dist. Buldhana</div>
          </Card>
        </div>

        {/* Main Grid: Form on Left (5 Cols), Directory on Right (7 Cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Create User Form (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="p-6 bg-white border border-slate-200 shadow-soft-sm rounded-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-gov-navy text-white shadow-soft-xs">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Provision New Officer Account</h3>
                    <p className="text-[11px] text-slate-500">Issue official departmental credentials</p>
                  </div>
                </div>
                <Badge variant="navy">SECURE</Badge>
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
                {/* Role Selector Tabs */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Select Institutional Role *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleRoleChange('ESTIMATOR')}
                      className={`p-2.5 rounded-xl text-left border transition-all ${
                        role === 'ESTIMATOR'
                          ? 'bg-teal-50 border-teal-600 text-teal-900 shadow-soft-xs font-bold ring-1 ring-teal-600'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        <span>Assistant Engineer</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Estimator & Calculations</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRoleChange('ADMIN')}
                      className={`p-2.5 rounded-xl text-left border transition-all ${
                        role === 'ADMIN'
                          ? 'bg-amber-50 border-amber-600 text-amber-900 shadow-soft-xs font-bold ring-1 ring-amber-600'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        <span>Executive Engineer</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Full Approval Authority</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRoleChange('CHECKER')}
                      className={`p-2.5 rounded-xl text-left border transition-all ${
                        role === 'CHECKER'
                          ? 'bg-indigo-50 border-indigo-600 text-indigo-900 shadow-soft-xs font-bold ring-1 ring-indigo-600'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        <span>Scrutiny Officer</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Panchanama Checker</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRoleChange('VIEWER')}
                      className={`p-2.5 rounded-xl text-left border transition-all ${
                        role === 'VIEWER'
                          ? 'bg-slate-200 border-slate-500 text-slate-900 shadow-soft-xs font-bold ring-1 ring-slate-500'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        <span>Revenue Inspector</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Read-Only Viewer</div>
                    </button>
                  </div>
                </div>

                {/* Officer Name */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Officer Full Name *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Er. Nitin G. Patil"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:border-gov-navy focus:ring-1 focus:ring-gov-navy outline-none bg-slate-50/50"
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
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:border-gov-navy focus:ring-1 focus:ring-gov-navy outline-none bg-slate-50/50"
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
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:border-gov-navy focus:ring-1 focus:ring-gov-navy outline-none bg-slate-50/50"
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
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:border-gov-navy focus:ring-1 focus:ring-gov-navy outline-none bg-slate-50/50"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700">Initial Password *</label>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="text-[11px] font-bold text-gov-teal hover:underline flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      Generate Strong
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
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl font-mono focus:border-gov-navy focus:ring-1 focus:ring-gov-navy outline-none bg-slate-50/50"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isSubmitting}
                  className="w-full justify-center bg-gov-navy hover:bg-gov-navy-900 font-bold py-2.5 rounded-xl shadow-soft-sm text-xs mt-2"
                  leftIcon={<UserPlus className="w-4 h-4" />}
                >
                  Provision & Authorize Officer
                </Button>
              </form>
            </Card>
          </div>

          {/* Registered Officers Table (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="bg-white border border-slate-200 shadow-soft-sm rounded-2xl overflow-hidden p-0">
              {/* Header & Controls */}
              <div className="p-5 border-b border-slate-100 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-blue-50 text-blue-800">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Authorized Officer Registry ({users.length})
                      </h3>
                      <p className="text-[11px] text-slate-500">Active credentials across government sub-divisions</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={fetchUsers}
                    leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                    className="text-xs self-start sm:self-auto"
                  >
                    Refresh
                  </Button>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search by officer name, email, designation..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:border-gov-navy focus:ring-1 focus:ring-gov-navy outline-none"
                    />
                  </div>

                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 focus:border-gov-navy outline-none"
                  >
                    <option value="ALL">All Roles ({users.length})</option>
                    <option value="ADMIN">Executive Engineers ({adminCount})</option>
                    <option value="ESTIMATOR">Assistant Engineers ({estimatorCount})</option>
                    <option value="CHECKER">Checkers & Scrutiny</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto w-full scrollbar-thin">
                <table className="w-full text-left text-xs border-collapse min-w-[550px]">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200 font-bold">
                    <tr>
                      <th className="py-3 px-5">Officer Details</th>
                      <th className="py-3 px-4">Role / Clearance</th>
                      <th className="py-3 px-4">Designation & Department</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoadingList ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-slate-400">
                          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-300" />
                          Loading authorized officers directory...
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-10 text-center text-slate-400">
                          No matching officers found for query "{searchTerm}".
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const isSuper = u.email.toLowerCase().includes('vishal.bhutekar');
                        return (
                          <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-5">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-soft-xs">
                                  {u.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                    <span>{u.name}</span>
                                    {isSuper && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                                        SUPER
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] font-mono text-slate-500">{u.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <Badge
                                variant={
                                  u.role === 'ADMIN'
                                    ? 'navy'
                                    : u.role === 'ESTIMATOR'
                                    ? 'teal'
                                    : 'slate'
                                }
                              >
                                {u.role === 'ADMIN' ? 'EXECUTIVE ENG' : u.role}
                              </Badge>
                            </td>
                            <td className="py-3.5 px-4 text-slate-600">
                              <div className="font-semibold text-slate-800">{u.designation}</div>
                              <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                                {u.department}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              {isSuper ? (
                                <span className="text-[10px] text-amber-700 font-bold italic px-2 py-1 bg-amber-50 rounded border border-amber-200">
                                  Protected
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

            {/* Governance Information Card */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-600 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Security Enforcement:</strong> HMAC SHA-256 JWT sessions active • 24h expiration
                </span>
              </div>
              <span className="font-mono text-[10px] text-slate-400">CSR v2014-15</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
