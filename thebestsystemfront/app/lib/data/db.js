// ---------------------------------------------------------------------------
// IndexedDB storage for ROWS and ROW HISTORY.
// (Table definitions stay in localStorage — see setup-table/hooks/useTables.js)
//
// Database "ops-data-v1"
//   store "rows"     key: id
//        indexes:  byDataset (datasetTableId)  byGeneral (generalTableId)  bySample (sample)
//        NOTE: IndexedDB leaves a record OUT of an index when that field is null/
//        undefined, which is exactly what we want: a row with no general table
//        simply isn't in "byGeneral".
//   store "history"  key: id        index: byRow (rowId)
//
// Every function returns a Promise. Nothing here knows about columns or UI.
// ---------------------------------------------------------------------------

const DB_NAME = "ops-data-v1";
const DB_VERSION = 1;

export const INDEX_FOR_TABLE_TYPE = { dataset: "byDataset", general: "byGeneral" };

let dbPromise = null;

export function openDb() {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available in this browser."));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("rows")) {
          const rows = db.createObjectStore("rows", { keyPath: "id" });
          rows.createIndex("byDataset", "datasetTableId");
          rows.createIndex("byGeneral", "generalTableId");
          rows.createIndex("bySample", "sample");
        }
        if (!db.objectStoreNames.contains("history")) {
          const history = db.createObjectStore("history", { keyPath: "id" });
          history.createIndex("byRow", "rowId");
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        dbPromise = null;
        reject(req.error);
      };
      req.onblocked = () => {
        dbPromise = null;
        reject(new Error("Database upgrade blocked — close other tabs of this app and retry."));
      };
    });
  }
  return dbPromise;
}

const wrap = (request) =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const txDone = (tx) =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
  });

// ------------------------------- rows -------------------------------------

// All rows that appear in a table (dataset table -> byDataset, general -> byGeneral).
export async function getRowsForTable(table) {
  const indexName = INDEX_FOR_TABLE_TYPE[table.tableType];
  const db = await openDb();
  const tx = db.transaction("rows", "readonly");
  return wrap(tx.objectStore("rows").index(indexName).getAll(table.id));
}

export async function getRow(id) {
  const db = await openDb();
  const tx = db.transaction("rows", "readonly");
  return wrap(tx.objectStore("rows").get(id));
}

// How many rows a table currently holds (used to guard deleting / retyping a table).
export async function countRowsForTable(tableId) {
  const db = await openDb();
  const tx = db.transaction("rows", "readonly");
  const store = tx.objectStore("rows");
  const [a, b] = await Promise.all([wrap(store.index("byDataset").count(tableId)), wrap(store.index("byGeneral").count(tableId))]);
  return a + b;
}

// Insert or replace many rows (and their history events) in ONE transaction
// (all-or-nothing).
export async function putRows(rows, events = []) {
  const db = await openDb();
  const tx = db.transaction(["rows", "history"], "readwrite");
  const rowStore = tx.objectStore("rows");
  const historyStore = tx.objectStore("history");
  rows.forEach((r) => rowStore.put(r));
  events.forEach((e) => historyStore.put(e));
  await txDone(tx);
}

// One edit = the changed row + its history event, saved together or not at all.
export async function saveRowWithEvent(row, event) {
  return putRows([row], [event]);
}

// Removes every row flagged sample:1 AND those rows' history (temporary testing
// helper). Returns how many rows were removed.
export async function deleteSampleRows() {
  const db = await openDb();
  const tx = db.transaction(["rows", "history"], "readwrite");
  const rowStore = tx.objectStore("rows");
  const byRow = tx.objectStore("history").index("byRow");
  const historyStore = tx.objectStore("history");

  const keys = await wrap(rowStore.index("bySample").getAllKeys(1));
  const eventKeyLists = await Promise.all(keys.map((k) => wrap(byRow.getAllKeys(k))));
  keys.forEach((k) => rowStore.delete(k));
  eventKeyLists.forEach((list) => list.forEach((ek) => historyStore.delete(ek)));
  await txDone(tx);
  return keys.length;
}

// ------------------------------ history -----------------------------------

// Oldest first (same order as the example you described).
export async function getHistory(rowId) {
  const db = await openDb();
  const tx = db.transaction("history", "readonly");
  const events = await wrap(tx.objectStore("history").index("byRow").getAll(rowId));
  return events.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : a.id < b.id ? -1 : 1));
}
