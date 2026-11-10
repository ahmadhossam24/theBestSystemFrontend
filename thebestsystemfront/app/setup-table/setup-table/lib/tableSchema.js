// ---------------------------------------------------------------------------
// Schema + helpers for your localStorage "database".
//
// TWO localStorage keys:
//
// 1) STORAGE_KEY  -> array of tables
//    {
//      id: "tbl_lx3k9a2f",
//      name: "Rejection",                  // unique (case-insensitive)
//      tableType: "dataset",               // "general" | "dataset"
//      columns: [ ...one flat, ordered list... ],
//      retiredKeys: ["oldKey"],            // keys of this table's deleted columns
//      createdAt, updatedAt
//    }
//
// 2) GLOBAL_STORAGE_KEY -> the default columns the USER added, shared by ALL tables
//    {
//      columns: [ { key, label, type, options, fixed: true, origin: "global" } ],
//      retiredKeys: ["oldKey"]             // keys of deleted shared columns
//    }
//
// Every column, wherever it lives, looks like:
//    { key, label, type: "text"|"date"|"choices", options: [], fixed: boolean, origin }
//
//    origin "fixed"  -> built into the code (can't be edited anywhere)
//    origin "global" -> added by the user in "Default columns" (edited there, in every table)
//    origin "custom" -> added by the user inside ONE table
//    fixed = (origin !== "custom"): "not editable inside this table's form".
//
// A table's stored `columns` is always the complete list, in this order:
//    fixed defaults -> general-only defaults -> global defaults -> its custom columns
// `key` is a stable id: renaming changes only `label`, so stored rows stay attached.
// ---------------------------------------------------------------------------

export const STORAGE_KEY = "setup-tables-v1";
export const GLOBAL_STORAGE_KEY = "setup-default-columns-v1";

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
  { key: "landline", label: "Landline", type: "text", options: [], fixed: true, origin: "fixed" },
  { key: "name", label: "Name", type: "text", options: [], fixed: true, origin: "fixed" },
  { key: "contactPhone", label: "Contact phone", type: "text", options: [], fixed: true, origin: "fixed" },
  { key: "uploadDate", label: "Upload date", type: "date", options: [], fixed: true, origin: "fixed" },
  { key: "agent", label: "Agent", type: "text", options: [], fixed: true, origin: "fixed" },
  { key: "feedback", label: "Feedback", type: "text", options: [], fixed: true, origin: "fixed" },
  { key: "agentNotes", label: "Agent notes", type: "text", options: [], fixed: true, origin: "fixed" },
];

// Extra built-in column that only GENERAL tables have.
export const GENERAL_ONLY_COLUMNS = [
  { key: "datasetType", label: "Dataset type", type: "text", options: [], fixed: true, origin: "fixed" },
];

// Built-in columns for a given table type (fresh copies, safe to store).
export function getFixedColumns(tableType) {
  const cols = tableType === "general" ? [...FIXED_COLUMNS, ...GENERAL_ONLY_COLUMNS] : FIXED_COLUMNS;
  return cols.map((c) => ({ ...c }));
}

// Built-in keys/labels of EITHER type are reserved everywhere, so a user column
// can't collide with one even if a table is later switched to the other type.
const ALL_FIXED = [...FIXED_COLUMNS, ...GENERAL_ONLY_COLUMNS];
const FIXED_KEYS = new Set(ALL_FIXED.map((c) => c.key));

export const EMPTY_GLOBALS = { columns: [], retiredKeys: [] };

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

// Makes any stored/draft column safe to store, stamped with its origin.
function cleanColumn(c, origin) {
  const type = COLUMN_TYPES.some((x) => x.value === c.type) ? c.type : "text";
  return {
    key: c.key,
    label: String(c.label ?? c.key).trim(),
    type,
    options: type === "choices" && Array.isArray(c.options) ? c.options.map((o) => String(o).trim()).filter(Boolean) : [],
    fixed: origin !== "custom",
    origin,
  };
}

// ----------------------------- normalizing --------------------------------

export function normalizeGlobals(raw) {
  const seen = new Set(FIXED_KEYS);
  const columns = [];
  (Array.isArray(raw?.columns) ? raw.columns : []).forEach((c) => {
    if (!c || !c.key || seen.has(c.key)) return;
    seen.add(c.key);
    columns.push(cleanColumn(c, "global"));
  });
  return { columns, retiredKeys: Array.isArray(raw?.retiredKeys) ? raw.retiredKeys.map(String) : [] };
}

// Rebuilds the complete column list from the CURRENT definitions, so changing
// the fixed list, the table type or the shared columns always propagates.
export function normalizeTable(t, globals = EMPTY_GLOBALS) {
  const globalKeys = new Set(globals.columns.map((c) => c.key));
  const isCustom = (c) => c && c.key && (c.origin ? c.origin === "custom" : !c.fixed);

  const custom = (Array.isArray(t?.columns) ? t.columns : [])
    .filter((c) => isCustom(c) && !FIXED_KEYS.has(c.key) && !globalKeys.has(c.key))
    .map((c) => cleanColumn(c, "custom"));

  const tableType = t?.tableType === "dataset" ? "dataset" : "general";
  const now = new Date().toISOString();
  return {
    id: t?.id || makeTableId(),
    name: String(t?.name ?? "").trim(),
    tableType,
    columns: [...getFixedColumns(tableType), ...globals.columns.map((c) => ({ ...c, options: [...c.options] })), ...custom],
    retiredKeys: Array.isArray(t?.retiredKeys) ? t.retiredKeys.map(String) : [],
    createdAt: t?.createdAt || now,
    updatedAt: t?.updatedAt || now,
  };
}

