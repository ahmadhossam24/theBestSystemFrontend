// ---------------------------------------------------------------------------
// Transfers. Pure, no React.
//
// A row is stored once. Transferring only changes `generalTableId`:
//   no general table yet -> "copy": the row now ALSO shows in the target (it stays in its dataset table)
//   already in a general -> "move": it leaves that table for the target
// The target must be a GENERAL table - nothing is ever transferred into a dataset table.
// A table's own extras are never touched: after a move the old table's extras stay stored but
// hidden (nothing reads them), and show again if the row comes back.
// ---------------------------------------------------------------------------
import { makeTransferEvent } from "./history";

export const transferTargets = (tables, currentTable) =>
  tables.filter((t) => t.tableType === "general" && t.id !== currentTable?.id);

// -> { nextRows, events, copied, moved, unchanged }
export function planTransfer({ rows, ids, target, table, by, tables }) {
  if (!target || target.tableType !== "general") throw new Error("Rows can only be transferred into a general table.");
  const wanted = ids instanceof Set ? ids : new Set(ids);
  const at = new Date().toISOString();
  const picks = [];
  let unchanged = 0;
  for (const row of rows) {
    if (!wanted.has(row.id)) continue;
    if (row.generalTableId === target.id) unchanged += 1;
    else picks.push(row);
  }
  const nextRows = [];
  const events = [];
  let copied = 0;
  let moved = 0;
  for (const row of picks) {
    const prev = row.generalTableId ? tables.find((t) => t.id === row.generalTableId) : null;
    const mode = row.generalTableId ? "move" : "copy";
    if (mode === "move") moved += 1;
    else copied += 1;
    nextRows.push({ ...row, generalTableId: target.id, updatedAt: at });
    events.push(
      makeTransferEvent({
        rowId: row.id,
        by,
        table,
        from: row.generalTableId ? { id: row.generalTableId, name: prev?.name || "(deleted table)" } : null,
        to: { id: target.id, name: target.name },
        mode,
        bulkCount: picks.length,
        at,
      })
    );
  }
  return { nextRows, events, copied, moved, unchanged };
}
