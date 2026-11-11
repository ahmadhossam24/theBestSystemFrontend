// ---------------------------------------------------------------------------
// TEMPORARY testing helper — generates fake rows so you can see the tables work
// before Excel upload (stage 3) exists. All rows it makes carry sample:1, and the
// page has a "Remove all sample rows" button that deletes exactly those.
// Delete this file (and the button) once upload is in.
// ---------------------------------------------------------------------------
import { createRow, nowStamp } from "./rowModel";
import { makeUploadEvent } from "./history";

const FIRST = ["Ahmed", "Mona", "Karim", "Laila", "Hassan", "Yasmin", "Omar", "Salma", "Tarek", "Dina", "Fady", "Hana"];
const LAST = ["Youssef", "Adel", "Fathy", "Mostafa", "Kamal", "Nabil", "Tarek", "Ramzy", "Sameh", "Ezz"];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const digits = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("");

function sampleFor(col) {
  switch (col.key) {
    case "landline":
      return `02${digits(8)}`;
    case "name":
      return `${pick(FIRST)} ${pick(LAST)}`;
    case "contactPhone":
      return `01${digits(9)}`;
    case "agentNotes":
      return "";
  }
  if (col.type === "choices") return Math.random() < 0.2 || col.options.length === 0 ? "" : pick(col.options);
  if (col.type === "date") {
    const d = new Date(Date.now() - Math.floor(Math.random() * 40) * 86400000);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  return `Sample ${col.label}`;
}

const extrasFor = (table) => Object.fromEntries(table.columns.filter((c) => c.origin === "custom").map((c) => [c.key, sampleFor(c)]));

export function makeSampleRows(table, tables, count, by = "Admin") {
  const datasets = tables.filter((t) => t.tableType === "dataset");
  const stamp = nowStamp();
  const rows = [];

  for (let i = 0; i < count; i++) {
    // built-in + shared columns (not the system-managed ones)
    const values = {};
    table.columns
      .filter((c) => c.origin !== "custom" && !c.readOnly)
      .forEach((c) => (values[c.key] = sampleFor(c)));
    values.uploadDate = stamp;

    if (table.tableType === "dataset") {
      rows.push(createRow({ datasetTableId: table.id, values, extras: { [table.id]: extrasFor(table) }, sample: true }));
    } else {
      // Pretend the row was transferred in from some dataset table (or from none).
      const ds = datasets.length > 0 && Math.random() < 0.8 ? pick(datasets) : null;
      const extras = { [table.id]: extrasFor(table) };
      if (ds) extras[ds.id] = extrasFor(ds);
      rows.push(createRow({ datasetTableId: ds ? ds.id : null, generalTableId: table.id, values, extras, sample: true }));
    }
  }
  const events = rows.map((r) => makeUploadEvent({ rowId: r.id, by, table, note: "sample data" }));
  return { rows, events };
}
