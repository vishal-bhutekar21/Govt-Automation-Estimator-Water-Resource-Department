import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/db';
import { AuthRequest } from '../middleware/auth';
import { SalvageEstimate, FinalValuation, EstimateItem } from '../models/types';
import { DecimalMath } from '../utils/decimal';
import { calculateCaseDepreciation } from './depreciationController';

// Helper to convert number to Indian Currency Words
export const numberToIndianWords = (num: number): string => {
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertTens = (n: number): string => {
    if (n < 20) return a[n];
    return b[Math.floor(n / 10)] + (n % 10 !== 0 ? '-' + a[n % 10] : '');
  };

  const convertHundreds = (n: number): string => {
    let str = '';
    if (Math.floor(n / 100) > 0) {
      str += a[Math.floor(n / 100)] + ' Hundred ';
    }
    const rem = n % 100;
    if (rem > 0) {
      str += convertTens(rem);
    }
    return str.trim();
  };

  const parts = num.toFixed(2).split('.');
  let integerPart = parseInt(parts[0], 10);
  const paisePart = parseInt(parts[1], 10);

  if (integerPart === 0 && paisePart === 0) return 'Rupees Zero Only';

  let result = '';

  const crore = Math.floor(integerPart / 10000000);
  integerPart %= 10000000;
  if (crore > 0) {
    result += convertTens(crore) + ' Crore ';
  }

  const lakh = Math.floor(integerPart / 100000);
  integerPart %= 100000;
  if (lakh > 0) {
    result += convertTens(lakh) + ' Lakh ';
  }

  const thousand = Math.floor(integerPart / 1000);
  integerPart %= 1000;
  if (thousand > 0) {
    result += convertTens(thousand) + ' Thousand ';
  }

  if (integerPart > 0) {
    result += convertHundreds(integerPart) + ' ';
  }

  result = 'Rupees ' + result.trim();

  if (paisePart > 0) {
    result += ' and Paise ' + convertTens(paisePart) + ' Only';
  } else {
    result += ' Only';
  }

  return result.replace(/\s+/g, ' ');
};

