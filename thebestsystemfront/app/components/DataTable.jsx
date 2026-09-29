"use client";

import { useState } from "react";
import { useData } from "../context/DataContext";
import EditableCell from "./EditableCell";
import RowActions from "./RowActions";
import TrashModal from "./modals/TrashModal";

/**
 * tableKey: matches a key in DataContext state, e.g. "rejection", "clean"
 * columns: array of { key, label, type?, options? } — see datasetColumns.js
 */
export default function DataTable({ tableKey, title, subtitle, columns }) {
  const data = useData();
  const rows = data[tableKey] || [];
  console.log(data,rows)
  const { updateCell, deleteRow, trashRow } = data;
  const [trashModalRow, setTrashModalRow] = useState(null);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">{title}</h1>
          {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">{rows.length} rows</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {columns.map((c) => (
                <th key={c.key} className="whitespace-nowrap px-3 py-3">
                  {c.label}
                </th>
              ))}
              <th className="px-3 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50/60">
                {columns.map((c) => (
                  <td key={c.key} className="px-1 py-1">
                    <EditableCell
                      value={row[c.key]}
                      type={c.type || "text"}
                      options={c.options}
                      onSave={(v) => updateCell(tableKey, row.id, c.key, v, c.label)}
                    />
                  </td>
                ))}
                <td className="px-3 py-1">
                  <RowActions
                    rowId={row.id}
                    onDelete={() => deleteRow(tableKey, row.id)}
                    transferOptions={[{ label: "Trash table", onSelect: () => setTrashModalRow(row.id) }]}
                  />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="px-3 py-8 text-center text-sm text-slate-400">
                  No rows here. Upload a file to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {trashModalRow && (
        <TrashModal
          onClose={() => setTrashModalRow(null)}
          onConfirm={(notes) => {
            trashRow(tableKey, trashModalRow, notes);
            setTrashModalRow(null);
          }}
        />
      )}
    </div>
  );
}
