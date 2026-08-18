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
      margins: { top: 25, bottom: 25, left: 30, right: 30 },
      autoFirstPage: false,
      info: {
        Title: `Valuation_Award_${prop.ownerName.replace(/\s+/g, '_')}_House_${prop.houseNumber}`,
        Author: 'Government of Maharashtra - Water Resources Department',
        Subject: `Official Valuation Certificate for ${prop.ownerName} - LA Case ${prop.laCaseNumber}`,
      },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="Valuation_Report_${prop.houseNumber}_${prop.village}.pdf"`
    );

    doc.pipe(res);

    // Helpers
    const drawPageHeader = (formCode: string, formTitle: string) => {
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#000000').text(
        'GOVERNMENT OF MAHARASHTRA • WATER RESOURCES DEPARTMENT',
        30,
        18,
        { width: 350, align: 'left' }
      );
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#374151').text(
        formCode,
        380,
        18,
        { width: 185, align: 'right' }
      );
      doc.lineWidth(0.5).strokeColor('#000000').moveTo(30, 28).lineTo(565, 28).stroke();
    };

    const drawPageFooter = (pageNo: number) => {
      doc.lineWidth(0.5).strokeColor('#000000').moveTo(30, 810).lineTo(565, 810).stroke();
      doc.fontSize(7.5).font('Helvetica').fillColor('#4B5563').text(
        `Jigaon Major Irrigation Project Sub-Division No. 2, Nandura • LA Case No.: ${prop.laCaseNumber} (House No. ${prop.houseNumber})`,
        30,
        815,
        { width: 420, align: 'left' }
      );
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#000000').text(
        `Page ${pageNo} of 4`,
        450,
        815,
        { width: 115, align: 'right' }
      );
    };

    // =========================================================================
    // PAGE 1: FORM NO. 1 — OFFICIAL VALUATION CERTIFICATE & REHABILITATION AWARD
    // =========================================================================
    doc.addPage({ size: 'A4', margins: { top: 20, bottom: 20, left: 25, right: 25 } });

    // Formal Government Double Border
    doc.lineWidth(1.2).strokeColor('#000000').rect(25, 20, 545, 802).stroke();
    doc.lineWidth(0.5).strokeColor('#4B5563').rect(28, 23, 539, 796).stroke();

    // Masthead
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#000000').text('GOVERNMENT OF MAHARASHTRA', 30, 36, { align: 'center' });
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#111827').text('WATER RESOURCES DEPARTMENT', 30, 52, { align: 'center' });
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#374151').text('OFFICE OF THE EXECUTIVE ENGINEER, JIGAON PROJECT DIVISION, NANDURA', 30, 66, { align: 'center' });
    doc.fontSize(7.5).font('Helvetica').fillColor('#4B5563').text('DISTRICT: BULDHANA • STATE: MAHARASHTRA | PWD CSR 2014-15 STANDARD', 30, 78, { align: 'center' });

    // Divider Line
    doc.lineWidth(0.8).strokeColor('#000000').moveTo(40, 92).lineTo(555, 92).stroke();

    // Document Title
    doc.rect(40, 100, 515, 22).lineWidth(0.8).strokeColor('#000000').fillAndStroke('#F3F4F6', '#000000');
    doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#000000').text('VALUATION CERTIFICATE FOR ACQUIRED IMMOVABLE PROPERTY', 40, 106, { align: 'center' });

    // Metadata Grid (4 Rows x 2 Cols)
    const tY = 130;
    const tW = 515;
    const tH = 88;
    doc.rect(40, tY, tW, tH).lineWidth(0.5).strokeColor('#000000').stroke();

    // Internal dividers
    doc.moveTo(40, tY + 22).lineTo(40 + tW, tY + 22).stroke();
    doc.moveTo(40, tY + 44).lineTo(40 + tW, tY + 44).stroke();
    doc.moveTo(40, tY + 66).lineTo(40 + tW, tY + 66).stroke();
    doc.moveTo(40 + 257.5, tY).lineTo(40 + 257.5, tY + tH).stroke();

    // Fill metadata cells
    const drawCell = (x: number, y: number, label: string, val: string, w: number) => {
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#000000').text(label, x + 5, y + 6, { width: 110 });
      doc.fontSize(7.5).font('Helvetica').fillColor('#111827').text(val, x + 115, y + 6, { width: w - 120, lineBreak: false });
    };

    drawCell(40, tY, 'Project Name:', project?.projectName || 'Jigaon Major Irrigation Project', 257.5);
    drawCell(40 + 257.5, tY, 'LA Case No.:', prop.laCaseNumber, 257.5);

    drawCell(40, tY + 22, 'Name of Owner:', prop.ownerName, 257.5);
    drawCell(40 + 257.5, tY + 22, 'Gat / Survey No.:', prop.surveyNumber || 'N/A', 257.5);

    drawCell(40, tY + 44, 'House No. & Village:', `House No. ${prop.houseNumber}, ${prop.village}`, 257.5);
    drawCell(40 + 257.5, tY + 44, 'Taluka & District:', `${prop.taluka}, Dist. ${prop.district}`, 257.5);

    drawCell(40, tY + 66, 'Structure Type:', struct?.constructionType || 'Class-B BBM Wall + CGI Roof', 257.5);
    drawCell(40 + 257.5, tY + 66, 'Valuation Date:', caseRecord.valuationDate, 257.5);

    // Statutory Certification Box
    doc.rect(40, 228, 515, 115).lineWidth(0.5).strokeColor('#000000').fillAndStroke('#FFFFFF', '#000000');
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#000000').text('OFFICIAL CERTIFICATION & INSPECTION RECORD:', 48, 236);

    doc.fontSize(8).font('Helvetica').fillColor('#111827');
    doc.text(
      `This is to certify that the residential immovable property belonging to Shri/Smt. ${prop.ownerName}, situated at Village ${prop.village}, Taluka ${prop.taluka}, District ${prop.district}, bearing House No. ${prop.houseNumber} (Gat/Survey No. ${prop.surveyNumber}), affected due to full submergence under ${project?.projectName}, has been jointly inspected, surveyed, and measured on site.`,
      48,
      250,
      { width: 499, align: 'justify', lineGap: 2 }
    );

    doc.text(
      `The detailed abstract of quantities and valuation rates have been adopted strictly in accordance with Public Works Department Common Schedule of Rates (PWD CSR 2014-15) and standard government 7% compound interest Year's Purchase (Y.P.) depreciation principles, with salvage deductions evaluated as per departmental norms.`,
      48,
      292,
      { width: 499, align: 'justify', lineGap: 2 }
    );

    // Award Financial Box
    doc.rect(40, 353, 515, 76).lineWidth(1).strokeColor('#000000').fillAndStroke('#F9FAFB', '#000000');
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#000000').text('FINAL NET SANCTIONED VALUATION AMOUNT:', 40, 363, { align: 'center' });
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#000000').text(
      `Rs. ${finalValuation.finalValuationAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      40,
      380,
      { align: 'center' }
    );
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#374151').text(
      `(${amountInWords})`,
      40,
      406,
      { align: 'center', width: 515 }
    );

    // Cost Breakdown Summary Row
    doc.rect(40, 439, 515, 48).lineWidth(0.5).strokeColor('#000000').stroke();
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#000000');
    doc.text('Valuation Component Summary:', 48, 446);

    doc.font('Helvetica').fillColor('#111827');
    doc.text(`• Primary Abstract Cost: Rs. ${finalValuation.primaryEstimateTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 48, 460);
    doc.text(`• Primary Depreciated Cost: Rs. ${finalValuation.primaryDepreciatedValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 48, 472);

    doc.text(`• Salvage Reusable Total: Rs. ${finalValuation.salvageEstimateTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 290, 460);
    doc.text(`• Less: Salvage Adjustment (${finalValuation.adjustmentPercentage.toFixed(1)}%): - Rs. ${finalValuation.adjustmentAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 290, 472);

    // Official 3-Tier Signatures
    const sY = 680;
    doc.lineWidth(0.5).strokeColor('#000000');

    // Sig 1
    doc.moveTo(45, sY).lineTo(185, sY).stroke();
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#000000').text('Sectional Engineer (S.E.)', 45, sY + 4);
    doc.fontSize(7).font('Helvetica').fillColor('#374151').text('Irrigation Sub-Division No. 2\nNandura, Dist. Buldhana', 45, sY + 15);
    doc.rect(45, sY + 42, 55, 18).lineWidth(0.5).strokeColor('#9CA3AF').stroke();
    doc.fontSize(6).font('Helvetica').fillColor('#6B7280').text('OFFICIAL SEAL', 50, sY + 48);

    // Sig 2
    doc.moveTo(225, sY).lineTo(365, sY).stroke();
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#000000').text('Assistant Engineer (A.E. Gr-I)', 225, sY + 4);
    doc.fontSize(7).font('Helvetica').fillColor('#374151').text('Irrigation Sub-Division No. 2\nNandura, Dist. Buldhana', 225, sY + 15);
    doc.rect(225, sY + 42, 55, 18).lineWidth(0.5).strokeColor('#9CA3AF').stroke();
    doc.fontSize(6).font('Helvetica').fillColor('#6B7280').text('OFFICIAL SEAL', 230, sY + 48);

    // Sig 3
    doc.moveTo(405, sY).lineTo(545, sY).stroke();
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#000000').text('Executive Engineer (E.E.)', 405, sY + 4);
    doc.fontSize(7).font('Helvetica').fillColor('#374151').text('Jigaon Project Division\nNandura, Dist. Buldhana', 405, sY + 15);
    doc.rect(405, sY + 42, 55, 18).lineWidth(0.5).strokeColor('#9CA3AF').stroke();
    doc.fontSize(6).font('Helvetica').fillColor('#6B7280').text('OFFICIAL SEAL', 410, sY + 48);

    // =========================================================================
    // PAGE 2: FORM NO. 2 (FC SHEET) — DETAILED STRUCTURAL SPECIFICATIONS
    // =========================================================================
    doc.addPage({ size: 'A4', margins: { top: 25, bottom: 25, left: 30, right: 30 } });
    drawPageHeader('FORM FC-01 (PROPERTY SPECIFICATIONS)', 'PAGE 2');
    drawPageFooter(2);

    doc.fontSize(10.5).font('Helvetica-Bold').fillColor('#000000').text(
      'STATEMENT SHOWING PROPERTY PARTICULARS & STRUCTURAL SPECIFICATIONS (FC SHEET)',
      30,
      38
    );
    doc.fontSize(7.5).font('Helvetica').fillColor('#4B5563').text(
      `Joint field measurements recorded on site for House No. ${prop.houseNumber}, Village ${prop.village}`,
      30,
      50
    );

    // Table 1: Location & Cadastral
    let y2 = 66;
    doc.rect(30, y2, 535, 16).fillAndStroke('#E5E7EB', '#000000');
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#000000').text('1. LOCATION & CADASTRAL PARTICULARS', 36, y2 + 4);
    y2 += 16;

    const locData = [
      ['Owner Full Name', prop.ownerName, 'Contact Number', prop.contactNumber || 'Recorded on File'],
      ['Village / Settlement', prop.village, 'Taluka & District', `${prop.taluka}, Dist. ${prop.district}`],
      ['Property Identification', `House No. ${prop.houseNumber}`, 'Cadastral Reference', `Gat/Survey No. ${prop.surveyNumber}`],
      ['Submergence Category', prop.submergenceType, 'Inspection Date', caseRecord.valuationDate],
    ];

    locData.forEach((row) => {
      doc.rect(30, y2, 535, 18).lineWidth(0.5).strokeColor('#000000').stroke();
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#000000').text(row[0], 36, y2 + 5, { width: 110 });
      doc.fontSize(7.5).font('Helvetica').fillColor('#111827').text(row[1], 150, y2 + 5, { width: 130, lineBreak: false });
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#000000').text(row[2], 295, y2 + 5, { width: 110 });
      doc.fontSize(7.5).font('Helvetica').fillColor('#111827').text(row[3], 410, y2 + 5, { width: 145, lineBreak: false });
      y2 += 18;
    });

    y2 += 10;

    // Table 2: Engineering Construction Particulars
    doc.rect(30, y2, 535, 16).fillAndStroke('#E5E7EB', '#000000');
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#000000').text('2. CONSTRUCTION & STRUCTURAL ENGINEERING SPECIFICATIONS', 36, y2 + 4);
    y2 += 16;

    const engData = [
      ['Structure Classification', struct?.constructionType || 'Class-B BBM Wall with CGI Roof'],
      ['Plinth Area (Measured)', `${struct?.plinthArea || 80.5} Sq.m (${((struct?.plinthArea || 80.5) * 10.7639).toFixed(2)} Sq.ft)`],
      ['Built-up Carpet Area', `${struct?.builtUpArea || 73.01} Sq.m (${((struct?.builtUpArea || 73.01) * 10.7639).toFixed(2)} Sq.ft)`],
      ['Number of Habitable Rooms', `${struct?.numberOfRooms || 4} Rooms`],
      ['Foundation & Plinth', 'Concrete Bedding 1:4:8 over Uncoursed Rubble (UCR) Stone Masonry in CM 1:6'],
      ['Superstructure Walls', struct?.wallType || 'Burnt Brick Masonry (BBM) in Cement Mortar 1:6'],
      ['Roof Framework & Covering', struct?.roofType || 'Teak / Country Wood Truss with Corrugated Galvanized Iron (CGI) Sheets'],
      ['Flooring Type', struct?.floorType || '40mm Thick Cement Concrete 1:2:4 over Bed Concrete 1:4:8'],
      ['Doors, Windows & Fittings', 'Country Wood Frames with Teak Paneled Shutters & MS Safety Iron Fixtures'],
    ];

    engData.forEach((row) => {
      doc.rect(30, y2, 535, 18).lineWidth(0.5).strokeColor('#000000').stroke();
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#000000').text(row[0], 36, y2 + 5, { width: 160 });
      doc.fontSize(7.5).font('Helvetica').fillColor('#111827').text(row[1], 205, y2 + 5, { width: 350, lineBreak: false });
      y2 += 18;
    });

    y2 += 10;

    // Table 3: 7% Y.P. Lifecycle & Depreciation
    doc.rect(30, y2, 535, 16).fillAndStroke('#E5E7EB', '#000000');
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#000000').text("3. STRUCTURE LIFECYCLE & 7% COMPOUND INTEREST YEAR'S PURCHASE (Y.P.) DEPRECIATION", 36, y2 + 4);
    y2 += 16;

    const depData = [
      ['Year of Construction', String(dep.yearOfConstruction), 'Valuation Year', String(dep.valuationYear)],
      ['Present Age of Structure (d)', `${dep.presentLife} Years`, 'Total Estimated Useful Life (D)', `${dep.totalLife} Years`],
      ['Balance Future Life (r = D - d)', `${dep.futureLife} Years`, 'Standard Rate of Interest', '7.00% per annum (Govt. Standard)'],
      ['Y.P. Factor for Future Life (41 yrs)', String(dep.futureLifeYpFactor), 'Y.P. Factor for Total Life (45 yrs)', String(dep.totalLifeYpFactor)],
    ];

    depData.forEach((row) => {
      doc.rect(30, y2, 535, 18).lineWidth(0.5).strokeColor('#000000').stroke();
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#000000').text(row[0], 36, y2 + 5, { width: 150 });
      doc.fontSize(7.5).font('Helvetica').fillColor('#111827').text(row[1], 195, y2 + 5, { width: 85 });
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#000000').text(row[2], 295, y2 + 5, { width: 155 });
      doc.fontSize(7.5).font('Helvetica').fillColor('#111827').text(row[3], 455, y2 + 5, { width: 95 });
      y2 += 18;
    });

    // Formula Box
    y2 += 8;
    doc.rect(30, y2, 535, 42).lineWidth(0.5).strokeColor('#000000').fillAndStroke('#F9FAFB', '#000000');
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#000000').text('Standard Government Depreciation Formula Applied:', 36, y2 + 5);
    doc.fontSize(7.5).font('Helvetica').fillColor('#111827').text(
      `Depreciation Ratio = Y.P. (Future Life ${dep.futureLife} yrs @ 7%) ÷ Y.P. (Total Life ${dep.totalLife} yrs @ 7%) = ${dep.futureLifeYpFactor} ÷ ${dep.totalLifeYpFactor} = ${dep.depreciationFactor.toFixed(7)}`,
      36,
      y2 + 16
    );
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#000000').text(
      `Primary Depreciated Value = Present Construction Cost (Rs. ${dep.presentEstimatedCost.toLocaleString('en-IN')}) × ${dep.depreciationFactor.toFixed(7)} = Rs. ${dep.depreciatedValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      36,
      y2 + 28
    );

    // =========================================================================
    // PAGE 3: FORM NO. 3 (AB SHEET) — DETAILED ABSTRACT ESTIMATE (CSR 2014-15)
    // =========================================================================
    doc.addPage({ size: 'A4', margins: { top: 25, bottom: 25, left: 30, right: 30 } });
    drawPageHeader('FORM AB-01 (ABSTRACT ESTIMATE)', 'PAGE 3');
    drawPageFooter(3);

    doc.fontSize(10.5).font('Helvetica-Bold').fillColor('#000000').text(
      'ABSTRACT ESTIMATE OF RESIDENTIAL STRUCTURE (AB SHEET)',
      30,
      38
    );
    doc.fontSize(7.5).font('Helvetica').fillColor('#4B5563').text(
      'Work item measurements priced strictly in accordance with Public Works Department CSR 2014-15 (Amravati / Buldhana Circle)',
      30,
      50
    );

    // Table Header
    let y3 = 66;
    const colX3 = { sr: 30, desc: 58, qty: 335, unit: 380, rate: 430, amt: 490, end: 565 };

    doc.rect(30, y3, 535, 18).fillAndStroke('#E5E7EB', '#000000');
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#000000');
    doc.text('Item', colX3.sr + 4, y3 + 5);
    doc.text('Standard Description of Work Item (PWD CSR 2014-15)', colX3.desc + 4, y3 + 5);
    doc.text('Quantity', colX3.qty, y3 + 5, { width: 40, align: 'right' });
    doc.text('Unit', colX3.unit + 6, y3 + 5);
    doc.text('Rate (Rs)', colX3.rate, y3 + 5, { width: 55, align: 'right' });
    doc.text('Amount (Rs)', colX3.amt, y3 + 5, { width: 70, align: 'right' });
    y3 += 18;

    // Table Rows (All 18 items fit cleanly on one single page)
    estimateItems.forEach((item) => {
      const rH = 18.5;
      doc.rect(30, y3, 535, rH).lineWidth(0.5).strokeColor('#9CA3AF').stroke();

      doc.fontSize(7).font('Helvetica-Bold').fillColor('#000000').text(String(item.itemNumber), colX3.sr + 4, y3 + 5);
      doc.fontSize(7).font('Helvetica').fillColor('#111827').text(item.description, colX3.desc + 4, y3 + 5, { width: 270, lineBreak: false });
      doc.text(item.quantity.toFixed(2), colX3.qty, y3 + 5, { width: 40, align: 'right' });
      doc.text(item.unit, colX3.unit + 6, y3 + 5);
      doc.text(item.rate.toFixed(2), colX3.rate, y3 + 5, { width: 55, align: 'right' });
      doc.font('Helvetica-Bold').text(item.amount.toFixed(2), colX3.amt, y3 + 5, { width: 70, align: 'right' });

      y3 += rH;
    });

    // Grand Total
    doc.rect(30, y3, 535, 22).lineWidth(1).strokeColor('#000000').fillAndStroke('#F3F4F6', '#000000');
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#000000').text('GRAND TOTAL OF PRIMARY ABSTRACT ESTIMATE (CSR 2014-15):', 40, y3 + 6);
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#000000').text(
      `Rs. ${dep.presentEstimatedCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      colX3.amt - 20,
      y3 + 6,
      { width: 90, align: 'right' }
    );

    y3 += 28;
    doc.rect(30, y3, 535, 24).lineWidth(0.5).strokeColor('#000000').fillAndStroke('#FFFFFF', '#000000');
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#000000').text('Amount in Words:', 36, y3 + 4);
    doc.fontSize(7.5).font('Helvetica').fillColor('#111827').text(
      numberToIndianWords(dep.presentEstimatedCost),
      36,
      y3 + 13,
      { width: 520 }
    );

    // =========================================================================
    // PAGE 4: FORM NO. 4 (RA SHEET) — RECAPITULATION & SPOT PANCHANAMA
    // =========================================================================
    doc.addPage({ size: 'A4', margins: { top: 25, bottom: 25, left: 30, right: 30 } });
    drawPageHeader('FORM RA-01 (RECAPITULATION & PANCHANAMA)', 'PAGE 4');
    drawPageFooter(4);

    doc.fontSize(10.5).font('Helvetica-Bold').fillColor('#000000').text(
      'MASTER RECAPITULATION STATEMENT & SPOT PANCHANAMA (FINAL RA SHEET)',
      30,
      38
    );
    doc.fontSize(7.5).font('Helvetica').fillColor('#4B5563').text(
      'Comprehensive final valuation statement summarizing depreciated structural value, salvage materials, and witness endorsements',
      30,
      50
    );

    // Recapitulation Table
    let y4 = 66;
    doc.rect(30, y4, 535, 16).fillAndStroke('#E5E7EB', '#000000');
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#000000');
    doc.text('Sr.', 36, y4 + 4);
    doc.text('Valuation Step & Work Category Description', 65, y4 + 4);
    doc.text('Amount in Rs.', 465, y4 + 4, { width: 95, align: 'right' });
    y4 += 16;

    const recapData = [
      { sr: '1', desc: 'Primary Abstract Cost of Construction (18 Items priced @ PWD CSR 2014-15)', amt: `Rs. ${finalValuation.primaryEstimateTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
      { sr: '2', desc: 'Primary Depreciated Structure Value [Cost × YP(41y: 13.394) ÷ YP(45y: 13.606)]', amt: `Rs. ${finalValuation.primaryDepreciatedValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
      { sr: '3', desc: 'Second Valuation (Salvage / Reusable Materials Abstract Total)', amt: `Rs. ${finalValuation.salvageEstimateTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
      { sr: '4', desc: 'Salvage Depreciated Structure Value [Salvage Cost × 13.394 ÷ 13.606]', amt: `Rs. ${finalValuation.salvageDepreciatedValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
      { sr: '5', desc: `Less: Configured Salvage Adjustment Deduction (${finalValuation.adjustmentPercentage.toFixed(1)}% of Salvage Depreciated)`, amt: `- Rs. ${finalValuation.adjustmentAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
    ];

    recapData.forEach((row) => {
      doc.rect(30, y4, 535, 20).lineWidth(0.5).strokeColor('#000000').stroke();
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#000000').text(row.sr, 36, y4 + 5);
      doc.fontSize(7.5).font('Helvetica').fillColor('#111827').text(row.desc, 65, y4 + 5, { width: 380 });
      doc.font('Helvetica-Bold').text(row.amt, 445, y4 + 5, { width: 115, align: 'right' });
      y4 += 20;
    });

    // Final Net Award Row
    doc.rect(30, y4, 535, 24).lineWidth(1).strokeColor('#000000').fillAndStroke('#F3F4F6', '#000000');
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#000000').text('FINAL NET PAYABLE VALUATION & REHABILITATION AWARD:', 40, y4 + 7);
    doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#000000').text(
      `Rs. ${finalValuation.finalValuationAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      425,
      y4 + 7,
      { width: 135, align: 'right' }
    );

    y4 += 32;

    // Spot Panchanama
    doc.rect(30, y4, 535, 16).fillAndStroke('#E5E7EB', '#000000');
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#000000').text('2. SPOT PANCHANAMA & FIELD INSPECTION STATEMENT', 36, y4 + 4);
    y4 += 16;

    doc.rect(30, y4, 535, 52).lineWidth(0.5).strokeColor('#000000').fillAndStroke('#FFFFFF', '#000000');
    doc.fontSize(7.5).font('Helvetica').fillColor('#111827').text(
      panchanama.generalRemarks || panchanama.remarks ||
      `Today on ${caseRecord.valuationDate}, the joint valuation inspection of House No. ${prop.houseNumber} belonging to Shri/Smt. ${prop.ownerName} was conducted at Village ${prop.village} in the presence of the undersigned panchas and village authorities. All room measurements, structural timber, roofing sheets, masonry conditions, and salvageable elements have been recorded accurately and agreed upon without dispute.`,
      36,
      y4 + 6,
      { width: 520, align: 'justify', lineGap: 2 }
    );

    y4 += 60;

    // Panchas Attestation Table
    doc.rect(30, y4, 535, 16).fillAndStroke('#E5E7EB', '#000000');
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#000000').text('3. PANCHAS & LOCAL WITNESS ATTESTATION', 36, y4 + 4);
    y4 += 16;

    panchanama.panchas.forEach((p: any, idx: number) => {
      doc.rect(30, y4, 535, 20).lineWidth(0.5).strokeColor('#000000').stroke();
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#000000').text(`Witness ${idx + 1}:`, 36, y4 + 5);
      doc.fontSize(7.5).font('Helvetica').fillColor('#111827').text(`${p.name}, Residing at: ${p.address}`, 100, y4 + 5, { width: 330 });
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#000000').text('[ Signed on Site ]', 450, y4 + 5, { width: 110, align: 'right' });
      y4 += 20;
    });

    y4 += 30;

    // Signatures Block
    doc.lineWidth(0.5).strokeColor('#000000');

    doc.moveTo(40, y4).lineTo(180, y4).stroke();
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#000000').text('Sectional Engineer (S.E.)', 40, y4 + 4);
    doc.fontSize(7).font('Helvetica').fillColor('#4B5563').text('Prepared on Site', 40, y4 + 14);

    doc.moveTo(225, y4).lineTo(365, y4).stroke();
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#000000').text('Assistant Engineer (A.E. Gr-I)', 225, y4 + 4);
    doc.fontSize(7).font('Helvetica').fillColor('#4B5563').text('Verified & Checked', 225, y4 + 14);

    doc.moveTo(410, y4).lineTo(550, y4).stroke();
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#000000').text('Executive Engineer (E.E.)', 410, y4 + 4);
    doc.fontSize(7).font('Helvetica').fillColor('#4B5563').text('Sanctioned & Sanction Authority', 410, y4 + 14);

    doc.end();
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};
