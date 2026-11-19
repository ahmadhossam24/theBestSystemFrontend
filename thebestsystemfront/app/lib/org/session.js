"use client";
// Who is using the app right now. The user id is kept in localStorage ("ops-session-v2") and the
// account itself is re-read from the org service, so deleting or demoting someone takes effect at once.
// Next stage replaces the temporary "switch user" bar with a real sign-in page; this hook stays.
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { getOrgService } from "./orgClient.js";

const KEY = "ops-session-v2";
const EVT = "ops-session-changed";
export const ORG_CHANGED = "ops-org-changed";

const readId = () => {
  try {
    return localStorage.getItem(KEY) || null;
  } catch {
    return null;
  }
};
const subscribe = (cb) => {
  window.addEventListener(EVT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVT, cb);
    window.removeEventListener("storage", cb);
  };
};

export const setSessionUser = (id) => {
  try {
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
  } catch {}
  window.dispatchEvent(new Event(EVT));
};

// Call after anything that may have changed the signed-in account (rename, role change ...).
export const notifyOrgChanged = () => window.dispatchEvent(new Event(ORG_CHANGED));

export function useSession() {
  const userId = useSyncExternalStore(subscribe, readId, () => undefined); // undefined = still on the server
  const [state, setState] = useState({ loading: true, user: null });

  const refresh = useCallback(async () => {
    if (userId === undefined) return;
    if (!userId) return setState({ loading: false, user: null });
    const user = await getOrgService().getUser(userId);
    if (!user) setSessionUser(null); // deleted account: sign out
    setState({ loading: false, user });
  }, [userId]);

  useEffect(() => {
    refresh();
    window.addEventListener(ORG_CHANGED, refresh);
    return () => window.removeEventListener(ORG_CHANGED, refresh);
  }, [refresh]);

  return { loading: state.loading, user: state.user, signIn: setSessionUser, signOut: () => setSessionUser(null) };
}
