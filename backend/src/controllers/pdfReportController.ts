import { Response } from 'express';
import PDFDocument from 'pdfkit';
import { db } from '../database/db';
import { AuthRequest } from '../middleware/auth';
import { calculateCaseDepreciation } from './depreciationController';
import { calculateCaseSalvageAndFinal, numberToIndianWords } from './salvageController';
import { getCasePanchanama } from './panchanamaController';

export const generateValuationPdf = (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params; // caseId

    const caseRecord = db.cases.find((c) => c.id === id);
    const prop = db.properties.find((p) => p.caseId === id);
    const struct = db.structures.find((s) => s.caseId === id);
    const project = db.projects.find((p) => p.id === caseRecord?.projectId);
    const estimateItems = db.estimateItems.filter((e) => e.caseId === id);
    const measurementGroups = db.measurementGroups.filter((g) => g.caseId === id);

    if (!caseRecord || !prop) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Case not found' });
      return;
    }

    const dep = calculateCaseDepreciation(id);
    const { salvage, finalValuation } = calculateCaseSalvageAndFinal(id);
    const { panchanama } = getCasePanchanama(id);
    const amountInWords = numberToIndianWords(finalValuation.finalValuationAmount);

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 40, bottom: 40, left: 45, right: 45 },
      info: {
        Title: `Valuation_Report_${prop.ownerName.replace(/\s+/g, '_')}_House_${prop.houseNumber}`,
        Author: 'Government of Maharashtra - Water Resources Department',
        Subject: `House Valuation Report for ${prop.ownerName} - LA Case ${prop.laCaseNumber}`,
      },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="Valuation_Report_${prop.houseNumber}_${prop.village}.pdf"`
    );

    doc.pipe(res);

    // ==========================================
    // PAGE 1: OFFICIAL COVER & VALUATION CERTIFICATE
    // ==========================================
    doc.rect(40, 35, 515, 755).stroke('#123B63');
    doc.rect(43, 38, 509, 749).stroke('#D99A2B');

    doc.fontSize(14).font('Helvetica-Bold').fillColor('#123B63').text('GOVERNMENT OF MAHARASHTRA', { align: 'center' });
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#167C80').text('WATER RESOURCES DEPARTMENT', { align: 'center' });
    doc.fontSize(10).font('Helvetica').fillColor('#475569').text('JIGAON MAJOR IRRIGATION PROJECT SUB-DIVISION NO. 2, NANDURA', { align: 'center' });
    doc.moveDown(0.8);

    doc.fontSize(12).font('Helvetica-Bold').fillColor('#D99A2B').text('VALUATION CERTIFICATE & ABSTRACT REPORT', { align: 'center', underline: true });
    doc.moveDown(1);

    doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e293b');
    doc.text(`PROJECT NAME: ${project?.projectName || 'Jigaon Major Irrigation Project'}`);
    doc.text(`LAND ACQUISITION CASE NO.: ${prop.laCaseNumber} (House No. ${prop.houseNumber})`);
    doc.text(`VILLAGE: ${prop.village}, TALUKA: ${prop.taluka}, DISTRICT: ${prop.district}`);
    doc.text(`OWNER NAME: ${prop.ownerName}`);
    doc.text(`VALUATION DATE: ${caseRecord.valuationDate}`);
    doc.moveDown(1.5);

    // Certificate Box
    doc.rect(60, 240, 475, 140).fillAndStroke('#F8FAFC', '#CBD5E1');
    doc.fillColor('#0F172A').fontSize(10).font('Helvetica');
    doc.text(
      `This is to certify that the residential building structure belonging to Shri/Smt. ${prop.ownerName}, situated at Village ${prop.village}, bearing House No. ${prop.houseNumber} (Survey/Gat No. ${prop.surveyNumber}), affected due to full submergence under ${project?.projectName}, has been inspected and measured on site.`,
      75,
      255,
      { width: 445, align: 'justify', lineGap: 3 }
    );
    doc.moveDown(0.8);
    doc.text(
      `The valuation has been carried out in accordance with PWD Common Schedule of Rates (CSR 2014-15) and standard compound interest Year's Purchase depreciation principles.`,
      75,
      320,
      { width: 445, align: 'justify' }
    );

    // Financial Highlight Card
    doc.rect(60, 400, 475, 90).fillAndStroke('#123B63', '#123B63');
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#D99A2B').text('FINAL NET PAYABLE VALUATION AMOUNT', 75, 415, { align: 'center' });
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#FFFFFF').text(`Rs. ${finalValuation.finalValuationAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 75, 435, { align: 'center' });
    doc.fontSize(9).font('Helvetica-Oblique').fillColor('#CBD5E1').text(`(${amountInWords})`, 75, 465, { align: 'center', width: 445 });

    // 3-Tier Signatures
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#0F172A');
    doc.text('Prepared By:', 70, 680);
    doc.text('Checked & Verified By:', 240, 680);
    doc.text('Sanctioned & Approved By:', 410, 680);

    doc.fontSize(8).font('Helvetica').fillColor('#475569');
    doc.text('Sectional Engineer (S.E.)\nIrrigation Sub-Division', 70, 715);
    doc.text('Assistant Engineer (A.E. Gr-I)\nIrrigation Sub-Division', 240, 715);
    doc.text('Executive Engineer (E.E.)\nJigaon Project Division', 410, 715);

    // ==========================================
    // PAGE 2: PROPERTY & STRUCTURAL PARTICULARS
    // ==========================================
    doc.addPage();
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#123B63').text('PAGE 2: PROPERTY & STRUCTURAL SPECIFICATIONS (FC SHEET)', { underline: true });
    doc.moveDown(1);

    doc.fontSize(9).font('Helvetica-Bold').fillColor('#0F172A').text('1. PROPERTY PARTICULARS:');
    doc.fontSize(8.5).font('Helvetica').fillColor('#334155');
    doc.text(`• Owner Name: ${prop.ownerName} | Contact: ${prop.contactNumber || 'N/A'}`);
    doc.text(`• Location: Village ${prop.village}, Taluka ${prop.taluka}, Dist. ${prop.district}`);
    doc.text(`• Property Identification: House No. ${prop.houseNumber}, Gat/Survey No. ${prop.surveyNumber}`);
    doc.text(`• Submergence Category: ${prop.submergenceType}`);
    doc.moveDown(1);

    doc.fontSize(9).font('Helvetica-Bold').fillColor('#0F172A').text('2. STRUCTURAL CHARACTERISTICS:');
    doc.fontSize(8.5).font('Helvetica').fillColor('#334155');
    doc.text(`• Structure Classification: ${struct?.constructionType || 'Class-B BBM Wall + CGI Roof'}`);
    doc.text(`• Plinth Area: ${struct?.plinthArea || 80.5} Sqm | Built-up Living Area: ${struct?.builtUpArea || 73.01} Sqm`);
    doc.text(`• Number of Rooms: ${struct?.numberOfRooms || 4}`);
    doc.text(`• Foundation Type: Concrete Bedding 1:4:8 over UCR Stone Plinth`);
    doc.text(`• Superstructure Wall Type: ${struct?.wallType || 'Burnt Brick Masonry in CM 1:6'}`);
    doc.text(`• Roof Supporting Structure: ${struct?.roofType || 'Country Teak Wood Truss Frame with CGI Sheet Cover'}`);
    doc.text(`• Flooring: ${struct?.floorType || '40mm Cement Concrete Flooring 1:2:4'}`);
    doc.moveDown(1);

    doc.fontSize(9).font('Helvetica-Bold').fillColor('#0F172A').text('3. STRUCTURE LIFECYCLE & Y.P. DEPRECIATION PARAMETERS:');
    doc.fontSize(8.5).font('Helvetica').fillColor('#334155');
    doc.text(`• Year of Construction: ${dep.yearOfConstruction}`);
    doc.text(`• Valuation Year: ${dep.valuationYear}`);
    doc.text(`• Present Age of Building (d): ${dep.presentLife} Years`);
    doc.text(`• Total Estimated Useful Life (D): ${dep.totalLife} Years`);
    doc.text(`• Balance Future Life (r = D - d): ${dep.futureLife} Years`);
    doc.text(`• Government 7% Compound Interest Y.P. Factor for Future Life (41 yrs): ${dep.futureLifeYpFactor}`);
    doc.text(`• Government 7% Compound Interest Y.P. Factor for Total Life (45 yrs): ${dep.totalLifeYpFactor}`);
    doc.text(`• Applied Depreciation Ratio: ${dep.depreciationFactor.toFixed(7)}`);

    // ==========================================
    // PAGE 3: ABSTRACT ESTIMATE (AB SHEET)
    // ==========================================
    doc.addPage();
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#123B63').text('PAGE 3: ABSTRACT ESTIMATE OF CONSTRUCTION (AB SHEET)', { underline: true });
    doc.fontSize(8).font('Helvetica').fillColor('#475569').text('Rates applied as per Public Works Department CSR 2014-15');
    doc.moveDown(0.8);

    // Table Header
    let y = 80;
    doc.rect(45, y, 505, 18).fill('#123B63');
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#FFFFFF');
    doc.text('Item', 48, y + 5);
    doc.text('Particulars of Work Item', 75, y + 5);
    doc.text('Qty', 340, y + 5, { width: 35, align: 'right' });
    doc.text('Unit', 380, y + 5);
    doc.text('Rate (Rs)', 410, y + 5, { width: 50, align: 'right' });
    doc.text('Amount (Rs)', 470, y + 5, { width: 75, align: 'right' });

    y += 18;
    estimateItems.forEach((item, idx) => {
      const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
      doc.rect(45, y, 505, 24).fill(bg);
      doc.fontSize(7).font('Helvetica').fillColor('#0F172A');
      doc.text(String(item.itemNumber), 48, y + 6);
      doc.text(item.description, 75, y + 6, { width: 260, lineBreak: false });
      doc.text(item.quantity.toFixed(2), 340, y + 6, { width: 35, align: 'right' });
      doc.text(item.unit, 380, y + 6);
      doc.text(item.rate.toFixed(2), 410, y + 6, { width: 50, align: 'right' });
      doc.font('Helvetica-Bold').text(item.amount.toFixed(2), 470, y + 6, { width: 75, align: 'right' });
      y += 24;
    });

    // Grand Total Row
    doc.rect(45, y, 505, 20).fill('#0F172A');
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#D99A2B');
    doc.text('GRAND TOTAL OF PRIMARY ABSTRACT ESTIMATE:', 75, y + 6);
    doc.text(`Rs. ${dep.presentEstimatedCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 450, y + 6, { width: 95, align: 'right' });

    // ==========================================
    // PAGE 4: MASTER RECAPITULATION & PANCHANAMA
    // ==========================================
    doc.addPage();
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#123B63').text('PAGE 4: RECAPITULATION & PANCHANAMA STATEMENT (FINAL RA)', { underline: true });
    doc.moveDown(1);

    // Recapitulation Summary Table
    y = 80;
    doc.rect(45, y, 505, 18).fill('#123B63');
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#FFFFFF');
    doc.text('Sr.', 50, y + 5);
    doc.text('Valuation Step & Description', 80, y + 5);
    doc.text('Amount in Rs.', 440, y + 5, { width: 100, align: 'right' });

    const recapRows = [
      { sr: '1', desc: 'Primary Abstract Cost of Construction (18 Items @ PWD CSR 2014-15)', amt: `Rs. ${finalValuation.primaryEstimateTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
      { sr: '2', desc: 'Primary Depreciated Structure Value [Cost × YP(41y: 13.394) ÷ YP(45y: 13.606)]', amt: `Rs. ${finalValuation.primaryDepreciatedValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
      { sr: '3', desc: 'Second Valuation (Salvage / Reusable Materials Abstract Total)', amt: `Rs. ${finalValuation.salvageEstimateTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
      { sr: '4', desc: 'Salvage Depreciated Value [Salvage Cost × 13.394 ÷ 13.606]', amt: `Rs. ${finalValuation.salvageDepreciatedValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
      { sr: '5', desc: `Less: Configured Salvage Adjustment Deduction (${finalValuation.adjustmentPercentage.toFixed(1)}%)`, amt: `- Rs. ${finalValuation.adjustmentAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
    ];

    y += 18;
    recapRows.forEach((row, i) => {
      doc.rect(45, y, 505, 22).fill(i % 2 === 0 ? '#FFFFFF' : '#F8FAFC');
      doc.fontSize(7.5).font('Helvetica').fillColor('#0F172A');
      doc.text(row.sr, 50, y + 6);
      doc.text(row.desc, 80, y + 6, { width: 350 });
      doc.font('Helvetica-Bold').text(row.amt, 430, y + 6, { width: 110, align: 'right' });
      y += 22;
    });

    // Final Net Compensation
    doc.rect(45, y, 505, 26).fill('#123B63');
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#D99A2B');
    doc.text('FINAL NET PAYABLE VALUATION AMOUNT:', 80, y + 8);
    doc.text(`Rs. ${finalValuation.finalValuationAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 420, y + 8, { width: 120, align: 'right' });

    y += 45;
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#0F172A').text('PANCHANAMA & WITNESS ENDORSEMENT:', 45, y);
    doc.fontSize(8).font('Helvetica').fillColor('#475569').text(
      panchanama.generalRemarks || panchanama.remarks || 'Site inspection completed in the presence of panchas.',
      45,
      y + 15,
      { width: 505, align: 'justify' }
    );

    y += 65;
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0F172A').text('Panchanama Witnesses / Panchas:', 45, y);
    panchanama.panchas.forEach((p: any, idx: number) => {
      doc.fontSize(8).font('Helvetica').fillColor('#334155').text(`${idx + 1}. ${p.name}, ${p.address} [Endorsed]`, 55, y + 15 + idx * 14);
    });

    doc.end();
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};
