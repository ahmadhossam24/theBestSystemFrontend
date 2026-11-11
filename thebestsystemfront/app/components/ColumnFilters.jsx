"use client";

import { EMPTY } from "../lib/data/filtering";

const inputCls =
  "rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100";

const labelOf = (c) => (c.fromDataset ? `${c.label} (${c.datasetName})` : c.label);

/**
 * One control per choices column (dropdown) and per date column (from / to).
 * Generated from `columns` — add a column in setup and its filter appears.
 *
 * columns:  filterable columns (see filtering.js)
 * options:  { [cellId]: { options: [...], orphans: [...] } }
 * filters:  { [cellId]: "value" | { from, to } }
 */
export default function ColumnFilters({ columns, options, filters, onChange }) {
  if (columns.length === 0) return null;

  return (
    <div className="flex flex-wrap items-end gap-x-4 gap-y-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
      {columns.map((c) => {
        if (c.type === "choices") {
          const o = options[c.cellId] || { options: [], orphans: [] };
          return (
            <label key={c.cellId} className="flex flex-col gap-1 text-xs font-medium text-slate-500">
              {labelOf(c)}
              <select
                aria-label={`Filter ${labelOf(c)}`}
                className={inputCls}
                value={typeof filters[c.cellId] === "string" ? filters[c.cellId] : ""}
                onChange={(e) => onChange(c.cellId, e.target.value)}
              >
                <option value="">All</option>
                <option value={EMPTY}>(empty)</option>
                {o.options.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
                {o.orphans.map((v) => (
                  <option key={`o-${v}`} value={v}>
                    {v} (not in list)
                  </option>
                ))}
              </select>
            </label>
          );
        }

        const range = filters[c.cellId] && typeof filters[c.cellId] === "object" ? filters[c.cellId] : {};
        return (
          <div key={c.cellId} className="flex flex-col gap-1 text-xs font-medium text-slate-500">
            {labelOf(c)}
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                aria-label={`${labelOf(c)} from`}
                className={inputCls}
                value={range.from || ""}
                onChange={(e) => onChange(c.cellId, { ...range, from: e.target.value })}
              />
              <span className="text-slate-300">to</span>
              <input
                type="date"
                aria-label={`${labelOf(c)} to`}
                className={inputCls}
                value={range.to || ""}
                onChange={(e) => onChange(c.cellId, { ...range, to: e.target.value })}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
