import assert from 'node:assert';
import test from 'node:test';
import { db } from '../src/database/db';
import { DecimalMath } from '../src/utils/decimal';
import { recalculateItemAndGroup } from '../src/controllers/measurementController';

test('Phase 5 & 6: Measurement Engine, Deductions, and Abstract Estimate Suite', async (t) => {
  await db.init();

  await t.test('Verifies Excavation (Item 1) multi-line volume calculation', () => {
    const grp1 = db.measurementGroups.find((g) => g.id === 'grp-01');
    assert.ok(grp1);
    recalculateItemAndGroup(grp1.id);

    // Line 1: 2 * 6.66 * 0.83 * 0.75 = 8.29
    // Line 2: 2 * 2.85 * 0.83 * 0.75 = 3.55
    // Line 3: 12 * 0.20 * 0.20 * 0.75 = 0.36
    // Total Group Quantity = 12.20 Cum
    assert.strictEqual(grp1.totalQuantity, 12.20);
  });

  await t.test('Verifies Brick Masonry (Item 5) superstructure deductions (D1, D2, W1, W2)', () => {
    const grp5 = db.measurementGroups.find((g) => g.id === 'grp-05');
    assert.ok(grp5);
    recalculateItemAndGroup(grp5.id);

    const mainItem = grp5.items[0];
    assert.ok(mainItem);

    // Gross: 10.06 Cum, Total Deductions: 2.12 Cum, Net Quantity = 7.94 Cum
    assert.strictEqual(mainItem.grossQuantity, 10.06);
    assert.strictEqual(mainItem.deductionQuantity, 2.12);
    assert.strictEqual(mainItem.netQuantity, 7.94);
    assert.strictEqual(grp5.totalQuantity, 7.94);
  });

  await t.test('Verifies all 18 Measurement Groups calculate correctly', () => {
    assert.strictEqual(db.measurementGroups.length, 18);
    db.measurementGroups.forEach((g) => recalculateItemAndGroup(g.id));

    // Verify all quantities
    const expectedQuantities: Record<number, number> = {
      1: 12.20, 2: 4.88, 3: 2.44, 4: 3.59, 5: 7.94, 6: 0.89,
      7: 32.41, 8: 32.41, 9: 15.60, 10: 73.01, 11: 19.32,
      12: 50.60, 13: 19.80, 14: 1.95, 15: 37.84, 16: 7.00,
      17: 0.12, 18: 13.23
    };

    Object.entries(expectedQuantities).forEach(([itemNo, expectedQty]) => {
      const g = db.measurementGroups.find((grp) => grp.itemNumber === Number(itemNo));
      assert.ok(g, `Group for item ${itemNo} should exist`);
      assert.strictEqual(g.totalQuantity, expectedQty, `Quantity for item ${itemNo} mismatch`);
    });
  });

  await t.test('Verifies Abstract Estimate items and Grand Total equals ₹ 2,61,669.00', () => {
    const items = db.estimateItems.filter((e) => e.caseId === 'case-jigaon-165');
    assert.strictEqual(items.length, 18);

    let grandTotal = 0;
    items.forEach((item) => {
      const amount = DecimalMath.roundMoney(DecimalMath.multiply(item.quantity, item.rate));
      grandTotal = DecimalMath.add(grandTotal, amount).toNumber();
    });

    // Golden Sample Abstract Grand Total = ₹ 2,61,669.00
    assert.strictEqual(Math.round(grandTotal), 261669);
  });

  await t.test('Verifies CSR Rate Search by Keyword', () => {
    const teakItems = db.rateItems.filter((r) => r.description.toLowerCase().includes('teak'));
    assert.ok(teakItems.length >= 3);
  });
});
