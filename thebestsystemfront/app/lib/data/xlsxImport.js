// ---------------------------------------------------------------------------
// Excel import. Pure functions (plus one lazy-loaded reader), no React.
//
//   readWorkbookFile(file)      -> { sheetName, sheetNames, headers, rows }      (browser)
//   planImport(headers, cols)   -> { matches, ignored, missing }                 header-name matching
//   convertRows(rows, plan)     -> { records, warnings, skippedEmpty }
//   buildImportedRows(...)      -> { rows, events }                              ready for putRows()
//
// DATES: SheetJS can hand back JS Date objects, but in some time zones (Cairo
// included) they come out a minute early and date-only cells land on the
// previous day. So cells are read as raw serial numbers and converted with
// SSF.parse_date_code, which has no time-zone involved. Text dates are parsed
// by parseDateText below. Stored format: "YYYY-MM-DD HH:mm" (24h) or
// "YYYY-MM-DD" when there is no time of day.
// ---------------------------------------------------------------------------
import { createRow, nowStamp } from "./rowModel";
import { makeUploadEvent } from "./history";

const pad = (n) => String(n).padStart(2, "0");

export const normalizeHeader = (s) =>
  String(s ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");

// ------------------------------ dates -------------------------------------

function isRealDate(y, m, d) {
  if (m < 1 || m > 12 || d < 1) return false;
  const dim = [31, y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
  return d <= dim;
}

function formatParts(y, m, d, H, M, hasTime) {
  const day = `${y}-${pad(m)}-${pad(d)}`;
  return hasTime && (H || M) ? `${day} ${pad(H)}:${pad(M)}` : day;
}

const TIME = String.raw`(?:[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp])?\.?[Mm]?\.?)?`;
const ISO_RE = new RegExp(String.raw`^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})${TIME}$`);
const DMY_RE = new RegExp(String.raw`^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})${TIME}$`);

function timeOf(h, mi, ap) {
  let H = h === undefined ? 0 : Number(h);
  const M = mi === undefined ? 0 : Number(mi);
  if (ap) {
    const pm = ap.toLowerCase() === "p";
    if (H < 1 || H > 12) return null;
    if (pm && H < 12) H += 12;
    if (!pm && H === 12) H = 0;
  }
  if (H > 23 || M > 59) return null;
  return { H, M, has: h !== undefined };
}

// "2026-09-24", "2026-09-24 09:00 AM", "9/10/2026 21:31:00" (day first = 9 October) ...
// Returns { ok: true, value } or { ok: false }.
export function parseDateText(input) {
  const s = String(input ?? "").trim();
  if (!s) return { ok: true, value: "" };

  let m = ISO_RE.exec(s);
  if (m) {
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const t = timeOf(m[4], m[5], m[7]);
    if (!t || !isRealDate(y, mo, d)) return { ok: false };
    return { ok: true, value: formatParts(y, mo, d, t.H, t.M, t.has) };
  }

  m = DMY_RE.exec(s);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    const y = Number(m[3]);
    const t = timeOf(m[4], m[5], m[7]);
    if (!t) return { ok: false };
    // Day first by default. Month first only when day first is impossible (e.g. 12/31/2026).
    if (isRealDate(y, b, a)) return { ok: true, value: formatParts(y, b, a, t.H, t.M, t.has) };
    if (isRealDate(y, a, b)) return { ok: true, value: formatParts(y, a, b, t.H, t.M, t.has) };
  }
  return { ok: false };
}

// Excel serial number -> "YYYY-MM-DD[ HH:mm]". `SSF` comes from the xlsx module.
export function serialToText(SSF, serial, date1904 = false) {
  const p = SSF.parse_date_code(serial, { date1904 });
  if (!p) return null;
  let { y, m, d, H, M, S } = p;
  if (S >= 30) {
    // round to the nearest minute, carrying properly
    M += 1;
    if (M === 60) {
      M = 0;
      H += 1;
      if (H === 24) {
        // carry into the next day via the serial number itself
        const q = SSF.parse_date_code(Math.floor(serial) + 1, { date1904 });
        ({ y, m, d } = q);
        H = 0;
      }
    }
  }
  return formatParts(y, m, d, H, M, true);
}

// ------------------------------ reading -----------------------------------

const isEmptyCell = (v) => v === "" || v === null || v === undefined;

// XLSX is the xlsx module; data is an ArrayBuffer/Uint8Array. Split from
// readWorkbookFile so it can be tested in Node.
export function parseWorkbook(XLSX, data, wantedSheet) {
  const wb = XLSX.read(data, { type: "array", cellDates: false, cellNF: true });
  const date1904 = !!wb.Workbook?.WBProps?.date1904;
  const sheetNames = wb.SheetNames || [];

  const readSheet = (name) => {
    const ws = wb.Sheets[name];
    if (!ws || !ws["!ref"]) return [];
    const range = XLSX.utils.decode_range(ws["!ref"]);
    const out = [];
    for (let r = range.s.r; r <= range.e.r; r++) {
      const row = [];
      let any = false;
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = ws[XLSX.utils.encode_cell({ r, c })];
        let v = "";
        if (cell) {
          if (cell.t === "n" && cell.z && XLSX.SSF.is_date(cell.z)) {
            v = serialToText(XLSX.SSF, cell.v, date1904) ?? "";
          } else if (cell.t === "e") {
            v = "";
          } else if (cell.t === "n") {
            v = cell.v; // keep as a number; convertRows decides how to show it
          } else {
            v = cell.v === undefined || cell.v === null ? "" : String(cell.v);
          }
        }
        if (!isEmptyCell(v) && String(v).trim() !== "") any = true;
        row.push(v);
      }
      if (any) out.push(row);
    }
    return out;
  };

  // The wanted sheet, else the first sheet that has any data.
  let sheetName = wantedSheet && sheetNames.includes(wantedSheet) ? wantedSheet : null;
  let all = sheetName ? readSheet(sheetName) : [];
  if (!sheetName) {
    for (const n of sheetNames) {
      const rows = readSheet(n);
      if (rows.length) {
        sheetName = n;
        all = rows;
        break;
      }
    }
  }
  if (!sheetName) sheetName = sheetNames[0] || "";

  const headers = (all[0] || []).map((h) => String(h ?? "").trim());
  return { sheetName, sheetNames, headers, rows: all.slice(1) };
}

