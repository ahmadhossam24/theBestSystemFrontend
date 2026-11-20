"use client";
// The Agent column's choices = the agents + super agents of the table's team (real users).
// The stored value is the person's USERNAME (unique, short). Pure helper + one hook.
import { useEffect, useState } from "react";
import { getOrgService } from "../org/orgClient.js";
import { ORG_CHANGED } from "../org/session.js";

// Pure. Returns columns with the Agent column's options replaced.
export function withAgentOptions(columns, usernames) {
  const opts = [...new Set(usernames)];
  return columns.map((c) => (c.key === "agent" && !c.ownerTableId ? { ...c, options: opts } : c));
}

export function useTeamAgents(actorId, teamId) {
  const [names, setNames] = useState([]);
  useEffect(() => {
    if (!actorId || !teamId) return setNames([]);
    let live = true;
    const load = () =>
      getOrgService()
        .listAgents(actorId, teamId)
        .then((r) => live && setNames(r.ok ? r.value.map((a) => a.username) : []));
    load();
    window.addEventListener(ORG_CHANGED, load);
    return () => {
      live = false;
      window.removeEventListener(ORG_CHANGED, load);
    };
  }, [actorId, teamId]);
  return names;
}
