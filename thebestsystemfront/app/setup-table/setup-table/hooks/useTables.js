"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  STORAGE_KEY,
  GLOBAL_STORAGE_KEY,
  EMPTY_GLOBALS,
  normalizeGlobals,
  normalizeTable,
  buildTable,
  buildGlobals,
} from "../lib/tableSchema";

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

// Reads both keys and rebuilds every table against the current definitions.
function readAll() {
  const globals = normalizeGlobals(readJson(GLOBAL_STORAGE_KEY));
  const rawTables = readJson(STORAGE_KEY);
  const tables = Array.isArray(rawTables) ? rawTables.map((t) => normalizeTable(t, globals)) : [];
  return { globals, tables };
}

/**
 * Your two "database tables":
 *   - tables   (STORAGE_KEY)         one record per table
 *   - globals  (GLOBAL_STORAGE_KEY)  default columns shared by every table
 * localStorage is the source of truth: every change is computed from the latest
 * data, written to localStorage, then mirrored to state.
 */
export function useTables() {
  const [state, setState] = useState({ tables: [], globals: EMPTY_GLOBALS });
  const [loaded, setLoaded] = useState(false);
  const ref = useRef(state);

  // Read after mount (not during render) so server and client HTML match.
  useEffect(() => {
    const initial = readAll();
    ref.current = initial;
    setState(initial);
    setLoaded(true);

    // Write the rebuilt records back, so anything reading localStorage directly
    // later sees the complete, current column lists (e.g. tables saved before
    // a new default column existed).
    if (JSON.stringify(readJson(STORAGE_KEY)) !== JSON.stringify(initial.tables) && localStorage.getItem(STORAGE_KEY)) {
      writeJson(STORAGE_KEY, initial.tables);
    }
  }, []);

  // Keep several open tabs in sync.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== STORAGE_KEY && e.key !== GLOBAL_STORAGE_KEY) return;
      const next = readAll();
      ref.current = next;
      setState(next);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const commit = useCallback((next) => {
    ref.current = next;
    writeJson(GLOBAL_STORAGE_KEY, next.globals);
    writeJson(STORAGE_KEY, next.tables);
    setState(next);
  }, []);

  // editingId = null -> add; otherwise update that table.
  const saveTable = useCallback(
    (draft, editingId) => {
      const { tables, globals } = ref.current;
      if (editingId) {
        const existing = tables.find((t) => t.id === editingId);
        if (!existing) return;
        const updated = buildTable(draft, existing, globals);
        commit({ globals, tables: tables.map((t) => (t.id === editingId ? updated : t)) });
      } else {
        commit({ globals, tables: [...tables, buildTable(draft, null, globals)] });
      }
    },
    [commit]
  );

  const deleteTable = useCallback(
    (id) => {
      const { tables, globals } = ref.current;
      commit({ globals, tables: tables.filter((t) => t.id !== id) });
    },
    [commit]
  );

  // Replaces the whole list of shared default columns, then rebuilds EVERY
  // table so each one gets/loses the changed columns.
  const saveGlobalColumns = useCallback(
    (draftCols) => {
      const { tables, globals } = ref.current;
      const nextGlobals = buildGlobals(draftCols, globals, tables);
      commit({ globals: nextGlobals, tables: tables.map((t) => normalizeTable(t, nextGlobals)) });
    },
    [commit]
  );

  return {
    tables: state.tables,
    globals: state.globals,
    loaded,
    saveTable,
    deleteTable,
    saveGlobalColumns,
  };
}
