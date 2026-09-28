"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function RowActions({ rowId, transferOptions, onDelete }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="flex items-center justify-center gap-1">
      <button
        title="Transaction history"
        onClick={() => router.push(`/transactions/${rowId}`)}
        className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
      >
        🕒
      </button>

      <div className="relative" ref={menuRef}>
        <button
          title="Transfer row"
          onClick={() => setOpen((o) => !o)}
          className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-700 transition-colors"
        >
          ↗
        </button>
        {open && (
          <div className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
            {transferOptions.map((opt) => (
              <button
                key={opt.label}
                onClick={() => {
                  setOpen(false);
                  opt.onSelect();
                }}
                className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        title="Delete row"
        onClick={onDelete}
        className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
      >
        🗑
      </button>
    </div>
  );
}
