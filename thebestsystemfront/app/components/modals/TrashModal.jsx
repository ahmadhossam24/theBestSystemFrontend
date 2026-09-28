"use client";

import { useState } from "react";
import ModalShell, { Field, inputCls } from "./ModalShell";

export default function TrashModal({ onClose, onConfirm }) {
  const [notes, setNotes] = useState("");

  return (
    <ModalShell title="Transfer to Trash table" onClose={onClose}>
      <Field label="Trash notes">
        <textarea
          className={inputCls}
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Reason for trashing this row..."
        />
      </Field>

      <div className="mt-6 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">
          Cancel
        </button>
        <button
          onClick={() => onConfirm(notes)}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Transfer
        </button>
      </div>
    </ModalShell>
  );
}