// ----------------------------- validation ---------------------------------

// Shared by the table form and the default-columns form.
// cols: [{ _uid, label, type, options }]  reserved: Set of lowercase labels
function validateColumnList(cols, reserved) {
  const errors = {};
  const seen = new Set(reserved);
  cols.forEach((c) => {
    const label = c.label.trim();
    if (!label) {
      errors[c._uid] = "Column name is required.";
      return;
    }
    if (seen.has(label.toLowerCase())) {
      errors[c._uid] = "Another column already uses this name.";
      return;
    }
    seen.add(label.toLowerCase());

    if (c.type === "choices") {
      const opts = c.options.map((o) => o.trim()).filter(Boolean);
      if (opts.length === 0) {
        errors[c._uid] = "Add at least one choice.";
      } else if (new Set(opts.map((o) => o.toLowerCase())).size !== opts.length) {
        errors[c._uid] = "Choices must be unique.";
      }
    }
  });
  return errors;
}

// draft = { name, tableType, customColumns: [{ _uid, key?, label, type, options }] }
// Returns { valid, errors: { name?: string, columns: { [_uid]: string } } }
export function validateDraft(draft, allTables, editingId, globals = EMPTY_GLOBALS) {
  const errors = { columns: {} };

  const name = draft.name.trim();
  if (!name) {
    errors.name = "Table name is required.";
  } else if (allTables.some((t) => t.id !== editingId && t.name.trim().toLowerCase() === name.toLowerCase())) {
    errors.name = "A table with this name already exists.";
  }

  const reserved = new Set([...ALL_FIXED, ...globals.columns].map((c) => c.label.toLowerCase()));
  errors.columns = validateColumnList(draft.customColumns, reserved);

  const valid = !errors.name && Object.keys(errors.columns).length === 0;
  return { valid, errors };
}

// cols = [{ _uid, key?, label, type, options }]  (the shared default columns)
// Besides the usual checks, a shared column can't reuse a name that some table
// already uses for its OWN extra column — that table would end up with two.
export function validateGlobalDraft(cols, allTables) {
  const reserved = new Set(ALL_FIXED.map((c) => c.label.toLowerCase()));
  const errors = validateColumnList(cols, reserved);

  const ownLabels = new Map(); // lowercase label -> first table name using it
  allTables.forEach((t) =>
    t.columns.filter((c) => c.origin === "custom").forEach((c) => {
      const l = c.label.toLowerCase();
      if (!ownLabels.has(l)) ownLabels.set(l, t.name);
    })
  );
  cols.forEach((c) => {
    if (errors[c._uid]) return;
    const hit = ownLabels.get(c.label.trim().toLowerCase());
    if (hit) errors[c._uid] = `Table "${hit}" already has its own column named "${c.label.trim()}". Rename or delete that one first.`;
  });

  return { valid: Object.keys(errors).length === 0, errors };
}

// ------------------------------ building ----------------------------------

// Turns a (validated) table draft into the record that gets stored.
export function buildTable(draft, existing, globals = EMPTY_GLOBALS) {
  const now = new Date().toISOString();

  // A deleted column's key goes into `retiredKeys` and is never handed out
  // again, so a new column can't silently inherit the old column's stored data.
  const keptKeys = new Set(draft.customColumns.map((c) => c.key).filter(Boolean));
  const retired = new Set(existing?.retiredKeys || []);
  (existing?.columns || []).forEach((c) => {
    if (c.origin === "custom" && !keptKeys.has(c.key)) retired.add(c.key);
  });

  const taken = new Set([
    ...FIXED_KEYS,
    ...retired,
    ...keptKeys,
    ...globals.columns.map((c) => c.key),
    ...globals.retiredKeys,
  ]);

  const custom = draft.customColumns.map((c) => {
    const key = c.key || slugKey(c.label, taken);
    taken.add(key);
    return cleanColumn({ ...c, key }, "custom");
  });

  return {
    id: existing?.id || makeTableId(),
    name: draft.name.trim(),
    tableType: draft.tableType,
    columns: [...getFixedColumns(draft.tableType), ...globals.columns.map((c) => ({ ...c, options: [...c.options] })), ...custom],
    retiredKeys: [...retired],
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
}

// Turns a (validated) list of shared-column drafts into the new globals record.
// A new key must be unused by ANY table too (including their retired keys),
// otherwise it could pick up stale data stored under that key.
export function buildGlobals(draftCols, existing, allTables) {
  const keptKeys = new Set(draftCols.map((c) => c.key).filter(Boolean));
  const retired = new Set(existing.retiredKeys);
  existing.columns.forEach((c) => {
    if (!keptKeys.has(c.key)) retired.add(c.key);
  });

  const taken = new Set([...FIXED_KEYS, ...retired, ...keptKeys]);
  allTables.forEach((t) => {
    t.columns.forEach((c) => taken.add(c.key));
    t.retiredKeys.forEach((k) => taken.add(k));
  });

  const columns = draftCols.map((c) => {
    const key = c.key || slugKey(c.label, taken);
    taken.add(key);
    return cleanColumn({ ...c, key }, "global");
  });

  return { columns, retiredKeys: [...retired] };
}
