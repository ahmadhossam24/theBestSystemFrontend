"use client";
// Branch > Team chooser for the director and branch admins; a fixed label for everyone else.
const sel = "w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-300 disabled:opacity-60";

export default function ScopePicker({ user, scope, branches, teams, choose }) {
  const team = teams.find((t) => t.id === scope.teamId);
  if (scope.locked) {
    return (
      <div className="px-4 py-2 text-xs text-slate-500" data-testid="scope-fixed">
        <div className="text-slate-400">Working in</div>
        <div className="font-medium text-slate-700">{team ? `${team.name} · ${team.branchName || ""}` : "—"}</div>
      </div>
    );
  }
  const teamsOfBranch = teams.filter((t) => t.branchId === scope.branchId);
  return (
    <div className="space-y-1.5 px-4 py-2" data-testid="scope-picker">
      <div className="text-xs text-slate-400">Working in</div>
      {user.role === "director" ? (
        <select
          aria-label="Scope branch"
          className={sel}
          value={scope.branchId || ""}
          onChange={(e) => {
            const first = teams.find((t) => t.branchId === e.target.value);
            choose({ branchId: e.target.value, teamId: first?.id || null });
          }}
        >
          {branches.length === 0 && <option value="">No branches</option>}
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      ) : (
        <div className="text-xs font-medium text-slate-700">{branches[0]?.name}</div>
      )}
      <select aria-label="Scope team" className={sel} value={scope.teamId || ""} onChange={(e) => choose({ branchId: scope.branchId, teamId: e.target.value })} disabled={teamsOfBranch.length === 0}>
        {teamsOfBranch.length === 0 && <option value="">No teams</option>}
        {teamsOfBranch.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
    </div>
  );
}
