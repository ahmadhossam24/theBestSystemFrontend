"use client";

import { useEffect, useRef, useState } from "react";

/**
 * type: "text" | "select" | "date"
 * options: array of strings, required for type="select"
 */
export default function EditableCell({ value, type = "text", options = [], onSave, placeholder = "—" }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const inputRef = useRef(null);

  useEffect(() => setDraft(value ?? ""), [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current.select) inputRef.current.select();
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft !== value) onSave(draft);
  };

  const cancel = () => {
    setDraft(value ?? "");
    setEditing(false);
  };

  if (!editing) {
    return (
      <div
        onClick={() => setEditing(true)}
        className="min-w-[110px] cursor-text rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-blue-50/60 hover:ring-1 hover:ring-inset hover:ring-blue-200 transition-colors"
        title="Click to edit"
      >
        {value === "" || value === undefined || value === null ? (
          <span className="text-slate-300">{placeholder}</span>
        ) : (
          value
        )}
      </div>
    );
  }

  if (type === "select") {
    // options can be plain strings ("Accept") or { value, label } objects,
    // e.g. { value: "", label: "— Select —" } for a blank default.
    const normalized = options.map((opt) =>
      typeof opt === "string" ? { value: opt, label: opt === "" ? "— Select —" : opt } : opt
    );
    return (
      <select
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") cancel();
        }}
        className="w-full min-w-[110px] rounded-md border border-blue-300 bg-white px-2 py-1.5 text-sm text-slate-800 outline-none ring-2 ring-blue-100"
      >
        {normalized.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      ref={inputRef}
      type={type === "date" ? "date" : "text"}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") cancel();
      }}
      className="w-full min-w-[110px] rounded-md border border-blue-300 bg-white px-2 py-1.5 text-sm text-slate-800 outline-none ring-2 ring-blue-100"
    />
  );
}
