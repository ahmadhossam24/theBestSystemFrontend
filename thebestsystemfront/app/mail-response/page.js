"use client";

import { useState } from "react";
import { useData } from "../context/DataContext";
import EditableCell from "../components/EditableCell";
import RowActions from "../components/RowActions";
import TrashModal from "../components/modals/TrashModal";

const columns = [
  { key: "landline", label: "Landline" },
  { key: "cusName", label: "Customer name" },
  { key: "packageName", label: "Package name" },
  { key: "agent", label: "Agent" },
  { key: "payMethod", label: "Pay method", type: "select", options: ["Cash", "Installment"] },
  { key: "srId", label: "SR ID" },
  { key: "parentSr", label: "Parent SR" },
  { key: "address", label: "Address" },
  { key: "gsm", label: "GSM" },
  { key: "ratePlan", label: "Rate plan" },
  { key: "priceGroup", label: "Price group" },
  { key: "type", label: "Type" },
  { key: "case", label: "Case" },
  { key: "status", label: "Status" },
  { key: "adslNumber", label: "ADSL number" },
  { key: "callFeedback", label: "Call feedback" },
  { key: "creationDate", label: "Creation date", type: "date" },
  { key: "sfid", label: "SFID" },
  { key: "accountName", label: "Account name" },
  { key: "rtm", label: "RTM" },
];

export default function MailResponsePage() {
  const { mailResponse, updateCell, deleteRow, trashRow } = useData();
  const [trashModalRow, setTrashModalRow] = useState(null);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Mail response store</h1>
          <p className="text-sm text-slate-400">Records captured from mail responses.</p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">{mailResponse.length} rows</span>
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
            {mailResponse.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50/60">
                {columns.map((c) => (
                  <td key={c.key} className="px-1 py-1">
                    <EditableCell
                      value={row[c.key]}
                      type={c.type || "text"}
                      options={c.options}
                      onSave={(v) => updateCell("mailResponse", row.id, c.key, v, c.label)}
                    />
                  </td>
                ))}
                <td className="px-3 py-1">
                  <RowActions
                    rowId={row.id}
                    onDelete={() => deleteRow("mailResponse", row.id)}
                    transferOptions={[{ label: "Trash table", onSelect: () => setTrashModalRow(row.id) }]}
                  />
                </td>
              </tr>
            ))}
            {mailResponse.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="px-3 py-8 text-center text-sm text-slate-400">
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
            trashRow("mailResponse", trashModalRow, notes);
            setTrashModalRow(null);
          }}
        />
      )}
    </div>
  );
}
