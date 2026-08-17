import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { DepreciationCalculation, ValuationCase, DepreciationFactor } from '../../../types';
import {
  TrendingDown,
  Calculator,
  Calendar,
  RotateCw,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Table as TableIcon,
  Percent,
} from 'lucide-react';

interface DepreciationStepProps {
  caseData: ValuationCase;
  onPrev: () => void;
  onNext: () => void;
}

export const DepreciationStep: React.FC<DepreciationStepProps> = ({
  caseData,
  onPrev,
  onNext,
}) => {
  const [calculation, setCalculation] = useState<DepreciationCalculation | null>(null);
  const [ypFactors, setYpFactors] = useState<DepreciationFactor[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRecalculating, setIsRecalculating] = useState<boolean>(false);
  const [showTableModal, setShowTableModal] = useState<boolean>(false);

  const fetchDepreciation = async () => {
    try {
      setIsLoading(true);
      const res = await api.get<{ calculation: DepreciationCalculation }>(
        `/v1/cases/${caseData.id}/depreciation`
      );
      setCalculation(res.data.calculation);

      const factorRes = await api.get<{ factors: DepreciationFactor[] }>('/v1/cases/rates/yp-factors');
      setYpFactors(factorRes.data.factors);
    } catch (err) {
      console.error('Failed to fetch depreciation:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDepreciation();
  }, [caseData.id]);

  const handleRecalculate = async () => {
    try {
      setIsRecalculating(true);
      const res = await api.post<{ calculation: DepreciationCalculation }>(
        `/v1/cases/${caseData.id}/depreciation/calculate`
      );
      setCalculation(res.data.calculation);
    } catch (err) {
      console.error('Failed to recalculate depreciation:', err);
    } finally {
      setIsRecalculating(false);
    }
  };

  if (isLoading || !calculation) {
    return (
      <div className="py-20 text-center text-slate-400 text-xs animate-pulse">
        Loading depreciation mathematical engine...
      </div>
    );
  }

  const depreciationLoss = calculation.presentEstimatedCost - calculation.depreciatedValue;
  const depreciationLossPct = (
    (depreciationLoss / calculation.presentEstimatedCost) *
    100
  ).toFixed(2);

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <span className="text-xs font-bold text-gov-navy uppercase tracking-wider">
            Step 6 of 10 • Valuation Workflow
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Structure Depreciation Engine (7% Y.P. Factor Model)
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTableModal(true)}
            leftIcon={<TableIcon className="w-3.5 h-3.5" />}
          >
            View 7% Y.P. Table
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRecalculate}
            isLoading={isRecalculating}
            leftIcon={<RotateCw className="w-3.5 h-3.5" />}
          >
            Recalculate
          </Button>
          <Badge variant="teal">Step 6: Depreciation</Badge>
        </div>
      </div>

      {/* Top Lifecycle & Valuation Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Present Abstract Cost Card */}
        <Card className="p-5 bg-white border border-slate-200/80 shadow-soft-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              1. Present Abstract Cost
            </span>
            <Calculator className="w-4 h-4 text-gov-navy" />
          </div>
          <div className="text-2xl font-bold font-mono text-gov-navy">
            ₹ {calculation.presentEstimatedCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500">Gross Abstract Estimate from Step 5</p>
        </Card>

        {/* Depreciation Factor Card */}
        <Card className="p-5 bg-gov-navy text-white border-0 shadow-soft-md space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gov-saffron uppercase tracking-widest">
              2. 7% Y.P. Depreciation Ratio
            </span>
            <Percent className="w-4 h-4 text-gov-saffron" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {calculation.depreciationFactor.toFixed(7)}
          </div>
          <div className="text-[11px] text-slate-300 font-mono">
            YP({calculation.futureLife}y) ÷ YP({calculation.totalLife}y) = {calculation.futureLifeYpFactor} ÷ {calculation.totalLifeYpFactor}
          </div>
        </Card>

        {/* Primary Depreciated Cost Card */}
        <Card className="p-5 bg-gradient-to-br from-gov-teal-50 to-white border border-gov-teal-200 shadow-soft-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gov-teal uppercase tracking-wider">
              3. Primary Depreciated Value
            </span>
            <CheckCircle2 className="w-4 h-4 text-gov-teal" />
          </div>
          <div className="text-2xl font-bold font-mono text-gov-teal">
            ₹ {calculation.depreciatedValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 font-semibold flex items-center gap-1.5">
            <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
            <span>Depreciation: -₹ {depreciationLoss.toLocaleString('en-IN')} ({depreciationLossPct}%)</span>
          </div>
        </Card>
      </div>

      {/* Detailed Lifecycle Breakdown Card */}
      <Card variant="accent-border" className="p-6 space-y-6">
        <h3 className="text-base font-bold text-slate-900">
          Structure Lifecycle Parameters & Government Y.P. Factors
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center text-xs">
          <div className="p-3 rounded-gov-md bg-slate-50 border border-slate-200">
            <div className="text-[10px] text-slate-500 font-bold uppercase">Year Built</div>
            <div className="text-base font-mono font-bold text-slate-900 mt-1">
              {calculation.yearOfConstruction}
            </div>
          </div>

          <div className="p-3 rounded-gov-md bg-slate-50 border border-slate-200">
            <div className="text-[10px] text-slate-500 font-bold uppercase">Valuation Year</div>
            <div className="text-base font-mono font-bold text-slate-900 mt-1">
              {calculation.valuationYear}
            </div>
          </div>

          <div className="p-3 rounded-gov-md bg-slate-50 border border-slate-200">
            <div className="text-[10px] text-slate-500 font-bold uppercase">Present Age (d)</div>
            <div className="text-base font-mono font-bold text-gov-navy mt-1">
              {calculation.presentLife} Years
            </div>
          </div>

          <div className="p-3 rounded-gov-md bg-slate-50 border border-slate-200">
            <div className="text-[10px] text-slate-500 font-bold uppercase">Total Useful Life (D)</div>
            <div className="text-base font-mono font-bold text-gov-navy mt-1">
              {calculation.totalLife} Years
            </div>
          </div>

          <div className="p-3 rounded-gov-md bg-gov-teal-50 border border-gov-teal-200">
            <div className="text-[10px] text-gov-teal font-bold uppercase">Future Balance (r)</div>
            <div className="text-base font-mono font-bold text-gov-teal mt-1">
              {calculation.futureLife} Years
            </div>
          </div>
        </div>

        {/* Mathematical Equation Presentation */}
        <div className="p-4 rounded-gov-md bg-gov-navy-50/60 border border-gov-navy-100 space-y-2">
          <div className="text-xs font-bold text-gov-navy uppercase tracking-wider flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4" />
            <span>Government Standard Valuation Formula (PWD Circular & Land Acquisition Code)</span>
          </div>

          <div className="p-3 rounded bg-white border border-slate-200 font-mono text-xs text-slate-800 space-y-1">
            <div className="font-bold text-gov-navy">
              Depreciated Value = Present Cost × [ Y.P. for Future Life (r) ÷ Y.P. for Total Life (D) ]
            </div>
            <div className="text-slate-600">
              = ₹ {calculation.presentEstimatedCost.toLocaleString('en-IN')}.00 × [ {calculation.futureLifeYpFactor} ÷ {calculation.totalLifeYpFactor} ]
            </div>
            <div className="text-gov-teal font-bold text-sm pt-1">
              = ₹ {calculation.depreciatedValue.toLocaleString('en-IN')}.00
            </div>
          </div>
        </div>
      </Card>

      {/* 7% Y.P. Factor Table Modal */}
      {showTableModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-gov-lg max-w-xl w-full p-6 space-y-4 shadow-soft-lg border border-slate-200 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Government 7% Compound Interest Year's Purchase Table
                </h3>
                <p className="text-xs text-slate-500">Official PWD/WRD Valuation Reference Factors</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setShowTableModal(false)}>
                ✕
              </Button>
            </div>

            <div className="overflow-y-auto flex-1 text-xs border rounded-gov-md">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 font-bold text-slate-700">
                    <th className="py-2 px-4">Period (Years)</th>
                    <th className="py-2 px-4">Interest Rate</th>
                    <th className="py-2 px-4 text-right">Y.P. Factor</th>
                    <th className="py-2 px-4 text-center">Status in Case</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ypFactors.map((f) => {
                    const isFutureMatch = f.year === calculation.futureLife;
                    const isTotalMatch = f.year === calculation.totalLife;

                    return (
                      <tr
                        key={f.id}
                        className={`hover:bg-slate-50 ${
                          isFutureMatch || isTotalMatch ? 'bg-gov-navy-50 font-bold text-gov-navy' : ''
                        }`}
                      >
                        <td className="py-2 px-4 font-mono">{f.year} Years</td>
                        <td className="py-2 px-4">7.0% p.a.</td>
                        <td className="py-2 px-4 text-right font-mono font-bold">
                          {f.factor.toFixed(3)}
                        </td>
                        <td className="py-2 px-4 text-center">
                          {isFutureMatch && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-gov-teal text-white">
                              Future Life (r=41)
                            </span>
                          )}
                          {isTotalMatch && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-gov-navy text-white">
                              Total Life (D=45)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Action Toolbar */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <Button type="button" variant="outline" size="md" onClick={onPrev} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back to Abstract Estimate
        </Button>

        <Button type="button" variant="primary" size="md" onClick={onNext} rightIcon={<ArrowRight className="w-4 h-4" />}>
          Proceed to Step 7: Salvage Valuation
        </Button>
      </div>
    </div>
  );
};
