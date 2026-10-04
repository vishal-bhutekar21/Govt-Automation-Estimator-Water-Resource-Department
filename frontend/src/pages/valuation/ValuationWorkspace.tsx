import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

type Screen = 1 | 2 | 3 | 4 | 5 | 6;

interface StructureRow {
  id: string;
  name: string;
  participation: 'INCLUDED' | 'EXCLUDED';
  exclusionReason?: string;
  structureTypeText: string;
  wallMaterialText: string;
  wallThicknessM: number | null;
  storeyHeightM: number | null;
  constructionYear: number | null;
  usefulLifeYears: number | null;
  usefulLifeSource: string;
  floorFinish: string;
  roofFinish: string;
  externalFinish: string;
  internalFinish: string;
}

interface RoomRow {
  id?: string;
  code: string;
  lengthM: number | null;
  breadthM: number | null;
  rowIndex: number | null;
  bayIndex: number | null;
  enclosure: 'ENCLOSED' | 'OPEN' | 'UNKNOWN';
}

interface WallRow {
  id: string;
  origin: string;
  kind: string;
  label: string;
  count: number;
  lengthM: number;
  breadthM: number | null;
}

interface BlockRow {
  id: string;
  structureId: string;
  title: string;
  unit: string;
  ruleId: string;
  ruleStatus: string;
  status: string;
  formulaText: string;
  derivedNet: number | null;
  engineerNet: number | null;
  overrideReason?: string;
  rateMatch: string;
  rateItemId?: string;
}

interface SnapshotRow {
  id: string;
  status: string;
  label: string;
  presentCost: number | null;
  depreciatedValue: number | null;
  blockers: string[];
  depreciationFormula: string;
  roundingProfileId: string;
  finalizedAt: string | null;
  body?: {
    abstract?: { itemNumber: string | null; title: string; quantity: number; unit: string; rate: number | null; amount: number | null }[];
  };
}

interface Bundle {
  case: { id: string; caseNumber: string; valuationDate: string; dateOfInspection: string; rateScheduleVersionId?: string | null; ypTableVersionId?: string | null; conflictingIdentifierNotes?: string; status: string };
  property: { ownerName: string; village: string; taluka: string; district: string; laCaseNumber: string; surveyNumber: string; houseNumber: string };
  structures: StructureRow[];
  rooms: (RoomRow & { structureId: string })[];
  wallRuns: (WallRow & { structureId: string })[];
  openings: { id: string; structureId: string; code: string; kind: string; count: number | null; widthM: number | null; heightM: number | null }[];
  members: { id: string; structureId: string; kind: string; count: number | null; lengthM: number | null; breadthM: number | null; depthM: number | null }[];
  blocks: BlockRow[];
  evidence: { id: string; documentType: string; originalName: string; version: number; uploadedAt: string; notes: string }[];
  snapshots: SnapshotRow[];
  depreciationDecision: { status: string } | null;
  rateScheduleVersions: { id: string; versionLabel: string; name: string; legacy: boolean }[];
  ypTables: { id: string; name: string; legacy: boolean; citation: string }[];
}

const SCREENS: { id: Screen; label: string }[] = [
  { id: 1, label: 'Case and structures' },
  { id: 2, label: 'Building definition' },
  { id: 3, label: 'Generated measurement' },
  { id: 4, label: 'Review, rates, abstract' },
  { id: 5, label: 'Depreciation and finalize' },
  { id: 6, label: 'Documents' },
];

const emptyRoom = (): RoomRow => ({ code: '', lengthM: null, breadthM: null, rowIndex: null, bayIndex: null, enclosure: 'UNKNOWN' });

