import React, { useEffect, useMemo, useState } from 'react';
import { DecimalField, sanitizeDecimalInput } from '../../components/ui/DecimalField';
import { StructureSketch, type SketchSelection } from './StructureSketch';
import { generateRectangularGrid, type SpanMode } from './gridGeometry';

export interface LayoutStructure {
  id: string;
  name: string;
  overallLengthM?: number | null;
  overallBreadthM?: number | null;
  gridColumns?: number | null;
  gridRows?: number | null;
  spanMode?: SpanMode | null;
  columnSpansM?: number[] | null;
  rowSpansM?: number[] | null;
  geometryStatus?: 'NONE' | 'DRAFT_GENERATED' | 'CONFIRMED' | null;
  wallThicknessM?: number | null;
  storeyHeightM?: number | null;
}

export function StructureLayoutPanel(props: {
  structure: LayoutStructure;
  rooms?: { id?: string; code: string; enclosure?: string; lengthM?: number | null; breadthM?: number | null; rowIndex?: number | null; bayIndex?: number | null; boundaryWallIds?: { north: string; south: string; east: string; west: string } }[];
  walls?: { id: string; label: string; lengthM: number; origin: string; thicknessM?: number | null; heightM?: number | null; thicknessSource?: string; heightSource?: string; segmentKind?: string; verticalZones?: { id: string; kind: string; heightM: number | null }[]; sourceRoomIds?: string[] }[];
  canWrite: boolean;
  focus?: boolean;
  onSave: (body: Record<string, unknown>) => void;
  onPatchRoom?: (roomId: string, body: Record<string, unknown>) => void;
  onPatchWall?: (wallId: string, body: Record<string, unknown>) => void;
}) {
  const [longSide, setLongSide] = useState(str(props.structure.overallLengthM));
  const [shortSide, setShortSide] = useState(str(props.structure.overallBreadthM));
  const [columns, setColumns] = useState(str(props.structure.gridColumns ?? 4));
  const [rows, setRows] = useState(str(props.structure.gridRows ?? 2));
  const [spanMode, setSpanMode] = useState<SpanMode>(props.structure.spanMode === 'UNEQUAL' ? 'UNEQUAL' : 'EQUAL');
  const [columnSpans, setColumnSpans] = useState<string[]>(
    (props.structure.columnSpansM || []).map((value) => String(value))
  );
  const [rowSpans, setRowSpans] = useState<string[]>(
    (props.structure.rowSpansM || []).map((value) => String(value))
  );
  const [showSpans, setShowSpans] = useState(props.structure.spanMode === 'UNEQUAL');
  const [acknowledge, setAcknowledge] = useState(false);
  const [localError, setLocalError] = useState('');
  const [selection, setSelection] = useState<SketchSelection>(null);

  useEffect(() => {
    setLongSide(str(props.structure.overallLengthM));
    setShortSide(str(props.structure.overallBreadthM));
    setColumns(str(props.structure.gridColumns ?? 4));
    setRows(str(props.structure.gridRows ?? 2));
    setSpanMode(props.structure.spanMode === 'UNEQUAL' ? 'UNEQUAL' : 'EQUAL');
    setColumnSpans((props.structure.columnSpansM || []).map((value) => String(value)));
    setRowSpans((props.structure.rowSpansM || []).map((value) => String(value)));
    setShowSpans(props.structure.spanMode === 'UNEQUAL');
    setAcknowledge(false);
  }, [
    props.structure.id,
    props.structure.overallLengthM,
    props.structure.overallBreadthM,
    props.structure.gridColumns,
    props.structure.gridRows,
    props.structure.spanMode,
    props.structure.geometryStatus,
  ]);

  const L = Number(longSide);
  const B = Number(shortSide);
  const C = Number(columns);
  const R = Number(rows);

  useEffect(() => {
    if (spanMode !== 'UNEQUAL') return;
    if (Number.isInteger(C) && C >= 1 && columnSpans.length !== C) {
      setColumnSpans(Array.from({ length: C }, (_, index) => columnSpans[index] || (Number.isFinite(L) && C > 0 ? String(round4(L / C)) : '')));
    }
    if (Number.isInteger(R) && R >= 1 && rowSpans.length !== R) {
      setRowSpans(Array.from({ length: R }, (_, index) => rowSpans[index] || (Number.isFinite(B) && R > 0 ? String(round4(B / R)) : '')));
    }
  }, [spanMode, C, R, L, B]);

  const preview = useMemo(() => {
    if (!(L > 0) || !(B > 0) || !Number.isInteger(C) || !Number.isInteger(R) || C < 1 || R < 1) {
      return null;
    }
    const result = generateRectangularGrid({
      structureId: props.structure.id,
      overallLengthM: L,
      overallBreadthM: B,
      gridColumns: C,
      gridRows: R,
      spanMode,
      columnSpansM: spanMode === 'UNEQUAL' ? columnSpans.map(Number) : null,
      rowSpansM: spanMode === 'UNEQUAL' ? rowSpans.map(Number) : null,
      wallThicknessM: props.structure.wallThicknessM ?? null,
    });
    return result;
  }, [props.structure.id, props.structure.wallThicknessM, L, B, C, R, spanMode, columnSpans, rowSpans]);

  const confirmed = props.structure.geometryStatus === 'CONFIRMED';
  const needsAck = confirmed && layoutDirty(props.structure, { L, B, C, R, spanMode, columnSpans, rowSpans });

  const save = (confirm: boolean) => {
    if (!(L > 0) || !(B > 0)) {
      setLocalError('Long side and short side must be greater than zero metres.');
      return;
    }
    if (!Number.isInteger(C) || !Number.isInteger(R) || C < 1 || R < 1) {
      setLocalError('Columns and rows must be whole numbers of at least 1.');
      return;
    }
    if (!preview || 'error' in preview) {
      setLocalError(preview && 'error' in preview ? preview.error : 'Enter a valid long side, short side, columns, and rows.');
      return;
    }
    if (needsAck && !acknowledge) {
      setLocalError('Changing the structure layout will regenerate rooms and walls. Tick the acknowledgement before saving.');
      return;
    }
    setLocalError('');
    props.onSave({
      overallLengthM: L,
      overallBreadthM: B,
      gridColumns: C,
      gridRows: R,
      spanMode,
      columnSpansM: spanMode === 'UNEQUAL' ? columnSpans.map(Number) : undefined,
      rowSpansM: spanMode === 'UNEQUAL' ? rowSpans.map(Number) : undefined,
      confirm,
      acknowledgeRegenerate: needsAck ? true : undefined,
    });
  };

  return (
    <section data-focus-section="rooms" className={`bg-white border border-slate-200 rounded-gov-lg p-5 space-y-4 ${props.focus ? 'ring-2 ring-gov-navy' : ''}`}>
      <div>
        <h2 className="font-bold text-gov-navy text-base">Building plan</h2>
        <p className="text-sm text-slate-500">Clear internal overall size and room grid.</p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <StatusChip ok={L > 0 && B > 0} label="Overall dimensions" />
        <StatusChip ok={Number.isInteger(C) && Number.isInteger(R) && C >= 1 && R >= 1} label="Grid defined" />
        <StatusChip ok={Boolean(preview && !('error' in preview))} label={preview && !('error' in preview) ? `${preview.summary.roomCount} rooms` : 'Geometry'} />
        <StatusChip ok={props.structure.geometryStatus === 'CONFIRMED'} label={props.structure.geometryStatus === 'CONFIRMED' ? 'Confirmed' : props.structure.geometryStatus === 'DRAFT_GENERATED' ? 'Draft generated' : 'Needs confirmation'} />
      </div>

      <div className="grid md:grid-cols-2 gap-3 text-sm">
        <label className="block">
          <span className="font-semibold text-slate-700">Shape</span>
          <select className="mt-1 w-full border rounded-gov-sm px-3 py-2 bg-slate-50" value="RECTANGLE" disabled>
            <option value="RECTANGLE">Rectangle</option>
          </select>
        </label>
        <div className="rounded-gov-md border bg-slate-50 px-3 py-2">
          <p className="font-semibold text-slate-700">Layout summary</p>
          <p className="text-slate-600">
            {Number.isInteger(C) && Number.isInteger(R) ? `${C} × ${R}` : '—'} ·{' '}
            {L > 0 && B > 0 ? `${format(L)} m × ${format(B)} m` : '—'} ·{' '}
            {Number.isInteger(C) && Number.isInteger(R) ? `${C * R} rooms` : '—'}
          </p>
          <p className="text-xs text-slate-500 mt-1">{C || '—'} columns along long side × {R || '—'} rows along short side</p>
        </div>
        <NumberField label="Long side" suffix="m" value={longSide} onChange={setLongSide} placeholder="15.35" disabled={!props.canWrite} />
        <NumberField label="Short side" suffix="m" value={shortSide} onChange={setShortSide} placeholder="5.80" disabled={!props.canWrite} />
        <NumberField label="Columns" value={columns} onChange={setColumns} placeholder="4" integer disabled={!props.canWrite} hint="Along the long side" />
        <NumberField label="Rows" value={rows} onChange={setRows} placeholder="2" integer disabled={!props.canWrite} hint="Along the short side" />
      </div>

      {props.canWrite && (
        <button type="button" className="text-sm text-gov-navy" onClick={() => { setShowSpans(!showSpans); setSpanMode(!showSpans ? 'UNEQUAL' : 'EQUAL'); }}>
          {showSpans ? 'Use equal grid spans' : 'Advanced: Edit grid spans'}
        </button>
      )}

      {showSpans && (
        <div className="space-y-3 text-sm border rounded-gov-md p-3">
          <p className="text-xs text-slate-500">Column spans must add up to the long side. Row spans must add up to the short side.</p>
          <div>
            <p className="font-semibold mb-1">Long direction spans (m)</p>
            <div className="flex flex-wrap gap-2">
              {columnSpans.map((value, index) => (
                <input key={`c-${index}`} className="border rounded px-2 py-1 w-24" inputMode="decimal" value={value} disabled={!props.canWrite} onChange={(e) => {
                  const next = sanitizeDecimalInput(e.target.value);
                  if (next === null) return;
                  setColumnSpans(columnSpans.map((item, i) => i === index ? next : item));
                }} />
              ))}
            </div>
          </div>
          <div>
            <p className="font-semibold mb-1">Short direction spans (m)</p>
            <div className="flex flex-wrap gap-2">
              {rowSpans.map((value, index) => (
                <input key={`r-${index}`} className="border rounded px-2 py-1 w-24" inputMode="decimal" value={value} disabled={!props.canWrite} onChange={(e) => {
                  const next = sanitizeDecimalInput(e.target.value);
                  if (next === null) return;
                  setRowSpans(rowSpans.map((item, i) => i === index ? next : item));
                }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {preview && 'error' in preview && <p className="text-sm text-red-700">{preview.error}</p>}
      {localError && <p className="text-sm text-red-700">{localError}</p>}

      {preview && !('error' in preview) && (
        <>
          <StructureSketch
            overallLengthM={L}
            overallBreadthM={B}
            rooms={preview.rooms.map((room) => {
              const saved = (props.rooms || []).find((item) => item.code === room.code);
              return { ...room, enclosure: (saved?.enclosure as 'ENCLOSED') || room.enclosure, id: saved?.id || room.id };
            })}
            walls={preview.walls.map((wall) => {
              const saved = (props.walls || []).find((item) => item.id === wall.id || item.label === wall.label);
              return { ...wall, thicknessM: saved?.thicknessM ?? props.structure.wallThicknessM ?? wall.thicknessM };
            })}
            columnSpansM={preview.columnSpansM}
            rowSpansM={preview.rowSpansM}
            wallThicknessM={props.structure.wallThicknessM}
            selectedId={selection?.id || null}
            onSelect={setSelection}
          />
          <div className="text-sm text-slate-600">
            Generated from clear long side {format(L)} m, short side {format(B)} m, grid {C} × {R}.
            {' '}{preview.summary.roomCount} rooms · {preview.summary.totalWallRuns} primary wall runs.
            {props.structure.wallThicknessM ? ` · Thickness ${Math.round(props.structure.wallThicknessM * 1000)} mm` : ''}
          </div>
          {selection && (
            <PlanInspector
              selection={selection}
              rooms={props.rooms || []}
              walls={props.walls || []}
              structure={props.structure}
              canWrite={props.canWrite}
              onPatchRoom={props.onPatchRoom}
              onPatchWall={props.onPatchWall}
            />
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-1">Room</th>
                  <th>Row</th>
                  <th>Column</th>
                  <th>Width</th>
                  <th>Breadth</th>
                  <th>Area</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {preview.rooms.map((room) => {
                  const saved = (props.rooms || []).find((item) => item.code === room.code);
                  return (
                    <tr key={room.id} className="border-t">
                      <td className="py-1 font-semibold">{room.code}</td>
                      <td>{room.rowIndex + 1}</td>
                      <td>{room.bayIndex + 1}</td>
                      <td>{format(room.lengthM)} m</td>
                      <td>{format(room.breadthM)} m</td>
                      <td>{format(room.areaM2)} m²</td>
                      <td>{saved?.enclosure || 'ENCLOSED'}</td>
                      <td className="text-xs text-slate-400">Derived</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {needsAck && props.canWrite && (
        <label className="flex items-start gap-2 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-gov-md px-3 py-2">
          <input type="checkbox" className="mt-1" checked={acknowledge} onChange={(e) => setAcknowledge(e.target.checked)} />
          <span>Changing the structure layout will regenerate rooms and walls. Review the structure before continuing.</span>
        </label>
      )}

      {props.canWrite && (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="border rounded-gov-md px-4 py-2 text-sm font-semibold" onClick={() => save(false)}>Save draft structure</button>
          <button type="button" className="bg-gov-navy text-white rounded-gov-md px-4 py-2 text-sm font-semibold" onClick={() => save(true)}>Confirm structure</button>
        </div>
      )}
    </section>
  );
}

function StatusChip(props: { ok: boolean; label: string }) {
  return (
    <span className={`rounded-full px-3 py-1 ${props.ok ? 'bg-teal-50 text-teal-900' : 'bg-amber-50 text-amber-900'}`}>
      {props.ok ? '✓' : '•'} {props.label}
    </span>
  );
}

function NumberField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  suffix?: string;
  integer?: boolean;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <DecimalField
      label={props.label}
      value={props.value}
      onChange={props.onChange}
      placeholder={props.placeholder}
      suffix={props.suffix}
      integer={props.integer}
      disabled={props.disabled}
      hint={props.hint}
      className="block"
    />
  );
}

function str(value: number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

function format(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(4).replace(/\.?0+$/, '');
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function layoutDirty(structure: LayoutStructure, next: {
  L: number; B: number; C: number; R: number; spanMode: SpanMode; columnSpans: string[]; rowSpans: string[];
}): boolean {
  if (structure.overallLengthM !== next.L) return true;
  if (structure.overallBreadthM !== next.B) return true;
  if (structure.gridColumns !== next.C) return true;
  if (structure.gridRows !== next.R) return true;
  if ((structure.spanMode || 'EQUAL') !== next.spanMode) return true;
  if (next.spanMode === 'UNEQUAL') {
    if ((structure.columnSpansM || []).join('|') !== next.columnSpans.map(Number).join('|')) return true;
    if ((structure.rowSpansM || []).join('|') !== next.rowSpans.map(Number).join('|')) return true;
  }
  return false;
}

function PlanInspector(props: {
  selection: SketchSelection;
  rooms: { id?: string; code: string; enclosure?: string; lengthM?: number | null; breadthM?: number | null; boundaryWallIds?: { north: string; south: string; east: string; west: string } }[];
  walls: { id: string; label: string; lengthM: number; origin: string; thicknessM?: number | null; heightM?: number | null; thicknessSource?: string; heightSource?: string; segmentKind?: string; verticalZones?: { id: string; kind: string; heightM: number | null }[]; sourceRoomIds?: string[] }[];
  structure: LayoutStructure;
  canWrite: boolean;
  onPatchRoom?: (roomId: string, body: Record<string, unknown>) => void;
  onPatchWall?: (wallId: string, body: Record<string, unknown>) => void;
}) {
  if (!props.selection) return null;
  if (props.selection.type === 'room') {
    const selectedRoom = props.selection;
    const room = props.rooms.find((item) => item.id === selectedRoom.id || item.code === selectedRoom.code);
    if (!room?.id) {
      return <div className="border rounded-gov-md p-3 text-sm text-slate-600">Save the draft structure to inspect and mark room {selectedRoom.code}.</div>;
    }
    return (
      <div className="border rounded-gov-md p-3 text-sm space-y-2 bg-slate-50">
        <p className="font-semibold">{room.code}</p>
        <p>Clear size {room.lengthM ?? '—'} m × {room.breadthM ?? '—'} m · Derived from grid spans</p>
        <label>Enclosure
          <select
            className="ml-2 border rounded px-2 py-1"
            disabled={!props.canWrite}
            value={room.enclosure || 'ENCLOSED'}
            onChange={(e) => props.onPatchRoom?.(room.id!, { enclosure: e.target.value })}
          >
            <option value="ENCLOSED">Enclosed</option>
            <option value="OPEN">Open</option>
            <option value="PARTIALLY_OPEN">Partially open</option>
            <option value="UNKNOWN">Unknown</option>
          </select>
        </label>
      </div>
    );
  }
  const selectedWall = props.selection;
  const wall = props.walls.find((item) => item.id === selectedWall.id);
  if (!wall) {
    return <div className="border rounded-gov-md p-3 text-sm text-slate-600">Save the draft structure to inspect wall properties for {selectedWall.label}.</div>;
  }
  const thicknessMm = wall.thicknessM == null ? (props.structure.wallThicknessM == null ? '' : String(Math.round(props.structure.wallThicknessM * 1000))) : String(Math.round(wall.thicknessM * 1000));
  const height = wall.heightM ?? props.structure.storeyHeightM;
  return (
    <div className="border rounded-gov-md p-3 text-sm space-y-2 bg-slate-50">
      <p className="font-semibold">{wall.label}</p>
      <p>Length {wall.lengthM} m · {wall.segmentKind || wall.origin} · Source: {wall.origin === 'MANUAL' ? 'Measured' : 'Generated from grid'}</p>
      <p>Thickness {thicknessMm || '—'} mm ({wall.thicknessSource || 'INHERITED'}) · Height {height ?? '—'} m ({wall.heightSource || 'INHERITED'})</p>
      {props.canWrite && (
        <div className="flex flex-wrap gap-2">
          <label>Override thickness (mm)
            <input
              key={`${wall.id}-th-${thicknessMm}`}
              className="ml-2 border border-slate-200 rounded-gov-sm px-2 py-1 w-24"
              inputMode="numeric"
              defaultValue={thicknessMm}
              onBlur={(e) => {
                if (e.target.value === '') return;
                props.onPatchWall?.(wall.id, { thicknessM: Number(e.target.value) / 1000 });
              }}
            />
          </label>
          <label>Override height (m)
            <input
              key={`${wall.id}-ht-${height ?? ''}`}
              className="ml-2 border border-slate-200 rounded-gov-sm px-2 py-1 w-24"
              inputMode="decimal"
              defaultValue={height?.toString() || ''}
              onBlur={(e) => {
                if (e.target.value === '') return;
                props.onPatchWall?.(wall.id, { heightM: Number(e.target.value) });
              }}
            />
          </label>
          <button
            type="button"
            className="border rounded px-3 py-1"
            onClick={() => props.onPatchWall?.(wall.id, {
              segmentKind: 'LOW_WALL',
              verticalZones: [
                { kind: 'MASONRY', heightM: 1 },
                { kind: 'MESH', heightM: height == null ? null : Math.max(0, Number(height) - 1) },
              ],
            })}
          >
            Set low wall + mesh zones
          </button>
        </div>
      )}
      {(wall.verticalZones || []).length > 0 && (
        <ul className="text-xs text-slate-600">
          {wall.verticalZones!.map((zone) => <li key={zone.id}>{zone.kind}: {zone.heightM ?? '—'} m</li>)}
        </ul>
      )}
    </div>
  );
}
