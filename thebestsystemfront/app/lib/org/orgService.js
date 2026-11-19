// ---------------------------------------------------------------------------
// The org service: branches, teams, users, login, audit log.
//
//   const org = createOrgService(repo)         repo = idbRepo (browser) or memoryRepo (tests)
//
// Every method takes the ACTING user's id first. The actor is re-read from storage on every
// call, so a changed rank or a deleted account takes effect immediately, and every action is
// checked with permissions.js. Results are { ok: true, value } or
// { ok: false, code, message, errors? }  with code: forbidden | invalid | not_found | conflict | blocked.
// Passwords are hashed; no result ever contains a password or hash.
// ---------------------------------------------------------------------------
import { RANK, ROLES, isAdminRole, isRole, isTeamRole } from "./roles.js";
import { can, inScope } from "./permissions.js";
import { hashPassword, verifyPassword } from "./password.js";
import { checkDisplayName, checkName, checkPassword, checkUsername, cleanName, usernameKey } from "./validation.js";

const ok = (value) => ({ ok: true, value });
const fail = (code, message, errors) => ({ ok: false, code, message, ...(errors ? { errors } : {}) });
const FORBIDDEN = () => fail("forbidden", "You are not allowed to do that.");
const NOT_FOUND = (what) => fail("not_found", `${what} not found.`);

