import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { CaseCreationModal } from './CaseCreationModal';
import {
  FileSpreadsheet,
  Plus,
  Search,
  Filter,
  Eye,
  Building2,
  Calendar,
  Home,
  User,
} from 'lucide-react';

interface CaseItem {
  id: string;
  caseNumber: string;
  projectName: string;
  status: string;
  valuationDate: string;
  property?: {
    ownerName: string;
    houseNumber: string;
    village: string;
    taluka: string;
    district: string;
  };
  structure?: {
    structureType: string;
    constructionType: string;
    builtUpArea: number;
  };
  finalValuation?: {
    finalValuationAmount: number;
  };
  formattedValuation: string;
}

export const CaseListView: React.FC = () => {
  const navigate = useNavigate();
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const fetchCases = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);

      const res = await api.get<{ cases: CaseItem[] }>(`/v1/cases?${params.toString()}`);
      setCases(res.data.cases);
    } catch (err) {
      console.error('Failed to fetch cases:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCases();
  };

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
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="text-xs font-bold text-gov-navy uppercase tracking-wider">
            Case Lifecycle & Estimation Files
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Valuation Cases Registry
          </h1>
        </div>
        <Button
          variant="primary"
          size="md"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsModalOpen(true)}
        >
          Initialize New Case
        </Button>
      </div>

      {/* Filters Bar */}
      <Card className="p-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by Case No., Owner Name, House No., or Village..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-gov-md border border-slate-300 text-xs focus:ring-2 focus:ring-gov-navy outline-none"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-gov-md border border-slate-300 text-xs focus:ring-2 focus:ring-gov-navy outline-none bg-white"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="MEASUREMENT_IN_PROGRESS">Measurement in Progress</option>
              <option value="ESTIMATE_IN_PROGRESS">Estimate in Progress</option>
              <option value="APPROVED">Approved</option>
            </select>

            <Button type="submit" variant="secondary" size="sm">
              Search
            </Button>
          </div>
        </form>
      </Card>

      {/* Cases Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="gov-table-header">
                <th className="py-3 px-6">Case Number</th>
                <th className="py-3 px-6">Owner Particulars</th>
                <th className="py-3 px-6">Location</th>
                <th className="py-3 px-6">Structure Type</th>
                <th className="py-3 px-6">Status</th>
                <th className="py-3 px-6 text-right">Valuation Amount</th>
                <th className="py-3 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Loading valuation cases...
                  </td>
                </tr>
              ) : cases.length ? (
                cases.map((c) => (
                  <tr key={c.id} className="gov-table-row">
                    <td className="py-4 px-6 font-mono font-bold text-gov-navy">
                      {c.caseNumber}
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-900">{c.property?.ownerName || 'Unknown Owner'}</div>
                      <div className="text-[11px] text-slate-500">House #{c.property?.houseNumber || '-'}</div>
                    </td>
                    <td className="py-4 px-6 text-slate-600">
                      <div>{c.property?.village || '-'}</div>
                      <div className="text-[11px] text-slate-400">{c.property?.taluka}, {c.property?.district}</div>
                    </td>
                    <td className="py-4 px-6 text-slate-600">
                      <div className="font-medium text-slate-800">{c.structure?.structureType || 'Residential'}</div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[160px]">{c.structure?.constructionType}</div>
                    </td>
                    <td className="py-4 px-6">
                      {getStatusBadge(c.status)}
                    </td>
                    <td className="py-4 px-6 text-right font-mono font-bold text-slate-900 text-sm">
                      {c.formattedValuation}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => navigate(`/cases/${c.id}`)}
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                      >
                        Open File
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No valuation cases found matching the criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Case Creation Stepper Modal */}
      <CaseCreationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(caseId) => {
          setIsModalOpen(false);
          navigate(`/cases/${caseId}`);
        }}
      />
    </div>
  );
};
