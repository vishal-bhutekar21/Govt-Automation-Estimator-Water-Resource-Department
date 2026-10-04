import React, { useEffect, useState } from 'react';
import { StructureLayoutPanel } from './StructureLayoutPanel';
import { SimplePlanPanel } from './SimplePlanPanel';

export interface StructureRow {
  id: string;
  name: string;
  structureKind?: string | null;
  structureTypeText: string;
  wallMaterialText: string;
  wallThicknessM: number | null;
  storeyHeightM: number | null;
  constructionYear: number | null;
  usefulLifeYears: number | null;
  floorFinish: string;
  roofFinish: string;
  overallLengthM?: number | null;
  overallBreadthM?: number | null;
  gridColumns?: number | null;
  gridRows?: number | null;
  spanMode?: 'EQUAL' | 'UNEQUAL' | null;
  columnSpansM?: number[] | null;
  rowSpansM?: number[] | null;
  geometryStatus?: 'NONE' | 'DRAFT_GENERATED' | 'CONFIRMED' | null;
  openSides?: { front?: boolean; rear?: boolean; left?: boolean; right?: boolean } | null;
  attachedToStructureId?: string | null;
  attachedSide?: string | null;
  foundationWidthM?: number | null;
  groundBeamDepthM?: number | null;
  solingDepthM?: number | null;
  evidenceConflictNotes?: string;
}

export interface RoomRow {
  id?: string;
  code: string;
  lengthM: number | null;
  breadthM: number | null;
  rowIndex: number | null;
  bayIndex: number | null;
  enclosure: 'ENCLOSED' | 'OPEN' | 'PARTIALLY_OPEN' | 'UNKNOWN';
  boundaryWallIds?: { north: string; south: string; east: string; west: string };
}

export interface WallRow {
  id: string;
  origin: string;
  label: string;
  lengthM: number;
  thicknessM?: number | null;
  heightM?: number | null;
  thicknessSource?: string;
  heightSource?: string;
  segmentKind?: string;
  verticalZones?: { id: string; kind: string; heightM: number | null }[];
  sourceRoomIds?: string[];
}

export interface OpeningRow {
  id: string;
  structureId: string;
  code: string;
  kind: string;
  count: number | null;
  widthM: number | null;
  heightM: number | null;
}

export interface MemberRow {
  id: string;
  structureId: string;
  kind: string;
  count: number | null;
  lengthM: number | null;
  breadthM: number | null;
  depthM: number | null;
}

export interface FactCheck {
  id: string;
  label: string;
  present: boolean;
  source: string;
}

export interface RuleGuidance {
  ruleId: string;
  title: string;
  unit: string;
  readiness: string;
  reason: string;
  formula: string;
  facts: FactCheck[];
  derivedQuantity: number | null;
  derivedFrom: string;
  catalogueItemNumber?: string | null;
  ruleStatus?: string;
  goTo: string | null;
}

interface DerivedRow {
  label: string;
  quantity: number | null;
  unit: string;
  source: string;
  note: string;
}

const MEMBER_KINDS = [
  ['COLUMN', 'Columns'],
  ['BEAM', 'Beams'],
  ['POST', 'Posts'],
  ['RAFTER_X', 'Rafters along the length'],
  ['RAFTER_Y', 'Rafters across the width'],
  ['PAULI', 'Pauli'],
  ['BALLI', 'Balli'],
  ['GI_PIPE', 'GI pipes'],
  ['MS_ANGLE', 'MS angles'],
  ['MESH', 'Mesh'],
  ['OTHER', 'Other member'],
] as const;

const WALL_MATERIALS = [
  'Siporex / AAC block',
  'Burnt brick',
  'Concrete block',
  'Stone masonry',
  'Mud / adobe',
  'GI sheet cladding',
  'Timber boarded',
  'None / open sides',
];

const FLOOR_FINISHES = [
  'Ceramic tile',
  'Cement flooring',
  'IPS flooring',
  'Kota stone',
  'Marble',
  'Rough / unfinished',
  'None',
];

