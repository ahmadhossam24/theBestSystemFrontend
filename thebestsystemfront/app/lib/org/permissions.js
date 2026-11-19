// ---------------------------------------------------------------------------
// Every "may this user do this?" question is answered HERE and nowhere else.
// Pure functions - the screens use them now, a real server can reuse them later.
//
//   can(actor, action, resource, org) -> boolean      (deny by default)
//
//   actor     a user ({ id, role, branchId, teamId, deletedAt })
//   resource  what it is about: { teamId } | { branchId } | { user, next } | { role, teamId, branchId }
//   org       { branches, teams, users } - used to find which branch a team is in
// ---------------------------------------------------------------------------
import { RANK, isAdminRole, isTeamRole } from "./roles.js";

export const ACTIONS = [
  "branch.view", "branch.create", "branch.edit", "branch.delete", "branch.restore",
  "team.view", "team.create", "team.edit", "team.delete", "team.restore",
  "user.view", "user.create", "user.edit", "user.delete", "user.restore", "user.resetPassword",
  "agents.list",
  "table.view", "table.create", "table.editStructure", "table.delete", "defaultColumns.edit",
  "row.view", "row.edit", "row.import", "row.export", "row.bulkEdit", "row.transfer",
  "agentPerms.manage",
  "audit.view",
];

const teamOf = (org, teamId) => (teamId ? org?.teams?.find((t) => t.id === teamId) || null : null);

// A target's place in the org: { teamId, branchId } (either may be null).
export function placementOf(target, org) {
  if (!target) return { teamId: null, branchId: null };
  const teamId = target.teamId ?? null;
  const branchId = target.branchId ?? teamOf(org, teamId)?.branchId ?? null;
  return { teamId, branchId };
}

// Is this place inside the actor's reach?
export function inScope(actor, target, org) {
  if (!actor || actor.deletedAt) return false;
  const { teamId, branchId } = placementOf(target, org);
  switch (actor.role) {
    case "director":
      return true;
    case "branchAdmin":
      return !!actor.branchId && branchId === actor.branchId;
    case "teamAdmin":
    case "superAgent":
    case "agent":
      return !!actor.teamId && teamId === actor.teamId;
    default:
      return false;
  }
}

// Where a NEW/changed user would sit, from its role + the ids given.
const userPlacement = (role, p, org) => {
  if (role === "director") return { teamId: null, branchId: null };
  if (role === "branchAdmin") return { teamId: null, branchId: p.branchId ?? null };
  return placementOf({ teamId: p.teamId }, org);
};

// May `actor` hold authority over `target` user (edit / delete / reset ...)?
function manages(actor, target, org) {
  if (actor.id === target.id) return false; // nobody manages themselves
  if (actor.role === "director") return true;
  if (!isAdminRole(actor.role)) return false;
  if (RANK[target.role] >= RANK[actor.role]) return false; // only strictly lower ranks
  return inScope(actor, placementOf(target, org), org);
}

// May `actor` put someone in `role` at the given place?
function mayPlace(actor, role, p, org) {
  if (actor.role === "director") return true;
  if (!isAdminRole(actor.role)) return false;
  if (RANK[role] >= RANK[actor.role]) return false;
  if (role === "branchAdmin") return false; // only the director makes these (also covered by rank)
  const place = userPlacement(role, p, org);
  if (!isTeamRole(role) || !place.teamId) return false;
  return inScope(actor, place, org);
}

export function can(actor, action, resource = {}, org = {}) {
  if (!actor || actor.deletedAt) return false;
  const role = actor.role;
  const admin = isAdminRole(role);
  const r = resource || {};

  switch (action) {
    // ---- branches: the director's alone (others may look at their own) ----
    case "branch.create":
    case "branch.edit":
    case "branch.delete":
    case "branch.restore":
      return role === "director";
    case "branch.view":
      return role === "director" || (role === "branchAdmin" && r.branchId === actor.branchId);

    // ---- teams: director anywhere, branch admin inside his branch ----
    case "team.create":
    case "team.edit":
    case "team.delete":
    case "team.restore":
      return role === "director" || (role === "branchAdmin" && placementOf(r, org).branchId === actor.branchId);
    case "team.view":
      return inScope(actor, r, org);

    // ---- users ----
    case "user.view":
      return admin && inScope(actor, r, org);
    case "user.create":
      return mayPlace(actor, r.role, r, org);
    case "user.edit": {
      if (!r.user) return false;
      // a director may edit their own profile (name, username) but not their own role
      if (r.user.id === actor.id) return role === "director" && (!r.next || r.next.role === undefined || r.next.role === role);
      if (!manages(actor, r.user, org)) return false;
      const n = r.next; // optional: the role / place it is being changed to
      return !n || mayPlace(actor, n.role ?? r.user.role, { teamId: n.teamId ?? r.user.teamId, branchId: n.branchId ?? r.user.branchId }, org);
    }
    case "user.delete":
    case "user.restore":
      return !!r.user && manages(actor, r.user, org);
    case "user.resetPassword":
      // admins reset passwords of those below them; a director may also change their own
      return !!r.user && (manages(actor, r.user, org) || (role === "director" && r.user.id === actor.id));
    case "agents.list": // the assignable-agent dropdown: anyone, for their own scope
      return inScope(actor, r, org);

    // ---- tables / columns (each belongs to ONE team) ----
    case "table.view":
    case "row.view":
    case "row.transfer":
      return inScope(actor, r, org);
    case "table.create":
    case "table.editStructure":
    case "table.delete":
    case "defaultColumns.edit":
    case "row.import":
    case "row.export":
    case "row.bulkEdit":
    case "agentPerms.manage":
      return admin && inScope(actor, r, org);
    case "row.edit":
      if (!inScope(actor, r, org)) return false;
      if (role === "agent") return r.agentCanEdit === true; // decided by the agent-permission settings
      return true;

    case "audit.view":
      return admin;

    default:
      return false; // unknown action: deny
  }
}

// What an actor may list, as a filter for the screens: all | one branch | one team.
export function visibleScope(actor) {
  if (!actor || actor.deletedAt) return { kind: "none" };
  if (actor.role === "director") return { kind: "all" };
  if (actor.role === "branchAdmin") return { kind: "branch", branchId: actor.branchId };
  return { kind: "team", teamId: actor.teamId };
}

export const teamsInScope = (actor, org) => (org.teams || []).filter((t) => inScope(actor, t, org));
