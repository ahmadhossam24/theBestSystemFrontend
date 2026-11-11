// ---------------------------------------------------------------------------
// Bulk edit: set ONE choices column to ONE value on many rows. Pure, no React.
//
//   bulkColumns(columns)                              which columns can be bulk-set
//   planBulkEdit({rows, ids, column, value, ...})     -> { nextRows, events, changed, unchanged, skipped }
//
// - rows whose cell already has the value are left alone (no write, no history)
// - a dataset's extra column (shown inside a general table) only applies to rows of
//   that dataset type; other selected rows are `skipped`, never given stray extras
// - all rows get the SAME `at`, and one history event each (type "bulk-edit")
// ---------------------------------------------------------------------------
import { applyCellEdit, getCellValue } from "./rowModel";
import { makeBulkEditEvent } from "./history";

export const bulkColumns = (columns) => columns.filter((c) => c.type === "choices" && !c.readOnly);

export function planBulkEdit({ rows, ids, column, value, by, table, tables }) {
  const wanted = ids instanceof Set ? ids : new Set(ids);
  const at = new Date().toISOString();
  const nextRows = [];
  const targets = [];
  let unchanged = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!wanted.has(row.id)) continue;
    if (column.fromDataset && row.datasetTableId !== column.ownerTableId) {
      skipped += 1;
      continue;
    }
    const old = getCellValue(row, column, tables);
    if (String(old) === String(value)) {
      unchanged += 1;
      continue;
    }
    targets.push({ row, old });
  }
  const events = [];
  for (const { row, old } of targets) {
    const next = applyCellEdit(row, column, value);
    nextRows.push(next);
    events.push(makeBulkEditEvent({ rowId: row.id, by, table, column, from: old, to: value, bulkCount: targets.length, at }));
  }
  return { nextRows, events, changed: nextRows.length, unchanged, skipped };
}
