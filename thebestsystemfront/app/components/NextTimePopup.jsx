"use client";

import { useState } from "react";
import ModalShell, { Field, inputCls } from "./modals/ModalShell";
import { SR_TYPE_OPTIONS } from "../lib/datasetColumns";

const blank = { agentNotes: "", applyPhone: "", srType: "Normal", srEt: "", srVod: "" };

export default function NextTimePopup({ initialValues, onCancel, onSave }) {
  const [form, setForm] = useState({ ...blank, ...(initialValues || {}) });
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <ModalShell title="Mark as Next time" onClose={() => onCancel(form)}>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Field label="Agent notes">
            <textarea className={inputCls} rows={3} value={form.agentNotes} onChange={set("agentNotes")} />
          </Field>
        </div>
        <Field label="Apply phone">
          <input className={inputCls} value={form.applyPhone} onChange={set("applyPhone")} />
        </Field>
        <Field label="Red or normal">
          <select className={inputCls} value={form.srType} onChange={set("srType")}>
            {SR_TYPE_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Field>
        <Field label="SR ET">
          <input className={inputCls} value={form.srEt} onChange={set("srEt")} />
        </Field>
        <Field label="SR Vod">
          <input className={inputCls} value={form.srVod} onChange={set("srVod")} />
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
