import * as P from "./data/agentPerms.js";
let pass = 0, fail = 0;
const ok = (n, c, x) => { c ? pass++ : (fail++, console.log("FAIL", n, x ?? "")); };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const A = { id: "u1", role: "agent", teamId: "t1" }, B = { id: "u2", role: "agent", teamId: "t1" };
const roles = ["director", "branchAdmin", "teamAdmin", "superAgent"].map((r) => ({ id: "x", role: r, teamId: "t1" }));
const col = (cellId, extra = {}) => ({ cellId, ownerTableId: null, readOnly: false, ...extra });
let p = P.emptyPerms();

// defaults
ok("implicit = read", P.modeFor(p, A, "T", col("c1")) === "read");
ok("non-agents always edit", roles.every((u) => P.modeFor(p, u, "T", col("c1")) === "edit"));
ok("non-agents: system column is read", roles.every((u) => P.modeFor(p, u, "T", col("c1", { readOnly: true })) === "read"));
ok("signed out sees nothing", P.modeFor(p, null, "T", col("c1")) === "hidden");

// team default applies to agents with no own setting, incl. new ones
p = P.setModes(p, { kind: "default", teamId: "t1" }, "T", { c1: "edit", c2: "hidden" });
ok("team default edit", P.modeFor(p, A, "T", col("c1")) === "edit");
ok("team default hidden", P.modeFor(p, B, "T", col("c2")) === "hidden");
ok("other team unaffected", P.modeFor(p, { id: "u9", role: "agent", teamId: "t2" }, "T", col("c1")) === "read");
ok("other table unaffected", P.modeFor(p, A, "T2", col("c1")) === "read");
ok("non-agents ignore team default hidden", P.modeFor(p, roles[3], "T", col("c2")) === "edit");
ok("source = default", P.agentSetting(p, { userId: "u1", teamId: "t1" }, "T", "c1").source === "default");

// own setting beats default; only that agent
p = P.setModes(p, { kind: "agent", userId: "u1" }, "T", { c1: "read", c2: "edit" });
ok("own beats default (down)", P.modeFor(p, A, "T", col("c1")) === "read");
ok("own beats default (up)", P.modeFor(p, A, "T", col("c2")) === "edit");
ok("other agent keeps default", P.modeFor(p, B, "T", col("c1")) === "edit" && P.modeFor(p, B, "T", col("c2")) === "hidden");
ok("source = own", P.agentSetting(p, { userId: "u1", teamId: "t1" }, "T", "c1").source === "own");

// system columns never editable
p = P.setModes(p, { kind: "agent", userId: "u1" }, "T", { sys: "edit" });
ok("readOnly column capped at read", P.modeFor(p, A, "T", col("sys", { readOnly: true })) === "read");

// ownership bucket
p = P.setModes(p, { kind: "agent", userId: "u1" }, "DS", { "DS:x": "hidden" });
ok("custom column uses owner's bucket", P.modeFor(p, A, "GEN", col("DS:x", { ownerTableId: "DS" })) === "hidden");
ok("...not the page table's", P.modeFor(p, A, "DS", col("DS:x", { ownerTableId: "DS" })) === "hidden");

// visibility helpers
const cols = [col("c1"), col("c2"), col("c3")];
ok("visibleColumns drops hidden (agent u2)", eq(P.visibleColumns(p, B, "T", cols).map((c) => c.cellId), ["c1", "c3"]));
ok("visibleColumns keeps all for admins", P.visibleColumns(p, roles[0], "T", cols).length === 3);
ok("canEditColumn", P.canEditColumn(p, B, "T", cols[0]) && !P.canEditColumn(p, B, "T", cols[2]));
const T = { id: "T" };
ok("table visible while any column visible", P.tableVisibleTo(p, B, T, cols));
let q = P.setModes(P.emptyPerms(), { kind: "agent", userId: "u2" }, "T", { c1: "hidden", c2: "hidden", c3: "hidden" });
ok("table hidden when all columns hidden", !P.tableVisibleTo(q, B, T, cols) && P.tableVisibleTo(q, A, T, cols) && P.tableVisibleTo(q, roles[2], T, cols));

// history leak guard
const ev = (columnKey, extra = {}) => ({ type: "edit", columnKey, ownerTableId: null, ...extra });
ok("hidden column's edit events are hidden from the agent", !P.eventVisibleTo(p, B, "T", ev("c2")) && P.eventVisibleTo(p, B, "T", ev("c1")));
ok("...bulk-edit too", !P.eventVisibleTo(p, B, "T", { ...ev("c2"), type: "bulk-edit" }));
ok("...upload/transfer events always shown", P.eventVisibleTo(p, B, "T", { type: "upload" }) && P.eventVisibleTo(p, B, "T", { type: "transfer" }));
ok("...owned column event uses owner bucket", !P.eventVisibleTo(p, A, "GEN", ev("x", { ownerTableId: "DS" })));
ok("...admins see all events", P.eventVisibleTo(p, roles[1], "T", ev("c2")));

// apply to all
let r = P.applyToAll(p, ["u1", "u2"], "T", { c1: "hidden" });
ok("applyToAll overwrites own settings", P.modeFor(r.perms, A, "T", col("c1")) === "hidden" && P.modeFor(r.perms, B, "T", col("c1")) === "hidden");
ok("replaced counts only changed explicit settings", r.replaced === 1, r.replaced); // u1 c1 was own 'read' -> hidden; u2 had none
r = P.applyToAll(p, ["u1", "u2"], "T", { c1: "read" });
ok("no change when already equal", r.replaced === 0, r.replaced);
ok("applyToAll doesn't touch other columns", P.modeFor(r.perms, A, "T", col("c2")) === "edit");
ok("countReplaced does not mutate", P.modeFor(p, B, "T", col("c1")) === "edit");
ok("applyToAll leaves input untouched", P.agentSetting(p, { userId: "u1", teamId: "t1" }, "T", "c1").mode === "read");
ok("applyToAll with no agents is a no-op", eq(P.applyToAll(p, [], "T", { c1: "hidden" }).perms, p));

// reset
const rs = P.resetAgentTable(p, "u1", "T");
ok("reset returns to team default", P.modeFor(rs, A, "T", col("c1")) === "edit" && P.agentSetting(rs, { userId: "u1", teamId: "t1" }, "T", "c2").source === "default");
ok("reset keeps other tables", P.modeFor(rs, A, "GEN", col("DS:x", { ownerTableId: "DS" })) === "hidden");

// robustness
ok("normalize drops junk", eq(P.normalizePerms({ agents: { u: { T: { a: "bogus", b: "edit" } }, v: null }, teamDefaults: { t: { T: { z: 5 } } } }), { teamDefaults: {}, agents: { u: { T: { b: "edit" } } } }));
ok("normalize of null", eq(P.normalizePerms(null), P.emptyPerms()));
ok("invalid mode ignored by setModes", P.modeFor(P.setModes(P.emptyPerms(), { kind: "agent", userId: "u1" }, "T", { c1: "root" }), A, "T", col("c1")) === "read");
console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
