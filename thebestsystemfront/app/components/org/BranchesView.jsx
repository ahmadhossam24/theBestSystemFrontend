"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { can } from "../../lib/org/permissions.js";
import { useOrgSnapshot } from "./useOrgSnapshot.js";
import { BranchForm } from "./forms.jsx";
import { ConfirmModal, EmptyRow, Notice, PageHeader, btnPrimary, fmtDate, linkBtn, linkDanger, tableCls, tdCls, thCls } from "./ui.jsx";

// mode: "active" (All Branches) | "deleted" (Deleted Branches);  startAdding opens the Add form (the /branches/add page)
export default function BranchesView({ actor, mode = "active", startAdding = false }) {
  const router = useRouter();
  const s = useOrgSnapshot(actor);
  const [form, setForm] = useState(startAdding ? { kind: "add" } : null); // {kind:"add"} | {kind:"rename", branch}
  const [confirm, setConfirm] = useState(null); // {kind:"delete", branch}
  const [notice, setNotice] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [busy, setBusy] = useState(false);
  const deleted = mode === "deleted";
  const list = deleted ? s.deletedBranches : s.branches;
  const closeForm = () => {
    setForm(null);
    if (startAdding) router.push("/branches/all");
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

  if (actor.role !== "director" && actor.role !== "branchAdmin") {
    return (
      <div>
        <h1 className="text-xl font-semibold text-slate-800">{deleted ? "Deleted Branches" : "All Branches"}</h1>
        <p className="mt-3 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500" data-testid="no-access">
          Branches are managed by the director and branch admins.
        </p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={deleted ? "Deleted Branches" : "All Branches"} count={list.length}>
        {!deleted && can(actor, "branch.create", {}, s.org) && (
          <button onClick={() => setForm({ kind: "add" })} className={btnPrimary}>
            Add branch
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
              {!deleted && <th className={thCls}>Teams</th>}
              {!deleted && <th className={thCls}>Branch admins</th>}
              <th className={thCls}>{deleted ? "Deleted on" : "Created"}</th>
              <th className={thCls}></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {s.loading && <EmptyRow cols={5}>Loading…</EmptyRow>}
            {!s.loading && list.length === 0 && <EmptyRow cols={5}>{deleted ? "No deleted branches." : "No branches yet."}</EmptyRow>}
            {list.map((b) => (
              <tr key={b.id} data-testid={`row-${b.name}`}>
                <td className={`${tdCls} font-medium`}>{b.name}</td>
                {!deleted && <td className={tdCls}>{s.teams.filter((t) => t.branchId === b.id).length}</td>}
                {!deleted && <td className={tdCls}>{s.users.filter((u) => u.role === "branchAdmin" && u.branchId === b.id).map((u) => u.displayName).join(", ") || "—"}</td>}
                <td className={tdCls}>{fmtDate(deleted ? b.deletedAt : b.createdAt)}</td>
                <td className={`${tdCls} space-x-3 text-right`}>
                  {!deleted && can(actor, "branch.edit", { branchId: b.id }, s.org) && (
                    <button className={linkBtn} aria-label={`Rename ${b.name}`} onClick={() => setForm({ kind: "rename", branch: b })}>
                      Rename
                    </button>
                  )}
                  {!deleted && can(actor, "branch.delete", { branchId: b.id }, s.org) && (
                    <button className={linkDanger} aria-label={`Delete ${b.name}`} onClick={() => { setConfirmError(""); setConfirm({ branch: b }); }}>
                      Delete
                    </button>
                  )}
                  {deleted && can(actor, "branch.restore", { branchId: b.id }, s.org) && (
                    <button className={linkBtn} aria-label={`Restore ${b.name}`} onClick={() => act(s.svc.restoreBranch(actor.id, b.id), `Branch “${b.name}” restored.`)}>
                      Restore
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && (
        <BranchForm
          initial={form.kind === "rename" ? form.branch : null}
          onClose={closeForm}
          onSubmit={async ({ name }) => {
            const r = await s.mutate(form.kind === "rename" ? s.svc.updateBranch(actor.id, form.branch.id, { name }) : s.svc.createBranch(actor.id, { name }));
            if (r.ok) {
              setNotice(form.kind === "rename" ? "Branch renamed." : `Branch “${r.value.name}” created.`);
              setForm(null);
              if (startAdding) router.push("/branches/all");
            }
            return r;
          }}
        />
      )}
      {confirm && (
        <ConfirmModal
          title={`Delete ${confirm.branch.name}?`}
          confirmLabel="Delete branch"
          danger
          busy={busy}
          error={confirmError}
          onClose={() => setConfirm(null)}
          onConfirm={() => act(s.svc.deleteBranch(actor.id, confirm.branch.id), `Branch “${confirm.branch.name}” deleted.`)}
        >
          <p>It moves to Deleted Branches and can be restored. A branch that still has teams or branch admins can't be deleted.</p>
        </ConfirmModal>
      )}
    </div>
  );
}