export const ValuationWorkspace: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [screen, setScreen] = useState<Screen>(1);
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [structureId, setStructureId] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [applicability, setApplicability] = useState<{ ruleId: string; title: string; state: string; reason: string; ruleStatus: string }[]>([]);
  const canWrite = user?.role === 'ADMIN' || user?.role === 'ESTIMATOR';
  const canFinalize = user?.role === 'ADMIN';

  const load = async () => {
    const res = await api.get<Bundle>(`/v1/workflow/cases/${id}`);
    setBundle(res.data);
    setStructureId((current) => current || res.data.structures[0]?.id || '');
  };

  useEffect(() => {
    load().catch(() => setError('The case could not be loaded.'));
  }, [id]);

  const run = async (work: () => Promise<void>) => {
    setError('');
    setMessage('');
    try {
      await work();
      await load();
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      setError(apiError.response?.data?.message || 'The request was not saved.');
    }
  };

  if (!bundle) return <div className="p-8 text-sm text-slate-500">Loading the valuation…</div>;

  const structure = bundle.structures.find((s) => s.id === structureId) || null;
  const rooms = bundle.rooms.filter((r) => r.structureId === structureId);
  const walls = bundle.wallRuns.filter((w) => w.structureId === structureId);
  const blocks = bundle.blocks.filter((b) => !structureId || b.structureId === structureId || screen >= 4);
  const latest = [...bundle.snapshots].reverse().find((snapshot) => snapshot.label === 'PLATFORM') || bundle.snapshots[bundle.snapshots.length - 1];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <button className="text-xs font-semibold text-gov-navy" onClick={() => navigate('/cases')}>Back to cases</button>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1">{bundle.property?.ownerName || 'Valuation'} · {bundle.case.caseNumber}</h1>
          <p className="text-sm text-slate-500">Enter the building once. Review every derived quantity before it enters the abstract.</p>
        </div>
        <div className="text-xs text-slate-500 text-right">
          <div>{user?.role}</div>
          {!canWrite && <div>This login can read the case. It cannot change measurements.</div>}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {SCREENS.map((item) => (
          <button
            key={item.id}
            onClick={() => setScreen(item.id)}
            className={`px-3 py-2 rounded-gov-md text-sm font-semibold ${screen === item.id ? 'bg-gov-navy text-white' : 'bg-white border border-slate-200 text-slate-700'}`}
          >
            {item.id}. {item.label}
          </button>
        ))}
      </div>

      {error && <div className="rounded-gov-md bg-red-50 text-red-800 text-sm px-4 py-3">{error}</div>}
      {message && <div className="rounded-gov-md bg-teal-50 text-teal-900 text-sm px-4 py-3">{message}</div>}

      {screen === 1 && (
        <IdentityScreen bundle={bundle} canWrite={canWrite} onSave={(body) => run(async () => { await api.put(`/v1/workflow/cases/${id}/identity`, body); setMessage('Case identity saved.'); })} onAdd={(name) => run(async () => { await api.post(`/v1/workflow/cases/${id}/structures`, { name }); setMessage(`${name} added as its own structure.`); })} onEvidence={(form) => run(async () => { await api.post(`/v1/workflow/cases/${id}/evidence`, form); setMessage('Evidence stored as a new version.'); })} />
      )}
      {screen === 2 && structure && (
        <BuildingScreen
          structure={structure}
          structures={bundle.structures}
          rooms={rooms}
          walls={walls}
          openings={bundle.openings.filter((o) => o.structureId === structureId)}
          members={bundle.members.filter((m) => m.structureId === structureId)}
          canWrite={canWrite}
          onSelect={setStructureId}
          onProfile={(body) => run(async () => {
            const res = await api.put(`/v1/workflow/structures/${structure.id}`, body);
            const impact = res.data.impact || [];
            setMessage(impact.length ? `${impact.length} accepted line(s) now need review. Previous values were kept.` : 'Building facts saved.');
          })}
          onRooms={(next) => run(async () => { await api.put(`/v1/workflow/structures/${structure.id}/rooms`, { rooms: next }); setMessage('Rooms saved.'); })}
          onCandidates={() => run(async () => { const res = await api.post(`/v1/workflow/structures/${structure.id}/geometry/candidates`); setMessage(res.data.note); })}
          onConfirm={(wallId, body) => run(async () => { await api.post(`/v1/workflow/wall-runs/${wallId}/confirm`, body); setMessage('Wall run updated.'); })}
          onManualWall={(body) => run(async () => { await api.post(`/v1/workflow/structures/${structure.id}/wall-runs`, body); setMessage('Manual wall added.'); })}
          onOpenings={(openings) => run(async () => { await api.put(`/v1/workflow/structures/${structure.id}/openings`, { openings }); })}
          onMembers={(members) => run(async () => { await api.put(`/v1/workflow/structures/${structure.id}/members`, { members }); })}
        />
      )}
      {screen === 2 && !structure && <p className="text-sm text-slate-600">Add a structure on the first screen. A shed is not created from the house.</p>}
      {screen === 3 && structure && (
        <GeneratedScreen
          applicability={applicability}
          blocks={bundle.blocks.filter((b) => b.structureId === structure.id)}
          canWrite={canWrite}
          onGenerate={() => run(async () => {
            const res = await api.post(`/v1/workflow/structures/${structure.id}/generate`);
            setApplicability(res.data.applicability);
            setMessage(res.data.note);
          })}
          onDraft={(ruleId) => run(async () => { await api.post(`/v1/workflow/structures/${structure.id}/draft-lines`, { ruleId }); setMessage('Draft suggestion created. It is not a validated rule until you accept it.'); })}
        />
      )}
      {screen === 4 && (
        <ReviewScreen
          bundle={bundle}
          canWrite={canWrite}
          onDecision={(blockId, body) => run(async () => { await api.post(`/v1/workflow/blocks/${blockId}/decision`, body); setMessage('Decision saved.'); })}
          onRate={(blockId, itemNumber) => run(async () => {
            const res = await api.post(`/v1/workflow/blocks/${blockId}/rate`, { itemNumber });
            setMessage(res.data.match === 'UNIQUE' ? 'One rate matched.' : res.data.match === 'AMBIGUOUS' ? 'More than one rate matches. Nothing was selected.' : 'No rate matched. Choose another item number or add the line manually.');
          })}
          onManual={(structureIdForLine, body) => run(async () => { await api.post(`/v1/workflow/structures/${structureIdForLine}/manual-block`, body); })}
          onCalculate={() => run(async () => { await api.post(`/v1/workflow/cases/${id}/calculate`); setMessage('Draft abstract prepared from accepted quantities.'); setScreen(5); })}
        />
      )}
      {screen === 5 && (
        <FinalizeScreen
          bundle={bundle}
          latest={latest}
          canWrite={canWrite}
          canFinalize={canFinalize}
          onAcceptDep={() => run(async () => { await api.post(`/v1/workflow/cases/${id}/depreciation/accept`); setMessage('Depreciation accepted for this draft.'); })}
          onCalculate={() => run(async () => { await api.post(`/v1/workflow/cases/${id}/calculate`); setMessage('Draft snapshot updated.'); })}
          onFinalize={(snapshotId) => run(async () => { await api.post(`/v1/workflow/snapshots/${snapshotId}/finalize`); setMessage('Snapshot finalized. It will not change if rates are edited later.'); })}
        />
      )}
      {screen === 6 && <DocumentsScreen bundle={bundle} onReplay={() => run(async () => { await api.post(`/v1/workflow/cases/${id}/source-replay`); setMessage('Source replay snapshot stored. It is not the production rule.'); })} canWrite={canWrite} />}
    </div>
  );
};

