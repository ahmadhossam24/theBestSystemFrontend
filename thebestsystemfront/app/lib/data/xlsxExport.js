// ---------------------------------------------------------------------------
// Excel EXPORT. Pure helpers (testable in Node) + one browser download function.
//
//   tableToAoa(columns, rows, getValue)          -> [[header...], [cell...], ...]   everything as text
//   uniqueSheetName(wanted, taken)               -> Excel-safe (<=31 chars, no []:*?/\), unique
//   downloadWorkbook(sheets, fileName)           -> browser: builds the .xlsx and downloads it
//
// Values are stored as text in this app, so they are exported as text too: phone numbers keep their
// leading zeros and long numbers keep every digit. Dates stay "YYYY-MM-DD[ HH:mm]".
// ---------------------------------------------------------------------------

export function tableToAoa(columns, rows, getValue) {
  const header = columns.map((c) => c.label);
  const body = rows.map((row) => columns.map((c) => String(getValue(row, c) ?? "")));
  return [header, ...body];
}

export function uniqueSheetName(wanted, taken) {
  let base = String(wanted || "Sheet").replace(/[\[\]:*?/\\]/g, " ").replace(/\s+/g, " ").trim().replace(/^'+|'+$/g, "") || "Sheet";
  base = base.slice(0, 31).trim();
  let name = base;
  let n = 2;
  const has = (x) => [...taken].some((t) => t.toLowerCase() === x.toLowerCase());
  while (has(name)) {
    const suffix = ` (${n++})`;
    name = base.slice(0, 31 - suffix.length).trim() + suffix;
  }
  return name;
}

// sheets: [{ name, aoa }] -> the same list with unique, Excel-safe names
export function nameSheets(sheets) {
  const taken = new Set();
  return sheets.map((s) => {
    const name = uniqueSheetName(s.name, taken);
    taken.add(name);
    return { ...s, name };
  });
}

export const safeFileName = (s) =>
  String(s || "export")
    .replace(/[^\p{L}\p{N}._ -]+/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80) || "export";

export const stampForFile = (d = new Date()) => {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export async function downloadWorkbook(sheets, fileName) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  nameSheets(sheets).forEach((s) => {
    const ws = XLSX.utils.aoa_to_sheet(s.aoa);
    ws["!cols"] = (s.aoa[0] || []).map((_, i) => ({ wch: Math.min(40, Math.max(10, ...s.aoa.slice(0, 200).map((r) => String(r[i] ?? "").length))) }));
    XLSX.utils.book_append_sheet(wb, ws, s.name);
  });
  XLSX.writeFile(wb, fileName);
}
