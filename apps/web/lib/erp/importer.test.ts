import { describe, expect, it } from "vitest";
import {
  detectErpFormat,
  normalizeCgpa,
  normalizeIndianPhone,
  parseCsvLine,
  parseErpCsv,
} from "./importer";

describe("College ERP Batch Importer", () => {
  it("parses CSV lines with quotes and commas properly", () => {
    const line = '21A91A0501,"Adithya Kandikonda, Sree",adithya@example.com,"+91 98765 43210",CSE,8.8,0';
    const parsed = parseCsvLine(line);
    expect(parsed.length).toBe(7);
    expect(parsed[0]).toBe("21A91A0501");
    expect(parsed[1]).toBe("Adithya Kandikonda, Sree");
    expect(parsed[2]).toBe("adithya@example.com");
  });

  it("normalizes Indian phone numbers accurately", () => {
    expect(normalizeIndianPhone("9876543210")).toBe("+919876543210");
    expect(normalizeIndianPhone("+91 98765 43210")).toBe("+919876543210");
    expect(normalizeIndianPhone("919876543210")).toBe("+919876543210");
    expect(normalizeIndianPhone(undefined)).toBeUndefined();
  });

  it("normalizes percentage and CGPA scales", () => {
    expect(normalizeCgpa("8.45")).toBe(8.45);
    expect(normalizeCgpa("84.5%")).toBe(8.45);
    expect(normalizeCgpa("92%")).toBe(9.2);
    expect(normalizeCgpa("invalid")).toBe(0);
  });

  it("detects Superset format and parses candidate batches", () => {
    const supersetCsv = `Candidate ID,Student Name,Email Address,Mobile Number,Branch,Passout Year,Degree Percentage,Active Backlogs
SUP1001,Priya Sharma,priya.s@sasi.ac.in,9876543211,Computer Science,2026,82.5%,0
SUP1002,Rahul Varma,rahul.v@sasi.ac.in,9876543212,Information Technology,2026,7.8,1
SUP1003,Sneha Reddy,sneha.r@sasi.ac.in,9876543213,Electronics & Communication,2026,8.9,0`;

    expect(detectErpFormat(supersetCsv.split("\n")[0].split(","))).toBe("superset");

    const result = parseErpCsv(supersetCsv, {
      minCgpa: 8.0,
      maxActiveBacklogs: 0,
      allowedDepartments: ["Computer Science", "Information Technology", "Electronics"],
    });

    expect(result.formatDetected).toBe("superset");
    expect(result.totalRowsProcessed).toBe(3);
    expect(result.validRowsCount).toBe(3);
    expect(result.invalidRowsCount).toBe(0);
    // Priya (8.25 CGPA, 0 backlogs) and Sneha (8.9 CGPA, 0 backlogs) qualify; Rahul has 7.8 and 1 backlog
    expect(result.eligibleForDriveCount).toBe(2);
    expect(result.departmentBreakdown["Computer Science"]).toBe(1);
    expect(result.validStudents[0].phone).toBe("+919876543211");
  });

  it("detects Camu format and parses student records", () => {
    const camuCsv = `Registration Number,Name,Email,Mobile,Programme,Batch,Current CGPA,Backlog Count
22A91A0510,Adarsh Rao,adarsh.r@college.edu,9988776655,CSE,2026,8.6,0
22A91A0511,Bhavya K,bhavya.k@college.edu,9988776644,ECE,2026,7.2,0`;

    const result = parseErpCsv(camuCsv);
    expect(result.formatDetected).toBe("camu");
    expect(result.validRowsCount).toBe(2);
    expect(result.validStudents[0].rollNumber).toBe("22A91A0510");
  });
});