const ROOF_FINISHES = [
  'Wood plank ceiling',
  'Non-teak wood plank ceiling',
  'C.G.I. sheet',
  'G.I. sheet',
  'A.C. sheet',
  'R.C.C. slab',
  'Mangalore tiles',
  'Country tiles',
  'None',
];

const CONSTRUCTION_TYPES = [
  'Block masonry with wooden roof',
  'Brick masonry with CGI roof',
  'Tin / GI shed',
  'Open shed',
  'R.C.C. framed',
  'Porch / Veranda',
  'Store',
];

const KIND_LABELS: Record<string, string> = {
  MAIN_HOUSE: 'Main house',
  GI_SHED: 'Tin / GI shed',
  OPEN_SHED: 'Open shed',
  PORCH: 'Porch / Veranda',
  STORE: 'Store',
  OTHER: 'Other',
};

function openingCodeForKind(kind: string): string {
  if (kind === 'WINDOW') return 'Windows';
  if (kind === 'VENTILATOR') return 'Ventilators';
  if (kind === 'OTHER') return 'Other openings';
  return 'Doors';
}

function mmFromMeters(value: number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const mm = value * 1000;
  return Number.isInteger(mm) ? String(mm) : String(Math.round(mm * 1000) / 1000);
}

export function BuildingGuide(props: {
  structure: StructureRow;
  structures: { id: string; name: string; structureKind?: string | null; geometryStatus?: string | null; overallLengthM?: number | null; overallBreadthM?: number | null }[];
  rooms: RoomRow[];
  walls: WallRow[];
  openings: OpeningRow[];
  members: MemberRow[];
  derived: DerivedRow[];
  profileChecks: { id: string; label: string; state: string; detail: string }[];
  focus: string;
  canWrite: boolean;
  busy?: boolean;
  onSelect: (id: string) => void;
  onRemoveStructure?: (id: string) => void;
  onProfile: (body: StructureRow) => void;
  onLayout: (body: Record<string, unknown>) => void;
  onSimplePlan: (body: Record<string, unknown>) => void;
  onPatchRoom: (roomId: string, body: Record<string, unknown>) => void;
  onPatchWall: (wallId: string, body: Record<string, unknown>) => void;
  onConfirm: (id: string, body: Record<string, unknown>) => void;
  onManualWall: (body: Record<string, unknown>) => void;
  onOpenings: (openings: OpeningRow[]) => void;
  onMembers: (members: MemberRow[]) => void;
}) {
  const kind = props.structure.structureKind || 'MAIN_HOUSE';
  const usesGrid = kind === 'MAIN_HOUSE' || kind === 'STORE' || kind === 'OTHER';
  const [profile, setProfile] = useState(props.structure);
  const [thicknessMm, setThicknessMm] = useState(mmFromMeters(props.structure.wallThicknessM));
  const [openings, setOpenings] = useState<OpeningRow[]>(props.openings);
  const [members, setMembers] = useState<MemberRow[]>(props.members);
  const [memberMm, setMemberMm] = useState<Record<number, { breadth: string; depth: string }>>({});
  const [memberKind, setMemberKind] = useState('');
  const [wallLabel, setWallLabel] = useState('');
  const [wallLength, setWallLength] = useState('');
  const [formError, setFormError] = useState('');
  const locked = !props.canWrite || Boolean(props.busy);

  const profileSig = [
    props.structure.id,
    props.structure.wallThicknessM,
    props.structure.storeyHeightM,
    props.structure.constructionYear,
    props.structure.usefulLifeYears,
    props.structure.structureTypeText,
    props.structure.wallMaterialText,
    props.structure.floorFinish,
    props.structure.roofFinish,
    props.structure.foundationWidthM,
    props.structure.groundBeamDepthM,
    props.structure.solingDepthM,
    props.structure.evidenceConflictNotes,
  ].join('|');
  const openingsSig = props.openings.map((opening) => `${opening.id}:${opening.kind}:${opening.count}:${opening.widthM}:${opening.heightM}`).join(',');
  const membersSig = props.members.map((member) => `${member.id}:${member.kind}:${member.count}:${member.lengthM}:${member.breadthM}:${member.depthM}`).join(',');

  useEffect(() => {
    setProfile(props.structure);
    setThicknessMm(mmFromMeters(props.structure.wallThicknessM));
  }, [profileSig]);

  useEffect(() => {
    setOpenings(props.openings);
  }, [openingsSig]);

  useEffect(() => {
    setMembers(props.members);
    const next: Record<number, { breadth: string; depth: string }> = {};
    props.members.forEach((member, index) => {
      next[index] = { breadth: mmFromMeters(member.breadthM), depth: mmFromMeters(member.depthM) };
    });
    setMemberMm(next);
  }, [membersSig]);

  useEffect(() => {
    if (!props.focus) return;
    const node = document.querySelector(`[data-focus-section="${props.focus}"]`);
    if (node instanceof HTMLElement) node.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [props.focus, props.structure.id]);

  const attentionChecks = props.profileChecks.filter((check) => check.state !== 'done');

  return (
    <div className="space-y-5">
      <section className="bg-white border border-slate-200 rounded-gov-lg p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-gov-navy text-base">Structures</h2>
            <p className="text-xs text-slate-500 mt-0.5">Select one to edit its plan and construction.</p>
          </div>
          {attentionChecks.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attentionChecks.map((check) => (
                <span key={check.id} className="text-xs rounded-full px-3 py-1 bg-amber-50 text-amber-900" title={check.detail}>
                  {check.label}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {props.structures.map((item, index) => {
            const status = item.geometryStatus || 'NONE';
            const selected = item.id === props.structure.id;
            return (
              <div
                key={item.id}
                className={`border rounded-gov-md p-3 text-sm ${selected ? 'bg-sky-50 border-gov-navy' : 'bg-white border-slate-200'}`}
              >
                <button type="button" className="w-full text-left" onClick={() => props.onSelect(item.id)}>
                  <div className="font-semibold text-slate-900">{item.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {KIND_LABELS[item.structureKind || 'MAIN_HOUSE'] || item.structureKind} · #{index + 1}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {item.overallLengthM && item.overallBreadthM
                      ? `${item.overallLengthM} × ${item.overallBreadthM} m`
                      : status === 'CONFIRMED' ? 'Plan confirmed' : status === 'DRAFT_GENERATED' ? 'Draft plan' : 'Needs plan'}
                  </div>
                </button>
                {props.canWrite && props.onRemoveStructure && (
                  <button
                    type="button"
                    className="mt-2 text-xs font-semibold text-red-700 disabled:opacity-50"
                    disabled={locked}
                    onClick={() => {
                      if (window.confirm(`Remove “${item.name}”? Plan, openings, and measurement lines for it are deleted. If the case was finalized, finalization is cleared.`)) {
                        props.onRemoveStructure?.(item.id);
                      }
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {formError && <p className="text-sm text-red-700 bg-red-50 rounded-gov-md px-3 py-2">{formError}</p>}

      {usesGrid ? (
        <StructureLayoutPanel
          structure={props.structure}
          rooms={props.rooms}
          walls={props.walls}
          canWrite={props.canWrite}
          focus={props.focus === 'rooms' || props.focus === 'walls'}
          onSave={props.onLayout}
          onPatchRoom={props.onPatchRoom}
          onPatchWall={props.onPatchWall}
        />
      ) : (
        <SimplePlanPanel
          structure={props.structure}
          hostStructures={props.structures}
          canWrite={props.canWrite}
          onSave={props.onSimplePlan}
        />
      )}

      {props.derived.length > 0 && (
        <section className="bg-slate-50 border border-slate-200 rounded-gov-lg px-4 py-3">
          <ul className="grid md:grid-cols-3 gap-1 text-xs text-slate-600">
            {props.derived.slice(0, 6).map((row) => (
              <li key={`${row.label}-${row.source}`}>{row.label}: <span className="font-semibold text-slate-800">{row.quantity ?? '—'} {row.unit}</span></li>
            ))}
          </ul>
        </section>
      )}

      <section data-focus-section="profile" className={`bg-white border border-slate-200 rounded-gov-lg p-5 space-y-3 ${props.focus === 'profile' ? 'ring-2 ring-gov-navy' : ''}`}>
        <div>
          <h2 className="font-bold text-gov-navy text-base">Construction</h2>
          <p className="text-xs text-slate-500 mt-0.5">{KIND_LABELS[kind] || kind} · choose finishes from the lists</p>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <ChoiceField label="Construction type" value={profile.structureTypeText} options={CONSTRUCTION_TYPES} onChange={(value) => setProfile({ ...profile, structureTypeText: value })} disabled={locked} />
          <ChoiceField label="Wall material" value={profile.wallMaterialText} options={WALL_MATERIALS} onChange={(value) => setProfile({ ...profile, wallMaterialText: value })} disabled={locked} />
          <Labelled
            label="Wall thickness"
            suffix="mm"
            value={thicknessMm}
            numeric
            onChange={(value) => {
              setThicknessMm(value);
              setProfile({ ...profile, wallThicknessM: value === '' ? null : Number(value) / 1000 });
            }}
            disabled={locked}
            placeholder="150"
          />
          <Labelled label="Height" suffix="m" value={profile.storeyHeightM?.toString() || ''} numeric onChange={(value) => setProfile({ ...profile, storeyHeightM: value === '' ? null : Number(value) })} disabled={locked} placeholder="1.97" />
          <Labelled label="Construction year" value={profile.constructionYear?.toString() || ''} numeric onChange={(value) => setProfile({ ...profile, constructionYear: value === '' ? null : Number(value) })} disabled={locked} placeholder="2023" />
          <Labelled label="Useful life" suffix="years" value={profile.usefulLifeYears?.toString() || ''} numeric onChange={(value) => setProfile({ ...profile, usefulLifeYears: value === '' ? null : Number(value) })} disabled={locked} placeholder="10" />
          <ChoiceField label="Floor finish" value={profile.floorFinish} options={FLOOR_FINISHES} onChange={(value) => setProfile({ ...profile, floorFinish: value })} disabled={locked} />
          <ChoiceField label="Roof / ceiling" value={profile.roofFinish} options={ROOF_FINISHES} onChange={(value) => setProfile({ ...profile, roofFinish: value })} disabled={locked} />
          <Labelled label="Foundation width" suffix="m" value={profile.foundationWidthM?.toString() || ''} numeric onChange={(value) => setProfile({ ...profile, foundationWidthM: value === '' ? null : Number(value) })} disabled={locked} placeholder="0.25" />
          <Labelled label="Ground beam depth" suffix="m" value={profile.groundBeamDepthM?.toString() || ''} numeric onChange={(value) => setProfile({ ...profile, groundBeamDepthM: value === '' ? null : Number(value) })} disabled={locked} placeholder="0.30" />
          <Labelled label="Soling depth" suffix="m" value={profile.solingDepthM?.toString() || ''} numeric onChange={(value) => setProfile({ ...profile, solingDepthM: value === '' ? null : Number(value) })} disabled={locked} placeholder="0.10" />
          <Labelled label="Notes" value={profile.evidenceConflictNotes || ''} onChange={(value) => setProfile({ ...profile, evidenceConflictNotes: value })} disabled={locked} placeholder="Optional" />
        </div>
        {props.canWrite && (
          <button className="bg-gov-navy text-white rounded-gov-md px-4 py-2 text-sm font-semibold disabled:opacity-60" disabled={locked} onClick={() => props.onProfile({ ...profile, wallThicknessM: thicknessMm === '' ? null : Number(thicknessMm) / 1000 })}>
            {props.busy ? 'Saving…' : 'Save construction'}
          </button>
        )}
      </section>

      <section data-focus-section="walls" className={`bg-white border border-slate-200 rounded-gov-lg p-5 space-y-2 ${props.focus === 'walls' ? 'ring-2 ring-gov-navy' : ''}`}>
        <h2 className="font-bold text-gov-navy text-base">Walls</h2>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-slate-500"><th>Status</th><th>Wall</th><th>Length</th><th></th></tr></thead>
          <tbody>
            {props.walls.map((wall) => (
              <tr key={wall.id} className="border-t">
                <td className="py-2">{wall.origin === 'CANDIDATE' ? 'Proposed' : 'Confirmed'}</td>
                <td>{wall.label}</td>
                <td>{wall.lengthM} m</td>
                <td>
                  {props.canWrite && wall.origin === 'CANDIDATE' && (
                    <span className="space-x-2">
                      <button className="text-gov-navy font-semibold disabled:opacity-50" disabled={locked} onClick={() => props.onConfirm(wall.id, { action: 'CONFIRM' })}>Confirm</button>
                      <button className="text-red-700 disabled:opacity-50" disabled={locked} onClick={() => props.onConfirm(wall.id, { action: 'REJECT' })}>Reject</button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {props.walls.length === 0 && <p className="text-sm text-slate-500">No walls yet. Confirm the plan, or add a measured wall.</p>}
        {props.canWrite && (
          <form className="flex flex-wrap gap-2 text-sm items-end" onSubmit={(event) => {
            event.preventDefault();
            if (locked) return;
            const lengthM = Number(wallLength);
            if (!wallLabel.trim() || !(lengthM > 0)) {
              setFormError('A measured wall needs a name and a length greater than zero.');
              return;
            }
            setFormError('');
            props.onManualWall({ label: wallLabel.trim(), lengthM, count: 1 });
            setWallLabel('');
            setWallLength('');
          }}>
            <Labelled label="Wall" value={wallLabel} onChange={setWallLabel} placeholder="Front wall" disabled={locked} />
            <Labelled label="Measured length" suffix="m" value={wallLength} numeric onChange={setWallLength} placeholder="15.35" disabled={locked} />
            <button className="border border-slate-200 rounded-gov-md px-3 py-2 disabled:opacity-50" disabled={locked}>Add measured wall</button>
          </form>
        )}
      </section>

      <section data-focus-section="openings" className={`bg-white border border-slate-200 rounded-gov-lg p-5 space-y-3 ${props.focus === 'openings' ? 'ring-2 ring-gov-navy' : ''}`}>
        <h2 className="font-bold text-gov-navy text-base">Doors and windows</h2>
        {openings.map((opening, index) => (
          <div key={opening.id || index} className="grid md:grid-cols-6 gap-2 text-sm items-end">
            <label className="block text-sm">
              <span className="font-semibold text-slate-700">Kind</span>
              <select
                className="mt-1 w-full border border-slate-200 rounded-gov-sm px-3 py-2"
                value={opening.kind}
                disabled={locked}
                onChange={(e) => setOpenings(openings.map((item, i) => i === index ? { ...item, kind: e.target.value, code: openingCodeForKind(e.target.value) } : item))}
              >
                <option value="DOOR">Door</option>
                <option value="WINDOW">Window</option>
                <option value="VENTILATOR">Ventilator</option>
                <option value="OTHER">Other opening</option>
              </select>
            </label>
            <Labelled label="How many" value={opening.count ?? ''} numeric onChange={(value) => setOpenings(openings.map((item, i) => i === index ? { ...item, count: value === '' ? null : Number(value) } : item))} placeholder="8" disabled={locked} />
            <Labelled label="Width" suffix="m" value={opening.widthM ?? ''} numeric onChange={(value) => setOpenings(openings.map((item, i) => i === index ? { ...item, widthM: value === '' ? null : Number(value) } : item))} placeholder="0.85" disabled={locked} />
            <Labelled label="Height" suffix="m" value={opening.heightM ?? ''} numeric onChange={(value) => setOpenings(openings.map((item, i) => i === index ? { ...item, heightM: value === '' ? null : Number(value) } : item))} placeholder="1.75" disabled={locked} />
            {props.canWrite && (
              <button type="button" className="text-xs font-semibold text-red-700 py-2 disabled:opacity-50" disabled={locked} onClick={() => setOpenings(openings.filter((_, i) => i !== index))}>
                Remove
              </button>
            )}
          </div>
        ))}
        {openings.length === 0 && <p className="text-sm text-slate-500">No openings yet.</p>}
        {props.canWrite && (
          <div className="flex flex-wrap gap-2">
            <button className="border border-slate-200 rounded-gov-md px-3 py-2 text-sm disabled:opacity-50" disabled={locked} onClick={() => setOpenings([...openings, { id: '', structureId: props.structure.id, code: 'Doors', kind: 'DOOR', count: null, widthM: null, heightM: null }])}>Add door</button>
            <button className="border border-slate-200 rounded-gov-md px-3 py-2 text-sm disabled:opacity-50" disabled={locked} onClick={() => setOpenings([...openings, { id: '', structureId: props.structure.id, code: 'Windows', kind: 'WINDOW', count: null, widthM: null, heightM: null }])}>Add window</button>
            <button className="bg-gov-navy text-white rounded-gov-md px-3 py-2 text-sm disabled:opacity-50" disabled={locked} onClick={() => {
              if (openings.some((opening) => !Number.isInteger(opening.count) || !(Number(opening.count) > 0) || !(Number(opening.widthM) > 0) || !(Number(opening.heightM) > 0))) {
                setFormError('Each opening needs count, width, and height.');
                return;
              }
              setFormError('');
              props.onOpenings(openings);
            }}>{props.busy ? 'Saving…' : 'Save openings'}</button>
          </div>
        )}
      </section>

      <section data-focus-section="members" className={`bg-white border border-slate-200 rounded-gov-lg p-5 space-y-3 ${props.focus === 'members' ? 'ring-2 ring-gov-navy' : ''}`}>
        <h2 className="font-bold text-gov-navy text-base">Columns, beams, and roof members</h2>
        {props.canWrite && (
          <label className="text-sm font-semibold text-slate-700">Add group
            <select className="ml-2 border border-slate-200 rounded-gov-sm px-3 py-2" value={memberKind} disabled={locked} onChange={(e) => {
              const nextKind = e.target.value;
              setMemberKind('');
              if (!nextKind) return;
              const next = [...members, { id: '', structureId: props.structure.id, kind: nextKind, count: null, lengthM: null, breadthM: null, depthM: null }];
              setMembers(next);
              setMemberMm({ ...memberMm, [next.length - 1]: { breadth: '', depth: '' } });
            }}>
              <option value="">Choose…</option>
              {MEMBER_KINDS.map(([kindOption, label]) => <option key={kindOption} value={kindOption}>{label}</option>)}
            </select>
          </label>
        )}
        {members.map((member, index) => (
          <div key={`${member.kind}-${index}`} className="grid md:grid-cols-6 gap-2 text-sm items-end">
            <p className="font-semibold py-2">{MEMBER_KINDS.find(([kindOption]) => kindOption === member.kind)?.[1] || member.kind}</p>
            <Labelled label="Count" value={member.count ?? ''} numeric onChange={(value) => setMembers(members.map((item, i) => i === index ? { ...item, count: value === '' ? null : Number(value) } : item))} placeholder="19" disabled={locked} />
            <Labelled
              label="Section width"
              suffix="mm"
              value={memberMm[index]?.breadth ?? mmFromMeters(member.breadthM)}
              numeric
              onChange={(value) => {
                setMemberMm({ ...memberMm, [index]: { breadth: value, depth: memberMm[index]?.depth ?? mmFromMeters(member.depthM) } });
                setMembers(members.map((item, i) => i === index ? { ...item, breadthM: value === '' ? null : Number(value) / 1000 } : item));
              }}
              placeholder="150"
              disabled={locked}
            />
            <Labelled
              label="Section depth"
              suffix="mm"
              value={memberMm[index]?.depth ?? mmFromMeters(member.depthM)}
              numeric
              onChange={(value) => {
                setMemberMm({ ...memberMm, [index]: { breadth: memberMm[index]?.breadth ?? mmFromMeters(member.breadthM), depth: value } });
                setMembers(members.map((item, i) => i === index ? { ...item, depthM: value === '' ? null : Number(value) / 1000 } : item));
              }}
              placeholder="150"
              disabled={locked}
            />
            <Labelled label="Length" suffix="m" value={member.lengthM ?? ''} numeric onChange={(value) => setMembers(members.map((item, i) => i === index ? { ...item, lengthM: value === '' ? null : Number(value) } : item))} placeholder="1.97" disabled={locked} />
            {props.canWrite && (
              <button
                type="button"
                className="text-xs font-semibold text-red-700 py-2 disabled:opacity-50"
                disabled={locked}
                onClick={() => {
                  const next = members.filter((_, i) => i !== index);
                  setMembers(next);
                  const mm: Record<number, { breadth: string; depth: string }> = {};
                  next.forEach((item, i) => {
                    mm[i] = i < index
                      ? (memberMm[i] || { breadth: mmFromMeters(item.breadthM), depth: mmFromMeters(item.depthM) })
                      : (memberMm[i + 1] || { breadth: mmFromMeters(item.breadthM), depth: mmFromMeters(item.depthM) });
                  });
                  setMemberMm(mm);
                }}
              >
                Remove
              </button>
            )}
          </div>
        ))}
        {members.length === 0 && <p className="text-sm text-slate-500">No member groups yet.</p>}
        {props.canWrite && (
          <button className="bg-gov-navy text-white rounded-gov-md px-3 py-2 text-sm disabled:opacity-50" disabled={locked} onClick={() => {
            if (members.some((member) => member.count === null || !Number.isInteger(member.count) || member.count < 0 || !(Number(member.lengthM) > 0) || !(Number(member.breadthM) > 0) || !(Number(member.depthM) > 0))) {
              setFormError('Each member group needs count, section, and length.');
              return;
            }
            setFormError('');
            props.onMembers(members);
          }}>{props.busy ? 'Saving…' : 'Save members'}</button>
        )}
      </section>
    </div>
  );
}

function Labelled(props: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  suffix?: string;
  numeric?: boolean;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="font-semibold text-slate-700">{props.label}{props.suffix ? ` (${props.suffix})` : ''}</span>
      <input
        disabled={props.disabled}
        inputMode={props.numeric ? 'decimal' : 'text'}
        className="mt-1 w-full border border-slate-200 rounded-gov-sm px-3 py-2"
        value={props.value}
        placeholder={props.placeholder}
        onChange={(e) => {
          if (props.numeric && e.target.value !== '' && !/^\d*\.?\d*$/.test(e.target.value)) return;
          props.onChange(e.target.value);
        }}
      />
      {props.hint && <span className="text-xs text-slate-400">{props.hint}</span>}
    </label>
  );
}

function ChoiceField(props: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const known = props.value === '' || props.options.includes(props.value);
  const selectValue = known ? props.value : '__custom__';
  return (
    <label className="block text-sm">
      <span className="font-semibold text-slate-700">{props.label}</span>
      <select
        disabled={props.disabled}
        className="mt-1 w-full border border-slate-200 rounded-gov-sm px-3 py-2 bg-white"
        value={selectValue}
        onChange={(e) => {
          if (e.target.value === '__custom__') {
            props.onChange(props.value && !props.options.includes(props.value) ? props.value : '');
            return;
          }
          props.onChange(e.target.value);
        }}
      >
        <option value="">Select…</option>
        {props.options.map((option) => <option key={option} value={option}>{option}</option>)}
        <option value="__custom__">Other…</option>
      </select>
      {selectValue === '__custom__' && (
        <input
          disabled={props.disabled}
          className="mt-2 w-full border border-slate-200 rounded-gov-sm px-3 py-2"
          value={props.value}
          placeholder="Type custom value"
          onChange={(e) => props.onChange(e.target.value)}
        />
      )}
    </label>
  );
}

function goLabel(target: RuleGuidance['goTo']): string {
  if (target === 'rooms') return 'Add room length and breadth';
  if (target === 'walls') return 'Add or confirm a wall';
  if (target === 'openings') return 'Add doors or windows';
  if (target === 'members') return 'Add the member group';
  return 'Enter wall thickness and height';
}

export function MeasurementGuide(props: {
  rules: RuleGuidance[];
  canWrite: boolean;
  schedulePinned?: boolean;
  busy?: boolean;
  onDraft: (ruleId: string) => void;
  onGenerateSheet?: () => void;
  onGo: (target: string) => void;
}) {
  const actionable = props.rules.filter((rule) => rule.readiness !== 'NOT_APPLICABLE');
  const missing = actionable.filter((rule) => rule.readiness === 'MISSING_DATA');
  const ready = actionable.filter((rule) => rule.readiness === 'DRAFT_RULE' || rule.readiness === 'REQUIRES_REVIEW');
  const locked = !props.canWrite || Boolean(props.busy);
  return (
    <div className="bg-white border border-slate-200 rounded-gov-lg p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-gov-navy text-base">Generated measurement</h2>
          <p className="text-sm text-slate-600 mt-1">
            Items are chosen from facts you saved (plan, walls, materials, openings, members) — not from a fixed case template.
          </p>
        </div>
        {props.canWrite && props.onGenerateSheet && (
          <button className="bg-gov-navy text-white rounded-gov-md px-4 py-2 text-sm font-semibold disabled:opacity-60" disabled={locked} onClick={props.onGenerateSheet}>
            {props.busy ? 'Generating…' : 'Generate measurement sheet'}
          </button>
        )}
      </div>
      {props.schedulePinned === false && (
        <div className="rounded-gov-md bg-amber-50 text-amber-950 text-sm px-4 py-3">
          Pin rate schedule and YP table on Screen 1 so amounts can bind on Review.
        </div>
      )}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-teal-50 text-teal-900 px-3 py-1">{ready.length} ready to draft</span>
        <span className="rounded-full bg-amber-50 text-amber-900 px-3 py-1">{missing.length} still need facts</span>
      </div>
      {props.rules.length === 0 && <p className="text-sm text-slate-500">Add a structure first.</p>}
      {actionable.map((rule) => (
        <article key={rule.ruleId} className="border border-slate-200 rounded-gov-md p-3 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-slate-900">{rule.title}</h3>
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{rule.readiness.replace(/_/g, ' ')}</span>
          </div>
          {rule.catalogueItemNumber && <p className="text-xs text-slate-500">Item {rule.catalogueItemNumber}</p>}
          {rule.readiness === 'MISSING_DATA' && (
            <ul className="text-sm space-y-1 text-amber-900">
              {rule.facts.filter((fact) => !fact.present).map((fact) => (
                <li key={fact.id}>Still needed · {fact.label}</li>
              ))}
            </ul>
          )}
          {rule.derivedQuantity !== null && (
            <p className="text-sm text-slate-800">Preview <strong>{rule.derivedQuantity} {rule.unit}</strong></p>
          )}
          <div className="flex flex-wrap gap-3">
            {props.canWrite && (rule.readiness === 'DRAFT_RULE' || rule.readiness === 'REQUIRES_REVIEW') && (
              <button className="text-gov-navy font-semibold text-sm disabled:opacity-50" disabled={locked} onClick={() => props.onDraft(rule.ruleId)}>Create / refresh draft line</button>
            )}
            {props.canWrite && rule.readiness === 'MISSING_DATA' && rule.goTo && (
              <button className="text-gov-navy font-semibold text-sm" onClick={() => props.onGo(rule.goTo || 'profile')}>{goLabel(rule.goTo)}</button>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
