import {
  DriveEligibilityCheckCriteria,
  ErpFormat,
  ErpImportSummary,
  ErpImportValidationResult,
  ErpStudentRow,
} from "./types";

/**
 * Normalizes phone numbers to standard Indian format (+91XXXXXXXXXX) or plain 10-digit format.
 */
export function normalizeIndianPhone(rawPhone?: string): string | undefined {
  if (!rawPhone) return undefined;
  const cleaned = rawPhone.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+91") && cleaned.length === 13) return cleaned;
  if (cleaned.startsWith("91") && cleaned.length === 12) return `+${cleaned}`;
  if (cleaned.length === 10) return `+91${cleaned}`;
  return cleaned || undefined;
}

/**
 * Normalizes CGPA / percentage to standard 0-10 scale.
 */
export function normalizeCgpa(rawValue: string | number): number {
  const num = typeof rawValue === "number" ? rawValue : parseFloat(rawValue.replace(/%/g, "").trim());
  if (isNaN(num)) return 0;
  if (num > 10 && num <= 100) {
    // If entered as percentage, convert to 10 scale (approx / 10)
    return Math.round((num / 10) * 100) / 100;
  }
  return Math.min(10, Math.max(0, Math.round(num * 100) / 100));
}

/**
 * Detects ERP file format based on presence of signature header columns.
 */
export function detectErpFormat(headers: string[]): ErpFormat {
  const lowerHeaders = headers.map((h) => h.toLowerCase().trim());
  const headerString = lowerHeaders.join(" ");

  if (headerString.includes("candidate id") || headerString.includes("passout year") || headerString.includes("degree percentage")) {
    return "superset";
  }
  if (headerString.includes("registration number") || headerString.includes("programme") || headerString.includes("current cgpa")) {
    return "camu";
  }
  if (headerString.includes("student_id") || headerString.includes("passing_year") || headerString.includes("sgpa_cgpa")) {
    return "mastersoft";
  }
  return "generic_csv";
}

/**
 * Maps CSV header row to indices for standard fields.
 */
function findColumnIndex(headers: string[], aliases: string[]): number {
  const lowerHeaders = headers.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
  for (const alias of aliases) {
    const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, "");
    const idx = lowerHeaders.indexOf(cleanAlias);
    if (idx !== -1) return idx;
    // Partial substring fallback
    const partialIdx = lowerHeaders.findIndex((h) => h.includes(cleanAlias));
    if (partialIdx !== -1) return partialIdx;
  }
  return -1;
}

/**
 * Parses a single CSV line accounting for quotes.
 */
