"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTables } from "../../../../setup-table/hooks/useTables";
import { getHistory, getRow } from "../../../../lib/data/db";
import { useSession } from "../../../../lib/org/session.js";
import { useScope } from "../../../../lib/org/scope.js";
import { canReachTeam } from "../../../../lib/data/dataRules";
import { describeEvent, formatStamp } from "../../../../lib/data/history";

export default function RowHistoryPage() {
  const { tableId, rowId } = useParams();
  const { tables, loaded } = useTables();
  const { user } = useSession();
  const { teams, ready: teamsReady } = useScope(user);
  const found = tables.find((t) => t.id === tableId);
  const allowed = !!found && teamsReady && canReachTeam(teams, found.teamId);
  const table = allowed ? found : undefined;

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

  const backHref = table ? `/tables/${table.id}` : "/";
  const { row: rawRow, events } = state;
  // the row must belong to this table's own team (a URL can't be used to peek at another team's row)
  const row =
    table && rawRow && [rawRow.datasetTableId, rawRow.generalTableId].some((id) => id && tables.find((t) => t.id === id)?.teamId === table.teamId) ? rawRow : null;

  return (
    <div>
      <Link href={backHref} className="mb-4 inline-block text-sm font-medium text-slate-500 hover:text-slate-700">
        ← Back{table ? ` to ${table.name}` : ""}
      </Link>

      <h1 className="text-xl font-semibold text-slate-800">Transaction history</h1>
      {table && row && (
        <p className="mb-6 mt-1 text-sm text-slate-400">
          {[row.values?.landline, row.values?.name].filter(Boolean).join(" · ") || `Row ${rowId}`}
        </p>
      )}

      {loaded && teamsReady && !table && <p className="mt-4 text-sm text-slate-400" data-testid="table-missing">This table isn&apos;t available to you.</p>}
      {(state.status === "loading" || !loaded || !teamsReady) && <p className="mt-4 text-sm text-slate-400">Loading…</p>}
      {state.status === "error" && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.message}</p>}
      {table && state.status === "ready" && !row && <p className="mt-4 text-sm text-slate-400">This row no longer exists.</p>}

      {table && state.status === "ready" && row && (
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
