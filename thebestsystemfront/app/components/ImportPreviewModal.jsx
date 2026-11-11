"use client";

const WARNING_TEXT = {
  "bad-date": (w) => `${w.column}: ${w.count} value${w.count === 1 ? "" : "s"} not recognised as a date — kept as typed`,
  "not-in-list": (w) => `${w.column}: ${w.count} value${w.count === 1 ? "" : "s"} not in the list of options — kept as typed`,
  "number-cell": (w) => `${w.column}: ${w.count} cell${w.count === 1 ? " is" : "s are"} stored as numbers in Excel — leading zeros can't be recovered`,
};

/**
 * Pure display. Everything it shows is computed by the caller from xlsxImport.js.
 *  info:      { fileName, sheetName, sheetNames, rowCount }
 *  plan:      { matches, ignored, missing }
 *  converted: { records, warnings, skippedEmpty }
 */
export default function ImportPreviewModal({ table, info, plan, converted, busy, error, onSheetChange, onConfirm, onCancel }) {
  const count = converted.records.length;
  const canImport = count > 0 && plan.matches.length > 0 && !busy;
  const previewRows = converted.records.slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-label="Import preview">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-xl">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-800">Import into {table.name}</h2>
          <p className="mt-0.5 text-sm text-slate-400">
            {info.fileName}
            {info.sheetNames.length > 1 ? (
              <>
                {" · sheet "}
                <select
                  aria-label="Sheet"
                  value={info.sheetName}
                  onChange={(e) => onSheetChange(e.target.value)}
                  className="rounded border border-slate-200 px-1 py-0.5 text-xs text-slate-700"
                >
                  {info.sheetNames.map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </>
            ) : (
              ` · sheet "${info.sheetName}"`
            )}
          </p>
        </div>

        <div className="space-y-5 overflow-y-auto px-6 py-4 text-sm">
          <p data-testid="import-summary" className="text-slate-700">
            <strong>{count.toLocaleString()}</strong> row{count === 1 ? "" : "s"} will be added
            {converted.skippedEmpty > 0 && <span className="text-slate-400"> · {converted.skippedEmpty} empty skipped</span>}
            {" · "}
            <strong>{plan.matches.length}</strong> column{plan.matches.length === 1 ? "" : "s"} matched
          </p>

          {plan.matches.length === 0 && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-red-600">
              None of the column headings in the first row match a column of this table, so nothing can be imported. Headings found:{" "}
              {info.headers.filter(Boolean).join(", ") || "none"}.
            </p>
          )}

          {plan.matches.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Matched columns</p>
              <div className="flex flex-wrap gap-1.5">
                {plan.matches.map((m) => (
                  <span key={m.index} className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700">
                    {m.header}
                    {m.header !== m.column.label && <span className="text-emerald-500"> → {m.column.label}</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          {plan.ignored.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Ignored columns in the file</p>
              <div className="flex flex-wrap gap-1.5">
                {plan.ignored.map((m) => (
                  <span key={m.index} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">
                    {m.header} <span className="text-slate-400">({m.reason})</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {plan.missing.length > 0 && plan.matches.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Table columns not in the file (left empty)</p>
              <p className="text-slate-500">{plan.missing.map((c) => c.label).join(", ")}</p>
            </div>
          )}

          {converted.warnings.length > 0 && (
            <div className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide">Check these (rows are still imported)</p>
              <ul className="list-disc space-y-0.5 pl-5">
                {converted.warnings.map((w) => (
                  <li key={`${w.kind}-${w.column}`}>
                    {WARNING_TEXT[w.kind](w)} <span className="text-amber-700/70">e.g. {w.examples.map((e) => `"${e}"`).join(", ")}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {previewRows.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">First {previewRows.length} rows</p>
              <div className="overflow-x-auto rounded-lg border border-slate-100">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400">
                      {plan.matches.map((m) => (
                        <th key={m.index} className="whitespace-nowrap px-2 py-1.5 font-medium">
                          {m.column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600">
                    {previewRows.map((r, i) => (
                      <tr key={i}>
                        {plan.matches.map((m) => (
                          <td key={m.index} className="whitespace-nowrap px-2 py-1.5">
                            {(m.column.ownerTableId ? r.extras[m.column.ownerTableId]?.[m.column.key] : r.values[m.column.key]) ?? ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-red-600">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-3">
          <button onClick={onCancel} disabled={busy} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!canImport}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
          >
            {busy ? "Importing…" : `Import ${count.toLocaleString()} row${count === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
