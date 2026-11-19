"use client";
import { useMemo, useState } from "react";
import { can } from "../../lib/org/permissions.js";
import { ROLES, ROLE_LABELS, isAdminRole } from "../../lib/org/roles.js";
import { useOrgSnapshot } from "./useOrgSnapshot.js";
import { PasswordForm, UserForm } from "./forms.jsx";
import { ConfirmModal, EmptyRow, Notice, PageHeader, RoleBadge, btnPrimary, fmtDate, inputCls, linkBtn, linkDanger, tableCls, tdCls, thCls } from "./ui.jsx";

export default function UsersView({ actor, mode = "active" }) {
  const s = useOrgSnapshot(actor);
  const [form, setForm] = useState(null); // {kind:"add"} | {kind:"edit", user} | {kind:"password", user}
  const [confirm, setConfirm] = useState(null); // {user}
  const [notice, setNotice] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [roleF, setRoleF] = useState("");
  const [teamF, setTeamF] = useState("");
  const deleted = mode === "deleted";
  const list = deleted ? s.deletedUsers : s.users;

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return list.filter(
      (u) => (!roleF || u.role === roleF) && (!teamF || u.teamId === teamF) && (!term || `${u.displayName} ${u.username}`.toLowerCase().includes(term))
    );
  }, [list, q, roleF, teamF]);

  if (!isAdminRole(actor.role)) {
    return (
      <div>
        <h1 className="text-xl font-semibold text-slate-800">{deleted ? "Deleted Users" : "All Users"}</h1>
        <p className="mt-3 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500" data-testid="no-access">
          Only admins can see and manage users.
        </p>
      </div>
    );
  }

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
      <PageHeader title={deleted ? "Deleted Users" : "All Users"} count={list.length}>
        {!deleted && (
          <button onClick={() => setForm({ kind: "add" })} className={btnPrimary}>
            Add user
          </button>
        )}
      </PageHeader>
      {s.error && <Notice kind="error">{s.error}</Notice>}
      {notice && <Notice>{notice}</Notice>}

      <div className="mb-3 flex flex-wrap gap-2">
        <input className={`${inputCls} !w-64`} placeholder="Search name or username" aria-label="Search users" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={`${inputCls} !w-44`} aria-label="Filter by role" value={roleF} onChange={(e) => setRoleF(e.target.value)}>
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        {(s.teams.length > 1 || s.deletedTeams.length > 0) && (
          <select className={`${inputCls} !w-52`} aria-label="Filter by team" value={teamF} onChange={(e) => setTeamF(e.target.value)}>
            <option value="">All teams</option>
            {s.org.teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({s.branchName(t.branchId)})
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-100">
        <table className={tableCls}>
          <thead>
            <tr>
              <th className={thCls}>Name</th>
              <th className={thCls}>Username</th>
              <th className={thCls}>Role</th>
              <th className={thCls}>Team</th>
              <th className={thCls}>Branch</th>
              <th className={thCls}>{deleted ? "Deleted on" : "Created"}</th>
              <th className={thCls}></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {s.loading && <EmptyRow cols={7}>Loading…</EmptyRow>}
            {!s.loading && shown.length === 0 && <EmptyRow cols={7}>{list.length === 0 ? (deleted ? "No deleted users." : "No users yet.") : "No users match."}</EmptyRow>}
            {shown.map((u) => {
              const self = u.id === actor.id;
              return (
                <tr key={u.id} data-testid={`row-${u.username}`}>
                  <td className={`${tdCls} font-medium`}>
                    {u.displayName} {self && <span className="text-xs font-normal text-slate-400">(you)</span>}
                  </td>
                  <td className={tdCls}>{u.username}</td>
                  <td className={tdCls}>
                    <RoleBadge role={u.role} />
                  </td>
                  <td className={tdCls}>{u.teamId ? s.teamName(u.teamId) : "—"}</td>
                  <td className={tdCls}>{u.branchId ? s.branchName(u.branchId) : "—"}</td>
                  <td className={tdCls}>{fmtDate(deleted ? u.deletedAt : u.createdAt)}</td>
                  <td className={`${tdCls} space-x-3 whitespace-nowrap text-right`}>
                    {!deleted && can(actor, "user.edit", { user: u }, s.org) && (
                      <button className={linkBtn} aria-label={`Edit ${u.username}`} onClick={() => setForm({ kind: "edit", user: u })}>
                        Edit
                      </button>
                    )}
                    {!deleted && can(actor, "user.resetPassword", { user: u }, s.org) && (
                      <button className={linkBtn} aria-label={`Reset password ${u.username}`} onClick={() => setForm({ kind: "password", user: u })}>
                        Reset password
                      </button>
                    )}
                    {!deleted && can(actor, "user.delete", { user: u }, s.org) && (
                      <button className={linkDanger} aria-label={`Delete ${u.username}`} onClick={() => { setConfirmError(""); setConfirm({ user: u }); }}>
                        Delete
                      </button>
                    )}
                    {deleted && can(actor, "user.restore", { user: u }, s.org) && (
                      <button className={linkBtn} aria-label={`Restore ${u.username}`} onClick={() => act(s.svc.restoreUser(actor.id, u.id), `${u.displayName} restored.`)}>
                        Restore
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {form && (form.kind === "add" || form.kind === "edit") && (
        <UserForm
          mode={form.kind}
          actor={actor}
          user={form.user}
          teams={s.teams}
          branches={s.branches}
          branchName={s.branchName}
          onClose={() => setForm(null)}
          onSubmit={async (payload) => {
            if (form.kind === "edit" && Object.keys(payload).length === 0) {
              setForm(null);
              return { ok: true };
            }
            const r = await s.mutate(form.kind === "edit" ? s.svc.updateUser(actor.id, form.user.id, payload) : s.svc.createUser(actor.id, payload));
            if (r.ok) {
              setNotice(form.kind === "edit" ? `${r.value.displayName} updated.` : `${r.value.displayName} created.`);
              setForm(null);
            }
            return r;
          }}
        />
      )}
      {form?.kind === "password" && (
        <PasswordForm
          user={form.user}
          onClose={() => setForm(null)}
          onSubmit={async (pw) => {
            const r = await s.mutate(s.svc.resetPassword(actor.id, form.user.id, pw));
            if (r.ok) {
              setNotice(`Password for ${form.user.displayName} changed.`);
              setForm(null);
            }
            return r;
          }}
        />
      )}
      {confirm && (
        <ConfirmModal
          title={`Delete ${confirm.user.displayName}?`}
          confirmLabel="Delete user"
          danger
          busy={busy}
          error={confirmError}
          onClose={() => setConfirm(null)}
          onConfirm={() => act(s.svc.deleteUser(actor.id, confirm.user.id), `${confirm.user.displayName} deleted.`)}
        >
          <p>They can no longer sign in. Their past work and history stay, and you can restore them from Deleted Users.</p>
        </ConfirmModal>
      )}
    </div>
  );
}
