import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Project } from '../../types';
import { X, Plus, Building2, User, FileText } from 'lucide-react';

interface CaseCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (caseId: string) => void;
}

export const CaseCreationModal: React.FC<CaseCreationModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string>('');
  const [caseNumber, setCaseNumber] = useState<string>('');
  const [ownerName, setOwnerName] = useState<string>('');
  const [houseNumber, setHouseNumber] = useState<string>('');
  const [village, setVillage] = useState<string>('Dadulgaon');
  const [taluka, setTaluka] = useState<string>('Nandura');
  const [district, setDistrict] = useState<string>('Buldhana');
  const [laCaseNumber, setLaCaseNumber] = useState<string>('');
  const [surveyNumber, setSurveyNumber] = useState<string>('');
  const [dateOfInspection, setDateOfInspection] = useState<string>(new Date().toISOString().split('T')[0]);
  const [valuationDate, setValuationDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      api.get<{ projects: Project[] }>('/v1/projects').then((res) => {
        setProjects(res.data.projects);
        if (res.data.projects.length > 0) {
          setProjectId(res.data.projects[0].id);
        }
      });
      // Generate a default case number
      const randomNo = Math.floor(100 + Math.random() * 900);
      setCaseNumber(`CASE/2008-09/${randomNo}`);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await api.post('/v1/cases', {
        projectId,
        caseNumber,
        ownerName,
        houseNumber,
        village,
        taluka,
        district,
        laCaseNumber,
        surveyNumber,
        dateOfInspection,
        valuationDate,
      });

      onSuccess(res.data.case.id);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to initialize valuation case');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-gov-lg max-w-2xl w-full p-6 space-y-6 shadow-soft-lg border border-slate-200 my-8">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-gov-md bg-gov-navy-50 text-gov-navy">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Step 1: Initialize New Valuation Case</h3>
              <p className="text-xs text-slate-500">Creates case record and prepares Property & Structure metadata sheets</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-gov-md bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Project & Case Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 uppercase">Associated Project *</label>
              <select
                required
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 rounded-gov-md border border-slate-300 focus:ring-2 focus:ring-gov-navy outline-none bg-white"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.projectName} ({p.projectCode})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 uppercase">Case Number *</label>
              <input
                type="text"
                required
                value={caseNumber}
                onChange={(e) => setCaseNumber(e.target.value)}
                placeholder="e.g. CASE/2008-09/165"
                className="w-full px-3 py-2 rounded-gov-md border border-slate-300 font-mono focus:ring-2 focus:ring-gov-navy outline-none"
              />
            </div>
          </div>

          {/* Owner Details */}
          <div className="p-3.5 rounded-gov-md bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <User className="w-4 h-4 text-gov-navy" />
              Owner & Property Information
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-slate-600">Owner Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mohan Vishwanath Gai"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-gov-md border border-slate-300 focus:ring-2 focus:ring-gov-navy outline-none bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-600">House Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 165"
                  value={houseNumber}
                  onChange={(e) => setHouseNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-gov-md border border-slate-300 focus:ring-2 focus:ring-gov-navy outline-none bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-slate-600">Village</label>
                <input
                  type="text"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  className="w-full px-3 py-2 rounded-gov-md border border-slate-300 focus:ring-2 focus:ring-gov-navy outline-none bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-600">Taluka</label>
                <input
                  type="text"
                  value={taluka}
                  onChange={(e) => setTaluka(e.target.value)}
                  className="w-full px-3 py-2 rounded-gov-md border border-slate-300 focus:ring-2 focus:ring-gov-navy outline-none bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-600">District</label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full px-3 py-2 rounded-gov-md border border-slate-300 focus:ring-2 focus:ring-gov-navy outline-none bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-slate-600">L.A. Case Number</label>
                <input
                  type="text"
                  placeholder="e.g. 15/2008-09"
                  value={laCaseNumber}
                  onChange={(e) => setLaCaseNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-gov-md border border-slate-300 focus:ring-2 focus:ring-gov-navy outline-none bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-600">Survey / Gat Number</label>
                <input
                  type="text"
                  placeholder="e.g. Gat No. 42/1"
                  value={surveyNumber}
                  onChange={(e) => setSurveyNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-gov-md border border-slate-300 focus:ring-2 focus:ring-gov-navy outline-none bg-white"
                />
              </div>
            </div>
          </div>

          {/* Inspection Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 uppercase">Date of Field Inspection</label>
              <input
                type="date"
                value={dateOfInspection}
                onChange={(e) => setDateOfInspection(e.target.value)}
                className="w-full px-3 py-2 rounded-gov-md border border-slate-300 focus:ring-2 focus:ring-gov-navy outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700 uppercase">Valuation Baseline Date</label>
              <input
                type="date"
                value={valuationDate}
                onChange={(e) => setValuationDate(e.target.value)}
                className="w-full px-3 py-2 rounded-gov-md border border-slate-300 focus:ring-2 focus:ring-gov-navy outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" size="md" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" isLoading={isLoading}>
              Initialize Case & Proceed
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
