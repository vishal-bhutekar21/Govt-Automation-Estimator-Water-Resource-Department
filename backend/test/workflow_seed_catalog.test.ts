import assert from 'node:assert/strict';
import test from 'node:test';
import { ensureGut193GuideCatalog, GUT193_RATE_SCHEDULE_ID, GUT193_YP_TABLE_ID } from '../src/database/workflowSeedCatalog';

test('Gut-193 guide catalogue seeds rate schedule, 12 items, and YP 7/10', () => {
  const rateScheduleVersions: Parameters<typeof ensureGut193GuideCatalog>[0]['rateScheduleVersions'] = [];
  const catalogueItems: Parameters<typeof ensureGut193GuideCatalog>[0]['catalogueItems'] = [];
  const ypTables: Parameters<typeof ensureGut193GuideCatalog>[0]['ypTables'] = [];

  ensureGut193GuideCatalog({ rateScheduleVersions, catalogueItems, ypTables });
  ensureGut193GuideCatalog({ rateScheduleVersions, catalogueItems, ypTables }); // idempotent

  assert.equal(rateScheduleVersions.length, 1);
  assert.equal(rateScheduleVersions[0].id, GUT193_RATE_SCHEDULE_ID);
  assert.equal(rateScheduleVersions[0].versionLabel, 'CASE-193-RA-UI-GUIDE');
  assert.equal(catalogueItems.length, 12);
  assert.ok(catalogueItems.some((item) => item.itemNumber === '19.1' && item.rate === 7152.1));
  assert.equal(ypTables.length, 1);
  assert.equal(ypTables[0].id, GUT193_YP_TABLE_ID);
  assert.deepEqual(ypTables[0].rows.find((row) => row.year === 7), { year: 7, factor: 5.389 });
  assert.deepEqual(ypTables[0].rows.find((row) => row.year === 10), { year: 10, factor: 7.024 });
});