const randomId = (prefix) => {
  const b = crypto.getRandomValues(new Uint8Array(12));
  return `${prefix}_${[...b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
};

export const publicUser = (u) =>
  u && {
    id: u.id,
    username: u.username,
    displayName: u.displayName || u.username,
    role: u.role,
    branchId: u.branchId ?? null,
    teamId: u.teamId ?? null,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    deletedAt: u.deletedAt ?? null,
  };

const nameOf = (u) => u.displayName || u.username;
const byName = (a, b) => a.name.localeCompare(b.name);

export function createOrgService(repo, opts = {}) {
  const now = opts.now || (() => new Date().toISOString());
  const newId = opts.newId || randomId;
  // Stage 4 plugs in "does this team still own tables with rows?" so such a team can't be deleted.
  const teamHasData = opts.teamHasData || (async () => false);

  const loadOrg = async () => {
    const [branches, teams, users] = await Promise.all([repo.all("branches"), repo.all("teams"), repo.all("users")]);
    return { branches, teams, users };
  };
  const actorIn = (org, id) => {
    const u = org.users.find((x) => x.id === id);
    return u && !u.deletedAt ? u : null;
  };
  const activeDirectors = (org) => org.users.filter((u) => u.role === "director" && !u.deletedAt);

  const log = (actor, type, target, extra = {}) => ({
    store: "log",
    put: {
      id: newId("log"),
      at: now(),
      byId: actor.id,
      byName: nameOf(actor),
      type,
      targetType: target.type,
      targetId: target.id,
      targetName: target.name,
      branchId: extra.branchId ?? null,
      teamId: extra.teamId ?? null,
      details: extra.details || "",
    },
  });

  const commit = async (ops) => {
    try {
      await repo.write(ops);
      return null;
    } catch (e) {
      if (e?.name === "ConstraintError") return fail("conflict", "That username is already taken (it may belong to a deleted user).", { username: "Already taken." });
      throw e;
    }
  };

  const hash = async (pw) => {
    if (!globalThis.crypto?.subtle) throw new Error("Password hashing needs a secure page: open the app on localhost or over https.");
    return hashPassword(pw);
  };

  // Where a user of `role` sits, validated against the org. -> { ok, branchId, teamId } | { ok:false, errors }
  const place = (org, role, input) => {
    if (role === "director") return { ok: true, branchId: null, teamId: null };
    if (role === "branchAdmin") {
      const b = org.branches.find((x) => x.id === input.branchId);
      if (!b || b.deletedAt) return { ok: false, errors: { branchId: "Choose a branch." } };
      return { ok: true, branchId: b.id, teamId: null };
    }
    const t = org.teams.find((x) => x.id === input.teamId);
    const b = t && org.branches.find((x) => x.id === t.branchId);
    if (!t || t.deletedAt || !b || b.deletedAt) return { ok: false, errors: { teamId: "Choose a team." } };
    return { ok: true, branchId: t.branchId, teamId: t.id };
  };

  // ------------------------------------------------------------------ session
  const svc = {
    async needsFirstRun() {
      return (await repo.all("users")).length === 0;
    },

    // The very first account (the director). Only works while there are no users at all.
    async createFirstDirector({ username, password, displayName }) {
      const org = await loadOrg();
      if (org.users.length > 0) return fail("blocked", "The system is already set up.");
      const errors = {};
      const eu = checkUsername(username), ep = checkPassword(password), ed = checkDisplayName(displayName);
      if (eu) errors.username = eu;
      if (ep) errors.password = ep;
      if (ed) errors.displayName = ed;
      if (Object.keys(errors).length) return fail("invalid", "Please fix the highlighted fields.", errors);
      const t = now();
      const user = {
        id: newId("usr"), username: String(username).trim(), usernameKey: usernameKey(username), displayName: cleanName(displayName) || String(username).trim(),
        role: "director", branchId: null, teamId: null, password: await hash(password), createdAt: t, updatedAt: t, deletedAt: null, createdBy: null,
      };
      const failed = await commit([{ store: "users", put: user }, log(user, "user.create", { type: "user", id: user.id, name: nameOf(user) }, { details: "first director" })]);
      return failed || ok(publicUser(user));
    },

    async authenticate(username, password) {
      const key = usernameKey(username);
      const user = (await repo.all("users")).find((u) => u.usernameKey === key);
      const good = user && !user.deletedAt && (await verifyPassword(String(password ?? ""), user.password));
      return good ? ok(publicUser(user)) : fail("invalid", "Wrong username or password.");
    },

    async getUser(userId) {
      const u = await repo.get("users", userId);
      return u && !u.deletedAt ? publicUser(u) : null;
    },

    // TEMPORARY (removed when real sign-in arrives in the next stage): lets the "switch user"
    // bar list every active account so the pages can be tried as each role. Never returns secrets.
    async tempListAllForSwitcher() {
      const org = await loadOrg();
      return org.users.filter((u) => !u.deletedAt).map((u) => ({ id: u.id, username: u.username, name: nameOf(u), role: u.role, teamId: u.teamId ?? null }))
        .sort((a, b) => RANK[b.role] - RANK[a.role] || a.name.localeCompare(b.name));
    },

    // ------------------------------------------------------------------ branches
    async listBranches(actorId, { deleted = false } = {}) {
      const org = await loadOrg();
      const actor = actorIn(org, actorId);
      if (!actor) return FORBIDDEN();
      return ok(org.branches.filter((b) => !!b.deletedAt === deleted && can(actor, "branch.view", { branchId: b.id }, org)).sort(byName));
    },

    async createBranch(actorId, { name }) {
      const org = await loadOrg();
      const actor = actorIn(org, actorId);
      if (!actor || !can(actor, "branch.create", {}, org)) return FORBIDDEN();
      const e = checkName(name, "Branch");
      if (e) return fail("invalid", e, { name: e });
      const n = cleanName(name);
      if (org.branches.some((b) => !b.deletedAt && b.name.toLowerCase() === n.toLowerCase())) return fail("conflict", "A branch with this name already exists.", { name: "Already exists." });
      const t = now();
      const branch = { id: newId("brn"), name: n, createdAt: t, updatedAt: t, deletedAt: null };
      await repo.write([{ store: "branches", put: branch }, log(actor, "branch.create", { type: "branch", id: branch.id, name: n }, { branchId: branch.id })]);
      return ok(branch);
    },

    async updateBranch(actorId, id, { name }) {
      const org = await loadOrg();
      const actor = actorIn(org, actorId);
      const b = org.branches.find((x) => x.id === id);
      if (!actor || !can(actor, "branch.edit", { branchId: id }, org)) return FORBIDDEN();
      if (!b || b.deletedAt) return NOT_FOUND("Branch");
      const e = checkName(name, "Branch");
      if (e) return fail("invalid", e, { name: e });
      const n = cleanName(name);
      if (org.branches.some((x) => x.id !== id && !x.deletedAt && x.name.toLowerCase() === n.toLowerCase())) return fail("conflict", "A branch with this name already exists.", { name: "Already exists." });
      const next = { ...b, name: n, updatedAt: now() };
      await repo.write([{ store: "branches", put: next }, log(actor, "branch.edit", { type: "branch", id, name: n }, { branchId: id, details: `renamed from "${b.name}"` })]);
      return ok(next);
    },

    async deleteBranch(actorId, id) {
      const org = await loadOrg();
      const actor = actorIn(org, actorId);
      const b = org.branches.find((x) => x.id === id);
      if (!actor || !can(actor, "branch.delete", { branchId: id }, org)) return FORBIDDEN();
      if (!b || b.deletedAt) return NOT_FOUND("Branch");
      const teams = org.teams.filter((t) => t.branchId === id && !t.deletedAt).length;
      const admins = org.users.filter((u) => u.branchId === id && u.role === "branchAdmin" && !u.deletedAt).length;
      if (teams || admins) return fail("blocked", `This branch still has ${teams} team(s) and ${admins} branch admin(s). Remove or move them first.`);
      const next = { ...b, deletedAt: now(), updatedAt: now() };
      await repo.write([{ store: "branches", put: next }, log(actor, "branch.delete", { type: "branch", id, name: b.name }, { branchId: id })]);
      return ok(next);
    },

    async restoreBranch(actorId, id) {
      const org = await loadOrg();
      const actor = actorIn(org, actorId);
      const b = org.branches.find((x) => x.id === id);
      if (!actor || !can(actor, "branch.restore", { branchId: id }, org)) return FORBIDDEN();
      if (!b || !b.deletedAt) return NOT_FOUND("Deleted branch");
      if (org.branches.some((x) => !x.deletedAt && x.name.toLowerCase() === b.name.toLowerCase())) return fail("conflict", "An active branch already uses this name. Rename it first.");
      const next = { ...b, deletedAt: null, updatedAt: now() };
      await repo.write([{ store: "branches", put: next }, log(actor, "branch.restore", { type: "branch", id, name: b.name }, { branchId: id })]);
      return ok(next);
    },

    // ------------------------------------------------------------------ teams
    async listTeams(actorId, { deleted = false, branchId } = {}) {
      const org = await loadOrg();
      const actor = actorIn(org, actorId);
      if (!actor) return FORBIDDEN();
      return ok(
        org.teams.filter((t) => !!t.deletedAt === deleted && (!branchId || t.branchId === branchId) && can(actor, "team.view", { teamId: t.id }, org))
          .map((t) => ({ ...t, branchName: org.branches.find((b) => b.id === t.branchId)?.name || "" }))
          .sort(byName)
      );
    },

    async createTeam(actorId, { name, branchId }) {
      const org = await loadOrg();
      const actor = actorIn(org, actorId);
      if (!actor || !can(actor, "team.create", { branchId }, org)) return FORBIDDEN();
      const e = checkName(name, "Team");
      if (e) return fail("invalid", e, { name: e });
      const b = org.branches.find((x) => x.id === branchId);
      if (!b || b.deletedAt) return fail("invalid", "Choose a branch.", { branchId: "Choose a branch." });
      const n = cleanName(name);
      if (org.teams.some((t) => !t.deletedAt && t.branchId === branchId && t.name.toLowerCase() === n.toLowerCase())) return fail("conflict", "This branch already has a team with this name.", { name: "Already exists." });
      const t = now();
      const team = { id: newId("team"), name: n, branchId, createdAt: t, updatedAt: t, deletedAt: null };
      await repo.write([{ store: "teams", put: team }, log(actor, "team.create", { type: "team", id: team.id, name: n }, { branchId, teamId: team.id })]);
      return ok(team);
    },

    async updateTeam(actorId, id, { name }) {
      const org = await loadOrg();
      const actor = actorIn(org, actorId);
      const team = org.teams.find((x) => x.id === id);
      if (!actor || !can(actor, "team.edit", { teamId: id }, org)) return FORBIDDEN();
      if (!team || team.deletedAt) return NOT_FOUND("Team");
      const e = checkName(name, "Team");
      if (e) return fail("invalid", e, { name: e });
      const n = cleanName(name);
      if (org.teams.some((t) => t.id !== id && !t.deletedAt && t.branchId === team.branchId && t.name.toLowerCase() === n.toLowerCase())) return fail("conflict", "This branch already has a team with this name.", { name: "Already exists." });
      const next = { ...team, name: n, updatedAt: now() };
      await repo.write([{ store: "teams", put: next }, log(actor, "team.edit", { type: "team", id, name: n }, { branchId: team.branchId, teamId: id, details: `renamed from "${team.name}"` })]);
      return ok(next);
    },

    async deleteTeam(actorId, id) {
      const org = await loadOrg();
      const actor = actorIn(org, actorId);
      const team = org.teams.find((x) => x.id === id);
      if (!actor || !can(actor, "team.delete", { teamId: id }, org)) return FORBIDDEN();
      if (!team || team.deletedAt) return NOT_FOUND("Team");
      const members = org.users.filter((u) => u.teamId === id && !u.deletedAt).length;
      if (members) return fail("blocked", `This team still has ${members} user(s). Delete or move them first.`);
      if (await teamHasData(id)) return fail("blocked", "This team still has tables with data. Remove them first.");
      const next = { ...team, deletedAt: now(), updatedAt: now() };
      await repo.write([{ store: "teams", put: next }, log(actor, "team.delete", { type: "team", id, name: team.name }, { branchId: team.branchId, teamId: id })]);
      return ok(next);
    },

    async restoreTeam(actorId, id) {
      const org = await loadOrg();
      const actor = actorIn(org, actorId);
      const team = org.teams.find((x) => x.id === id);
      if (!actor || !can(actor, "team.restore", { teamId: id }, org)) return FORBIDDEN();
      if (!team || !team.deletedAt) return NOT_FOUND("Deleted team");
      const b = org.branches.find((x) => x.id === team.branchId);
      if (!b || b.deletedAt) return fail("blocked", "Restore its branch first.");
      if (org.teams.some((t) => !t.deletedAt && t.branchId === team.branchId && t.name.toLowerCase() === team.name.toLowerCase())) return fail("conflict", "An active team in this branch already uses this name. Rename it first.");
      const next = { ...team, deletedAt: null, updatedAt: now() };
      await repo.write([{ store: "teams", put: next }, log(actor, "team.restore", { type: "team", id, name: team.name }, { branchId: team.branchId, teamId: id })]);
      return ok(next);
    },

    // ------------------------------------------------------------------ users
    async listUsers(actorId, { deleted = false, teamId, branchId, role } = {}) {
      const org = await loadOrg();
      const actor = actorIn(org, actorId);
      if (!actor || !isAdminRole(actor.role)) return FORBIDDEN();
      const list = org.users.filter(
        (u) => !!u.deletedAt === deleted && (!teamId || u.teamId === teamId) && (!branchId || u.branchId === branchId) && (!role || u.role === role) && can(actor, "user.view", u, org)
      );
      return ok(list.map(publicUser).map((u) => ({ ...u, name: u.displayName })).sort((a, b) => RANK[b.role] - RANK[a.role] || byName(a, b)));
    },

    // Who a row of this team can be assigned to: its agents and super agents (any role may ask for its own team).
    async listAgents(actorId, teamId) {
      const org = await loadOrg();
      const actor = actorIn(org, actorId);
      if (!actor || !can(actor, "agents.list", { teamId }, org)) return FORBIDDEN();
      return ok(
        org.users
          .filter((u) => u.teamId === teamId && !u.deletedAt && (u.role === "agent" || u.role === "superAgent"))
          .map((u) => ({ id: u.id, name: nameOf(u), role: u.role }))
          .sort(byName)
      );
    },

    async createUser(actorId, input) {
      const org = await loadOrg();
      const actor = actorIn(org, actorId);
      if (!actor) return FORBIDDEN();
      if (!isRole(input?.role)) return fail("invalid", "Choose a role.", { role: "Choose a role." });
      const p = place(org, input.role, input);
      if (!can(actor, "user.create", { role: input.role, teamId: p.teamId ?? input.teamId, branchId: p.branchId ?? input.branchId }, org)) return FORBIDDEN();
      const errors = { ...(p.ok ? {} : p.errors) };
      const eu = checkUsername(input.username), ep = checkPassword(input.password), ed = checkDisplayName(input.displayName);
      if (eu) errors.username = eu;
      if (ep) errors.password = ep;
      if (ed) errors.displayName = ed;
      if (Object.keys(errors).length) return fail("invalid", "Please fix the highlighted fields.", errors);
      const key = usernameKey(input.username);
      if (org.users.some((u) => u.usernameKey === key)) return fail("conflict", "That username is already taken (it may belong to a deleted user).", { username: "Already taken." });
      const t = now();
      const user = {
        id: newId("usr"), username: String(input.username).trim(), usernameKey: key, displayName: cleanName(input.displayName) || String(input.username).trim(),
        role: input.role, branchId: p.branchId, teamId: p.teamId, password: await hash(input.password), createdAt: t, updatedAt: t, deletedAt: null, createdBy: actor.id,
      };
      const failed = await commit([{ store: "users", put: user }, log(actor, "user.create", { type: "user", id: user.id, name: nameOf(user) }, { branchId: p.branchId, teamId: p.teamId, details: `role: ${user.role}` })]);
      return failed || ok(publicUser(user));
    },

    // patch: any of { username, displayName, role, teamId, branchId }. Changing role or team = "changes rank / moves user".
    async updateUser(actorId, userId, patch = {}) {
      const org = await loadOrg();
      const actor = actorIn(org, actorId);
      const target = org.users.find((u) => u.id === userId);
      if (!actor) return FORBIDDEN();
      if (!target || target.deletedAt) return NOT_FOUND("User");

      const nextRole = patch.role ?? target.role;
      if (!isRole(nextRole)) return fail("invalid", "Choose a role.", { role: "Choose a role." });
      const moving = patch.role !== undefined || patch.teamId !== undefined || patch.branchId !== undefined;
      const p = place(org, nextRole, { teamId: patch.teamId ?? target.teamId, branchId: patch.branchId ?? target.branchId });
      const next = moving ? { role: nextRole, teamId: p.teamId ?? patch.teamId ?? target.teamId, branchId: p.branchId ?? patch.branchId ?? target.branchId } : undefined;
      if (!can(actor, "user.edit", { user: target, next }, org)) return FORBIDDEN();

      const errors = {};
      if (moving && !p.ok) Object.assign(errors, p.errors);
      if (patch.username !== undefined) {
        const e = checkUsername(patch.username);
        if (e) errors.username = e;
      }
      if (patch.displayName !== undefined) {
        const e = checkDisplayName(patch.displayName);
        if (e) errors.displayName = e;
      }
      if (Object.keys(errors).length) return fail("invalid", "Please fix the highlighted fields.", errors);
      if (target.role === "director" && nextRole !== "director" && activeDirectors(org).length <= 1) return fail("blocked", "There must always be at least one director.");
      if (patch.username !== undefined) {
        const key = usernameKey(patch.username);
        if (org.users.some((u) => u.id !== userId && u.usernameKey === key)) return fail("conflict", "That username is already taken (it may belong to a deleted user).", { username: "Already taken." });
      }

      const updated = {
        ...target,
        ...(patch.username !== undefined ? { username: String(patch.username).trim(), usernameKey: usernameKey(patch.username) } : {}),
        ...(patch.displayName !== undefined ? { displayName: cleanName(patch.displayName) || (patch.username ?? target.username) } : {}),
        ...(moving ? { role: nextRole, branchId: p.branchId, teamId: p.teamId } : {}),
        updatedAt: now(),
      };
      const bits = [];
      if (updated.role !== target.role) bits.push(`role: ${target.role} -> ${updated.role}`);
      if (updated.teamId !== target.teamId) bits.push("moved team");
      if (updated.username !== target.username) bits.push(`username: ${target.username} -> ${updated.username}`);
      if (updated.displayName !== target.displayName) bits.push("name changed");
      const failed = await commit([{ store: "users", put: updated }, log(actor, "user.edit", { type: "user", id: userId, name: nameOf(updated) }, { branchId: updated.branchId, teamId: updated.teamId, details: bits.join("; ") })]);
      return failed || ok(publicUser(updated));
    },

    async resetPassword(actorId, userId, newPassword) {
      const org = await loadOrg();
      const actor = actorIn(org, actorId);
      const target = org.users.find((u) => u.id === userId);
      if (!actor) return FORBIDDEN();
      if (!target || target.deletedAt) return NOT_FOUND("User");
      if (!can(actor, "user.resetPassword", { user: target }, org)) return FORBIDDEN();
      const e = checkPassword(newPassword);
      if (e) return fail("invalid", e, { password: e });
      const updated = { ...target, password: await hash(newPassword), updatedAt: now() };
      await repo.write([{ store: "users", put: updated }, log(actor, "user.resetPassword", { type: "user", id: userId, name: nameOf(target) }, { branchId: target.branchId, teamId: target.teamId })]);
      return ok(publicUser(updated));
    },

    async deleteUser(actorId, userId) {
      const org = await loadOrg();
      const actor = actorIn(org, actorId);
      const target = org.users.find((u) => u.id === userId);
      if (!actor) return FORBIDDEN();
      if (!target || target.deletedAt) return NOT_FOUND("User");
      if (!can(actor, "user.delete", { user: target }, org)) return FORBIDDEN();
      if (target.role === "director" && activeDirectors(org).length <= 1) return fail("blocked", "There must always be at least one director.");
      const updated = { ...target, deletedAt: now(), updatedAt: now() };
      await repo.write([{ store: "users", put: updated }, log(actor, "user.delete", { type: "user", id: userId, name: nameOf(target) }, { branchId: target.branchId, teamId: target.teamId })]);
      return ok(publicUser(updated));
    },

    async restoreUser(actorId, userId) {
      const org = await loadOrg();
      const actor = actorIn(org, actorId);
      const target = org.users.find((u) => u.id === userId);
      if (!actor) return FORBIDDEN();
      if (!target || !target.deletedAt) return NOT_FOUND("Deleted user");
      if (!can(actor, "user.restore", { user: target }, org)) return FORBIDDEN();
      const p = place(org, target.role, target);
      if (!p.ok) return fail("blocked", isTeamRole(target.role) ? "Restore this user's team first." : "Restore this user's branch first.");
      const updated = { ...target, deletedAt: null, updatedAt: now() };
      await repo.write([{ store: "users", put: updated }, log(actor, "user.restore", { type: "user", id: userId, name: nameOf(target) }, { branchId: target.branchId, teamId: target.teamId })]);
      return ok(publicUser(updated));
    },

    // ------------------------------------------------------------------ audit log
    async listLog(actorId, { limit = 200 } = {}) {
      const org = await loadOrg();
      const actor = actorIn(org, actorId);
      if (!actor || !can(actor, "audit.view", {}, org)) return FORBIDDEN();
      const all = await repo.all("log");
      const mine = all.filter((e) => inScope(actor, { branchId: e.branchId, teamId: e.teamId }, org) || (actor.role === "director"));
      return ok(mine.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)).slice(0, limit));
    },
  };
  return svc;
}

export { ROLES };
