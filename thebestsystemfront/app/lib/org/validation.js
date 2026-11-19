// Field rules for branches, teams and users. Each returns an error string or "" (fine).
export const MIN_PASSWORD = 6;

export const cleanName = (s) => String(s ?? "").normalize("NFKC").replace(/\s+/g, " ").trim();

// Usernames are compared case-insensitively: "Sara" and "sara" are the same login.
export const usernameKey = (s) => String(s ?? "").normalize("NFKC").trim().toLowerCase();

export function checkUsername(s) {
  const v = String(s ?? "").normalize("NFKC").trim();
  if (!v) return "Username is required.";
  if (v.length < 3) return "Username must be at least 3 characters.";
  if (v.length > 32) return "Username must be at most 32 characters.";
  if (!/^[\p{L}\p{N}._-]+$/u.test(v)) return "Username may only contain letters, numbers, dot, dash and underscore.";
  return "";
}

export function checkPassword(s) {
  const v = String(s ?? "");
  if (!v) return "Password is required.";
  if (v.length < MIN_PASSWORD) return `Password must be at least ${MIN_PASSWORD} characters.`;
  if (v.length > 128) return "Password is too long.";
  return "";
}

export function checkName(s, what) {
  const v = cleanName(s);
  if (!v) return `${what} name is required.`;
  if (v.length > 60) return `${what} name must be at most 60 characters.`;
  return "";
}

export function checkDisplayName(s) {
  const v = cleanName(s);
  return v.length > 60 ? "Name must be at most 60 characters." : "";
}
