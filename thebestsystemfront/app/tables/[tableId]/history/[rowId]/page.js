"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTables } from "../../../../setup-table/hooks/useTables";
import { getHistory, getRow } from "../../../../lib/data/db";
import { describeEvent, formatStamp } from "../../../../lib/data/history";

export default function RowHistoryPage() {
  const { tableId, rowId } = useParams();
  const { tables, loaded } = useTables();
  const table = tables.find((t) => t.id === tableId);

  const [state, setState] = useState({ status: "loading", row: null, events: [] });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [row, events] = await Promise.all([getRow(rowId), getHistory(rowId)]);
        if (!cancelled) setState({ status: "ready", row: row || null, events });
      } catch (e) {
        if (!cancelled) setState({ status: "error", row: null, events: [], message: e?.message });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rowId]);

  const backHref = table ? `/tables/${table.id}` : "/setup-table";
  const { row, events } = state;

  return (
    <div>
      <Link href={backHref} className="mb-4 inline-block text-sm font-medium text-slate-500 hover:text-slate-700">
        ← Back{table ? ` to ${table.name}` : ""}
      </Link>

      <h1 className="text-xl font-semibold text-slate-800">Transaction history</h1>
      {row && (
        <p className="mb-6 mt-1 text-sm text-slate-400">
          {[row.values?.landline, row.values?.name].filter(Boolean).join(" · ") || `Row ${rowId}`}
        </p>
      )}

      {(state.status === "loading" || !loaded) && <p className="mt-4 text-sm text-slate-400">Loading…</p>}
      {state.status === "error" && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.message}</p>}
      {state.status === "ready" && !row && <p className="mt-4 text-sm text-slate-400">This row no longer exists.</p>}

      {state.status === "ready" && row && (
        <ol className="relative border-l border-slate-200 pl-6">
          {events.map((e) => (
            <li key={e.id} className="mb-6 last:mb-0">
              <span className="absolute -translate-x-[31px] mt-1.5 h-2.5 w-2.5 rounded-full bg-blue-500" />
              <p className="text-sm text-slate-700">
                {describeEvent(e)} <span className="text-slate-400">at {formatStamp(e.at)}</span>
              </p>
              {e.tableName && <p className="text-xs text-slate-400">in {e.tableName}</p>}
            </li>
          ))}
          {events.length === 0 && <p className="text-sm text-slate-400">No history recorded for this row yet.</p>}
        </ol>
      )}
    </div>
  );
}
