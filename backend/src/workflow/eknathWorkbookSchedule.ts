import Decimal from 'decimal.js';
import { roundHalfUp } from './engine';

/** Workbook MS woodwork schedule (SOURCE-DERIVED). Not a universal timber rule. */
export const EKNATH_WORKBOOK_TIMBER = {
  posts: [
    { label: 'Post - R1', count: 12, lengthM: 1.97, breadthM: 0.08, depthM: 0.1 },
    { label: 'Post - R2', count: 8, lengthM: 1.97, breadthM: 0.08, depthM: 0.1 },
    { label: 'Post - R3', count: 12, lengthM: 1.97, breadthM: 0.08, depthM: 0.1 },
    { label: 'Post - R4', count: 12, lengthM: 1.97, breadthM: 0.08, depthM: 0.1 },
    { label: 'Post - R5', count: 12, lengthM: 1.97, breadthM: 0.08, depthM: 0.1 },
    { label: 'Post - R6', count: 12, lengthM: 1.97, breadthM: 0.08, depthM: 0.1 },
    { label: 'Post - R7', count: 12, lengthM: 1.97, breadthM: 0.08, depthM: 0.1 },
    { label: 'Post - R8', count: 12, lengthM: 1.97, breadthM: 0.08, depthM: 0.1 },
  ],
  rafterY: [
    { label: 'Rafter-Y - R1', count: 3, lengthM: 5.9, breadthM: 0.1, depthM: 0.12 },
    { label: 'Rafter-Y - R2', count: 1, lengthM: 5.75, breadthM: 0.1, depthM: 0.12 },
    { label: 'Rafter-Y - R3', count: 3, lengthM: 5.9, breadthM: 0.1, depthM: 0.12 },
    { label: 'Rafter-Y - R4', count: 3, lengthM: 5.75, breadthM: 0.1, depthM: 0.12 },
    { label: 'Rafter-Y - R5', count: 3, lengthM: 5.9, breadthM: 0.1, depthM: 0.12 },
    { label: 'Rafter-Y - R6', count: 3, lengthM: 5.75, breadthM: 0.1, depthM: 0.12 },
    { label: 'Rafter-Y - R7', count: 3, lengthM: 5.9, breadthM: 0.1, depthM: 0.12 },
    { label: 'Rafter-Y - R8', count: 3, lengthM: 5.75, breadthM: 0.1, depthM: 0.12 },
  ],
  rafterX: [
    { label: 'Rafter-X - R1', count: 13, lengthM: 3.6, breadthM: 0.06, depthM: 0.08 },
    { label: 'Rafter-X - R2', count: 3, lengthM: 3.6, breadthM: 0.06, depthM: 0.08 },
    { label: 'Rafter-X - R3', count: 13, lengthM: 3.6, breadthM: 0.06, depthM: 0.08 },
    { label: 'Rafter-X - R4', count: 14, lengthM: 3.6, breadthM: 0.06, depthM: 0.08 },
    { label: 'Rafter-X - R5', count: 14, lengthM: 3.5, breadthM: 0.06, depthM: 0.08 },
    { label: 'Rafter-X - R6', count: 14, lengthM: 3.5, breadthM: 0.06, depthM: 0.08 },
    { label: 'Rafter-X - R7', count: 13, lengthM: 3.8, breadthM: 0.06, depthM: 0.08 },
    { label: 'Rafter-X - R8a', count: 7, lengthM: 3.8, breadthM: 0.06, depthM: 0.08 },
    { label: 'Rafter-X - R8b', count: 6, lengthM: 3.8, breadthM: 0.06, depthM: 0.08 },
  ],
  pauli: [
    { label: 'Pauli - R1', count: 12, lengthM: 0.1, breadthM: 0.1, depthM: 0.5 },
    { label: 'Pauli - R2', count: 8, lengthM: 0.1, breadthM: 0.1, depthM: 0.5 },
    { label: 'Pauli - R3', count: 12, lengthM: 0.1, breadthM: 0.1, depthM: 0.5 },
    { label: 'Pauli - R4', count: 12, lengthM: 0.1, breadthM: 0.1, depthM: 0.5 },
    { label: 'Pauli - R5', count: 12, lengthM: 0.1, breadthM: 0.1, depthM: 0.5 },
    { label: 'Pauli - R6', count: 12, lengthM: 0.1, breadthM: 0.1, depthM: 0.5 },
    { label: 'Pauli - R7', count: 12, lengthM: 0.1, breadthM: 0.1, depthM: 0.5 },
    { label: 'Pauli - R8', count: 12, lengthM: 0.1, breadthM: 0.1, depthM: 0.5 },
  ],
} as const;

export function eknathWorkbookTimberLines(structureId: string): {
  label: string;
  count: number;
  lengthM: number;
  breadthM: number;
  depthOrHeightM: number;
  formulaText: string;
  sourceFactIds: string[];
  sign: 1;
  quantity: number;
}[] {
  const rows = [
    ...EKNATH_WORKBOOK_TIMBER.posts,
    ...EKNATH_WORKBOOK_TIMBER.rafterY,
    ...EKNATH_WORKBOOK_TIMBER.rafterX,
    ...EKNATH_WORKBOOK_TIMBER.pauli,
  ];
  return rows.map((row) => {
    const quantity = roundHalfUp(
      new Decimal(row.count).mul(row.lengthM).mul(row.breadthM).mul(row.depthM),
      6
    ).toNumber();
    return {
      label: row.label,
      count: row.count,
      lengthM: row.lengthM,
      breadthM: row.breadthM,
      depthOrHeightM: row.depthM,
      formulaText: 'count × length × breadth × depth',
      sourceFactIds: [structureId, 'eknath.workbook.timber'],
      sign: 1 as const,
      quantity,
    };
  });
}

/** Workbook internal plaster summed R1–R6 only (dropped R7/R8 = 3.8 m bays). SOURCE defect preserved as draft option. */
export function isEknathWorkbookInternalPlasterRoom(lengthM: number): boolean {
  return Math.abs(lengthM - 3.8) > 1e-6;
}
