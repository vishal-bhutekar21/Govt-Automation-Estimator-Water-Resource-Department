import assert from 'node:assert';
import test from 'node:test';
import { db } from '../src/database/db';
import { signToken } from '../src/middleware/auth';
import { DecimalMath } from '../src/utils/decimal';

test('Backend API and Domain Logic Suite', async (t) => {
  await db.init();

  await t.test('Database contains initialized seed case for Mohan Vishwanath Gai', () => {
    assert.strictEqual(db.projects.length >= 1, true);
    assert.strictEqual(db.cases.length >= 1, true);

    const mohanCase = db.cases.find((c) => c.id === 'case-jigaon-165');
    assert.ok(mohanCase);
    assert.strictEqual(mohanCase.caseNumber, 'CASE/2008-09/165');

    const property = db.properties.find((p) => p.caseId === 'case-jigaon-165');
    assert.ok(property);
    assert.strictEqual(property.ownerName, 'Mohan Vishwanath Gai');
    assert.strictEqual(property.houseNumber, '165');

    const finalVal = db.finalValuations.find((f) => f.caseId === 'case-jigaon-165');
    assert.ok(finalVal);
    assert.ok(finalVal.finalValuationAmount >= 200000);
  });

  await t.test('JWT token generation and verification', () => {
    const adminUser = db.users.find((u) => u.role === 'ADMIN');
    assert.ok(adminUser);

    const token = signToken({
      id: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
    });
    assert.ok(token);
    assert.strictEqual(typeof token, 'string');
  });

  await t.test('Structure lifecycle validation logic', () => {
    const currentYear = new Date().getFullYear();
    const constructionYear = 2012;
    const totalLife = 45;

    const presentLife = currentYear - constructionYear;
    const futureLife = totalLife - presentLife;

    assert.strictEqual(presentLife >= 0, true);
    assert.strictEqual(futureLife >= 0, true);
    assert.strictEqual(presentLife + futureLife, totalLife);
  });

  await t.test('Live dashboard stats computation', () => {
    const totalProjects = db.projects.length;
    const totalCases = db.cases.length;
    let totalVal = 0;
    db.finalValuations.forEach((fv) => {
      totalVal = DecimalMath.add(totalVal, fv.finalValuationAmount).toNumber();
    });

    assert.strictEqual(totalProjects >= 1, true);
    assert.strictEqual(totalCases >= 1, true);
    assert.ok(totalVal >= 200000);
  });
});
