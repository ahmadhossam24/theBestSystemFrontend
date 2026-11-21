"use client";
// Admin screen: who may see / edit which column, per agent or as the team default.
import { useEffect, useMemo, useState } from "react";
import { getOrgService } from "../../lib/org/orgClient.js";
import { ORG_CHANGED } from "../../lib/org/session.js";
import { useScope } from "../../lib/org/scope.js";
import { useTables } from "../../setup-table/hooks/useTables";
import { resolveColumns } from "../../lib/data/rowModel";
import { usePerms } from "../../lib/data/permStore";
import { MODES, MODE_LABELS, agentSetting, setModes, applyToAll, countReplaced, resetAgentTable } from "../../lib/data/agentPerms";
import { ConfirmModal, Notice, inputCls, btnGhost } from "./ui.jsx";

const DEFAULT = "__default__";

export default function PermissionsView({ actor }) {
  const { teams, scope } = useScope(actor);
  const team = teams.find((t) => t.id === scope.teamId);
  const { tables } = useTables(scope.teamId || null);
  const { perms, update } = usePerms();
  const [agents, setAgents] = useState([]);
  const [subject, setSubject] = useState(DEFAULT);
  const [tableId, setTableId] = useState("");
  const [confirm, setConfirm] = useState(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!scope.teamId) return setAgents([]);
    let live = true;
    const load = () => getOrgService().listAgents(actor.id, scope.teamId).then((r) => live && setAgents(r.ok ? r.value.filter((a) => a.role === "agent") : []));
    load();
    window.addEventListener(ORG_CHANGED, load);
    return () => {
      live = false;
      window.removeEventListener(ORG_CHANGED, load);
    };
  }, [actor.id, scope.teamId]);

  // keep selections valid when the team (or its lists) changes
  useEffect(() => {
    if (subject !== DEFAULT && !agents.some((a) => a.id === subject)) setSubject(DEFAULT);
  }, [agents, subject]);
  useEffect(() => {
    if (!tables.some((t) => t.id === tableId)) setTableId(tables[0]?.id || "");
  }, [tables, tableId]);
  useEffect(() => setNotice(""), [scope.teamId, subject, tableId]);

  const table = tables.find((t) => t.id === tableId);
  const columns = useMemo(() => (table ? resolveColumns(table, tables, null) : []), [table, tables]);
  const agent = agents.find((a) => a.id === subject);
  const ids = agents.map((a) => a.id);

  const settingOf = (c) =>
    subject === DEFAULT
      ? { mode: perms.teamDefaults[scope.teamId]?.[tableId]?.[c.cellId] || "read", source: perms.teamDefaults[scope.teamId]?.[tableId]?.[c.cellId] ? "own" : "implicit" }
      : agentSetting(perms, { userId: subject, teamId: scope.teamId }, tableId, c.cellId);
  const subj = () => (subject === DEFAULT ? { kind: "default", teamId: scope.teamId } : { kind: "agent", userId: subject });
  const set = (entries) => update((p) => setModes(p, subj(), tableId, entries));
  const entriesAll = (mode) => Object.fromEntries(columns.map((c) => [c.cellId, mode === "edit" && c.readOnly ? "read" : mode]));
  const currentEntries = () => Object.fromEntries(columns.map((c) => [c.cellId, settingOf(c).mode]));

  const askApplyAll = (entries, what) => {
    const n = countReplaced(perms, ids, tableId, entries);
    setConfirm({ entries, what, n });
  };
  const doApplyAll = () => {
    let replaced = 0;
    update((p) => {
      const r = applyToAll(p, ids, tableId, confirm.entries);
      replaced = r.replaced;
      return r.perms;
    });
    setNotice(`Applied ${confirm.what} to ${ids.length} agent${ids.length === 1 ? "" : "s"}${replaced ? ` (${replaced} existing setting${replaced === 1 ? "" : "s"} replaced)` : ""}.`);
    setConfirm(null);
  };

  if (!team) return <p className="text-sm text-slate-500" data-testid="perm-noteam">Choose a team in the sidebar first.</p>;

  const own = subject !== DEFAULT && columns.some((c) => settingOf(c).source === "own");

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-800">Agent permissions</h1>
      <p className="mt-1 text-sm text-slate-500" data-testid="perm-scope">
        Team <strong className="text-slate-700">{team.name}</strong>. Agents see every table of their team unless hidden here; super agents and admins are never limited. Agents with no settings of their own follow the team default.
      </p>
      {notice && <div className="mt-3"><Notice>{notice}</Notice></div>}

      <div className="mt-4 flex flex-wrap items-end gap-4">
        <label className="text-xs text-slate-500">
          Settings for
          <select aria-label="Settings for" className={`${inputCls} mt-1 block min-w-56`} value={subject} onChange={(e) => setSubject(e.target.value)}>
            <option value={DEFAULT}>Team default (new agents)</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>{a.username} — {a.name}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-500">
          Table
          <select aria-label="Table" className={`${inputCls} mt-1 block min-w-48`} value={tableId} onChange={(e) => setTableId(e.target.value)} disabled={tables.length === 0}>
            {tables.length === 0 && <option value="">No tables</option>}
            {tables.map((t) => (
              <option key={t.id} value={t.id}>{t.name} ({t.tableType})</option>
            ))}
          </select>
        </label>
        {agents.length === 0 && <span className="text-xs text-slate-400" data-testid="perm-noagents">This team has no agents yet; you can still set the team default.</span>}
      </div>

      {!table ? (
        <p className="mt-6 text-sm text-slate-400">This team has no tables yet.</p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-500">Whole table:</span>
            {MODES.map((m) => (
              <button key={m} className={btnGhost} aria-label={`Set whole table ${MODE_LABELS[m]}`} onClick={() => set(entriesAll(m))}>{MODE_LABELS[m]}</button>
            ))}
            <span className="mx-2 text-slate-300">|</span>
            <button className={btnGhost} data-testid="apply-all-table" disabled={ids.length === 0} onClick={() => askApplyAll(currentEntries(), `these ${table.name} settings`)}>
              Apply this table to all agents
            </button>
            {agent && (
              <button className={btnGhost} data-testid="reset-agent" disabled={!own} onClick={() => update((p) => resetAgentTable(p, subject, tableId))}>
                Reset to team default
              </button>
            )}
          </div>
          <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-sm" data-testid="perm-matrix">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Column</th>
                  {MODES.map((m) => (
                    <th key={m} className="px-3 py-2 text-center">{MODE_LABELS[m]}</th>
                  ))}
                  <th className="px-3 py-2">{subject === DEFAULT ? "" : "Source"}</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {columns.map((c) => {
                  const s = settingOf(c);
                  return (
                    <tr key={c.cellId} className="border-t border-slate-100" data-testid={`col-${c.cellId}`}>
                      <td className="px-3 py-2 text-slate-700">
                        {c.label}
                        {c.readOnly && <span className="ml-2 text-xs text-slate-400">set by the system</span>}
                      </td>
                      {MODES.map((m) => (
                        <td key={m} className="px-3 py-2 text-center">
                          <input
                            type="radio"
                            name={`m-${c.cellId}`}
                            aria-label={`${c.label} ${MODE_LABELS[m]}`}
                            checked={s.mode === m}
                            disabled={m === "edit" && c.readOnly}
                            onChange={() => set({ [c.cellId]: m })}
                          />
                        </td>
                      ))}
                      <td className="px-3 py-2 text-xs text-slate-400">
                        {subject === DEFAULT ? "" : s.source === "own" ? "own setting" : s.source === "default" ? "team default" : "default (read-only)"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button className="text-xs font-medium text-blue-600 hover:underline disabled:opacity-40" disabled={ids.length === 0} aria-label={`Set ${c.label} for all agents`} onClick={() => askApplyAll({ [c.cellId]: s.mode }, `“${c.label}” = ${MODE_LABELS[s.mode]}`)}>
                          Set for all agents
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {confirm && (
        <ConfirmModal title="Apply to all agents?" confirmLabel="Apply to all" onConfirm={doApplyAll} onClose={() => setConfirm(null)}>
          <p>
            Apply {confirm.what} to <strong>{ids.length}</strong> agent{ids.length === 1 ? "" : "s"} of {team.name}.
          </p>
          <p data-testid="replace-count" className={confirm.n ? "font-medium text-amber-700" : ""}>
            {confirm.n ? `This replaces ${confirm.n} existing setting${confirm.n === 1 ? "" : "s"} made for individual agents.` : "No individual settings will be replaced."}
          </p>
        </ConfirmModal>
      )}
    </div>
  );
}
