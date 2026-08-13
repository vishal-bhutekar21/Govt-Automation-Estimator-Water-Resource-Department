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
    <div className="bg-white border-b border-slate-200 shadow-soft-xs sticky top-16 z-20">
      <div className="max-w-7xl mx-auto px-4 py-3 overflow-x-auto scrollbar-thin">
        <div className="flex items-center justify-between min-w-[860px] gap-2">
          {STEPS.map((step, idx) => {
            const isCurrent = step.number === currentStep;
            const isCompleted = step.number < currentStep;
            const Icon = step.icon;

            return (
              <React.Fragment key={step.number}>
                <button
                  type="button"
                  onClick={() => onSelectStep(step.number)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-gov-md transition-all text-left select-none group ${
                    isCurrent
                      ? 'bg-gov-navy text-white shadow-soft-sm scale-[1.02]'
                      : isCompleted
                      ? 'bg-gov-teal-50/80 text-gov-teal hover:bg-gov-teal-100/80'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-colors ${
                      isCurrent
                        ? 'bg-gov-saffron text-slate-950 shadow-sm'
                        : isCompleted
                        ? 'bg-gov-teal text-white'
                        : 'bg-slate-200 text-slate-600 group-hover:bg-slate-300'
                    }`}
                  >
                    {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : step.number}
                  </div>

                  <div className="leading-tight">
                    <div
                      className={`text-[11px] font-bold truncate max-w-[90px] ${
                        isCurrent ? 'text-white' : isCompleted ? 'text-gov-teal font-semibold' : 'text-slate-700'
                      }`}
                    >
                      {step.shortLabel}
                    </div>
                  </div>
                </button>

                {idx < STEPS.length - 1 && (
                  <div
                    className={`h-[2px] flex-1 min-w-[8px] rounded-full transition-colors ${
                      isCompleted ? 'bg-gov-teal' : 'bg-slate-200'
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
