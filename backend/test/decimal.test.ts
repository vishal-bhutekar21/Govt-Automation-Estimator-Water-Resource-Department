import assert from 'node:assert';
import test from 'node:test';
import { DecimalMath } from '../src/utils/decimal';

test('DecimalMath calculations', async (t) => {
  await t.test('calculates volume quantity accurately', () => {
    // 2 * 6.66 * 0.83 * 0.75 = 8.2917 (rounded to 8.29)
    const qty = DecimalMath.calculateGrossQuantity('VOLUME', 2, 6.66, 0.83, 0.75);
    assert.strictEqual(DecimalMath.roundQuantity(qty), 8.2917);
    assert.strictEqual(DecimalMath.round(qty, 2).toNumber(), 8.29);
  });

  await t.test('calculates net quantity after deductions', () => {
    const gross = 10.06;
    const deductions = 2.12;
    const net = DecimalMath.subtract(gross, deductions);
    assert.strictEqual(net.toNumber(), 7.94);
  });

  await t.test('calculates estimate item amount with rounding', () => {
    // Teak Wood: 0.89 Cum * 86131.60 = 76657.124 -> 76657.12
    const amount = DecimalMath.multiply(0.89, 86131.60);
    assert.strictEqual(DecimalMath.roundMoney(amount), 76657.12);
  });

  await t.test('calculates primary depreciated value using Y.P. factors', () => {
    // Present Estimated Cost: 261669
    // Future Y.P. (41 yrs @ 7%): 13.394
    // Total Y.P. (45 yrs @ 7%): 13.606
    // Depreciated = 261669 * (13.394 / 13.606) = 257591.9967... -> 257592.00
    const factor = DecimalMath.divide(13.394, 13.606);
    const depreciated = DecimalMath.multiply(261669, factor);
    assert.strictEqual(Math.round(depreciated.toNumber()), 257592);
  });

  await t.test('calculates configured 10% salvage adjustment and final valuation', () => {
    // Primary Depreciated Cost: 257592.00
    // Salvage Depreciated Amount: 183981.00
    // 10% Adjustment = 18398.10
    const salvageDepreciated = 183981.00;
    const adjustment = DecimalMath.multiply(salvageDepreciated, 0.10);
    assert.strictEqual(DecimalMath.roundMoney(adjustment), 18398.10);

    // Final Valuation = 257592.00 - 18398.10 = 239193.90
    const finalVal = DecimalMath.subtract(257592.00, adjustment);
    assert.strictEqual(DecimalMath.roundMoney(finalVal), 239193.90);
  });
});
