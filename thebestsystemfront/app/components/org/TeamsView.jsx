"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { can } from "../../lib/org/permissions.js";
import { useOrgSnapshot } from "./useOrgSnapshot.js";
import { TeamForm } from "./forms.jsx";
import { ConfirmModal, EmptyRow, Notice, PageHeader, btnPrimary, fmtDate, linkBtn, linkDanger, tableCls, tdCls, thCls } from "./ui.jsx";

export default function TeamsView({ actor, mode = "active", startAdding = false }) {
  const router = useRouter();
  const s = useOrgSnapshot(actor);
  const [form, setForm] = useState(startAdding ? { kind: "add" } : null);
  const [confirm, setConfirm] = useState(null);
  const [notice, setNotice] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [busy, setBusy] = useState(false);
  const deleted = mode === "deleted";
  const list = deleted ? s.deletedTeams : s.teams;
  // branches this person may add a team to (director: all, branch admin: his own)
  const addBranches = s.branches.filter((b) => can(actor, "team.create", { branchId: b.id }, s.org));
  const closeForm = () => {
    setForm(null);
    if (startAdding) router.push("/teams/all");
  };

  const act = async (promise, okText) => {
    setBusy(true);
    setConfirmError("");
    const r = await s.mutate(promise);
    setBusy(false);
    if (r.ok) {
      setConfirm(null);
      setNotice(okText);
    } else setConfirmError(r.message);
    return r;
  };

  return (
    <div>
      <PageHeader title={deleted ? "Deleted Teams" : "All Teams"} count={list.length}>
        {!deleted && addBranches.length > 0 && (
          <button onClick={() => setForm({ kind: "add" })} className={btnPrimary}>
            Add team
          </button>
        )}
      </PageHeader>
      {s.error && <Notice kind="error">{s.error}</Notice>}
      {notice && <Notice>{notice}</Notice>}

      <div className="overflow-hidden rounded-xl border border-slate-100">
        <table className={tableCls}>
          <thead>
            <tr>
              <th className={thCls}>Name</th>
              <th className={thCls}>Branch</th>
              {!deleted && <th className={thCls}>Members</th>}
              <th className={thCls}>{deleted ? "Deleted on" : "Created"}</th>
              <th className={thCls}></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {s.loading && <EmptyRow cols={5}>Loading…</EmptyRow>}
            {!s.loading && list.length === 0 && <EmptyRow cols={5}>{deleted ? "No deleted teams." : "No teams yet."}</EmptyRow>}
            {list.map((t) => (
              <tr key={t.id} data-testid={`row-${t.name}-${s.branchName(t.branchId)}`}>
                <td className={`${tdCls} font-medium`}>{t.name}</td>
                <td className={tdCls}>{s.branchName(t.branchId)}</td>
                {!deleted && <td className={tdCls}>{s.users.filter((u) => u.teamId === t.id).length || (can(actor, "user.view", { teamId: t.id }, s.org) ? 0 : "—")}</td>}
                <td className={tdCls}>{fmtDate(deleted ? t.deletedAt : t.createdAt)}</td>
                <td className={`${tdCls} space-x-3 text-right`}>
                  {!deleted && can(actor, "team.edit", { teamId: t.id }, s.org) && (
                    <button className={linkBtn} aria-label={`Rename ${t.name}`} onClick={() => setForm({ kind: "rename", team: t })}>
                      Rename
                    </button>
                  )}
                  {!deleted && can(actor, "team.delete", { teamId: t.id }, s.org) && (
                    <button className={linkDanger} aria-label={`Delete ${t.name}`} onClick={() => { setConfirmError(""); setConfirm({ team: t }); }}>
                      Delete
                    </button>
                  )}
                  {deleted && can(actor, "team.restore", { teamId: t.id }, s.org) && (
                    <button className={linkBtn} aria-label={`Restore ${t.name}`} onClick={() => act(s.svc.restoreTeam(actor.id, t.id), `Team “${t.name}” restored.`)}>
                      Restore
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {deleted && s.error === "" && s.deletedTeams.some((t) => !s.branches.some((b) => b.id === t.branchId)) && (
        <p className="mt-3 text-xs text-slate-400">A team whose branch is also deleted can only be restored after its branch is.</p>
      )}

      {form && (
        <TeamForm
          initial={form.kind === "rename" ? form.team : null}
          branches={addBranches}
          branchName={s.branchName}
          onClose={closeForm}
          onSubmit={async ({ name, branchId }) => {
            const r = await s.mutate(form.kind === "rename" ? s.svc.updateTeam(actor.id, form.team.id, { name }) : s.svc.createTeam(actor.id, { name, branchId }));
            if (r.ok) {
              setNotice(form.kind === "rename" ? "Team renamed." : `Team “${r.value.name}” created.`);
              setForm(null);
              if (startAdding) router.push("/teams/all");
            }
            return r;
          }}
        />
      )}
      {confirm && (
        <ConfirmModal
          title={`Delete ${confirm.team.name}?`}
          confirmLabel="Delete team"
          danger
          busy={busy}
          error={confirmError}
          onClose={() => setConfirm(null)}
          onConfirm={() => act(s.svc.deleteTeam(actor.id, confirm.team.id), `Team “${confirm.team.name}” deleted.`)}
        >
          <p>It moves to Deleted Teams and can be restored. A team that still has users can't be deleted - move or delete them first.</p>
        </ConfirmModal>
      )}
    </div>
  );
}
