import type { CatalogueItemRecord, RateScheduleVersionRecord, YpTableVersionRecord } from '../workflow/types';

/** Stable IDs so local + Vercel always expose the same Gut-193 guide schedules. */
export const GUT193_RATE_SCHEDULE_ID = 'rate-case-193-ra-ui-guide';
export const GUT193_YP_TABLE_ID = 'yp-gut-193-workbook-7-10';

const GUT193_RATE_ITEMS: Omit<CatalogueItemRecord, 'id' | 'scheduleVersionId'>[] = [
  { itemNumber: '1', description: 'Excavation', unit: 'cum', rate: 202.85, sourceRow: '1', reference: 'Gut 193 workbook RA' },
  { itemNumber: '4', description: 'Soling', unit: 'cum', rate: 2130.4, sourceRow: '4', reference: 'Gut 193 workbook RA' },
  { itemNumber: '21', description: 'RCC ground beam', unit: 'cum', rate: 12639.7, sourceRow: '21', reference: 'Gut 193 workbook RA' },
  { itemNumber: '121', description: 'TMT FE-500', unit: 'qtl', rate: 7514.2, sourceRow: '121', reference: 'Gut 193 workbook RA' },
  { itemNumber: '19.1', description: 'AAC block masonry', unit: 'cum', rate: 7152.1, sourceRow: '19.1', reference: 'Gut 193 workbook RA' },
  { itemNumber: '6', description: 'RCC columns', unit: 'cum', rate: 7578, sourceRow: '6', reference: 'Gut 193 workbook RA' },
  { itemNumber: '68', description: 'Jungle wood', unit: 'cum', rate: 56662.35, sourceRow: '68', reference: 'Gut 193 workbook RA' },
  { itemNumber: '112', description: 'Ceramic tiles', unit: 'sqm', rate: 507.1, sourceRow: '112', reference: 'Gut 193 workbook RA' },
  { itemNumber: '98', description: 'Wood plank ceiling', unit: 'sqm', rate: 1166, sourceRow: '98', reference: 'Gut 193 workbook RA' },
  { itemNumber: '30', description: 'External plaster', unit: 'sqm', rate: 637.25, sourceRow: '30', reference: 'Gut 193 workbook RA' },
  { itemNumber: '29', description: 'Internal plaster', unit: 'sqm', rate: 201.4, sourceRow: '29', reference: 'Gut 193 workbook RA' },
  { itemNumber: '97', description: 'Jungle-wood frames', unit: 'sqm', rate: 2976.7, sourceRow: '97', reference: 'Gut 193 workbook RA' },
];

export function ensureGut193GuideCatalog(input: {
  rateScheduleVersions: RateScheduleVersionRecord[];
  catalogueItems: CatalogueItemRecord[];
  ypTables: YpTableVersionRecord[];
}): void {
  const hasSchedule = input.rateScheduleVersions.some(
    (row) => row.id === GUT193_RATE_SCHEDULE_ID || row.versionLabel === 'CASE-193-RA-UI-GUIDE'
  );
  if (!hasSchedule) {
    input.rateScheduleVersions.push({
      id: GUT193_RATE_SCHEDULE_ID,
      name: 'Gut 193 workbook RA extract',
      authority: 'Workbook RA sheet',
      versionLabel: 'CASE-193-RA-UI-GUIDE',
      effectiveFrom: null,
      effectiveTo: null,
      sourceDocument: 'evidance docs/Copy of 193 eknath pandurang tharkar (1).xlsx',
      importedAt: '2026-10-04T00:00:00.000Z',
      legacy: false,
    });
  }

  const scheduleId = input.rateScheduleVersions.find(
    (row) => row.id === GUT193_RATE_SCHEDULE_ID || row.versionLabel === 'CASE-193-RA-UI-GUIDE'
  )!.id;

  for (const item of GUT193_RATE_ITEMS) {
    const already = input.catalogueItems.some(
      (row) => row.scheduleVersionId === scheduleId && String(row.itemNumber) === item.itemNumber
    );
    if (already) continue;
    input.catalogueItems.push({
      id: `cat-193-${item.itemNumber.replace(/\./g, '_')}`,
      scheduleVersionId: scheduleId,
      ...item,
    });
  }

  const hasYp = input.ypTables.some(
    (table) => table.id === GUT193_YP_TABLE_ID || /Gut 193 workbook YP/i.test(table.name)
  );
  if (!hasYp) {
    input.ypTables.push({
      id: GUT193_YP_TABLE_ID,
      name: 'Gut 193 workbook YP (7 & 10)',
      citation: 'PWD handbook Ch. 37, Vol. II, pp. 34-35, as cited on the depreciation sheet',
      legacy: false,
      rows: [
        { year: 7, factor: 5.389 },
        { year: 10, factor: 7.024 },
        { year: 93, factor: null },
      ],
    });
  }
}
