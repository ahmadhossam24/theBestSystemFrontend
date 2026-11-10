"use client";

import ChoicesEditor from "./ChoicesEditor";
import { COLUMN_TYPES, newUid } from "../lib/tableSchema";

const inputCls =
  "rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100";

/**
 * Editable list of user-defined columns (name + type + choices).
 * Used for a table's extra columns AND for the shared default columns.
 *
 * columns: [{ _uid, key, label, type, options }]
 * errors:  { [_uid]: string }   (only shown when showErrors is true)
 */
export default function ColumnListEditor({ columns, onChange, errors = {}, showErrors = false, title, emptyText }) {
  const setColumn = (uid, patch) => onChange(columns.map((c) => (c._uid === uid ? { ...c, ...patch } : c)));
  const add = () => onChange([...columns, { _uid: newUid(), key: null, label: "", type: "text", options: [] }]);
  const remove = (uid) => onChange(columns.filter((c) => c._uid !== uid));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-600">{title}</p>
        <button
          type="button"
          onClick={add}
          className="rounded-lg border border-slate-200 px-3 py-1 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          + Add column
        </button>
      </div>

      {columns.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-sm text-slate-400">
          {emptyText}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {columns.map((c) => (
          <div key={c._uid} className="rounded-xl border border-slate-100 p-3">
            <div className="flex items-center gap-2">
              <input
                className={`${inputCls} flex-1`}
                value={c.label}
                placeholder="Column name"
                onChange={(e) => setColumn(c._uid, { label: e.target.value })}
              />
              <select className={inputCls} value={c.type} onChange={(e) => setColumn(c._uid, { type: e.target.value })}>
                {COLUMN_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                title="Delete column"
                onClick={() => remove(c._uid)}
                className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
              >
                🗑
              </button>
            </div>

            {c.type === "choices" && (
              <ChoicesEditor options={c.options} onChange={(options) => setColumn(c._uid, { options })} />
            )}

            {showErrors && errors[c._uid] && <p className="mt-1.5 text-xs text-red-500">{errors[c._uid]}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
