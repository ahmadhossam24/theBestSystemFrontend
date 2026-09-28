"use client";

import { useState } from "react";
import ModalShell, { Field, inputCls } from "./ModalShell";

const initial = {
  gsm: "",
  activeDate: "",
  visitDate: "",
  assignStatus: "Pending",
  pendingReason: "",
  followUpNotes: "",
  naOrDate: "N/A",
};

export default function CollectionModal({ onClose, onConfirm }) {
  const [form, setForm] = useState(initial);
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <ModalShell title="Transfer to Collection table" onClose={onClose}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="GSM">
          <input className={inputCls} value={form.gsm} onChange={set("gsm")} placeholder="01xxxxxxxxx" />
        </Field>
        <Field label="Active date">
          <input type="date" className={inputCls} value={form.activeDate} onChange={set("activeDate")} />
        </Field>
        <Field label="Visit date">
          <input type="date" className={inputCls} value={form.visitDate} onChange={set("visitDate")} />
        </Field>
        <Field label="Assigned / Pending">
          <select className={inputCls} value={form.assignStatus} onChange={set("assignStatus")}>
            <option>Assigned</option>
            <option>Pending</option>
          </select>
        </Field>
        <div className="col-span-2">
          <Field label="Pending reason">
            <input className={inputCls} value={form.pendingReason} onChange={set("pendingReason")} placeholder="Only if pending" />
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="Follow up notes">
            <textarea className={inputCls} rows={2} value={form.followUpNotes} onChange={set("followUpNotes")} />
          </Field>
        </div>
        <Field label="N/A or date">
          <input className={inputCls} value={form.naOrDate} onChange={set("naOrDate")} placeholder="N/A or dd-mm-yyyy" />
        </Field>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">
          Cancel
        </button>
        <button
          onClick={() => onConfirm(form)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Transfer
        </button>
      </div>
    </ModalShell>
  );
}
