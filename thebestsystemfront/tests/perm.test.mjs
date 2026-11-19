import { can, ACTIONS, visibleScope } from "./org/permissions.js";
import { ROLES, RANK, isAdminRole } from "./org/roles.js";

let pass = 0, fail = 0;
const bad = [];
const check = (name, got, want) => { if (got === want) pass++; else { fail++; if (bad.length < 25) bad.push(`${name}: got ${got}, want ${want}`); } };

// ---- fixture: 2 branches, 3 teams, 12 people -------------------------------------------
const org = {
  branches: [{ id: "B1" }, { id: "B2" }],
  teams: [{ id: "T1", branchId: "B1" }, { id: "T2", branchId: "B1" }, { id: "T3", branchId: "B2" }],
  users: [],
};
const U = (id, role, branchId = null, teamId = null) => ({ id, role, branchId, teamId, deletedAt: null });
const users = {
  D: U("D", "director"), D2: U("D2", "director"),
  BA1: U("BA1", "branchAdmin", "B1"), BA1b: U("BA1b", "branchAdmin", "B1"), BA2: U("BA2", "branchAdmin", "B2"),
  TA1: U("TA1", "teamAdmin", "B1", "T1"), TA1b: U("TA1b", "teamAdmin", "B1", "T1"), TA2: U("TA2", "teamAdmin", "B1", "T2"), TA3: U("TA3", "teamAdmin", "B2", "T3"),
  SA1: U("SA1", "superAgent", "B1", "T1"), SA3: U("SA3", "superAgent", "B2", "T3"),
  AG1: U("AG1", "agent", "B1", "T1"), AG2: U("AG2", "agent", "B1", "T2"), AG3: U("AG3", "agent", "B2", "T3"),
};
org.users = Object.values(users);
const ids = Object.keys(users);
const TEAMS = ["T1", "T2", "T3"], BRANCHES = ["B1", "B2"];

// ---- HAND-WRITTEN expectations (not derived from the code under test) -------------------
// which teams each person reaches
const REACH = { D: TEAMS, D2: TEAMS, BA1: ["T1", "T2"], BA1b: ["T1", "T2"], BA2: ["T3"], TA1: ["T1"], TA1b: ["T1"], TA2: ["T2"], TA3: ["T3"], SA1: ["T1"], SA3: ["T3"], AG1: ["T1"], AG2: ["T2"], AG3: ["T3"] };
const ADMINS = ["D", "D2", "BA1", "BA1b", "BA2", "TA1", "TA1b", "TA2", "TA3"];
// whom each admin may manage (edit / delete / restore / reset password)
const MANAGES = {
  D: ids.filter((x) => x !== "D"), D2: ids.filter((x) => x !== "D2"),
  BA1: ["TA1", "TA1b", "TA2", "SA1", "AG1", "AG2"], BA1b: ["TA1", "TA1b", "TA2", "SA1", "AG1", "AG2"], BA2: ["TA3", "SA3", "AG3"],
  TA1: ["SA1", "AG1"], TA1b: ["SA1", "AG1"], TA2: ["AG2"], TA3: ["SA3", "AG3"],
};
// who each admin can LIST
const SEES_USERS = {
  D: ids, D2: ids,
  BA1: ["BA1", "BA1b", "TA1", "TA1b", "TA2", "SA1", "AG1", "AG2"], BA1b: ["BA1", "BA1b", "TA1", "TA1b", "TA2", "SA1", "AG1", "AG2"], BA2: ["BA2", "TA3", "SA3", "AG3"],
  TA1: ["TA1", "TA1b", "SA1", "AG1"], TA1b: ["TA1", "TA1b", "SA1", "AG1"], TA2: ["TA2", "AG2"], TA3: ["TA3", "SA3", "AG3"],
};
// what each admin may CREATE: role -> allowed places
const CREATES = {
  D: { director: "any", branchAdmin: "any", teamAdmin: "any", superAgent: "any", agent: "any" },
  D2: { director: "any", branchAdmin: "any", teamAdmin: "any", superAgent: "any", agent: "any" },
  BA1: { teamAdmin: ["T1", "T2"], superAgent: ["T1", "T2"], agent: ["T1", "T2"] },
  BA1b: { teamAdmin: ["T1", "T2"], superAgent: ["T1", "T2"], agent: ["T1", "T2"] },
  BA2: { teamAdmin: ["T3"], superAgent: ["T3"], agent: ["T3"] },
  TA1b: { superAgent: ["T1"], agent: ["T1"] },
  TA1: { superAgent: ["T1"], agent: ["T1"] }, TA2: { superAgent: ["T2"], agent: ["T2"] }, TA3: { superAgent: ["T3"], agent: ["T3"] },
};
const BRANCH_VIEW = { D: BRANCHES, D2: BRANCHES, BA1: ["B1"], BA1b: ["B1"], BA2: ["B2"] };
const TEAM_ADMIN_OF = { D: TEAMS, D2: TEAMS, BA1: ["T1", "T2"], BA1b: ["T1", "T2"], BA2: ["T3"] }; // create/edit/delete/restore teams

