"use client";
import { useEffect } from "react";
import { ROLE_LABELS } from "../../lib/org/roles.js";

export const inputCls =
  "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400";
export const btnPrimary = "rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50";
export const btnGhost = "rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50";
export const linkBtn = "text-xs font-medium text-blue-600 hover:underline disabled:opacity-40";
export const linkDanger = "text-xs font-medium text-red-600 hover:underline disabled:opacity-40";

const ROLE_STYLE = {
  director: "bg-purple-50 text-purple-700",
  branchAdmin: "bg-indigo-50 text-indigo-700",
  teamAdmin: "bg-blue-50 text-blue-700",
  superAgent: "bg-teal-50 text-teal-700",
  agent: "bg-slate-100 text-slate-600",
};
export const RoleBadge = ({ role }) => (
  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_STYLE[role] || ROLE_STYLE.agent}`}>{ROLE_LABELS[role] || role}</span>
);

export function Field({ label, error, hint, children }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-600">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

export function Notice({ kind = "ok", children }) {
  const cls = kind === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700";
  return (
    <p role={kind === "error" ? "alert" : "status"} className={`mb-3 rounded-lg px-3 py-2 text-sm ${cls}`}>
      {children}
    </p>
  );
}

export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`max-h-[92vh] w-full overflow-y-auto rounded-2xl bg-white shadow-xl ${wide ? "max-w-2xl" : "max-w-md"}`}>
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// A modal with Cancel + a confirm button, for "are you sure" steps.
export function ConfirmModal({ title, children, confirmLabel, danger, busy, error, onConfirm, onClose }) {
  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-3 text-sm text-slate-600">{children}</div>
      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} disabled={busy} className={btnGhost}>
          Cancel
        </button>
        <button type="button" onClick={onConfirm} disabled={busy} className={danger ? "rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50" : btnPrimary}>
          {busy ? "Working…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export const fmtDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}`;
};

export const PageHeader = ({ title, count, children }) => (
  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
    <div>
      <h1 className="text-xl font-semibold text-slate-800">{title}</h1>
      {count !== undefined && <p className="text-sm text-slate-400">{count.toLocaleString()} in total</p>}
    </div>
    <div className="flex flex-wrap items-center gap-2">{children}</div>
  </div>
);

export const tableCls = "w-full text-left text-sm";
export const thCls = "bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400";
export const tdCls = "px-4 py-3 text-slate-700";
export const EmptyRow = ({ cols, children }) => (
  <tr>
    <td colSpan={cols} className="px-4 py-10 text-center text-sm text-slate-400">
      {children}
    </td>
  </tr>
);
