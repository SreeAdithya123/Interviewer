/**
 * Types for College ERP Batch Import & Sync Engine.
 * Supports Superset, Camu, MasterSoft, and custom institutional CSV/TSV formats.
 */

export type ErpFormat = "superset" | "camu" | "mastersoft" | "generic_csv";

export interface ErpStudentRow {
  rollNumber: string;
  fullName: string;
  email: string;
  phone?: string;
  department: string;
  batchYear: number;
  cgpa: number;
  activeBacklogs: number;
  gender?: string;
}

export interface ErpImportValidationResult {
  rowNumber: number;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  parsedRecord?: ErpStudentRow;
}

export interface ErpImportSummary {
  formatDetected: ErpFormat;
  totalRowsProcessed: number;
  validRowsCount: number;
  invalidRowsCount: number;
  departmentBreakdown: Record<string, number>;
  eligibleForDriveCount?: number;
  validationResults: ErpImportValidationResult[];
  validStudents: ErpStudentRow[];
}

export interface DriveEligibilityCheckCriteria {
  minCgpa: number;
  maxActiveBacklogs: number;
  allowedDepartments?: string[];
  targetBatchYears?: number[];
}
