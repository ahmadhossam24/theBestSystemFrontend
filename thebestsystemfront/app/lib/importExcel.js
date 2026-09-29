import * as XLSX from "xlsx";

// "Rej Reason", "rej_reason", "REJ-REASON" all normalize to "rejreason"
export function normalizeHeader(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Accepts a JS Date (when the sheet cell is a real Excel date) or text like
// "9/10/2026 21:31:00" / "9/10/2026" (M/D/YYYY, optionally with a time we
// discard since our date columns are date-only) or an already-ISO string.
export function parseIncomingDate(value) {
  if (!value) return "";
  if (value instanceof Date && !isNaN(value)) return toISODate(value);

  const str = String(value).trim();
  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];

  const mdy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mdy) {
    const [, month, day, year] = mdy;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return str; // unrecognized shape — left as-is rather than dropped
}

// sheetRow: a plain object from XLSX.utils.sheet_to_json, keyed by the
// sheet's own header text. columns: this table's column config.
export function mapSheetRowToTableRow(sheetRow, columns) {
  const byNormalizedHeader = {};
  Object.keys(sheetRow).forEach((k) => {
    byNormalizedHeader[normalizeHeader(k)] = k;
  });

  const result = {};
  columns.forEach((col) => {
    if (col.key === "uploadDate") return; // stamped by the app, never from the file

    const sheetKey = byNormalizedHeader[normalizeHeader(col.label)] ?? byNormalizedHeader[normalizeHeader(col.key)];
    if (sheetKey === undefined) {
      result[col.key] = "";
      return;
    }

    let value = sheetRow[sheetKey];
    if (col.type === "date") {
      value = parseIncomingDate(value);
    } else if (col.type === "select" && Array.isArray(col.options)) {
      const trimmed = String(value ?? "").trim();
      const match = col.options.find((o) => o && o.toLowerCase() === trimmed.toLowerCase());
      value = match ?? trimmed;
    } else {
      value = value === undefined || value === null ? "" : String(value).trim();
    }
    result[col.key] = value;
  });
  return result;
}

// Reads the file, maps every row by header name, and drops rows that came
// out completely empty (e.g. trailing blank rows in the sheet).
export async function parseWorkbookRows(file, columns) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  const mapped = rawRows.map((r) => mapSheetRowToTableRow(r, columns));
  return mapped.filter((r) => Object.values(r).some((v) => String(v).trim() !== ""));
}
