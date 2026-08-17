import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/db';
import { AuthRequest } from '../middleware/auth';
import { DepreciationCalculation, DepreciationFactor } from '../models/types';
import { DecimalMath } from '../utils/decimal';

// Helper to calculate depreciation for a case
export const calculateCaseDepreciation = (caseId: string): DepreciationCalculation => {
  const caseRecord = db.cases.find((c) => c.id === caseId);
  const struct = db.structures.find((s) => s.caseId === caseId);
  const estimateItems = db.estimateItems.filter((e) => e.caseId === caseId);

  // 1. Compute Primary Estimate Total
  let totalCost = 0;
  estimateItems.forEach((item) => {
    const amt = DecimalMath.roundMoney(DecimalMath.multiply(item.quantity, item.rate));
    totalCost = DecimalMath.add(totalCost, amt).toNumber();
  });
  const presentCost = Math.round(totalCost);

  // 2. Lifecycle calculations
  const yearOfConstruction = struct?.yearOfConstruction || 2012;
  const valuationYear = caseRecord?.valuationDate
    ? new Date(caseRecord.valuationDate).getFullYear()
    : 2016;

  const presentLife = Math.max(0, valuationYear - yearOfConstruction);
  const totalLife = struct?.totalUsefulLife || 45;
  const futureLife = Math.max(0, totalLife - presentLife);

  // 3. 7% Y.P. Factor lookup
  const futureFactorRecord = db.depreciationFactors.find(
    (f) => f.year === futureLife && f.scheduleType === 'GOV_YP_7PCT'
  );
  const totalFactorRecord = db.depreciationFactors.find(
    (f) => f.year === totalLife && f.scheduleType === 'GOV_YP_7PCT'
  );

  const futureLifeYpFactor = futureFactorRecord ? futureFactorRecord.factor : 13.394;
  const totalLifeYpFactor = totalFactorRecord ? totalFactorRecord.factor : 13.606;

  // 4. Depreciation Factor & Depreciated Value
  // Depreciated Value = Present Cost * (YP future / YP total)
  const depreciatedVal = DecimalMath.calculateDepreciatedValue(
    presentCost,
    futureLifeYpFactor,
    totalLifeYpFactor
  );
  const depreciatedValue = Math.round(depreciatedVal.toNumber());
  const factorRatio = DecimalMath.divide(futureLifeYpFactor, totalLifeYpFactor, 7).toNumber();

  const formulaText = `Present Cost (₹ ${presentCost.toLocaleString('en-IN')}) × Y.P. Future [${futureLife} yrs] (${futureLifeYpFactor}) ÷ Y.P. Total [${totalLife} yrs] (${totalLifeYpFactor}) = ₹ ${depreciatedValue.toLocaleString('en-IN')}.00`;

  let depRecord = db.depreciationCalculations.find((d) => d.caseId === caseId);
  if (!depRecord) {
    depRecord = {
      id: `dep-${uuidv4().slice(0, 8)}`,
      caseId,
      presentEstimatedCost: presentCost,
      yearOfConstruction,
      valuationYear,
      presentLife,
      futureLife,
      totalLife,
      futureLifeYpFactor,
      totalLifeYpFactor,
      depreciationFactor: factorRatio,
      depreciatedValue,
      formulaText,
      updatedAt: new Date().toISOString(),
    };
    db.depreciationCalculations.push(depRecord);
  } else {
    depRecord.presentEstimatedCost = presentCost;
    depRecord.yearOfConstruction = yearOfConstruction;
    depRecord.valuationYear = valuationYear;
    depRecord.presentLife = presentLife;
    depRecord.futureLife = futureLife;
    depRecord.totalLife = totalLife;
    depRecord.futureLifeYpFactor = futureLifeYpFactor;
    depRecord.totalLifeYpFactor = totalLifeYpFactor;
    depRecord.depreciationFactor = factorRatio;
    depRecord.depreciatedValue = depreciatedValue;
    depRecord.formulaText = formulaText;
    depRecord.updatedAt = new Date().toISOString();
  }

  db.save();
  return depRecord;
};

export const getDepreciation = (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params; // caseId
    const calculation = calculateCaseDepreciation(id);
    res.status(200).json({ calculation });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

export const recalculateDepreciation = (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params; // caseId
    const calculation = calculateCaseDepreciation(id);
    res.status(200).json({ message: 'Depreciation recalculated successfully', calculation });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

export const getYpFactors = (req: AuthRequest, res: Response): void => {
  try {
    const factors = [...db.depreciationFactors].sort((a, b) => a.year - b.year);
    res.status(200).json({ factors });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};
