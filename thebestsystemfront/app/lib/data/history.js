// ---------------------------------------------------------------------------
// Row HISTORY events. Stored as structured data, not sentences, so they can be
// filtered later and survive a column being renamed (the label is snapshotted).
//
// {
//   id, rowId,
//   at:         ISO timestamp
//   by:         name of the user who did it
//   type:       "upload" | "edit" | "bulk-edit" | "transfer"
//   tableId, tableName     the table the user was in when it happened
//   // edit only:
//   columnKey, columnLabel, ownerTableId, from, to
//   // upload only:
//   note
// }
// ---------------------------------------------------------------------------

let eventCounter = 0;
const newEventId = () => `h_${Date.now().toString(36)}${(eventCounter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function makeEditEvent({ rowId, by, table, column, from, to }) {
  return {
    id: newEventId(),
    rowId,
    at: new Date().toISOString(),
    by,
    type: "edit",
    tableId: table.id,
    tableName: table.name,
    columnKey: column.key,
    columnLabel: column.label,
    ownerTableId: column.ownerTableId || null,
    from: from ?? "",
    to: to ?? "",
  };
}

// Same fields as an edit, plus `bulkCount` = how many rows the one action changed.
export function makeBulkEditEvent({ rowId, by, table, column, from, to, bulkCount, at }) {
  return { ...makeEditEvent({ rowId, by, table, column, from, to }), type: "bulk-edit", bulkCount, ...(at ? { at } : {}) };
}

// Transfer into a general table. `from` is the general table the row was in ({id,name}) or null.
// mode "copy": the row now also appears in the general table (it had none before; it stays in its dataset table).
// mode "move": it left its previous general table for this one.
export function makeTransferEvent({ rowId, by, table, from, to, mode, bulkCount, at }) {
  return {
    id: newEventId(),
    rowId,
    at: at || new Date().toISOString(),
    by,
    type: "transfer",
    tableId: table.id,
    tableName: table.name,
    fromTableId: from?.id ?? null,
    fromTableName: from?.name ?? "",
    toTableId: to.id,
    toTableName: to.name,
    mode,
    bulkCount: bulkCount ?? 1,
  };
}

export function makeUploadEvent({ rowId, by, table, note = "", at }) {
  return {
    id: newEventId(),
    rowId,
    at: at || new Date().toISOString(),
    by,
    type: "upload",
    tableId: table.id,
    tableName: table.name,
    note,
  };
}

const q = (v) => (v === "" || v === null || v === undefined ? "empty" : `"${v}"`);

export function describeEvent(e) {
  switch (e.type) {
    case "upload":
      return `${e.by} added this row${e.note ? ` (${e.note})` : ""}`;
    case "edit":
      return `${e.by} changed ${e.columnLabel} from ${q(e.from)} to ${q(e.to)}`;
    case "bulk-edit":
      return `${e.by} changed ${e.columnLabel} from ${q(e.from)} to ${q(e.to)} (bulk change of ${Number(e.bulkCount || 1).toLocaleString()} rows)`;
    case "transfer":
      return e.mode === "move"
        ? `${e.by} moved this row from ${e.fromTableName || "its previous table"} to ${e.toTableName}`
        : `${e.by} transferred this row to ${e.toTableName}`;
    default:
      return `${e.by} did "${e.type}"`;
  }
}

const pad = (n) => String(n).padStart(2, "0");

// "10-11-2026 02:07 PM" (day-first, like the examples you wrote)
export function formatStamp(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return "";
  const h = d.getHours();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(h12)}:${pad(d.getMinutes())} ${h < 12 ? "AM" : "PM"}`;
}
