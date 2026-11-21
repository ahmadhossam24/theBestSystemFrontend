"use client";
// app/page.js — home: who you are, where you work, and the pages your role can use.
import Link from "next/link";
import { useSession } from "./lib/org/session.js";
import { useScope } from "./lib/org/scope.js";
import { isAdminRole, ROLE_LABELS } from "./lib/org/roles.js";

export default function HomePage() {
  const { user } = useSession();
  const { teams, scope } = useScope(user);
  if (!user) return null;
  const team = teams.find((t) => t.id === scope.teamId);
  const admin = isAdminRole(user.role);
  const top = user.role === "director" || user.role === "branchAdmin";
  const links = [
    top && ["/branches/all", "Branches"],
    ["/teams/all", "Teams"],
    admin && ["/users/all", "Users"],
    admin && ["/users/permissions", "Agent permissions"],
    admin && ["/setup-table", "Setup tables"],
    admin && ["/export", "Export data"],
  ].filter(Boolean);
  return (
    <div data-testid="home">
      <h1 className="text-xl font-semibold text-slate-800">Welcome, {user.displayName}</h1>
      <p className="mt-1 text-sm text-slate-500">
        {ROLE_LABELS[user.role]}
        {team ? ` · working in ${team.name}${team.branchName ? ` (${team.branchName})` : ""}` : ""}
      </p>
      <p className="mt-4 text-sm text-slate-500">Use the sidebar to open a table under Data{admin ? ", or jump straight to:" : "."}</p>
      {links.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
              {label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
