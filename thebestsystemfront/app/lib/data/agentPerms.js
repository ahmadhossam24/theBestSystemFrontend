// ---------------------------------------------------------------------------
// Per-agent column permissions. PURE (no React, no storage) so it can be tested in Node.
//
//   mode:   "hidden" | "read" | "edit"
//   perms = {
//     teamDefaults: { [teamId]: { [tableId]: { [cellId]: mode } } },   // what an agent gets with no settings of his own
//     agents:       { [userId]:  { [tableId]: { [cellId]: mode } } },  // explicit per-agent settings
//   }
//
// An agent's effective mode for a column = his own setting, else the team default, else "read".
// (So a NEW agent automatically gets the team default, and an agent with no settings follows it.)
// Only role "agent" is restricted. Directors, admins and super agents are never limited by this.
// A column that is system-set (readOnly) can never be "edit".
//
// Which table's bucket holds a column's setting: the table that OWNS the column (a custom column of a
// dataset table belongs to that dataset), otherwise the table being viewed.
// ---------------------------------------------------------------------------
export const MODES = ["hidden", "read", "edit"];
export const DEFAULT_MODE = "read";
export const MODE_LABELS = { hidden: "Hidden", read: "Read-only", edit: "Editable" };

export const emptyPerms = () => ({ teamDefaults: {}, agents: {} });

const isMode = (m) => MODES.includes(m);

export function normalizePerms(raw) {
  const out = emptyPerms();
  const clean = (tables) => {
    const t = {};
    Object.entries(tables || {}).forEach(([tableId, cols]) => {
      const c = {};
      Object.entries(cols || {}).forEach(([cellId, m]) => isMode(m) && (c[cellId] = m));
      if (Object.keys(c).length) t[tableId] = c;
    });
    return t;
  };
  Object.entries(raw?.teamDefaults || {}).forEach(([k, v]) => {
    const t = clean(v);
    if (Object.keys(t).length) out.teamDefaults[k] = t;
  });
  Object.entries(raw?.agents || {}).forEach(([k, v]) => {
    const t = clean(v);
    if (Object.keys(t).length) out.agents[k] = t;
  });
  return out;
}

const bucketOf = (col, pageTableId) => col.ownerTableId || pageTableId;
const get = (obj, a, b, c) => obj?.[a]?.[b]?.[c];

// -> { mode, source: "own" | "default" | "implicit" } for an AGENT (ignores role rules)
export function agentSetting(perms, { userId, teamId }, tableId, cellId) {
  const own = get(perms.agents, userId, tableId, cellId);
  if (own) return { mode: own, source: "own" };
  const def = get(perms.teamDefaults, teamId, tableId, cellId);
  if (def) return { mode: def, source: "default" };
  return { mode: DEFAULT_MODE, source: "implicit" };
}

// The mode that actually applies to `user` for `col` on the table page `pageTableId`.
export function modeFor(perms, user, pageTableId, col) {
  if (!user) return "hidden";
  if (user.role !== "agent") return col.readOnly ? "read" : "edit";
  const m = agentSetting(perms, { userId: user.id, teamId: user.teamId }, bucketOf(col, pageTableId), col.cellId).mode;
  return m === "edit" && col.readOnly ? "read" : m;
}

export const visibleColumns = (perms, user, pageTableId, cols) => cols.filter((c) => modeFor(perms, user, pageTableId, c) !== "hidden");
export const canEditColumn = (perms, user, pageTableId, col) => modeFor(perms, user, pageTableId, col) === "edit";

// An agent sees a table while at least one of its columns is not hidden.
export function tableVisibleTo(perms, user, table, cols) {
  if (!user) return false;
  if (user.role !== "agent") return true;
  return cols.some((c) => modeFor(perms, user, table.id, c) !== "hidden");
}

// A history event about a column the agent can't see must not leak its old/new values.
export function eventVisibleTo(perms, user, pageTableId, ev) {
  if (!user || user.role !== "agent") return true;
  if (ev.type !== "edit" && ev.type !== "bulk-edit") return true;
  const cellId = ev.ownerTableId ? `${ev.ownerTableId}:${ev.columnKey}` : ev.columnKey;
  return modeFor(perms, user, pageTableId, { cellId, ownerTableId: ev.ownerTableId || null, readOnly: false }) !== "hidden";
}

// ---- writing (all return NEW perms objects) ----
const clone = (p) => JSON.parse(JSON.stringify(p));
const sanitize = (entries) => Object.fromEntries(Object.entries(entries || {}).filter(([, m]) => isMode(m)));

// subject: { kind: "default", teamId } | { kind: "agent", userId }
export function setModes(perms, subject, tableId, entries) {
  const next = clone(perms);
  const root = subject.kind === "default" ? (next.teamDefaults[subject.teamId] ||= {}) : (next.agents[subject.userId] ||= {});
  root[tableId] = { ...(root[tableId] || {}), ...sanitize(entries) };
  return normalizePerms(next);
}

// Back to "follow the team default" for one table.
export function resetAgentTable(perms, userId, tableId) {
  const next = clone(perms);
  if (next.agents[userId]) delete next.agents[userId][tableId];
  return normalizePerms(next);
}

// How many existing per-agent settings would CHANGE if `entries` were applied to all `agentIds`.
export function countReplaced(perms, agentIds, tableId, entries) {
  let n = 0;
  for (const id of agentIds)
    for (const [cellId, m] of Object.entries(sanitize(entries))) {
      const cur = get(perms.agents, id, tableId, cellId);
      if (cur && cur !== m) n += 1;
    }
  return n;
}

// "Apply to all agents": overwrites every listed agent's setting for these columns.
export function applyToAll(perms, agentIds, tableId, entries) {
  let next = perms;
  const replaced = countReplaced(perms, agentIds, tableId, entries);
  for (const id of agentIds) next = setModes(next, { kind: "agent", userId: id }, tableId, entries);
  return { perms: next, replaced };
}
