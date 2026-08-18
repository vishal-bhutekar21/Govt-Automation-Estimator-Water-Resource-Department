import React, { useState } from 'react';
import api from '../../../services/api';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
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
  FileSpreadsheet,
  Layers,
  ShieldCheck,
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
      const response = await api.get(`/v1/cases/${caseData.id}/report/download`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
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
      {/* Top Header & Unified Single Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <span className="text-[11px] font-bold text-gov-navy uppercase tracking-wider">
            Step 10 of 10 • Final Sanction & PDF Report
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Official Valuation Report & Sanction Certificate
          </h2>
        </div>

        {/* Single Non-Overlapping Action Toolbar */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            leftIcon={<Printer className="w-3.5 h-3.5 text-slate-600" />}
            className="border-slate-300 hover:bg-slate-50 font-semibold text-slate-700"
          >
            Print
          </Button>

          <Button
            variant={isEditMode ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setIsEditMode(!isEditMode)}
            leftIcon={<Edit3 className="w-3.5 h-3.5" />}
          >
            {isEditMode ? 'Save & Lock' : 'Edit Notes'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsShareModalOpen(true)}
            leftIcon={<Share2 className="w-3.5 h-3.5" />}
          >
            Share
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleDownloadPdf}
            isLoading={isDownloading}
            leftIcon={<Download className="w-3.5 h-3.5" />}
            className="bg-gov-navy hover:bg-gov-navy-900 font-bold"
          >
            Download PDF
          </Button>
        </div>
      </div>

      {/* Edit Mode Notification Banner */}
      {isEditMode && (
        <div className="p-4 rounded-gov-md bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between shadow-soft-xs">
          <div className="flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>Report Customization Mode Active:</strong> You can edit the certificate title, remarks, and signatories directly below. Click <strong>"Save & Lock"</strong> when finished.
            </span>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setIsEditMode(false)}>
            Lock Changes
          </Button>
        </div>
      )}

      {/* Summary Hero Card */}
      <Card
        variant="default"
        className="p-5 bg-gradient-to-r from-gov-navy to-[#1a385c] text-white shadow-soft-sm flex flex-col md:flex-row items-center justify-between gap-5 border border-slate-800 rounded-2xl"
      >
        <div className="flex items-center gap-4 text-center md:text-left">
          <div className="p-2 rounded-xl bg-white shrink-0 shadow-soft-xs flex items-center justify-center">
            <GovtEmblem size="md" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-center md:justify-start gap-1.5">
              <Stamp className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-widest">
                Maharashtra State PWD CSR 2014-15 Standard
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
              House No. {propertyData?.houseNumber || '165'} • {propertyData?.ownerName || 'Mohan Vishwanath Gai'}
            </h3>
            <p className="text-xs text-slate-300 font-medium">
              Jigaon Major Irrigation Project • Sub-Division No. 2, Nandura (LA Case: {propertyData?.laCaseNumber || '15/2008-09'})
            </p>
          </div>
        </div>

        {/* Financial Badge Highlight */}
        <div className="text-center md:text-right bg-white/10 px-5 py-3 rounded-xl border border-white/15 shrink-0">
          <div className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider">
            Net Sanctioned Valuation
          </div>
          <div className="text-2xl font-black font-mono text-white mt-0.5">
            ₹ 2,38,687.20
          </div>
          <div className="text-[10px] text-slate-300 font-semibold flex items-center justify-center md:justify-end gap-1 mt-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Executive Sanction Ready</span>
          </div>
        </div>
      </Card>

      {/* Multi-Page Tabs */}
      <div className="flex border-b border-slate-200 gap-1.5 text-xs font-bold overflow-x-auto scrollbar-thin">
        <button
          type="button"
          onClick={() => setActiveTab('cover')}
          className={`py-2.5 px-4 rounded-t-xl border-t border-x transition-colors whitespace-nowrap ${
            activeTab === 'cover'
              ? 'bg-white text-gov-navy border-slate-300 -mb-[1px] shadow-soft-xs font-black'
              : 'text-slate-500 hover:text-slate-900 border-transparent bg-slate-100/60'
          }`}
        >
          Page 1: Official Certificate & Award
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('fc')}
          className={`py-2.5 px-4 rounded-t-xl border-t border-x transition-colors whitespace-nowrap ${
            activeTab === 'fc'
              ? 'bg-white text-gov-navy border-slate-300 -mb-[1px] shadow-soft-xs font-black'
              : 'text-slate-500 hover:text-slate-900 border-transparent bg-slate-100/60'
          }`}
        >
          Page 2: FC Sheet (Structural Specs)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('abstract')}
          className={`py-2.5 px-4 rounded-t-xl border-t border-x transition-colors whitespace-nowrap ${
            activeTab === 'abstract'
              ? 'bg-white text-gov-navy border-slate-300 -mb-[1px] shadow-soft-xs font-black'
              : 'text-slate-500 hover:text-slate-900 border-transparent bg-slate-100/60'
          }`}
        >
          Page 3: AB Sheet (Abstract Estimate)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('recap')}
          className={`py-2.5 px-4 rounded-t-xl border-t border-x transition-colors whitespace-nowrap ${
            activeTab === 'recap'
              ? 'bg-white text-gov-navy border-slate-300 -mb-[1px] shadow-soft-xs font-black'
              : 'text-slate-500 hover:text-slate-900 border-transparent bg-slate-100/60'
          }`}
        >
          Page 4: RA Sheet (Recapitulation & Panchanama)
        </button>
      </div>

      {/* Interactive Sheet Preview Canvas */}
      <div className="p-6 sm:p-10 max-w-4xl mx-auto bg-white border border-slate-300 shadow-soft-sm rounded-2xl min-h-[600px] text-slate-900 font-sans print:border-none print:shadow-none print:p-0">
        {/* Government Header */}
        <div className="text-center space-y-1.5 border-b-2 border-slate-900 pb-4">
          <div className="flex justify-center mb-1">
            <GovtEmblem size="lg" />
          </div>
          <div className="text-xs font-black text-slate-900 uppercase tracking-widest">
            Government of Maharashtra
          </div>
          <div className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wide">
            Water Resources Department
          </div>

          {isEditMode ? (
            <input
              type="text"
              value={deptHeader}
              onChange={(e) => setDeptHeader(e.target.value)}
              className="w-full text-center text-xs font-bold border rounded px-2 py-1 text-slate-900 bg-amber-50"
            />
          ) : (
            <div className="text-xs font-extrabold text-slate-700 uppercase">
              {deptHeader}
            </div>
          )}

          <div className="text-[10px] text-slate-500 uppercase tracking-wider">
            District: Buldhana • Maharashtra State | PWD CSR 2014-15 Standard
          </div>

          {isEditMode ? (
            <input
              type="text"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              className="w-full text-center text-xs font-bold border rounded px-2 py-1 text-slate-900 bg-amber-50"
            />
          ) : (
            <div className="mt-2 inline-block px-4 py-1.5 bg-[#0B2545] text-white text-xs font-black uppercase tracking-wider rounded">
              {reportTitle}
            </div>
          )}
        </div>

        {/* Tab 1: Cover Sheet */}
        {activeTab === 'cover' && (
          <div className="space-y-6 text-xs text-slate-800 pt-4">
            {/* Property Metadata Table */}
            <div className="border border-slate-300 rounded-lg overflow-hidden">
              <div className="grid grid-cols-2 divide-x divide-slate-200 border-b border-slate-200 bg-slate-50/70 p-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Land Acquisition Case No.</span>
                  <strong className="text-slate-900 font-mono text-sm">{propertyData?.laCaseNumber || 'LA/JIG/15/2008-09'}</strong>
                </div>
                <div className="pl-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Property Identification</span>
                  <strong className="text-slate-900 font-mono text-sm">House No. {propertyData?.houseNumber || '165'}</strong>
                </div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-slate-200 border-b border-slate-200 bg-white p-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Name of Property Owner</span>
                  <strong className="text-slate-900 text-sm">{propertyData?.ownerName || 'Mohan Vishwanath Gai'}</strong>
                </div>
                <div className="pl-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Cadastral Survey / Gat No.</span>
                  <strong className="text-slate-900 text-sm">{propertyData?.surveyNumber || '42/1'}</strong>
                </div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-slate-200 bg-slate-50/70 p-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Village & Taluka</span>
                  <strong className="text-slate-900 text-sm">Village {propertyData?.village || 'Dadulgaon'}, Taluka {propertyData?.taluka || 'Nandura'}</strong>
                </div>
                <div className="pl-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Valuation Inspection Date</span>
                  <strong className="text-slate-900 text-sm">{caseData.valuationDate || '12-03-2026'}</strong>
                </div>
              </div>
            </div>

            {/* Certificate Body Paragraph */}
            <div className="p-4 bg-slate-50 border border-slate-300 rounded-lg space-y-2">
              <span className="text-[10px] font-extrabold text-slate-900 uppercase tracking-wider block">
                Statutory Valuation Certification Statement:
              </span>
              {isEditMode ? (
                <textarea
                  rows={4}
                  value={customRemarks}
                  onChange={(e) => setCustomRemarks(e.target.value)}
                  className="w-full p-2 border rounded bg-amber-50 text-xs text-slate-800 leading-relaxed font-sans"
                />
              ) : (
                <p className="text-justify text-slate-700 leading-relaxed text-xs">
                  {customRemarks}
                </p>
              )}
            </div>

            {/* Financial Highlight */}
            <div className="p-5 rounded-xl bg-[#0B2545] text-white text-center space-y-1.5 border border-slate-900 shadow-soft-sm">
              <div className="text-[10px] font-extrabold text-amber-300 uppercase tracking-widest">
                Final Net Payable Valuation & Compensation Award
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-white">
                ₹ 2,38,687.20
              </div>
              <div className="text-[11px] text-slate-300 italic">
                (Rupees Two Lakh Thirty-Eight Thousand Six Hundred Eighty-Seven and Paise Twenty Only)
              </div>
            </div>

            {/* 3-Tier Sign-off preview */}
            <div className="grid grid-cols-3 gap-4 pt-6 text-center text-xs border-t border-slate-200">
              <div className="space-y-1">
                <div className="h-10 border-b border-dashed border-slate-400 mb-2" />
                {isEditMode ? (
                  <input
                    type="text"
                    value={prepOfficer}
                    onChange={(e) => setPrepOfficer(e.target.value)}
                    className="w-full text-center text-[11px] font-bold border rounded px-1 py-0.5"
                  />
                ) : (
                  <div className="font-extrabold text-slate-900">{prepOfficer}</div>
                )}
                <div className="text-[10px] text-slate-500 font-medium">Prepared on Site (S.E.)</div>
                <div className="text-[9px] text-slate-400">Irrigation Sub-Division</div>
              </div>

              <div className="space-y-1">
                <div className="h-10 border-b border-dashed border-slate-400 mb-2" />
                {isEditMode ? (
                  <input
                    type="text"
                    value={checkOfficer}
                    onChange={(e) => setCheckOfficer(e.target.value)}
                    className="w-full text-center text-[11px] font-bold border rounded px-1 py-0.5"
                  />
                ) : (
                  <div className="font-extrabold text-slate-900">{checkOfficer}</div>
                )}
                <div className="text-[10px] text-slate-500 font-medium">Checked & Validated (A.E.)</div>
                <div className="text-[9px] text-slate-400">Irrigation Sub-Division</div>
              </div>

              <div className="space-y-1">
                <div className="h-10 border-b border-dashed border-slate-400 mb-2" />
                {isEditMode ? (
                  <input
                    type="text"
                    value={apprOfficer}
                    onChange={(e) => setApprOfficer(e.target.value)}
                    className="w-full text-center text-[11px] font-bold border rounded px-1 py-0.5"
                  />
                ) : (
                  <div className="font-extrabold text-slate-900">{apprOfficer}</div>
                )}
                <div className="text-[10px] text-slate-500 font-medium">Sanctioned & Approved (E.E.)</div>
                <div className="text-[9px] text-slate-400">Jigaon Project Division</div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: FC Sheet */}
        {activeTab === 'fc' && (
          <div className="space-y-4 text-xs text-slate-800 pt-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-black text-slate-900 uppercase text-xs">
                Annexure-I: Structural Specifications & Lifecycle Valuation (FC Sheet)
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">Form FC-01</span>
            </div>

            <div className="border border-slate-300 rounded-lg overflow-hidden">
              <div className="bg-slate-100 p-2.5 font-bold text-slate-900 border-b border-slate-300">
                1. Structural Characteristics & Materials
              </div>
              <div className="grid grid-cols-2 divide-x divide-slate-200 border-b border-slate-200 p-2.5">
                <div><strong>Structure Type:</strong> {structureData?.structureType || 'Residential Dwelling'}</div>
                <div className="pl-2.5"><strong>Construction Classification:</strong> {structureData?.constructionType || 'Class-B BBM Wall + CGI Roof'}</div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-slate-200 border-b border-slate-200 p-2.5 bg-slate-50/50">
                <div><strong>Plinth Area:</strong> {structureData?.plinthArea || 80.50} Sq.m (866.50 Sq.ft)</div>
                <div className="pl-2.5"><strong>Built-Up Living Area:</strong> {structureData?.builtUpArea || 73.01} Sq.m (785.88 Sq.ft)</div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-slate-200 border-b border-slate-200 p-2.5">
                <div><strong>Foundation Type:</strong> Concrete Bedding 1:4:8 over UCR Stone Plinth</div>
                <div className="pl-2.5"><strong>Superstructure Walls:</strong> Burnt Brick Masonry (BBM) in CM 1:6</div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-slate-200 p-2.5 bg-slate-50/50">
                <div><strong>Roofing Framework:</strong> Country Teak Wood Truss with CGI Sheets</div>
                <div className="pl-2.5"><strong>Flooring:</strong> 40mm Cement Concrete 1:2:4</div>
              </div>
            </div>

            {/* Depreciation Parameters Table */}
            <div className="border border-slate-300 rounded-lg overflow-hidden">
              <div className="bg-slate-100 p-2.5 font-bold text-slate-900 border-b border-slate-300">
                2. 7% Compound Interest Year's Purchase (Y.P.) Lifecycle Parameters
              </div>
              <div className="grid grid-cols-2 divide-x divide-slate-200 border-b border-slate-200 p-2.5">
                <div><strong>Year Built / Valuation Year:</strong> 2012 / 2016</div>
                <div className="pl-2.5"><strong>Present Age of Building (d):</strong> 4 Years</div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-slate-200 border-b border-slate-200 p-2.5 bg-slate-50/50">
                <div><strong>Total Useful Life (D):</strong> 45 Years</div>
                <div className="pl-2.5"><strong>Balance Future Life (r = D - d):</strong> 41 Years</div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-slate-200 p-2.5">
                <div><strong>Y.P. Factor for 41 Years @ 7%:</strong> 13.394</div>
                <div className="pl-2.5"><strong>Y.P. Factor for 45 Years @ 7%:</strong> 13.606</div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Abstract Sheet */}
        {activeTab === 'abstract' && (
          <div className="space-y-4 text-xs text-slate-800 pt-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-black text-slate-900 uppercase text-xs">
                Annexure-II: Detailed Abstract Estimate (AB Sheet @ PWD CSR 2014-15)
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">18 CSR Items</span>
            </div>

            <div className="border border-slate-300 rounded-lg overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[600px]">
                <thead className="bg-[#0B2545] text-white text-[10px] uppercase font-bold">
                  <tr>
                    <th className="py-2 px-3 text-center">Item</th>
                    <th className="py-2 px-3">Description of Work</th>
                    <th className="py-2 px-3 text-right">Qty</th>
                    <th className="py-2 px-3 text-center">Unit</th>
                    <th className="py-2 px-3 text-right">Rate (₹)</th>
                    <th className="py-2 px-3 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3 text-center font-bold">1</td>
                    <td className="py-2 px-3 font-sans">Excavation for foundation in earth, soils, and soft murum</td>
                    <td className="py-2 px-3 text-right">18.50</td>
                    <td className="py-2 px-3 text-center">Cum</td>
                    <td className="py-2 px-3 text-right">142.00</td>
                    <td className="py-2 px-3 text-right font-bold">2,627.00</td>
                  </tr>
                  <tr className="hover:bg-slate-50 bg-slate-50/50">
                    <td className="py-2 px-3 text-center font-bold">2</td>
                    <td className="py-2 px-3 font-sans">Providing and laying cement concrete 1:4:8 in foundation and plinth</td>
                    <td className="py-2 px-3 text-right">9.20</td>
                    <td className="py-2 px-3 text-center">Cum</td>
                    <td className="py-2 px-3 text-right">3,850.00</td>
                    <td className="py-2 px-3 text-right font-bold">35,420.00</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3 text-center font-bold">3</td>
                    <td className="py-2 px-3 font-sans">Uncoursed Rubble (UCR) Stone Masonry in cement mortar 1:6 in plinth</td>
                    <td className="py-2 px-3 text-right">14.60</td>
                    <td className="py-2 px-3 text-center">Cum</td>
                    <td className="py-2 px-3 text-right">3,420.00</td>
                    <td className="py-2 px-3 text-right font-bold">49,932.00</td>
                  </tr>
                  <tr className="hover:bg-slate-50 bg-slate-50/50">
                    <td className="py-2 px-3 text-center font-bold">4</td>
                    <td className="py-2 px-3 font-sans">Burnt Brick Masonry in cement mortar 1:6 in superstructure</td>
                    <td className="py-2 px-3 text-right">21.80</td>
                    <td className="py-2 px-3 text-center">Cum</td>
                    <td className="py-2 px-3 text-right">4,650.00</td>
                    <td className="py-2 px-3 text-right font-bold">1,01,370.00</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3 text-center font-bold">5</td>
                    <td className="py-2 px-3 font-sans">Teak wood wrought framing in roof trusses and purlins</td>
                    <td className="py-2 px-3 text-right">0.85</td>
                    <td className="py-2 px-3 text-center">Cum</td>
                    <td className="py-2 px-3 text-right">42,000.00</td>
                    <td className="py-2 px-3 text-right font-bold">35,700.00</td>
                  </tr>
                  <tr className="hover:bg-slate-50 bg-slate-50/50">
                    <td className="py-2 px-3 text-center font-bold">6</td>
                    <td className="py-2 px-3 font-sans">Corrugated Galvanized Iron (CGI) sheet roof covering</td>
                    <td className="py-2 px-3 text-right">86.20</td>
                    <td className="py-2 px-3 text-center">Sqm</td>
                    <td className="py-2 px-3 text-right">425.00</td>
                    <td className="py-2 px-3 text-right font-bold">36,620.00</td>
                  </tr>
                </tbody>
                <tfoot className="bg-[#0B2545] text-white font-bold">
                  <tr>
                    <td colSpan={5} className="py-2.5 px-3 text-right text-xs uppercase tracking-wider">
                      Grand Total of Primary Abstract Estimate (CSR 2014-15):
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-sm text-amber-300">
                      ₹ 2,61,669.00
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Final RA Sheet */}
        {activeTab === 'recap' && (
          <div className="space-y-4 text-xs text-slate-800 pt-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-black text-slate-900 uppercase text-xs">
                Annexure-III: Master Recapitulation Statement & Panchanama (RA Sheet)
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">Final Sanction Sheet</span>
            </div>

            <div className="border border-slate-300 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#0B2545] text-white text-[10px] uppercase font-bold">
                  <tr>
                    <th className="py-2 px-3 text-center w-12">Sr.</th>
                    <th className="py-2 px-3">Valuation Step & Calculation Component</th>
                    <th className="py-2 px-3 text-right w-44">Amount in ₹</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3 text-center font-bold">1</td>
                    <td className="py-2 px-3 font-sans">Primary Abstract Cost of Construction (18 Items @ PWD CSR 2014-15)</td>
                    <td className="py-2 px-3 text-right">₹ 2,61,669.00</td>
                  </tr>
                  <tr className="hover:bg-slate-50 bg-slate-50/50">
                    <td className="py-2 px-3 text-center font-bold">2</td>
                    <td className="py-2 px-3 font-sans">Primary Depreciated Value [Cost × YP(41y: 13.394) ÷ YP(45y: 13.606)]</td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900">₹ 2,57,592.00</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3 text-center font-bold">3</td>
                    <td className="py-2 px-3 font-sans">Second Valuation (Salvage / Reusable Materials Abstract Total)</td>
                    <td className="py-2 px-3 text-right">₹ 1,92,040.00</td>
                  </tr>
                  <tr className="hover:bg-slate-50 bg-slate-50/50">
                    <td className="py-2 px-3 text-center font-bold">4</td>
                    <td className="py-2 px-3 font-sans">Salvage Depreciated Structure Value [Salvage Cost × 13.394 ÷ 13.606]</td>
                    <td className="py-2 px-3 text-right font-bold">₹ 1,89,048.00</td>
                  </tr>
                  <tr className="hover:bg-slate-50 text-rose-700">
                    <td className="py-2 px-3 text-center font-bold">5</td>
                    <td className="py-2 px-3 font-sans">Less: Configured Salvage Adjustment Deduction (10.0% of Salvage Depreciated)</td>
                    <td className="py-2 px-3 text-right font-bold">- ₹ 18,904.80</td>
                  </tr>
                </tbody>
                <tfoot className="bg-[#0B2545] text-white font-bold">
                  <tr>
                    <td colSpan={2} className="py-3 px-3 text-right text-xs uppercase tracking-wider">
                      Final Net Payable Valuation & Compensation Amount:
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-base text-amber-300">
                      ₹ 2,38,687.20
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Panchanama Spot Statement */}
            <div className="p-3.5 bg-slate-50 border border-slate-300 rounded-lg space-y-1.5">
              <span className="text-[10px] font-extrabold text-slate-900 uppercase tracking-wider block">
                Spot Panchanama & Local Witness Verification Statement:
              </span>
              <p className="text-slate-700 text-xs leading-relaxed text-justify">
                Site inspection and joint verification completed in the presence of panchas. All measurements, structural timber, roofing sheets, masonry conditions, and salvageable elements have been recorded accurately and verified without dispute.
              </p>
            </div>
          </div>
        )}
      </div>

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

      {/* Bottom Navigation */}
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
          className="bg-gov-navy hover:bg-gov-navy-900 font-bold"
        >
          Download Official Government PDF (A4)
        </Button>
      </div>
    </div>
  );
};
