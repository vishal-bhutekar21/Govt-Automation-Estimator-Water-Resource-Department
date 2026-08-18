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
}

const DB_DIR = path.resolve(__dirname, '../../data');
const DB_FILE = path.join(DB_DIR, 'db.json');

class DatabaseManager {
  private data: DatabaseSchema = {
    users: [],
    projects: [],
    cases: [],
    properties: [],
    structures: [],
    rateSchedules: [],
    rateItems: [],
    depreciationFactors: [],
    measurementGroups: [],
    estimateItems: [],
    depreciationCalculations: [],
    salvageEstimates: [],
    finalValuations: [],
    documents: [],
    auditLogs: [],
    calculationVersions: [],
  };

  private isInitialized = false;

  async init(): Promise<void> {
    if (this.isInitialized) return;

    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        console.log('📦 Database loaded from disk:', DB_FILE);
      } catch (err) {
        console.error('Error reading database file, re-initializing seed data:', err);
        await this.seed();
      }
    } else {
      await this.seed();
    }

    this.isInitialized = true;
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
      depreciationCalculations: [seedDepreciationCalculation],
      salvageEstimates: [seedSalvageEstimate],
      finalValuations: [seedFinalValuation],
      documents: [],
      auditLogs: [...seedAuditLogs],
      calculationVersions: [],
    };
    this.save();
    console.log('🌱 Seed database successfully created with Golden Sample Case (Mohan Vishwanath Gai).');
  }

  save(): void {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist database:', err);
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
}

export const db = new DatabaseManager();
