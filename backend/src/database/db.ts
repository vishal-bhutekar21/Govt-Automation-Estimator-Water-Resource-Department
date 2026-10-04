import fs from 'fs';
import path from 'path';
import {
  User,
  Project,
  ValuationCase,
  PropertyDetails,
  StructureDetails,
  RateSchedule,
  RateItem,
  DepreciationFactor,
  MeasurementGroup,
  EstimateItem,
  DepreciationCalculation,
  SalvageEstimate,
  FinalValuation,
  DocumentRecord,
  AuditLog,
  CalculationVersion,
  PanchanamaDetails,
  EvidencePhoto,
} from '../models/types';
import {
  BuildingStructure,
  CaseEvidenceRecord,
  CatalogueItemRecord,
  CalculationSnapshotRecord,
  DepreciationDecision,
  MeasurementBlockFact,
  MemberFact,
  OpeningFact,
  RateScheduleVersionRecord,
  RoomFact,
  WallRunFact,
  YpTableVersionRecord,
} from '../workflow/types';
import { ensureGut193GuideCatalog } from './workflowSeedCatalog';
import {
  getSyncSeedUsers,
  getSeedUsers,
  seedProjects,
  seedCases,
  seedProperties,
  seedStructures,
  seedRateSchedules,
  seedRateItems,
  seedYpFactors,
  seedMeasurementGroups,
  seedEstimateItems,
  seedDepreciationCalculation,
  seedSalvageEstimate,
  seedFinalValuation,
  seedAuditLogs,
} from './seedData';

interface DatabaseSchema {
  users: User[];
  projects: Project[];
  cases: ValuationCase[];
  properties: PropertyDetails[];
  structures: StructureDetails[];
  rateSchedules: RateSchedule[];
  rateItems: RateItem[];
  depreciationFactors: DepreciationFactor[];
  measurementGroups: MeasurementGroup[];
  estimateItems: EstimateItem[];
  depreciationCalculations: DepreciationCalculation[];
  salvageEstimates: SalvageEstimate[];
  finalValuations: FinalValuation[];
  documents: DocumentRecord[];
  auditLogs: AuditLog[];
  calculationVersions: CalculationVersion[];
  panchanamaRecords?: PanchanamaDetails[];
  evidencePhotos?: EvidencePhoto[];
  buildingStructures?: BuildingStructure[];
  rooms?: RoomFact[];
  wallRuns?: WallRunFact[];
  openings?: OpeningFact[];
  members?: MemberFact[];
  measurementBlocks?: MeasurementBlockFact[];
  caseEvidence?: CaseEvidenceRecord[];
  rateScheduleVersions?: RateScheduleVersionRecord[];
  catalogueItems?: CatalogueItemRecord[];
  ypTables?: YpTableVersionRecord[];
  calculationSnapshots?: CalculationSnapshotRecord[];
  depreciationDecisions?: DepreciationDecision[];
  legacyCatalogCopied?: boolean;
}

/** Override on Render with a persistent disk mount, e.g. VALUATION_DB_DIR=/var/data */
const DB_DIR = path.resolve(process.env.VALUATION_DB_DIR || path.join(__dirname, '../../data'));
const DB_FILE = path.join(DB_DIR, 'db.json');

class DatabaseManager {
  // Pre-seed in memory so data is ALWAYS present, even on read-only serverless runtimes
  private data: DatabaseSchema = {
    users: getSyncSeedUsers(),
    projects: [...seedProjects],
    cases: [...seedCases],
    properties: [...seedProperties],
    structures: [...seedStructures],
    rateSchedules: [...seedRateSchedules],
    rateItems: [...seedRateItems],
    depreciationFactors: [...seedYpFactors],
    measurementGroups: [...seedMeasurementGroups],
    estimateItems: [...seedEstimateItems],
    depreciationCalculations: [{ ...seedDepreciationCalculation }],
    salvageEstimates: [{ ...seedSalvageEstimate }],
    finalValuations: [{ ...seedFinalValuation }],
    documents: [],
    auditLogs: [...seedAuditLogs],
    calculationVersions: [],
  };

  private isInitialized = false;

