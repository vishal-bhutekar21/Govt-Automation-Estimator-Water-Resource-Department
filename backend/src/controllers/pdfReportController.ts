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
      margins: { top: 35, bottom: 35, left: 35, right: 35 },
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

    // Color Palette
    const C_NAVY = '#0B2545';
    const C_SLATE_DARK = '#1E293B';
    const C_SLATE_MID = '#475569';
    const C_SLATE_LIGHT = '#94A3B8';
    const C_BG_LIGHT = '#F8FAFC';
    const C_BG_CARD = '#F1F5F9';
    const C_GOLD_ACCENT = '#B45309';

    // Helper: Page Running Header & Footer
    const drawRunningHeaderFooter = (pageNumber: number, totalPages: number, pageTitle: string) => {
      // Header
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(C_NAVY).text(
        'GOVERNMENT OF MAHARASHTRA • WATER RESOURCES DEPARTMENT',
        35,
        22,
        { width: 525, align: 'left' }
      );
      doc.fontSize(7.5).font('Helvetica').fillColor(C_SLATE_MID).text(
        pageTitle,
        35,
        22,
        { width: 525, align: 'right' }
      );
      doc.lineWidth(0.5).strokeColor(C_SLATE_LIGHT).moveTo(35, 33).lineTo(560, 33).stroke();

      // Footer
      doc.lineWidth(0.5).strokeColor(C_SLATE_LIGHT).moveTo(35, 805).lineTo(560, 805).stroke();
      doc.fontSize(7).font('Helvetica').fillColor(C_SLATE_MID).text(
        `Jigaon Major Irrigation Project Sub-Division No. 2, Nandura • LA Case: ${prop.laCaseNumber} (House No. ${prop.houseNumber})`,
        35,
        812,
        { width: 400, align: 'left' }
      );
      doc.fontSize(7).font('Helvetica-Bold').fillColor(C_NAVY).text(
        `Page ${pageNumber} of ${totalPages}`,
        460,
        812,
        { width: 100, align: 'right' }
      );
    };

    // ==========================================
    // PAGE 1: OFFICIAL COVER & VALUATION CERTIFICATE
    // ==========================================
    // Outer Formal Double Border
    doc.lineWidth(1.25).rect(32, 28, 531, 786).stroke(C_NAVY);
    doc.lineWidth(0.5).rect(35, 31, 525, 780).stroke(C_SLATE_LIGHT);

    // Official Header
    doc.moveDown(0.5);
    doc.fontSize(13).font('Helvetica-Bold').fillColor(C_NAVY).text('GOVERNMENT OF MAHARASHTRA', { align: 'center' });
    doc.fontSize(10.5).font('Helvetica-Bold').fillColor(C_SLATE_DARK).text('WATER RESOURCES DEPARTMENT', { align: 'center' });
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor(C_SLATE_MID).text('OFFICE OF THE EXECUTIVE ENGINEER, JIGAON PROJECT DIVISION, NANDURA', { align: 'center' });
    doc.fontSize(7.5).font('Helvetica').fillColor(C_SLATE_MID).text('DISTRICT: BULDHANA • MAHARASHTRA STATE | PWD CSR 2014-15 STANDARD', { align: 'center' });
    doc.moveDown(0.6);

    // Decorative Line
    doc.lineWidth(1).strokeColor(C_NAVY).moveTo(50, 95).lineTo(545, 95).stroke();

    // Document Title Banner
    doc.rect(50, 104, 495, 26).fillAndStroke(C_NAVY, C_NAVY);
    doc.fontSize(10.5).font('Helvetica-Bold').fillColor('#FFFFFF').text('FINAL VALUATION CERTIFICATE & REHABILITATION AWARD', 50, 112, { align: 'center' });

    // Property Metadata Table
    const startY = 138;
    const tableWidth = 495;
    const colW1 = 120;
    const colW2 = 127.5;
    const colW3 = 120;
    const colW4 = 127.5;

    doc.rect(50, startY, tableWidth, 96).fillAndStroke(C_BG_LIGHT, C_SLATE_LIGHT);

    const metaRows = [
      [
        { label: 'Project Name:', val: project?.projectName || 'Jigaon Major Irrigation Project' },
        { label: 'LA Case No.:', val: prop.laCaseNumber },
      ],
      [
        { label: 'Name of Owner:', val: prop.ownerName },
        { label: 'Gat / Survey No.:', val: prop.surveyNumber || 'N/A' },
      ],
      [
        { label: 'House No. & Village:', val: `House No. ${prop.houseNumber}, ${prop.village}` },
        { label: 'Taluka & District:', val: `${prop.taluka}, Dist. ${prop.district}` },
      ],
      [
        { label: 'Structure Type:', val: struct?.constructionType || 'Class-B BBM Wall + CGI Roof' },
        { label: 'Valuation Date:', val: caseRecord.valuationDate },
      ],
    ];

    let rowY = startY;
    metaRows.forEach((row, rIdx) => {
      // Horizontal row divider
      if (rIdx > 0) {
        doc.lineWidth(0.5).strokeColor(C_SLATE_LIGHT).moveTo(50, rowY).lineTo(545, rowY).stroke();
      }

      // Vertical mid divider
      doc.lineWidth(0.5).strokeColor(C_SLATE_LIGHT).moveTo(50 + colW1 + colW2, rowY).lineTo(50 + colW1 + colW2, rowY + 24).stroke();

      // Col 1 & 2
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(C_NAVY).text(row[0].label, 56, rowY + 7, { width: colW1 - 10 });
      doc.fontSize(7.5).font('Helvetica').fillColor(C_SLATE_DARK).text(row[0].val, 50 + colW1, rowY + 7, { width: colW2 - 8, lineBreak: false });

      // Col 3 & 4
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(C_NAVY).text(row[1].label, 50 + colW1 + colW2 + 6, rowY + 7, { width: colW3 - 10 });
      doc.fontSize(7.5).font('Helvetica').fillColor(C_SLATE_DARK).text(row[1].val, 50 + colW1 + colW2 + colW3, rowY + 7, { width: colW4 - 8, lineBreak: false });

      rowY += 24;
    });

    // Formal Certification Statement Card
    doc.rect(50, 244, 495, 125).fillAndStroke('#FFFFFF', C_SLATE_LIGHT);
    doc.rect(50, 244, 495, 18).fill(C_BG_CARD);
    doc.fontSize(8).font('Helvetica-Bold').fillColor(C_NAVY).text('OFFICIAL STATUTORY CERTIFICATION', 58, 249);

    doc.fontSize(8.5).font('Helvetica').fillColor(C_SLATE_DARK);
    doc.text(
      `1. This is to officially certify that the residential immovable property belonging to Shri/Smt. ${prop.ownerName}, situated at Village ${prop.village}, Taluka ${prop.taluka}, District ${prop.district}, bearing House No. ${prop.houseNumber} (Gat/Survey No. ${prop.surveyNumber}), affected due to full submergence under ${project?.projectName}, has been thoroughly inspected, surveyed, and measured on site by the joint valuation committee.`,
      60,
      270,
      { width: 475, align: 'justify', lineGap: 2.5 }
    );

    doc.text(
      `2. The valuation estimation has been computed strictly in accordance with Public Works Department Common Schedule of Rates (PWD CSR 2014-15) and standard government compound interest Year's Purchase (7% Y.P.) depreciation principles, with applicable salvage adjustments.`,
      60,
      325,
      { width: 475, align: 'justify', lineGap: 2.5 }
    );

    // Highlighted Final Award Box
    doc.rect(50, 380, 495, 85).fillAndStroke(C_NAVY, C_NAVY);
    doc.rect(54, 384, 487, 77).stroke('#FFFFFF');
    doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#E2E8F0').text('FINAL NET PAYABLE VALUATION & COMPENSATION AMOUNT', 60, 395, { align: 'center' });
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#FFFFFF').text(
      `Rs. ${finalValuation.finalValuationAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      60,
      413,
      { align: 'center' }
    );
    doc.fontSize(8).font('Helvetica-Oblique').fillColor('#CBD5E1').text(
      `(${amountInWords})`,
      60,
      441,
      { align: 'center', width: 475 }
    );

    // Summary Comparison Table
    doc.rect(50, 475, 495, 52).fillAndStroke(C_BG_LIGHT, C_SLATE_LIGHT);
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor(C_NAVY);
    doc.text('Cost Component Summary', 58, 482);
    doc.text('Primary Estimate (CSR):', 58, 498);
    doc.font('Helvetica').text(`Rs. ${finalValuation.primaryEstimateTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 165, 498);

    doc.font('Helvetica-Bold').text('Primary Depreciated:', 260, 498);
    doc.font('Helvetica').text(`Rs. ${finalValuation.primaryDepreciatedValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 355, 498);

    doc.font('Helvetica-Bold').text('Salvage Net Deduction:', 58, 512);
    doc.font('Helvetica').text(`Rs. ${finalValuation.adjustmentAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${finalValuation.adjustmentPercentage.toFixed(1)}%)`, 165, 512);

    doc.font('Helvetica-Bold').text('Net Payable Compensation:', 260, 512);
    doc.font('Helvetica-Bold').fillColor(C_GOLD_ACCENT).text(`Rs. ${finalValuation.finalValuationAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 355, 512);

    // 3-Tier Official Sanction Signatures
    const sigY = 675;
    doc.lineWidth(0.75).strokeColor(C_SLATE_DARK);

    // Sig Col 1
    doc.moveTo(55, sigY).lineTo(190, sigY).stroke();
    doc.fontSize(8).font('Helvetica-Bold').fillColor(C_NAVY).text('Prepared By:', 55, sigY + 5);
    doc.fontSize(7.5).font('Helvetica').fillColor(C_SLATE_DARK).text('Sectional Engineer (S.E.)', 55, sigY + 17);
    doc.fontSize(7).font('Helvetica').fillColor(C_SLATE_MID).text('Irrigation Sub-Division No. 2\nNandura, Dist. Buldhana', 55, sigY + 28);
    doc.rect(55, sigY + 54, 50, 20).stroke(C_SLATE_LIGHT);
    doc.fontSize(6).font('Helvetica').fillColor(C_SLATE_MID).text('OFFICIAL SEAL', 58, sigY + 61);

    // Sig Col 2
    doc.moveTo(225, sigY).lineTo(365, sigY).stroke();
    doc.fontSize(8).font('Helvetica-Bold').fillColor(C_NAVY).text('Checked & Verified By:', 225, sigY + 5);
    doc.fontSize(7.5).font('Helvetica').fillColor(C_SLATE_DARK).text('Assistant Engineer (A.E. Gr-I)', 225, sigY + 17);
    doc.fontSize(7).font('Helvetica').fillColor(C_SLATE_MID).text('Irrigation Sub-Division No. 2\nNandura, Dist. Buldhana', 225, sigY + 28);
    doc.rect(225, sigY + 54, 50, 20).stroke(C_SLATE_LIGHT);
    doc.fontSize(6).font('Helvetica').fillColor(C_SLATE_MID).text('OFFICIAL SEAL', 228, sigY + 61);

    // Sig Col 3
    doc.moveTo(400, sigY).lineTo(540, sigY).stroke();
    doc.fontSize(8).font('Helvetica-Bold').fillColor(C_NAVY).text('Sanctioned & Approved By:', 400, sigY + 5);
    doc.fontSize(7.5).font('Helvetica').fillColor(C_SLATE_DARK).text('Executive Engineer (E.E.)', 400, sigY + 17);
    doc.fontSize(7).font('Helvetica').fillColor(C_SLATE_MID).text('Jigaon Project Division\nNandura, Dist. Buldhana', 400, sigY + 28);
    doc.rect(400, sigY + 54, 50, 20).stroke(C_SLATE_LIGHT);
    doc.fontSize(6).font('Helvetica').fillColor(C_SLATE_MID).text('OFFICIAL SEAL', 403, sigY + 61);

    // ==========================================
    // PAGE 2: FC SHEET - DETAILED STRUCTURAL PARTICULARS
    // ==========================================
    doc.addPage();
    drawRunningHeaderFooter(2, 4, 'ANNEXURE-I: FC SHEET (STRUCTURAL PARTICULARS)');

    doc.fontSize(11).font('Helvetica-Bold').fillColor(C_NAVY).text(
      'ANNEXURE-I: STRUCTURAL PARTICULARS & LIFECYCLE VALUATION (FC SHEET)',
      35,
      45,
      { underline: false }
    );
    doc.fontSize(7.5).font('Helvetica').fillColor(C_SLATE_MID).text(
      `Detailed technical specifications recorded during joint field inspection for House No. ${prop.houseNumber}`,
      35,
      59
    );

    // Section 1: Property Location Particulars Table
    let curY = 75;
    doc.rect(35, curY, 525, 18).fill(C_NAVY);
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#FFFFFF').text('1. PROPERTY LOCATION & CADASTRAL PARTICULARS', 42, curY + 5);
    curY += 18;

    const propSpecs = [
      ['Owner Full Name', prop.ownerName, 'Contact Number', prop.contactNumber || 'Recorded on File'],
      ['Village / Settlement', prop.village, 'Taluka & District', `${prop.taluka}, Dist. ${prop.district}`],
      ['Property Identification', `House No. ${prop.houseNumber}`, 'Cadastral Reference', `Gat/Survey No. ${prop.surveyNumber}`],
      ['Submergence Category', prop.submergenceType, 'Inspection Date', caseRecord.valuationDate],
    ];

    propSpecs.forEach((r, idx) => {
      doc.rect(35, curY, 525, 20).fillAndStroke(idx % 2 === 0 ? '#FFFFFF' : C_BG_LIGHT, C_SLATE_LIGHT);
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(C_NAVY).text(r[0], 42, curY + 6, { width: 110 });
      doc.fontSize(7.5).font('Helvetica').fillColor(C_SLATE_DARK).text(r[1], 155, curY + 6, { width: 130, lineBreak: false });
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(C_NAVY).text(r[2], 295, curY + 6, { width: 110 });
      doc.fontSize(7.5).font('Helvetica').fillColor(C_SLATE_DARK).text(r[3], 410, curY + 6, { width: 140, lineBreak: false });
      curY += 20;
    });

    curY += 12;

    // Section 2: Construction & Architectural Particulars Table
    doc.rect(35, curY, 525, 18).fill(C_NAVY);
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#FFFFFF').text('2. CONSTRUCTION & STRUCTURAL ENGINEERING SPECIFICATIONS', 42, curY + 5);
    curY += 18;

    const structSpecs = [
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

    structSpecs.forEach((r, idx) => {
      doc.rect(35, curY, 525, 20).fillAndStroke(idx % 2 === 0 ? '#FFFFFF' : C_BG_LIGHT, C_SLATE_LIGHT);
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(C_NAVY).text(r[0], 42, curY + 6, { width: 160 });
      doc.fontSize(7.5).font('Helvetica').fillColor(C_SLATE_DARK).text(r[1], 205, curY + 6, { width: 345, lineBreak: false });
      curY += 20;
    });

    curY += 12;

    // Section 3: Compound Interest 7% Y.P. Depreciation Table
    doc.rect(35, curY, 525, 18).fill(C_NAVY);
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#FFFFFF').text("3. STRUCTURE LIFECYCLE & 7% COMPOUND INTEREST YEAR'S PURCHASE (Y.P.) DEPRECIATION", 42, curY + 5);
    curY += 18;

    const depRows = [
      ['Year of Construction', String(dep.yearOfConstruction), 'Valuation Year', String(dep.valuationYear)],
      ['Present Age of Structure (d)', `${dep.presentLife} Years`, 'Total Estimated Useful Life (D)', `${dep.totalLife} Years`],
      ['Balance Future Life (r = D - d)', `${dep.futureLife} Years`, 'Standard Rate of Interest', '7.00% per annum (Govt. Standard)'],
      ['Y.P. Factor for Future Life (41 yrs)', String(dep.futureLifeYpFactor), 'Y.P. Factor for Total Life (45 yrs)', String(dep.totalLifeYpFactor)],
    ];

    depRows.forEach((r, idx) => {
      doc.rect(35, curY, 525, 20).fillAndStroke(idx % 2 === 0 ? '#FFFFFF' : C_BG_LIGHT, C_SLATE_LIGHT);
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(C_NAVY).text(r[0], 42, curY + 6, { width: 150 });
      doc.fontSize(7.5).font('Helvetica').fillColor(C_SLATE_DARK).text(r[1], 195, curY + 6, { width: 85 });
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(C_NAVY).text(r[2], 295, curY + 6, { width: 155 });
      doc.fontSize(7.5).font('Helvetica').fillColor(C_SLATE_DARK).text(r[3], 455, curY + 6, { width: 95 });
      curY += 20;
    });

    // Formula Explanation Card
    curY += 6;
    doc.rect(35, curY, 525, 48).fillAndStroke(C_BG_CARD, C_SLATE_LIGHT);
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor(C_NAVY).text('Government Valuation Formula Applied:', 42, curY + 6);
    doc.fontSize(7.5).font('Helvetica').fillColor(C_SLATE_DARK).text(
      `Depreciation Ratio = Y.P. (Future Life ${dep.futureLife} yrs @ 7%) ÷ Y.P. (Total Life ${dep.totalLife} yrs @ 7%) = ${dep.futureLifeYpFactor} ÷ ${dep.totalLifeYpFactor} = ${dep.depreciationFactor.toFixed(7)}`,
      42,
      curY + 18
    );
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor(C_GOLD_ACCENT).text(
      `Primary Depreciated Value = Present Construction Cost (Rs. ${dep.presentEstimatedCost.toLocaleString('en-IN')}) × ${dep.depreciationFactor.toFixed(7)} = Rs. ${dep.depreciatedValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      42,
      curY + 31
    );

    // ==========================================
    // PAGE 3: AB SHEET - ABSTRACT ESTIMATE (CSR 2014-15)
    // ==========================================
    doc.addPage();
    drawRunningHeaderFooter(3, 4, 'ANNEXURE-II: AB SHEET (ABSTRACT ESTIMATE)');

    doc.fontSize(11).font('Helvetica-Bold').fillColor(C_NAVY).text(
      'ANNEXURE-II: DETAILED ABSTRACT ESTIMATE OF CONSTRUCTION (AB SHEET)',
      35,
      45
    );
    doc.fontSize(7.5).font('Helvetica').fillColor(C_SLATE_MID).text(
      'Work item measurements priced strictly in accordance with Public Works Department CSR 2014-15 (Amravati / Buldhana Circle)',
      35,
      59
    );

    // Table Header
    curY = 75;
    const colX = {
      sr: 35,
      desc: 65,
      qty: 335,
      unit: 380,
      rate: 430,
      amt: 490,
      end: 560,
    };

    doc.rect(35, curY, 525, 20).fill(C_NAVY);
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#FFFFFF');
    doc.text('Item', colX.sr + 4, curY + 6);
    doc.text('Standard Description of Work Item (CSR 2014-15)', colX.desc + 4, curY + 6);
    doc.text('Quantity', colX.qty, curY + 6, { width: 40, align: 'right' });
    doc.text('Unit', colX.unit + 8, curY + 6);
    doc.text('Rate (Rs)', colX.rate, curY + 6, { width: 55, align: 'right' });
    doc.text('Amount (Rs)', colX.amt, curY + 6, { width: 65, align: 'right' });

    curY += 20;

    // Items Loop
    estimateItems.forEach((item, idx) => {
      const rowHeight = 22;
      const isAlt = idx % 2 === 1;

      doc.rect(35, curY, 525, rowHeight).fillAndStroke(isAlt ? C_BG_LIGHT : '#FFFFFF', C_SLATE_LIGHT);

      doc.fontSize(7).font('Helvetica-Bold').fillColor(C_NAVY).text(String(item.itemNumber), colX.sr + 6, curY + 6);
      doc.fontSize(7).font('Helvetica').fillColor(C_SLATE_DARK).text(item.description, colX.desc + 4, curY + 6, { width: 260, lineBreak: false });
      doc.text(item.quantity.toFixed(2), colX.qty, curY + 6, { width: 40, align: 'right' });
      doc.text(item.unit, colX.unit + 8, curY + 6);
      doc.text(item.rate.toFixed(2), colX.rate, curY + 6, { width: 55, align: 'right' });
      doc.font('Helvetica-Bold').text(item.amount.toFixed(2), colX.amt, curY + 6, { width: 65, align: 'right' });

      curY += rowHeight;
    });

    // Grand Total Row
    doc.rect(35, curY, 525, 24).fillAndStroke(C_NAVY, C_NAVY);
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#FFFFFF').text('GRAND TOTAL OF PRIMARY ABSTRACT ESTIMATE (CSR 2014-15):', 45, curY + 7);
    doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#FFFFFF').text(
      `Rs. ${dep.presentEstimatedCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      colX.amt - 20,
      curY + 7,
      { width: 85, align: 'right' }
    );

    curY += 32;
    doc.rect(35, curY, 525, 30).fillAndStroke(C_BG_CARD, C_SLATE_LIGHT);
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor(C_NAVY).text('Amount in Words:', 42, curY + 6);
    doc.fontSize(7.5).font('Helvetica-Oblique').fillColor(C_SLATE_DARK).text(
      numberToIndianWords(dep.presentEstimatedCost),
      42,
      curY + 17,
      { width: 510 }
    );

    // ==========================================
    // PAGE 4: RA SHEET - RECAPITULATION & PANCHANAMA
    // ==========================================
    doc.addPage();
    drawRunningHeaderFooter(4, 4, 'ANNEXURE-III: RA SHEET (RECAPITULATION & PANCHANAMA)');

    doc.fontSize(11).font('Helvetica-Bold').fillColor(C_NAVY).text(
      'ANNEXURE-III: MASTER RECAPITULATION STATEMENT & SPOT PANCHANAMA (RA SHEET)',
      35,
      45
    );
    doc.fontSize(7.5).font('Helvetica').fillColor(C_SLATE_MID).text(
      'Comprehensive final valuation statement summarizing depreciated structural value, salvage materials, and witness endorsements',
      35,
      59
    );

    // Section 1: Recapitulation Table
    curY = 75;
    doc.rect(35, curY, 525, 18).fill(C_NAVY);
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#FFFFFF');
    doc.text('Sr.', 42, curY + 5);
    doc.text('Valuation Step & Work Category Description', 70, curY + 5);
    doc.text('Amount in Rs.', 460, curY + 5, { width: 90, align: 'right' });
    curY += 18;

    const recapRows = [
      { sr: '1', desc: 'Primary Abstract Cost of Construction (18 Items priced @ PWD CSR 2014-15)', amt: `Rs. ${finalValuation.primaryEstimateTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
      { sr: '2', desc: `Primary Depreciated Structure Value [Cost × YP(41y: 13.394) ÷ YP(45y: 13.606)]`, amt: `Rs. ${finalValuation.primaryDepreciatedValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
      { sr: '3', desc: 'Second Valuation (Salvage / Reusable Materials Abstract Total)', amt: `Rs. ${finalValuation.salvageEstimateTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
      { sr: '4', desc: 'Salvage Depreciated Structure Value [Salvage Cost × 13.394 ÷ 13.606]', amt: `Rs. ${finalValuation.salvageDepreciatedValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
      { sr: '5', desc: `Less: Configured Salvage Adjustment Deduction (${finalValuation.adjustmentPercentage.toFixed(1)}% of Salvage Depreciated)`, amt: `- Rs. ${finalValuation.adjustmentAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
    ];

    recapRows.forEach((row, idx) => {
      doc.rect(35, curY, 525, 22).fillAndStroke(idx % 2 === 0 ? '#FFFFFF' : C_BG_LIGHT, C_SLATE_LIGHT);
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(C_NAVY).text(row.sr, 42, curY + 6);
      doc.fontSize(7.5).font('Helvetica').fillColor(C_SLATE_DARK).text(row.desc, 70, curY + 6, { width: 380 });
      doc.font('Helvetica-Bold').text(row.amt, 440, curY + 6, { width: 110, align: 'right' });
      curY += 22;
    });

    // Final Net Award Row
    doc.rect(35, curY, 525, 26).fillAndStroke(C_NAVY, C_NAVY);
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#FFFFFF').text('FINAL NET PAYABLE VALUATION & REHABILITATION AWARD:', 50, curY + 8);
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#FFFFFF').text(
      `Rs. ${finalValuation.finalValuationAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      430,
      curY + 8,
      { width: 120, align: 'right' }
    );

    curY += 36;

    // Section 2: Spot Panchanama Statement
    doc.rect(35, curY, 525, 18).fill(C_NAVY);
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#FFFFFF').text('2. SPOT PANCHANAMA & FIELD VERIFICATION STATEMENT', 42, curY + 5);
    curY += 18;

    doc.rect(35, curY, 525, 60).fillAndStroke('#FFFFFF', C_SLATE_LIGHT);
    doc.fontSize(8).font('Helvetica').fillColor(C_SLATE_DARK).text(
      panchanama.generalRemarks || panchanama.remarks ||
      `Today on ${caseRecord.valuationDate}, the joint valuation inspection of House No. ${prop.houseNumber} belonging to Shri/Smt. ${prop.ownerName} was conducted at Village ${prop.village} in the presence of the undersigned panchas and village authorities. All room measurements, structural timber, roofing sheets, masonry conditions, and salvageable elements have been recorded accurately and agreed upon without dispute.`,
      42,
      curY + 8,
      { width: 510, align: 'justify', lineGap: 2 }
    );

    curY += 68;

    // Section 3: Panchas / Witness Endorsement Table
    doc.rect(35, curY, 525, 18).fill(C_NAVY);
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#FFFFFF').text('3. PANCHAS & LOCAL WITNESS ATTESTATION', 42, curY + 5);
    curY += 18;

    panchanama.panchas.forEach((p: any, idx: number) => {
      doc.rect(35, curY, 525, 24).fillAndStroke(idx % 2 === 0 ? '#FFFFFF' : C_BG_LIGHT, C_SLATE_LIGHT);
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(C_NAVY).text(`Witness ${idx + 1}:`, 42, curY + 7);
      doc.fontSize(7.5).font('Helvetica').fillColor(C_SLATE_DARK).text(`${p.name}, Residing at: ${p.address}`, 100, curY + 7, { width: 330 });
      doc.fontSize(7).font('Helvetica-Bold').fillColor(C_NAVY).text('[ Signed & Attested ]', 445, curY + 7, { width: 105, align: 'right' });
      curY += 24;
    });

    curY += 25;

    // Signatures Block
    doc.lineWidth(0.75).strokeColor(C_SLATE_DARK);

    doc.moveTo(45, curY).lineTo(180, curY).stroke();
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor(C_NAVY).text('Sectional Engineer (S.E.)', 45, curY + 5);
    doc.fontSize(7).font('Helvetica').fillColor(C_SLATE_MID).text('Prepared on Site', 45, curY + 16);

    doc.moveTo(225, curY).lineTo(360, curY).stroke();
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor(C_NAVY).text('Assistant Engineer (A.E. Gr-I)', 225, curY + 5);
    doc.fontSize(7).font('Helvetica').fillColor(C_SLATE_MID).text('Verified & Checked', 225, curY + 16);

    doc.moveTo(405, curY).lineTo(545, curY).stroke();
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor(C_NAVY).text('Executive Engineer (E.E.)', 405, curY + 5);
    doc.fontSize(7).font('Helvetica').fillColor(C_SLATE_MID).text('Sanctioned & Sanction Authority', 405, curY + 16);

    doc.end();
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};
