"use client";

import { useEffect, useState } from "react";

const selCls = "rounded-lg border border-blue-200 bg-white px-2 py-1.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-100";
const labelOf = (c) => (c.fromDataset ? `${c.label} (${c.datasetName})` : c.label);

/**
 * Appears while rows are selected. Sets one choices column to one value on all of them.
 *  columns:       bulk-settable columns (bulk.js -> bulkColumns)
 *  selected:      number of selected rows
 *  totalMatching: rows matching the current search/filters
 *  onApply(column, value): async; value "" means "clear it"
 *  targets:       general tables rows can be transferred to ([{id,name}]); onTransfer(targetId): async
 */
export default function BulkEditBar({ columns, selected, totalMatching, onSelectAll, onClear, onApply, targets = [], onTransfer, busy }) {
  const [cellId, setCellId] = useState("");
  const [value, setValue] = useState(null); // null = nothing chosen yet ("" is a real choice: clear)
  const [confirming, setConfirming] = useState(null); // null | "set" | "transfer"
  const [targetId, setTargetId] = useState("");

  // default to the first column (Agent comes first among the built-ins)
  const column = columns.find((c) => c.cellId === cellId) || columns[0];

  useEffect(() => setConfirming(null), [selected, cellId, value, targetId]);
  useEffect(() => setValue(null), [cellId]);

  const text = value === "" ? "empty" : `"${value}"`;
  const apply = async () => {
    await onApply(column, value);
    setConfirming(null);
    setValue(null);
  };
  const target = targets.find((t) => t.id === targetId);
  const transfer = async () => {
    await onTransfer(targetId);
    setConfirming(null);
    setTargetId("");
  };

  return (
    <div role="region" aria-label="Bulk edit" className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5">
      <span data-testid="selected-count" className="text-sm font-medium text-blue-800">
        {selected.toLocaleString()} selected
      </span>
      {selected < totalMatching && (
        <button onClick={onSelectAll} className="text-xs font-medium text-blue-700 underline">
          Select all {totalMatching.toLocaleString()} matching
        </button>
      )}
      <button onClick={onClear} className="text-xs font-medium text-slate-500 hover:underline">
        Clear selection
      </button>

      {columns.length > 0 && (
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-500">Set</span>
          <select aria-label="Column to set" value={column?.cellId || ""} onChange={(e) => setCellId(e.target.value)} className={selCls}>
            {columns.map((c) => (
              <option key={c.cellId} value={c.cellId}>
                {labelOf(c)}
              </option>
            ))}
          </select>
          <span className="text-sm text-slate-500">to</span>
          <select
            aria-label="Value to set"
            value={value === null ? "__none__" : value}
            onChange={(e) => setValue(e.target.value === "__none__" ? null : e.target.value)}
            className={selCls}
          >
            <option value="__none__" disabled>
              — choose —
            </option>
            {column.options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
            <option value="">(clear value)</option>
          </select>

          {confirming !== "set" ? (
            <button
              onClick={() => setConfirming("set")}
              disabled={value === null || busy}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
            >
              Apply
            </button>
          ) : (
            <span className="flex items-center gap-2 rounded-lg bg-white px-2 py-1 text-sm text-slate-700 ring-1 ring-blue-200">
              Set {labelOf(column)} to {text} on {selected.toLocaleString()} row{selected === 1 ? "" : "s"}?
              <button onClick={apply} disabled={busy} className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {busy ? "Saving…" : "Confirm"}
              </button>
              <button onClick={() => setConfirming(null)} disabled={busy} className="text-xs text-slate-500 hover:underline">
                Back
              </button>
            </span>
          )}
        </div>
      )}

      {targets.length > 0 && (
        <div className="flex w-full flex-wrap items-center justify-end gap-2 border-t border-blue-100 pt-2">
          <span className="text-sm text-slate-500">Transfer to</span>
          <select aria-label="Transfer to table" value={targetId} onChange={(e) => setTargetId(e.target.value)} className={selCls}>
            <option value="" disabled>
              — choose a table —
            </option>
            {targets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          {confirming !== "transfer" ? (
            <button
              onClick={() => setConfirming("transfer")}
              disabled={!target || busy}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
            >
              Transfer
            </button>
          ) : (
            <span className="flex items-center gap-2 rounded-lg bg-white px-2 py-1 text-sm text-slate-700 ring-1 ring-blue-200">
              Transfer {selected.toLocaleString()} row{selected === 1 ? "" : "s"} to {target?.name}?
              <button onClick={transfer} disabled={busy} className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {busy ? "Saving…" : "Confirm transfer"}
              </button>
              <button onClick={() => setConfirming(null)} disabled={busy} className="text-xs text-slate-500 hover:underline">
                Back
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
