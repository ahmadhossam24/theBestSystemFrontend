"use client";

import { useState } from "react";
import ColumnListEditor from "./ColumnListEditor";
import { FIXED_COLUMNS, GENERAL_ONLY_COLUMNS, newUid, validateGlobalDraft } from "../lib/tableSchema";

export default function DefaultColumnsModal({ globals, allTables, onClose, onSave }) {
  const [cols, setCols] = useState(() =>
    globals.columns.map((c) => ({ _uid: newUid(), key: c.key, label: c.label, type: c.type, options: [...c.options] }))
  );
  const [showErrors, setShowErrors] = useState(false);

  const { valid, errors } = validateGlobalDraft(cols, allTables);

  const submit = () => {
    if (!valid) {
      setShowErrors(true);
      return;
    }
    onSave(cols);
  };

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/40 px-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-800">Default columns</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-700">Built-in (locked)</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {FIXED_COLUMNS.map((c) => (
                <span key={c.key} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                  {c.label} <span className="text-slate-400">· {c.type}</span>
                </span>
              ))}
              {GENERAL_ONLY_COLUMNS.map((c) => (
                <span key={c.key} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                  {c.label} <span className="text-slate-400">· {c.type} · general tables only</span>
                </span>
              ))}
            </div>
          </div>

          <p className="mb-4 mt-5 rounded-lg bg-violet-50 px-3 py-2 text-xs text-violet-800">
            Columns added here appear in <b>every</b> table ({allTables.length} right now) — existing and future ones.
            Renaming or editing choices updates all of them; deleting a column removes it from all of them.
          </p>

          <ColumnListEditor
            title="Your default columns"
            emptyText="No shared columns yet. Add one and it will appear in every table."
            columns={cols}
            errors={errors}
            showErrors={showErrors}
            onChange={setCols}
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">
            Cancel
          </button>
          <button onClick={submit} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Save default columns
          </button>
        </div>
      </div>
    </div>
  );
}
