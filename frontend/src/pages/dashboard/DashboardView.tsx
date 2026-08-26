import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  FolderKanban,
  FileSpreadsheet,
  CheckCircle2,
  TrendingUp,
  Plus,
  ArrowRight,
  Eye,
  Building2,
  Calendar,
} from 'lucide-react';

interface DashboardData {
  stats: {
    totalProjects: number;
    totalCases: number;
    draftCases: number;
    completedCases: number;
    totalEstimatedValue: number;
    formattedTotalEstimatedValue: string;
  };
  recentCases: Array<{
    id: string;
    caseNumber: string;
    projectName: string;
    ownerName: string;
    houseNumber: string;
    village: string;
    status: string;
    valuationAmount: number;
    formattedValuation: string;
    valuationDate: string;
    createdAt: string;
  }>;
}

export const DashboardView: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchDashboard = async () => {
    try {
      setIsLoading(true);
      const res = await api.get<DashboardData>('/v1/dashboard/stats');
      setData(res.data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'COMPLETED':
        return <Badge variant="success">Approved</Badge>;
      case 'REVIEW':
        return <Badge variant="saffron">In Review</Badge>;
      case 'DRAFT':
        return <Badge variant="slate">Draft</Badge>;
      default:
        return <Badge variant="teal">In Progress</Badge>;
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 w-full min-w-0">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5 sm:pb-6">
        <div>
          <div className="text-xs font-bold text-gov-navy uppercase tracking-wider">
            Water Resources Department • Jigaon Project Division
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Executive Valuation Dashboard
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <Button
            variant="secondary"
            size="md"
            leftIcon={<FolderKanban className="w-4 h-4" />}
            onClick={() => navigate('/projects')}
            className="text-xs sm:text-sm"
          >
            Manage Projects
          </Button>
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => navigate('/cases')}
            className="text-xs sm:text-sm shadow-soft-sm"
          >
            New Valuation Case
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Projects */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-soft-xs hover:shadow-soft-sm transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Projects</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 mb-1">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
              {isLoading ? '...' : data?.stats.totalProjects ?? 0}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-2 border-t border-slate-100">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="truncate">Jigaon Submergence Scheme</span>
          </div>
        </div>

        {/* Total Cases */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-soft-xs hover:shadow-soft-sm transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total House Cases</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 mb-1">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
              {isLoading ? '...' : data?.stats.totalCases ?? 0}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-2 pt-2 border-t border-slate-100 truncate">
            <span>Draft: <strong>{data?.stats.draftCases ?? 0}</strong></span>
            <span>•</span>
            <span>Completed: <strong>{data?.stats.completedCases ?? 0}</strong></span>
          </div>
        </div>

        {/* Completed Valuations */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-soft-xs hover:shadow-soft-sm transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sanctioned Awards</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 mb-1">
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700 font-mono tracking-tight">
              {isLoading ? '...' : data?.stats.completedCases ?? 0}
            </div>
          </div>
          <div className="text-[11px] text-emerald-800 font-medium flex items-center gap-1.5 pt-2 border-t border-slate-100 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>Ready for A4 Sanction PDF</span>
          </div>
        </div>

        {/* Total Estimated Value */}
        <div className="bg-gradient-to-br from-slate-900 to-[#102a45] text-white p-4 sm:p-5 rounded-xl border border-slate-800 shadow-soft-xs hover:shadow-soft-sm transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Total Award Value</span>
            <div className="w-8 h-8 rounded-lg bg-white/10 text-amber-300 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 mb-1">
            <div className="text-xl sm:text-2xl lg:text-3xl font-black font-mono tracking-tight text-white truncate">
              {isLoading ? '...' : data?.stats.formattedTotalEstimatedValue ?? '₹ 0.00'}
            </div>
          </div>
          <div className="text-[11px] text-slate-300 flex items-center gap-1.5 pt-2 border-t border-white/10 truncate">
            <span>PWD CSR 2014-15 Standard</span>
          </div>
        </div>
      </div>

      {/* Recent Cases Section */}
      <Card className="space-y-4 p-0 overflow-hidden border border-slate-200/90 shadow-soft-xs rounded-xl">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900">Recent Valuation Cases</h2>
            <p className="text-[11px] text-slate-500">Live records from Jigaon Major Irrigation Project database</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/cases')}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="self-start sm:self-auto text-xs font-semibold"
          >
            View All Cases
          </Button>
        </div>

        <div className="overflow-x-auto w-full scrollbar-thin">
          <table className="w-full min-w-[700px] text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[10px] uppercase tracking-wider">
                <th className="py-3 px-4 sm:px-5">Case Number</th>
                <th className="py-3 px-4 sm:px-5">Owner Name</th>
                <th className="py-3 px-4 sm:px-5">House / Village</th>
                <th className="py-3 px-4 sm:px-5">Project</th>
                <th className="py-3 px-4 sm:px-5">Status</th>
                <th className="py-3 px-4 sm:px-5 text-right">Final Valuation</th>
                <th className="py-3 px-4 sm:px-5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading recent valuation records...
                  </td>
                </tr>
              ) : data?.recentCases.length ? (
                data.recentCases.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 sm:px-5 font-mono font-bold text-gov-navy whitespace-nowrap">
                      {c.caseNumber}
                    </td>
                    <td className="py-3.5 px-4 sm:px-5 font-semibold text-slate-900">
                      {c.ownerName}
                    </td>
                    <td className="py-3.5 px-4 sm:px-5 text-slate-600">
                      House #{c.houseNumber}, {c.village}
                    </td>
                    <td className="py-3.5 px-4 sm:px-5 text-slate-500 truncate max-w-[170px]">
                      {c.projectName}
                    </td>
                    <td className="py-3.5 px-4 sm:px-5 whitespace-nowrap">
                      {getStatusBadge(c.status)}
                    </td>
                    <td className="py-3.5 px-4 sm:px-5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      {c.formattedValuation}
                    </td>
                    <td className="py-3.5 px-4 sm:px-5 text-center whitespace-nowrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/cases/${c.id}`)}
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                        className="text-xs h-7 px-2.5"
                      >
                        Open Case
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No cases created yet. Click "+ New Valuation Case" to start.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
