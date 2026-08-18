import React, { useState } from 'react';
import api from '../../../services/api';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { GovtEmblem } from '../../../components/common/GovtEmblem';
import { ValuationCase, PropertyDetails, StructureDetails } from '../../../types';
import {
  FileText,
  Download,
  Printer,
  CheckCircle2,
  ArrowLeft,
  Stamp,
  Building,
  Award,
  Share2,
  Edit3,
  Copy,
  Check,
  CheckCheck,
  FileSpreadsheet,
} from 'lucide-react';

interface PdfReportStepProps {
  caseData: ValuationCase;
  propertyData?: PropertyDetails;
  structureData?: StructureDetails;
  onPrev: () => void;
}

export const PdfReportStep: React.FC<PdfReportStepProps> = ({
  caseData,
  propertyData,
  structureData,
  onPrev,
}) => {
  const [activeTab, setActiveTab] = useState<'cover' | 'fc' | 'abstract' | 'recap'>('cover');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Editable Report Metadata State
  const [reportTitle, setReportTitle] = useState('VALUATION CERTIFICATE & ABSTRACT REPORT');
  const [deptHeader, setDeptHeader] = useState(
    'JIGAON MAJOR IRRIGATION PROJECT SUB-DIVISION NO. 2, NANDURA'
  );
  const [customRemarks, setCustomRemarks] = useState(
    `This is to certify that the residential building structure belonging to Shri/Smt. ${propertyData?.ownerName || 'Mohan Vishwanath Gai'}, situated at Village ${propertyData?.village || 'Dadulgaon'}, bearing House No. ${propertyData?.houseNumber || '165'} (Survey/Gat No. ${propertyData?.surveyNumber || '42/1'}), affected due to full submergence under Jigaon Major Irrigation Project, has been inspected and measured on site in accordance with PWD Common Schedule of Rates (CSR 2014-15) and standard compound interest Year's Purchase depreciation principles.`
  );
  const [prepOfficer, setPrepOfficer] = useState(caseData.preparedBy || 'Sectional Engineer (S.E.)');
  const [checkOfficer, setCheckOfficer] = useState(caseData.checkedBy || 'Assistant Engineer (A.E. Gr-I)');
  const [apprOfficer, setApprOfficer] = useState(caseData.approvedBy || 'Executive Engineer (E.E.)');

  const shareableUrl = `${window.location.origin}/cases/${caseData.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleExportJson = () => {
    const summaryData = {
      caseNumber: caseData.caseNumber,
      ownerName: propertyData?.ownerName,
      houseNumber: propertyData?.houseNumber,
      village: propertyData?.village,
      valuationDate: caseData.valuationDate,
      primaryEstimateTotal: 261669.00,
      primaryDepreciatedValue: 257592.00,
      salvageEstimateTotal: 192040.00,
      salvageDepreciatedValue: 189048.00,
      salvageAdjustment10Pct: 18904.80,
      finalValuationAmount: 238687.20,
      amountInWords: 'Rupees Two Lakh Thirty-Eight Thousand Six Hundred Eighty-Seven and Paise Twenty Only',
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(summaryData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `Valuation_Summary_${propertyData?.houseNumber || '165'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleDownloadPdf = async () => {
    try {
      setIsDownloading(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `http://localhost:5000/api/v1/cases/${caseData.id}/report/download`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Valuation_Report_${propertyData?.houseNumber || '165'}_${propertyData?.village || 'Dadulgaon'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download PDF:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <span className="text-xs font-bold text-gov-navy uppercase tracking-wider">
            Step 10 of 10 • Valuation Workflow
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Official Multi-Page Valuation Report & Government PDF Certificate
          </h2>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant={isEditMode ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setIsEditMode(!isEditMode)}
            leftIcon={<Edit3 className="w-3.5 h-3.5" />}
          >
            {isEditMode ? 'Save & Lock Report' : 'Edit Report Notes'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsShareModalOpen(true)}
            leftIcon={<Share2 className="w-3.5 h-3.5" />}
          >
            Share & Export
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleDownloadPdf}
            isLoading={isDownloading}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Download Official PDF
          </Button>
        </div>
      </div>

      {/* Edit Mode Notification Banner */}
      {isEditMode && (
        <div className="p-4 rounded-gov-md bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between shadow-soft-xs">
          <div className="flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>Report Customization Mode Active:</strong> You can edit the certificate title, remarks, and signatories directly below. Click <strong>"Save & Lock Report"</strong> when finished.
            </span>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setIsEditMode(false)}>
            Lock Changes
          </Button>
        </div>
      )}

      {/* Report Hero Card */}
      <Card
        variant="accent-border"
        className="p-6 bg-gradient-to-br from-gov-navy to-slate-900 text-white shadow-soft-lg flex flex-col md:flex-row items-center justify-between gap-6"
      >
        <div className="space-y-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <Stamp className="w-5 h-5 text-gov-saffron" />
            <span className="text-xs font-bold text-gov-saffron uppercase tracking-widest">
              State Government Approved Format
            </span>
          </div>
          <h3 className="text-xl font-bold text-white">
            Valuation Report for House No. {propertyData?.houseNumber || '165'} ({propertyData?.ownerName})
          </h3>
          <p className="text-xs text-gov-navy-200">
            Jigaon Major Irrigation Project • PWD CSR 2014-15 Standard
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="md"
            onClick={() => window.print()}
            leftIcon={<Printer className="w-4 h-4" />}
            className="text-white border-white/30 hover:bg-white/10"
          >
            Print
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleDownloadPdf}
            isLoading={isDownloading}
            leftIcon={<Download className="w-4 h-4" />}
            className="bg-gov-saffron text-slate-950 hover:bg-gov-saffron-600 font-bold shadow-soft-sm"
          >
            Download PDF
          </Button>
        </div>
      </Card>

      {/* Page Tabs */}
      <div className="flex border-b border-slate-200 gap-2 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('cover')}
          className={`py-2.5 px-4 rounded-t-gov-md border-t border-x transition-colors ${
            activeTab === 'cover'
              ? 'bg-white text-gov-navy border-slate-200 -mb-[1px] shadow-soft-xs'
              : 'text-slate-500 hover:text-slate-900 border-transparent'
          }`}
        >
          Page 1: Official Certificate
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('fc')}
          className={`py-2.5 px-4 rounded-t-gov-md border-t border-x transition-colors ${
            activeTab === 'fc'
              ? 'bg-white text-gov-navy border-slate-200 -mb-[1px] shadow-soft-xs'
              : 'text-slate-500 hover:text-slate-900 border-transparent'
          }`}
        >
          Page 2: Property & Structure Specs (FC)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('abstract')}
          className={`py-2.5 px-4 rounded-t-gov-md border-t border-x transition-colors ${
            activeTab === 'abstract'
              ? 'bg-white text-gov-navy border-slate-200 -mb-[1px] shadow-soft-xs'
              : 'text-slate-500 hover:text-slate-900 border-transparent'
          }`}
        >
          Page 3: Abstract Estimate (AB)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('recap')}
          className={`py-2.5 px-4 rounded-t-gov-md border-t border-x transition-colors ${
            activeTab === 'recap'
              ? 'bg-white text-gov-navy border-slate-200 -mb-[1px] shadow-soft-xs'
              : 'text-slate-500 hover:text-slate-900 border-transparent'
          }`}
        >
          Page 4: Recapitulation & Panchanama (Final RA)
        </button>
      </div>

      {/* Interactive Sheet Preview Canvas */}
      <Card className="p-8 space-y-6 max-w-4xl mx-auto bg-white border-2 border-slate-200 shadow-soft-md min-h-[520px]">
        {/* Government Header */}
        <div className="text-center space-y-2 border-b-2 border-gov-navy pb-5">
          <div className="flex justify-center mb-1">
            <GovtEmblem size="md" variant="color" />
          </div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Government of Maharashtra • Water Resources Department
          </div>

          {isEditMode ? (
            <input
              type="text"
              value={deptHeader}
              onChange={(e) => setDeptHeader(e.target.value)}
              className="w-full text-center text-sm font-bold border rounded px-2 py-1 text-gov-navy bg-amber-50/50"
            />
          ) : (
            <h2 className="text-lg font-extrabold text-gov-navy uppercase tracking-wide">
              {deptHeader}
            </h2>
          )}

          {isEditMode ? (
            <input
              type="text"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              className="w-full text-center text-xs font-bold border rounded px-2 py-1 text-gov-saffron bg-amber-50/50"
            />
          ) : (
            <div className="text-xs font-bold text-gov-saffron uppercase">
              {reportTitle}
            </div>
          )}
        </div>

        {/* Tab 1: Cover Sheet */}
        {activeTab === 'cover' && (
          <div className="space-y-6 text-xs text-slate-800">
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-gov-md border border-slate-200">
              <div>
                <span className="text-slate-500 font-bold">Land Acquisition Case No:</span>
                <strong className="block text-slate-900 text-sm font-mono">{propertyData?.laCaseNumber}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-bold">House / Structure No:</span>
                <strong className="block text-slate-900 text-sm font-mono">{propertyData?.houseNumber}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-bold">Owner Name:</span>
                <strong className="block text-slate-900 text-sm">{propertyData?.ownerName}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-bold">Location:</span>
                <strong className="block text-slate-900 text-sm">Village {propertyData?.village}, Taluka {propertyData?.taluka}</strong>
              </div>
            </div>

            {/* Certificate Body Paragraph */}
            <div className="p-4 bg-slate-50/70 rounded-gov-md border border-slate-200 space-y-2">
              <span className="text-[10px] font-bold text-gov-navy uppercase tracking-wider">
                Official Certification Text:
              </span>
              {isEditMode ? (
                <textarea
                  rows={4}
                  value={customRemarks}
                  onChange={(e) => setCustomRemarks(e.target.value)}
                  className="w-full p-2 border rounded bg-amber-50/50 text-xs text-slate-800 leading-relaxed font-sans"
                />
              ) : (
                <p className="text-justify text-slate-700 leading-relaxed">
                  {customRemarks}
                </p>
              )}
            </div>

            {/* Financial Highlight */}
            <div className="p-6 rounded-gov-md bg-gov-navy text-white text-center space-y-2 shadow-soft-md">
              <div className="text-xs font-bold text-gov-saffron uppercase tracking-wider">
                Sanctioned Net Payable Compensation Valuation
              </div>
              <div className="text-3xl font-extrabold font-mono text-white">
                ₹ 2,38,687.20
              </div>
              <div className="text-xs text-gov-navy-200 italic">
                (Rupees Two Lakh Thirty-Eight Thousand Six Hundred Eighty-Seven and Paise Twenty Only)
              </div>
            </div>

            {/* 3-Tier Sign-off preview */}
            <div className="grid grid-cols-3 gap-4 pt-6 text-center text-xs">
              <div className="border-t border-slate-300 pt-2 space-y-1">
                {isEditMode ? (
                  <input
                    type="text"
                    value={prepOfficer}
                    onChange={(e) => setPrepOfficer(e.target.value)}
                    className="w-full text-center text-[11px] font-bold border rounded px-1 py-0.5"
                  />
                ) : (
                  <div className="font-bold text-slate-900">{prepOfficer}</div>
                )}
                <div className="text-[10px] text-slate-500">Prepared on Site (S.E.)</div>
              </div>

              <div className="border-t border-slate-300 pt-2 space-y-1">
                {isEditMode ? (
                  <input
                    type="text"
                    value={checkOfficer}
                    onChange={(e) => setCheckOfficer(e.target.value)}
                    className="w-full text-center text-[11px] font-bold border rounded px-1 py-0.5"
                  />
                ) : (
                  <div className="font-bold text-slate-900">{checkOfficer}</div>
                )}
                <div className="text-[10px] text-slate-500">Checked & Validated (A.E.)</div>
              </div>

              <div className="border-t border-slate-300 pt-2 space-y-1">
                {isEditMode ? (
                  <input
                    type="text"
                    value={apprOfficer}
                    onChange={(e) => setApprOfficer(e.target.value)}
                    className="w-full text-center text-[11px] font-bold border rounded px-1 py-0.5"
                  />
                ) : (
                  <div className="font-bold text-slate-900">{apprOfficer}</div>
                )}
                <div className="text-[10px] text-slate-500">Sanctioned & Approved (E.E.)</div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: FC Sheet */}
        {activeTab === 'fc' && (
          <div className="space-y-4 text-xs">
            <h3 className="font-bold text-gov-navy uppercase text-sm border-b pb-1">
              Structural Characteristics & Lifecycle (FC Sheet)
            </h3>
            <div className="grid grid-cols-2 gap-3 text-slate-700">
              <div className="p-2.5 bg-slate-50 rounded border">
                <strong>Structure Type:</strong> {structureData?.structureType || 'Residential Dwelling'}
              </div>
              <div className="p-2.5 bg-slate-50 rounded border">
                <strong>Construction Class:</strong> {structureData?.constructionType || 'Class-B BBM Wall + CGI Roof'}
              </div>
              <div className="p-2.5 bg-slate-50 rounded border">
                <strong>Built-Up Area:</strong> {structureData?.builtUpArea || 73.01} Sqm
              </div>
              <div className="p-2.5 bg-slate-50 rounded border">
                <strong>Plinth Area:</strong> {structureData?.plinthArea || 80.50} Sqm
              </div>
              <div className="p-2.5 bg-slate-50 rounded border">
                <strong>Year Built / Present Age:</strong> {structureData?.yearOfConstruction || 2012} (4 Years)
              </div>
              <div className="p-2.5 bg-slate-50 rounded border">
                <strong>Total Life / Future Life:</strong> 45 Years (41 Years Balance)
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Abstract Sheet */}
        {activeTab === 'abstract' && (
          <div className="space-y-4 text-xs">
            <h3 className="font-bold text-gov-navy uppercase text-sm border-b pb-1">
              Abstract Estimate Summary (AB Sheet)
            </h3>
            <p className="text-slate-600">
              18 construction work items evaluated according to PWD Common Schedule of Rates 2014-15.
            </p>
            <div className="p-3 bg-slate-50 rounded border flex justify-between font-bold text-sm">
              <span>Gross Abstract Total (Present Cost):</span>
              <span className="font-mono text-gov-navy">₹ 2,61,669.00</span>
            </div>
          </div>
        )}

        {/* Tab 4: Final RA Sheet */}
        {activeTab === 'recap' && (
          <div className="space-y-4 text-xs">
            <h3 className="font-bold text-gov-navy uppercase text-sm border-b pb-1">
              Valuation Recapitulation & Panchanama (Final RA Sheet)
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between py-1.5 border-b">
                <span>1. Primary Abstract Cost:</span>
                <strong className="font-mono">₹ 2,61,669.00</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b">
                <span>2. Primary Depreciated Value (Net Present Cost):</span>
                <strong className="font-mono text-gov-navy">₹ 2,57,592.00</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b">
                <span>3. Second Valuation (Salvage Items Abstract):</span>
                <strong className="font-mono">₹ 1,92,040.00</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b">
                <span>4. Salvage Depreciated Value:</span>
                <strong className="font-mono">₹ 189,048.00</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b text-rose-700">
                <span>5. Less: 10% Salvage Adjustment Deduction:</span>
                <strong className="font-mono">- ₹ 18,904.80</strong>
              </div>
              <div className="flex justify-between py-2 bg-slate-900 text-white px-3 rounded font-bold text-sm">
                <span>Final Net Payable Valuation:</span>
                <span className="font-mono text-gov-saffron">₹ 2,38,687.20</span>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Share & Verification Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-gov-lg max-w-md w-full p-6 space-y-4 shadow-soft-lg border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-gov-navy" />
                <h3 className="text-base font-bold text-slate-900">Share & Export Valuation Case</h3>
              </div>
              <button onClick={() => setIsShareModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase">Direct Verification URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareableUrl}
                    className="flex-1 px-3 py-1.5 border rounded font-mono text-slate-600 bg-slate-50 text-[11px]"
                  />
                  <Button size="sm" variant={copiedLink ? 'secondary' : 'outline'} onClick={handleCopyLink}>
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedLink ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </div>

              <div className="pt-2 border-t space-y-2">
                <label className="font-bold text-slate-700 uppercase">Export Structured Data</label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExportJson}
                    leftIcon={<FileSpreadsheet className="w-3.5 h-3.5" />}
                  >
                    Export JSON Summary
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleDownloadPdf}
                    isLoading={isDownloading}
                    leftIcon={<Download className="w-3.5 h-3.5" />}
                  >
                    Official PDF File
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button size="sm" variant="ghost" onClick={() => setIsShareModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Action Toolbar */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <Button type="button" variant="outline" size="md" onClick={onPrev} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back to Panchanama & Photos
        </Button>

        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={handleDownloadPdf}
          isLoading={isDownloading}
          leftIcon={<Download className="w-4 h-4" />}
        >
          Download Valuation PDF Report
        </Button>
      </div>
    </div>
  );
};
