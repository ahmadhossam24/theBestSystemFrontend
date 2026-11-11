"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getRowsForTable } from "./db";

// Loads every row that appears in `table` from IndexedDB.
// `setRows` lets the page apply an edit instantly; `reload()` re-reads from the database.
export function useTableRows(table) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const latest = useRef(0); // ignore results of a load that was superseded

  const tableId = table?.id;
  const tableType = table?.tableType;

  const reload = useCallback(async () => {
    if (!tableId) return;
    const mine = ++latest.current;
    setLoading(true);
    try {
      const data = await getRowsForTable({ id: tableId, tableType });
      if (mine === latest.current) {
        setRows(data);
        setError("");
      }
    } catch (e) {
      if (mine === latest.current) setError(e?.message || "Could not read rows.");
    } finally {
      if (mine === latest.current) setLoading(false);
    }
  }, [tableId, tableType]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { rows, setRows, loading, error, reload };
}
