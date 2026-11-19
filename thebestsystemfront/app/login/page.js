"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getOrgService } from "../lib/org/orgClient.js";
import { setSessionUser, useSession } from "../lib/org/session.js";
import { Field, Notice, btnPrimary, inputCls } from "../components/org/ui.jsx";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { loading, user } = useSession();
  const [f, setF] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const next = params.get("next");
  const dest = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";

  useEffect(() => {
    getOrgService().needsFirstRun().then((first) => first && router.replace("/first-run"));
  }, [router]);
  useEffect(() => {
    if (!loading && user) router.replace(dest);
  }, [loading, user, dest, router]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const r = await getOrgService().authenticate(f.username, f.password);
      if (!r.ok) return setError(r.message);
      setSessionUser(r.value.id);
    } catch (err) {
      setError(err.message || "Could not sign in.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto mt-24 w-full max-w-sm space-y-4 rounded-2xl bg-white p-8 shadow-sm" data-testid="login-form">
      <h1 className="text-xl font-semibold text-slate-800">Sign in</h1>
      {error && <Notice kind="error">{error}</Notice>}
      <Field label="Username">
        <input className={inputCls} autoComplete="username" aria-label="Username" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} autoFocus />
      </Field>
      <Field label="Password">
        <input className={inputCls} type="password" autoComplete="current-password" aria-label="Password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
      </Field>
      <button className={`${btnPrimary} w-full`} disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      <p className="text-xs text-slate-400">Forgot your password? Ask an admin to reset it.</p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
