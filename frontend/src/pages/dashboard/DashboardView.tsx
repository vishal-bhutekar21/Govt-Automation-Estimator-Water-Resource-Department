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
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="text-xs font-bold text-gov-navy uppercase tracking-wider">
            Water Resources Department • Jigaon Project Division
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Executive Valuation Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="md"
            leftIcon={<FolderKanban className="w-4 h-4" />}
            onClick={() => navigate('/projects')}
          >
            Manage Projects
          </Button>
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => navigate('/cases')}
          >
            New Valuation Case
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Projects */}
        <Card variant="default" className="space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Projects</span>
            <div className="p-2.5 rounded-gov-md bg-gov-navy-50 text-gov-navy">
              <FolderKanban className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-gov-navy">
            {isLoading ? '...' : data?.stats.totalProjects ?? 0}
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-1">
            <span>Primary Scheme:</span>
            <strong className="text-slate-700">Jigaon Submergence</strong>
          </div>
        </Card>

        {/* Total Cases */}
        <Card variant="default" className="space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total House Cases</span>
            <div className="p-2.5 rounded-gov-md bg-gov-teal-50 text-gov-teal">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-gov-teal">
            {isLoading ? '...' : data?.stats.totalCases ?? 0}
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span>Draft: {data?.stats.draftCases ?? 0}</span>
            <span>•</span>
            <span>Completed: {data?.stats.completedCases ?? 0}</span>
          </div>
        </Card>

        {/* Completed Valuations */}
        <Card variant="default" className="space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Approved Valuations</span>
            <div className="p-2.5 rounded-gov-md bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-emerald-700">
            {isLoading ? '...' : data?.stats.completedCases ?? 0}
          </div>
          <div className="text-xs text-slate-500">
            Official A4 PDF reports finalized
          </div>
        </Card>

        {/* Total Estimated Value */}
        <Card variant="accent-border" className="space-y-3 relative overflow-hidden bg-gradient-to-br from-white to-amber-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gov-saffron-800 uppercase tracking-wider">Total Value Sum</span>
            <div className="p-2.5 rounded-gov-md bg-gov-saffron-50 text-gov-saffron-800">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
            {isLoading ? '...' : data?.stats.formattedTotalEstimatedValue ?? '₹ 0.00'}
          </div>
          <div className="text-xs text-slate-500">
            Calculated across active cases
          </div>
        </Card>
      </div>

      {/* Recent Cases Section */}
      <Card className="space-y-5 p-0 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Valuation Cases</h2>
            <p className="text-xs text-slate-500">Live records from Jigaon Project database</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/cases')}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            View All Cases
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="gov-table-header">
                <th className="py-3 px-6">Case Number</th>
                <th className="py-3 px-6">Owner Name</th>
                <th className="py-3 px-6">House / Village</th>
                <th className="py-3 px-6">Project</th>
                <th className="py-3 px-6">Status</th>
                <th className="py-3 px-6 text-right">Final Valuation</th>
                <th className="py-3 px-6 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading recent valuation records...
                  </td>
                </tr>
              ) : data?.recentCases.length ? (
                data.recentCases.map((c) => (
                  <tr key={c.id} className="gov-table-row">
                    <td className="py-3.5 px-6 font-mono font-bold text-gov-navy">
                      {c.caseNumber}
                    </td>
                    <td className="py-3.5 px-6 font-semibold text-slate-800">
                      {c.ownerName}
                    </td>
                    <td className="py-3.5 px-6 text-slate-600">
                      House #{c.houseNumber}, {c.village}
                    </td>
                    <td className="py-3.5 px-6 text-slate-500 truncate max-w-[180px]">
                      {c.projectName}
                    </td>
                    <td className="py-3.5 px-6">
                      {getStatusBadge(c.status)}
                    </td>
                    <td className="py-3.5 px-6 text-right font-mono font-bold text-slate-900">
                      {c.formattedValuation}
                    </td>
                    <td className="py-3.5 px-6 text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/cases/${c.id}`)}
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
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
