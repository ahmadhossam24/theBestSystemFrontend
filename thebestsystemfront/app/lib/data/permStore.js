"use client";
// Browser storage for agent permissions (localStorage, one key) + a hook that stays in sync across components/tabs.
import { useCallback, useEffect, useState } from "react";
import { emptyPerms, normalizePerms } from "./agentPerms.js";

export const PERMS_KEY = "ops-perms-v2";
const EVT = "ops-perms-changed";

const read = () => {
  try {
    return normalizePerms(JSON.parse(localStorage.getItem(PERMS_KEY) || "null"));
  } catch {
    return emptyPerms();
  }
};

export function usePerms() {
  const [perms, setPerms] = useState(emptyPerms());
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sync = () => setPerms(read());
    sync();
    setReady(true);
    const onStorage = (e) => e.key === PERMS_KEY && sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  // update(fn): fn gets the CURRENT stored perms and returns the new ones
  const update = useCallback((fn) => {
    const next = fn(read());
    try {
      localStorage.setItem(PERMS_KEY, JSON.stringify(next));
    } catch {}
    window.dispatchEvent(new Event(EVT));
  }, []);
  return { perms, ready, update };
}
