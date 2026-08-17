import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/db';
import { AuthRequest } from '../middleware/auth';
import { RateItem, RateSchedule } from '../models/types';
import { DecimalMath } from '../utils/decimal';

export const getRateSchedules = (_req: AuthRequest, res: Response): void => {
  try {
    res.status(200).json({ schedules: db.rateSchedules });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

export const getRates = (req: AuthRequest, res: Response): void => {
  try {
    const { q, scheduleYear, department, unit } = req.query;

    let items = [...db.rateItems];

    if (scheduleYear) {
      items = items.filter((r) => r.scheduleYear === scheduleYear);
    }

    if (department) {
      items = items.filter((r) => r.department.toLowerCase().includes(String(department).toLowerCase()));
    }

    if (unit) {
      items = items.filter((r) => r.unit.toLowerCase() === String(unit).toLowerCase());
    }

    if (q) {
      const search = String(q).toLowerCase();
      items = items.filter(
        (r) =>
          r.itemCode.toLowerCase().includes(search) ||
          r.itemNumber.toLowerCase().includes(search) ||
          r.description.toLowerCase().includes(search) ||
          r.referenceSource.toLowerCase().includes(search)
      );
    }

    const itemsFormatted = items.map((r) => ({
      ...r,
      formattedRate: DecimalMath.formatINR(r.rate),
    }));

    res.status(200).json({ rates: itemsFormatted });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

export const createRateItem = (req: AuthRequest, res: Response): void => {
  try {
    const { scheduleId, itemCode, itemNumber, description, unit, rate, department, scheduleYear, referenceSource } = req.body;

    if (!itemCode || !description || !unit || rate === undefined) {
      res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Item Code, Description, Unit, and Rate are mandatory.' });
      return;
    }

    const newRate: RateItem = {
      id: `rate-${uuidv4().slice(0, 8)}`,
      scheduleId: scheduleId || 'sched-pwd-2014',
      itemCode: itemCode.trim().toUpperCase(),
      itemNumber: itemNumber || `Item ${db.rateItems.length + 1}`,
      description: description.trim(),
      unit: unit.trim(),
      rate: Number(rate),
      department: department || 'PWD',
      scheduleYear: scheduleYear || '2014-15',
      referenceSource: referenceSource || 'PWD CSR Schedule',
      isActive: true,
    };

    db.rateItems.push(newRate);
    db.save();

    res.status(201).json({ message: 'CSR Rate item created successfully', rate: newRate });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

export const updateRateItem = (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const rateIndex = db.rateItems.findIndex((r) => r.id === id);
    if (rateIndex === -1) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Rate item not found' });
      return;
    }

    const currentRate = db.rateItems[rateIndex];
    const updatedRate: RateItem = {
      ...currentRate,
      ...updates,
      rate: updates.rate !== undefined ? Number(updates.rate) : currentRate.rate,
    };

    db.rateItems[rateIndex] = updatedRate;
    db.save();

    res.status(200).json({ message: 'Rate item updated', rate: updatedRate });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};
