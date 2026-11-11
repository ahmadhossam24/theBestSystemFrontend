// ---------------------------------------------------------------------------
// Search + auto-generated filters. Pure functions, no React.
//
// Filters are generated from the COLUMNS being displayed, never hand-listed:
//   choices column -> dropdown      (options + "(empty)" + any value found in the data that's no longer an option)
//   date column    -> from / to range
//   text column    -> no filter, but it is covered by the search box
// Search looks at every displayed column.
//
// filters = { [cellId]: "value"  |  { from: "YYYY-MM-DD", to: "YYYY-MM-DD" } }
// ---------------------------------------------------------------------------
import { getCellValue } from "./rowModel";

export const EMPTY = "__empty__"; // choices filter value: rows where the cell is blank

// "Dataset type" is a text column but has its own dedicated dropdown on the page.
export const filterableColumns = (columns) =>
  columns.filter((c) => (c.type === "choices" || c.type === "date") && !(c.origin === "fixed" && c.key === "datasetType"));

// For each choices column: its options, then any other value actually present in `rows`.
export function buildFilterOptions(filterCols, rows, tables) {
  const out = {};
  filterCols.forEach((col) => {
    if (col.type !== "choices") return;
    const known = new Set(col.options);
    const extra = new Set();
    rows.forEach((r) => {
      const v = getCellValue(r, col, tables);
      if (v !== "" && !known.has(v)) extra.add(v);
    });
    out[col.cellId] = { options: [...col.options], orphans: [...extra].sort() };
  });
  return out;
}

const isRange = (v) => v && typeof v === "object";

// Only filters on columns that are currently displayed count.
export function activeFilters(filters, columns) {
  const byId = new Map(columns.map((c) => [c.cellId, c]));
  const out = [];
  Object.entries(filters).forEach(([cellId, v]) => {
    const col = byId.get(cellId);
    if (!col) return;
    if (col.type === "choices" && typeof v === "string" && v !== "") out.push({ col, kind: "choice", value: v });
    else if (col.type === "date" && isRange(v) && (v.from || v.to)) out.push({ col, kind: "range", from: v.from || "", to: v.to || "" });
  });
  return out;
}

export function filterRows(rows, columns, tables, search, filters) {
  const term = String(search || "").trim().toLowerCase();
  const active = activeFilters(filters, columns);
  if (!term && active.length === 0) return rows;

  return rows.filter((row) => {
    for (const f of active) {
      const v = getCellValue(row, f.col, tables);
      if (f.kind === "choice") {
        if (f.value === EMPTY ? v !== "" : v !== f.value) return false;
      } else {
        const day = String(v).slice(0, 10); // dates are stored "YYYY-MM-DD" or "YYYY-MM-DD HH:mm"
        if (day === "") return false;
        if (f.from && day < f.from) return false;
        if (f.to && day > f.to) return false;
      }
    }
    if (term) {
      let hit = false;
      for (const c of columns) {
        if (String(getCellValue(row, c, tables)).toLowerCase().includes(term)) {
          hit = true;
          break;
        }
      }
      if (!hit) return false;
    }
    return true;
  });
}
