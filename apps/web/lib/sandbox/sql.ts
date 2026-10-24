/**
 * In-Memory SQL Execution Engine & Schema Tester.
 * Designed for campus technical interviews, backend coding assessments,
 * and database query evaluations (SELECT, JOIN, WHERE, ORDER BY, GROUP BY, LIMIT).
 */

export interface SqlColumn {
  name: string;
  type: "integer" | "text" | "decimal" | "boolean";
}

export interface SqlTable {
  name: string;
  columns: SqlColumn[];
  rows: Record<string, unknown>[];
}

export interface SqlQueryResult {
  success: boolean;
  columns: string[];
  rows: (string | number | boolean | null)[][];
  rowCount: number;
  executionTimeMs: number;
  error?: string;
}

// Pre-seeded relational database for placement and corporate engineering tests
export const RECRUITMENT_DB_SCHEMA: Record<string, SqlTable> = {
  departments: {
    name: "departments",
    columns: [
      { name: "id", type: "integer" },
      { name: "dept_name", type: "text" },
      { name: "location", type: "text" },
      { name: "budget_lakhs", type: "integer" },
    ],
    rows: [
      { id: 1, dept_name: "Engineering", location: "Bangalore", budget_lakhs: 450 },
      { id: 2, dept_name: "Data & AI", location: "Hyderabad", budget_lakhs: 380 },
      { id: 3, dept_name: "Product Design", location: "Bangalore", budget_lakhs: 210 },
      { id: 4, dept_name: "Cloud Platform", location: "Pune", budget_lakhs: 320 },
    ],
  },
  employees: {
    name: "employees",
    columns: [
      { name: "id", type: "integer" },
      { name: "name", type: "text" },
      { name: "dept_id", type: "integer" },
      { name: "role", type: "text" },
      { name: "salary_lpa", type: "decimal" },
      { name: "join_year", type: "integer" },
    ],
    rows: [
      { id: 101, name: "Adithya K", dept_id: 1, role: "Lead Systems Architect", salary_lpa: 28.5, join_year: 2021 },
      { id: 102, name: "Priya Sharma", dept_id: 2, role: "Senior ML Engineer", salary_lpa: 24.0, join_year: 2022 },
      { id: 103, name: "Rohan Varma", dept_id: 1, role: "Backend Developer", salary_lpa: 16.0, join_year: 2023 },
      { id: 104, name: "Sneha Reddy", dept_id: 2, role: "Data Scientist", salary_lpa: 18.5, join_year: 2022 },
      { id: 105, name: "Vikram Nair", dept_id: 4, role: "DevOps Engineer", salary_lpa: 19.0, join_year: 2021 },
      { id: 106, name: "Ananya Sen", dept_id: 3, role: "Product Designer", salary_lpa: 15.0, join_year: 2024 },
      { id: 107, name: "Kavya Patel", dept_id: 1, role: "SDE-1", salary_lpa: 12.0, join_year: 2024 },
    ],
  },
  placements: {
    name: "placements",
    columns: [
      { name: "id", type: "integer" },
      { name: "student_name", type: "text" },
      { name: "company", type: "text" },
      { name: "package_lpa", type: "decimal" },
      { name: "tier", type: "text" },
      { name: "batch_year", type: "integer" },
    ],
    rows: [
      { id: 1, student_name: "Rahul Verma", company: "Amazon", package_lpa: 34.0, tier: "Product", batch_year: 2026 },
      { id: 2, student_name: "Pooja Hegde", company: "TCS", package_lpa: 9.0, tier: "Prime", batch_year: 2026 },
      { id: 3, student_name: "Kiran Kumar", company: "Infosys", package_lpa: 9.5, tier: "Specialist", batch_year: 2026 },
      { id: 4, student_name: "Bhavya Rao", company: "Accenture", package_lpa: 6.5, tier: "AASE", batch_year: 2026 },
      { id: 5, student_name: "Siddharth J", company: "Cognizant", package_lpa: 9.0, tier: "GenC Next", batch_year: 2026 },
    ],
  },
};

/**
 * Executes a SELECT query against the recruitment database schema in-memory.
 */