export function parseCsvLine(line: string, delimiter: string = ","): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim().replace(/^["']|["']$/g, ""));
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^["']|["']$/g, ""));
  return result;
}

/**
 * Parses and validates raw CSV content exported from Superset, Camu, MasterSoft, or generic spreadsheets.
 */
export function parseErpCsv(
  csvContent: string,
  eligibilityCriteria?: DriveEligibilityCheckCriteria
): ErpImportSummary {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return {
      formatDetected: "generic_csv",
      totalRowsProcessed: 0,
      validRowsCount: 0,
      invalidRowsCount: 0,
      departmentBreakdown: {},
      validationResults: [],
      validStudents: [],
    };
  }

  // Detect delimiter (comma vs tab vs semicolon)
  const firstLine = lines[0];
  const delimiter = firstLine.includes("\t") ? "\t" : firstLine.includes(";") ? ";" : ",";
  const rawHeaders = parseCsvLine(firstLine, delimiter);
  const formatDetected = detectErpFormat(rawHeaders);

  // Column index resolvers
  const rollIdx = findColumnIndex(rawHeaders, [
    "rollno",
    "rollnumber",
    "usn",
    "candidateid",
    "registrationnumber",
    "studentid",
    "regno",
  ]);
  const nameIdx = findColumnIndex(rawHeaders, ["fullname", "name", "studentname"]);
  const emailIdx = findColumnIndex(rawHeaders, ["email", "emailaddress", "primaryemail", "emailid"]);
  const phoneIdx = findColumnIndex(rawHeaders, ["phone", "phonenumber", "mobile", "mobilenumber", "contactno"]);
  const deptIdx = findColumnIndex(rawHeaders, ["department", "dept", "branch", "programme", "stream"]);
  const yearIdx = findColumnIndex(rawHeaders, [
    "batch",
    "batchyear",
    "passoutyear",
    "graduationyear",
    "passingyear",
    "year",
  ]);
  const cgpaIdx = findColumnIndex(rawHeaders, ["cgpa", "degreepercentage", "currentcgpa", "sgpacgpa", "percentage"]);
  const backlogsIdx = findColumnIndex(rawHeaders, [
    "activebacklogs",
    "backlogs",
    "backlogcount",
    "currentbacklogs",
    "standingarrears",
  ]);

  const validationResults: ErpImportValidationResult[] = [];
  const validStudents: ErpStudentRow[] = [];
  const departmentBreakdown: Record<string, number> = {};
  let eligibleCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    const cells = parseCsvLine(rawLine, delimiter);
    const rowNum = i + 1;
    const errors: string[] = [];
    const warnings: string[] = [];

    const rollNumber = rollIdx !== -1 && cells[rollIdx] ? cells[rollIdx] : `STU-${rowNum}`;
    const fullName = nameIdx !== -1 && cells[nameIdx] ? cells[nameIdx] : "";
    const email = emailIdx !== -1 && cells[emailIdx] ? cells[emailIdx].toLowerCase() : "";
    const rawPhone = phoneIdx !== -1 ? cells[phoneIdx] : undefined;
    const department = deptIdx !== -1 && cells[deptIdx] ? cells[deptIdx] : "General Engineering";
    const rawYear = yearIdx !== -1 && cells[yearIdx] ? parseInt(cells[yearIdx].replace(/[^\d]/g, ""), 10) : new Date().getFullYear();
    const rawCgpa = cgpaIdx !== -1 && cells[cgpaIdx] ? cells[cgpaIdx] : "7.0";
    const rawBacklogs = backlogsIdx !== -1 && cells[backlogsIdx] ? parseInt(cells[backlogsIdx].replace(/[^\d]/g, ""), 10) : 0;

    if (!fullName) {
      errors.push("Missing student full name");
    }

    if (!email || !email.includes("@")) {
      errors.push(`Invalid email address: '${email}'`);
    }

    const cgpa = normalizeCgpa(rawCgpa);
    if (cgpa <= 0) {
      warnings.push(`CGPA could not be parsed reliably (value: '${rawCgpa}'); defaulted to 0.0`);
    }

    const normalizedPhone = normalizeIndianPhone(rawPhone);
    const backlogs = isNaN(rawBacklogs) ? 0 : rawBacklogs;
    const batchYear = isNaN(rawYear) || rawYear < 2020 || rawYear > 2035 ? new Date().getFullYear() : rawYear;

    const isValid = errors.length === 0;

    const parsedRecord: ErpStudentRow | undefined = isValid
      ? {
          rollNumber,
          fullName,
          email,
          phone: normalizedPhone,
          department,
          batchYear,
          cgpa,
          activeBacklogs: backlogs,
        }
      : undefined;

    if (parsedRecord) {
      validStudents.push(parsedRecord);
      departmentBreakdown[department] = (departmentBreakdown[department] || 0) + 1;

      // Check eligibility if criteria passed
      if (eligibilityCriteria) {
        const isEligibleCgpa = parsedRecord.cgpa >= eligibilityCriteria.minCgpa;
        const isEligibleBacklogs = parsedRecord.activeBacklogs <= eligibilityCriteria.maxActiveBacklogs;
        const isEligibleDept =
          !eligibilityCriteria.allowedDepartments ||
          eligibilityCriteria.allowedDepartments.length === 0 ||
          eligibilityCriteria.allowedDepartments.some((d) =>
            parsedRecord.department.toLowerCase().includes(d.toLowerCase())
          );
        const isEligibleYear =
          !eligibilityCriteria.targetBatchYears ||
          eligibilityCriteria.targetBatchYears.length === 0 ||
          eligibilityCriteria.targetBatchYears.includes(parsedRecord.batchYear);

        if (isEligibleCgpa && isEligibleBacklogs && isEligibleDept && isEligibleYear) {
          eligibleCount++;
        }
      }
    }

    validationResults.push({
      rowNumber: rowNum,
      isValid,
      errors,
      warnings,
      parsedRecord,
    });
  }

  return {
    formatDetected,
    totalRowsProcessed: lines.length - 1,
    validRowsCount: validStudents.length,
    invalidRowsCount: lines.length - 1 - validStudents.length,
    departmentBreakdown,
    eligibleForDriveCount: eligibilityCriteria ? eligibleCount : undefined,
    validationResults,
    validStudents,
  };
}
