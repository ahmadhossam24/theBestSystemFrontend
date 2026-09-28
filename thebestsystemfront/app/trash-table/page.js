"use client";

import { useData } from "../context/DataContext";

const ORIGIN_LABEL = {
  main: "Main table",
  create: "Create table",
  collection: "Collection table",
  monthCollection: "Month collection table",
  mailResponse: "Mail response store",
};

export default function TrashTablePage() {
  const { trash } = useData();

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Trash table</h1>
          <p className="text-sm text-slate-400">Rows transferred here from any table.</p>
        </div>
        <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600">{trash.length} rows</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <th className="px-3 py-3">Origin</th>
              <th className="px-3 py-3">Landline</th>
              <th className="px-3 py-3">Customer / Account</th>
              <th className="px-3 py-3">Trash notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {trash.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50/60">
                <td className="px-3 py-3">
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                    {ORIGIN_LABEL[row.originTable] || row.originTable}
                  </span>
                </td>
                <td className="px-3 py-3 text-slate-700">{row.landline}</td>
                <td className="px-3 py-3 text-slate-700">{row.customerName || row.cusName || row.accountName}</td>
                <td className="px-3 py-3 text-slate-500">{row.trashNotes || "—"}</td>
              </tr>
            ))}
            {trash.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-sm text-slate-400">
                  Trash is empty.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
