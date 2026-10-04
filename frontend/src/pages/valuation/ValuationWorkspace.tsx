import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { BuildingGuide, MeasurementGuide, RuleGuidance } from './BuildingGuide';

type Screen = 1 | 2 | 3 | 4 | 5 | 6;

interface StructureRow {
  id: string;
  name: string;
  participation: 'INCLUDED' | 'EXCLUDED';
  exclusionReason?: string;
  structureKind?: string | null;
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

interface RoomRow {
  id?: string;
  code: string;
  lengthM: number | null;
  breadthM: number | null;
  rowIndex: number | null;
  bayIndex: number | null;
  enclosure: 'ENCLOSED' | 'OPEN' | 'PARTIALLY_OPEN' | 'UNKNOWN';
  boundaryWallIds?: { north: string; south: string; east: string; west: string };
}

interface WallRow {
  id: string;
  origin: string;
  kind: string;
  label: string;
  count: number;
  lengthM: number;
  breadthM: number | null;
  thicknessM?: number | null;
  heightM?: number | null;
  thicknessSource?: string;
  heightSource?: string;
  segmentKind?: string;
  verticalZones?: { id: string; kind: string; heightM: number | null }[];
  sourceRoomIds?: string[];
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
  guidance?: {
    structures: { structureId: string; derived: { label: string; quantity: number | null; unit: string; source: string; note: string }[]; profile: { id: string; label: string; state: string; detail: string }[]; rules: RuleGuidance[] }[];
    attention: { label: string; state: 'done' | 'attention'; detail: string }[];
  };
}

const SCREENS: { id: Screen; label: string }[] = [
  { id: 1, label: 'Case and structures' },
  { id: 2, label: 'Building definition' },
  { id: 3, label: 'Generated measurement' },
  { id: 4, label: 'Review, rates, abstract' },
  { id: 5, label: 'Depreciation and finalize' },
  { id: 6, label: 'Documents' },
];

export const ValuationWorkspace: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [screen, setScreen] = useState<Screen>(1);
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [structureId, setStructureId] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [focus, setFocus] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const canWrite = user?.role === 'ADMIN' || user?.role === 'ESTIMATOR';
  const canFinalize = user?.role === 'ADMIN';

  const load = async () => {
    const res = await api.get<Bundle>(`/v1/workflow/cases/${id}`);
    setBundle(res.data);
    setStructureId((current) => {
      if (current && res.data.structures.some((structure) => structure.id === current)) return current;
      return res.data.structures[0]?.id || '';
    });
  };

  useEffect(() => {
    setLoading(true);
    load()
      .catch(() => setError('The case could not be loaded.'))
      .finally(() => setLoading(false));
  }, [id]);

  const run = async (work: () => Promise<void>) => {
    if (saving) return;
    setError('');
    setMessage('');
    setSaving(true);
    try {
      await work();
      await load();
    } catch (err: unknown) {
      const apiError = err as { response?: { status?: number; data?: { message?: string; error?: string } } };
      const status = apiError.response?.status;
      if (status === 401) {
        setError(apiError.response?.data?.message || 'Session expired. Sign in again — stay on this page so your typed values are not lost until you leave.');
      } else {
        setError(apiError.response?.data?.message || 'The request was not saved.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading && !bundle) {
    return (
      <div className="p-10 flex items-center gap-3 text-sm text-slate-600">
        <span className="inline-block h-4 w-4 rounded-full border-2 border-gov-navy border-t-transparent animate-spin" />
        Loading valuation…
      </div>
    );
  }
  if (!bundle) return <div className="p-8 text-sm text-red-700">The case could not be loaded.</div>;

  const structure = bundle.structures.find((s) => s.id === structureId) || null;
  const rooms = bundle.rooms.filter((r) => r.structureId === structureId);
  const walls = bundle.wallRuns.filter((w) => w.structureId === structureId);
  const blocks = bundle.blocks.filter((b) => !structureId || b.structureId === structureId || screen >= 4);
  const latest = [...bundle.snapshots].reverse().find((snapshot) => snapshot.label === 'PLATFORM') || bundle.snapshots[bundle.snapshots.length - 1];
  const attention = (bundle.guidance?.attention || []).filter((item) => item.state === 'attention');
  const doneCount = (bundle.guidance?.attention || []).filter((item) => item.state === 'done').length;
  const totalChecks = (bundle.guidance?.attention || []).length;

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <button type="button" className="text-xs font-semibold text-gov-navy hover:underline" onClick={() => navigate('/cases')}>Back to cases</button>
          <h1 className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">{bundle.property?.ownerName || 'Valuation'} · {bundle.case.caseNumber}</h1>
          <p className="text-sm text-slate-500 mt-1">Screen {screen}: {SCREENS.find((item) => item.id === screen)?.label}</p>
        </div>
        <div className="text-right space-y-1">
          {saving && (
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-gov-navy bg-slate-50 border border-slate-200 rounded-full px-3 py-1">
              <span className="inline-block h-3 w-3 rounded-full border-2 border-gov-navy border-t-transparent animate-spin" />
              Saving…
            </div>
          )}
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">{user?.role}</div>
        </div>
      </div>

      <nav className="flex flex-wrap gap-2" aria-label="Valuation steps">
        {SCREENS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setScreen(item.id)}
            aria-current={screen === item.id ? 'step' : undefined}
            className={`px-3 py-2 rounded-gov-md text-sm font-semibold transition-colors ${screen === item.id ? 'bg-gov-navy text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300'}`}
          >
            {item.id}. {item.label}
          </button>
        ))}
      </nav>

