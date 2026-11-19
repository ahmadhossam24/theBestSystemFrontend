// Password hashing with the browser's / Node's built-in WebCrypto: PBKDF2-SHA256 with a
// random salt per password. Only the hash is ever stored - never the password.
// (In this browser-only demo it is still not secure: whoever can open DevTools can edit
// the data. A real server does the same hashing on its side.)
const ITERATIONS = 150000;
const enc = new TextEncoder();

const toB64 = (buf) => {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
};
const fromB64 = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

async function derive(password, salt, iterations) {
  const key = await crypto.subtle.importKey("raw", enc.encode(String(password).normalize("NFKC")), "PBKDF2", false, ["deriveBits"]);
  return crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { algo: "pbkdf2-sha256", iterations: ITERATIONS, salt: toB64(salt), hash: toB64(await derive(password, salt, ITERATIONS)) };
}

export async function verifyPassword(password, record) {
  if (!record || record.algo !== "pbkdf2-sha256") return false;
  const got = new Uint8Array(await derive(password, fromB64(record.salt), record.iterations));
  const want = fromB64(record.hash);
  if (got.length !== want.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got[i] ^ want[i]; // constant-time compare
  return diff === 0;
}
