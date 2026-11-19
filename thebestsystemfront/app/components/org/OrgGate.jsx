"use client";
// Wraps every organisation page:
//   - nothing set up yet  -> sends you to /first-run to create the director
//   - nobody signed in    -> TEMPORARY "choose a user" screen (real sign-in arrives next stage)
//   - signed in           -> shows the page, with a small "signed in as ... / switch user" bar
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getOrgService } from "../../lib/org/orgClient.js";
import { useSession } from "../../lib/org/session.js";
import { RoleBadge, btnGhost } from "./ui.jsx";

function UserPicker({ onPick, heading }) {
  const [users, setUsers] = useState(null);
  useEffect(() => {
    getOrgService().tempListAllForSwitcher().then(setUsers);
  }, []);
  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-xl font-semibold text-slate-800">{heading}</h1>
      <p className="mb-4 mt-1 text-sm text-amber-700">Temporary: pick an account to act as. A real username + password sign-in replaces this in the next stage.</p>
      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
        {(users || []).map((u) => (
          <li key={u.id}>
            <button onClick={() => onPick(u.id)} data-testid={`pick-${u.username}`} className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-slate-50">
              <span className="text-slate-700">
                {u.name} <span className="text-slate-400">({u.username})</span>
              </span>
              <RoleBadge role={u.role} />
            </button>
          </li>
        ))}
        {users === null && <li className="px-4 py-3 text-sm text-slate-400">Loading…</li>}
      </ul>
    </div>
  );
}

export default function OrgGate({ children }) {
  const router = useRouter();
  const { loading, user, signIn, signOut } = useSession();
  const [firstRun, setFirstRun] = useState(null);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    getOrgService().needsFirstRun().then(setFirstRun);
  }, []);
  useEffect(() => {
    if (firstRun === true) router.replace("/first-run");
  }, [firstRun, router]);

  if (loading || firstRun === null || firstRun === true) return <p className="text-sm text-slate-400">Loading…</p>;
  if (!user) return <UserPicker heading="Who is using the app?" onPick={signIn} />;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-4 py-2 text-sm" data-testid="actor-bar">
        <span className="text-slate-500">
          Signed in as <strong data-testid="actor-name" className="text-slate-700">{user.displayName}</strong> <RoleBadge role={user.role} />
        </span>
        <span className="flex items-center gap-2">
          <button onClick={() => setSwitching(true)} className={`${btnGhost} !px-3 !py-1 text-xs`} data-testid="switch-user">
            Switch user (temporary)
          </button>
          <button onClick={signOut} className={`${btnGhost} !px-3 !py-1 text-xs`}>
            Sign out
          </button>
        </span>
      </div>
      {switching ? (
        <UserPicker
          heading="Switch user"
          onPick={(id) => {
            signIn(id);
            setSwitching(false);
          }}
        />
      ) : (
        children({ actor: user })
      )}
    </div>
  );
}
