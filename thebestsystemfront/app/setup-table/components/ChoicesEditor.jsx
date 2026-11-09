"use client";

import { useState } from "react";

const inputCls =
  "rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-800 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100";

// Add / rename / remove the options of one "choices" column.
export default function ChoicesEditor({ options, onChange }) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const v = draft.trim();
    if (!v) return;
    if (options.some((o) => o.trim().toLowerCase() === v.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...options, v]);
    setDraft("");
  };

  return (
    <div className="mt-2 rounded-lg bg-slate-50 p-3">
      <p className="mb-2 text-xs font-medium text-slate-500">Choices</p>

      <div className="flex flex-col gap-1.5">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              className={`${inputCls} flex-1`}
              value={opt}
              onChange={(e) => onChange(options.map((o, j) => (j === i ? e.target.value : o)))}
            />
            <button
              type="button"
              title="Remove choice"
              onClick={() => onChange(options.filter((_, j) => j !== i))}
              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <input
          className={`${inputCls} flex-1`}
          value={draft}
          placeholder="New choice, then press Enter"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button
          type="button"
          onClick={add}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-white"
        >
          Add
        </button>
      </div>
    </div>
  );
}
