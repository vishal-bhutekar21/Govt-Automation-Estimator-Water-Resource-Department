import assert from 'node:assert';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import test from 'node:test';

process.env.NODE_ENV = 'test';

test('structure layout save and reload keeps the same geometry', async () => {
  const { default: app } = await import('../src/index.ts');
  const { db } = await import('../src/database/db.ts');
  const { signToken } = await import('../src/middleware/auth.ts');
  const admin = db.users.find((user) => user.role === 'ADMIN');
  assert.ok(admin);
  const token = signToken(admin);
  const server = app.listen(0);
  await once(server, 'listening');
  const port = (server.address() as AddressInfo).port;
  const base = `http://127.0.0.1:${port}/api/v1`;

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const created = await fetch(`${base}/cases`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      projectId: 'proj-jigaon-01',
      caseNumber: `LAYOUT-${Date.now()}`,
      ownerName: 'Layout Test Owner',
      village: 'Bondgaon',
      surveyNumber: '193',
      dateOfInspection: '2026-10-04',
      valuationDate: '2026-10-04',
    }),
  }).then((res) => res.json());
  assert.ok(created.case?.id);

  const structureRes = await fetch(`${base}/workflow/cases/${created.case.id}/structures`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: 'Main house' }),
  }).then((res) => res.json());
  const structureId = structureRes.structure?.id;
  assert.ok(structureId);

  const saved = await fetch(`${base}/workflow/structures/${structureId}/structure-layout`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      overallLengthM: 15.35,
      overallBreadthM: 5.8,
      gridColumns: 4,
      gridRows: 2,
      spanMode: 'EQUAL',
      confirm: true,
    }),
  }).then((res) => res.json());
  assert.equal(saved.summary?.roomCount, 8);
  assert.equal(saved.summary?.totalWallRuns, 8);
  assert.equal(saved.structure?.geometryStatus, 'CONFIRMED');

  const reloaded = await fetch(`${base}/workflow/cases/${created.case.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((res) => res.json());
  const rooms = reloaded.rooms.filter((room: { structureId: string }) => room.structureId === structureId);
  const walls = reloaded.wallRuns.filter((wall: { structureId: string }) => wall.structureId === structureId);
  assert.equal(rooms.length, 8);
  assert.equal(walls.length, 8);
  assert.equal(reloaded.structures.find((item: { id: string }) => item.id === structureId)?.overallLengthM, 15.35);
  assert.equal(rooms[0].code, 'R1');
  assert.equal(rooms[0].generated, true);
  assert.ok(rooms[0].boundaryWallIds?.east);
  assert.equal(walls.filter((wall: { origin: string }) => wall.origin === 'ENGINEER_CONFIRMED').length, 8);

  const blocked = await fetch(`${base}/workflow/structures/${structureId}/structure-layout`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      overallLengthM: 16.2,
      overallBreadthM: 5.8,
      gridColumns: 5,
      gridRows: 2,
      spanMode: 'EQUAL',
      confirm: false,
    }),
  });
  assert.equal(blocked.status, 409);

  server.close();
});
