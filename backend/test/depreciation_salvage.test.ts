import assert from 'node:assert';
import test from 'node:test';
import { db } from '../src/database/db';
import { calculateCaseDepreciation } from '../src/controllers/depreciationController';
import {
  calculateCaseSalvageAndFinal,
  numberToIndianWords,
} from '../src/controllers/salvageController';

test('Phase 7 & 8: Depreciation Engine, Salvage Abstract & Final Valuation Suite', async (t) => {
  await db.init();
  const caseId = 'case-jigaon-165';

  await t.test('Verifies Phase 7: Primary Depreciated Value calculation matches ₹ 2,57,592.00', () => {
    const dep = calculateCaseDepreciation(caseId);

    assert.strictEqual(dep.presentEstimatedCost, 261669);
    assert.strictEqual(dep.presentLife, 4);
    assert.strictEqual(dep.futureLife, 41);
    assert.strictEqual(dep.totalLife, 45);
    assert.strictEqual(dep.futureLifeYpFactor, 13.394);
    assert.strictEqual(dep.totalLifeYpFactor, 13.606);

    // Primary Depreciated Value = round(261669 * (13.394 / 13.606)) = 257592
    assert.strictEqual(dep.depreciatedValue, 257592);
  });

  await t.test('Verifies Phase 8: Salvage Abstract calculation matches ₹ 1,92,040.00 and Depreciated ₹ 189,048.00', () => {
    const { salvage, salvageItems } = calculateCaseSalvageAndFinal(caseId);

    // Verify eligible salvage items are selected (6 items: teak, CGI, GI pipes, MS grill, teak chaukhat, teak shutters)
    assert.strictEqual(salvageItems.length, 6);
    assert.strictEqual(salvage.totalSalvageAmount, 192040);
    // Salvage Depreciated = round(192040 * (13.394 / 13.606)) = 189048
    assert.strictEqual(salvage.salvageDepreciatedValue, 189048);
  });

  await t.test('Verifies Phase 8: Configurable 10% Salvage Adjustment & Net Final Valuation ₹ 2,38,687.20', () => {
    const { salvage, finalValuation } = calculateCaseSalvageAndFinal(caseId, 10.0);

    // 10% adjustment on 189048 = 18904.80
    assert.strictEqual(salvage.adjustmentPercentage, 10.0);
    assert.strictEqual(salvage.adjustmentAmount, 18904.80);

    // Final Valuation = 257592 - 18904.80 = 238687.20
    assert.strictEqual(finalValuation.finalValuationAmount, 238687.20);
  });

  await t.test('Verifies Dynamic Salvage Percentage Recalculation (e.g. 5% and 15%)', () => {
    const res5 = calculateCaseSalvageAndFinal(caseId, 5.0);
    assert.strictEqual(res5.salvage.adjustmentAmount, 9452.40);
    assert.strictEqual(res5.finalValuation.finalValuationAmount, 248139.60);

    // Restore 10%
    const res10 = calculateCaseSalvageAndFinal(caseId, 10.0);
    assert.strictEqual(res10.finalValuation.finalValuationAmount, 238687.20);
  });

  await t.test('Verifies Indian Currency Words Generation', () => {
    const words = numberToIndianWords(238687.20);
    assert.strictEqual(
      words,
      'Rupees Two Lakh Thirty-Eight Thousand Six Hundred Eighty-Seven and Paise Twenty Only'
    );
  });
});
