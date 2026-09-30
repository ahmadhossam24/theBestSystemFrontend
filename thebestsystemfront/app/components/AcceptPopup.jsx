"use client";

import { useState } from "react";
import ModalShell, { Field, inputCls } from "./modals/ModalShell";
import { MODEM_OPTIONS, PAY_METHOD_OPTIONS, PACKAGE_OPTIONS } from "../lib/datasetColumns";

const blank = { agentNotes: "", address: "", landlineOwner: "", modem: "No", payMethod: "Cash", packageName: "330GB" };

export default function AcceptPopup({ initialValues, onCancel, onSave }) {
  const [form, setForm] = useState({ ...blank, ...(initialValues || {}) });
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <ModalShell title="Mark as Accept" onClose={() => onCancel(form)}>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Field label="Agent notes">
            <textarea className={inputCls} rows={3} value={form.agentNotes} onChange={set("agentNotes")} />
          </Field>
        </div>
        <Field label="Address">
          <input className={inputCls} value={form.address} onChange={set("address")} />
        </Field>
        <Field label="Landline owner">
          <input className={inputCls} value={form.landlineOwner} onChange={set("landlineOwner")} />
        </Field>
        <Field label="Modem">
          <select className={inputCls} value={form.modem} onChange={set("modem")}>
            {MODEM_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Installment or cash">
          <select className={inputCls} value={form.payMethod} onChange={set("payMethod")}>
            {PAY_METHOD_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Package name">
          <select className={inputCls} value={form.packageName} onChange={set("packageName")}>
            {PACKAGE_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <button onClick={() => onCancel(form)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">
          Cancel
        </button>
        <button onClick={() => onSave(form)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Save
        </button>
      </div>
    </ModalShell>
  );
}
