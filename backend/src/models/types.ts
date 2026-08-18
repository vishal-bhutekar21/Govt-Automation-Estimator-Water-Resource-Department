export type UserRole = 'ADMIN' | 'ESTIMATOR' | 'VIEWER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department: string;
  designation: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

export type CaseStatus =
  | 'DRAFT'
  | 'MEASUREMENT_IN_PROGRESS'
  | 'ESTIMATE_IN_PROGRESS'
  | 'DEPRECIATION_IN_PROGRESS'
  | 'SALVAGE_IN_PROGRESS'
  | 'REVIEW'
  | 'APPROVED'
  | 'COMPLETED'
  | 'ARCHIVED';

export interface Project {
  id: string;
  projectCode: string;
  projectName: string;
  department: string;
  division: string;
  subDivision: string;
  district: string;
  taluka: string;
  description: string;
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
}

export interface ValuationCase {
  id: string;
  caseNumber: string;
  projectId: string;
  status: CaseStatus;
  dateOfInspection: string;
  valuationDate: string;
  preparedBy: string;
  checkedBy: string;
  approvedBy: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyDetails {
  id: string;
  caseId: string;
  ownerName: string;
  contactNumber: string;
  address: string;
  village: string;
  taluka: string;
  district: string;
  laCaseNumber: string;
  houseNumber: string;
  surveyNumber: string;
  submergenceType: string;
  additionalNotes: string;
  updatedAt: string;
}

export interface StructureDetails {
  id: string;
  caseId: string;
  structureType: string;
  constructionType: string;
  yearOfConstruction: number;
  totalUsefulLife: number; // e.g. 45
  presentLife: number; // e.g. 4
  futureLife: number; // e.g. 41
  roofType: string;
  wallType: string;
  floorType: string;
  numberOfRooms: number;
  builtUpArea: number; // Sqm
  plinthArea: number; // Sqm
  additionalNotes: string;
  updatedAt: string;
}

export type CalculationType = 'VOLUME' | 'AREA' | 'RUNNING_LENGTH' | 'COUNT';

export interface MeasurementDeduction {
  id: string;
  measurementItemId: string;
  code: string; // e.g., 'D1', 'W1'
  description: string; // e.g., 'Door Deduction'
  numberCount: number;
  length: number;
  breadth: number;
  depthOrHeight: number;
  deductionQuantity: number;
  unit: string;
  notes?: string;
}

export interface MeasurementItem {
  id: string;
  groupId: string;
  caseId: string;
  itemSequence: number;
  itemSubSequence: string; // 'a', 'b', 'c' or '1', '2'
  description: string; // e.g., 'Long Wall', 'Short Wall'
  calculationType: CalculationType;
  numberCount: number;
  length: number;
  breadth: number;
  depthOrHeight: number;
  grossQuantity: number;
  deductionQuantity: number;
  netQuantity: number;
  unit: string;
  notes?: string;
  deductions: MeasurementDeduction[];
}

export interface MeasurementGroup {
  id: string;
  caseId: string;
  itemNumber: number; // 1, 2, ... 18
  title: string; // e.g. "Excavation for foundation"
  unit: string;
  totalQuantity: number;
  rateItemId?: string; // Linked CSR rate item
  items: MeasurementItem[];
}

export interface RateSchedule {
  id: string;
  scheduleName: string; // e.g., 'PWD CSR', 'WRD CSR'
  scheduleYear: string; // e.g., '2014-15'
  department: string;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
}

export interface RateItem {
  id: string;
  scheduleId: string;
  itemCode: string; // e.g. "CSR-14-15-72"
  itemNumber: string; // e.g. "Item 72"
  description: string;
  unit: string; // Cum, Sqm, Rmt, No.
  rate: number;
  department: string;
  scheduleYear: string;
  referenceSource: string;
  isActive: boolean;
}

export interface EstimateItem {
  id: string;
  caseId: string;
  itemNumber: number;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  rateReference: string;
  isSalvageEligible: boolean;
  measurementGroupId?: string;
}

export interface DepreciationFactor {
  id: string;
  year: number;
  interestRate: number; // e.g. 7%
  factor: number; // e.g. 13.394 for 41y, 13.606 for 45y
  scheduleType: string;
}

export interface DepreciationCalculation {
  id: string;
  caseId: string;
  presentEstimatedCost: number; // e.g. 261669
  yearOfConstruction: number; // 2012
  valuationYear: number; // 2016
  presentLife: number; // 4
  futureLife: number; // 41
  totalLife: number; // 45
  futureLifeYpFactor: number; // 13.394
  totalLifeYpFactor: number; // 13.606
  depreciationFactor: number; // 13.394 / 13.606 = 0.9844186...
  depreciatedValue: number; // 257592.00
  formulaText: string;
  updatedAt: string;
}

export interface SalvageEstimate {
  id: string;
  caseId: string;
  selectedItemIds: string[]; // IDs of EstimateItems included
  totalSalvageAmount: number; // 192040.00
  presentLife: number; // 4
  futureLife: number; // 41
  totalLife: number; // 45
  futureLifeYpFactor: number; // 13.394
  totalLifeYpFactor: number; // 13.606
  salvageDepreciatedValue: number; // 183981.00
  adjustmentPercentage: number; // 10%
  adjustmentAmount: number; // 18398.10
  updatedAt: string;
}

export interface FinalValuation {
  id: string;
  caseId: string;
  primaryEstimateTotal: number; // 261669.00
  primaryDepreciatedValue: number; // 257592.00
  salvageEstimateTotal: number; // 192040.00
  salvageDepreciatedValue: number; // 183981.00
  adjustmentPercentage: number; // 10.00
  adjustmentAmount: number; // 18398.10
  finalValuationAmount: number; // 239193.90
  calculationVersion: number;
  status: 'DRAFT' | 'FINALIZED' | 'APPROVED';
  updatedAt: string;
}

export interface DocumentRecord {
  id: string;
  caseId: string;
  fileName: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  storagePath: string;
  documentType: 'PHOTOGRAPH' | 'PANCHANAMA' | 'DRAWING' | 'OWNERSHIP' | 'PREVIOUS_ESTIMATE' | 'OTHER';
  description: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface AuditLog {
  id: string;
  caseId?: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
  timestamp: string;
}

export interface CalculationVersion {
  id: string;
  caseId: string;
  versionNumber: number;
  calculationTimestamp: string;
  calculatedBy: string;
  primaryEstimateTotal: number;
  primaryDepreciatedValue: number;
  salvageEstimateTotal: number;
  salvageDepreciatedValue: number;
  adjustmentAmount: number;
  finalValuationAmount: number;
  snapshotJson: string;
}

export interface PanchaWitness {
  id?: string;
  name: string;
  address: string;
  occupation?: string;
  age?: number;
  isSigned?: boolean;
  signaturePresent?: boolean;
}

export interface InspectionOfficer {
  designation: string;
  name?: string;
  department?: string;
  isSigned?: boolean;
}

export interface PanchanamaDetails {
  id: string;
  caseId: string;
  inspectionDate?: string;
  dateOfInspection?: string;
  village?: string;
  taluka?: string;
  district?: string;
  jointInspectionOfficers: (InspectionOfficer | string)[];
  panchas: PanchaWitness[];
  ownerPresent?: boolean;
  remarks?: string;
  generalRemarks?: string;
  structuralCondition?: string;
  updatedAt: string;
}

export interface EvidencePhoto {
  id: string;
  caseId: string;
  title: string;
  description: string;
  category: 'FRONT_ELEVATION' | 'ROOF_STRUCTURE' | 'INTERIOR_ROOM' | 'DOORS_WINDOWS' | 'CRACKS_DAMAGE' | 'OTHER';
  photoUrl: string;
  capturedAt: string;
}

