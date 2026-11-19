// Which pages each role may open. Pure, no React. The sidebar hides what you can't open and
// AppShell blocks the URL if you type it anyway. (Data is protected by the service layer too.)
import { isAdminRole } from "./roles.js";

const is = (role, ...roles) => roles.includes(role);

export function canOpenPath(user, pathname) {
  if (!user) return false;
  const p = pathname || "/";
  if (p === "/branches" || p.startsWith("/branches/")) return is(user.role, "director", "branchAdmin");
  if (p === "/users" || p.startsWith("/users/")) return isAdminRole(user.role);
  if (p === "/setup-table" || p.startsWith("/setup-table/")) return isAdminRole(user.role);
  return true; // home, teams (views limit actions), tables, placeholders
}

// Pages that are shown without the sidebar and without being signed in.
export const isPublicPath = (pathname) => pathname === "/login" || pathname === "/first-run";
