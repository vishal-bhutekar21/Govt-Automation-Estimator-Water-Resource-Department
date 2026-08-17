import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { DepreciationFactor } from '../../types';
import { Table, Search, ShieldCheck, HelpCircle } from 'lucide-react';

export const DepreciationFactorsView: React.FC = () => {
  const [factors, setYpFactors] = useState<DepreciationFactor[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchFactors = async () => {
    try {
      setIsLoading(true);
      const res = await api.get<{ factors: DepreciationFactor[] }>('/v1/cases/rates/yp-factors');
      setYpFactors(res.data.factors);
    } catch (err) {
      console.error('Failed to load Y.P. factors:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFactors();
  }, []);

  const filtered = factors.filter(
    (f) =>
      f.year.toString().includes(search) ||
      f.factor.toString().includes(search) ||
      f.scheduleType.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="text-xs font-bold text-gov-navy uppercase tracking-wider">
            Government Valuation Standards
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            7% Year's Purchase (Y.P.) Depreciation Factors
          </h1>
        </div>
        <Badge variant="teal">Official 7% Compound Schedule</Badge>
      </div>

      {/* Info Callout */}
      <Card variant="accent-border" className="p-5 bg-gov-navy-50/60 border-gov-navy-100 flex items-start gap-3">
        <HelpCircle className="w-5 h-5 text-gov-navy shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs text-slate-700">
          <div className="font-bold text-gov-navy uppercase">
            Maharashtra Public Works Department Valuation Principle
          </div>
          <p>
            Under the Land Acquisition & Submergence Rehabilitation Valuation Rules, the depreciated value of a structure is calculated using the formula:
            <strong className="block font-mono text-slate-900 mt-1">
              Depreciated Value = Present Cost × [ Y.P. for Future Balance Life (r) ÷ Y.P. for Total Useful Life (D) ]
            </strong>
          </p>
        </div>
      </Card>

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by period in years (e.g. 4, 41, 45, 100) or factor value..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border rounded-gov-md focus:ring-2 focus:ring-gov-navy outline-none"
          />
        </div>
      </Card>

      {/* Factors Table */}
      <Card className="p-0 overflow-hidden shadow-soft-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="gov-table-header">
                <th className="py-3 px-6">Period (n Years)</th>
                <th className="py-3 px-6">Compound Interest Rate</th>
                <th className="py-3 px-6 text-right">Year's Purchase Factor (Y.P.)</th>
                <th className="py-3 px-6">Standard Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    Loading factor database...
                  </td>
                </tr>
              ) : filtered.length ? (
                filtered.map((f) => (
                  <tr key={f.id} className="gov-table-row">
                    <td className="py-3 px-6 font-mono font-bold text-slate-900">
                      {f.year} Years
                    </td>
                    <td className="py-3 px-6 text-slate-600 font-medium">
                      {f.interestRate.toFixed(1)}% p.a. Compound
                    </td>
                    <td className="py-3 px-6 text-right font-mono font-bold text-gov-navy text-sm">
                      {f.factor.toFixed(3)}
                    </td>
                    <td className="py-3 px-6 text-slate-500">
                      Govt of Maharashtra 7% Y.P. Table
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    No factors match your search.
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
