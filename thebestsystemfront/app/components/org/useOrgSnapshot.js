"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getOrgService } from "../../lib/org/orgClient.js";
import { isAdminRole } from "../../lib/org/roles.js";
import { ORG_CHANGED, notifyOrgChanged } from "../../lib/org/session.js";

const EMPTY = { branches: [], teams: [], users: [], deletedBranches: [], deletedTeams: [], deletedUsers: [] };

/**
 * Everything the signed-in user may see, active + deleted, in one load:
 *   { branches, teams, users, deletedBranches, deletedTeams, deletedUsers }
 * `org` is { branches, teams, users } over ALL of those (what permissions.js needs to find a team's branch).
 * mutate(promise) runs a service call, reloads on success and returns its result.
 */
export function useOrgSnapshot(actor) {
  const svc = getOrgService();
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const admin = isAdminRole(actor.role);

  const load = useCallback(async () => {
    try {
      const empty = { ok: true, value: [] };
      const [b, db, t, dt, u, du] = await Promise.all([
        svc.listBranches(actor.id),
        svc.listBranches(actor.id, { deleted: true }),
        svc.listTeams(actor.id),
        svc.listTeams(actor.id, { deleted: true }),
        admin ? svc.listUsers(actor.id) : empty,
        admin ? svc.listUsers(actor.id, { deleted: true }) : empty,
      ]);
      const bad = [b, db, t, dt, u, du].find((r) => !r.ok);
      if (bad) throw new Error(bad.message);
      setData({ branches: b.value, deletedBranches: db.value, teams: t.value, deletedTeams: dt.value, users: u.value, deletedUsers: du.value });
      setError("");
    } catch (e) {
      setError(e.message || "Could not load.");
    } finally {
      setLoading(false);
    }
  }, [svc, actor.id, actor.role, admin]);

  useEffect(() => {
    load();
  }, [load]);

  const org = useMemo(
    () => ({
      branches: [...data.branches, ...data.deletedBranches],
      teams: [...data.teams, ...data.deletedTeams],
      users: [...data.users, ...data.deletedUsers],
    }),
    [data]
  );

  const mutate = useCallback(
    async (promise) => {
      const r = await promise;
      if (r.ok) {
        await load();
        notifyOrgChanged(); // the signed-in account itself may have changed
      }
      return r;
    },
    [load]
  );

  const branchName = useCallback(
    (id) => org.branches.find((b) => b.id === id)?.name || org.teams.find((t) => t.branchId === id && t.branchName)?.branchName || "—",
    [org]
  );
  const teamName = useCallback((id) => org.teams.find((t) => t.id === id)?.name || "—", [org]);

  return { ...data, org, loading, error, reload: load, mutate, svc, branchName, teamName };
}

export { ORG_CHANGED };