  init(): void {
    if (this.isInitialized) return;

    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.cases) && parsed.cases.length > 0) {
          this.data = parsed;
          this.ensureWorkflowCollections();
          console.log('📦 Database loaded from disk:', DB_FILE);
        }
      }
    } catch (err) {
      console.warn('Note: Running with default in-memory dataset:', err);
    }

    this.ensureWorkflowCollections();
    this.isInitialized = true;
  }

  ensureWorkflowCollections(): void {
    const data = this.data;
    data.buildingStructures = data.buildingStructures || [];
    data.rooms = data.rooms || [];
    data.wallRuns = data.wallRuns || [];
    data.openings = data.openings || [];
    data.members = data.members || [];
    data.measurementBlocks = data.measurementBlocks || [];
    data.caseEvidence = data.caseEvidence || [];
    data.rateScheduleVersions = data.rateScheduleVersions || [];
    data.catalogueItems = data.catalogueItems || [];
    data.ypTables = data.ypTables || [];
    data.calculationSnapshots = data.calculationSnapshots || [];
    data.depreciationDecisions = data.depreciationDecisions || [];
    if (!data.legacyCatalogCopied) {
      const scheduleId = 'rate-pwd-csr-2014-15-seed';
      if (!data.rateScheduleVersions!.some((row) => row.id === scheduleId)) {
        data.rateScheduleVersions!.push({
          id: scheduleId,
          name: 'PWD CSR seed',
          authority: 'Repository seed',
          versionLabel: 'PWD-CSR-2014-15-SEED',
          effectiveFrom: null,
          effectiveTo: null,
          sourceDocument: 'backend/src/database/seedData.ts',
          importedAt: new Date().toISOString(),
          legacy: true,
        });
        for (const item of data.rateItems) {
          data.catalogueItems!.push({
            id: `cat-${item.id}`,
            scheduleVersionId: scheduleId,
            itemNumber: String(item.itemNumber),
            description: item.description,
            unit: item.unit,
            rate: item.rate,
            sourceRow: item.itemCode,
            reference: item.referenceSource,
          });
        }
      }
      const ypId = 'yp-legacy-seed';
      if (!data.ypTables!.some((row) => row.id === ypId)) {
        data.ypTables!.push({
          id: ypId,
          name: 'Legacy software Year’s Purchase rows',
          citation: 'Copied from the existing depreciationFactors seed. Not the default for a new case.',
          legacy: true,
          rows: data.depreciationFactors.map((factor) => ({ year: factor.year, factor: factor.factor })),
        });
      }
      data.legacyCatalogCopied = true;
    }
    // Always ensure Gut-193 guide schedule + YP exist (local disk DB and Vercel in-memory).
    ensureGut193GuideCatalog({
      rateScheduleVersions: data.rateScheduleVersions!,
      catalogueItems: data.catalogueItems!,
      ypTables: data.ypTables!,
    });
  }

  async seed(): Promise<void> {
    const seedUsers = await getSeedUsers();
    this.data = {
      users: seedUsers,
      projects: [...seedProjects],
      cases: [...seedCases],
      properties: [...seedProperties],
      structures: [...seedStructures],
      rateSchedules: [...seedRateSchedules],
      rateItems: [...seedRateItems],
      depreciationFactors: [...seedYpFactors],
      measurementGroups: [...seedMeasurementGroups],
      estimateItems: [...seedEstimateItems],
      depreciationCalculations: [{ ...seedDepreciationCalculation }],
      salvageEstimates: [{ ...seedSalvageEstimate }],
      finalValuations: [{ ...seedFinalValuation }],
      documents: [],
      auditLogs: [...seedAuditLogs],
      calculationVersions: [],
    };
    this.ensureWorkflowCollections();
    this.save();
    console.log('🌱 Seed database initialized with Golden Sample Case (Mohan Vishwanath Gai).');
  }

  save(): void {
    if (process.env.VALUATION_DB_READONLY === '1') return;
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      // Free/ephemeral hosts lose writes across restarts; prefer VALUATION_DB_DIR on a Render disk.
      console.warn('Database save failed (in-memory only until restart):', DB_FILE, err);
    }
  }

  // Getters
  get users() { return this.data.users; }
  get projects() { return this.data.projects; }
  get cases() { return this.data.cases; }
  get properties() { return this.data.properties; }
  get structures() { return this.data.structures; }
  get rateSchedules() { return this.data.rateSchedules; }
  get rateItems() { return this.data.rateItems; }
  get depreciationFactors() { return this.data.depreciationFactors; }
  get measurementGroups() { return this.data.measurementGroups; }
  get estimateItems() { return this.data.estimateItems; }
  get depreciationCalculations() { return this.data.depreciationCalculations; }
  get salvageEstimates() { return this.data.salvageEstimates; }
  get finalValuations() { return this.data.finalValuations; }
  get documents() { return this.data.documents; }
  get auditLogs() { return this.data.auditLogs; }
  get calculationVersions() { return this.data.calculationVersions; }
  get panchanamaRecords() { return this.data.panchanamaRecords; }
  set panchanamaRecords(records) { this.data.panchanamaRecords = records; }
  get evidencePhotos() { return this.data.evidencePhotos; }
  set evidencePhotos(photos) { this.data.evidencePhotos = photos; }
  get buildingStructures() { return this.data.buildingStructures || []; }
  get rooms() { return this.data.rooms || []; }
  get wallRuns() { return this.data.wallRuns || []; }
  get openings() { return this.data.openings || []; }
  get members() { return this.data.members || []; }
  get measurementBlocks() { return this.data.measurementBlocks || []; }
  get caseEvidence() { return this.data.caseEvidence || []; }
  get rateScheduleVersions() { return this.data.rateScheduleVersions || []; }
  get catalogueItems() { return this.data.catalogueItems || []; }
  get ypTables() { return this.data.ypTables || []; }
  get calculationSnapshots() { return this.data.calculationSnapshots || []; }
  get depreciationDecisions() { return this.data.depreciationDecisions || []; }
}

export const db = new DatabaseManager();