// Helper to compute salvage and final valuation
export const calculateCaseSalvageAndFinal = (
  caseId: string,
  overridePct?: number,
  overrideItemIds?: string[]
): { salvage: SalvageEstimate; finalValuation: FinalValuation; salvageItems: EstimateItem[] } => {
  const primaryDep = calculateCaseDepreciation(caseId);
  let allEstimateItems = db.estimateItems.filter((e) => e.caseId === caseId);

  // If specific item IDs were passed, update their isSalvageEligible status
  if (overrideItemIds) {
    allEstimateItems.forEach((item) => {
      item.isSalvageEligible = overrideItemIds.includes(item.id);
    });
  }

  const salvageItems = allEstimateItems.filter((i) => i.isSalvageEligible);

  // 1. Calculate Total Salvage Abstract Amount
  let salvageTotal = 0;
  salvageItems.forEach((item) => {
    const amt = DecimalMath.roundMoney(DecimalMath.multiply(item.quantity, item.rate));
    salvageTotal = DecimalMath.add(salvageTotal, amt).toNumber();
  });
  const totalSalvageAmount = Math.round(salvageTotal);

  // 2. Calculate Salvage Depreciated Value
  const salvageDepVal = DecimalMath.calculateDepreciatedValue(
    totalSalvageAmount,
    primaryDep.futureLifeYpFactor,
    primaryDep.totalLifeYpFactor
  );
  const salvageDepreciatedValue = Math.round(salvageDepVal.toNumber());

  // 3. Salvage Adjustment Percentage (Default 10%)
  const adjustmentPercentage = overridePct !== undefined ? overridePct : 10.0;
  const adjustmentAmount = DecimalMath.roundMoney(
    DecimalMath.multiply(salvageDepreciatedValue, DecimalMath.divide(adjustmentPercentage, 100))
  );

  // 4. Update or create Salvage Record
  let salvageRecord = db.salvageEstimates.find((s) => s.caseId === caseId);
  const selectedItemIds = salvageItems.map((i) => i.id);

  if (!salvageRecord) {
    salvageRecord = {
      id: `salvage-${uuidv4().slice(0, 8)}`,
      caseId,
      selectedItemIds,
      totalSalvageAmount,
      presentLife: primaryDep.presentLife,
      futureLife: primaryDep.futureLife,
      totalLife: primaryDep.totalLife,
      futureLifeYpFactor: primaryDep.futureLifeYpFactor,
      totalLifeYpFactor: primaryDep.totalLifeYpFactor,
      salvageDepreciatedValue,
      adjustmentPercentage,
      adjustmentAmount,
      updatedAt: new Date().toISOString(),
    };
    db.salvageEstimates.push(salvageRecord);
  } else {
    salvageRecord.selectedItemIds = selectedItemIds;
    salvageRecord.totalSalvageAmount = totalSalvageAmount;
    salvageRecord.presentLife = primaryDep.presentLife;
    salvageRecord.futureLife = primaryDep.futureLife;
    salvageRecord.totalLife = primaryDep.totalLife;
    salvageRecord.futureLifeYpFactor = primaryDep.futureLifeYpFactor;
    salvageRecord.totalLifeYpFactor = primaryDep.totalLifeYpFactor;
    salvageRecord.salvageDepreciatedValue = salvageDepreciatedValue;
    salvageRecord.adjustmentPercentage = adjustmentPercentage;
    salvageRecord.adjustmentAmount = adjustmentAmount;
    salvageRecord.updatedAt = new Date().toISOString();
  }

  // 5. Calculate Final Net Payable Valuation
  const finalValuationAmount = DecimalMath.roundMoney(
    DecimalMath.subtract(primaryDep.depreciatedValue, adjustmentAmount)
  );

  let finalRecord = db.finalValuations.find((f) => f.caseId === caseId);
  if (!finalRecord) {
    finalRecord = {
      id: `final-${uuidv4().slice(0, 8)}`,
      caseId,
      primaryEstimateTotal: primaryDep.presentEstimatedCost,
      primaryDepreciatedValue: primaryDep.depreciatedValue,
      salvageEstimateTotal: totalSalvageAmount,
      salvageDepreciatedValue,
      adjustmentPercentage,
      adjustmentAmount,
      finalValuationAmount,
      calculationVersion: 1,
      status: 'APPROVED',
      updatedAt: new Date().toISOString(),
    };
    db.finalValuations.push(finalRecord);
  } else {
    finalRecord.primaryEstimateTotal = primaryDep.presentEstimatedCost;
    finalRecord.primaryDepreciatedValue = primaryDep.depreciatedValue;
    finalRecord.salvageEstimateTotal = totalSalvageAmount;
    finalRecord.salvageDepreciatedValue = salvageDepreciatedValue;
    finalRecord.adjustmentPercentage = adjustmentPercentage;
    finalRecord.adjustmentAmount = adjustmentAmount;
    finalRecord.finalValuationAmount = finalValuationAmount;
    finalRecord.updatedAt = new Date().toISOString();
  }

  db.save();

  return {
    salvage: salvageRecord,
    finalValuation: finalRecord,
    salvageItems,
  };
};

export const getSalvage = (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params; // caseId
    const result = calculateCaseSalvageAndFinal(id);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

export const updateSalvageConfig = (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params; // caseId
    const { adjustmentPercentage, selectedItemIds } = req.body;

    const result = calculateCaseSalvageAndFinal(
      id,
      adjustmentPercentage !== undefined ? Number(adjustmentPercentage) : undefined,
      selectedItemIds
    );

    res.status(200).json({
      message: 'Salvage and final valuation recomputed successfully',
      ...result,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

export const getFinalValuationSummary = (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params; // caseId
    const result = calculateCaseSalvageAndFinal(id);

    const amountInWords = numberToIndianWords(result.finalValuation.finalValuationAmount);

    res.status(200).json({
      summary: result.finalValuation,
      salvageDetails: result.salvage,
      amountInWords,
      salvageItemsCount: result.salvageItems.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};
