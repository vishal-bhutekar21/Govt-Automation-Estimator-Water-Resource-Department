import React from 'react';
import {
  FileText,
  Home,
  Layers,
  Ruler,
  Calculator,
  Percent,
  Recycle,
  Award,
  Users,
  FileCheck,
  Check,
} from 'lucide-react';

interface Step {
  number: number;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STEPS: Step[] = [
  { number: 1, label: 'Case Setup', shortLabel: 'Setup', icon: FileText },
  { number: 2, label: 'Property Info', shortLabel: 'Property', icon: Home },
  { number: 3, label: 'Structure Specs', shortLabel: 'Structure', icon: Layers },
  { number: 4, label: 'Measurements', shortLabel: 'Dimensions', icon: Ruler },
  { number: 5, label: 'Abstract Estimate', shortLabel: 'Abstract', icon: Calculator },
  { number: 6, label: 'Depreciation', shortLabel: 'Depreciation', icon: Percent },
  { number: 7, label: 'Salvage Valuation', shortLabel: 'Salvage', icon: Recycle },
  { number: 8, label: 'Final Valuation', shortLabel: 'Final Cost', icon: Award },
  { number: 9, label: 'Panchanama', shortLabel: 'Panchanama', icon: Users },
  { number: 10, label: 'PDF Report', shortLabel: 'Report', icon: FileCheck },
];

interface CaseStepperProps {
  currentStep: number;
  caseId: string;
  onSelectStep: (stepNumber: number) => void;
}

export const CaseStepper: React.FC<CaseStepperProps> = ({
  currentStep,
  onSelectStep,
}) => {
  return (
    <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border border-slate-200 shadow-soft-xs rounded-xl py-2 px-3 sm:px-4 w-full">
      <div className="overflow-x-auto scrollbar-thin py-0.5">
        <div className="flex items-center justify-between min-w-[780px] gap-1.5">
          {STEPS.map((step, idx) => {
            const isCurrent = step.number === currentStep;
            const isCompleted = step.number < currentStep;

            return (
              <React.Fragment key={step.number}>
                <button
                  type="button"
                  onClick={() => onSelectStep(step.number)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all text-left select-none shrink-0 ${
                    isCurrent
                      ? 'bg-slate-900 text-white shadow-soft-xs font-bold'
                      : isCompleted
                      ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-semibold'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors ${
                      isCurrent
                        ? 'bg-amber-400 text-slate-950 font-black'
                        : isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isCompleted ? <Check className="w-3 h-3 stroke-[3]" /> : step.number}
                  </div>

                  <span
                    className={`text-[11px] whitespace-nowrap ${
                      isCurrent ? 'text-white font-bold' : isCompleted ? 'text-emerald-900 font-semibold' : 'text-slate-600'
                    }`}
                  >
                    {step.shortLabel}
                  </span>
                </button>

                {idx < STEPS.length - 1 && (
                  <div
                    className={`h-[1.5px] flex-1 min-w-[6px] rounded-full transition-colors ${
                      isCompleted ? 'bg-emerald-500' : 'bg-slate-200'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

