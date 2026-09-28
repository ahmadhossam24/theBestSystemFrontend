"use client";

import { useData } from "../context/DataContext";

export default function Toast() {
  const { toast } = useData();
  if (!toast) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-xl animate-[fadeIn_0.15s_ease-out]">
      ✓ {toast}
    </div>
  );
}
