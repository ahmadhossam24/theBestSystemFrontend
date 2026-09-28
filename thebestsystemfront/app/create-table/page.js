"use client";

import { useState } from "react";
import { useData } from "../context/DataContext";
import EditableCell from "../components/EditableCell";
import RowActions from "../components/RowActions";
import CollectionModal from "../components/modals/CollectionModal";
import TrashModal from "../components/modals/TrashModal";

const FEEDBACK_OPTIONS = ["No Answer", "Not Needed", "Accept"];

const columns = [
  { key: "landline", label: "Landline" },
  { key: "customerName", label: "Customer name" },
  { key: "date", label: "Date", type: "date" },
  { key: "landlineOwner", label: "Landline owner" },
  { key: "phoneContact", label: "Phone contact" },
  { key: "assignedAgent", label: "Assigned agent" },
  { key: "feedback", label: "Feedback", type: "select", options: FEEDBACK_OPTIONS },
  { key: "agentNotes", label: "Agent notes" },
  { key: "created", label: "Created?", type: "select", options: ["No", "Yes"] },
  { key: "srType", label: "SRs", type: "select", options: ["Red", "Normal"] },
  { key: "applyPhone", label: "Apply phone" },
  { key: "additionalPhone", label: "Additional phone" },
  { key: "packageName", label: "Package", type: "select", options: ["330GB", "450GB"] },
  { key: "modem", label: "Modem", type: "select", options: ["Yes", "No"] },
  { key: "payMethod", label: "Pay method", type: "select", options: ["Installment", "Cash"] },
  { key: "creationNotes", label: "Creation notes" },
];

export default function CreateTablePage() {
  const { create, updateCell, deleteRow, transferToCollection, trashRow } = useData();
  const [collectionModalRow, setCollectionModalRow] = useState(null);
  const [trashModalRow, setTrashModalRow] = useState(null);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Create table</h1>
          <p className="text-sm text-slate-400">Rows waiting to be created, with install details.</p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">{create.length} rows</span>
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
            {create.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50/60">
                {columns.map((c) => (
                  <td key={c.key} className="px-1 py-1">
                    <EditableCell
                      value={row[c.key]}
                      type={c.type || "text"}
                      options={c.options}
                      onSave={(v) => updateCell("create", row.id, c.key, v, c.label)}
                    />
                  </td>
                ))}
                <td className="px-3 py-1">
                  <RowActions
                    rowId={row.id}
                    onDelete={() => deleteRow("create", row.id)}
                    transferOptions={[
                      { label: "Collection table", onSelect: () => setCollectionModalRow(row.id) },
                      { label: "Trash table", onSelect: () => setTrashModalRow(row.id) },
                    ]}
                  />
                </td>
              </tr>
            ))}
            {create.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="px-3 py-8 text-center text-sm text-slate-400">
                  No rows here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {collectionModalRow && (
        <CollectionModal
          onClose={() => setCollectionModalRow(null)}
          onConfirm={(form) => {
            transferToCollection(collectionModalRow, form);
            setCollectionModalRow(null);
          }}
        />
      )}
      {trashModalRow && (
        <TrashModal
          onClose={() => setTrashModalRow(null)}
          onConfirm={(notes) => {
            trashRow("create", trashModalRow, notes);
            setTrashModalRow(null);
          }}
        />
      )}
    </div>
  );
}
