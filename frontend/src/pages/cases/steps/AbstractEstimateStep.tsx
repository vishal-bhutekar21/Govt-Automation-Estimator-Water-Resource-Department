import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { EstimateItem, ValuationCase, RateItem } from '../../../types';
import {
  Calculator,
  RotateCw,
  Search,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Tag,
  Check,
} from 'lucide-react';

interface AbstractEstimateStepProps {
  caseData: ValuationCase;
  onPrev: () => void;
  onNext: () => void;
}

export const AbstractEstimateStep: React.FC<AbstractEstimateStepProps> = ({
  caseData,
  onPrev,
  onNext,
}) => {
  const [items, setItems] = useState<EstimateItem[]>([]);
  const [grandTotal, setGrandTotal] = useState<number>(261669);
  const [formattedTotal, setFormattedTotal] = useState<string>('₹ 2,61,669.00');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRecalculating, setIsRecalculating] = useState<boolean>(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  // Rate Linking Modal State
  const [rateModalItem, setRateModalItem] = useState<EstimateItem | null>(null);
  const [availableRates, setAvailableRates] = useState<RateItem[]>([]);
  const [rateSearch, setRateSearch] = useState<string>('');

  const fetchEstimate = async () => {
    try {
      setIsLoading(true);
      const res = await api.get<{
        items: EstimateItem[];
        grandTotal: number;
        formattedGrandTotal: string;
      }>(`/v1/cases/${caseData.id}/estimate`);

      setItems(res.data.items);
      setGrandTotal(res.data.grandTotal);
      setFormattedTotal(res.data.formattedGrandTotal);
    } catch (err) {
      console.error('Failed to fetch estimate:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEstimate();
  }, [caseData.id]);

  const handleRecalculate = async () => {
    try {
      setIsRecalculating(true);
      const res = await api.post<{
        items: EstimateItem[];
        grandTotal: number;
        formattedGrandTotal: string;
      }>(`/v1/cases/${caseData.id}/estimate/recalculate`);

      setItems(res.data.items);
      setGrandTotal(res.data.grandTotal);
      setFormattedTotal(res.data.formattedGrandTotal);
    } catch (err) {
      console.error('Failed to recalculate estimate:', err);
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleToggleSalvage = async (item: EstimateItem) => {
    try {
      const updated = !item.isSalvageEligible;
      await api.put(`/v1/cases/estimate/items/${item.id}`, {
        isSalvageEligible: updated,
      });
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, isSalvageEligible: updated } : i))
      );
    } catch (err) {
      console.error('Failed to update salvage eligibility:', err);
    }
  };

  const openRateSelector = async (item: EstimateItem) => {
    setRateModalItem(item);
    try {
      const res = await api.get<{ rates: RateItem[] }>('/v1/rates');
      setAvailableRates(res.data.rates);
    } catch (err) {
      console.error('Failed to load rates:', err);
    }
  };

  const handleLinkRate = async (rateItem: RateItem) => {
    if (!rateModalItem) return;
    try {
      if (rateModalItem.measurementGroupId) {
        await api.post(`/v1/cases/measurements/groups/${rateModalItem.measurementGroupId}/link-rate`, {
          rateItemId: rateItem.id,
        });
      } else {
        await api.put(`/v1/cases/estimate/items/${rateModalItem.id}`, {
          rate: rateItem.rate,
          description: rateItem.description,
        });
      }
      setRateModalItem(null);
      fetchEstimate();
    } catch (err) {
      console.error('Failed to link rate:', err);
    }
  };

  const filteredRates = availableRates.filter(
    (r) =>
      r.description.toLowerCase().includes(rateSearch.toLowerCase()) ||
      r.itemNumber.toLowerCase().includes(rateSearch.toLowerCase()) ||
      r.itemCode.toLowerCase().includes(rateSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <span className="text-xs font-bold text-gov-navy uppercase tracking-wider">
            Step 5 of 10 • Valuation Workflow
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Abstract Estimate of Construction
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRecalculate}
            isLoading={isRecalculating}
            leftIcon={<RotateCw className="w-3.5 h-3.5" />}
          >
            Recalculate Estimate
          </Button>
          <Badge variant="teal">Step 5: Primary Abstract</Badge>
        </div>
      </div>

      {/* Abstract Grand Total Summary Card */}
      <Card variant="accent-border" className="p-6 bg-gradient-to-br from-white to-slate-50 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="text-xs font-bold text-gov-navy uppercase tracking-wider">
            Schedule: PWD CSR 2014-15 • Water Resources Dept
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            Primary Estimated Cost of Construction (Gross Abstract)
          </h3>
          <p className="text-xs text-slate-500">
            Derived directly from 18 itemized measurement sheets and approved government rates.
          </p>
        </div>

        <div className="p-4 rounded-gov-md bg-gov-navy text-white text-right shrink-0 min-w-[240px] shadow-soft-md">
          <div className="text-[10px] font-semibold text-gov-saffron uppercase tracking-widest">
            Primary Abstract Total
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight mt-0.5">
            {formattedTotal}
          </div>
          <div className="text-[11px] text-gov-navy-200 mt-0.5">
            Total {items.length} Work Items Evaluated
          </div>
        </div>
      </Card>

      {/* Abstract Estimate Table */}
      <Card className="p-0 overflow-hidden shadow-soft-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="gov-table-header">
                <th className="py-3 px-4 text-center">Sr. No.</th>
                <th className="py-3 px-6">Particulars of Construction Item</th>
                <th className="py-3 px-4 text-right">Quantity</th>
                <th className="py-3 px-3">Unit</th>
                <th className="py-3 px-4 text-right">Approved Rate (₹)</th>
                <th className="py-3 px-4 text-right">Amount (₹)</th>
                <th className="py-3 px-4 text-center">Salvage?</th>
                <th className="py-3 px-4 text-center">Rate Ref</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading abstract estimate items...
                  </td>
                </tr>
              ) : items.length ? (
                items.map((item, idx) => (
                  <React.Fragment key={item.id}>
                    <tr className="gov-table-row">
                      <td className="py-3 px-4 text-center font-mono font-bold text-gov-navy">
                        {item.itemNumber}
                      </td>
                      <td className="py-3 px-6">
                        <div className="font-semibold text-slate-900 leading-tight">
                          {item.description}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                        {item.quantity.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-500">
                        {item.unit}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        <button
                          type="button"
                          onClick={() => openRateSelector(item)}
                          className="hover:text-gov-teal underline decoration-dotted font-medium"
                          title="Click to view/change linked CSR rate"
                        >
                          ₹ {item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-gov-navy text-sm">
                        ₹ {item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={item.isSalvageEligible}
                          onChange={() => handleToggleSalvage(item)}
                          className="w-4 h-4 rounded text-gov-teal focus:ring-gov-teal cursor-pointer"
                          title="Include in Salvage / Second Valuation"
                        />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {item.rateReference || 'PWD CSR 2014-15'}
                        </span>
                      </td>
                    </tr>
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No estimate items generated yet.
                  </td>
                </tr>
              )}
            </tbody>
            {/* Sticky Table Footer */}
            <tfoot>
              <tr className="bg-slate-900 text-white font-bold text-xs">
                <td colSpan={5} className="py-3 px-6 text-right uppercase tracking-wider text-slate-300">
                  Grand Total of Abstract Estimate (Present Estimated Cost):
                </td>
                <td className="py-3 px-4 text-right font-mono text-base text-gov-saffron">
                  {formattedTotal}
                </td>
                <td colSpan={2} className="py-3 px-4 text-center text-[10px] text-slate-400 font-sans">
                  Server Confirmed
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Rate Selection Modal */}
      {rateModalItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-gov-lg max-w-2xl w-full p-6 space-y-4 shadow-soft-lg border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Select Approved CSR Rate Item</h3>
                <p className="text-xs text-slate-500">Linking to Item #{rateModalItem.itemNumber}: {rateModalItem.description}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setRateModalItem(null)}>
                ✕
              </Button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search CSR item catalog by code, description, or keyword (e.g. teak, plaster)..."
                value={rateSearch}
                onChange={(e) => setRateSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border rounded-gov-md focus:ring-2 focus:ring-gov-navy outline-none"
              />
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-slate-100 text-xs border rounded-gov-md">
              {filteredRates.map((r) => (
                <div
                  key={r.id}
                  onClick={() => handleLinkRate(r)}
                  className="p-3 hover:bg-gov-navy-50/50 cursor-pointer flex items-center justify-between transition-colors"
                >
                  <div className="space-y-0.5 max-w-lg">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-gov-navy">{r.itemNumber}</span>
                      <span className="font-mono text-[10px] text-slate-400">{r.itemCode}</span>
                      <Badge variant="teal">{r.unit}</Badge>
                    </div>
                    <div className="text-slate-800 font-medium">{r.description}</div>
                    <div className="text-[10px] text-slate-400">{r.referenceSource}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono font-bold text-sm text-gov-navy">
                      ₹ {r.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] text-slate-400">per {r.unit}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Action Toolbar */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <Button type="button" variant="outline" size="md" onClick={onPrev} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back to Measurements
        </Button>

        <Button type="button" variant="primary" size="md" onClick={onNext} rightIcon={<ArrowRight className="w-4 h-4" />}>
          Proceed to Step 6: Depreciation Engine
        </Button>
      </div>
    </div>
  );
};
