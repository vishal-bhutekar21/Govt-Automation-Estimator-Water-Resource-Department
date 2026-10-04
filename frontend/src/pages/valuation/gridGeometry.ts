export type SpanMode = 'EQUAL' | 'UNEQUAL';

export interface GridLayoutInput {
  structureId: string;
  overallLengthM: number;
  overallBreadthM: number;
  gridColumns: number;
  gridRows: number;
  spanMode: SpanMode;
  columnSpansM?: number[] | null;
  rowSpansM?: number[] | null;
  wallThicknessM?: number | null;
  idFor?: (kind: string, key: string) => string;
}

export interface GeneratedRoom {
  id: string;
  structureId: string;
  code: string;
  lengthM: number;
  breadthM: number;
  areaM2: number;
  rowIndex: number;
  bayIndex: number;
  enclosure: 'ENCLOSED' | 'OPEN' | 'PARTIALLY_OPEN' | 'UNKNOWN';
  generated: true;
  boundaryWallIds: {
    north: string;
    south: string;
    east: string;
    west: string;
  };
  xM: number;
  yM: number;
}

export interface GeneratedWall {
  id: string;
  structureId: string;
  origin: 'CANDIDATE';
  kind: 'SHARED' | 'EXTERNAL';
  segmentKind: 'OUTER' | 'INTERNAL';
  label: string;
  count: number;
  lengthM: number;
  breadthM: number | null;
  depthM: null;
  thicknessM: number | null;
  thicknessSource: 'INHERITED';
  sourceRoomIds: string[];
  generated: true;
  axis: 'LONG' | 'SHORT';
  role: string;
  x1M: number;
  y1M: number;
  x2M: number;
  y2M: number;
}

/** Workbook-aligned clear spans for Gut 193 (source replay / fixture only). */
export const EKNATH_GUT193_WORKBOOK_SPANS = {
  columnSpansM: [3.6, 3.6, 3.5, 3.8],
  rowSpansM: [5.9, 5.75],
  wallThicknessM: 0.15,
  storeyHeightM: 1.97,
  gridColumns: 4,
  gridRows: 2,
  note: 'Workbook / page-3 aligned clear spans. Page 1 has conflicting R7/R8 and height readings.',
};

export interface GridGeometryResult {
  columnSpansM: number[];
  rowSpansM: number[];
  rooms: GeneratedRoom[];
  walls: GeneratedWall[];
  summary: {
    roomCount: number;
    outerLong: number;
    outerShort: number;
    internalVertical: number;
    internalHorizontal: number;
    totalWallRuns: number;
  };
}

const LENGTH_TOLERANCE = 1e-6;
const MAX_SIDE_M = 500;
const MAX_CELLS = 40;

export function validateGridLayout(input: {
  overallLengthM: number;
  overallBreadthM: number;
  gridColumns: number;
  gridRows: number;
  spanMode: SpanMode;
  columnSpansM?: number[] | null;
  rowSpansM?: number[] | null;
}): { ok: true; columnSpansM: number[]; rowSpansM: number[]; overallLengthM: number; overallBreadthM: number } | { ok: false; error: string } {
  let L = Number(input.overallLengthM);
  let B = Number(input.overallBreadthM);
  const C = Number(input.gridColumns);
  const R = Number(input.gridRows);
  const spanMode = input.spanMode;
  if (![C, R].every((value) => Number.isFinite(value))) {
    return { ok: false, error: 'Columns and rows must be numbers.' };
  }
  if (!Number.isInteger(C) || !Number.isInteger(R) || C < 1 || R < 1) {
    return { ok: false, error: 'Columns and rows must be whole numbers of at least 1.' };
  }
  if (C > MAX_CELLS || R > MAX_CELLS) {
    return { ok: false, error: `Columns and rows must each be at most ${MAX_CELLS}.` };
  }

  let columnSpansM: number[];
  let rowSpansM: number[];
  if (spanMode === 'EQUAL') {
    if (![L, B].every((value) => Number.isFinite(value)) || !(L > 0) || !(B > 0)) {
      return { ok: false, error: 'Long side and short side must be greater than zero metres.' };
    }
    if (L > MAX_SIDE_M || B > MAX_SIDE_M) {
      return { ok: false, error: `Sides must be at most ${MAX_SIDE_M} m.` };
    }
    columnSpansM = Array.from({ length: C }, () => L / C);
    rowSpansM = Array.from({ length: R }, () => B / R);
  } else {
    columnSpansM = (input.columnSpansM || []).map(Number);
    rowSpansM = (input.rowSpansM || []).map(Number);
    if (columnSpansM.length !== C || rowSpansM.length !== R) {
      return { ok: false, error: 'Unequal mode needs one span for every column and every row.' };
    }
    if (columnSpansM.some((span) => !(span > 0)) || rowSpansM.some((span) => !(span > 0))) {
      return { ok: false, error: 'Every grid span must be greater than zero metres.' };
    }
    const colSum = columnSpansM.reduce((sum, span) => sum + span, 0);
    const rowSum = rowSpansM.reduce((sum, span) => sum + span, 0);
    if (!(L > 0)) L = colSum;
    if (!(B > 0)) B = rowSum;
    if (Math.abs(colSum - L) > LENGTH_TOLERANCE) {
      return { ok: false, error: `Column spans must add up to the long side (${L} m). Clear spans are source facts.` };
    }
    if (Math.abs(rowSum - B) > LENGTH_TOLERANCE) {
      return { ok: false, error: `Row spans must add up to the short side (${B} m). Clear spans are source facts.` };
    }
    if (L > MAX_SIDE_M || B > MAX_SIDE_M) {
      return { ok: false, error: `Sides must be at most ${MAX_SIDE_M} m.` };
    }
  }
  return { ok: true, columnSpansM, rowSpansM, overallLengthM: L, overallBreadthM: B };
}

