import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { CaseStepper } from '../../components/layout/CaseStepper';
import { PropertyDetailsStep } from './steps/PropertyDetailsStep';
import { StructureDetailsStep } from './steps/StructureDetailsStep';
import { MeasurementStep } from './steps/MeasurementStep';
import { AbstractEstimateStep } from './steps/AbstractEstimateStep';
import { DepreciationStep } from './steps/DepreciationStep';
import { SalvageStep } from './steps/SalvageStep';
import { FinalValuationStep } from './steps/FinalValuationStep';
import { EvidencePanchanamaStep } from './steps/EvidencePanchanamaStep';
import { PdfReportStep } from './steps/PdfReportStep';
import { ValuationCase, PropertyDetails, StructureDetails } from '../../types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Building2, Calendar, ArrowLeft, AlertCircle, Home, User } from 'lucide-react';

export const CaseWizardView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState<number>(2); // Default to Property Details
  const [caseData, setCaseData] = useState<ValuationCase | null>(null);
  const [propertyData, setPropertyData] = useState<PropertyDetails | undefined>(undefined);
  const [structureData, setStructureData] = useState<StructureDetails | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCaseDetails = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const res = await api.get<{
        case: ValuationCase;
        property: PropertyDetails;
        structure: StructureDetails;
      }>(`/v1/cases/${id}`);

      setCaseData(res.data.case);
      setPropertyData(res.data.property);
      setStructureData(res.data.structure);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load case details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCaseDetails();
  }, [id]);

  if (isLoading) {
    return (
      <div className="py-20 text-center text-slate-500 animate-pulse text-sm">
        Loading valuation case and estimation sheets...
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <Card className="p-8 text-center space-y-4 max-w-lg mx-auto mt-10">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold text-slate-800">Case Record Not Found</h3>
        <p className="text-xs text-slate-500">{error || 'The requested valuation case could not be located.'}</p>
        <Button variant="primary" size="md" onClick={() => navigate('/cases')}>
          Return to Cases Registry
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 10-Step Workflow Stepper */}
      <CaseStepper
        currentStep={currentStep}
        caseId={caseData.id}
        onSelectStep={(step) => setCurrentStep(step)}
      />

      {/* Case Meta Bar */}
      <div className="bg-white border border-slate-200 rounded-gov-md px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs shadow-soft-xs">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/cases')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            className="text-slate-600 hover:text-slate-900 px-2"
          >
            Cases
          </Button>
          <div className="h-4 w-[1px] bg-slate-200" />
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Case:</span>
            <strong className="font-mono text-gov-navy font-bold">{caseData.caseNumber}</strong>
          </div>
          <div className="h-4 w-[1px] bg-slate-200" />
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-gov-teal" />
            <span className="text-slate-400 font-medium">Owner:</span>
            <strong className="text-slate-800 font-bold">{propertyData?.ownerName || 'Not Set'}</strong>
          </div>
          <div className="h-4 w-[1px] bg-slate-200" />
          <div className="flex items-center gap-1.5">
            <Home className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 font-medium">House:</span>
            <strong className="text-slate-800 font-semibold">{propertyData?.houseNumber}, {propertyData?.village}</strong>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Calendar className="w-3.5 h-3.5 text-gov-teal" />
            <span>Valuation Date: <strong>{caseData.valuationDate}</strong></span>
          </div>
          <Badge variant="teal">{caseData.status}</Badge>
        </div>
      </div>

      {/* Step View Canvas */}
      <div className="max-w-6xl mx-auto w-full">
        {currentStep === 1 && (
          <Card className="space-y-4">
            <h3 className="text-base font-bold text-slate-900">Step 1: Case Identification</h3>
            <p className="text-xs text-slate-600">Case was initialized with Case No. <strong>{caseData.caseNumber}</strong>.</p>
            <Button variant="primary" size="sm" onClick={() => setCurrentStep(2)}>
              Proceed to Step 2: Property Particulars
            </Button>
          </Card>
        )}

        {currentStep === 2 && (
          <PropertyDetailsStep
            caseData={caseData}
            propertyData={propertyData}
            onSaved={(updatedProp) => setPropertyData(updatedProp)}
            onNext={() => setCurrentStep(3)}
          />
        )}

        {currentStep === 3 && (
          <StructureDetailsStep
            caseData={caseData}
            structureData={structureData}
            onSaved={(updatedStruct) => setStructureData(updatedStruct)}
            onPrev={() => setCurrentStep(2)}
            onNext={() => setCurrentStep(4)}
          />
        )}

        {currentStep === 4 && (
          <MeasurementStep
            caseData={caseData}
            onPrev={() => setCurrentStep(3)}
            onNext={() => setCurrentStep(5)}
          />
        )}

        {currentStep === 5 && (
          <AbstractEstimateStep
            caseData={caseData}
            onPrev={() => setCurrentStep(4)}
            onNext={() => setCurrentStep(6)}
          />
        )}

        {currentStep === 6 && (
          <DepreciationStep
            caseData={caseData}
            onPrev={() => setCurrentStep(5)}
            onNext={() => setCurrentStep(7)}
          />
        )}

        {currentStep === 7 && (
          <SalvageStep
            caseData={caseData}
            onPrev={() => setCurrentStep(6)}
            onNext={() => setCurrentStep(8)}
          />
        )}

        {currentStep === 8 && (
          <FinalValuationStep
            caseData={caseData}
            onPrev={() => setCurrentStep(7)}
            onNext={() => setCurrentStep(9)}
          />
        )}

        {currentStep === 9 && (
          <EvidencePanchanamaStep
            caseData={caseData}
            onPrev={() => setCurrentStep(8)}
            onNext={() => setCurrentStep(10)}
          />
        )}

        {currentStep === 10 && (
          <PdfReportStep
            caseData={caseData}
            propertyData={propertyData}
            structureData={structureData}
            onPrev={() => setCurrentStep(9)}
          />
        )}
      </div>
    </div>
  );
};
