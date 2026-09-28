"use client";

import { useState } from "react";
import ModalShell, { Field, inputCls } from "./ModalShell";

const initial = {
  created: "No",
  srType: "Normal",
  applyPhone: "",
  additionalPhone: "",
  packageName: "330GB",
  modem: "No",
  payMethod: "Cash",
  creationNotes: "",
};

export default function CreateTableModal({ onClose, onConfirm }) {
  const [form, setForm] = useState(initial);
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <ModalShell title="Transfer to Create table" onClose={onClose}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Created?">
          <select className={inputCls} value={form.created} onChange={set("created")}>
            <option>No</option>
            <option>Yes</option>
          </select>
        </Field>
        <Field label="SRs">
          <select className={inputCls} value={form.srType} onChange={set("srType")}>
            <option>Red</option>
            <option>Normal</option>
          </select>
        </Field>
        <Field label="Apply phone">
          <input className={inputCls} value={form.applyPhone} onChange={set("applyPhone")} placeholder="01xxxxxxxxx" />
        </Field>
        <Field label="Additional phone">
          <input className={inputCls} value={form.additionalPhone} onChange={set("additionalPhone")} placeholder="Optional" />
        </Field>
        <Field label="Package name">
          <select className={inputCls} value={form.packageName} onChange={set("packageName")}>
            <option>330GB</option>
            <option>450GB</option>
          </select>
        </Field>
        <Field label="Modem">
          <select className={inputCls} value={form.modem} onChange={set("modem")}>
            <option>Yes</option>
            <option>No</option>
          </select>
        </Field>
        <Field label="Pay method">
          <select className={inputCls} value={form.payMethod} onChange={set("payMethod")}>
            <option>Installment</option>
            <option>Cash</option>
          </select>
        </Field>
        <div className="col-span-2">
          <Field label="Creation notes">
            <textarea className={inputCls} rows={3} value={form.creationNotes} onChange={set("creationNotes")} />
          </Field>
        </div>
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
