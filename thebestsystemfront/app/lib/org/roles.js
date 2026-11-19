// ---------------------------------------------------------------------------
// The five roles, highest first. Pure data, no React.
//
//   director     sees/does everything, in every branch
//   branchAdmin  everything inside ONE branch
//   teamAdmin    everything inside ONE team
//   superAgent   sees + edits everything in ONE team, no admin tools
//   agent        sees ONE team's data, edits only what an admin allows
// ---------------------------------------------------------------------------
export const ROLES = ["director", "branchAdmin", "teamAdmin", "superAgent", "agent"];

export const ROLE_LABELS = {
  director: "Director",
  branchAdmin: "Branch admin",
  teamAdmin: "Team admin",
  superAgent: "Super agent",
  agent: "Agent",
};

export const RANK = { director: 5, branchAdmin: 4, teamAdmin: 3, superAgent: 2, agent: 1 };

// Where a role's powers apply.
export const SCOPE = { director: "all", branchAdmin: "branch", teamAdmin: "team", superAgent: "team", agent: "team" };

export const isRole = (r) => ROLES.includes(r);
export const isAdminRole = (r) => (RANK[r] || 0) >= RANK.teamAdmin; // director, branch admin, team admin
export const rolesBelow = (r) => ROLES.filter((x) => RANK[x] < RANK[r]);

// Roles whose user belongs to a TEAM (and through it, a branch).
export const isTeamRole = (r) => SCOPE[r] === "team";
