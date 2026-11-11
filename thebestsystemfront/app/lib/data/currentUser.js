"use client";

import { useCallback, useEffect, useState } from "react";

// PLACEHOLDER until real sign-in exists: the "who did it" name written into history.
// When users sign in, replace the body of useCurrentUser() with the signed-in
// user's name — nothing else has to change.
const KEY = "ops-current-user-v1";
export const DEFAULT_USER = "Admin";

export function useCurrentUser() {
  const [name, setNameState] = useState(DEFAULT_USER);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved && saved.trim()) setNameState(saved.trim());
    } catch {}
  }, []);

  const setName = useCallback((next) => {
    const clean = String(next ?? "").trim() || DEFAULT_USER;
    setNameState(clean);
    try {
      localStorage.setItem(KEY, clean);
    } catch {}
  }, []);

  return { name, setName };
}
