import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { PanchanamaDetails, EvidencePhoto, ValuationCase } from '../../../types';
import {
  Camera,
  Users,
  Plus,
  Trash2,
  Calendar,
  FileCheck,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Building,
} from 'lucide-react';

interface EvidencePanchanamaStepProps {
  caseData: ValuationCase;
  onPrev: () => void;
  onNext: () => void;
}

export const EvidencePanchanamaStep: React.FC<EvidencePanchanamaStepProps> = ({
  caseData,
  onPrev,
  onNext,
}) => {
  const [panchanama, setPanchanama] = useState<PanchanamaDetails | null>(null);
  const [photos, setPhotos] = useState<EvidencePhoto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Pancha state
  const [newPanchaName, setNewPanchaName] = useState('');
  const [newPanchaAddress, setNewPanchaAddress] = useState('');

  // Photo modal state
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [photoTitle, setPhotoTitle] = useState('');
  const [photoCategory, setPhotoCategory] = useState<'FRONT_ELEVATION' | 'SUPERSTRUCTURE' | 'ROOF_STRUCTURE' | 'INTERIOR' | 'VERANDAH'>('FRONT_ELEVATION');
  const [photoDesc, setPhotoDesc] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  const fetchEvidence = async () => {
    try {
      setIsLoading(true);
      const res = await api.get<{ panchanama: PanchanamaDetails; photos: EvidencePhoto[] }>(
        `/v1/cases/${caseData.id}/panchanama`
      );
      setPanchanama(res.data.panchanama);
      setPhotos(res.data.photos);
    } catch (err) {
      console.error('Failed to load panchanama evidence:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvidence();
  }, [caseData.id]);

  const handleAddPancha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPanchaName || !panchanama) return;

    const updatedPanchas = [
      ...panchanama.panchas,
      { name: newPanchaName, address: newPanchaAddress || 'Dadulgaon, Tal. Nandura', isSigned: true },
    ];

    try {
      await api.post(`/v1/cases/${caseData.id}/panchanama`, { panchas: updatedPanchas });
      setNewPanchaName('');
      setNewPanchaAddress('');
      fetchEvidence();
    } catch (err) {
      console.error('Failed to add pancha:', err);
    }
  };

  const handleRemovePancha = async (index: number) => {
    if (!panchanama) return;
    const updated = panchanama.panchas.filter((_, i) => i !== index);
    try {
      await api.post(`/v1/cases/${caseData.id}/panchanama`, { panchas: updated });
      fetchEvidence();
    } catch (err) {
      console.error('Failed to remove pancha:', err);
    }
  };

  const handleSaveRemarks = async () => {
    if (!panchanama) return;
    try {
      setIsSaving(true);
      await api.post(`/v1/cases/${caseData.id}/panchanama`, {
        generalRemarks: panchanama.generalRemarks,
        structuralCondition: panchanama.structuralCondition,
        dateOfInspection: panchanama.dateOfInspection,
      });
    } catch (err) {
      console.error('Failed to save remarks:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/v1/cases/${caseData.id}/panchanama/photos`, {
        title: photoTitle,
        category: photoCategory,
        description: photoDesc,
        photoUrl,
      });
      setIsPhotoModalOpen(false);
      setPhotoTitle('');
      setPhotoDesc('');
      setPhotoUrl('');
      fetchEvidence();
    } catch (err) {
      console.error('Failed to add photo:', err);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    try {
      await api.delete(`/v1/cases/panchanama/photos/${photoId}`);
      fetchEvidence();
    } catch (err) {
      console.error('Failed to delete photo:', err);
    }
  };

  if (isLoading || !panchanama) {
    return (
      <div className="py-20 text-center text-slate-400 text-xs animate-pulse">
        Loading panchanama witness records and photo gallery...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <span className="text-xs font-bold text-gov-navy uppercase tracking-wider">
            Step 9 of 10 • Valuation Workflow
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Panchanama Witness Endorsement & Photographic Evidence
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Camera className="w-4 h-4" />}
            onClick={() => setIsPhotoModalOpen(true)}
          >
            Upload Evidence Photo
          </Button>
          <Badge variant="teal">Step 9: Panchanama</Badge>
        </div>
      </div>

      {/* Joint Inspection Meta Card */}
      <Card variant="accent-border" className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-gov-navy" />
          <h3 className="text-sm font-bold text-slate-900 uppercase">
            Joint Site Inspection Details & Officers
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-gov-md bg-slate-50 border border-slate-200 space-y-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase">Date of Inspection</div>
            <input
              type="date"
              value={panchanama.dateOfInspection}
              onChange={(e) => setPanchanama({ ...panchanama, dateOfInspection: e.target.value })}
              className="w-full px-2 py-1 text-xs border rounded bg-white font-mono font-bold text-gov-navy"
            />
          </div>

          <div className="p-3 rounded-gov-md bg-slate-50 border border-slate-200 space-y-1 col-span-2">
            <div className="text-[10px] font-bold text-slate-500 uppercase">Joint Inspection Committee</div>
            <div className="text-slate-800 font-medium space-y-0.5">
              {panchanama.jointInspectionOfficers.map((off, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-gov-teal" />
                  <span>{off}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-1.5 text-xs">
          <label className="font-bold text-slate-700 uppercase">Panchanama General Remarks & Notes</label>
          <textarea
            rows={3}
            value={panchanama.generalRemarks}
            onChange={(e) => setPanchanama({ ...panchanama, generalRemarks: e.target.value })}
            className="w-full px-3 py-2 text-xs border rounded-gov-md focus:ring-2 focus:ring-gov-navy outline-none"
          />
          <div className="flex justify-end">
            <Button size="sm" variant="secondary" onClick={handleSaveRemarks} isLoading={isSaving}>
              Save Remarks
            </Button>
          </div>
        </div>
      </Card>

      {/* Panchas / Witness Endorsement List */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gov-navy" />
            <h3 className="text-xs font-bold text-slate-900 uppercase">
              Independent Panchas (Witnesses of Measurement)
            </h3>
          </div>
          <span className="text-xs font-semibold text-slate-500 font-mono">
            {panchanama.panchas.length} Witnesses Recorded
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {panchanama.panchas.map((pancha, idx) => (
            <div
              key={idx}
              className="p-3 rounded-gov-md bg-white border border-slate-200 flex items-center justify-between text-xs"
            >
              <div className="space-y-0.5">
                <div className="font-bold text-slate-900">{pancha.name}</div>
                <div className="text-slate-500 text-[11px]">{pancha.address}</div>
                <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Physical Presence & Signature Verified</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemovePancha(idx)}
                className="text-slate-400 hover:text-rose-600 p-1"
                title="Remove Pancha"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Add Pancha Form */}
        <form onSubmit={handleAddPancha} className="p-3 bg-slate-50 rounded-gov-md border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <input
            type="text"
            required
            placeholder="Pancha Full Name (e.g. Shri...)"
            value={newPanchaName}
            onChange={(e) => setNewPanchaName(e.target.value)}
            className="px-2.5 py-1.5 border rounded bg-white"
          />
          <input
            type="text"
            placeholder="Village / Address"
            value={newPanchaAddress}
            onChange={(e) => setNewPanchaAddress(e.target.value)}
            className="px-2.5 py-1.5 border rounded bg-white"
          />
          <Button type="submit" size="sm" variant="outline" leftIcon={<Plus className="w-3.5 h-3.5" />}>
            Add Independent Pancha
          </Button>
        </form>
      </Card>

      {/* Structural Photo Evidence Gallery */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-gov-navy" />
            <h3 className="text-xs font-bold text-slate-900 uppercase">
              On-Site Photo Evidence Gallery
            </h3>
          </div>
          <Button size="sm" variant="outline" onClick={() => setIsPhotoModalOpen(true)}>
            + Add Photo
          </Button>
        </div>

        {photos.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="rounded-gov-md border border-slate-200 overflow-hidden bg-white shadow-soft-sm group relative"
              >
                <img
                  src={photo.photoUrl}
                  alt={photo.title}
                  className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="p-3 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <Badge variant="teal">{photo.category}</Badge>
                    <button
                      onClick={() => handleDeletePhoto(photo.id)}
                      className="text-slate-400 hover:text-rose-600"
                      title="Delete photo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="font-bold text-slate-900">{photo.title}</div>
                  <p className="text-[11px] text-slate-500 line-clamp-2">{photo.description}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-10 text-center text-slate-400 text-xs border border-dashed rounded-gov-md">
            No on-site structural photos uploaded yet. Click "+ Upload Evidence Photo" above.
          </div>
        )}
      </Card>

      {/* Add Photo Modal */}
      {isPhotoModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-gov-lg max-w-md w-full p-6 space-y-4 shadow-soft-lg border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Upload Structural Evidence Photo</h3>
            <form onSubmit={handleAddPhoto} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Photo Title / Caption *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Front Elevation & CGI Roof"
                  value={photoTitle}
                  onChange={(e) => setPhotoTitle(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Structural Category *</label>
                <select
                  value={photoCategory}
                  onChange={(e) => setPhotoCategory(e.target.value as any)}
                  className="w-full px-3 py-2 border rounded bg-white"
                >
                  <option value="FRONT_ELEVATION">Front Elevation</option>
                  <option value="SUPERSTRUCTURE">Superstructure BBM Wall</option>
                  <option value="ROOF_STRUCTURE">Teak Roof Truss & CGI Sheets</option>
                  <option value="INTERIOR">Interior Rooms & Flooring</option>
                  <option value="VERANDAH">Verandah & Grill Gate</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Image URL or Reference *</label>
                <input
                  type="url"
                  required
                  placeholder="https://images.unsplash.com/..."
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Inspection Note / Description</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Shows intact teak rafters and 0.63mm CGI roof sheeting in sound condition."
                  value={photoDesc}
                  onChange={(e) => setPhotoDesc(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" size="sm" variant="outline" onClick={() => setIsPhotoModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" variant="primary">
                  Upload Photo
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Action Toolbar */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <Button type="button" variant="outline" size="md" onClick={onPrev} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back to Final Valuation
        </Button>

        <Button type="button" variant="primary" size="md" onClick={onNext} rightIcon={<ArrowRight className="w-4 h-4" />}>
          Proceed to Step 10: Official PDF Report
        </Button>
      </div>
    </div>
  );
};
