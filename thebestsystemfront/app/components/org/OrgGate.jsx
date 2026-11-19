"use client";
// Org pages get the signed-in user from here. Sign-in itself is handled by AppShell (login page).
import { useSession } from "../../lib/org/session.js";

export default function OrgGate({ children }) {
  const { loading, user } = useSession();
  if (loading || !user) return <p className="text-sm text-slate-400">Loading…</p>;
  return children({ actor: user });
}
