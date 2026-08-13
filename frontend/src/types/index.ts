export type UserRole = 'ADMIN' | 'ESTIMATOR' | 'CHECKER' | 'VIEWER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department: string;
  designation?: string;
  createdAt: string;
  updatedAt: string;
}

export type CaseStatus = 'DRAFT' | 'CALCULATED' | 'CHECKED' | 'APPROVED' | 'REJECTED';

export interface Project {
  id: string;
  projectCode: string;
  projectName: string;
  department: string;
  division: string;
  subDivision: string;
  district: string;
  taluka: string;
  description?: string;
  status: 'ACTIVE' | 'ARCHIVED';
  casesCount?: number;
  totalValuationSum?: number;
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
  preparedBy?: string;
  checkedBy?: string;
  approvedBy?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyDetails {
  id: string;
  caseId: string;
  ownerName: string;
  contactNumber?: string;
  address: string;
  village: string;
  taluka: string;
  district: string;
  laCaseNumber: string;
  houseNumber: string;
  surveyNumber: string;
  submergenceType: string;
  additionalNotes?: string;
  updatedAt: string;
}

export interface StructureDetails {
  id: string;
  caseId: string;
  structureType: string;
  constructionType: string;
  yearOfConstruction: number;
  totalUsefulLife: number;
  presentLife: number;
  futureLife: number;
  roofType?: string;
  wallType?: string;
  floorType?: string;
  numberOfRooms?: number;
  builtUpArea?: number;
  plinthArea?: number;
  additionalNotes?: string;
  updatedAt: string;
}

export type CalculationType = 'VOLUME' | 'AREA' | 'RUNNING_LENGTH' | 'COUNT';

export interface MeasurementDeduction {
  id: string;
  measurementItemId: string;
  code: string;
  description: string;
  numberCount: number;
  length: number;
  breadth: number;
  depthOrHeight: number;
  deductionQuantity: number;
  unit?: string;
  notes?: string;
}

export interface MeasurementItem {
  id: string;
  groupId: string;
  caseId: string;
  itemSequence: number;
  itemSubSequence: string;
  description: string;
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
  itemNumber: number;
  title: string;
  unit: string;
  totalQuantity: number;
  rateItemId?: string;
  items: MeasurementItem[];
}

export interface RateSchedule {
  id: string;
  scheduleName: string;
  scheduleYear: string;
  department: string;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
}

export interface RateItem {
  id: string;
  scheduleId: string;
  itemCode: string;
  itemNumber: string;
  description: string;
  unit: string;
  rate: number;
  department: string;
  scheduleYear: string;
  referenceSource: string;
  isActive: boolean;
}

export interface DepreciationFactor {
  id: string;
  year: number;
  interestRate: number;
  factor: number;
  scheduleType: string;
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
  rateReference?: string;
  isSalvageEligible: boolean;
  measurementGroupId?: string;
}

export interface DepreciationCalculation {
  id: string;
  caseId: string;
  presentEstimatedCost: number;
  yearOfConstruction: number;
  valuationYear: number;
  presentLife: number;
  futureLife: number;
  totalLife: number;
  futureLifeYpFactor: number;
  totalLifeYpFactor: number;
  depreciationFactor: number;
  depreciatedValue: number;
  formulaText: string;
  updatedAt: string;
}

export interface SalvageEstimate {
  id: string;
  caseId: string;
  selectedItemIds: string[];
  totalSalvageAmount: number;
  presentLife: number;
  futureLife: number;
  totalLife: number;
  futureLifeYpFactor: number;
  totalLifeYpFactor: number;
  salvageDepreciatedValue: number;
  adjustmentPercentage: number;
  adjustmentAmount: number;
  updatedAt: string;
}

export interface FinalValuation {
  id: string;
  caseId: string;
  primaryEstimateTotal: number;
  primaryDepreciatedValue: number;
  salvageEstimateTotal: number;
  salvageDepreciatedValue: number;
  adjustmentPercentage: number;
  adjustmentAmount: number;
  finalValuationAmount: number;
  calculationVersion: number;
  status: CaseStatus;
  updatedAt: string;
}

export interface PanchanamaDetails {
  id: string;
  caseId: string;
  dateOfInspection: string;
  panchas: Array<{ name: string; address: string; isSigned: boolean }>;
  jointInspectionOfficers: string[];
  generalRemarks: string;
  structuralCondition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'DILAPIDATED';
  updatedAt: string;
}

export interface EvidencePhoto {
  id: string;
  caseId: string;
  title: string;
  category: 'FRONT_ELEVATION' | 'SUPERSTRUCTURE' | 'ROOF_STRUCTURE' | 'INTERIOR' | 'VERANDAH';
  description: string;
  photoUrl: string;
  capturedAt: string;
}

export interface AuditLog {
  id: string;
  caseId?: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  entityType: string;
  entityId: string;
  previousValue?: string;
  newValue?: string;
  ipAddress?: string;
  timestamp: string;
}