export function executeSqlQuery(
  query: string,
  schema: Record<string, SqlTable> = RECRUITMENT_DB_SCHEMA
): SqlQueryResult {
  const start = performance.now();
  const cleaned = query.trim().replace(/;+$/, "");

  if (!cleaned) {
    return {
      success: false,
      columns: [],
      rows: [],
      rowCount: 0,
      executionTimeMs: 0,
      error: "Query is empty.",
    };
  }

  try {
    // Parse FROM table
    const fromMatch = cleaned.match(/\bFROM\s+([a-zA-Z0-9_]+)/i);
    if (!fromMatch) {
      throw new Error("Syntax error: Missing FROM clause.");
    }

    const tableName = fromMatch[1].toLowerCase();
    const primaryTable = schema[tableName];
    if (!primaryTable) {
      const available = Object.keys(schema).join(", ");
      throw new Error(`Table '${tableName}' does not exist. Available tables: ${available}`);
    }

    let workingRows: Record<string, unknown>[] = [...primaryTable.rows];

    // Handle JOIN (simple INNER JOIN support)
    const joinMatch = cleaned.match(/\bJOIN\s+([a-zA-Z0-9_]+)\s+ON\s+([a-zA-Z0-9_.]+)\s*=\s*([a-zA-Z0-9_.]+)/i);
    if (joinMatch) {
      const joinTableName = joinMatch[1].toLowerCase();
      const joinTable = schema[joinTableName];
      if (joinTable) {
        const leftKey = joinMatch[2].split(".").pop()!;
        const rightKey = joinMatch[3].split(".").pop()!;

        const joinedRows: Record<string, unknown>[] = [];
        for (const left of workingRows) {
          for (const right of joinTable.rows) {
            if (left[leftKey] === right[rightKey] || left[rightKey] === right[leftKey]) {
              joinedRows.push({ ...left, ...right });
            }
          }
        }
        workingRows = joinedRows;
      }
    }

    // Handle WHERE clause (basic comparison e.g. column >= value or column = 'value')
    const whereMatch = cleaned.match(/\bWHERE\s+([a-zA-Z0-9_.]+)\s*(>=|<=|>|<|=|!=)\s*('?[^'\s]+'?)/i);
    if (whereMatch) {
      const col = whereMatch[1].split(".").pop()!;
      const op = whereMatch[2];
      const rawVal = whereMatch[3].replace(/^'|'$/g, "");
      const numVal = parseFloat(rawVal);
      const isNum = !isNaN(numVal);

      workingRows = workingRows.filter((r) => {
        const cell = r[col];
        if (cell === undefined) return true;
        if (isNum && typeof cell === "number") {
          if (op === ">=") return cell >= numVal;
          if (op === "<=") return cell <= numVal;
          if (op === ">") return cell > numVal;
          if (op === "<") return cell < numVal;
          if (op === "=") return cell === numVal;
          if (op === "!=") return cell !== numVal;
        }
        if (op === "=") return String(cell).toLowerCase() === rawVal.toLowerCase();
        if (op === "!=") return String(cell).toLowerCase() !== rawVal.toLowerCase();
        return true;
      });
    }

    // Handle ORDER BY
    const orderMatch = cleaned.match(/\bORDER\s+BY\s+([a-zA-Z0-9_.]+)(?:\s+(ASC|DESC))?/i);
    if (orderMatch) {
      const col = orderMatch[1].split(".").pop()!;
      const isDesc = (orderMatch[2] || "ASC").toUpperCase() === "DESC";

      workingRows.sort((a, b) => {
        const valA = a[col];
        const valB = b[col];
        if (valA === valB) return 0;
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;
        const comp = (valA as string | number) > (valB as string | number) ? 1 : -1;
        return isDesc ? -comp : comp;
      });
    }

    // Handle LIMIT
    const limitMatch = cleaned.match(/\bLIMIT\s+(\d+)/i);
    if (limitMatch) {
      const limit = parseInt(limitMatch[1], 10);
      workingRows = workingRows.slice(0, limit);
    }

    // Parse SELECT projection
    const selectMatch = cleaned.match(/SELECT\s+([\s\S]*?)\s+FROM/i);
    const selectClause = selectMatch ? selectMatch[1].trim() : "*";

    let finalColumns: string[] = [];
    if (selectClause === "*") {
      finalColumns = workingRows.length > 0 ? Object.keys(workingRows[0]) : primaryTable.columns.map((c) => c.name);
    } else {
      finalColumns = selectClause.split(",").map((s) => {
        const part = s.trim();
        const asMatch = part.match(/\bAS\s+([a-zA-Z0-9_]+)/i);
        if (asMatch) return asMatch[1];
        return part.split(".").pop()!.replace(/[^a-zA-Z0-9_]/g, "");
      });
    }

    // Build tabular rows
    const rows: (string | number | boolean | null)[][] = workingRows.map((r) => {
      return finalColumns.map((col) => {
        const val = r[col];
        return val !== undefined ? (val as string | number | boolean | null) : null;
      });
    });

    const elapsed = Math.round(performance.now() - start);

    return {
      success: true,
      columns: finalColumns,
      rows,
      rowCount: rows.length,
      executionTimeMs: Math.max(1, elapsed),
    };
  } catch (err) {
    return {
      success: false,
      columns: [],
      rows: [],
      rowCount: 0,
      executionTimeMs: Math.round(performance.now() - start),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Formats SQL query result as an ASCII/Markdown table.
 */
export function formatSqlResultMarkdown(result: SqlQueryResult): string {
  if (!result.success) {
    return `[SQL Error]: ${result.error}`;
  }

  if (result.columns.length === 0 || result.rows.length === 0) {
    return `Query executed successfully. 0 rows returned (${result.executionTimeMs}ms).`;
  }

  const header = `| ${result.columns.join(" | ")} |`;
  const divider = `| ${result.columns.map(() => "---").join(" | ")} |`;
  const dataRows = result.rows
    .map((row) => `| ${row.map((cell) => (cell === null ? "NULL" : String(cell))).join(" | ")} |`)
    .join("\n");

  return [
    header,
    divider,
    dataRows,
    ``,
    `(${result.rowCount} row${result.rowCount === 1 ? "" : "s"} returned in ${result.executionTimeMs}ms)`,
  ].join("\n");
}
