// In-memory repository: used by the tests (and handy for experiments).
// Same contract as idbRepo.js:
//   all(store) / get(store, id) / write(ops)  where ops = [{ store, put: obj } | { store, delete: id }]
// write() is all-or-nothing, and users must have a unique `usernameKey`.
export const STORES = ["branches", "teams", "users", "log"];

export function createMemoryRepo() {
  const data = Object.fromEntries(STORES.map((s) => [s, new Map()]));
  const clone = (v) => (v === undefined ? v : structuredClone(v));

  return {
    async all(store) {
      return [...data[store].values()].map(clone);
    },
    async get(store, id) {
      return clone(data[store].get(id)) ?? null;
    },
    async write(ops) {
      // check everything first, then apply, so a failure changes nothing
      const users = new Map(data.users);
      for (const op of ops) {
        if (op.store !== "users") continue;
        if ("put" in op) users.set(op.put.id, op.put);
        else users.delete(op.delete);
      }
      const seen = new Set();
      for (const u of users.values()) {
        if (seen.has(u.usernameKey)) {
          const err = new Error("Unique constraint: usernameKey");
          err.name = "ConstraintError";
          throw err;
        }
        seen.add(u.usernameKey);
      }
      for (const op of ops) {
        if ("put" in op) data[op.store].set(op.put.id, clone(op.put));
        else data[op.store].delete(op.delete);
      }
    },
    async clear() {
      STORES.forEach((s) => data[s].clear());
    },
  };
}
