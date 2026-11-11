// ---------------------------------------------------------------------------
// The ROW model. Pure functions, no React, no storage — easy to test.
//
// One row is stored exactly once:
// {
//   id:              "r_...",
//   datasetTableId:  "tbl_..." | null   the ONE dataset table it appears in (set at upload, never changes)
//   generalTableId:  "tbl_..." | null   the ONE general table it appears in (null = none yet)
//   values:  { landline, name, contactPhone, uploadDate, agent, feedback, agentNotes, <shared keys> }
//            built-in + shared columns: the SAME values everywhere the row appears
//   extras:  { [tableId]: { [key]: value } }
//            a table's OWN extra columns, namespaced by the table that defines them.
//            Two tables can both have an extra "Priority" without ever mixing.
//            After a general->general move the old table's extras stay stored
//            but hidden, because nothing reads extras[oldTableId] any more.
//   sample:  1 | undefined             temporary testing flag
//   createdAt, updatedAt
// }
//
// "Appearing in a table" is just a rule (isRowInTable), never a copy of the row.
// ---------------------------------------------------------------------------

export const NO_DATASET = "__none__"; // dataset-type filter value: rows with no dataset type

let rowCounter = 0;
export const newRowId = () => `r_${Date.now().toString(36)}${(rowCounter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const pad = (n) => String(n).padStart(2, "0");

// "2026-09-24 14:05" — year-first and 24h, so it sorts correctly as plain text
// and its first 10 chars are the date used by date-range filters.
export function nowStamp(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function createRow({ datasetTableId = null, generalTableId = null, values = {}, extras = {}, sample = false } = {}) {
  const now = new Date().toISOString();
  const row = { id: newRowId(), datasetTableId, generalTableId, values, extras, createdAt: now, updatedAt: now };
  if (sample) row.sample = 1;
  return row;
}

export function isRowInTable(row, table) {
  return table.tableType === "dataset" ? row.datasetTableId === table.id : row.generalTableId === table.id;
}

// ----------------------------- columns ------------------------------------

// Columns to display for `table`.
//  - everything in table.columns (built-in, shared, the table's own extras)
//  - in a GENERAL table with a dataset type chosen: + that dataset table's own extras
// Each returned column carries:
//   ownerTableId  which table's `extras` the value lives in (null = row.values)
//   cellId        unique per displayed column (even if two columns share a key/label)
//   fromDataset   true for a dataset's extras shown inside a general table
export function resolveColumns(table, tables, datasetTypeId) {
  const own = table.columns.map((c) => {
    const isOwn = c.origin === "custom";
    return {
      ...c,
      ownerTableId: isOwn ? table.id : null,
      cellId: isOwn ? `${table.id}:${c.key}` : c.key,
      fromDataset: false,
    };
  });

  if (table.tableType !== "general" || !datasetTypeId || datasetTypeId === NO_DATASET) return own;

  const dataset = tables.find((t) => t.id === datasetTypeId && t.tableType === "dataset");
  if (!dataset) return own;

  const extras = dataset.columns
    .filter((c) => c.origin === "custom")
    .map((c) => ({
      ...c,
      ownerTableId: dataset.id,
      cellId: `${dataset.id}:${c.key}`,
      fromDataset: true,
      datasetName: dataset.name,
    }));
  return [...own, ...extras];
}

export function datasetTypeName(row, tables) {
  if (!row.datasetTableId) return "";
  const t = tables.find((x) => x.id === row.datasetTableId);
  return t ? t.name : "(deleted dataset)";
}

export function getCellValue(row, col, tables) {
  if (col.origin === "fixed" && col.key === "datasetType") return datasetTypeName(row, tables);
  if (col.ownerTableId) return row.extras?.[col.ownerTableId]?.[col.key] ?? "";
  return row.values?.[col.key] ?? "";
}

// Returns a NEW row with one cell changed (never mutates). Built-in and shared
// columns live in `values`; a table's own extras live in extras[ownerTableId].
export function applyCellEdit(row, col, value) {
  const updatedAt = new Date().toISOString();
  if (col.ownerTableId) {
    const mine = row.extras?.[col.ownerTableId] || {};
    return { ...row, extras: { ...row.extras, [col.ownerTableId]: { ...mine, [col.key]: value } }, updatedAt };
  }
  return { ...row, values: { ...row.values, [col.key]: value }, updatedAt };
}
