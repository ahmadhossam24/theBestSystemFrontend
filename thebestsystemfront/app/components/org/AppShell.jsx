"use client";
// Wraps the whole app (used by layout.js).
//   /login and /first-run   -> shown bare (no sidebar)
//   no director yet         -> everything goes to /first-run
//   not signed in           -> everything goes to /login?next=...
//   signed in               -> sidebar + page, unless the role may not open that page
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "../sidebar.jsx";
import { getOrgService } from "../../lib/org/orgClient.js";
import { useSession } from "../../lib/org/session.js";
import { canOpenPath, isPublicPath } from "../../lib/org/routes.js";

const Loading = () => <p className="p-6 text-sm text-slate-400">Loading…</p>;

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { loading, user } = useSession();
  const [firstRun, setFirstRun] = useState(null);
  const pub = isPublicPath(pathname);

  useEffect(() => {
    let live = true;
    getOrgService().needsFirstRun().then((v) => live && setFirstRun(v));
    return () => {
      live = false;
    };
  }, [user?.id, pathname]);

  useEffect(() => {
    if (loading || firstRun === null || pub) return;
    if (firstRun) router.replace("/first-run");
    else if (!user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [loading, firstRun, user, pub, pathname, router]);

  if (pub) return <div style={{ minHeight: "100vh", background: "#f8fafc" }}>{children}</div>;
  if (loading || firstRun === null || firstRun || !user) return <Loading />;

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar user={user} />
      <main style={{ flex: 1, padding: "24px", background: "#f8fafc", overflow: "auto" }}>
        <div style={{ background: "white", borderRadius: "24px", padding: "24px", minHeight: "100%" }}>
          {canOpenPath(user, pathname) ? (
            children
          ) : (
            <div>
              <h1 className="text-xl font-semibold text-slate-800">No access</h1>
              <p className="mt-3 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500" data-testid="no-access">
                Your role ({user.role}) can't open this page.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
