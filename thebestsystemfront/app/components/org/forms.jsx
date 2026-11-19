"use client";
import { useState } from "react";
import { ROLES, ROLE_LABELS, isTeamRole, rolesBelow } from "../../lib/org/roles.js";
import { Field, Modal, btnGhost, btnPrimary, inputCls } from "./ui.jsx";

// Shared shell: title, error banner, Cancel / Save. `submit()` returns a service result.
function FormShell({ title, submitLabel, onClose, submit, children, wide }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState({});
  const go = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    setErrors({});
    try {
      const r = await submit();
      if (r && !r.ok) {
        setErrors(r.errors || {});
        setMessage(r.message || "Something went wrong.");
      }
    } catch (err) {
      setMessage(err.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title={title} onClose={onClose} wide={wide}>
      <form onSubmit={go} className="space-y-4" noValidate>
        {message && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {message}
          </p>
        )}
        {children(errors)}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={busy} className={btnGhost}>
            Cancel
          </button>
          <button type="submit" disabled={busy} className={btnPrimary}>
            {busy ? "Saving…" : submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function BranchForm({ initial, onSubmit, onClose }) {
  const [name, setName] = useState(initial?.name || "");
  return (
    <FormShell title={initial ? "Rename branch" : "Add branch"} submitLabel={initial ? "Save" : "Create branch"} onClose={onClose} submit={() => onSubmit({ name })}>
      {(errors) => (
        <Field label="Branch name" error={errors.name}>
          <input autoFocus className={inputCls} value={name} onChange={(e) => setName(e.target.value)} aria-label="Branch name" />
        </Field>
      )}
    </FormShell>
  );
}

// teams: [{id,name,branchId}] ; branches: the branches the actor may add a team to
export function TeamForm({ initial, branches, onSubmit, onClose, branchName }) {
  const [name, setName] = useState(initial?.name || "");
  const [branchId, setBranchId] = useState(initial?.branchId || (branches.length === 1 ? branches[0].id : ""));
  return (
    <FormShell title={initial ? "Rename team" : "Add team"} submitLabel={initial ? "Save" : "Create team"} onClose={onClose} submit={() => onSubmit({ name, branchId })}>
      {(errors) => (
        <>
          <Field label="Team name" error={errors.name}>
            <input autoFocus className={inputCls} value={name} onChange={(e) => setName(e.target.value)} aria-label="Team name" />
          </Field>
          <Field label="Branch" error={errors.branchId} hint={initial ? "A team stays in its branch." : undefined}>
            {initial ? (
              <input className={inputCls} value={branchName(initial.branchId)} disabled aria-label="Branch" />
            ) : (
              <select className={inputCls} value={branchId} onChange={(e) => setBranchId(e.target.value)} aria-label="Branch">
                <option value="">— choose a branch —</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </>
      )}
    </FormShell>
  );
}

// teams: teams the actor may place a user in; branches: for branch-admin users (director only)
export function UserForm({ mode, actor, user, teams, branches, branchName, onSubmit, onClose }) {
  const editing = mode === "edit";
  const selfDirector = editing && user.id === actor.id; // a director can't change their own role
  const roleChoices = actor.role === "director" ? ROLES : rolesBelow(actor.role);
  const [f, setF] = useState({
    displayName: user?.displayName || "",
    username: user?.username || "",
    password: "",
    role: user?.role || roleChoices[roleChoices.length - 1],
    teamId: user?.teamId || (teams.length === 1 ? teams[0].id : ""),
    branchId: user?.branchId || (branches.length === 1 ? branches[0].id : ""),
  });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const teamRole = isTeamRole(f.role);

  const submit = () => {
    if (!editing) {
      return onSubmit({
        username: f.username,
        password: f.password,
        displayName: f.displayName,
        role: f.role,
        ...(teamRole ? { teamId: f.teamId } : {}),
        ...(f.role === "branchAdmin" ? { branchId: f.branchId } : {}),
      });
    }
    const patch = {};
    if (f.username !== user.username) patch.username = f.username;
    if (f.displayName !== user.displayName) patch.displayName = f.displayName;
    if (f.role !== user.role) patch.role = f.role;
    if (teamRole && (f.teamId !== user.teamId || f.role !== user.role)) patch.teamId = f.teamId;
    if (f.role === "branchAdmin" && (f.branchId !== user.branchId || f.role !== user.role)) patch.branchId = f.branchId;
    return onSubmit(patch);
  };

  return (
    <FormShell title={editing ? `Edit ${user.displayName}` : "Add user"} submitLabel={editing ? "Save changes" : "Create user"} onClose={onClose} submit={submit}>
      {(errors) => (
        <>
          <Field label="Name" error={errors.displayName} hint="Shown in history and lists. Optional - defaults to the username.">
            <input autoFocus className={inputCls} value={f.displayName} onChange={set("displayName")} aria-label="Name" />
          </Field>
          <Field label="Username" error={errors.username}>
            <input className={inputCls} value={f.username} onChange={set("username")} aria-label="Username" autoComplete="off" />
          </Field>
          {!editing && (
            <Field label="Password" error={errors.password} hint="At least 6 characters. Only an admin can change it later.">
              <input type="password" className={inputCls} value={f.password} onChange={set("password")} aria-label="Password" autoComplete="new-password" />
            </Field>
          )}
          <Field label="Role" error={errors.role} hint={selfDirector ? "You can't change your own role." : undefined}>
            <select className={inputCls} value={f.role} onChange={set("role")} disabled={selfDirector} aria-label="Role">
              {(selfDirector ? ROLES : roleChoices).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </Field>
          {teamRole && (
            <Field label="Team" error={errors.teamId}>
              <select className={inputCls} value={f.teamId} onChange={set("teamId")} aria-label="Team">
                <option value="">— choose a team —</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({branchName(t.branchId)})
                  </option>
                ))}
              </select>
            </Field>
          )}
          {f.role === "branchAdmin" && (
            <Field label="Branch" error={errors.branchId}>
              <select className={inputCls} value={f.branchId} onChange={set("branchId")} aria-label="Branch">
                <option value="">— choose a branch —</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </>
      )}
    </FormShell>
  );
}

export function PasswordForm({ user, onSubmit, onClose }) {
  const [pw, setPw] = useState("");
  const [again, setAgain] = useState("");
  return (
    <FormShell
      title={`Reset password for ${user.displayName}`}
      submitLabel="Set new password"
      onClose={onClose}
      submit={async () => (pw !== again ? { ok: false, message: "The two passwords don't match.", errors: { again: "Doesn't match." } } : onSubmit(pw))}
    >
      {(errors) => (
        <>
          <Field label="New password" error={errors.password} hint="At least 6 characters. Tell the user in person - it can't be read back later.">
            <input autoFocus type="password" className={inputCls} value={pw} onChange={(e) => setPw(e.target.value)} aria-label="New password" autoComplete="new-password" />
          </Field>
          <Field label="Repeat" error={errors.again}>
            <input type="password" className={inputCls} value={again} onChange={(e) => setAgain(e.target.value)} aria-label="Repeat password" autoComplete="new-password" />
          </Field>
        </>
      )}
    </FormShell>
  );
}
