// A small demo organisation: 2 branches, 3 teams and one or more people of every role.
// Every demo account uses the same password (shown on screen when it is created).
export const DEMO_PASSWORD = "demo1234";

export async function seedDemoOrg(svc, directorId, password = DEMO_PASSWORD) {
  const need = async (p) => {
    const r = await p;
    if (!r.ok) throw new Error(`Demo setup failed: ${r.message}`);
    return r.value;
  };
  const cairo = await need(svc.createBranch(directorId, { name: "Cairo Branch" }));
  const alex = await need(svc.createBranch(directorId, { name: "Alexandria Branch" }));
  const salesA = await need(svc.createTeam(directorId, { name: "Sales A", branchId: cairo.id }));
  const salesB = await need(svc.createTeam(directorId, { name: "Sales B", branchId: cairo.id }));
  const support = await need(svc.createTeam(directorId, { name: "Support", branchId: alex.id }));

  const people = [
    ["branchAdmin", "ba.cairo", "Karim (Cairo admin)", { branchId: cairo.id }],
    ["branchAdmin", "ba.alex", "Laila (Alexandria admin)", { branchId: alex.id }],
    ["teamAdmin", "ta.salesa", "Omar (Sales A admin)", { teamId: salesA.id }],
    ["teamAdmin", "ta.salesb", "Dina (Sales B admin)", { teamId: salesB.id }],
    ["teamAdmin", "ta.support", "Hassan (Support admin)", { teamId: support.id }],
    ["superAgent", "sa.salesa", "Rana (Sales A super agent)", { teamId: salesA.id }],
    ["superAgent", "sa.support", "Tarek (Support super agent)", { teamId: support.id }],
    ["agent", "nour", "Nour", { teamId: salesA.id }],
    ["agent", "sara", "Sara", { teamId: salesA.id }],
    ["agent", "emad", "Emad", { teamId: salesB.id }],
    ["agent", "mona", "Mona", { teamId: support.id }],
  ];
  const created = [];
  for (const [role, username, displayName, where] of people) {
    const u = await need(svc.createUser(directorId, { username, password, displayName, role, ...where }));
    created.push({ username: u.username, name: u.displayName, role });
  }
  return { password, accounts: created, branches: [cairo, alex], teams: [salesA, salesB, support] };
}
