"use client";

import { useRouter, useParams } from "next/navigation";
import { useData } from "../../context/DataContext";

export default function TransactionHistoryPage() {
  const router = useRouter();
  const params = useParams();
  const { getLog } = useData();
  const log = getLog(params.rowId);

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        ← Back
      </button>

      <h1 className="mb-1 text-xl font-semibold text-slate-800">Transaction history</h1>
      <p className="mb-6 text-sm text-slate-400">Row #{params.rowId}</p>

      <ol className="relative border-l border-slate-200 pl-6">
        {log.map((entry, i) => (
          <li key={entry.id} className="mb-6 last:mb-0">
            <span className="absolute -translate-x-[31px] mt-1.5 h-2.5 w-2.5 rounded-full bg-blue-500" />
            <p className="text-sm text-slate-700">{entry.text}</p>
          </li>
        ))}
        {log.length === 0 && <p className="text-sm text-slate-400">No history recorded for this row yet.</p>}
      </ol>
    </div>
  );
}
