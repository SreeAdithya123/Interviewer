// Minimal CSV helpers — no external dependency (nothing like papaparse is
// installed, and pulling one in just for this would be overkill). Handles
// what this app actually needs: comma-separated fields, optional
// double-quoted fields (so a value can contain a comma), and `""` as an
// escaped quote inside a quoted field. Line endings \r\n or \n. Not a full
// RFC 4180 implementation — e.g. a quoted field can't contain a literal
// newline — but that's more than the invite-CSV upload or the students
// CSV export need.

/** Parses CSV text into rows of trimmed string fields. Blank lines are skipped. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.replace(/\r\n/g, "\n").split("\n");

  for (const line of lines) {
    if (line.trim() === "") continue;

    const fields: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (inQuotes) {
        if (char === '"') {
          if (line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += char;
        }
      } else if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        fields.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    fields.push(current);
    rows.push(fields.map((field) => field.trim()));
  }

  return rows;
}

function csvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function rowsToCsv(rows: string[][]): string {
  return rows.map((row) => row.map(csvField).join(",")).join("\r\n");
}

/** Builds a CSV file from `rows` and triggers a browser download. Client-side only. */
export function downloadCsv(filename: string, rows: string[][]): void {
  const csv = rowsToCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
