"use client";
// The "which team am I looking at" choice.
//   director      -> any branch, any team
//   branch admin  -> any team of his branch
//   everyone else -> fixed to their own team (no choice)
// Stored per user in localStorage, and always re-validated against the teams the user can see.
import { useCallback, useEffect, useMemo, useState } from "react";
import { getOrgService } from "./orgClient.js";
import { ORG_CHANGED } from "./session.js";
import { resolveScope } from "./scopeLogic.js";

const keyOf = (userId) => `ops-scope-v2:${userId}`;
const EVT = "ops-scope-changed";
const read = (userId) => {
  try {
    return JSON.parse(localStorage.getItem(keyOf(userId)) || "null");
  } catch {
    return null;
  }
};

export function useScope(user) {
  const svc = getOrgService();
  const [data, setData] = useState({ branches: [], teams: [], ready: false });
  const [stored, setStored] = useState(null);
  const userId = user?.id;

  const load = useCallback(async () => {
    if (!userId) return;
    const [b, t] = await Promise.all([svc.listBranches(userId), svc.listTeams(userId)]);
    setData({ branches: b.ok ? b.value : [], teams: t.ok ? t.value : [], ready: true });
  }, [svc, userId, user?.role, user?.teamId, user?.branchId]);

  useEffect(() => {
    load();
    window.addEventListener(ORG_CHANGED, load);
    return () => window.removeEventListener(ORG_CHANGED, load);
  }, [load]);

  useEffect(() => {
    if (!userId) return;
    const sync = () => setStored(read(userId));
    sync();
    window.addEventListener(EVT, sync);
    return () => window.removeEventListener(EVT, sync);
  }, [userId]);

  const scope = useMemo(() => resolveScope(user, data.branches, data.teams, stored), [user, data, stored]);

  const choose = useCallback(
    ({ branchId, teamId }) => {
      if (!userId) return;
      try {
        localStorage.setItem(keyOf(userId), JSON.stringify({ branchId, teamId }));
      } catch {}
      window.dispatchEvent(new Event(EVT));
    },
    [userId]
  );

  return { ...data, scope, choose };
}
