import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/db';
import { AuthRequest } from '../middleware/auth';
import {
  MeasurementGroup,
  MeasurementItem,
  MeasurementDeduction,
  CalculationType,
} from '../models/types';
import { DecimalMath } from '../utils/decimal';

// Helper to recalculate item and group totals
export const recalculateItemAndGroup = (groupId: string): void => {
  const group = db.measurementGroups.find((g) => g.id === groupId);
  if (!group) return;

  let groupTotal = 0;

  group.items.forEach((item) => {
    // 1. Calculate Gross Quantity
    const gross = DecimalMath.calculateGrossQuantity(
      item.calculationType,
      item.numberCount,
      item.length,
      item.breadth,
      item.depthOrHeight
    );
    item.grossQuantity = DecimalMath.round(gross, 2).toNumber();

    // 2. Calculate Deductions
    let totalDeduction = 0;
    item.deductions.forEach((d) => {
      const dQty = DecimalMath.calculateGrossQuantity(
        'VOLUME',
        d.numberCount,
        d.length,
        d.breadth,
        d.depthOrHeight
      );
      d.deductionQuantity = DecimalMath.round(dQty, 2).toNumber();
      totalDeduction = DecimalMath.add(totalDeduction, d.deductionQuantity).toNumber();
    });
    item.deductionQuantity = DecimalMath.round(totalDeduction, 2).toNumber();

    // 3. Calculate Net Quantity
    const net = DecimalMath.subtract(item.grossQuantity, item.deductionQuantity);
    item.netQuantity = DecimalMath.round(Math.max(0, net.toNumber()), 2).toNumber();

    groupTotal = DecimalMath.add(groupTotal, item.netQuantity).toNumber();
  });

  group.totalQuantity = DecimalMath.round(groupTotal, 2).toNumber();

  // Sync connected EstimateItem if exists
  const estItem = db.estimateItems.find(
    (e) => e.measurementGroupId === groupId || (e.caseId === group.caseId && e.itemNumber === group.itemNumber)
  );
  if (estItem) {
    estItem.quantity = group.totalQuantity;
    estItem.amount = DecimalMath.roundMoney(DecimalMath.multiply(estItem.quantity, estItem.rate));
  }
};