export function generateRectangularGrid(input: GridLayoutInput): GridGeometryResult | { error: string } {
  const validated = validateGridLayout(input);
  if (!validated.ok) return { error: validated.error };

  const { structureId, gridColumns: C, gridRows: R } = input;
  const { columnSpansM, rowSpansM, overallLengthM: L, overallBreadthM: B } = validated;
  const thickness = input.wallThicknessM ?? null;
  const idFor = input.idFor || ((kind, key) => `${kind}-${structureId}-${key}`);

  const wallNorth = makeWall({
    id: idFor('wall', 'outer-north'),
    structureId,
    kind: 'EXTERNAL',
    segmentKind: 'OUTER',
    label: 'Outer long wall (north)',
    lengthM: L,
    breadthM: thickness,
    thicknessM: thickness,
    axis: 'LONG',
    role: 'OUTER_NORTH',
    x1M: 0,
    y1M: 0,
    x2M: L,
    y2M: 0,
  });
  const wallSouth = makeWall({
    id: idFor('wall', 'outer-south'),
    structureId,
    kind: 'EXTERNAL',
    segmentKind: 'OUTER',
    label: 'Outer long wall (south)',
    lengthM: L,
    breadthM: thickness,
    thicknessM: thickness,
    axis: 'LONG',
    role: 'OUTER_SOUTH',
    x1M: 0,
    y1M: B,
    x2M: L,
    y2M: B,
  });
  const wallWest = makeWall({
    id: idFor('wall', 'outer-west'),
    structureId,
    kind: 'EXTERNAL',
    segmentKind: 'OUTER',
    label: 'Outer short wall (west)',
    lengthM: B,
    breadthM: thickness,
    thicknessM: thickness,
    axis: 'SHORT',
    role: 'OUTER_WEST',
    x1M: 0,
    y1M: 0,
    x2M: 0,
    y2M: B,
  });
  const wallEast = makeWall({
    id: idFor('wall', 'outer-east'),
    structureId,
    kind: 'EXTERNAL',
    segmentKind: 'OUTER',
    label: 'Outer short wall (east)',
    lengthM: B,
    breadthM: thickness,
    thicknessM: thickness,
    axis: 'SHORT',
    role: 'OUTER_EAST',
    x1M: L,
    y1M: 0,
    x2M: L,
    y2M: B,
  });

  const verticalInternals: GeneratedWall[] = [];
  let xCursor = 0;
  for (let c = 0; c < C - 1; c += 1) {
    xCursor += columnSpansM[c];
    verticalInternals.push(makeWall({
      id: idFor('wall', `vert-${c + 1}`),
      structureId,
      kind: 'SHARED',
      segmentKind: 'INTERNAL',
      label: `Internal wall between columns ${c + 1} and ${c + 2}`,
      lengthM: B,
      breadthM: thickness,
      thicknessM: thickness,
      axis: 'SHORT',
      role: `INTERNAL_VERTICAL_${c + 1}`,
      x1M: xCursor,
      y1M: 0,
      x2M: xCursor,
      y2M: B,
    }));
  }

  const horizontalInternals: GeneratedWall[] = [];
  let yCursor = 0;
  for (let r = 0; r < R - 1; r += 1) {
    yCursor += rowSpansM[r];
    horizontalInternals.push(makeWall({
      id: idFor('wall', `horiz-${r + 1}`),
      structureId,
      kind: 'SHARED',
      segmentKind: 'INTERNAL',
      label: `Internal wall between rows ${r + 1} and ${r + 2}`,
      lengthM: L,
      breadthM: thickness,
      thicknessM: thickness,
      axis: 'LONG',
      role: `INTERNAL_HORIZONTAL_${r + 1}`,
      x1M: 0,
      y1M: yCursor,
      x2M: L,
      y2M: yCursor,
    }));
  }

  const walls = [wallNorth, wallSouth, wallWest, wallEast, ...verticalInternals, ...horizontalInternals];
  const rooms: GeneratedRoom[] = [];
  const xStarts = prefixSums(columnSpansM);
  const yStarts = prefixSums(rowSpansM);

  for (let r = 0; r < R; r += 1) {
    for (let c = 0; c < C; c += 1) {
      const index = r * C + c + 1;
      const code = `R${index}`;
      const west = c === 0 ? wallWest.id : verticalInternals[c - 1].id;
      const east = c === C - 1 ? wallEast.id : verticalInternals[c].id;
      const north = r === 0 ? wallNorth.id : horizontalInternals[r - 1].id;
      const south = r === R - 1 ? wallSouth.id : horizontalInternals[r].id;
      const lengthM = columnSpansM[c];
      const breadthM = rowSpansM[r];
      const roomId = idFor('room', `${r}-${c}`);
      rooms.push({
        id: roomId,
        structureId,
        code,
        lengthM,
        breadthM,
        areaM2: lengthM * breadthM,
        rowIndex: r,
        bayIndex: c,
        enclosure: 'ENCLOSED',
        generated: true,
        boundaryWallIds: { north, south, east, west },
        xM: xStarts[c],
        yM: yStarts[r],
      });
      attachRoom(walls, west, roomId);
      attachRoom(walls, east, roomId);
      attachRoom(walls, north, roomId);
      attachRoom(walls, south, roomId);
    }
  }

  const totalArea = rooms.reduce((sum, room) => sum + room.areaM2, 0);
  if (Math.abs(totalArea - L * B) > 1e-6) {
    return { error: 'Generated room areas do not match the overall size.' };
  }

  return {
    columnSpansM,
    rowSpansM,
    rooms,
    walls,
    summary: {
      roomCount: rooms.length,
      outerLong: 2,
      outerShort: 2,
      internalVertical: C - 1,
      internalHorizontal: R - 1,
      totalWallRuns: walls.length,
    },
  };
}

