import { describe, expect, it } from "vitest";
import { executeSqlQuery, formatSqlResultMarkdown, RECRUITMENT_DB_SCHEMA } from "./sql";
import { executeCode } from "./runner";

describe("Live In-Memory SQL Execution Sandbox", () => {
  it("executes basic SELECT query on employees table", () => {
    const query = "SELECT name, role, salary_lpa FROM employees WHERE salary_lpa >= 20.0 ORDER BY salary_lpa DESC;";
    const result = executeSqlQuery(query);

    expect(result.success).toBe(true);
    expect(result.columns).toEqual(["name", "role", "salary_lpa"]);
    expect(result.rowCount).toBe(2); // Adithya K (28.5) and Priya Sharma (24.0)
    expect(result.rows[0][0]).toBe("Adithya K");
    expect(result.rows[1][0]).toBe("Priya Sharma");
  });

  it("handles JOIN between employees and departments", () => {
    const query = "SELECT employees.name, departments.dept_name, employees.salary_lpa FROM employees JOIN departments ON employees.dept_id = departments.id WHERE departments.location = 'Bangalore';";
    const result = executeSqlQuery(query);

    expect(result.success).toBe(true);
    expect(result.rowCount).toBeGreaterThan(0);
    expect(result.columns).toContain("dept_name");
  });

  it("handles LIMIT and ordering", () => {
    const query = "SELECT student_name, company, package_lpa FROM placements ORDER BY package_lpa DESC LIMIT 2;";
    const result = executeSqlQuery(query);

    expect(result.success).toBe(true);
    expect(result.rowCount).toBe(2);
    expect(result.rows[0][0]).toBe("Rahul Verma"); // 34.0 LPA
  });

  it("formats result cleanly as a markdown table", () => {
    const query = "SELECT dept_name, location FROM departments WHERE budget_lakhs > 300;";
    const result = executeSqlQuery(query);
    const md = formatSqlResultMarkdown(result);

    expect(md).toContain("| dept_name | location |");
    expect(md).toContain("Engineering");
    expect(md).toContain("rows returned in");
  });

  it("integrates with the unified runner.executeCode", async () => {
    const sqlCode = "SELECT student_name, company FROM placements WHERE package_lpa >= 9.0;";
    const res = await executeCode("sql", sqlCode, [
      { id: "tc_1", name: "High Package Placements", input: "package_lpa >= 9.0", expectedOutput: "rows > 0" },
    ]);

    expect(res.success).toBe(true);
    expect(res.output).toContain("Rahul Verma");
    expect(res.testCases?.[0].passed).toBe(true);
  });
});