function Field({ label, value, onChange, disabled }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean }) {
  return (
    <label className="block text-sm">
      <span className="font-semibold text-slate-700">{label}</span>
      <input disabled={disabled} className="mt-1 w-full border border-slate-200 rounded-gov-sm px-3 py-2" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function IdentityScreen({ bundle, canWrite, onSave, onAdd, onEvidence }: {
  bundle: Bundle;
  canWrite: boolean;
  onSave: (body: Record<string, string | null>) => void;
  onAdd: (name: string) => void;
  onEvidence: (form: FormData) => void;
}) {
  const [form, setForm] = useState({ ...bundle.property, valuationDate: bundle.case.valuationDate, dateOfInspection: bundle.case.dateOfInspection, conflictingIdentifierNotes: bundle.case.conflictingIdentifierNotes || '', rateScheduleVersionId: bundle.case.rateScheduleVersionId || '', ypTableVersionId: bundle.case.ypTableVersionId || '' });
  const [name, setName] = useState('Main house');
  const set = (key: string) => (value: string) => setForm((current) => ({ ...current, [key]: value }));
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <section className="bg-white border border-slate-200 rounded-gov-lg p-5 space-y-3">
        <h2 className="font-bold text-gov-navy">Case identity</h2>
        <Field label="Owner" value={form.ownerName || ''} onChange={set('ownerName')} disabled={!canWrite} />
        <Field label="Gut / survey number" value={form.surveyNumber || ''} onChange={set('surveyNumber')} disabled={!canWrite} />
        <Field label="House number" value={form.houseNumber || ''} onChange={set('houseNumber')} disabled={!canWrite} />
        <Field label="Village" value={form.village || ''} onChange={set('village')} disabled={!canWrite} />
        <Field label="Taluka" value={form.taluka || ''} onChange={set('taluka')} disabled={!canWrite} />
        <Field label="District" value={form.district || ''} onChange={set('district')} disabled={!canWrite} />
        <Field label="LA case number" value={form.laCaseNumber || ''} onChange={set('laCaseNumber')} disabled={!canWrite} />
        <Field label="Valuation date" value={form.valuationDate || ''} onChange={set('valuationDate')} disabled={!canWrite} />
        <Field label="Conflicting identity notes" value={form.conflictingIdentifierNotes} onChange={set('conflictingIdentifierNotes')} disabled={!canWrite} />
        <label className="block text-sm">
          <span className="font-semibold text-slate-700">Rate schedule version</span>
          <select className="mt-1 w-full border rounded-gov-sm px-3 py-2" value={form.rateScheduleVersionId} disabled={!canWrite} onChange={(e) => set('rateScheduleVersionId')(e.target.value)}>
            <option value="">Not pinned</option>
            {bundle.rateScheduleVersions.map((schedule) => <option key={schedule.id} value={schedule.id}>{schedule.versionLabel}{schedule.legacy ? ' (legacy seed)' : ''}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-semibold text-slate-700">Year’s Purchase table</span>
          <select className="mt-1 w-full border rounded-gov-sm px-3 py-2" value={form.ypTableVersionId} disabled={!canWrite} onChange={(e) => set('ypTableVersionId')(e.target.value)}>
            <option value="">Not pinned</option>
            {bundle.ypTables.map((table) => <option key={table.id} value={table.id}>{table.name}{table.legacy ? ' (legacy)' : ''}</option>)}
          </select>
        </label>
        {canWrite && <button className="bg-gov-navy text-white rounded-gov-md px-4 py-2 text-sm font-semibold" onClick={() => onSave(form)}>Save identity</button>}
      </section>
      <section className="space-y-4">
        <div className="bg-white border border-slate-200 rounded-gov-lg p-5 space-y-3">
          <h2 className="font-bold text-gov-navy">Structures</h2>
          <ul className="text-sm space-y-2">
            {bundle.structures.map((structure) => <li key={structure.id}>{structure.name} · {structure.participation === 'EXCLUDED' ? 'excluded' : 'included'} · life {structure.usefulLifeYears ?? 'not entered'}</li>)}
            {bundle.structures.length === 0 && <li className="text-slate-500">No structure yet.</li>}
          </ul>
          {canWrite && (
            <div className="flex gap-2">
              <input className="border rounded-gov-sm px-3 py-2 text-sm flex-1" value={name} onChange={(e) => setName(e.target.value)} />
              <button className="bg-gov-teal text-white rounded-gov-md px-4 py-2 text-sm font-semibold" onClick={() => onAdd(name)}>Add structure</button>
            </div>
          )}
        </div>
        <EvidenceBox evidence={bundle.evidence} canWrite={canWrite} onEvidence={onEvidence} />
      </section>
    </div>
  );
}

function EvidenceBox({ evidence, canWrite, onEvidence }: { evidence: Bundle['evidence']; canWrite: boolean; onEvidence: (form: FormData) => void }) {
  const [documentType, setDocumentType] = useState('FIELD_DRAWING');
  const [notes, setNotes] = useState('');
  return (
    <div className="bg-white border border-slate-200 rounded-gov-lg p-5 space-y-3">
      <h2 className="font-bold text-gov-navy">Evidence</h2>
      <p className="text-xs text-slate-500">The field drawing is stored with the case. Dimensions are not read from the file.</p>
      <ul className="text-sm space-y-1">
        {evidence.map((item) => <li key={item.id}>{item.documentType} v{item.version}: {item.originalName}</li>)}
      </ul>
      {canWrite && (
        <form className="space-y-2" onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          data.set('documentType', documentType);
          data.set('notes', notes);
          onEvidence(data);
        }}>
          <select className="border rounded-gov-sm px-3 py-2 text-sm w-full" value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
            {['FIELD_DRAWING', 'SECTION_SKETCH', 'SITE_PHOTO', 'SOURCE_WORKBOOK', 'RATE_DOCUMENT', 'SUPPORTING_MEASUREMENT', 'OTHER'].map((type) => <option key={type}>{type}</option>)}
          </select>
          <input name="file" type="file" className="text-sm" required />
          <input className="border rounded-gov-sm px-3 py-2 text-sm w-full" placeholder="Note" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <button className="bg-gov-navy text-white rounded-gov-md px-4 py-2 text-sm font-semibold">Attach version</button>
        </form>
      )}
    </div>
  );
}

function BuildingScreen(props: {
  structure: StructureRow;
  structures: StructureRow[];
  rooms: RoomRow[];
  walls: WallRow[];
  openings: Bundle['openings'];
  members: Bundle['members'];
  canWrite: boolean;
  onSelect: (id: string) => void;
  onProfile: (body: StructureRow) => void;
  onRooms: (rooms: RoomRow[]) => void;
  onCandidates: () => void;
  onConfirm: (id: string, body: Record<string, unknown>) => void;
  onManualWall: (body: Record<string, unknown>) => void;
  onOpenings: (openings: Bundle['openings']) => void;
  onMembers: (members: Bundle['members']) => void;
}) {
  const [profile, setProfile] = useState(props.structure);
  const [rooms, setRooms] = useState<RoomRow[]>(props.rooms.length ? props.rooms : [emptyRoom()]);
  const [openingCode, setOpeningCode] = useState('D1');
  const [memberKind, setMemberKind] = useState('COLUMN');
  const [wallLabel, setWallLabel] = useState('');
  const [wallLength, setWallLength] = useState('');
  useEffect(() => { setProfile(props.structure); setRooms(props.rooms.length ? props.rooms : [emptyRoom()]); }, [props.structure.id]);
  const set = (key: keyof StructureRow) => (value: string) => setProfile((current) => ({ ...current, [key]: value }));
  return (
    <div className="space-y-5">
      <label className="text-sm font-semibold">Structure
        <select className="ml-2 border rounded-gov-sm px-3 py-2" value={props.structure.id} onChange={(e) => props.onSelect(e.target.value)}>
          {props.structures.map((structure) => <option key={structure.id} value={structure.id}>{structure.name}</option>)}
        </select>
      </label>
      <section className="bg-white border rounded-gov-lg p-5 grid md:grid-cols-2 gap-3">
        <h2 className="md:col-span-2 font-bold text-gov-navy">Construction profile</h2>
        <Field label="Type" value={profile.structureTypeText} onChange={set('structureTypeText')} disabled={!props.canWrite} />
        <Field label="Wall material" value={profile.wallMaterialText} onChange={set('wallMaterialText')} disabled={!props.canWrite} />
        <Field label="Wall thickness (m)" value={profile.wallThicknessM?.toString() || ''} onChange={(value) => setProfile((c) => ({ ...c, wallThicknessM: value === '' ? null : Number(value) }))} disabled={!props.canWrite} />
        <Field label="Storey height (m)" value={profile.storeyHeightM?.toString() || ''} onChange={(value) => setProfile((c) => ({ ...c, storeyHeightM: value === '' ? null : Number(value) }))} disabled={!props.canWrite} />
        <Field label="Construction year" value={profile.constructionYear?.toString() || ''} onChange={(value) => setProfile((c) => ({ ...c, constructionYear: value === '' ? null : Number(value) }))} disabled={!props.canWrite} />
        <Field label="Useful life (typed, not assumed)" value={profile.usefulLifeYears?.toString() || ''} onChange={(value) => setProfile((c) => ({ ...c, usefulLifeYears: value === '' ? null : Number(value) }))} disabled={!props.canWrite} />
        <Field label="Floor" value={profile.floorFinish} onChange={set('floorFinish')} disabled={!props.canWrite} />
        <Field label="Roof" value={profile.roofFinish} onChange={set('roofFinish')} disabled={!props.canWrite} />
        {props.canWrite && <button className="bg-gov-navy text-white rounded-gov-md px-4 py-2 text-sm font-semibold" onClick={() => props.onProfile(profile)}>Save profile</button>}
      </section>
      <section className="bg-white border rounded-gov-lg p-5 space-y-3">
        <h2 className="font-bold text-gov-navy">Rooms and placement</h2>
        <p className="text-xs text-slate-500">Leave row and bay empty if the layout is not known. A plan will not be invented.</p>
        {rooms.map((room, index) => (
          <div key={index} className="grid grid-cols-6 gap-2 text-sm">
            <input className="border rounded px-2 py-1" placeholder="Code" value={room.code} onChange={(e) => setRooms(rooms.map((item, i) => i === index ? { ...item, code: e.target.value } : item))} />
            <input className="border rounded px-2 py-1" placeholder="Length" value={room.lengthM ?? ''} onChange={(e) => setRooms(rooms.map((item, i) => i === index ? { ...item, lengthM: e.target.value === '' ? null : Number(e.target.value) } : item))} />
            <input className="border rounded px-2 py-1" placeholder="Breadth" value={room.breadthM ?? ''} onChange={(e) => setRooms(rooms.map((item, i) => i === index ? { ...item, breadthM: e.target.value === '' ? null : Number(e.target.value) } : item))} />
            <input className="border rounded px-2 py-1" placeholder="Row" value={room.rowIndex ?? ''} onChange={(e) => setRooms(rooms.map((item, i) => i === index ? { ...item, rowIndex: e.target.value === '' ? null : Number(e.target.value) } : item))} />
            <input className="border rounded px-2 py-1" placeholder="Bay" value={room.bayIndex ?? ''} onChange={(e) => setRooms(rooms.map((item, i) => i === index ? { ...item, bayIndex: e.target.value === '' ? null : Number(e.target.value) } : item))} />
            <select className="border rounded px-2 py-1" value={room.enclosure} onChange={(e) => setRooms(rooms.map((item, i) => i === index ? { ...item, enclosure: e.target.value as RoomRow['enclosure'] } : item))}>
              <option value="UNKNOWN">Unknown</option>
              <option value="ENCLOSED">Enclosed</option>
              <option value="OPEN">Open</option>
            </select>
          </div>
        ))}
        {props.canWrite && (
          <div className="flex gap-2">
            <button className="border rounded-gov-md px-3 py-2 text-sm" onClick={() => setRooms([...rooms, emptyRoom()])}>Add room</button>
            <button className="bg-gov-navy text-white rounded-gov-md px-3 py-2 text-sm" onClick={() => props.onRooms(rooms)}>Save rooms</button>
            <button className="bg-gov-teal text-white rounded-gov-md px-3 py-2 text-sm" onClick={props.onCandidates}>Propose candidate walls</button>
          </div>
        )}
      </section>
      <section className="bg-white border rounded-gov-lg p-5 space-y-2">
        <h2 className="font-bold text-gov-navy">Walls</h2>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-slate-500"><th>Status</th><th>Description</th><th>Length</th><th></th></tr></thead>
          <tbody>
            {props.walls.map((wall) => (
              <tr key={wall.id} className="border-t">
                <td className="py-2">{wall.origin === 'CANDIDATE' ? 'Candidate' : 'Confirmed'}</td>
                <td>{wall.label}</td>
                <td>{wall.lengthM} m</td>
                <td>
                  {props.canWrite && wall.origin === 'CANDIDATE' && (
                    <span className="space-x-2">
                      <button className="text-gov-navy font-semibold" onClick={() => props.onConfirm(wall.id, { action: 'CONFIRM' })}>Confirm</button>
                      <button className="text-red-700" onClick={() => props.onConfirm(wall.id, { action: 'REJECT' })}>Reject</button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {props.walls.length === 0 && <p className="text-sm text-slate-500">No walls yet.</p>}
        {props.canWrite && (
          <form className="flex flex-wrap gap-2 text-sm" onSubmit={(event) => {
            event.preventDefault();
            const lengthM = Number(wallLength);
            if (!wallLabel.trim() || !(lengthM > 0)) return;
            props.onManualWall({ label: wallLabel.trim(), lengthM, count: 1 });
            setWallLabel('');
            setWallLength('');
          }}>
            <input className="border rounded px-2 py-1" placeholder="Wall label from the drawing" value={wallLabel} onChange={(e) => setWallLabel(e.target.value)} />
            <input className="border rounded px-2 py-1" placeholder="Measured length (m)" value={wallLength} onChange={(e) => setWallLength(e.target.value)} />
            <button className="border rounded-gov-md px-3 py-1">Add measured wall</button>
          </form>
        )}
      </section>
      <section className="bg-white border rounded-gov-lg p-5 space-y-2 text-sm">
        <h2 className="font-bold text-gov-navy">Openings and members</h2>
        <p>Openings: {props.openings.map((o) => o.code).join(', ') || 'none'}</p>
        <p>Members: {props.members.map((m) => `${m.kind} ${m.count ?? 'count missing'}`).join(', ') || 'none'}</p>
        {props.canWrite && (
          <div className="flex flex-wrap gap-2">
            <input className="border rounded px-2 py-1" value={openingCode} onChange={(e) => setOpeningCode(e.target.value)} />
            <button className="border rounded px-3 py-1" onClick={() => props.onOpenings([...props.openings, { id: '', structureId: props.structure.id, code: openingCode, kind: 'DOOR', count: null, widthM: null, heightM: null }])}>Add opening</button>
            <select className="border rounded px-2 py-1" value={memberKind} onChange={(e) => setMemberKind(e.target.value)}>
              {['COLUMN', 'BEAM', 'POST', 'RAFTER_X', 'RAFTER_Y', 'PAULI', 'BALLI', 'GI_PIPE', 'MS_ANGLE', 'MESH', 'OTHER'].map((kind) => <option key={kind}>{kind}</option>)}
            </select>
            <button className="border rounded px-3 py-1" onClick={() => props.onMembers([...props.members, { id: '', structureId: props.structure.id, kind: memberKind, count: null, lengthM: null, breadthM: null, depthM: null }])}>Add member</button>
          </div>
        )}
      </section>
    </div>
  );
}

function GeneratedScreen({ applicability, blocks, canWrite, onGenerate, onDraft }: {
  applicability: { ruleId: string; title: string; state: string; reason: string; ruleStatus: string }[];
  blocks: BlockRow[];
  canWrite: boolean;
  onGenerate: () => void;
  onDraft: (ruleId: string) => void;
}) {
  return (
    <div className="bg-white border rounded-gov-lg p-5 space-y-4">
      <h2 className="font-bold text-gov-navy">Applicable work</h2>
      <p className="text-sm text-slate-600">Generating the list does not write quantities. A draft suggestion is created only when you ask for that line.</p>
      {canWrite && <button className="bg-gov-navy text-white rounded-gov-md px-4 py-2 text-sm font-semibold" onClick={onGenerate}>Check what can be measured</button>}
      <table className="w-full text-sm">
        <thead><tr className="text-left text-slate-500"><th>Suggestion</th><th>State</th><th>Why</th><th></th></tr></thead>
        <tbody>
          {applicability.map((row) => (
            <tr key={row.ruleId} className="border-t align-top">
              <td className="py-2 pr-2">{row.title}<div className="text-xs text-slate-400">{row.ruleStatus}</div></td>
              <td>{row.state}</td>
              <td className="text-slate-600">{row.reason}</td>
              <td>{canWrite && row.state !== 'NOT_APPLICABLE' && <button className="text-gov-navy font-semibold" onClick={() => onDraft(row.ruleId)}>Create draft line</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3 className="font-semibold">Lines on this structure</h3>
      {blocks.map((block) => <p key={block.id} className="text-sm">{block.title}: {block.status} · derived {block.derivedNet ?? '—'} {block.unit}</p>)}
    </div>
  );
}

function ReviewScreen({ bundle, canWrite, onDecision, onRate, onManual, onCalculate }: {
  bundle: Bundle;
  canWrite: boolean;
  onDecision: (id: string, body: Record<string, unknown>) => void;
  onRate: (id: string, itemNumber: string) => void;
  onManual: (structureId: string, body: Record<string, unknown>) => void;
  onCalculate: () => void;
}) {
  const [manual, setManual] = useState({ structureId: bundle.structures[0]?.id || '', title: '', quantity: '', unit: 'cum', reason: '' });
  return (
    <div className="bg-white border rounded-gov-lg p-5 space-y-4">
      <h2 className="font-bold text-gov-navy">Review</h2>
      <p className="text-sm text-slate-600">Each line keeps its own item number. Item 19.1 stays a string so it is not stored as 19.1 with a floating-point tail.</p>
      <table className="w-full text-sm">
        <thead><tr className="text-left text-slate-500"><th>Line</th><th>Derived</th><th>Engineer</th><th>Status</th><th>Rate</th><th>Decision</th></tr></thead>
        <tbody>
          {bundle.blocks.map((block) => (
            <ReviewRow key={block.id} block={block} canWrite={canWrite} onDecision={onDecision} onRate={onRate} />
          ))}
        </tbody>
      </table>
      {canWrite && (
        <form className="grid md:grid-cols-6 gap-2 text-sm" onSubmit={(event) => {
          event.preventDefault();
          const quantity = Number(manual.quantity);
          if (!manual.structureId || !manual.title.trim() || !(quantity > 0) || !manual.reason.trim()) return;
          onManual(manual.structureId, { title: manual.title.trim(), quantity, unit: manual.unit, reason: manual.reason.trim() });
          setManual((current) => ({ ...current, title: '', quantity: '', reason: '' }));
        }}>
          <select className="border rounded px-2 py-1" value={manual.structureId} onChange={(e) => setManual({ ...manual, structureId: e.target.value })}>
            {bundle.structures.map((structure) => <option key={structure.id} value={structure.id}>{structure.name}</option>)}
          </select>
          <input className="border rounded px-2 py-1" placeholder="Item title" value={manual.title} onChange={(e) => setManual({ ...manual, title: e.target.value })} />
          <input className="border rounded px-2 py-1" placeholder="Quantity" value={manual.quantity} onChange={(e) => setManual({ ...manual, quantity: e.target.value })} />
          <input className="border rounded px-2 py-1" placeholder="Unit" value={manual.unit} onChange={(e) => setManual({ ...manual, unit: e.target.value })} />
          <input className="border rounded px-2 py-1" placeholder="Why this quantity" value={manual.reason} onChange={(e) => setManual({ ...manual, reason: e.target.value })} />
          <button className="border rounded px-3 py-1">Add measured item</button>
        </form>
      )}
      {canWrite && <button className="bg-gov-navy text-white rounded-gov-md px-4 py-2 text-sm font-semibold" onClick={onCalculate}>Prepare abstract</button>}
    </div>
  );
}

function ReviewRow({ block, canWrite, onDecision, onRate }: {
  block: BlockRow;
  canWrite: boolean;
  onDecision: (id: string, body: Record<string, unknown>) => void;
  onRate: (id: string, itemNumber: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [overrideNet, setOverrideNet] = useState(block.engineerNet?.toString() || block.derivedNet?.toString() || '');
  const [itemNumber, setItemNumber] = useState('');
  return (
    <tr className="border-t align-top">
      <td className="py-2 pr-2">{block.title}<div className="text-xs text-slate-400">{block.formulaText}</div></td>
      <td>{block.derivedNet ?? '—'} {block.unit}</td>
      <td>{block.engineerNet ?? '—'} {block.unit}</td>
      <td>{block.status}<div className="text-xs text-slate-400">{block.rateMatch}</div></td>
      <td className="text-xs">{block.rateItemId || 'not pinned'}</td>
      <td>
        {canWrite && (
          <div className="flex flex-wrap gap-1 py-1">
            <button className="text-gov-navy font-semibold" onClick={() => onDecision(block.id, { action: 'ACCEPT' })}>Accept</button>
            <input className="border rounded px-1 w-20" placeholder="Qty" value={overrideNet} onChange={(e) => setOverrideNet(e.target.value)} />
            <input className="border rounded px-1 w-28" placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
            <button onClick={() => onDecision(block.id, { action: 'OVERRIDE', reason, overrideNet: Number(overrideNet) })}>Override</button>
            <button onClick={() => onDecision(block.id, { action: 'EXCLUDE', reason })}>Exclude</button>
            <button onClick={() => onDecision(block.id, { action: 'RESET' })}>Reset</button>
            <input className="border rounded px-1 w-16" placeholder="19.1" value={itemNumber} onChange={(e) => setItemNumber(e.target.value)} />
            <button onClick={() => onRate(block.id, itemNumber)}>Match rate</button>
          </div>
        )}
      </td>
    </tr>
  );
}

function FinalizeScreen({ bundle, latest, canWrite, canFinalize, onAcceptDep, onCalculate, onFinalize }: {
  bundle: Bundle;
  latest?: SnapshotRow;
  canWrite: boolean;
  canFinalize: boolean;
  onAcceptDep: () => void;
  onCalculate: () => void;
  onFinalize: (id: string) => void;
}) {
  return (
    <div className="bg-white border rounded-gov-lg p-5 space-y-3 text-sm">
      <h2 className="font-bold text-gov-navy text-base">Final review</h2>
      <p>Owner: {bundle.property?.ownerName}. Structures: {bundle.structures.map((s) => s.name).join(', ') || 'none'}.</p>
      <p>Evidence files: {bundle.evidence.length}. Rate version: {bundle.case.rateScheduleVersionId || 'not pinned'}. Year’s Purchase table: {bundle.case.ypTableVersionId || 'not pinned'}.</p>
      <p>Useful life is whatever was typed on each structure. It is not defaulted to 10 or 45. There is no salvage line.</p>
      {latest ? (
        <>
          <p>Present cost: {latest.presentCost ?? 'blocked'}</p>
          <p>Depreciated value: {latest.depreciatedValue ?? 'blocked'}</p>
          {latest.body?.abstract && latest.body.abstract.length > 0 && (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-slate-500"><th>Item</th><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
              <tbody>
                {latest.body.abstract.map((line) => (
                  <tr key={`${line.itemNumber}-${line.title}`} className="border-t">
                    <td className="py-1">{line.itemNumber || '—'}</td>
                    <td>{line.title}</td>
                    <td>{line.quantity} {line.unit}</td>
                    <td>{line.rate ?? '—'}</td>
                    <td>{line.amount ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p>Formula: {latest.depreciationFormula}</p>
          <p>Rounding profile: {latest.roundingProfileId}</p>
          <p>Status: {latest.status}{latest.finalizedAt ? ` at ${latest.finalizedAt}` : ''}</p>
          {latest.blockers.length > 0 && (
            <ul className="list-disc pl-5 text-red-800">{latest.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>
          )}
        </>
      ) : <p>No snapshot yet.</p>}
      {canWrite && <button className="border rounded-gov-md px-3 py-2" onClick={onCalculate}>Recalculate draft</button>}
      {canWrite && <button className="ml-2 border rounded-gov-md px-3 py-2" onClick={onAcceptDep}>Accept depreciation</button>}
      {canFinalize && latest && latest.status !== 'FINALIZED' && (
        <div>
          <button className="bg-gov-navy text-white rounded-gov-md px-4 py-2 font-semibold" onClick={() => onFinalize(latest.id)}>Finalize</button>
          <p className="text-xs text-slate-500 mt-2">Finalize is refused while any blocker remains. This role check is provisional.</p>
        </div>
      )}
      {!canFinalize && <p className="text-xs text-slate-500">The provisional matrix allows only an administrator to finalize.</p>}
    </div>
  );
}

async function downloadSnapshot(snapshotId: string, kind: 'pdf' | 'xls') {
  const res = await api.get(`/v1/workflow/snapshots/${snapshotId}/${kind}`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${snapshotId}.${kind === 'pdf' ? 'pdf' : 'xls'}`;
  link.click();
  URL.revokeObjectURL(url);
}

function DocumentsScreen({ bundle, onReplay, canWrite }: { bundle: Bundle; onReplay: () => void; canWrite: boolean }) {
  return (
    <div className="bg-white border rounded-gov-lg p-5 space-y-3 text-sm">
      <h2 className="font-bold text-gov-navy text-base">Documents</h2>
      <p>PDF and Excel are rendered from the snapshot. Opening them does not recalculate the valuation.</p>
      <ul className="space-y-2">
        {bundle.snapshots.map((snapshot) => (
          <li key={snapshot.id}>
            {snapshot.label} {snapshot.status}: present {snapshot.presentCost ?? '—'}, depreciated {snapshot.depreciatedValue ?? '—'}
            <button className="ml-3 text-gov-navy font-semibold" onClick={() => downloadSnapshot(snapshot.id, 'pdf')}>PDF</button>
            <button className="ml-3 text-gov-navy font-semibold" onClick={() => downloadSnapshot(snapshot.id, 'xls')}>Excel</button>
          </li>
        ))}
      </ul>
      {canWrite && (
        <button className="border rounded-gov-md px-3 py-2" onClick={onReplay}>Run gut-193 source replay on this case</button>
      )}
      <p className="text-xs text-slate-500">Source replay reproduces the workbook totals. It does not become the rule for the next house.</p>
    </div>
  );
}