export const getMeasurements = (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params; // caseId
    const groups = db.measurementGroups.filter((g) => g.caseId === id);

    // Ensure all groups are recalculated
    groups.forEach((g) => recalculateItemAndGroup(g.id));

    res.status(200).json({ groups });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

export const createMeasurementGroup = (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params; // caseId
    const { itemNumber, title, unit, rateItemId } = req.body;

    if (!title || !unit) {
      res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Title and unit are required.' });
      return;
    }

    const nextItemNumber = itemNumber || (db.measurementGroups.filter((g) => g.caseId === id).length + 1);

    const newGroup: MeasurementGroup = {
      id: `grp-${uuidv4().slice(0, 8)}`,
      caseId: id,
      itemNumber: nextItemNumber,
      title: title.trim(),
      unit: unit.trim(),
      totalQuantity: 0,
      rateItemId,
      items: [],
    };

    db.measurementGroups.push(newGroup);
    db.save();

    res.status(201).json({ message: 'Measurement group created', group: newGroup });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

export const deleteMeasurementGroup = (req: AuthRequest, res: Response): void => {
  try {
    const { groupId } = req.params;
    const index = db.measurementGroups.findIndex((g) => g.id === groupId);

    if (index === -1) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Measurement group not found' });
      return;
    }

    const deleted = db.measurementGroups.splice(index, 1)[0];
    db.save();

    res.status(200).json({ message: 'Measurement group deleted', group: deleted });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

export const addMeasurementItem = (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params; // caseId
    const {
      groupId,
      itemSequence,
      itemSubSequence,
      description,
      calculationType,
      numberCount,
      length,
      breadth,
      depthOrHeight,
      unit,
      notes,
    } = req.body;

    const group = db.measurementGroups.find((g) => g.id === groupId && g.caseId === id);
    if (!group) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Measurement group not found' });
      return;
    }

    const calcType: CalculationType = calculationType || 'VOLUME';
    const num = Number(numberCount) || 1;
    const l = Number(length) || 0;
    const b = Number(breadth) || 0;
    const d = Number(depthOrHeight) || 0;

    const gross = DecimalMath.calculateGrossQuantity(calcType, num, l, b, d);

    const newItem: MeasurementItem = {
      id: `mea-${uuidv4().slice(0, 8)}`,
      groupId,
      caseId: id,
      itemSequence: itemSequence || group.items.length + 1,
      itemSubSequence: itemSubSequence || String.fromCharCode(97 + group.items.length),
      description: description || 'Measurement Item',
      calculationType: calcType,
      numberCount: num,
      length: l,
      breadth: b,
      depthOrHeight: d,
      grossQuantity: DecimalMath.round(gross, 2).toNumber(),
      deductionQuantity: 0,
      netQuantity: DecimalMath.round(gross, 2).toNumber(),
      unit: unit || group.unit,
      notes,
      deductions: [],
    };

    group.items.push(newItem);
    recalculateItemAndGroup(groupId);
    db.save();

    res.status(201).json({ message: 'Measurement item added', item: newItem, groupTotal: group.totalQuantity });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

export const updateMeasurementItem = (req: AuthRequest, res: Response): void => {
  try {
    const { itemId } = req.params;
    const updates = req.body;

    let targetGroup: MeasurementGroup | undefined;
    let targetItem: MeasurementItem | undefined;

    for (const grp of db.measurementGroups) {
      const found = grp.items.find((i) => i.id === itemId);
      if (found) {
        targetGroup = grp;
        targetItem = found;
        break;
      }
    }

    if (!targetGroup || !targetItem) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Measurement item not found' });
      return;
    }

    targetItem.description = updates.description !== undefined ? updates.description : targetItem.description;
    targetItem.calculationType = updates.calculationType !== undefined ? updates.calculationType : targetItem.calculationType;
    targetItem.numberCount = updates.numberCount !== undefined ? Number(updates.numberCount) : targetItem.numberCount;
    targetItem.length = updates.length !== undefined ? Number(updates.length) : targetItem.length;
    targetItem.breadth = updates.breadth !== undefined ? Number(updates.breadth) : targetItem.breadth;
    targetItem.depthOrHeight = updates.depthOrHeight !== undefined ? Number(updates.depthOrHeight) : targetItem.depthOrHeight;
    targetItem.notes = updates.notes !== undefined ? updates.notes : targetItem.notes;

    recalculateItemAndGroup(targetGroup.id);
    db.save();

    res.status(200).json({
      message: 'Measurement item updated',
      item: targetItem,
      groupTotal: targetGroup.totalQuantity,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

export const deleteMeasurementItem = (req: AuthRequest, res: Response): void => {
  try {
    const { itemId } = req.params;

    let targetGroup: MeasurementGroup | undefined;
    let itemIndex = -1;

    for (const grp of db.measurementGroups) {
      const idx = grp.items.findIndex((i) => i.id === itemId);
      if (idx !== -1) {
        targetGroup = grp;
        itemIndex = idx;
        break;
      }
    }

    if (!targetGroup || itemIndex === -1) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Measurement item not found' });
      return;
    }

    targetGroup.items.splice(itemIndex, 1);
    recalculateItemAndGroup(targetGroup.id);
    db.save();

    res.status(200).json({
      message: 'Measurement item deleted',
      groupTotal: targetGroup.totalQuantity,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

export const addDeduction = (req: AuthRequest, res: Response): void => {
  try {
    const { itemId } = req.params;
    const { code, description, numberCount, length, breadth, depthOrHeight, unit, notes } = req.body;

    let targetGroup: MeasurementGroup | undefined;
    let targetItem: MeasurementItem | undefined;

    for (const grp of db.measurementGroups) {
      const found = grp.items.find((i) => i.id === itemId);
      if (found) {
        targetGroup = grp;
        targetItem = found;
        break;
      }
    }

    if (!targetGroup || !targetItem) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Measurement item not found' });
      return;
    }

    const num = Number(numberCount) || 1;
    const l = Number(length) || 0;
    const b = Number(breadth) || 0;
    const d = Number(depthOrHeight) || 0;

    const dGross = DecimalMath.calculateGrossQuantity('VOLUME', num, l, b, d);

    const newDeduction: MeasurementDeduction = {
      id: `ded-${uuidv4().slice(0, 8)}`,
      measurementItemId: itemId,
      code: code || `D${targetItem.deductions.length + 1}`,
      description: description || 'Deduction',
      numberCount: num,
      length: l,
      breadth: b,
      depthOrHeight: d,
      deductionQuantity: DecimalMath.round(dGross, 2).toNumber(),
      unit: unit || targetItem.unit,
      notes,
    };

    targetItem.deductions.push(newDeduction);
    recalculateItemAndGroup(targetGroup.id);
    db.save();

    res.status(201).json({
      message: 'Deduction added successfully',
      deduction: newDeduction,
      itemNetQuantity: targetItem.netQuantity,
      groupTotal: targetGroup.totalQuantity,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

export const deleteDeduction = (req: AuthRequest, res: Response): void => {
  try {
    const { deductionId } = req.params;

    let targetGroup: MeasurementGroup | undefined;
    let targetItem: MeasurementItem | undefined;
    let dedIndex = -1;

    for (const grp of db.measurementGroups) {
      for (const item of grp.items) {
        const idx = item.deductions.findIndex((d) => d.id === deductionId);
        if (idx !== -1) {
          targetGroup = grp;
          targetItem = item;
          dedIndex = idx;
          break;
        }
      }
      if (targetGroup) break;
    }

    if (!targetGroup || !targetItem || dedIndex === -1) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Deduction not found' });
      return;
    }

    targetItem.deductions.splice(dedIndex, 1);
    recalculateItemAndGroup(targetGroup.id);
    db.save();

    res.status(200).json({
      message: 'Deduction deleted',
      itemNetQuantity: targetItem.netQuantity,
      groupTotal: targetGroup.totalQuantity,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};
