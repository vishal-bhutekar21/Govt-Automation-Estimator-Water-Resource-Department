import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { PropertyDetails, ValuationCase } from '../../../types';
import { User, Phone, MapPin, FileText, CheckCircle2, ArrowRight, Save } from 'lucide-react';

interface PropertyDetailsStepProps {
  caseData: ValuationCase;
  propertyData?: PropertyDetails;
  onSaved: (updatedProperty: PropertyDetails) => void;
  onNext: () => void;
}

export const PropertyDetailsStep: React.FC<PropertyDetailsStepProps> = ({
  caseData,
  propertyData,
  onSaved,
  onNext,
}) => {
  const [formData, setFormData] = useState<Partial<PropertyDetails>>({
    ownerName: propertyData?.ownerName || '',
    contactNumber: propertyData?.contactNumber || '',
    address: propertyData?.address || '',
    village: propertyData?.village || '',
    taluka: propertyData?.taluka || '',
    district: propertyData?.district || '',
    laCaseNumber: propertyData?.laCaseNumber || '',
    houseNumber: propertyData?.houseNumber || '',
    surveyNumber: propertyData?.surveyNumber || '',
    submergenceType: propertyData?.submergenceType || 'Full Submergence (Reservoir Area)',
    additionalNotes: propertyData?.additionalNotes || '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (propertyData) {
      setFormData({
        ownerName: propertyData.ownerName || '',
        contactNumber: propertyData.contactNumber || '',
        address: propertyData.address || '',
        village: propertyData.village || '',
        taluka: propertyData.taluka || '',
        district: propertyData.district || '',
        laCaseNumber: propertyData.laCaseNumber || '',
        houseNumber: propertyData.houseNumber || '',
        surveyNumber: propertyData.surveyNumber || '',
        submergenceType: propertyData.submergenceType || 'Full Submergence (Reservoir Area)',
        additionalNotes: propertyData.additionalNotes || '',
      });
    }
  }, [propertyData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setSaveSuccess(false);
  };

  const handleSave = async (shouldProceed = false) => {
    if (!formData.ownerName || !formData.houseNumber) {
      setError('Owner Name and House Number are required fields.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const res = await api.put<{ property: PropertyDetails }>(`/v1/cases/${caseData.id}/property`, formData);
      onSaved(res.data.property);
      setSaveSuccess(true);
      if (shouldProceed) {
        onNext();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save property particulars.');
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
            Step 2 of 10 • Valuation Workflow
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Property & Ownership Information
          </h2>
        </div>
        <Badge variant="teal">Step 2: Property Particulars</Badge>
      </div>

      {error && (
        <div className="p-3 rounded-gov-md bg-rose-50 border border-rose-200 text-rose-800 text-xs">
          <strong>Validation Error:</strong> {error}
        </div>
      )}

      {saveSuccess && (
        <div className="p-3 rounded-gov-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Property particulars successfully saved and synced with official valuation file.</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Owner Information Card */}
        <Card variant="default" className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <User className="w-4 h-4 text-gov-navy" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              1. Owner Identification
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 uppercase">Owner Full Name *</label>
              <input
                type="text"
                name="ownerName"
                value={formData.ownerName}
                onChange={handleChange}
                placeholder="e.g. Mohan Vishwanath Gai"
                className="w-full px-3 py-2 rounded-gov-md border border-slate-300 focus:ring-2 focus:ring-gov-navy outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 uppercase">Contact Mobile Number</label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleChange}
                  placeholder="+91 98223 XXXXX"
                  className="w-full pl-8 pr-3 py-2 rounded-gov-md border border-slate-300 focus:ring-2 focus:ring-gov-navy outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 uppercase">Residential Address</label>
              <textarea
                rows={2}
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Full address of the affected property..."
                className="w-full px-3 py-2 rounded-gov-md border border-slate-300 focus:ring-2 focus:ring-gov-navy outline-none"
              />
            </div>
          </div>
        </Card>

        {/* Location & Legal Card */}
        <Card variant="default" className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <MapPin className="w-4 h-4 text-gov-teal" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              2. Revenue & Acquisition Details
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase">House Number *</label>
                <input
                  type="text"
                  name="houseNumber"
                  value={formData.houseNumber}
                  onChange={handleChange}
                  placeholder="e.g. 165"
                  className="w-full px-3 py-2 rounded-gov-md border border-slate-300 font-mono focus:ring-2 focus:ring-gov-navy outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase">L.A. Case Number</label>
                <input
                  type="text"
                  name="laCaseNumber"
                  value={formData.laCaseNumber}
                  onChange={handleChange}
                  placeholder="e.g. 15/2008-09"
                  className="w-full px-3 py-2 rounded-gov-md border border-slate-300 font-mono focus:ring-2 focus:ring-gov-navy outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase">Village</label>
                <input
                  type="text"
                  name="village"
                  value={formData.village}
                  onChange={handleChange}
                  className="w-full px-2.5 py-2 rounded-gov-md border border-slate-300 focus:ring-2 focus:ring-gov-navy outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase">Taluka</label>
                <input
                  type="text"
                  name="taluka"
                  value={formData.taluka}
                  onChange={handleChange}
                  className="w-full px-2.5 py-2 rounded-gov-md border border-slate-300 focus:ring-2 focus:ring-gov-navy outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase">District</label>
                <input
                  type="text"
                  name="district"
                  value={formData.district}
                  onChange={handleChange}
                  className="w-full px-2.5 py-2 rounded-gov-md border border-slate-300 focus:ring-2 focus:ring-gov-navy outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 uppercase">Survey / Gat Number</label>
              <input
                type="text"
                name="surveyNumber"
                value={formData.surveyNumber}
                onChange={handleChange}
                placeholder="e.g. Gat No. 42/1"
                className="w-full px-3 py-2 rounded-gov-md border border-slate-300 focus:ring-2 focus:ring-gov-navy outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 uppercase">Submergence Zone Classification</label>
              <select
                name="submergenceType"
                value={formData.submergenceType}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-gov-md border border-slate-300 focus:ring-2 focus:ring-gov-navy outline-none bg-white"
              >
                <option value="Full Submergence (Reservoir Area)">Full Submergence (Reservoir Area)</option>
                <option value="Partial Submergence (Buffer Margin)">Partial Submergence (Buffer Margin)</option>
                <option value="Canal Alignment Encroachment">Canal Alignment Encroachment</option>
                <option value="Backwater Flood Margin">Backwater Flood Margin</option>
              </select>
            </div>
          </div>
        </Card>
      </div>

      {/* Action Toolbar */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <div className="text-xs text-slate-500">
          Last updated: {propertyData?.updatedAt ? new Date(propertyData.updatedAt).toLocaleString() : 'Never'}
        </div>
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
            Save & Continue to Structure
          </Button>
        </div>
      </div>
    </div>
  );
};
