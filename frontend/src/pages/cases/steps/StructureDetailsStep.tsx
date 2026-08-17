import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { StructureDetails, ValuationCase } from '../../../types';
import { Hammer, Clock, Layers, Ruler, CheckCircle2, ArrowRight, ArrowLeft, Save } from 'lucide-react';

interface StructureDetailsStepProps {
  caseData: ValuationCase;
  structureData?: StructureDetails;
  onSaved: (updatedStructure: StructureDetails) => void;
  onPrev: () => void;
  onNext: () => void;
}

export const StructureDetailsStep: React.FC<StructureDetailsStepProps> = ({
  caseData,
  structureData,
  onSaved,
  onPrev,
  onNext,
}) => {
  const currentYear = new Date().getFullYear();

  const [formData, setFormData] = useState<Partial<StructureDetails>>({
    structureType: structureData?.structureType || 'Residential Dwelling',
    constructionType: structureData?.constructionType || 'B.B.M. Wall + C.G.I. Sheet Roof (Class-B Construction)',
    yearOfConstruction: structureData?.yearOfConstruction || 2012,
    totalUsefulLife: structureData?.totalUsefulLife || 45,
    presentLife: structureData?.presentLife || 4,
    futureLife: structureData?.futureLife || 41,
    roofType: structureData?.roofType || 'C.G.I. Sheet over Country Teak Frame & Jingle Ballies',
    wallType: structureData?.wallType || 'Burnt Brick Masonry in Cement Mortar 1:6',
    floorType: structureData?.floorType || 'Cement Concrete 1:4:8 Flooring with IPS finish',
    numberOfRooms: structureData?.numberOfRooms || 4,
    builtUpArea: structureData?.builtUpArea || 73.01,
    plinthArea: structureData?.plinthArea || 80.50,
    additionalNotes: structureData?.additionalNotes || '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (structureData) {
      setFormData({
        structureType: structureData.structureType,
        constructionType: structureData.constructionType,
        yearOfConstruction: structureData.yearOfConstruction,
        totalUsefulLife: structureData.totalUsefulLife,
        presentLife: structureData.presentLife,
        futureLife: structureData.futureLife,
        roofType: structureData.roofType,
        wallType: structureData.wallType,
        floorType: structureData.floorType,
        numberOfRooms: structureData.numberOfRooms,
        builtUpArea: structureData.builtUpArea,
        plinthArea: structureData.plinthArea,
        additionalNotes: structureData.additionalNotes || '',
      });
    }
  }, [structureData]);

  // Recalculate lifecycle on year or total life changes
  const handleLifecycleChange = (constYear: number, totalLife: number) => {
    const valuationYear = caseData.valuationDate ? new Date(caseData.valuationDate).getFullYear() : 2016;
    const pLife = Math.max(0, valuationYear - constYear);
    const fLife = Math.max(0, totalLife - pLife);

    setFormData((prev) => ({
      ...prev,
      yearOfConstruction: constYear,
      totalUsefulLife: totalLife,
      presentLife: pLife,
      futureLife: fLife,
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSaveSuccess(false);

    if (name === 'yearOfConstruction') {
      const year = parseInt(value, 10) || currentYear;
      handleLifecycleChange(year, formData.totalUsefulLife || 45);
    } else if (name === 'totalUsefulLife') {
      const total = parseInt(value, 10) || 45;
      handleLifecycleChange(formData.yearOfConstruction || 2012, total);
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async (shouldProceed = false) => {
    if ((formData.yearOfConstruction || 0) > currentYear) {
      setError(`Year of construction cannot be in the future (>${currentYear}).`);
      return;
    }
    if ((formData.futureLife || 0) < 0) {
      setError('Present building life cannot exceed total useful life.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const res = await api.put<{ structure: StructureDetails }>(`/v1/cases/${caseData.id}/structure`, formData);
      onSaved(res.data.structure);
      setSaveSuccess(true);
      if (shouldProceed) {
        onNext();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save structure specifications.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <span className="text-xs font-bold text-gov-navy uppercase tracking-wider">
            Step 3 of 10 • Valuation Workflow
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Structure & Life Specifications
          </h2>
        </div>
        <Badge variant="teal">Step 3: Building Specifications</Badge>
      </div>

      {error && (
        <div className="p-3 rounded-gov-md bg-rose-50 border border-rose-200 text-rose-800 text-xs">
          <strong>Validation Error:</strong> {error}
        </div>
      )}

      {saveSuccess && (
        <div className="p-3 rounded-gov-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Structure specifications saved. Depreciation lifecycle parameters updated.</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Classification & Life Card */}
        <Card variant="default" className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Clock className="w-4 h-4 text-gov-navy" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              1. Structure Classification & Life
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 uppercase">Structure Purpose</label>
              <select
                name="structureType"
                value={formData.structureType}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-gov-md border border-slate-300 focus:ring-2 focus:ring-gov-navy outline-none bg-white"
              >
                <option value="Residential Dwelling">Residential Dwelling</option>
                <option value="Commercial / Shop">Commercial / Shop</option>
                <option value="Cattle Shed / Agricultural Store">Cattle Shed / Agricultural Store</option>
                <option value="Community / Religious Structure">Community / Religious Structure</option>
                <option value="Compound Wall & Open Shed">Compound Wall & Open Shed</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 uppercase">Construction Classification *</label>
              <input
                type="text"
                name="constructionType"
                value={formData.constructionType}
                onChange={handleChange}
                placeholder="e.g. B.B.M. Wall + C.G.I. Sheet Roof (Class-B)"
                className="w-full px-3 py-2 rounded-gov-md border border-slate-300 focus:ring-2 focus:ring-gov-navy outline-none"
              />
            </div>

            {/* Lifecycle Matrix */}
            <div className="p-3.5 rounded-gov-md bg-gov-navy-50/50 border border-gov-navy-100 space-y-3">
              <div className="text-[11px] font-bold text-gov-navy uppercase tracking-wider">
                Depreciation Life Parameters
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">Year of Construction</label>
                  <input
                    type="number"
                    name="yearOfConstruction"
                    value={formData.yearOfConstruction}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-gov-md border border-slate-300 font-mono font-bold text-slate-800 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">Total Useful Life (Years)</label>
                  <input
                    type="number"
                    name="totalUsefulLife"
                    value={formData.totalUsefulLife}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-gov-md border border-slate-300 font-mono font-bold text-slate-800 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gov-navy-100">
                <div className="p-2.5 rounded-gov-md bg-white border border-slate-200 text-center">
                  <div className="text-xs text-slate-500 font-medium">Present Life</div>
                  <div className="text-lg font-bold text-gov-navy font-mono">{formData.presentLife} Years</div>
                </div>
                <div className="p-2.5 rounded-gov-md bg-white border border-slate-200 text-center">
                  <div className="text-xs text-slate-500 font-medium">Future Life</div>
                  <div className="text-lg font-bold text-gov-teal font-mono">{formData.futureLife} Years</div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Materials & Dimensional Areas Card */}
        <Card variant="default" className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Ruler className="w-4 h-4 text-gov-teal" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              2. Dimensions & Materials
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase">Plinth Area (Sqm)</label>
                <input
                  type="number"
                  step="0.01"
                  name="plinthArea"
                  value={formData.plinthArea}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-gov-md border border-slate-300 font-mono font-bold focus:ring-2 focus:ring-gov-navy outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase">Built-up Area (Sqm)</label>
                <input
                  type="number"
                  step="0.01"
                  name="builtUpArea"
                  value={formData.builtUpArea}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-gov-md border border-slate-300 font-mono font-bold focus:ring-2 focus:ring-gov-navy outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase">No. of Rooms</label>
                <input
                  type="number"
                  name="numberOfRooms"
                  value={formData.numberOfRooms}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-gov-md border border-slate-300 font-mono focus:ring-2 focus:ring-gov-navy outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 uppercase">Roof Specification</label>
              <input
                type="text"
                name="roofType"
                value={formData.roofType}
                onChange={handleChange}
                placeholder="e.g. CGI Sheet over Country Teak Frame"
                className="w-full px-3 py-2 rounded-gov-md border border-slate-300 focus:ring-2 focus:ring-gov-navy outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 uppercase">Wall Specification</label>
              <input
                type="text"
                name="wallType"
                value={formData.wallType}
                onChange={handleChange}
                placeholder="e.g. Burnt Brick Masonry in CM 1:6"
                className="w-full px-3 py-2 rounded-gov-md border border-slate-300 focus:ring-2 focus:ring-gov-navy outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 uppercase">Floor Specification</label>
              <input
                type="text"
                name="floorType"
                value={formData.floorType}
                onChange={handleChange}
                placeholder="e.g. CC 1:4:8 Flooring with IPS finish"
                className="w-full px-3 py-2 rounded-gov-md border border-slate-300 focus:ring-2 focus:ring-gov-navy outline-none"
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Action Toolbar */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={onPrev}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Back to Property
        </Button>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={() => handleSave(false)}
            isLoading={isSaving}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Save Draft
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => handleSave(true)}
            isLoading={isSaving}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Save & Continue to Measurements
          </Button>
        </div>
      </div>
    </div>
  );
};
