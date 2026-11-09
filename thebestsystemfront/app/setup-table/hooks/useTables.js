"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { STORAGE_KEY, normalizeTable, buildTable } from "../lib/tableSchema";

function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeTable) : [];
  } catch {
    return [];
  }
}

function writeStorage(tables) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tables));
  } catch {
    // storage full / blocked — nothing sensible to do in the UI yet
  }
}

/**
 * The "tables" table. localStorage is the source of truth: every change is
 * computed from the latest list, written to localStorage, then mirrored to state.
 */
export function useTables() {
  const [tables, setTables] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef([]);

  // Read after mount (not during render) so server and client HTML match.
  useEffect(() => {
    const initial = readStorage();
    ref.current = initial;
    setTables(initial);
    setLoaded(true);
  }, []);

  // Keep several open tabs in sync.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== STORAGE_KEY) return;
      const next = readStorage();
      ref.current = next;
      setTables(next);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const commit = useCallback((next) => {
    ref.current = next;
    writeStorage(next);
    setTables(next);
  }, []);

  // editingId = null -> add; otherwise update that table.
  const saveTable = useCallback(
    (draft, editingId) => {
      const current = ref.current;
      if (editingId) {
        const existing = current.find((t) => t.id === editingId);
        if (!existing) return;
        const updated = buildTable(draft, existing);
        commit(current.map((t) => (t.id === editingId ? updated : t)));
      } else {
        commit([...current, buildTable(draft, null)]);
      }
    },
    [commit]
  );

  const deleteTable = useCallback(
    (id) => commit(ref.current.filter((t) => t.id !== id)),
    [commit]
  );

  return { tables, loaded, saveTable, deleteTable };
}
