import React, { useEffect, useMemo, useState } from 'react';
import { StructureSketch } from './StructureSketch';
import { generateSimpleRectanglePlan } from './gridGeometry';

export function SimplePlanPanel(props: {
  structure: {
    id: string;
    name: string;
    structureKind?: string | null;
    overallLengthM?: number | null;
    overallBreadthM?: number | null;
    storeyHeightM?: number | null;
    wallThicknessM?: number | null;
    openSides?: { front?: boolean; rear?: boolean; left?: boolean; right?: boolean } | null;
    attachedToStructureId?: string | null;
    attachedSide?: string | null;
    geometryStatus?: string | null;
  };
  hostStructures: { id: string; name: string }[];
  canWrite: boolean;
  onSave: (body: Record<string, unknown>) => void;
}) {
  const isPorch = props.structure.structureKind === 'PORCH';
  const [length, setLength] = useState(str(props.structure.overallLengthM));
  const [width, setWidth] = useState(str(props.structure.overallBreadthM));
  const [height, setHeight] = useState(str(props.structure.storeyHeightM));
  const [thicknessMm, setThicknessMm] = useState(props.structure.wallThicknessM == null ? '' : String(Math.round(props.structure.wallThicknessM * 1000)));
  const [openSides, setOpenSides] = useState({
    front: Boolean(props.structure.openSides?.front),
    rear: Boolean(props.structure.openSides?.rear),
    left: Boolean(props.structure.openSides?.left),
    right: Boolean(props.structure.openSides?.right),
  });
  const [attachedTo, setAttachedTo] = useState(props.structure.attachedToStructureId || '');
  const [attachedSide, setAttachedSide] = useState(props.structure.attachedSide || 'FRONT');
  const [acknowledge, setAcknowledge] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLength(str(props.structure.overallLengthM));
    setWidth(str(props.structure.overallBreadthM));
    setHeight(str(props.structure.storeyHeightM));
    setThicknessMm(props.structure.wallThicknessM == null ? '' : String(Math.round(props.structure.wallThicknessM * 1000)));
    setOpenSides({
      front: Boolean(props.structure.openSides?.front),
      rear: Boolean(props.structure.openSides?.rear),
      left: Boolean(props.structure.openSides?.left),
      right: Boolean(props.structure.openSides?.right),
    });
    setAttachedTo(props.structure.attachedToStructureId || '');
    setAttachedSide(props.structure.attachedSide || 'FRONT');
    setAcknowledge(false);
  }, [props.structure.id, props.structure.geometryStatus, props.structure.overallLengthM, props.structure.overallBreadthM]);

  const L = Number(length);
  const B = Number(width);
  const thicknessM = thicknessMm === '' ? null : Number(thicknessMm) / 1000;
  const preview = useMemo(() => {
    if (!(L > 0) || !(B > 0)) return null;
    return generateSimpleRectanglePlan({
      structureId: props.structure.id,
      overallLengthM: L,
      overallBreadthM: B,
      wallThicknessM: thicknessM,
      openSides,
    });
  }, [props.structure.id, L, B, thicknessM, openSides]);

  const confirmed = props.structure.geometryStatus === 'CONFIRMED';
  const dirty = confirmed && (props.structure.overallLengthM !== L || props.structure.overallBreadthM !== B);

  const save = (confirm: boolean) => {
    if (!(L > 0) || !(B > 0)) {
      setError('Length and width must be greater than zero metres.');
      return;
    }
    if (preview && 'error' in preview) {
      setError(preview.error);
      return;
    }
    if (dirty && !acknowledge) {
      setError('Changing a confirmed plan regenerates walls. Tick the acknowledgement first.');
      return;
    }
    setError('');
    props.onSave({
      overallLengthM: L,
      overallBreadthM: B,
      storeyHeightM: height === '' ? null : Number(height),
      wallThicknessM: thicknessM,
      openSides,
      attachedToStructureId: isPorch ? attachedTo || null : null,
      attachedSide: isPorch ? attachedSide : null,
      confirm,
      acknowledgeRegenerate: dirty || undefined,
    });
  };

  return (
    <section className="bg-white border rounded-gov-lg p-5 space-y-4">
      <div>
        <h2 className="font-bold text-gov-navy">{isPorch ? 'Porch / Veranda plan' : props.structure.structureKind === 'OPEN_SHED' ? 'Open shed plan' : 'GI / Tin shed plan'}</h2>
      </div>
      <div className="grid md:grid-cols-2 gap-3 text-sm">
        <NumberField label="Length" suffix="m" value={length} onChange={setLength} placeholder="6.00" disabled={!props.canWrite} />
        <NumberField label="Width" suffix="m" value={width} onChange={setWidth} placeholder="3.00" disabled={!props.canWrite} />
        <NumberField label="Height" suffix="m" value={height} onChange={setHeight} placeholder="2.40" disabled={!props.canWrite} />
        <NumberField label="Wall thickness" suffix="mm" value={thicknessMm} onChange={setThicknessMm} placeholder="150" integer disabled={!props.canWrite} />
      </div>
      <div className="flex flex-wrap gap-3 text-sm">
        {(['front', 'rear', 'left', 'right'] as const).map((side) => (
          <label key={side} className="inline-flex items-center gap-2 border rounded px-3 py-2">
            <input
              type="checkbox"
              disabled={!props.canWrite}
              checked={openSides[side]}
              onChange={(e) => setOpenSides({ ...openSides, [side]: e.target.checked })}
            />
            {side[0].toUpperCase() + side.slice(1)} open
          </label>
        ))}
      </div>
      {isPorch && (
        <div className="grid md:grid-cols-2 gap-3 text-sm">
          <label>Attached to
            <select className="mt-1 w-full border rounded px-3 py-2" disabled={!props.canWrite} value={attachedTo} onChange={(e) => setAttachedTo(e.target.value)}>
              <option value="">Choose host structure</option>
              {props.hostStructures.filter((item) => item.id !== props.structure.id).map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
          <label>Side
            <select className="mt-1 w-full border rounded px-3 py-2" disabled={!props.canWrite} value={attachedSide} onChange={(e) => setAttachedSide(e.target.value)}>
              <option value="FRONT">Front</option>
              <option value="REAR">Rear</option>
              <option value="LEFT">Left</option>
              <option value="RIGHT">Right</option>
            </select>
          </label>
        </div>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
      {preview && !('error' in preview) && (
        <StructureSketch
          overallLengthM={L}
          overallBreadthM={B}
          rooms={[]}
          walls={preview.walls}
          wallThicknessM={thicknessM}
          openSides={openSides}
          title="Structure layout preview"
        />
      )}
      {dirty && props.canWrite && (
        <label className="flex items-start gap-2 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-gov-md px-3 py-2">
          <input type="checkbox" className="mt-1" checked={acknowledge} onChange={(e) => setAcknowledge(e.target.checked)} />
          <span>Changing the plan will regenerate walls. Review before continuing.</span>
        </label>
      )}
      {props.canWrite && (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="border rounded-gov-md px-4 py-2 text-sm font-semibold" onClick={() => save(false)}>Save draft plan</button>
          <button type="button" className="bg-gov-navy text-white rounded-gov-md px-4 py-2 text-sm font-semibold" onClick={() => save(true)}>Confirm plan</button>
        </div>
      )}
    </section>
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
}) {
  return (
    <label className="block">
      <span className="font-semibold text-slate-700">{props.label}{props.suffix ? ` (${props.suffix})` : ''}</span>
      <input
        disabled={props.disabled}
        inputMode={props.integer ? 'numeric' : 'decimal'}
        className="mt-1 w-full border border-slate-200 rounded-gov-sm px-3 py-2"
        value={props.value}
        placeholder={props.placeholder}
        onChange={(e) => {
          const next = e.target.value;
          if (next === '') return props.onChange(next);
          if (props.integer && !/^\d+$/.test(next)) return;
          if (!props.integer && !/^\d*\.?\d*$/.test(next)) return;
          props.onChange(next);
        }}
      />
    </label>
  );
}

function str(value: number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return String(value);
}
