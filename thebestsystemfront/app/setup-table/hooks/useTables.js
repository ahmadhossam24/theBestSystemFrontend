"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  STORAGE_KEY,
  GLOBAL_STORAGE_KEY,
  EMPTY_GLOBALS,
  normalizeGlobals,
  normalizeTable,
  buildTable,
  buildGlobals,
} from "../lib/tableSchema";

const CHANGED_EVENT = "setup-tables-changed"; // same-tab "tables were saved" signal

function readJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full / blocked — nothing sensible to do in the UI yet
  }
}

// Reads both keys and rebuilds every table against ITS TEAM's current default columns.
function readAll() {
  const raw = readJson(GLOBAL_STORAGE_KEY);
  const globalsByTeam = {};
  Object.entries(raw?.byTeam || {}).forEach(([teamId, g]) => {
    globalsByTeam[teamId] = normalizeGlobals(g);
  });
  const rawTables = readJson(STORAGE_KEY);
  const tables = (Array.isArray(rawTables) ? rawTables : [])
    .filter((t) => t && t.teamId) // a table without a team can't be reached by anyone
    .map((t) => normalizeTable(t, globalsByTeam[t.teamId] || EMPTY_GLOBALS));
  return { globalsByTeam, tables };
}

/**
 * Your two "database tables" (localStorage is the source of truth):
 *   - tables   (STORAGE_KEY)         one record per table, each with its `teamId`
 *   - globals  (GLOBAL_STORAGE_KEY)  default columns, kept per team
 *
 * useTables(teamId):
 *   a team id -> only that team's tables + that team's default columns (Setup page, sidebar)
 *   null      -> nothing (no team chosen yet)
 *   undefined -> every table of every team (lookups by id; callers must check access themselves)
 */
export function useTables(teamId) {
  const [state, setState] = useState({ tables: [], globalsByTeam: {} });
  const [loaded, setLoaded] = useState(false);
  const ref = useRef(state);

  // Read after mount (not during render) so server and client HTML match.
  useEffect(() => {
    const initial = readAll();
    ref.current = initial;
    setState(initial);
    setLoaded(true);
    if (localStorage.getItem(STORAGE_KEY) && JSON.stringify(readJson(STORAGE_KEY)) !== JSON.stringify(initial.tables)) {
      writeJson(STORAGE_KEY, initial.tables);
    }
  }, []);

  // Keep other open tabs ("storage") and other components in THIS tab (e.g. the sidebar) in sync.
  useEffect(() => {
    const reread = () => {
      const next = readAll();
      ref.current = next;
      setState(next);
    };
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY || e.key === GLOBAL_STORAGE_KEY) reread();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(CHANGED_EVENT, reread);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(CHANGED_EVENT, reread);
    };
  }, []);

  const commit = useCallback((next) => {
    ref.current = next;
    writeJson(GLOBAL_STORAGE_KEY, { byTeam: next.globalsByTeam });
    writeJson(STORAGE_KEY, next.tables);
    setState(next);
    window.dispatchEvent(new Event(CHANGED_EVENT));
  }, []);

  const globalsOf = (cur, id) => cur.globalsByTeam[id] || EMPTY_GLOBALS;

  // editingId = null -> add (to `teamId`); otherwise update that table. A table never changes team.
  const saveTable = useCallback(
    (draft, editingId) => {
      if (!teamId && !editingId) return;
      const cur = ref.current;
      if (editingId) {
        const existing = cur.tables.find((t) => t.id === editingId);
        if (!existing) return;
        const updated = buildTable(draft, existing, globalsOf(cur, existing.teamId), existing.teamId);
        commit({ ...cur, tables: cur.tables.map((t) => (t.id === editingId ? updated : t)) });
      } else {
        commit({ ...cur, tables: [...cur.tables, buildTable(draft, null, globalsOf(cur, teamId), teamId)] });
      }
    },
    [commit, teamId]
  );

  const deleteTable = useCallback(
    (id) => {
      const cur = ref.current;
      commit({ ...cur, tables: cur.tables.filter((t) => t.id !== id) });
    },
    [commit]
  );

  // Replaces the shared default columns OF THIS TEAM, then rebuilds that team's tables only.
  const saveGlobalColumns = useCallback(
    (draftCols) => {
      if (!teamId) return;
      const cur = ref.current;
      const mine = cur.tables.filter((t) => t.teamId === teamId);
      const nextGlobals = buildGlobals(draftCols, globalsOf(cur, teamId), mine);
      commit({
        globalsByTeam: { ...cur.globalsByTeam, [teamId]: nextGlobals },
        tables: cur.tables.map((t) => (t.teamId === teamId ? normalizeTable(t, nextGlobals) : t)),
      });
    },
    [commit, teamId]
  );

  const tables = useMemo(
    () => (teamId === undefined ? state.tables : teamId === null ? [] : state.tables.filter((t) => t.teamId === teamId)),
    [state.tables, teamId]
  );
  const globals = teamId ? state.globalsByTeam[teamId] || EMPTY_GLOBALS : EMPTY_GLOBALS;

  return { tables, globals, loaded, saveTable, deleteTable, saveGlobalColumns };
}
