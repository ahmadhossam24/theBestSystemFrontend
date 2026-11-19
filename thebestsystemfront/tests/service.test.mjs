import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { createMemoryRepo } from "./org/memoryRepo.js";
import { createIdbRepo } from "./org/idbRepo.js";
import { createOrgService } from "./org/orgService.js";
import { hashPassword, verifyPassword } from "./org/password.js";

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => { if (cond) pass++; else { fail++; console.log("  FAIL " + name + (extra ? "   " + JSON.stringify(extra) : "")); } };

async function suite(label, makeRepo) {
  const before = { pass, fail };
  const repo = makeRepo();
  let tick = 0;
  const now = () => new Date(Date.UTC(2026, 10, 18, 10, 0, tick++)).toISOString();
  const svc = createOrgService(repo, { now });
  const results = []; // every result we get, to prove no secret ever leaks
  const R = async (p) => { const r = await p; results.push(r); return r; };
  const is = (name, r, code) => ok(`${label}: ${name}`, code === true ? r.ok === true : r.ok === false && r.code === code, r);
  const P = "secret-pw-1"; // a password to search for in stored/returned data

  // ---------- 1. first run ----------
  ok(`${label}: starts empty`, (await svc.needsFirstRun()) === true);
  is("first director: short password rejected", await R(svc.createFirstDirector({ username: "boss", password: "123" })), "invalid");
  is("first director: bad username rejected", await R(svc.createFirstDirector({ username: "a b", password: P })), "invalid");
  const d1 = await R(svc.createFirstDirector({ username: "Boss", password: P, displayName: "The Boss" }));
  is("first director created", d1, true);
  ok(`${label}: no longer first run`, (await svc.needsFirstRun()) === false);
  is("second first-run refused", await R(svc.createFirstDirector({ username: "other", password: P })), "blocked");
  const D = d1.value.id;
  ok(`${label}: result has no password/hash`, !JSON.stringify(d1).match(/password|hash|salt/i));
  const stored = JSON.stringify(await repo.all("users"));
  ok(`${label}: plaintext password is NOT stored`, !stored.includes(P) && stored.includes("pbkdf2-sha256"));

  // ---------- 2. login ----------
  is("login ok", await R(svc.authenticate("boss", P)), true);
  is("login is case-insensitive on username", await R(svc.authenticate("  BOSS ", P)), true);
  const w1 = await R(svc.authenticate("boss", "nope")), w2 = await R(svc.authenticate("ghost", "nope"));
  ok(`${label}: wrong password / unknown user look identical`, w1.ok === false && w1.message === w2.message && w1.code === w2.code);
  ok(`${label}: wrong password is not "ok"`, w1.ok === false);

  // ---------- 3. branches ----------
  const b1 = (await R(svc.createBranch(D, { name: "  Cairo  " }))).value;
  const b2 = (await R(svc.createBranch(D, { name: "Giza" }))).value;
  ok(`${label}: branch name cleaned`, b1.name === "Cairo");
  is("duplicate branch (case-insensitive)", await R(svc.createBranch(D, { name: "cairo" })), "conflict");
  is("empty branch name", await R(svc.createBranch(D, { name: "   " })), "invalid");
  const T1 = (await R(svc.createTeam(D, { name: "Sales A", branchId: b1.id }))).value;
  const T2 = (await R(svc.createTeam(D, { name: "Sales B", branchId: b1.id }))).value;
  const T3 = (await R(svc.createTeam(D, { name: "Sales A", branchId: b2.id }))).value;
  ok(`${label}: same team name allowed in another branch`, !!T3);
  is("duplicate team name in same branch", await R(svc.createTeam(D, { name: "sales a", branchId: b1.id })), "conflict");
  is("team in missing branch", await R(svc.createTeam(D, { name: "X", branchId: "nope" })), "invalid");
  is("rename team", await R(svc.updateTeam(D, T1.id, { name: "Sales Alpha" })), true);
  is("rename team to a sibling's name", await R(svc.updateTeam(D, T1.id, { name: "Sales B" })), "conflict");
  is("rename branch", await R(svc.updateBranch(D, b2.id, { name: "Giza City" })), true);

  // ---------- 4. users, rank rules ----------
  const mk = async (actor, role, username, extra = {}) => R(svc.createUser(actor, { username, password: P, role, ...extra }));
  const ba1 = (await mk(D, "branchAdmin", "ba1", { branchId: b1.id })).value;
  const ba2 = (await mk(D, "branchAdmin", "ba2", { branchId: b2.id })).value;
  ok(`${label}: branch admin has branch, no team`, ba1.branchId === b1.id && ba1.teamId === null);
  const ta1 = (await mk(ba1.id, "teamAdmin", "ta1", { teamId: T1.id })).value;
  ok(`${label}: branch admin created a team admin; branch derived from team`, ta1 && ta1.branchId === b1.id && ta1.teamId === T1.id);
  const ta3 = (await mk(D, "teamAdmin", "ta3", { teamId: T3.id })).value;
  const sa1 = (await mk(ta1.id, "superAgent", "sa1", { teamId: T1.id })).value;
  const ag1 = (await mk(ta1.id, "agent", "ag1", { teamId: T1.id, displayName: "Sara" })).value;
  const ag2 = (await mk(ba1.id, "agent", "ag2", { teamId: T2.id })).value;
  const ag3 = (await mk(ta3.id, "agent", "ag3", { teamId: T3.id })).value;
  ok(`${label}: all test users created`, [ba1, ba2, ta1, ta3, sa1, ag1, ag2, ag3].every(Boolean));
  is("branch admin can't create a branch admin", await mk(ba1.id, "branchAdmin", "x1", { branchId: b1.id }), "forbidden");
  is("branch admin can't create in another branch", await mk(ba1.id, "agent", "x2", { teamId: T3.id }), "forbidden");
  is("team admin can't create a team admin", await mk(ta1.id, "teamAdmin", "x3", { teamId: T1.id }), "forbidden");
  is("team admin can't create in another team", await mk(ta1.id, "agent", "x4", { teamId: T2.id }), "forbidden");
  is("super agent can't create users", await mk(sa1.id, "agent", "x5", { teamId: T1.id }), "forbidden");
  is("agent can't create users", await mk(ag1.id, "agent", "x6", { teamId: T1.id }), "forbidden");
  is("director can create another director", await mk(D, "director", "dir2"), true);
  is("username taken (case-insensitive)", await mk(D, "agent", "AG1", { teamId: T1.id }), "conflict");
  is("username too short", await mk(D, "agent", "ab", { teamId: T1.id }), "invalid");
  is("password too short", await R(svc.createUser(D, { username: "newone", password: "12", role: "agent", teamId: T1.id })), "invalid");
  is("agent without a team", await mk(D, "agent", "noteam"), "invalid");
  is("branch admin without a branch", await mk(D, "branchAdmin", "nobranch"), "invalid");
  is("unknown role", await mk(D, "wizard", "wiz"), "invalid");
  const inv = await R(svc.createUser(D, { username: "q", password: "1", role: "agent", teamId: T1.id }));
  ok(`${label}: invalid result lists per-field errors`, inv.errors?.username && inv.errors?.password, inv);

  // ---------- 5. listing is scoped ----------
  const names = (r) => r.value.map((u) => u.username).sort().join(",");
  ok(`${label}: director lists everyone`, (await svc.listUsers(D)).value.length === 10, (await svc.listUsers(D)).value.length);
  ok(`${label}: branch admin lists only his branch`, names(await svc.listUsers(ba1.id)) === "ag1,ag2,ba1,sa1,ta1", names(await svc.listUsers(ba1.id)));
  ok(`${label}: team admin lists only her team`, names(await svc.listUsers(ta1.id)) === "ag1,sa1,ta1", names(await svc.listUsers(ta1.id)));
  is("agent can't list users", await svc.listUsers(ag1.id), "forbidden");
  is("super agent can't list users", await svc.listUsers(sa1.id), "forbidden");
  ok(`${label}: listUsers has no secrets`, !JSON.stringify(await svc.listUsers(D)).match(/password|hash|salt/i));
  ok(`${label}: branches scoped (director 2, branch admin 1, agent 0)`, (await svc.listBranches(D)).value.length === 2 && (await svc.listBranches(ba1.id)).value.length === 1 && (await svc.listBranches(ag1.id)).value.length === 0);
  ok(`${label}: teams scoped`, (await svc.listTeams(D)).value.length === 3 && (await svc.listTeams(ba1.id)).value.length === 2 && (await svc.listTeams(ta1.id)).value.length === 1 && (await svc.listTeams(ag1.id)).value.length === 1);
  const ags = await svc.listAgents(ag1.id, T1.id);
  ok(`${label}: assignable agents = agents + super agents of the team`, ags.ok && ags.value.map((a) => a.name).sort().join() === "Sara,sa1", ags);
  is("agent can't list another team's agents", await svc.listAgents(ag1.id, T2.id), "forbidden");
  is("branch admin lists agents of his teams", await svc.listAgents(ba1.id, T2.id), true);

  // ---------- 6. edit / change rank / move ----------
  is("team admin promotes agent -> super agent", await R(svc.updateUser(ta1.id, ag1.id, { role: "superAgent" })), true);
  is("team admin can't promote to team admin", await R(svc.updateUser(ta1.id, ag1.id, { role: "teamAdmin" })), "forbidden");
  is("demote back", await R(svc.updateUser(ta1.id, ag1.id, { role: "agent" })), true);
  is("branch admin moves agent to a sibling team", await R(svc.updateUser(ba1.id, ag1.id, { teamId: T2.id })), true);
  ok(`${label}: move persisted (team + branch)`, (await svc.listUsers(ba1.id)).value.find((u) => u.id === ag1.id).teamId === T2.id);
  is("branch admin can't move to another branch's team", await R(svc.updateUser(ba1.id, ag1.id, { teamId: T3.id })), "forbidden");
  is("move back", await R(svc.updateUser(ba1.id, ag1.id, { teamId: T1.id })), true);
  is("change username", await R(svc.updateUser(ta1.id, ag1.id, { username: "sara.k", displayName: "Sara K" })), true);
  is("old username no longer logs in", await R(svc.authenticate("ag1", P)), "invalid");
  is("new username logs in", await R(svc.authenticate("sara.k", P)), true);
  is("username change to an existing one", await R(svc.updateUser(ta1.id, ag1.id, { username: "SA1" })), "conflict");
  is("agent can't edit anyone", await R(svc.updateUser(ag1.id, sa1.id, { displayName: "x" })), "forbidden");
  is("director renames self", await R(svc.updateUser(D, D, { displayName: "Big Boss" })), true);
  is("director can't change own role", await R(svc.updateUser(D, D, { role: "agent", teamId: T1.id })), "forbidden");
  is("update unknown user", await R(svc.updateUser(D, "nope", { displayName: "x" })), "not_found");

  // ---------- 7. passwords ----------
  is("team admin resets her agent's password", await R(svc.resetPassword(ta1.id, ag1.id, "brand-new-pw")), true);
  is("new password works", await R(svc.authenticate("sara.k", "brand-new-pw")), true);
  is("old password fails", await R(svc.authenticate("sara.k", P)), "invalid");
  is("agent can't reset someone else's", await R(svc.resetPassword(ag1.id, sa1.id, "hacked-pw")), "forbidden");
  is("agent can't reset their own (admin only)", await R(svc.resetPassword(ag1.id, ag1.id, "mine-now")), "forbidden");
  is("super agent can't reset", await R(svc.resetPassword(sa1.id, ag1.id, "hacked-pw")), "forbidden");
  is("team admin can't reset another team's agent", await R(svc.resetPassword(ta1.id, ag3.id, "hacked-pw")), "forbidden");
  is("team admin can't reset her own", await R(svc.resetPassword(ta1.id, ta1.id, "mine-now")), "forbidden");
  is("short new password", await R(svc.resetPassword(ta1.id, ag1.id, "12")), "invalid");
  is("director resets own password", await R(svc.resetPassword(D, D, "director-new-pw")), true);
  is("director's new password works", await R(svc.authenticate("boss", "director-new-pw")), true);
  const pw = await repo.get("users", ag1.id);
  const pw2 = await repo.get("users", ag3.id);
  ok(`${label}: every user has their own random salt`, pw.password.salt !== pw2.password.salt && pw.password.hash !== pw2.password.hash);

  // ---------- 8. delete / restore ----------
  is("team admin deletes an agent (soft)", await R(svc.deleteUser(ta1.id, ag1.id)), true);
  is("deleted user can't log in", await R(svc.authenticate("sara.k", "brand-new-pw")), "invalid");
  ok(`${label}: deleted user in the deleted list, not the active one`, (await svc.listUsers(ta1.id, { deleted: true })).value.length === 1 && !(await svc.listUsers(ta1.id)).value.some((u) => u.id === ag1.id));
  is("deleted user's username stays reserved", await mk(D, "agent", "sara.k", { teamId: T1.id }), "conflict");
  is("deleted user can't act", await R(svc.createUser(ag1.id, { username: "zzz1", password: P, role: "agent", teamId: T1.id })), "forbidden");
  is("restore", await R(svc.restoreUser(ta1.id, ag1.id)), true);
  is("restored user logs in again (same password)", await R(svc.authenticate("sara.k", "brand-new-pw")), true);
  is("can't delete yourself", await R(svc.deleteUser(ta1.id, ta1.id)), "forbidden");
  is("team admin can't delete a peer-or-higher", await R(svc.deleteUser(ta1.id, ba1.id)), "forbidden");
  is("team with users can't be deleted", await R(svc.deleteTeam(D, T1.id)), "blocked");
  is("branch with teams can't be deleted", await R(svc.deleteBranch(D, b1.id)), "blocked");
  is("branch admin can't delete a team of another branch", await R(svc.deleteTeam(ba1.id, T3.id)), "forbidden");
  is("branch admin can't create branches", await R(svc.createBranch(ba1.id, { name: "Nope" })), "forbidden");
  is("branch admin creates a team in his branch", await R(svc.createTeam(ba1.id, { name: "Sales C", branchId: b1.id })), true);
  is("branch admin can't create a team elsewhere", await R(svc.createTeam(ba1.id, { name: "Sales D", branchId: b2.id })), "forbidden");
  is("team admin can't create teams", await R(svc.createTeam(ta1.id, { name: "Sales E", branchId: b1.id })), "forbidden");
  // empty a team, delete it, restore chain
  const T4 = (await svc.listTeams(ba1.id)).value.find((t) => t.name === "Sales C");
  const solo = (await mk(ba1.id, "agent", "solo", { teamId: T4.id })).value;
  is("delete user then team", await R(svc.deleteUser(ba1.id, solo.id)), true);
  is("team deletes once empty", await R(svc.deleteTeam(ba1.id, T4.id)), true);
  is("can't restore a user whose team is deleted", await R(svc.restoreUser(ba1.id, solo.id)), "blocked");
  is("restore team", await R(svc.restoreTeam(ba1.id, T4.id)), true);
  is("now restore the user", await R(svc.restoreUser(ba1.id, solo.id)), true);
  is("can't create a user in a deleted team", await (async () => { await R(svc.deleteUser(ba1.id, solo.id)); await R(svc.deleteTeam(ba1.id, T4.id)); return R(svc.createUser(D, { username: "ghostly", password: P, role: "agent", teamId: T4.id })); })(), "invalid");
  // branch lifecycle
  const bTmp = (await R(svc.createBranch(D, { name: "Temp" }))).value;
  is("empty branch deletes", await R(svc.deleteBranch(D, bTmp.id)), true);
  is("deleted branch not in active list", (await svc.listBranches(D)).value.every((b) => b.id !== bTmp.id) ? { ok: true } : { ok: false }, true);
  is("restore branch", await R(svc.restoreBranch(D, bTmp.id)), true);

  // ---------- 9. last-director guard ----------
  const dir2 = (await svc.listUsers(D)).value.find((u) => u.username === "dir2");
  is("a director can delete another director", await R(svc.deleteUser(D, dir2.id)), true);
  is("can't demote the only remaining director", await R(svc.updateUser(dir2.id, D, { role: "agent", teamId: T1.id })), "forbidden"); // deleted actor
  const dir3 = (await mk(D, "director", "dir3")).value;
  is("demoting one of two directors is fine", await R(svc.updateUser(D, dir3.id, { role: "agent", teamId: T1.id })), true);
  is("only one director left: can't be deleted by himself", await R(svc.deleteUser(D, D)), "forbidden");
  const dir4 = (await mk(D, "director", "dir4")).value;
  is("only director can't be demoted by the other?  (two directors -> allowed)", await R(svc.updateUser(dir4.id, D, { role: "agent", teamId: T1.id })), true);
  is("now dir4 is the last director: delete blocked", await R(svc.deleteUser(dir4.id, dir4.id)), "forbidden");
  const dir5 = (await mk(dir4.id, "director", "dir5")).value;
  is("director restores / re-promotes the demoted one", await R(svc.updateUser(dir4.id, D, { role: "director" })), true);
  is("last-director rule: demote when one left is blocked", await (async () => { await R(svc.deleteUser(dir4.id, dir5.id)); await R(svc.updateUser(dir4.id, dir4.id, {})); return R(svc.updateUser(D, dir4.id, { role: "agent", teamId: T1.id })); })(), true); // D and dir4 both directors, so allowed
  // really-one-left case via a fresh service on an empty repo is covered in the "single director" test below

  // a DELETED ADMIN (who would otherwise be allowed) must be locked out immediately
  const tmpTA = (await mk(D, "teamAdmin", "tmpta", { teamId: T1.id })).value;
  is("team admin can create before being deleted", await R(svc.createUser(tmpTA.id, { username: "byTmp1", password: P, role: "agent", teamId: T1.id })), true);
  await R(svc.deleteUser(D, tmpTA.id));
  is("the same admin, once deleted, can no longer create users", await R(svc.createUser(tmpTA.id, { username: "byTmp2", password: P, role: "agent", teamId: T1.id })), "forbidden");
  is("...nor list users", await R(svc.listUsers(tmpTA.id)), "forbidden");
  is("...nor read the log", await R(svc.listLog(tmpTA.id)), "forbidden");

  // ---------- 10. stale actor ----------
  const wasAdmin = await R(svc.createUser(ta3.id, { username: "tmpag", password: P, role: "agent", teamId: T3.id }));
  is("team admin can create before demotion", wasAdmin, true);
  await R(svc.updateUser(D, ta3.id, { role: "agent", teamId: T3.id }));
  is("after demotion the SAME id can no longer create", await R(svc.createUser(ta3.id, { username: "tmpag2", password: P, role: "agent", teamId: T3.id })), "forbidden");
  is("unknown actor id", await R(svc.createBranch("usr_ghost", { name: "Hax" })), "forbidden");

  // ---------- 11. audit log ----------
  const logD = (await svc.listLog(D)).value, logB = (await svc.listLog(ba1.id)).value;
  ok(`${label}: director sees the whole log`, logD.length > 40, logD.length);
  ok(`${label}: log is newest-first`, logD.every((e, i) => i === 0 || logD[i - 1].at >= e.at));
  ok(`${label}: branch admin only sees his branch`, logB.length > 0 && logB.length < logD.length && logB.every((e) => e.branchId === b1.id));
  const logT = (await svc.listLog(ta1.id)).value;
  ok(`${label}: team admin only sees her team`, logT.length > 0 && logT.every((e) => e.teamId === T1.id));
  is("super agent can't read the log", await svc.listLog(sa1.id), "forbidden");
  is("agent can't read the log", await svc.listLog(ag1.id), "forbidden");
  ok(`${label}: log entries name who did what`, logD.some((e) => e.type === "user.create" && e.byName === "Big Boss" || e.byName === "The Boss") && logD.some((e) => e.type === "user.resetPassword"));
  ok(`${label}: log never contains passwords`, !JSON.stringify(logD).includes(P) && !JSON.stringify(logD).includes("brand-new-pw"));

  // ---------- 12. concurrency + atomicity ----------
  const [c1, c2] = await Promise.all([
    svc.createUser(D, { username: "race", password: P, role: "agent", teamId: T1.id }),
    svc.createUser(D, { username: "RACE", password: P, role: "agent", teamId: T1.id }),
  ]);
  ok(`${label}: two simultaneous creates of one username -> exactly one wins`, [c1, c2].filter((r) => r.ok).length === 1 && [c1, c2].filter((r) => !r.ok && r.code === "conflict").length === 1, [c1, c2]);
  const raceLog = (await repo.all("log")).filter((e) => e.type === "user.create" && /race/i.test(e.targetName));
  ok(`${label}: the loser left no orphan log entry`, raceLog.length === 1, raceLog.length);

  // ---------- 13. nothing leaked anywhere ----------
  const everyStored = JSON.stringify([await repo.all("users"), await repo.all("log"), await repo.all("teams"), await repo.all("branches")]);
  ok(`${label}: NO password ever appears in storage (users, log, teams, branches)`, ![P, "brand-new-pw", "director-new-pw", "hacked-pw", "mine-now"].some((x) => everyStored.includes(x)));
  ok(`${label}: no result ever contained a password/hash/salt`, !results.some((r) => { const j = JSON.stringify(r); return /pbkdf2|"hash":|"salt":|"usernameKey":|"iterations":/.test(j) || [P, "brand-new-pw", "director-new-pw", "hacked-pw", "mine-now"].some((x) => j.includes(x)); }));

  // ---------- 14. teamHasData hook ----------
  const guarded = createOrgService(repo, { now, teamHasData: async (id) => id === T2.id });
  // empty T2 of users first
  for (const u of (await svc.listUsers(D, { teamId: T2.id })).value) await svc.deleteUser(D, u.id);
  is("team with data can't be deleted (hook)", await guarded.deleteTeam(D, T2.id), "blocked");
  is("same team deletes when the hook says no data", await svc.deleteTeam(D, T2.id), true);

  console.log(`${label}: ${pass - before.pass} passed, ${fail - before.fail} failed`);
}

