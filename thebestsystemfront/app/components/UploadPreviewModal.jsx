"use client";

import ModalShell from "./modals/ModalShell";

export default function UploadPreviewModal({ fileName, rows, columns, onCancel, onConfirm }) {
  const preview = rows.slice(0, 5);
  const importableColumns = columns.filter((c) => c.key !== "uploadDate");

  return (
    <ModalShell title={`Import ${rows.length} row${rows.length === 1 ? "" : "s"} from "${fileName}"`} onClose={onCancel}>
      <p className="mb-3 text-sm text-slate-500">
        Columns were matched by header name. Showing the first {preview.length} of {rows.length} rows — check they landed
        in the right columns before confirming.
      </p>
      <div className="max-h-64 overflow-auto rounded-lg border border-slate-100">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-400">
              {importableColumns.map((c) => (
                <th key={c.key} className="whitespace-nowrap px-2 py-2">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {preview.map((row, i) => (
              <tr key={i}>
                {importableColumns.map((c) => (
                  <td key={c.key} className="whitespace-nowrap px-2 py-2 text-slate-600">
                    {row[c.key] || "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">
          Cancel
        </button>
        <button onClick={onConfirm} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Import {rows.length} row{rows.length === 1 ? "" : "s"}
        </button>
      </div>
    </ModalShell>
  );
}
