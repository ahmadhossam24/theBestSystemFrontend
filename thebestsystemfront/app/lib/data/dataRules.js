// What each role may do on a table page. Pure. (Per-agent edit rights come in Stage 5.)
//   import / bulkEdit : admins only (director, branch admin, team admin)
//   transfer          : everyone who can open the table
//   editCells         : everyone except plain agents (an agent edits only what an admin allows: Stage 5)
import { isAdminRole } from "../org/roles.js";

export function tableCaps(role) {
  const admin = isAdminRole(role);
  return { import: admin, bulkEdit: admin, transfer: !!role, editCells: !!role && role !== "agent" };
}

// May this user open tables of this team? `teams` = the teams the service lets them see.
export const canReachTeam = (teams, teamId) => !!teamId && teams.some((t) => t.id === teamId);
