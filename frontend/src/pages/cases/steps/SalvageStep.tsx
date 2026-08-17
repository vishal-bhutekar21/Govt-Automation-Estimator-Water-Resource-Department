import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { SalvageEstimate, EstimateItem, ValuationCase } from '../../../types';
import {
  Recycle,
  RotateCw,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sliders,
  HelpCircle,
} from 'lucide-react';

interface SalvageStepProps {
  caseData: ValuationCase;
  onPrev: () => void;
  onNext: () => void;
}

export const SalvageStep: React.FC<SalvageStepProps> = ({ caseData, onPrev, onNext }) => {
  const [salvageData, setSalvageData] = useState<SalvageEstimate | null>(null);
  const [allEstimateItems, setAllEstimateItems] = useState<EstimateItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  const fetchSalvage = async () => {
    try {
      setIsLoading(true);
      const estRes = await api.get<{ items: EstimateItem[] }>(`/v1/cases/${caseData.id}/estimate`);
      setAllEstimateItems(estRes.data.items);

      const salvageRes = await api.get<{
        salvage: SalvageEstimate;
        salvageItems: EstimateItem[];
      }>(`/v1/cases/${caseData.id}/salvage`);

      setSalvageData(salvageRes.data.salvage);
      setSelectedIds(salvageRes.data.salvage.selectedItemIds);
    } catch (err) {
      console.error('Failed to fetch salvage details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSalvage();
  }, [caseData.id]);

  const handleToggleItem = async (itemId: string) => {
    const updated = selectedIds.includes(itemId)
      ? selectedIds.filter((id) => id !== itemId)
      : [...selectedIds, itemId];

    setSelectedIds(updated);

    try {
      setIsUpdating(true);
      const res = await api.post<{ salvage: SalvageEstimate }>(
        `/v1/cases/${caseData.id}/salvage/update`,
        {
          selectedItemIds: updated,
          adjustmentPercentage: salvageData?.adjustmentPercentage || 10.0,
        }
      );
      setSalvageData(res.data.salvage);
    } catch (err) {
      console.error('Failed to update salvage items:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading || !salvageData) {
    return (
      <div className="py-20 text-center text-slate-400 text-xs animate-pulse">
        Loading salvage calculation sheet...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <span className="text-xs font-bold text-gov-navy uppercase tracking-wider">
            Step 7 of 10 • Valuation Workflow
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Salvage / Second Valuation Abstract
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="teal">Step 7: Reusable Materials</Badge>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 bg-white border border-slate-200/80 shadow-soft-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              1. Salvage Abstract Total
            </span>
            <Recycle className="w-4 h-4 text-gov-teal" />
          </div>
          <div className="text-2xl font-bold font-mono text-gov-navy">
            ₹ {salvageData.totalSalvageAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500">{selectedIds.length} Structural Components Selected</p>
        </Card>

        <Card className="p-5 bg-white border border-slate-200/80 shadow-soft-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              2. Salvage Depreciated Value
            </span>
            <CheckCircle2 className="w-4 h-4 text-gov-navy" />
          </div>
          <div className="text-2xl font-bold font-mono text-gov-navy">
            ₹ {salvageData.salvageDepreciatedValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500 font-mono">
            {salvageData.totalSalvageAmount} × ({salvageData.futureLifeYpFactor} ÷ {salvageData.totalLifeYpFactor})
          </p>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-gov-navy-50 to-white border border-gov-navy-200 shadow-soft-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gov-navy uppercase tracking-wider">
              3. 10% Salvage Adjustment
            </span>
            <Sliders className="w-4 h-4 text-gov-navy" />
          </div>
          <div className="text-2xl font-bold font-mono text-gov-saffron-800">
            ₹ {salvageData.adjustmentAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500">
            {salvageData.adjustmentPercentage}% of Salvage Depreciated Value
          </p>
        </Card>
      </div>

      {/* Reusable Item Selection Matrix */}
      <Card className="p-0 overflow-hidden shadow-soft-sm">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase">
              Select Salvageable Construction Components
            </h3>
            <p className="text-[11px] text-slate-500">
              Check items that can be dismantled or salvaged (e.g. Teak wood, CGI roofing sheets, GI pipes, Doors).
            </p>
          </div>
          {isUpdating && <span className="text-xs text-gov-teal animate-pulse font-medium">Updating...</span>}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="gov-table-header">
                <th className="py-3 px-4 text-center">Select</th>
                <th className="py-3 px-4 text-center">Item No.</th>
                <th className="py-3 px-6">Construction Particulars</th>
                <th className="py-3 px-4 text-right">Quantity</th>
                <th className="py-3 px-3">Unit</th>
                <th className="py-3 px-4 text-right">Rate (₹)</th>
                <th className="py-3 px-4 text-right">Abstract Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allEstimateItems.map((item) => {
                const isSelected = selectedIds.includes(item.id);

                return (
                  <tr
                    key={item.id}
                    className={`gov-table-row transition-colors ${
                      isSelected ? 'bg-gov-teal-50/40 font-medium' : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleItem(item.id)}
                        className="w-4 h-4 rounded text-gov-teal focus:ring-gov-teal cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-gov-navy">
                      {item.itemNumber}
                    </td>
                    <td className="py-3 px-6 text-slate-900">
                      {item.description}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-800">
                      {item.quantity.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-slate-500 font-semibold">{item.unit}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">
                      ₹ {item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-gov-navy">
                      ₹ {item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white font-bold text-xs">
                <td colSpan={6} className="py-3 px-6 text-right uppercase tracking-wider text-slate-300">
                  Total of Second Valuation (Salvage Items):
                </td>
                <td className="py-3 px-4 text-right font-mono text-base text-gov-saffron">
                  ₹ {salvageData.totalSalvageAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Action Toolbar */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <Button type="button" variant="outline" size="md" onClick={onPrev} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back to Depreciation
        </Button>

        <Button type="button" variant="primary" size="md" onClick={onNext} rightIcon={<ArrowRight className="w-4 h-4" />}>
          Proceed to Step 8: Final Valuation
        </Button>
      </div>
    </div>
  );
};
