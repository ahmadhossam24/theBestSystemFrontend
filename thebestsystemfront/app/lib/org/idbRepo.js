// IndexedDB repository (the browser's storage for the demo).
// Database "ops-org-v2" - a new name on purpose, so it can never clash with the older data.
// Same contract as memoryRepo.js. Swapping this file for calls to a real server is the
// only change a Django backend needs on this side.
import { STORES } from "./memoryRepo.js";

const DB_NAME = "ops-org-v2";
const DB_VERSION = 1;

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      STORES.forEach((name) => {
        const store = db.createObjectStore(name, { keyPath: "id" });
        if (name === "users") store.createIndex("byUsername", "usernameKey", { unique: true });
      });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const wrap = (req) =>
  new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

export function createIdbRepo() {
  let dbPromise = null;
  const db = () => (dbPromise ||= open());

  return {
    async all(store) {
      return wrap((await db()).transaction(store, "readonly").objectStore(store).getAll());
    },
    async get(store, id) {
      return (await wrap((await db()).transaction(store, "readonly").objectStore(store).get(id))) ?? null;
    },
    async write(ops) {
      const d = await db();
      const names = [...new Set(ops.map((o) => o.store))];
      return new Promise((resolve, reject) => {
        const tx = d.transaction(names, "readwrite");
        tx.oncomplete = () => resolve();
        tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
        tx.onerror = () => {}; // the abort handler reports it
        for (const op of ops) {
          const os = tx.objectStore(op.store);
          if ("put" in op) os.put(op.put);
          else os.delete(op.delete);
        }
      });
    },
    async clear() {
      const d = await db();
      return new Promise((resolve, reject) => {
        const tx = d.transaction(STORES, "readwrite");
        STORES.forEach((s) => tx.objectStore(s).clear());
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    },
  };
}
