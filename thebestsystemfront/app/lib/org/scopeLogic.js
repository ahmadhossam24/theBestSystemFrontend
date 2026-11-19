// Pure scope logic (no React), tested in Node.
// Pure: pick the effective team from what was stored + what the user can see.
export function resolveScope(user, branches, teams, stored) {
  if (!user) return { branchId: null, teamId: null, locked: true };
  if (user.role !== "director" && user.role !== "branchAdmin") {
    const t = teams.find((x) => x.id === user.teamId);
    return { branchId: t?.branchId ?? null, teamId: user.teamId ?? null, locked: true };
  }
  const visibleTeams = teams;
  let team = visibleTeams.find((t) => t.id === stored?.teamId);
  if (!team) team = visibleTeams.find((t) => t.branchId === stored?.branchId) || visibleTeams[0];
  return { branchId: team?.branchId ?? stored?.branchId ?? branches[0]?.id ?? null, teamId: team?.id ?? null, locked: false };
}