// .xlsx is a ZIP ("PK"), .xls is an OLE file (D0 CF 11 E0). SheetJS would happily read
// any other file (even plain text) as a one-cell sheet, so check the signature first.
export function looksLikeExcel(bytes) {
  const b = bytes;
  const zip = b.length > 3 && b[0] === 0x50 && b[1] === 0x4b;
  const ole = b.length > 3 && b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0;
  return zip || ole;
}

export async function readWorkbookFile(file, wantedSheet) {
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  if (!looksLikeExcel(new Uint8Array(buf.slice(0, 8)))) {
    throw new Error("This file could not be read as an Excel workbook (.xlsx / .xls).");
  }
  try {
    return parseWorkbook(XLSX, buf, wantedSheet);
  } catch (e) {
    throw new Error("This file could not be read as an Excel workbook (.xlsx / .xls).");
  }
}

// ------------------------------ matching ----------------------------------

// columns: the table's displayed columns (resolveColumns). Read-only columns
// (upload date, dataset type) are set by the system and never imported.
export function planImport(headers, columns) {
  const importable = columns.filter((c) => !c.readOnly);
  const readOnly = columns.filter((c) => c.readOnly);

  const byName = new Map();
  importable.forEach((c) => {
    [normalizeHeader(c.label), normalizeHeader(c.key)].forEach((n) => {
      if (n && !byName.has(n)) byName.set(n, c);
    });
  });
  const systemNames = new Set();
  readOnly.forEach((c) => {
    systemNames.add(normalizeHeader(c.label));
    systemNames.add(normalizeHeader(c.key));
  });

  const matches = [];
  const ignored = [];
  const used = new Set();

  headers.forEach((header, index) => {
    const n = normalizeHeader(header);
    if (!n) return; // blank header cell
    const col = byName.get(n);
    if (col) {
      if (used.has(col.cellId)) ignored.push({ index, header, reason: "duplicate header" });
      else {
        used.add(col.cellId);
        matches.push({ index, header, column: col });
      }
    } else if (systemNames.has(n)) ignored.push({ index, header, reason: "set by the system" });
    else ignored.push({ index, header, reason: "no column with this name" });
  });

  const missing = importable.filter((c) => !used.has(c.cellId));
  return { matches, ignored, missing };
}

// ------------------------------ converting --------------------------------

const numberText = (n) => (Number.isInteger(n) ? n.toFixed(0) : String(n));

// -> { records: [{ values, extras }], warnings: [{ kind, column, count, examples }], skippedEmpty }
export function convertRows(rows, plan) {
  const records = [];
  const warn = new Map();
  const addWarn = (kind, col, example) => {
    const k = `${kind}|${col.cellId}`;
    const w = warn.get(k) || { kind, column: col.label, count: 0, examples: [] };
    w.count += 1;
    if (w.examples.length < 3 && !w.examples.includes(example)) w.examples.push(example);
    warn.set(k, w);
  };
  let skippedEmpty = 0;

  for (const raw of rows) {
    const values = {};
    const extras = {};
    let any = false;

    for (const { index, column } of plan.matches) {
      const cell = raw[index];
      if (isEmptyCell(cell) || (typeof cell === "string" && cell.trim() === "")) continue;
      let out;

      if (column.type === "date") {
        if (typeof cell === "number") {
          out = numberText(cell);
          addWarn("bad-date", column, out);
        } else {
          const r = parseDateText(cell);
          out = r.ok ? r.value : String(cell).trim();
          if (!r.ok) addWarn("bad-date", column, out);
        }
      } else if (column.type === "choices") {
        const text = typeof cell === "number" ? numberText(cell) : String(cell).trim();
        const hit = column.options.find((o) => o.toLowerCase() === text.toLowerCase());
        out = hit ?? text;
        if (!hit) addWarn("not-in-list", column, text);
      } else if (typeof cell === "number") {
        out = numberText(cell);
        if (Number.isInteger(cell) && out.length >= 7) addWarn("number-cell", column, out);
      } else {
        out = String(cell).trim();
      }

      any = true;
      if (column.ownerTableId) (extras[column.ownerTableId] ||= {})[column.key] = out;
      else values[column.key] = out;
    }

    if (!any) skippedEmpty += 1;
    else records.push({ values, extras });
  }
  return { records, warnings: [...warn.values()], skippedEmpty };
}

// Rows + one "upload" history event each, sharing ONE upload timestamp.
// dataset table -> row belongs to it as its dataset type; general table -> row sits in it directly.
export function buildImportedRows(table, records, fileName, by) {
  const stamp = nowStamp();
  const at = new Date().toISOString();
  const rows = [];
  const events = [];
  for (const rec of records) {
    const row = createRow({
      datasetTableId: table.tableType === "dataset" ? table.id : null,
      generalTableId: table.tableType === "general" ? table.id : null,
      values: { ...rec.values, uploadDate: stamp },
      extras: rec.extras,
    });
    rows.push(row);
    events.push(makeUploadEvent({ rowId: row.id, by, table, note: fileName, at }));
  }
  return { rows, events, stamp };
}
