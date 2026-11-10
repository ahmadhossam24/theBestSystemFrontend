"use client";

import { useState } from "react";
import ColumnListEditor from "./ColumnListEditor";
import { TABLE_TYPES, getFixedColumns, newUid, validateDraft } from "../lib/tableSchema";

const inputCls =
  "rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100";

// Turns a stored table into the editable draft shape (or a blank draft).
// Only the table's OWN extra columns are editable here.
function toDraft(table) {
  return {
    name: table?.name ?? "",
    tableType: table?.tableType ?? "general",
    customColumns: (table?.columns ?? [])
      .filter((c) => c.origin === "custom")
      .map((c) => ({ _uid: newUid(), key: c.key, label: c.label, type: c.type, options: [...c.options] })),
  };
}

export default function TableFormModal({ table, allTables, globals, onClose, onSave }) {
  const [draft, setDraft] = useState(() => toDraft(table));
  const [showErrors, setShowErrors] = useState(false);

  const { valid, errors } = validateDraft(draft, allTables, table?.id, globals);

  const submit = () => {
    if (!valid) {
      setShowErrors(true);
      return;
    }
    onSave(draft, table?.id ?? null);
  };

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/40 px-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-800">{table ? `Edit "${table.name}"` : "Add table"}</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-600">Table name</span>
              <input
                className={inputCls}
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="e.g. Rejection"
                autoFocus
              />
              {showErrors && errors.name && <span className="text-xs text-red-500">{errors.name}</span>}
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-600">Table type</span>
              <select
                className={inputCls}
                value={draft.tableType}
                onChange={(e) => setDraft((d) => ({ ...d, tableType: e.target.value }))}
              >
                {TABLE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Default columns (not editable here) */}
          <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
            <p className="text-sm font-medium text-blue-900">These columns exist in every table by default</p>
            <p className="mt-0.5 text-xs text-blue-700/80">They can&apos;t be edited or removed here.</p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {getFixedColumns(draft.tableType).map((c) => (
                <span key={c.key} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-blue-100">
                  {c.label} <span className="text-slate-400">· {c.type}</span>
                </span>
              ))}
            </div>

            {globals.columns.length > 0 && (
              <>
                <p className="mt-4 text-xs font-medium text-violet-800">
                  Shared columns you added — also in every table (change them from &quot;Default columns&quot; on the main page)
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {globals.columns.map((c) => (
                    <span key={c.key} className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 ring-1 ring-violet-100">
                      {c.label} <span className="text-violet-400">· {c.type}</span>
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* This table's own extra columns */}
          <div className="mt-5">
            <ColumnListEditor
              title="Extra columns (only in this table)"
              emptyText="No extra columns yet."
              columns={draft.customColumns}
              errors={errors.columns}
              showErrors={showErrors}
              onChange={(customColumns) => setDraft((d) => ({ ...d, customColumns }))}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">
            Cancel
          </button>
          <button onClick={submit} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            {table ? "Save changes" : "Create table"}
          </button>
        </div>
      </div>
    </div>
  );
}
