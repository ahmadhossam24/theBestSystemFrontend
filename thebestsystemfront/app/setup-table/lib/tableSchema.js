// ---------------------------------------------------------------------------
// Schema + helpers for the "tables" table (your localStorage database).
//
// One record in localStorage looks like:
// {
//   id: "tbl_lx3k9a2f",
//   name: "Rejection",                 // unique (case-insensitive)
//   tableType: "dataset",              // "general" | "dataset"
//   columns: [                         // ONE flat, ordered list
//     { key: "landline",  label: "Landline", type: "text", options: [], fixed: true },
//     ...other fixed columns...,
//     { key: "rejReason", label: "Rej reason", type: "text", options: [], fixed: false },
//     { key: "priority",  label: "Priority",   type: "choices", options: ["High","Low"], fixed: false }
//   ],
//   retiredKeys: ["oldColumnKey"],     // keys of deleted columns, never reused
//   createdAt: "2026-11-09T11:50:00.000Z",
//   updatedAt: "2026-11-09T11:50:00.000Z"
// }
//
// Why one flat list: whatever builds real tables/pages later can loop over
// `columns` once. `fixed` is the only thing that tells the two kinds apart,
// and `key` is a stable id that never changes when a label is renamed.
// ---------------------------------------------------------------------------

export const STORAGE_KEY = "setup-tables-v1";

export const TABLE_TYPES = [
  { value: "general", label: "General table" },
  { value: "dataset", label: "Dataset table" },
];

export const COLUMN_TYPES = [
  { value: "text", label: "Text" },
  { value: "date", label: "Date" },
  { value: "choices", label: "Choices" },
];

// Present in every table, can't be edited or deleted by the user.
export const FIXED_COLUMNS = [
  { key: "landline", label: "Landline", type: "text", options: [], fixed: true },
  { key: "name", label: "Name", type: "text", options: [], fixed: true },
  { key: "contactPhone", label: "Contact phone", type: "text", options: [], fixed: true },
  { key: "uploadDate", label: "Upload date", type: "date", options: [], fixed: true },
  { key: "agent", label: "Agent", type: "text", options: [], fixed: true },
  { key: "feedback", label: "Feedback", type: "text", options: [], fixed: true },
  { key: "agentNotes", label: "Agent notes", type: "text", options: [], fixed: true },
];

const FIXED_KEYS = new Set(FIXED_COLUMNS.map((c) => c.key));

let uidCounter = 0;
export const newUid = () => `c${Date.now().toString(36)}_${uidCounter++}`;

const makeTableId = () => `tbl_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// "Seller name" -> "sellerName". Labels with no latin letters/digits (e.g.
// Arabic) fall back to "column", "column2"... — the label itself is untouched.
export function slugKey(label, taken) {
  const words = String(label).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  let base = words.map((w, i) => (i === 0 ? w : w[0].toUpperCase() + w.slice(1))).join("");
  if (!base) base = "column";
  if (/^[0-9]/.test(base)) base = "col" + base[0].toUpperCase() + base.slice(1);
  let key = base;
  let n = 2;
  while (taken.has(key)) key = base + n++;
  return key;
}

// Makes any stored record safe to use: fixed columns are always present, first,
// and match the current definition (so changing FIXED_COLUMNS later propagates).
export function normalizeTable(t) {
  const custom = (Array.isArray(t?.columns) ? t.columns : [])
    .filter((c) => c && c.key && !c.fixed && !FIXED_KEYS.has(c.key))
    .map((c) => {
      const type = COLUMN_TYPES.some((x) => x.value === c.type) ? c.type : "text";
      return {
        key: c.key,
        label: String(c.label ?? c.key),
        type,
        options: type === "choices" && Array.isArray(c.options) ? c.options.map(String) : [],
        fixed: false,
      };
    });

  const now = new Date().toISOString();
  return {
    id: t?.id || makeTableId(),
    name: String(t?.name ?? "").trim(),
    tableType: t?.tableType === "dataset" ? "dataset" : "general",
    columns: [...FIXED_COLUMNS.map((c) => ({ ...c })), ...custom],
    retiredKeys: Array.isArray(t?.retiredKeys) ? t.retiredKeys.map(String) : [],
    createdAt: t?.createdAt || now,
    updatedAt: t?.updatedAt || now,
  };
}

// draft = { name, tableType, customColumns: [{ _uid, key?, label, type, options }] }
// Returns { valid, errors: { name?: string, columns: { [_uid]: string } } }
export function validateDraft(draft, allTables, editingId) {
  const errors = { columns: {} };

  const name = draft.name.trim();
  if (!name) {
    errors.name = "Table name is required.";
  } else if (allTables.some((t) => t.id !== editingId && t.name.trim().toLowerCase() === name.toLowerCase())) {
    errors.name = "A table with this name already exists.";
  }

  const seenLabels = new Set(FIXED_COLUMNS.map((c) => c.label.toLowerCase()));
  draft.customColumns.forEach((c) => {
    const label = c.label.trim();
    if (!label) {
      errors.columns[c._uid] = "Column name is required.";
      return;
    }
    if (seenLabels.has(label.toLowerCase())) {
      errors.columns[c._uid] = "Another column already uses this name.";
      return;
    }
    seenLabels.add(label.toLowerCase());

    if (c.type === "choices") {
      const opts = c.options.map((o) => o.trim()).filter(Boolean);
      if (opts.length === 0) {
        errors.columns[c._uid] = "Add at least one choice.";
      } else if (new Set(opts.map((o) => o.toLowerCase())).size !== opts.length) {
        errors.columns[c._uid] = "Choices must be unique.";
      }
    }
  });

  const valid = !errors.name && Object.keys(errors.columns).length === 0;
  return { valid, errors };
}

// Turns a (validated) draft into the record that gets stored.
export function buildTable(draft, existing) {
  const now = new Date().toISOString();

  // A deleted column's key goes into `retiredKeys` and is never handed out
  // again, so a new column can't silently inherit the old column's stored data.
  const keptKeys = new Set(draft.customColumns.map((c) => c.key).filter(Boolean));
  const retired = new Set(existing?.retiredKeys || []);
  (existing?.columns || []).forEach((c) => {
    if (!c.fixed && !keptKeys.has(c.key)) retired.add(c.key);
  });

  const taken = new Set([...FIXED_KEYS, ...retired, ...keptKeys]);

  const custom = draft.customColumns.map((c) => {
    const key = c.key || slugKey(c.label, taken);
    taken.add(key);
    const isChoices = c.type === "choices";
    return {
      key,
      label: c.label.trim(),
      type: c.type,
      options: isChoices ? c.options.map((o) => o.trim()).filter(Boolean) : [],
      fixed: false,
    };
  });

  return {
    id: existing?.id || makeTableId(),
    name: draft.name.trim(),
    tableType: draft.tableType,
    columns: [...FIXED_COLUMNS.map((c) => ({ ...c })), ...custom],
    retiredKeys: [...retired],
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
}
