"use client";
// Shown only while the system has no users: creates the first director (and optionally a demo organisation).
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getOrgService } from "../lib/org/orgClient.js";
import { setSessionUser } from "../lib/org/session.js";
import { DEMO_PASSWORD, seedDemoOrg } from "../lib/org/demoSeed.js";
import { seedDemoData } from "../lib/org/demoData.js";
import { Field, Notice, btnPrimary, inputCls } from "../components/org/ui.jsx";

export default function FirstRunPage() {
  const router = useRouter();
  const [state, setState] = useState("checking"); // checking | form | done
  const [f, setF] = useState({ displayName: "", username: "", password: "", confirm: "", demo: false, data: true });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [seeded, setSeeded] = useState(null);

  useEffect(() => {
    getOrgService().needsFirstRun().then((first) => {
      if (!first) router.replace("/");
      else setState("form");
    });
  }, [router]);

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setMessage("");
    if (f.password !== f.confirm) return setErrors({ confirm: "The two passwords don't match." });
    setBusy(true);
    try {
      const svc = getOrgService();
      const r = await svc.createFirstDirector({ username: f.username, password: f.password, displayName: f.displayName });
      if (!r.ok) {
        setErrors(r.errors || {});
        setMessage(r.message);
        return;
      }
      setSessionUser(r.value.id);
      if (f.demo) {
        const org = await seedDemoOrg(svc, r.value.id);
        const data = f.data ? await seedDemoData(org, r.value.displayName) : null;
        setSeeded({ ...org, data });
      }
      setState("done");
      if (!f.demo) router.replace("/");
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (state === "checking") return <p className="text-sm text-slate-400">Loading…</p>;

  if (state === "done" && seeded) {
    return (
      <div className="mx-auto max-w-xl">
        <h1 className="text-xl font-semibold text-slate-800">Demo organisation created</h1>
        <p className="mb-4 mt-1 text-sm text-slate-500">
          You are signed in as the director. Every demo account below uses the password <strong data-testid="demo-password">{DEMO_PASSWORD}</strong>.
        </p>
        {seeded.data && (
          <p className="mb-3 text-sm text-slate-500" data-testid="demo-data">
            Sample data: {seeded.data.map((d) => `${d.team} – ${d.tables} tables, ${d.rows} rows`).join(" · ")}.
          </p>
        )}
        <ul className="mb-5 divide-y divide-slate-100 rounded-xl border border-slate-100 text-sm">
          {seeded.accounts.map((a) => (
            <li key={a.username} className="flex justify-between px-4 py-2">
              <span className="text-slate-700">
                {a.name} <span className="text-slate-400">({a.username})</span>
              </span>
              <span className="text-slate-500">{a.role}</span>
            </li>
          ))}
        </ul>
        <button onClick={() => router.replace("/branches/all")} className={btnPrimary}>
          Continue
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-md space-y-4" noValidate>
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Welcome — set up the system</h1>
        <p className="mt-1 text-sm text-slate-500">Create the director account. The director can create branches, teams and every other kind of user.</p>
      </div>
      {message && <Notice kind="error">{message}</Notice>}
      <Field label="Your name" error={errors.displayName}>
        <input className={inputCls} value={f.displayName} onChange={set("displayName")} placeholder="e.g. Ahmed" />
      </Field>
      <Field label="Username" error={errors.username} hint="Letters, numbers, dot, dash, underscore. Not case-sensitive.">
        <input className={inputCls} value={f.username} onChange={set("username")} autoComplete="username" />
      </Field>
      <Field label="Password" error={errors.password} hint="At least 6 characters.">
        <input type="password" className={inputCls} value={f.password} onChange={set("password")} autoComplete="new-password" />
      </Field>
      <Field label="Repeat password" error={errors.confirm}>
        <input type="password" className={inputCls} value={f.confirm} onChange={set("confirm")} autoComplete="new-password" />
      </Field>
      <label className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
        <input type="checkbox" checked={f.demo} onChange={set("demo")} className="mt-0.5" data-testid="demo-checkbox" />
        <span>
          Also load a demo organisation <span className="text-slate-400">(2 branches, 3 teams, 11 people of every role; password “{DEMO_PASSWORD}”)</span>
        </span>
      </label>
      {f.demo && (
        <label className="-mt-2 ml-6 flex items-start gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={f.data} onChange={set("data")} className="mt-0.5" data-testid="demo-data-checkbox" />
          <span>
            …with sample tables, rows, history and agent permissions <span className="text-slate-400">(3 tables per team, 36 rows each)</span>
          </span>
        </label>
      )}
      <button type="submit" disabled={busy} className={btnPrimary}>
        {busy ? "Creating…" : "Create director"}
      </button>
    </form>
  );
}
