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
      setDesignation('Executive Engineer (Division Officer)');
    } else if (selectedRole === 'ESTIMATOR') {
      setDesignation('Assistant Engineer (Grade-I / Estimator)');
    } else if (selectedRole === 'CHECKER') {
      setDesignation('Assistant Engineer (Grade-II / Scrutiny)');
    } else {
      setDesignation('Sectional Officer / Revenue Inspector');
    }
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
    if (!window.confirm(`Are you sure you want to delete officer account for ${userName}?`)) {
      return;
    }

    try {
      await api.delete(`/v1/auth/users/${id}`);
      fetchUsers();
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Super Admin Navigation Header */}
      <header className="bg-[#0c1a2f] text-white border-b border-slate-800 px-6 py-3.5 flex items-center justify-between shadow-soft-sm">
        <div className="flex items-center gap-3">
          <div className="p-1 rounded-full bg-white shadow-soft-xs shrink-0 flex items-center justify-center">
            <GovtEmblem size="sm" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-gov-saffron uppercase tracking-widest">
              Government of Maharashtra • Water Resources Department
            </div>
            <h1 className="text-sm font-extrabold text-white tracking-tight">
              Super Admin Officer & User Provisioning Portal
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard')}
            leftIcon={<LayoutDashboard className="w-3.5 h-3.5" />}
            className="text-white border-white/30 hover:bg-white/10"
          >
            Go to Main Dashboard
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              logout();
              navigate('/login');
            }}
            leftIcon={<LogOut className="w-3.5 h-3.5 text-rose-400" />}
            className="text-slate-300 hover:text-white"
          >
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8">
        {/* Welcome Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="text-xs font-bold text-gov-navy uppercase tracking-wider">
              System Administration
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
              Officer Accounts & Role Management
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Create and manage authorized accounts for Executive Engineers, Assistant Engineers, Checkers, and Section Officers.
            </p>
          </div>

          <Badge variant="navy">Logged in as Super Admin</Badge>
        </div>

        {/* Two-Column Grid: Form on Left, Existing Users on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Create User Form (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="p-6 bg-white border border-slate-200 shadow-soft-sm rounded-gov-lg space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="p-2 rounded bg-gov-teal-50 text-gov-teal">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Create New Officer Account</h3>
                  <p className="text-[11px] text-slate-500">Provision login credentials for department personnel</p>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {error}
                </div>
              )}

              {successMsg && (
                <div className="p-3 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
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
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded focus:border-gov-navy focus:ring-1 focus:ring-gov-navy outline-none"
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
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded focus:border-gov-navy focus:ring-1 focus:ring-gov-navy outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">System Role *</label>
                  <select
                    value={role}
                    onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                    className="w-full px-3 py-2 border border-slate-200 rounded bg-white font-semibold text-slate-800 focus:border-gov-navy focus:ring-1 focus:ring-gov-navy outline-none"
                  >
                    <option value="ESTIMATOR">Assistant Engineer (Grade-I / Estimator)</option>
                    <option value="ADMIN">Executive Engineer (Super Admin / Approver)</option>
                    <option value="CHECKER">Assistant Engineer (Grade-II / Scrutiny)</option>
                    <option value="VIEWER">Section Officer / Revenue Inspector</option>
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
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded focus:border-gov-navy focus:ring-1 focus:ring-gov-navy outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Department / Sub-Division *</label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Jigaon Sub-Division No. 2, Nandura"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded focus:border-gov-navy focus:ring-1 focus:ring-gov-navy outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Access Password *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded font-mono focus:border-gov-navy focus:ring-1 focus:ring-gov-navy outline-none"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isSubmitting}
                  className="w-full justify-center bg-gov-navy hover:bg-gov-navy-900 font-bold mt-2"
                  leftIcon={<UserPlus className="w-4 h-4" />}
                >
                  Create & Authorize Officer
                </Button>
              </form>
            </Card>
          </div>

          {/* Registered Officers Table (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="bg-white border border-slate-200 shadow-soft-sm rounded-gov-lg overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gov-navy" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Registered Department Officers ({users.length})
                  </h3>
                </div>
                <Button size="sm" variant="ghost" onClick={fetchUsers}>
                  Refresh
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200 font-bold">
                    <tr>
                      <th className="py-3 px-4">Officer Name & Role</th>
                      <th className="py-3 px-4">Email ID</th>
                      <th className="py-3 px-4">Designation</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoadingList ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400">
                          Loading registered accounts...
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400">
                          No users registered.
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{u.name}</div>
                            <Badge
                              variant={
                                u.role === 'ADMIN'
                                  ? 'navy'
                                  : u.role === 'ESTIMATOR'
                                  ? 'teal'
                                  : 'slate'
                              }
                              className="mt-0.5"
                            >
                              {u.role}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-700">
                            {u.email}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            <div>{u.designation}</div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[180px]">
                              {u.department}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {u.email.includes('vishal.bhutekar') ? (
                              <span className="text-[10px] text-slate-400 font-semibold italic">
                                Super Admin
                              </span>
                            ) : (
                              <button
                                onClick={() => handleDeleteUser(u.id, u.name)}
                                className="p-1.5 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                                title="Delete user account"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
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
