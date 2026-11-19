"use client";
import { useEffect, useState } from "react";
import { isAdminRole } from "../../lib/org/roles.js";
import { useOrgSnapshot } from "./useOrgSnapshot.js";
import { EmptyRow, PageHeader, RoleBadge, inputCls, tableCls, tdCls, thCls } from "./ui.jsx";

// Members of one team. Admins see the full list; agents and super agents see the people rows can be assigned to.
export default function TeamMembersView({ actor }) {
  const s = useOrgSnapshot(actor);
  const [teamId, setTeamId] = useState("");
  const [others, setOthers] = useState([]);
  const admin = isAdminRole(actor.role);
  const effective = teamId || s.teams[0]?.id || "";

  useEffect(() => {
    if (admin || !effective) return;
    s.svc.listAgents(actor.id, effective).then((r) => setOthers(r.ok ? r.value : []));
  }, [admin, effective, actor.id, s.svc]);

  const members = admin ? s.users.filter((u) => u.teamId === effective).map((u) => ({ id: u.id, name: u.displayName, username: u.username, role: u.role })) : others;

  return (
    <div>
      <PageHeader title="Team Members" count={members.length}>
        <select className={`${inputCls} !w-60`} aria-label="Team" value={effective} onChange={(e) => setTeamId(e.target.value)}>
          {s.teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({s.branchName(t.branchId)})
            </option>
          ))}
        </select>
      </PageHeader>
      {!admin && <p className="mb-3 text-sm text-slate-400">You can see the agents and super agents of your team.</p>}
      <div className="overflow-hidden rounded-xl border border-slate-100">
        <table className={tableCls}>
          <thead>
            <tr>
              <th className={thCls}>Name</th>
              {admin && <th className={thCls}>Username</th>}
              <th className={thCls}>Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {s.loading && <EmptyRow cols={3}>Loading…</EmptyRow>}
            {!s.loading && members.length === 0 && <EmptyRow cols={3}>No members.</EmptyRow>}
            {members.map((m) => (
              <tr key={m.id} data-testid={`member-${m.name}`}>
                <td className={`${tdCls} font-medium`}>{m.name}</td>
                {admin && <td className={tdCls}>{m.username}</td>}
                <td className={tdCls}>
                  <RoleBadge role={m.role} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
