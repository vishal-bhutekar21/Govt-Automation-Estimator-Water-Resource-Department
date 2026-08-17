import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { FinalValuation, SalvageEstimate, ValuationCase } from '../../../types';
import {
  Award,
  Sliders,
  CheckCircle2,
  FileText,
  RotateCw,
  ArrowRight,
  ArrowLeft,
  Stamp,
  UserCheck,
  ShieldCheck,
} from 'lucide-react';

interface FinalValuationStepProps {
  caseData: ValuationCase;
  onPrev: () => void;
  onNext: () => void;
}

export const FinalValuationStep: React.FC<FinalValuationStepProps> = ({
  caseData,
  onPrev,
  onNext,
}) => {
  const [summary, setSummary] = useState<FinalValuation | null>(null);
  const [salvageDetails, setSalvageDetails] = useState<SalvageEstimate | null>(null);
  const [amountInWords, setAmountInWords] = useState<string>('');
  const [adjustmentPct, setAdjustmentPct] = useState<number>(10.0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  const fetchValuation = async () => {
    try {
      setIsLoading(true);
      const res = await api.get<{
        summary: FinalValuation;
        salvageDetails: SalvageEstimate;
        amountInWords: string;
      }>(`/v1/cases/${caseData.id}/final-valuation`);

      setSummary(res.data.summary);
      setSalvageDetails(res.data.salvageDetails);
      setAmountInWords(res.data.amountInWords);
      setAdjustmentPct(res.data.summary.adjustmentPercentage);
    } catch (err) {
      console.error('Failed to fetch final valuation:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchValuation();
  }, [caseData.id]);

  const handleSliderChange = async (newPct: number) => {
    setAdjustmentPct(newPct);
    try {
      setIsUpdating(true);
      const res = await api.post<{
        finalValuation: FinalValuation;
        salvage: SalvageEstimate;
      }>(`/v1/cases/${caseData.id}/salvage/update`, {
        adjustmentPercentage: newPct,
      });

      setSummary(res.data.finalValuation);
      setSalvageDetails(res.data.salvage);

      const summaryRes = await api.get<{ amountInWords: string }>(
        `/v1/cases/${caseData.id}/final-valuation`
      );
      setAmountInWords(summaryRes.data.amountInWords);
    } catch (err) {
      console.error('Failed to update salvage percentage:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading || !summary) {
    return (
      <div className="py-20 text-center text-slate-400 text-xs animate-pulse">
        Loading master final valuation statement...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <span className="text-xs font-bold text-gov-navy uppercase tracking-wider">
            Step 8 of 10 • Valuation Workflow
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Final House Valuation & Compensation Recapitulation
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="teal">Step 8: Net Compensation</Badge>
        </div>
      </div>

      {/* Hero Grand Valuation Master Card */}
      <Card
        variant="accent-border"
        className="p-6 bg-gradient-to-br from-gov-navy to-slate-900 text-white shadow-soft-lg space-y-6"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-4 border-b border-gov-navy-700">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-gov-saffron" />
              <span className="text-xs font-bold text-gov-saffron uppercase tracking-widest">
                Official Net Payable Compensation Amount
              </span>
            </div>
            <h3 className="text-lg font-semibold text-slate-200">
              Government Valuation Certificate Recapitulation
            </h3>
            <p className="text-xs text-gov-navy-200">
              Primary Depreciated Structure Cost minus Reusable Salvage Deductions
            </p>
          </div>

          <div className="text-left md:text-right">
            <div className="text-3xl sm:text-4xl font-extrabold font-mono text-gov-saffron tracking-tight">
              ₹ {summary.finalValuationAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-emerald-400 font-semibold mt-1 flex items-center md:justify-end gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Government Audit Confirmed</span>
            </div>
          </div>
        </div>

        {/* Amount in Words */}
        <div className="p-4 rounded-gov-md bg-white/10 backdrop-blur-sm border border-white/15 space-y-1">
          <div className="text-[10px] font-bold text-gov-saffron uppercase tracking-wider">
            Total Compensation Amount in Words:
          </div>
          <div className="font-semibold text-sm sm:text-base text-white tracking-wide italic">
            "{amountInWords}"
          </div>
        </div>
      </Card>

      {/* Recapitulation Breakdown Table */}
      <Card className="p-0 overflow-hidden shadow-soft-sm">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 uppercase">
            Valuation Statement & Step-by-Step Recapitulation
          </h3>
          <span className="text-xs text-slate-500 font-mono">Case ID: {caseData.caseNumber}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="gov-table-header">
                <th className="py-3 px-4 text-center">Step</th>
                <th className="py-3 px-6">Valuation Component</th>
                <th className="py-3 px-4">Formula / Methodology</th>
                <th className="py-3 px-6 text-right">Evaluated Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="gov-table-row">
                <td className="py-3 px-4 text-center font-mono font-bold text-slate-500">1</td>
                <td className="py-3 px-6 font-semibold text-slate-900">
                  Primary Abstract Cost of Construction
                </td>
                <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                  Sum of 18 Work Items @ PWD CSR 2014-15 Rates
                </td>
                <td className="py-3 px-6 text-right font-mono font-bold text-slate-800">
                  ₹ {summary.primaryEstimateTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>

              <tr className="gov-table-row bg-slate-50/50">
                <td className="py-3 px-4 text-center font-mono font-bold text-slate-500">2</td>
                <td className="py-3 px-6 font-semibold text-slate-900">
                  Primary Depreciated Structure Value
                </td>
                <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                  Primary Cost × YP(41y: 13.394) ÷ YP(45y: 13.606)
                </td>
                <td className="py-3 px-6 text-right font-mono font-bold text-gov-navy">
                  ₹ {summary.primaryDepreciatedValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>

              <tr className="gov-table-row">
                <td className="py-3 px-4 text-center font-mono font-bold text-slate-500">3</td>
                <td className="py-3 px-6 font-semibold text-slate-900">
                  Second Valuation (Salvage Materials Abstract)
                </td>
                <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                  Sum of Reusable Structural Items (Teak, CGI, GI, Gates)
                </td>
                <td className="py-3 px-6 text-right font-mono font-bold text-slate-800">
                  ₹ {summary.salvageEstimateTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>

              <tr className="gov-table-row bg-slate-50/50">
                <td className="py-3 px-4 text-center font-mono font-bold text-slate-500">4</td>
                <td className="py-3 px-6 font-semibold text-slate-900">
                  Salvage Depreciated Value
                </td>
                <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                  Salvage Cost × YP(41y: 13.394) ÷ YP(45y: 13.606)
                </td>
                <td className="py-3 px-6 text-right font-mono font-bold text-slate-800">
                  ₹ {summary.salvageDepreciatedValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>

              <tr className="gov-table-row text-rose-700 bg-rose-50/30">
                <td className="py-3 px-4 text-center font-mono font-bold text-rose-500">5</td>
                <td className="py-3 px-6 font-semibold">
                  Salvage Adjustment Deduction ({summary.adjustmentPercentage.toFixed(1)}%)
                </td>
                <td className="py-3 px-4 font-mono text-[11px] text-rose-600">
                  {summary.adjustmentPercentage}% of Salvage Depreciated Value
                </td>
                <td className="py-3 px-6 text-right font-mono font-bold text-rose-700">
                  - ₹ {summary.adjustmentAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>

            <tfoot>
              <tr className="bg-slate-900 text-white font-bold text-xs">
                <td colSpan={3} className="py-3.5 px-6 text-right uppercase tracking-wider text-slate-300">
                  Final House Valuation Compensation Payable:
                </td>
                <td className="py-3.5 px-6 text-right font-mono text-lg text-gov-saffron">
                  ₹ {summary.finalValuationAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Configurable Salvage Adjustment Simulation Box */}
      <Card className="p-5 bg-slate-50 border border-slate-200/80 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-gov-navy" />
            <h4 className="text-xs font-bold text-slate-900 uppercase">
              Configurable Salvage Deduction Rate
            </h4>
          </div>
          <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-white border border-slate-300 text-gov-navy">
            Current: {adjustmentPct}%
          </span>
        </div>

        <div className="space-y-2">
          <input
            type="range"
            min="0"
            max="25"
            step="1"
            value={adjustmentPct}
            onChange={(e) => handleSliderChange(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-gov-navy"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>0% (No Salvage Deductions)</span>
            <span className="text-gov-navy font-bold">10% (Government Default)</span>
            <span>25% (High Salvage Rate)</span>
          </div>
        </div>
      </Card>

      {/* Official Sign-Off Audit Trail */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Stamp className="w-4 h-4 text-gov-navy" />
          <h4 className="text-xs font-bold text-slate-900 uppercase">
            3-Tier Institutional Verification & Sign-Off Trail
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-gov-md bg-white border border-slate-200 space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase">1. Prepared By</div>
            <div className="font-bold text-slate-800">{caseData.preparedBy || 'Sectional Engineer (S.E.)'}</div>
            <div className="text-[10px] text-emerald-600 flex items-center gap-1 font-semibold">
              <CheckCircle2 className="w-3 h-3" />
              <span>Measurements Verified</span>
            </div>
          </div>

          <div className="p-3.5 rounded-gov-md bg-white border border-slate-200 space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase">2. Checked & Calculated By</div>
            <div className="font-bold text-slate-800">{caseData.checkedBy || 'Assistant Engineer (A.E. Gr-I)'}</div>
            <div className="text-[10px] text-emerald-600 flex items-center gap-1 font-semibold">
              <CheckCircle2 className="w-3 h-3" />
              <span>Abstract & Rates Validated</span>
            </div>
          </div>

          <div className="p-3.5 rounded-gov-md bg-white border border-slate-200 space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase">3. Sanctioned & Approved By</div>
            <div className="font-bold text-slate-800">{caseData.approvedBy || 'Executive Engineer (E.E.)'}</div>
            <div className="text-[10px] text-gov-teal flex items-center gap-1 font-semibold">
              <ShieldCheck className="w-3 h-3" />
              <span>Final Sanction Granted</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Action Toolbar */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <Button type="button" variant="outline" size="md" onClick={onPrev} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back to Salvage Valuation
        </Button>

        <Button type="button" variant="primary" size="md" onClick={onNext} rightIcon={<ArrowRight className="w-4 h-4" />}>
          Proceed to Step 9: Panchanama & Photos
        </Button>
      </div>
    </div>
  );
};
