import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { X, Calculator, HelpCircle } from 'lucide-react';

export interface CalculationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  itemDescription?: string;
  formulaType?: string;
  inputs: Record<string, number | string>;
  deductions?: Array<{ code: string; description: string; qty: number; formula: string }>;
  formulaText: string;
  result: string | number;
  unit?: string;
  notes?: string;
}

export const CalculationModal: React.FC<CalculationModalProps> = ({
  isOpen,
  onClose,
  title,
  itemDescription,
  formulaType,
  inputs,
  deductions = [],
  formulaText,
  result,
  unit,
  notes,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-gov-lg max-w-lg w-full p-6 space-y-5 shadow-soft-lg border border-slate-200 my-8">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-gov-md bg-gov-navy-50 text-gov-navy">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{title}</h3>
              {itemDescription && (
                <p className="text-xs text-slate-500 truncate max-w-xs">{itemDescription}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inputs Breakdown */}
        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-700 uppercase tracking-wide">Input Parameters</span>
            {formulaType && <Badge variant="teal">{formulaType}</Badge>}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(inputs).map(([key, val]) => (
              <div key={key} className="p-2.5 rounded-gov-md bg-slate-50 border border-slate-200 text-center">
                <div className="text-[10px] text-slate-500 font-semibold uppercase">{key}</div>
                <div className="text-sm font-mono font-bold text-slate-800">{val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Deductions if any */}
        {deductions.length > 0 && (
          <div className="space-y-2 text-xs">
            <span className="font-bold text-rose-700 uppercase tracking-wide">Subtracted Deductions</span>
            <div className="space-y-1.5 border border-rose-100 rounded-gov-md p-2.5 bg-rose-50/40">
              {deductions.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-slate-700">
                  <span className="font-medium">
                    <strong className="text-rose-800">{d.code}:</strong> {d.description}
                  </span>
                  <span className="font-mono font-semibold text-rose-700">
                    - {d.qty} {unit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mathematical Derivation Box */}
        <div className="p-3.5 rounded-gov-md bg-gov-navy-50/70 border border-gov-navy-100 space-y-1.5">
          <div className="text-[10px] font-bold text-gov-navy uppercase tracking-wider flex items-center gap-1">
            <HelpCircle className="w-3 h-3" />
            <span>Mathematical Derivation (Server Authoritative)</span>
          </div>
          <div className="font-mono text-xs text-slate-800 bg-white p-2.5 rounded border border-slate-200 overflow-x-auto">
            {formulaText}
          </div>
        </div>

        {/* Result Header */}
        <div className="p-4 rounded-gov-md bg-slate-900 text-white flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Final Computed Value</span>
          <span className="text-lg font-bold font-mono text-gov-saffron">
            {result} {unit && <span className="text-xs text-slate-300 font-sans">{unit}</span>}
          </span>
        </div>

        {notes && <p className="text-[11px] text-slate-500 italic">{notes}</p>}

        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close Breakdown
          </Button>
        </div>
      </div>
    </div>
  );
};
