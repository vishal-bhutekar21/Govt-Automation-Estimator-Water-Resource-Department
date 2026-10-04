import React from 'react';
import type { GeneratedRoom, GeneratedWall } from './gridGeometry';

export type SketchSelection =
  | { type: 'room'; id: string; code: string }
  | { type: 'wall'; id: string; label: string }
  | null;

export function StructureSketch(props: {
  overallLengthM: number;
  overallBreadthM: number;
  rooms: GeneratedRoom[];
  walls: Array<GeneratedWall & { thicknessM?: number | null }>;
  columnSpansM?: number[];
  rowSpansM?: number[];
  wallThicknessM?: number | null;
  openSides?: { front?: boolean; rear?: boolean; left?: boolean; right?: boolean } | null;
  title?: string;
  selectedId?: string | null;
  onSelect?: (selection: SketchSelection) => void;
}) {
  const {
    overallLengthM: L,
    overallBreadthM: B,
    rooms,
    walls,
    columnSpansM = [],
    rowSpansM = [],
    wallThicknessM = null,
    openSides,
    title = 'Generated 2D check sketch',
  } = props;

  if (!(L > 0) || !(B > 0)) {
    return (
      <div className="border rounded-gov-md bg-slate-50 px-4 py-8 text-sm text-slate-500 text-center">
        Enter dimensions to see the check sketch.
      </div>
    );
  }

  const padLeft = 52;
  const padTop = 40;
  const padRight = 36;
  const padBottom = 52;
  const drawW = 560;
  const drawH = Math.max(140, Math.round(drawW * (B / L)));
  const scale = drawW / L;
  const width = padLeft + drawW + padRight;
  const height = padTop + drawH + padBottom;
  const sx = (x: number) => padLeft + x * scale;
  const sy = (y: number) => padTop + y * scale;
  const defaultStroke = Math.max(2, (wallThicknessM || 0.15) * scale);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-semibold text-gov-navy">{title}</h3>
        <p className="text-xs text-slate-500">Clear/internal dimensions · wall thickness drawn separately · not the survey drawing</p>
      </div>
      <div className="overflow-x-auto border rounded-gov-md bg-white p-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[320px] max-w-3xl h-auto" role="img" aria-label={`Plan ${L} by ${B} metres`}>
          <text x={padLeft + drawW / 2} y={18} textAnchor="middle" className="fill-slate-700" fontSize="12">{formatDim(L)} m</text>
          <line x1={padLeft} y1={24} x2={padLeft + drawW} y2={24} stroke="#64748b" strokeWidth="1" />
          <text x={14} y={padTop + drawH / 2} textAnchor="middle" className="fill-slate-700" fontSize="12" transform={`rotate(-90 14 ${padTop + drawH / 2})`}>{formatDim(B)} m</text>

          <rect x={sx(0)} y={sy(0)} width={L * scale} height={B * scale} fill="rgba(15,42,68,0.02)" stroke="none" />

          {walls.map((wall) => {
            const stroke = Math.max(2, ((wall.thicknessM ?? wallThicknessM ?? 0.15) as number) * scale);
            const selected = props.selectedId === wall.id;
            return (
              <line
                key={wall.id}
                x1={sx(wall.x1M)}
                y1={sy(wall.y1M)}
                x2={sx(wall.x2M)}
                y2={sy(wall.y2M)}
                stroke={selected ? '#b45309' : wall.kind === 'EXTERNAL' ? '#0f2a44' : '#64748b'}
                strokeWidth={selected ? stroke + 1.5 : stroke}
                strokeLinecap="square"
                className="cursor-pointer"
                onClick={() => props.onSelect?.({ type: 'wall', id: wall.id, label: wall.label })}
              />
            );
          })}

          {openSides?.front && <OpenGap x1={sx(0)} y1={sy(0)} x2={sx(L)} y2={sy(0)} label="Front open" />}
          {openSides?.rear && <OpenGap x1={sx(0)} y1={sy(B)} x2={sx(L)} y2={sy(B)} label="Rear open" />}
          {openSides?.left && <OpenGap x1={sx(0)} y1={sy(0)} x2={sx(0)} y2={sy(B)} label="Left open" />}
          {openSides?.right && <OpenGap x1={sx(L)} y1={sy(0)} x2={sx(L)} y2={sy(B)} label="Right open" />}

          {rooms.map((room) => {
            const selected = props.selectedId === room.id;
            const open = room.enclosure === 'OPEN' || room.enclosure === 'PARTIALLY_OPEN';
            return (
              <g key={room.id} className="cursor-pointer" onClick={() => props.onSelect?.({ type: 'room', id: room.id, code: room.code })}>
                <rect
                  x={sx(room.xM) + defaultStroke / 4}
                  y={sy(room.yM) + defaultStroke / 4}
                  width={Math.max(4, room.lengthM * scale - defaultStroke / 2)}
                  height={Math.max(4, room.breadthM * scale - defaultStroke / 2)}
                  fill={selected ? 'rgba(180,83,9,0.12)' : open ? 'rgba(14,116,144,0.08)' : 'rgba(15,42,68,0.03)'}
                  stroke={selected ? '#b45309' : 'none'}
                />
                <text
                  x={sx(room.xM + room.lengthM / 2)}
                  y={sy(room.yM + room.breadthM / 2)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-gov-navy"
                  fontSize={Math.max(10, Math.min(14, room.lengthM * scale * 0.28))}
                  fontWeight="600"
                >
                  {room.code}{open ? ' · open' : ''}
                </text>
              </g>
            );
          })}

          {columnSpansM.length > 0 && columnSpansM.length <= 8 && cumulative(columnSpansM).map((x, index) => (
            <text key={`cx-${index}`} x={sx(x + columnSpansM[index] / 2)} y={padTop + drawH + 18} textAnchor="middle" fontSize="10" className="fill-slate-500">
              {formatDim(columnSpansM[index])}
            </text>
          ))}
          {rowSpansM.length > 0 && rowSpansM.length <= 8 && cumulative(rowSpansM).map((y, index) => (
            <text key={`ry-${index}`} x={padLeft + drawW + 8} y={sy(y + rowSpansM[index] / 2)} textAnchor="start" dominantBaseline="middle" fontSize="10" className="fill-slate-500">
              {formatDim(rowSpansM[index])}
            </text>
          ))}
        </svg>
      </div>
      <p className="text-xs text-slate-500">
        Overall clear size {formatDim(L)} m × {formatDim(B)} m
        {wallThicknessM ? ` · Wall thickness ${Math.round(wallThicknessM * 1000)} mm` : ''}
        {props.onSelect ? ' · Click a room or wall to inspect' : ''}
      </p>
    </div>
  );
}

function OpenGap(props: { x1: number; y1: number; x2: number; y2: number; label: string }) {
  return (
    <>
      <line x1={props.x1} y1={props.y1} x2={props.x2} y2={props.y2} stroke="#0e7490" strokeWidth="2" strokeDasharray="6 4" />
      <text x={(props.x1 + props.x2) / 2} y={(props.y1 + props.y2) / 2 - 6} textAnchor="middle" fontSize="10" className="fill-teal-800">{props.label}</text>
    </>
  );
}

function cumulative(spans: number[]): number[] {
  const starts = [0];
  for (let i = 0; i < spans.length - 1; i += 1) starts.push(starts[i] + spans[i]);
  return starts;
}

function formatDim(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(4).replace(/\.?0+$/, '');
}