const teamsOf = (list) => (list === "any" ? TEAMS : list || []);
const A = (n) => users[n];

for (const a of ids) {
  const actor = A(a);
  // --- team-scoped actions ---
  const adminScope = ["table.create", "table.editStructure", "table.delete", "defaultColumns.edit", "row.import", "row.export", "row.bulkEdit", "agentPerms.manage"];
  for (const act of adminScope) for (const t of TEAMS) check(`${a} ${act} ${t}`, can(actor, act, { teamId: t }, org), ADMINS.includes(a) && REACH[a].includes(t));
  for (const act of ["table.view", "row.view", "row.transfer", "agents.list", "team.view"]) for (const t of TEAMS) check(`${a} ${act} ${t}`, can(actor, act, { teamId: t }, org), REACH[a].includes(t));
  for (const t of TEAMS) {
    check(`${a} row.edit ${t}`, can(actor, "row.edit", { teamId: t }, org), actor.role !== "agent" && REACH[a].includes(t));
    check(`${a} row.edit(agentCanEdit) ${t}`, can(actor, "row.edit", { teamId: t, agentCanEdit: true }, org), REACH[a].includes(t));
    check(`${a} row.edit(agentCanEdit=false) ${t}`, can(actor, "row.edit", { teamId: t, agentCanEdit: false }, org), actor.role !== "agent" && REACH[a].includes(t));
  }
  // --- branches / teams ---
  for (const act of ["branch.create", "branch.edit", "branch.delete", "branch.restore"]) for (const b of BRANCHES) check(`${a} ${act} ${b}`, can(actor, act, { branchId: b }, org), a === "D" || a === "D2");
  for (const b of BRANCHES) check(`${a} branch.view ${b}`, can(actor, "branch.view", { branchId: b }, org), (BRANCH_VIEW[a] || []).includes(b));
  for (const act of ["team.create", "team.edit", "team.delete", "team.restore"]) {
    for (const t of TEAMS) check(`${a} ${act} by team ${t}`, can(actor, act, { teamId: t }, org), (TEAM_ADMIN_OF[a] || []).includes(t));
    for (const b of BRANCHES) {
      const want = a === "D" || a === "D2" || ((a === "BA1" || a === "BA1b") && b === "B1") || (a === "BA2" && b === "B2");
      check(`${a} ${act} by branch ${b}`, can(actor, act, { branchId: b }, org), want);
    }
  }
  // --- users ---
  for (const t of ids) {
    const target = A(t);
    check(`${a} user.view ${t}`, can(actor, "user.view", target, org), (SEES_USERS[a] || []).includes(t));
    const m = (MANAGES[a] || []).includes(t);
    check(`${a} user.delete ${t}`, can(actor, "user.delete", { user: target }, org), m);
    check(`${a} user.restore ${t}`, can(actor, "user.restore", { user: target }, org), m);
    check(`${a} user.edit ${t}`, can(actor, "user.edit", { user: target }, org), m || (a === t && (a === "D" || a === "D2")));
    check(`${a} user.resetPassword ${t}`, can(actor, "user.resetPassword", { user: target }, org), m || (a === t && (a === "D" || a === "D2")));
  }
  for (const role of ROLES) {
    const places = role === "director" ? [{}] : role === "branchAdmin" ? BRANCHES.map((b) => ({ branchId: b })) : TEAMS.map((t) => ({ teamId: t }));
    for (const p of places) {
      const allowed = CREATES[a]?.[role];
      let want = false;
      if (allowed === "any") want = true;
      else if (allowed) want = role === "director" || role === "branchAdmin" ? false : allowed.includes(p.teamId);
      check(`${a} user.create ${role} ${JSON.stringify(p)}`, can(actor, "user.create", { role, ...p }, org), want);
    }
  }
  check(`${a} audit.view`, can(actor, "audit.view", {}, org), ADMINS.includes(a));
}

