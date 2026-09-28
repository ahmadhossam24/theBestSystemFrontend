"use client";

import { useState } from "react";
import { useData } from "../context/DataContext";
import EditableCell from "../components/EditableCell";
import RowActions from "../components/RowActions";
import TrashModal from "../components/modals/TrashModal";
import { collectionColumns } from "../collection-table/page";

export default function MonthCollectionTablePage() {
  const { monthCollection, updateCell, deleteRow, trashRow } = useData();
  const [trashModalRow, setTrashModalRow] = useState(null);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Month collection table</h1>
          <p className="text-sm text-slate-400">Monthly rollover of collection rows.</p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">{monthCollection.length} rows</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {collectionColumns.map((c) => (
                <th key={c.key} className="whitespace-nowrap px-3 py-3">
                  {c.label}
                </th>
              ))}
              <th className="px-3 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {monthCollection.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50/60">
                {collectionColumns.map((c) => (
                  <td key={c.key} className="px-1 py-1">
                    <EditableCell
                      value={row[c.key]}
                      type={c.type || "text"}
                      options={c.options}
                      onSave={(v) => updateCell("monthCollection", row.id, c.key, v, c.label)}
                    />
                  </td>
                ))}
                <td className="px-3 py-1">
                  <RowActions
                    rowId={row.id}
                    onDelete={() => deleteRow("monthCollection", row.id)}
                    transferOptions={[{ label: "Trash table", onSelect: () => setTrashModalRow(row.id) }]}
                  />
                </td>
              </tr>
            ))}
            {monthCollection.length === 0 && (
              <tr>
                <td colSpan={collectionColumns.length + 1} className="px-3 py-8 text-center text-sm text-slate-400">
                  No rows here.
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
            trashRow("monthCollection", trashModalRow, notes);
            setTrashModalRow(null);
          }}
        />
      )}
    </div>
  );
}
