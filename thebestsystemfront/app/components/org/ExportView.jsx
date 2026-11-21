"use client";
// Admin page: export tables to Excel. Director = every team, branch admin = his branch, team admin = her team.
// Always limited to the teams the signed-in person can see (the same list the scope picker uses).
import { useEffect, useMemo, useState } from "react";
import { useScope } from "../../lib/org/scope.js";
import { useTables } from "../../setup-table/hooks/useTables";
import { countRowsForTable, getRowsForTable } from "../../lib/data/db";
import { resolveColumns, getCellValue } from "../../lib/data/rowModel";
import { tableToAoa, downloadWorkbook, safeFileName, stampForFile } from "../../lib/data/xlsxExport.js";
import { btnPrimary, Notice } from "./ui.jsx";

export default function ExportView({ actor }) {
  const { teams, scope } = useScope(actor);
  const team = teams.find((t) => t.id === scope.teamId);
  const { tables: allTables, loaded } = useTables(); // every team; filtered to the visible teams below
  const myTables = useMemo(() => allTables.filter((t) => teams.some((x) => x.id === t.teamId)), [allTables, teams]);
  const teamTables = useMemo(() => myTables.filter((t) => t.teamId === scope.teamId), [myTables, scope.teamId]);
  const [counts, setCounts] = useState({});
  const [picked, setPicked] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    let live = true;
    (async () => {
      const entries = await Promise.all(myTables.map(async (t) => [t.id, await countRowsForTable(t.id)]));
      if (live) setCounts(Object.fromEntries(entries));
    })();
    return () => {
      live = false;
    };
  }, [myTables]);
  useEffect(() => setPicked(new Set(teamTables.map((t) => t.id))), [teamTables]);
  useEffect(() => setNotice(null), [scope.teamId]);

  const sheetFor = async (t, prefix) => {
    const same = allTables.filter((x) => x.teamId === t.teamId);
    const cols = resolveColumns(t, same, null);
    const rows = await getRowsForTable(t);
    return { name: prefix ? `${prefix} - ${t.name}` : t.name, aoa: tableToAoa(cols, rows, (row, c) => getCellValue(row, c, same)), rows: rows.length };
  };
  const infoSheet = (list) => ({
    name: "Info",
    aoa: [
      ["Exported by", actor.displayName],
      ["Exported on", new Date().toLocaleString()],
      [],
      ["Team", "Branch", "Table", "Type", "Rows"],
      ...list.map((x) => [x.team, x.branch, x.table, x.type, x.rows]),
    ],
  });

  const run = async (mode) => {
    setBusy(true);
    setNotice(null);
    try {
      const chosen = mode === "all" ? [...myTables] : teamTables.filter((t) => picked.has(t.id));
      if (chosen.length === 0) return setNotice({ kind: "error", text: "Nothing to export: no table is selected." });
      const sheets = [];
      const info = [];
      for (const t of chosen) {
        const tm = teams.find((x) => x.id === t.teamId);
        const sh = await sheetFor(t, mode === "all" ? tm?.name : "");
        sheets.push(sh);
        info.push({ team: tm?.name || "", branch: tm?.branchName || "", table: t.name, type: t.tableType, rows: sh.rows });
      }
      const total = info.reduce((n, x) => n + x.rows, 0);
      const file = `${safeFileName(mode === "all" ? "all-teams" : team?.name)}-${stampForFile()}.xlsx`;
      await downloadWorkbook([infoSheet(info), ...sheets.map(({ name, aoa }) => ({ name, aoa }))], file);
      setNotice({ kind: "ok", text: `Exported ${chosen.length} table${chosen.length === 1 ? "" : "s"} (${total.toLocaleString()} rows) to ${file}.` });
    } catch (e) {
      setNotice({ kind: "error", text: e?.message || "Export failed." });
    } finally {
      setBusy(false);
    }
  };

  if (!team) return <p className="text-sm text-slate-500">Choose a team in the sidebar first.</p>;
  const toggle = (id) => setPicked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-800">Export data</h1>
      <p className="mt-1 text-sm text-slate-500" data-testid="export-scope">
        Team <strong className="text-slate-700">{team.name}</strong>{team.branchName ? ` (${team.branchName})` : ""}. One sheet per table, plus an Info sheet.
      </p>
      {notice && <div className="mt-3"><Notice kind={notice.kind}>{notice.text}</Notice></div>}
      {!loaded ? (
        <p className="mt-4 text-sm text-slate-400">Loading…</p>
      ) : teamTables.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400" data-testid="export-none">This team has no tables yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-100 text-sm">
          {teamTables.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-4 py-2" data-testid={`export-row-${t.name}`}>
              <input type="checkbox" aria-label={`Export ${t.name}`} checked={picked.has(t.id)} onChange={() => toggle(t.id)} />
              <span className="flex-1 text-slate-700">{t.name} <span className="text-slate-400">({t.tableType})</span></span>
              <span className="text-slate-500">{counts[t.id] === undefined ? "…" : `${counts[t.id].toLocaleString()} rows`}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button className={btnPrimary} data-testid="export-team" disabled={busy || picked.size === 0} onClick={() => run("team")}>
          {busy ? "Exporting…" : `Export ${team.name}`}
        </button>
        {teams.length > 1 && (
          <button className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50" data-testid="export-all" disabled={busy || myTables.length === 0} onClick={() => run("all")}>
            Export all {teams.length} teams
          </button>
        )}
      </div>
    </div>
  );
}