// ---- changing role / moving a user (user.edit with `next`) -------------------------------
const edit = (a, t, next) => can(A(a), "user.edit", { user: A(t), next }, org);
check("BA1 AG1->superAgent", edit("BA1", "AG1", { role: "superAgent" }), true);
check("BA1 AG1->teamAdmin", edit("BA1", "AG1", { role: "teamAdmin" }), true);
check("BA1 AG1->branchAdmin (own rank)", edit("BA1", "AG1", { role: "branchAdmin", branchId: "B1" }), false);
check("BA1 AG1->director", edit("BA1", "AG1", { role: "director" }), false);
check("BA1 AG1 move to T2 (same branch)", edit("BA1", "AG1", { teamId: "T2" }), true);
check("BA1 AG1 move to T3 (other branch)", edit("BA1", "AG1", { teamId: "T3" }), false);
check("BA1 TA3 (other branch) anything", edit("BA1", "TA3", { role: "agent" }), false);
check("TA1 AG1->superAgent", edit("TA1", "AG1", { role: "superAgent" }), true);
check("TA1 AG1->teamAdmin (own rank)", edit("TA1", "AG1", { role: "teamAdmin" }), false);
check("TA1 SA1->agent (demote)", edit("TA1", "SA1", { role: "agent" }), true);
check("TA1 AG1 move to T2", edit("TA1", "AG1", { teamId: "T2" }), false);
check("TA1 TA2 (other team) demote", edit("TA1", "TA2", { role: "agent" }), false);
check("TA1 TA1b (same team, same rank) demote", edit("TA1", "TA1b", { role: "agent" }), false);
check("BA1 BA1b (same branch, same rank) demote", edit("BA1", "BA1b", { role: "agent", teamId: "T1" }), false);
check("BA1 BA1b delete", can(A("BA1"), "user.delete", { user: A("BA1b") }, org), false);
check("D AG1->director", edit("D", "AG1", { role: "director" }), true);
check("D AG1->branchAdmin", edit("D", "AG1", { role: "branchAdmin", branchId: "B2" }), true);
check("D demote D2", edit("D", "D2", { role: "agent", teamId: "T1" }), true);
check("D self change role", edit("D", "D", { role: "agent", teamId: "T1" }), false);
check("D self rename (no next)", can(A("D"), "user.edit", { user: A("D") }, org), true);
check("BA1 self edit", can(A("BA1"), "user.edit", { user: A("BA1") }, org), false);
check("AG1 edit self", can(A("AG1"), "user.edit", { user: A("AG1") }, org), false);

// ---- deny by default / bad actors ---------------------------------------------------------
check("unknown action", can(A("D"), "nuke.everything", {}, org), false);
check("undefined action", can(A("D"), undefined, {}, org), false);
check("null actor", can(null, "table.view", { teamId: "T1" }, org), false);
check("deleted actor", can({ ...A("D"), deletedAt: "x" }, "table.view", { teamId: "T1" }, org), false);
check("weird role", can({ id: "x", role: "root", deletedAt: null }, "table.view", { teamId: "T1" }, org), false);
check("unknown team", can(A("D"), "table.view", { teamId: "nope" }, org), true); // director reaches everything
check("BA1 unknown team", can(A("BA1"), "table.view", { teamId: "nope" }, org), false);
check("TA1 no resource", can(A("TA1"), "table.view", undefined, org), false);
check("forged role string in resource ignored", can(A("AG1"), "table.create", { teamId: "T1", role: "director" }, org), false);
for (const act of ACTIONS) check(`every action is handled: ${act}`, typeof can(A("D"), act, { teamId: "T1", branchId: "B1", role: "agent", user: A("AG1") }, org), "boolean");

// ---- scopes + role helpers -------------------------------------------------------------------
check("scope D", visibleScope(A("D")).kind, "all");
check("scope BA1", visibleScope(A("BA1")).branchId, "B1");
check("scope TA1", visibleScope(A("TA1")).teamId, "T1");
check("scope AG3", visibleScope(A("AG3")).teamId, "T3");
check("scope deleted", visibleScope({ ...A("D"), deletedAt: "x" }).kind, "none");
check("rank order", ROLES.map((r) => RANK[r]).join(), "5,4,3,2,1");
check("admin roles", ROLES.filter(isAdminRole).join(), "director,branchAdmin,teamAdmin");

console.log(`${pass} checks passed, ${fail} failed`);
bad.forEach((b) => console.log("  FAIL " + b));
process.exit(fail ? 1 : 0);
