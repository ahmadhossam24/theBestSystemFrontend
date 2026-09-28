"use client";

import { useState } from "react";
import { useData } from "../context/DataContext";
import EditableCell from "../components/EditableCell";
import RowActions from "../components/RowActions";
import TrashModal from "../components/modals/TrashModal";

export const collectionColumns = [
  { key: "landline", label: "Landline" },
  { key: "customerName", label: "Customer name" },
  { key: "date", label: "Date", type: "date" },
  { key: "landlineOwner", label: "Landline owner" },
  { key: "phoneContact", label: "Phone contact" },
  { key: "assignedAgent", label: "Assigned agent" },
  { key: "feedback", label: "Feedback", type: "select", options: ["No Answer", "Not Needed", "Accept"] },
  { key: "agentNotes", label: "Agent notes" },
  { key: "created", label: "Created?", type: "select", options: ["No", "Yes"] },
  { key: "srType", label: "SRs", type: "select", options: ["Red", "Normal"] },
  { key: "applyPhone", label: "Apply phone" },
  { key: "additionalPhone", label: "Additional phone" },
  { key: "packageName", label: "Package", type: "select", options: ["330GB", "450GB"] },
  { key: "modem", label: "Modem", type: "select", options: ["Yes", "No"] },
  { key: "payMethod", label: "Pay method", type: "select", options: ["Installment", "Cash"] },
  { key: "creationNotes", label: "Creation notes" },
  { key: "gsm", label: "GSM" },
  { key: "activeDate", label: "Active date", type: "date" },
  { key: "visitDate", label: "Visit date", type: "date" },
  { key: "assignStatus", label: "Assigned/Pending", type: "select", options: ["Assigned", "Pending"] },
  { key: "pendingReason", label: "Pending reason" },
  { key: "followUpNotes", label: "Follow up notes" },
  { key: "naOrDate", label: "N/A or date" },
];

export default function CollectionTablePage() {
  const { collection, updateCell, deleteRow, trashRow } = useData();
  const [trashModalRow, setTrashModalRow] = useState(null);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Collection table</h1>
          <p className="text-sm text-slate-400">Visit scheduling and follow-up tracking.</p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">{collection.length} rows</span>
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
            {collection.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50/60">
                {collectionColumns.map((c) => (
                  <td key={c.key} className="px-1 py-1">
                    <EditableCell
                      value={row[c.key]}
                      type={c.type || "text"}
                      options={c.options}
                      onSave={(v) => updateCell("collection", row.id, c.key, v, c.label)}
                    />
                  </td>
                ))}
                <td className="px-3 py-1">
                  <RowActions
                    rowId={row.id}
                    onDelete={() => deleteRow("collection", row.id)}
                    transferOptions={[{ label: "Trash table", onSelect: () => setTrashModalRow(row.id) }]}
                  />
                </td>
              </tr>
            ))}
            {collection.length === 0 && (
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
            trashRow("collection", trashModalRow, notes);
            setTrashModalRow(null);
          }}
        />
      )}
    </div>
  );
}