      {bundle.guidance && (
        <div className="bg-white border border-slate-200 rounded-gov-lg px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Progress · {doneCount}/{totalChecks || 0} ready</p>
            {attention.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-2">
                {attention.map((item) => (
                  <span key={item.label} className="text-xs rounded-full px-3 py-1 bg-amber-50 text-amber-900" title={item.detail}>
                    {item.label}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-teal-800 mt-1">Ready for this stage.</p>
            )}
          </div>
          <div className="flex gap-2">
            {screen > 1 && (
              <button className="border border-slate-200 rounded-gov-md px-3 py-2 text-sm" onClick={() => setScreen((screen - 1) as Screen)}>Back</button>
            )}
            {screen < 6 && (
              <button className="bg-gov-navy text-white rounded-gov-md px-3 py-2 text-sm font-semibold" onClick={() => setScreen((screen + 1) as Screen)}>Continue</button>
            )}
          </div>
        </div>
      )}

      {error && <div className="rounded-gov-md bg-red-50 text-red-800 text-sm px-4 py-3">{error}</div>}
      {message && <div className="rounded-gov-md bg-teal-50 text-teal-900 text-sm px-4 py-3">{message}</div>}

      {screen === 1 && (
        <IdentityScreen
          bundle={bundle}
          canWrite={canWrite}
          busy={saving}
          onSave={(body) => run(async () => { await api.put(`/v1/workflow/cases/${id}/identity`, body); setMessage('Case identity saved.'); })}
          onAdd={(name, structureKind) => run(async () => {
            const res = await api.post(`/v1/workflow/cases/${id}/structures`, { name, structureKind });
            const createdId = res.data?.structure?.id as string | undefined;
            if (createdId) setStructureId(createdId);
            setMessage(`${name} added.`);
            setScreen(2);
          })}
          onRemove={(structureIdToRemove) => run(async () => {
            const res = await api.delete(`/v1/workflow/structures/${structureIdToRemove}`);
            setMessage(res.data.note || 'Structure removed.');
          })}
          onEvidence={(form) => run(async () => { await api.post(`/v1/workflow/cases/${id}/evidence`, form); setMessage('Evidence attached.'); })}
        />
      )}
      {screen === 2 && structure && (
        <BuildingGuide
          structure={structure}
          structures={bundle.structures}
          rooms={rooms}
          walls={walls}
          openings={bundle.openings.filter((o) => o.structureId === structureId)}
          members={bundle.members.filter((m) => m.structureId === structureId)}
          derived={bundle.guidance?.structures.find((item) => item.structureId === structure.id)?.derived || []}
          profileChecks={bundle.guidance?.structures.find((item) => item.structureId === structure.id)?.profile || []}
          focus={focus}
          canWrite={canWrite}
          busy={saving}
          onSelect={setStructureId}
          onRemoveStructure={(structureIdToRemove) => run(async () => {
            const res = await api.delete(`/v1/workflow/structures/${structureIdToRemove}`);
            setMessage(res.data.note || 'Structure removed.');
          })}
          onProfile={(body) => run(async () => {
            const res = await api.put(`/v1/workflow/structures/${structure.id}`, body);
            const impact = res.data.impact || [];
            setMessage(impact.length ? `${impact.length} accepted line(s) now need review. Previous values were kept.` : 'Construction saved.');
          })}
          onLayout={(body) => run(async () => {
            const res = await api.put(`/v1/workflow/structures/${structure.id}/structure-layout`, body);
            setMessage(res.data.note || 'Structure layout saved.');
          })}
          onSimplePlan={(body) => run(async () => {
            const res = await api.put(`/v1/workflow/structures/${structure.id}/simple-plan`, body);
            setMessage(res.data.note || 'Simple plan saved.');
          })}
          onPatchRoom={(roomId, body) => run(async () => { await api.patch(`/v1/workflow/rooms/${roomId}`, body); setMessage('Room updated.'); })}
          onPatchWall={(wallId, body) => run(async () => { await api.patch(`/v1/workflow/wall-runs/${wallId}`, body); setMessage('Wall fact updated.'); })}
          onConfirm={(wallId, body) => run(async () => { await api.post(`/v1/workflow/wall-runs/${wallId}/confirm`, body); setMessage('Wall updated.'); })}
          onManualWall={(body) => run(async () => { await api.post(`/v1/workflow/structures/${structure.id}/wall-runs`, body); setMessage('Measured wall added.'); })}
          onOpenings={(openings) => run(async () => { await api.put(`/v1/workflow/structures/${structure.id}/openings`, { openings }); setMessage('Openings saved.'); })}
          onMembers={(members) => run(async () => { await api.put(`/v1/workflow/structures/${structure.id}/members`, { members }); setMessage('Members saved.'); })}
        />
      )}
      {screen === 2 && !structure && <p className="text-sm text-slate-600">Add a structure on Screen 1 to continue.</p>}
      {screen === 3 && (
        <MeasurementGuide
          rules={(bundle.guidance?.structures.find((item) => item.structureId === structureId)?.rules || []).filter((rule) => {
            const all = bundle.guidance?.structures.find((item) => item.structureId === structureId)?.rules || [];
            const eknathProfile = all.some((item) => item.ruleId.startsWith('eknath.') && item.readiness !== 'NOT_APPLICABLE');
            // Gut-193 profile: show eknath.* only. Ordinary cases: show draft.* residential pack.
            if (eknathProfile) return rule.ruleId.startsWith('eknath.');
            return rule.ruleId.startsWith('draft.') || rule.readiness !== 'NOT_APPLICABLE';
          })}
          canWrite={canWrite}
          busy={saving}
          schedulePinned={Boolean(bundle.case.rateScheduleVersionId)}
          onDraft={(ruleId) => run(async () => { await api.post(`/v1/workflow/structures/${structureId}/draft-lines`, { ruleId }); setMessage('Draft line created.'); })}
          onGenerateSheet={() => run(async () => {
            const res = await api.post(`/v1/workflow/structures/${structureId}/generate-measurement`, {});
            const written = (res.data.created || 0) + (res.data.updated || 0);
            setMessage(written
              ? `Generated ${written} measurement line(s) from saved facts.`
              : (res.data.note || 'No lines were ready. Complete construction facts and confirm the plan first.'));
            if (written) setScreen(4);
          })}
          onGo={(target) => { setFocus(target); setScreen(2); }}
        />
      )}
      {screen === 4 && (
        <ReviewScreen
          bundle={bundle}
          canWrite={canWrite}
          onDecision={(blockId, body) => run(async () => { await api.post(`/v1/workflow/blocks/${blockId}/decision`, body); setMessage('Decision saved.'); })}
          onBindRates={() => run(async () => {
            const res = await api.post(`/v1/workflow/cases/${id}/bind-rates`);
            setMessage(res.data.note || `Bound rates on ${res.data.rebound || 0} line(s).`);
          })}
          onExcludeHelpers={() => run(async () => {
            const res = await api.post(`/v1/workflow/cases/${id}/exclude-helper-blocks`, { structureId });
            setMessage(res.data.note || `Excluded ${res.data.excluded || 0} helper line(s).`);
          })}
          onAcceptAllDrafts={() => run(async () => {
            const res = await api.post(`/v1/workflow/cases/${id}/accept-draft-blocks`, { structureId });
            setMessage(res.data.note || `${res.data.accepted || 0} draft line(s) accepted.`);
          })}
          onManual={(structureIdForLine, body) => run(async () => { await api.post(`/v1/workflow/structures/${structureIdForLine}/manual-block`, body); setMessage('Measured item added. The unit comes from the catalogue row you selected.'); })}
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

function Field({ label, value, onChange, disabled, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean; type?: string }) {
  return (
    <label className="block text-sm">
      <span className="font-semibold text-slate-700">{label}</span>
      <input type={type} disabled={disabled} className="mt-1 w-full border border-slate-200 rounded-gov-sm px-3 py-2" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

const STRUCTURE_KIND_CHIPS: { label: string; kind: string }[] = [
  { label: 'Main house', kind: 'MAIN_HOUSE' },
  { label: 'Tin / GI shed', kind: 'GI_SHED' },
  { label: 'Open shed', kind: 'OPEN_SHED' },
  { label: 'Porch / Veranda', kind: 'PORCH' },
  { label: 'Store', kind: 'STORE' },
  { label: 'Other structure', kind: 'OTHER' },
];

function IdentityScreen({ bundle, canWrite, busy, onSave, onAdd, onRemove, onEvidence }: {
  bundle: Bundle;
  canWrite: boolean;
  busy?: boolean;
  onSave: (body: Record<string, string | null>) => void;
  onAdd: (name: string, structureKind: string) => void;
  onRemove: (structureId: string) => void;
  onEvidence: (form: FormData) => void;
}) {
  const [form, setForm] = useState({ ...bundle.property, valuationDate: bundle.case.valuationDate, dateOfInspection: bundle.case.dateOfInspection, conflictingIdentifierNotes: bundle.case.conflictingIdentifierNotes || '', rateScheduleVersionId: bundle.case.rateScheduleVersionId || '', ypTableVersionId: bundle.case.ypTableVersionId || '' });
  const [name, setName] = useState('Main house');
  const [structureKind, setStructureKind] = useState('MAIN_HOUSE');
  const set = (key: string) => (value: string) => setForm((current) => ({ ...current, [key]: value }));
  const locked = !canWrite || Boolean(busy);

  useEffect(() => {
    setForm({
      ...bundle.property,
      valuationDate: bundle.case.valuationDate,
      dateOfInspection: bundle.case.dateOfInspection,
      conflictingIdentifierNotes: bundle.case.conflictingIdentifierNotes || '',
      rateScheduleVersionId: bundle.case.rateScheduleVersionId || '',
      ypTableVersionId: bundle.case.ypTableVersionId || '',
    });
  }, [
    bundle.case.id,
    bundle.case.valuationDate,
    bundle.case.dateOfInspection,
    bundle.case.rateScheduleVersionId,
    bundle.case.ypTableVersionId,
    bundle.case.conflictingIdentifierNotes,
    bundle.property.ownerName,
    bundle.property.surveyNumber,
    bundle.property.village,
  ]);

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <section className="bg-white border border-slate-200 rounded-gov-lg p-5 space-y-3">
        <h2 className="font-bold text-gov-navy text-base">Case identity</h2>
        <Field label="Owner" value={form.ownerName || ''} onChange={set('ownerName')} disabled={locked} />
        <Field label="Gut / survey number" value={form.surveyNumber || ''} onChange={set('surveyNumber')} disabled={locked} />
        <Field label="House number" value={form.houseNumber || ''} onChange={set('houseNumber')} disabled={locked} />
        <Field label="Village" value={form.village || ''} onChange={set('village')} disabled={locked} />
        <Field label="Taluka" value={form.taluka || ''} onChange={set('taluka')} disabled={locked} />
        <Field label="District" value={form.district || ''} onChange={set('district')} disabled={locked} />
        <Field label="LA case number" value={form.laCaseNumber || ''} onChange={set('laCaseNumber')} disabled={locked} />
        <Field label="Valuation date" type="date" value={form.valuationDate || ''} onChange={set('valuationDate')} disabled={locked} />
        <Field label="Inspection date" type="date" value={form.dateOfInspection || ''} onChange={set('dateOfInspection')} disabled={locked} />
        <label className="block text-sm">
          <span className="font-semibold text-slate-700">Rate schedule</span>
          <select className="mt-1 w-full border border-slate-200 rounded-gov-sm px-3 py-2" value={form.rateScheduleVersionId} disabled={locked} onChange={(e) => set('rateScheduleVersionId')(e.target.value)}>
            <option value="">Select schedule…</option>
            {bundle.rateScheduleVersions.map((schedule) => <option key={schedule.id} value={schedule.id}>{schedule.versionLabel}{schedule.legacy ? ' (legacy)' : ''}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-semibold text-slate-700">Year’s Purchase table</span>
          <select className="mt-1 w-full border border-slate-200 rounded-gov-sm px-3 py-2" value={form.ypTableVersionId} disabled={locked} onChange={(e) => set('ypTableVersionId')(e.target.value)}>
            <option value="">Select YP table…</option>
            {bundle.ypTables.map((table) => <option key={table.id} value={table.id}>{table.name}{table.legacy ? ' (legacy)' : ''}</option>)}
          </select>
        </label>
        <Field label="Identity notes" value={form.conflictingIdentifierNotes} onChange={set('conflictingIdentifierNotes')} disabled={locked} />
        {canWrite && (
          <button className="bg-gov-navy text-white rounded-gov-md px-4 py-2 text-sm font-semibold disabled:opacity-60" disabled={locked} onClick={() => onSave(form)}>
            {busy ? 'Saving…' : 'Save identity'}
          </button>
        )}
      </section>
      <section className="space-y-4">
        <div className="bg-white border border-slate-200 rounded-gov-lg p-5 space-y-3">
          <h2 className="font-bold text-gov-navy text-base">Structures</h2>
          <ul className="text-sm space-y-2">
            {bundle.structures.map((structure) => (
              <li key={structure.id} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
                <div>
                  <div className="font-medium text-slate-800">{structure.name}</div>
                  <div className="text-xs text-slate-500">
                    {STRUCTURE_KIND_CHIPS.find((item) => item.kind === structure.structureKind)?.label || structure.structureKind || 'Structure'}
                    {' · '}
                    {structure.geometryStatus === 'CONFIRMED' ? 'Plan confirmed' : structure.geometryStatus === 'DRAFT_GENERATED' ? 'Draft plan' : 'Needs plan'}
                  </div>
                </div>
                {canWrite && (
                  <button
                    type="button"
                    className="text-xs font-semibold text-red-700 disabled:opacity-50"
                    disabled={locked}
                    onClick={() => {
                      const finalized = bundle.snapshots.some((snapshot) => snapshot.status === 'FINALIZED' && snapshot.label === 'PLATFORM');
                      const ok = window.confirm(
                        finalized
                          ? `Remove “${structure.name}”? This also clears finalization so the case can be edited again.`
                          : `Remove “${structure.name}” from this case?`
                      );
                      if (ok) onRemove(structure.id);
                    }}
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
            {bundle.structures.length === 0 && <li className="text-slate-500">No structure yet.</li>}
          </ul>
          {canWrite && (
            <div className="space-y-2 pt-1">
              <p className="text-xs font-semibold text-slate-600">Add structure</p>
              <div className="flex flex-wrap gap-2">
                {STRUCTURE_KIND_CHIPS.map((item) => (
                  <button key={item.kind} type="button" disabled={locked} className={`border rounded-full px-3 py-1.5 text-xs ${structureKind === item.kind ? 'bg-gov-navy text-white border-gov-navy' : 'border-slate-200'}`} onClick={() => { setName(item.label); setStructureKind(item.kind); }}>{item.label}</button>
                ))}
              </div>
              <div className="flex gap-2">
                <input className="border border-slate-200 rounded-gov-sm px-3 py-2 text-sm flex-1" value={name} disabled={locked} onChange={(e) => setName(e.target.value)} placeholder="Name" />
                <button className="bg-gov-teal text-white rounded-gov-md px-4 py-2 text-sm font-semibold disabled:opacity-60" disabled={locked || !name.trim()} onClick={() => onAdd(name, structureKind)}>
                  {busy ? 'Adding…' : 'Add & continue'}
                </button>
              </div>
            </div>
          )}
        </div>
        <EvidenceBox evidence={bundle.evidence} canWrite={canWrite} busy={busy} onEvidence={onEvidence} />
      </section>
    </div>
  );
}

function EvidenceBox({ evidence, canWrite, busy, onEvidence }: { evidence: Bundle['evidence']; canWrite: boolean; busy?: boolean; onEvidence: (form: FormData) => void }) {
  const [documentType, setDocumentType] = useState('FIELD_DRAWING');
  const [notes, setNotes] = useState('');
  return (
    <div className="bg-white border border-slate-200 rounded-gov-lg p-5 space-y-3">
      <h2 className="font-bold text-gov-navy text-base">Evidence</h2>
      <ul className="text-sm space-y-1">
        {evidence.map((item) => <li key={item.id}>{item.documentType} v{item.version}: {item.originalName}</li>)}
        {evidence.length === 0 && <li className="text-slate-400">Optional — no files yet.</li>}
      </ul>
      {canWrite && (
        <form className="space-y-2" onSubmit={(e) => {
          e.preventDefault();
          if (busy) return;
          const data = new FormData(e.currentTarget);
          data.set('documentType', documentType);
          data.set('notes', notes);
          onEvidence(data);
        }}>
          <select className="border border-slate-200 rounded-gov-sm px-3 py-2 text-sm w-full" value={documentType} disabled={busy} onChange={(e) => setDocumentType(e.target.value)}>
            {[
              ['FIELD_DRAWING', 'Field drawing'],
              ['SECTION_SKETCH', 'Section sketch'],
              ['SITE_PHOTO', 'Site photo'],
              ['SOURCE_WORKBOOK', 'Source workbook'],
              ['RATE_DOCUMENT', 'Rate document'],
              ['SUPPORTING_MEASUREMENT', 'Supporting measurement'],
              ['OTHER', 'Other evidence'],
            ].map(([type, label]) => <option key={type} value={type}>{label}</option>)}
          </select>
          <input name="file" type="file" className="text-sm" required disabled={busy} />
          <input className="border border-slate-200 rounded-gov-sm px-3 py-2 text-sm w-full" placeholder="Note" value={notes} disabled={busy} onChange={(e) => setNotes(e.target.value)} />
          <button className="bg-gov-navy text-white rounded-gov-md px-4 py-2 text-sm font-semibold disabled:opacity-60" disabled={busy}>{busy ? 'Uploading…' : 'Attach file'}</button>
        </form>
      )}
    </div>
  );
}

function ReviewScreen({ bundle, canWrite, onDecision, onBindRates, onExcludeHelpers, onAcceptAllDrafts, onManual, onCalculate }: {
  bundle: Bundle;
  canWrite: boolean;
  onDecision: (id: string, body: Record<string, unknown>) => void;
  onBindRates?: () => void;
  onExcludeHelpers?: () => void;
  onAcceptAllDrafts?: () => void;
  onManual: (structureId: string, body: Record<string, unknown>) => void;
  onCalculate: () => void;
}) {
  const [manual, setManual] = useState({ structureId: bundle.structures[0]?.id || '', quantity: '', reason: '', catalogueItemId: '', description: '', unit: '', itemNumber: '', rate: '' });
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ id: string; itemNumber: string; description: string; unit: string; rate: number }[]>([]);
  const [searchNote, setSearchNote] = useState('');
  const unmapped = bundle.blocks.filter((block) => block.status !== 'EXCLUDED' && block.rateMatch !== 'UNIQUE' && block.rateMatch !== 'MANUAL');
  const hasEknathLines = bundle.blocks.some((block) => block.ruleId.startsWith('eknath.') && block.status !== 'EXCLUDED');
  // Only treat leftover draft.* as helpers when an Eknath sheet is present (ordinary cases ARE draft.*).
  const helpers = hasEknathLines
    ? bundle.blocks.filter((block) => block.ruleId.startsWith('draft.') && block.status !== 'EXCLUDED')
    : [];
  const search = async () => {
    const res = await api.get(`/v1/workflow/cases/${bundle.case.id}/catalogue`, { params: { q: query } });
    setResults(res.data.results || []);
    setSearchNote(res.data.reason || '');
  };
  return (
    <div className="bg-white border border-slate-200 rounded-gov-lg p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="font-bold text-gov-navy text-base">Review</h2>
        {canWrite && (
          <div className="flex flex-wrap gap-2">
            {onBindRates && (
              <button className="border border-gov-navy text-gov-navy rounded-gov-md px-3 py-2 text-sm font-semibold" onClick={onBindRates}>Bind rates</button>
            )}
            {onExcludeHelpers && helpers.length > 0 && (
              <button className="border border-amber-700 text-amber-900 rounded-gov-md px-3 py-2 text-sm font-semibold" onClick={onExcludeHelpers}>Exclude helpers ({helpers.length})</button>
            )}
            {onAcceptAllDrafts && (
              <button className="border border-gov-navy text-gov-navy rounded-gov-md px-3 py-2 text-sm font-semibold" onClick={onAcceptAllDrafts}>Accept all drafts</button>
            )}
            <button className="bg-gov-navy text-white rounded-gov-md px-3 py-2 text-sm font-semibold" onClick={onCalculate}>Prepare abstract</button>
          </div>
        )}
      </div>
      {!bundle.case.rateScheduleVersionId && (
        <div className="rounded-gov-md bg-amber-50 text-amber-950 text-sm px-4 py-3">
          Pin a rate schedule on Screen 1, then bind rates here.
        </div>
      )}
      {bundle.case.rateScheduleVersionId && unmapped.length > 0 && (
        <div className="rounded-gov-md bg-amber-50 text-amber-950 text-sm px-4 py-3">
          {unmapped.length} line(s) still need rates.
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-slate-500"><th className="pb-2">Line</th><th>Qty</th><th>Status</th><th>Rate</th><th>Actions</th></tr></thead>
          <tbody>
            {bundle.blocks.map((block) => (
              <ReviewRow key={block.id} block={block} canWrite={canWrite} onDecision={onDecision} />
            ))}
          </tbody>
        </table>
      </div>
      {bundle.blocks.length === 0 && <p className="text-sm text-slate-500">No measurement lines yet. Generate them on Screen 3.</p>}
      {canWrite && (
        <details className="text-sm border border-slate-200 rounded-gov-md p-3">
          <summary className="font-semibold cursor-pointer">Add measured item</summary>
          <div className="mt-3 space-y-3">
            <div className="flex gap-2">
              <input className="border border-slate-200 rounded-gov-sm px-3 py-2 flex-1" placeholder="Search catalogue" value={query} onChange={(e) => setQuery(e.target.value)} />
              <button className="border border-slate-200 rounded-gov-md px-3 py-2" onClick={() => search().catch(() => setSearchNote('Search failed.'))}>Search</button>
            </div>
            {searchNote && <p className="text-slate-600">{searchNote}</p>}
            <ul className="space-y-2">
              {results.map((item) => (
                <li key={item.id} className="border border-slate-200 rounded-gov-md p-2 flex justify-between gap-3">
                  <div>
                    <div className="font-semibold">{item.description}</div>
                    <div className="text-xs text-slate-500">{item.itemNumber} · {item.unit} · ₹{item.rate}</div>
                  </div>
                  <button className="text-gov-navy font-semibold" onClick={() => setManual({ ...manual, catalogueItemId: item.id, description: item.description, unit: item.unit, itemNumber: item.itemNumber, rate: String(item.rate) })}>Select</button>
                </li>
              ))}
            </ul>
            {manual.catalogueItemId && (
              <form className="grid md:grid-cols-4 gap-2" onSubmit={(event) => {
                event.preventDefault();
                const quantity = Number(manual.quantity);
                if (!manual.structureId || !(quantity > 0) || !manual.reason.trim()) return;
                onManual(manual.structureId, { catalogueItemId: manual.catalogueItemId, quantity, reason: manual.reason.trim() });
                setManual((current) => ({ ...current, quantity: '', reason: '', catalogueItemId: '', description: '', unit: '', itemNumber: '', rate: '' }));
              }}>
                <p className="md:col-span-4 text-slate-700">{manual.description} <span className="text-xs text-slate-500">({manual.itemNumber} · {manual.unit} · ₹{manual.rate})</span></p>
                <select className="border border-slate-200 rounded-gov-sm px-3 py-2" value={manual.structureId} onChange={(e) => setManual({ ...manual, structureId: e.target.value })}>
                  {bundle.structures.map((structure) => <option key={structure.id} value={structure.id}>{structure.name}</option>)}
                </select>
                <input className="border border-slate-200 rounded-gov-sm px-3 py-2" inputMode="decimal" placeholder={`Qty (${manual.unit})`} value={manual.quantity} onChange={(e) => { const next = e.target.value.replace(/,/g, '.'); if (next === '' || /^\d*\.?\d*$/.test(next)) setManual({ ...manual, quantity: next }); }} />
                <input className="border border-slate-200 rounded-gov-sm px-3 py-2" placeholder="Measurement note" value={manual.reason} onChange={(e) => setManual({ ...manual, reason: e.target.value })} />
                <button className="bg-gov-navy text-white rounded-gov-md px-3 py-2 font-semibold">Add line</button>
              </form>
            )}
          </div>
        </details>
      )}
    </div>
  );
}

function statusLabel(status: string): string {
  if (status === 'MANUAL') return 'Measured';
  if (status === 'ACCEPTED') return 'Accepted';
  if (status === 'OVERRIDDEN') return 'Overridden';
  if (status === 'EXCLUDED') return 'Excluded';
  if (status === 'DRAFT') return 'Draft';
  if (status === 'REQUIRES_REVIEW') return 'Needs review';
  return status.split('_').join(' ');
}

function ReviewRow({ block, canWrite, onDecision }: {
  block: BlockRow;
  canWrite: boolean;
  onDecision: (id: string, body: Record<string, unknown>) => void;
}) {
  const [reason, setReason] = useState('');
  const [overrideNet, setOverrideNet] = useState(block.engineerNet?.toString() || block.derivedNet?.toString() || '');
  const qty = block.engineerNet ?? block.derivedNet;
  return (
    <tr className="border-t align-top">
      <td className="py-3 pr-3">
        <div className="font-medium text-slate-900">{block.title}</div>
        <div className="text-xs text-slate-400 mt-0.5">{block.formulaText}</div>
      </td>
      <td className="py-3 whitespace-nowrap">{qty ?? '—'} {block.unit}</td>
      <td className="py-3">{statusLabel(block.status)}</td>
      <td className="py-3 text-xs">{block.rateItemId ? 'Bound' : block.rateMatch === 'AMBIGUOUS' ? 'Ambiguous' : 'Missing'}</td>
      <td className="py-3">
        {canWrite && block.status !== 'EXCLUDED' && (
          <div className="flex flex-wrap gap-1.5 items-center">
            {block.status !== 'ACCEPTED' && (
              <button className="text-gov-navy font-semibold text-xs" onClick={() => onDecision(block.id, { action: 'ACCEPT' })}>Accept</button>
            )}
            <input className="border border-slate-200 rounded px-1.5 py-1 w-20 text-xs" inputMode="decimal" aria-label="Override quantity" placeholder="Qty" value={overrideNet} onChange={(e) => { const next = e.target.value.replace(/,/g, '.'); if (next === '' || /^\d*\.?\d*$/.test(next)) setOverrideNet(next); }} />
            <input className="border border-slate-200 rounded px-1.5 py-1 w-28 text-xs" aria-label="Override reason" placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
            <button className="text-xs text-slate-700" onClick={() => onDecision(block.id, { action: 'OVERRIDE', reason, overrideNet: Number(overrideNet) })}>Override</button>
            <button className="text-xs text-red-700" onClick={() => onDecision(block.id, { action: 'EXCLUDE', reason })}>Exclude</button>
            <button className="text-xs text-slate-500" onClick={() => onDecision(block.id, { action: 'RESET' })}>Reset</button>
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
  const schedule = bundle.rateScheduleVersions.find((version) => version.id === bundle.case.rateScheduleVersionId)?.versionLabel || 'Not pinned';
  const yp = bundle.ypTables.find((table) => table.id === bundle.case.ypTableVersionId)?.name || 'Not pinned';
  return (
    <div className="bg-white border border-slate-200 rounded-gov-lg p-5 space-y-4 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="font-bold text-gov-navy text-base">Depreciation and finalize</h2>
        <div className="flex flex-wrap gap-2">
          {canWrite && <button className="border border-slate-200 rounded-gov-md px-3 py-2" onClick={onCalculate}>Recalculate</button>}
          {canWrite && <button className="border border-slate-200 rounded-gov-md px-3 py-2" onClick={onAcceptDep}>Accept depreciation</button>}
          {canFinalize && latest && latest.status !== 'FINALIZED' && (
            <button className="bg-gov-navy text-white rounded-gov-md px-4 py-2 font-semibold" onClick={() => onFinalize(latest.id)}>Finalize</button>
          )}
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-3 text-xs">
        <div className="rounded-gov-md bg-slate-50 border border-slate-200 px-3 py-2"><div className="text-slate-500">Owner</div><div className="font-semibold text-slate-900 mt-0.5">{bundle.property?.ownerName || '—'}</div></div>
        <div className="rounded-gov-md bg-slate-50 border border-slate-200 px-3 py-2"><div className="text-slate-500">Rate schedule</div><div className="font-semibold text-slate-900 mt-0.5">{schedule}</div></div>
        <div className="rounded-gov-md bg-slate-50 border border-slate-200 px-3 py-2"><div className="text-slate-500">YP table</div><div className="font-semibold text-slate-900 mt-0.5">{yp}</div></div>
      </div>
      {latest ? (
        <>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="rounded-gov-md border border-slate-200 px-4 py-3">
              <div className="text-xs text-slate-500">Present cost</div>
              <div className="text-xl font-bold text-slate-900 mt-1">{latest.presentCost ?? 'Blocked'}</div>
            </div>
            <div className="rounded-gov-md border border-slate-200 px-4 py-3">
              <div className="text-xs text-slate-500">Depreciated value</div>
              <div className="text-xl font-bold text-slate-900 mt-1">{latest.depreciatedValue ?? 'Blocked'}</div>
            </div>
          </div>
          {latest.body?.abstract && latest.body.abstract.length > 0 && (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-slate-500"><th className="pb-2">Item</th><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
              <tbody>
                {latest.body.abstract.map((line) => (
                  <tr key={`${line.itemNumber}-${line.title}`} className="border-t">
                    <td className="py-1.5">{line.itemNumber || '—'}</td>
                    <td>{line.title}</td>
                    <td>{line.quantity} {line.unit}</td>
                    <td>{line.rate ?? '—'}</td>
                    <td>{line.amount ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="text-xs text-slate-500">{latest.depreciationFormula} · {latest.status}{latest.finalizedAt ? ` · ${latest.finalizedAt}` : ''}</p>
          {latest.blockers.length > 0 && (
            <ul className="list-disc pl-5 text-red-800">{latest.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>
          )}
        </>
      ) : <p className="text-slate-500">Prepare the abstract on Screen 4 first.</p>}
      {!canFinalize && <p className="text-xs text-slate-500">Only an administrator can finalize.</p>}
    </div>
  );
}

async function downloadSnapshot(snapshotId: string, kind: 'pdf' | 'xls') {
  const res = await api.get(`/v1/workflow/snapshots/${snapshotId}/${kind}`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = kind === 'pdf' ? `Valuation_Report_${snapshotId}.pdf` : `Valuation_Workbook_${snapshotId}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}

function DocumentsScreen({ bundle, onReplay, canWrite }: { bundle: Bundle; onReplay: () => void; canWrite: boolean }) {
  const finalized = [...bundle.snapshots].reverse().find((snapshot) => snapshot.status === 'FINALIZED' && snapshot.label === 'PLATFORM')
    || [...bundle.snapshots].reverse().find((snapshot) => snapshot.status === 'FINALIZED');
  return (
    <div className="bg-white border border-slate-200 rounded-gov-lg p-5 space-y-4 text-sm">
      <h2 className="font-bold text-gov-navy text-base">Documents</h2>
      {finalized ? (
        <div className="space-y-3">
          <div className="rounded-gov-md bg-teal-50 text-teal-950 px-4 py-3">
            Finalized · present cost {finalized.presentCost ?? '—'} · depreciated {finalized.depreciatedValue ?? '—'}
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="bg-gov-navy text-white rounded-gov-md px-4 py-2 text-sm font-semibold" onClick={() => downloadSnapshot(finalized.id, 'pdf')}>
              Download PDF
            </button>
            <button className="border border-gov-navy text-gov-navy rounded-gov-md px-4 py-2 text-sm font-semibold" onClick={() => downloadSnapshot(finalized.id, 'xls')}>
              Download Excel
            </button>
          </div>
        </div>
      ) : (
        <p className="rounded-gov-md bg-amber-50 text-amber-950 px-4 py-3">
          Finalize on Screen 5 to unlock PDF and Excel downloads.
        </p>
      )}
      {canWrite && (
        <details className="text-xs text-slate-500">
          <summary className="cursor-pointer">Advanced</summary>
          <button className="mt-2 border border-slate-200 rounded-gov-md px-3 py-2" onClick={onReplay}>Run source replay fixture</button>
        </details>
      )}
    </div>
  );
}