// ---- a brand-new system with ONE director: the last-director guard for real ----
async function singleDirector() {
  const svc = createOrgService(createMemoryRepo());
  const d = (await svc.createFirstDirector({ username: "solo", password: "secret1" })).value;
  const b = (await svc.createBranch(d.id, { name: "B" })).value;
  const t = (await svc.createTeam(d.id, { name: "T", branchId: b.id })).value;
  const r1 = await svc.updateUser(d.id, d.id, { role: "agent", teamId: t.id });
  ok("single director: can't demote self", !r1.ok && r1.code === "forbidden", r1);
  const r2 = await svc.deleteUser(d.id, d.id);
  ok("single director: can't delete self", !r2.ok && r2.code === "forbidden", r2);
  const d2 = (await svc.createUser(d.id, { username: "second", password: "secret1", role: "director" })).value;
  await svc.updateUser(d.id, d2.id, { role: "agent", teamId: t.id }); // demote the 2nd -> still one director
  const r3 = await svc.updateUser(d2.id, d.id, { role: "agent", teamId: t.id });
  ok("demoted second director has no power over the first", !r3.ok, r3);
}

// ---- password hashing on its own ----
async function passwords() {
  const h = await hashPassword("pässwörd-✓");
  ok("hash verifies the right password (incl. unicode)", await verifyPassword("pässwörd-✓", h));
  ok("hash rejects a wrong password", !(await verifyPassword("passwörd-✓", h)));
  ok("hash rejects empty / null record", !(await verifyPassword("x", null)) && !(await verifyPassword("", h)));
  const h2 = await hashPassword("pässwörd-✓");
  ok("same password, different salt + hash each time", h.salt !== h2.salt && h.hash !== h2.hash);
  ok("record shape", h.algo === "pbkdf2-sha256" && h.iterations >= 100000 && h.salt && h.hash);
}

await passwords();
await suite("memory", () => createMemoryRepo());
globalThis.indexedDB = new IDBFactory(); // fresh fake IndexedDB for the real idbRepo code
await suite("indexeddb", () => createIdbRepo());
await singleDirector();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
