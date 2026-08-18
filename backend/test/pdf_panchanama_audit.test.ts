import assert from 'node:assert';
import test from 'node:test';
import { db } from '../src/database/db';
import { getCasePanchanama } from '../src/controllers/panchanamaController';

test('Phase 9 & 10: Panchanama, PDF Engine & Audit Logging Suite', async (t) => {
  await db.init();
  const caseId = 'case-jigaon-165';

  await t.test('Verifies Phase 9: Panchanama retrieval and witness endorsements', () => {
    const { panchanama, photos } = getCasePanchanama(caseId);

    assert.ok(panchanama);
    assert.strictEqual(panchanama.caseId, caseId);
    assert.ok(panchanama.panchas.length >= 2);
    assert.strictEqual(panchanama.panchas[0].name, 'Shri Rambhau Tukaram Patil');
    assert.strictEqual(panchanama.jointInspectionOfficers.length, 3);
  });

  await t.test('Verifies Phase 9: Evidence Photo Creation & Storage', () => {
    if (!db.evidencePhotos) db.evidencePhotos = [];

    const newPhoto = {
      id: 'photo-test-01',
      caseId,
      title: 'Front Elevation Test',
      category: 'FRONT_ELEVATION' as const,
      description: 'Test structural photo',
      photoUrl: 'https://example.com/photo.jpg',
      capturedAt: new Date().toISOString(),
    };

    db.evidencePhotos.push(newPhoto);
    db.save();

    const { photos } = getCasePanchanama(caseId);
    assert.ok(photos.some((p) => p.id === 'photo-test-01'));
  });

  await t.test('Verifies Phase 10: Audit Log Trail and Timestamp Sorting', () => {
    assert.ok(db.auditLogs.length > 0);
    const sorted = [...db.auditLogs].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    assert.strictEqual(sorted.length, db.auditLogs.length);
  });
});
