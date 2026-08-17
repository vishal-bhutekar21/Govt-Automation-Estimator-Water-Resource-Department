import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/db';
import { AuthRequest } from '../middleware/auth';
import { EstimateItem } from '../models/types';
import { DecimalMath } from '../utils/decimal';
import { recalculateItemAndGroup } from './measurementController';

export const getEstimate = (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params; // caseId

    const items = db.estimateItems.filter((e) => e.caseId === id);

    let grandTotal = 0;
    const formattedItems = items.map((item) => {
      const amount = DecimalMath.roundMoney(DecimalMath.multiply(item.quantity, item.rate));
      grandTotal = DecimalMath.add(grandTotal, amount).toNumber();

      return {
        ...item,
        amount,
        formattedRate: DecimalMath.formatINR(item.rate),
        formattedAmount: DecimalMath.formatINR(amount),
      };
    });

    res.status(200).json({
      items: formattedItems,
      grandTotal: DecimalMath.roundMoney(grandTotal),
      formattedGrandTotal: DecimalMath.formatINR(grandTotal),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

export const recalculateEstimate = (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params; // caseId

    const groups = db.measurementGroups.filter((g) => g.caseId === id);
    groups.forEach((g) => recalculateItemAndGroup(g.id));

    const items = db.estimateItems.filter((e) => e.caseId === id);
    let grandTotal = 0;

    items.forEach((item) => {
      // Find matching group to sync quantity
      const group = groups.find((g) => g.id === item.measurementGroupId || g.itemNumber === item.itemNumber);
      if (group) {
        item.quantity = group.totalQuantity;
      }
      item.amount = DecimalMath.roundMoney(DecimalMath.multiply(item.quantity, item.rate));
      grandTotal = DecimalMath.add(grandTotal, item.amount).toNumber();
    });

    // Update primary depreciation presentEstimatedCost
    const dep = db.depreciationCalculations.find((d) => d.caseId === id);
    if (dep) {
      dep.presentEstimatedCost = DecimalMath.roundMoney(grandTotal);
      if (dep.totalLifeYpFactor > 0) {
        const factor = DecimalMath.divide(dep.futureLifeYpFactor, dep.totalLifeYpFactor);
        dep.depreciatedValue = DecimalMath.roundMoney(DecimalMath.multiply(dep.presentEstimatedCost, factor));
      }
    }

    db.save();

    res.status(200).json({
      message: 'Abstract Estimate recalculated successfully',
      items,
      grandTotal: DecimalMath.roundMoney(grandTotal),
      formattedGrandTotal: DecimalMath.formatINR(grandTotal),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

export const updateEstimateItem = (req: AuthRequest, res: Response): void => {
  try {
    const { itemId } = req.params;
    const { rate, isSalvageEligible, description } = req.body;

    const item = db.estimateItems.find((e) => e.id === itemId);
    if (!item) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Estimate item not found' });
      return;
    }

    if (rate !== undefined) {
      item.rate = Number(rate);
      item.amount = DecimalMath.roundMoney(DecimalMath.multiply(item.quantity, item.rate));
    }

    if (isSalvageEligible !== undefined) {
      item.isSalvageEligible = Boolean(isSalvageEligible);
    }

    if (description) {
      item.description = description;
    }

    db.save();

    res.status(200).json({ message: 'Estimate item updated', item });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

export const linkGroupRate = (req: AuthRequest, res: Response): void => {
  try {
    const { groupId } = req.params;
    const { rateItemId } = req.body;

    const group = db.measurementGroups.find((g) => g.id === groupId);
    const rateItem = db.rateItems.find((r) => r.id === rateItemId);

    if (!group || !rateItem) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Group or Rate item not found' });
      return;
    }

    group.rateItemId = rateItemId;

    // Find or create connected EstimateItem
    let estItem = db.estimateItems.find((e) => e.measurementGroupId === groupId || (e.caseId === group.caseId && e.itemNumber === group.itemNumber));
    if (!estItem) {
      estItem = {
        id: `est-${uuidv4().slice(0, 8)}`,
        caseId: group.caseId,
        itemNumber: group.itemNumber,
        description: rateItem.description,
        quantity: group.totalQuantity,
        unit: rateItem.unit,
        rate: rateItem.rate,
        amount: DecimalMath.roundMoney(DecimalMath.multiply(group.totalQuantity, rateItem.rate)),
        rateReference: `${rateItem.scheduleYear} ${rateItem.itemNumber}`,
        isSalvageEligible: false,
        measurementGroupId: groupId,
      };
      db.estimateItems.push(estItem);
    } else {
      estItem.rate = rateItem.rate;
      estItem.unit = rateItem.unit;
      estItem.description = rateItem.description;
      estItem.rateReference = `${rateItem.scheduleYear} ${rateItem.itemNumber}`;
      estItem.amount = DecimalMath.roundMoney(DecimalMath.multiply(estItem.quantity, estItem.rate));
    }

    db.save();

    res.status(200).json({ message: 'Rate linked successfully', group, estimateItem: estItem });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};