export function generateSimpleRectanglePlan(input: {
  structureId: string;
  overallLengthM: number;
  overallBreadthM: number;
  wallThicknessM?: number | null;
  openSides?: { front?: boolean; rear?: boolean; left?: boolean; right?: boolean } | null;
  idFor?: (kind: string, key: string) => string;
}): { walls: GeneratedWall[]; overallLengthM: number; overallBreadthM: number } | { error: string } {
  const L = Number(input.overallLengthM);
  const B = Number(input.overallBreadthM);
  if (!(L > 0) || !(B > 0)) return { error: 'Length and width must be greater than zero metres.' };
  const thickness = input.wallThicknessM ?? null;
  const idFor = input.idFor || ((kind, key) => `${kind}-${input.structureId}-${key}`);
  const open = {
    front: Boolean(input.openSides?.front),
    rear: Boolean(input.openSides?.rear),
    left: Boolean(input.openSides?.left),
    right: Boolean(input.openSides?.right),
  };
  const walls: GeneratedWall[] = [];
  if (!open.front) {
    walls.push(makeWall({
      id: idFor('wall', 'front'), structureId: input.structureId, kind: 'EXTERNAL', segmentKind: 'OUTER',
      label: 'Front wall', lengthM: L, breadthM: thickness, thicknessM: thickness, axis: 'LONG', role: 'FRONT',
      x1M: 0, y1M: 0, x2M: L, y2M: 0,
    }));
  }
  if (!open.rear) {
    walls.push(makeWall({
      id: idFor('wall', 'rear'), structureId: input.structureId, kind: 'EXTERNAL', segmentKind: 'OUTER',
      label: 'Rear wall', lengthM: L, breadthM: thickness, thicknessM: thickness, axis: 'LONG', role: 'REAR',
      x1M: 0, y1M: B, x2M: L, y2M: B,
    }));
  }
  if (!open.left) {
    walls.push(makeWall({
      id: idFor('wall', 'left'), structureId: input.structureId, kind: 'EXTERNAL', segmentKind: 'OUTER',
      label: 'Left wall', lengthM: B, breadthM: thickness, thicknessM: thickness, axis: 'SHORT', role: 'LEFT',
      x1M: 0, y1M: 0, x2M: 0, y2M: B,
    }));
  }
  if (!open.right) {
    walls.push(makeWall({
      id: idFor('wall', 'right'), structureId: input.structureId, kind: 'EXTERNAL', segmentKind: 'OUTER',
      label: 'Right wall', lengthM: B, breadthM: thickness, thicknessM: thickness, axis: 'SHORT', role: 'RIGHT',
      x1M: L, y1M: 0, x2M: L, y2M: B,
    }));
  }
  return { walls, overallLengthM: L, overallBreadthM: B };
}

function prefixSums(spans: number[]): number[] {
  const starts = [0];
  for (let i = 0; i < spans.length; i += 1) starts.push(starts[i] + spans[i]);
  return starts.slice(0, spans.length);
}

function makeWall(input: Omit<GeneratedWall, 'origin' | 'count' | 'depthM' | 'sourceRoomIds' | 'generated' | 'thicknessSource'> & { thicknessSource?: 'INHERITED' }): GeneratedWall {
  return {
    ...input,
    origin: 'CANDIDATE',
    count: 1,
    depthM: null,
    thicknessSource: 'INHERITED',
    sourceRoomIds: [],
    generated: true,
  };
}

function attachRoom(walls: GeneratedWall[], wallId: string, roomId: string): void {
  const wall = walls.find((item) => item.id === wallId);
  if (wall && !wall.sourceRoomIds.includes(roomId)) wall.sourceRoomIds.push(roomId);
}
