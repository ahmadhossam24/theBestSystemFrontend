import { canOpenPath, isPublicPath } from "./org/routes.js";
import { resolveScope } from "./org/scopeLogic.js";
let pass = 0, fail = 0;
const ok = (n, c) => { c ? pass++ : (fail++, console.log("FAIL", n)); };
const R = ["director", "branchAdmin", "teamAdmin", "superAgent", "agent"];
const exp = { // path -> roles allowed
  "/": R, "/teams/all": R, "/teams/members": R, "/tables/abc": R, "/xxx": R,
  "/branches/all": ["director", "branchAdmin"], "/branches/add": ["director", "branchAdmin"],
  "/users/all": R.slice(0, 3), "/users/deleted": R.slice(0, 3), "/setup-table": R.slice(0, 3),
};
for (const [p, ok_] of Object.entries(exp)) for (const r of R) ok(`${r} ${p}`, canOpenPath({ role: r }, p) === ok_.includes(r));
ok("signed out opens nothing", !canOpenPath(null, "/"));
ok("lookalike prefix is not blocked", canOpenPath({ role: "agent" }, "/branchesx") && canOpenPath({ role: "agent" }, "/usersettings"));
ok("public", isPublicPath("/login") && isPublicPath("/first-run") && !isPublicPath("/users/all"));
const branches = [{ id: "b1" }, { id: "b2" }];
const teams = [{ id: "t1", branchId: "b1" }, { id: "t2", branchId: "b1" }, { id: "t3", branchId: "b2" }];
let r = resolveScope({ role: "agent", teamId: "t2" }, branches, teams, { teamId: "t3" });
ok("agent locked to own team, ignores stored", r.locked && r.teamId === "t2" && r.branchId === "b1");
r = resolveScope({ role: "director" }, branches, teams, { teamId: "t3", branchId: "b2" });
ok("director uses stored", !r.locked && r.teamId === "t3" && r.branchId === "b2");
r = resolveScope({ role: "director" }, branches, teams, null);
ok("director default = first team", r.teamId === "t1" && r.branchId === "b1");
r = resolveScope({ role: "director" }, branches, teams, { teamId: "gone", branchId: "b2" });
ok("stale team falls back inside stored branch", r.teamId === "t3");
r = resolveScope({ role: "branchAdmin" }, [branches[0]], teams.slice(0, 2), { teamId: "t3", branchId: "b2" });
ok("branch admin cannot land outside visible teams", r.teamId === "t1" && !r.locked);
r = resolveScope({ role: "director" }, [], [], null);
ok("empty org: no team", r.teamId === null && r.branchId === null);
console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
