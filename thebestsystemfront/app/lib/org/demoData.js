"use client";
// Demo TABLES, ROWS, HISTORY and agent PERMISSIONS for the demo organisation (created by seedDemoOrg).
// Browser-only: tables + permissions go to localStorage, rows + history to IndexedDB.
//
// Per team:  Rejection (dataset), Leads (dataset), Accepts (general). Rows are assigned to the team's real
// agents. Sales A/B get a "Region" default column, Support a "Priority" one.
// Permissions (agents only): Sales A hides contact phones, Sales B hides its whole Leads table,
// Support keeps everything read-only; nour (Sales A) may also edit Feedback.
import { STORAGE_KEY, GLOBAL_STORAGE_KEY, FEEDBACK_OPTIONS, EMPTY_GLOBALS, buildGlobals, buildTable, newUid, normalizeTable } from "../../setup-table/lib/tableSchema";
import { createRow, nowStamp } from "../data/rowModel";
import { makeUploadEvent, makeEditEvent, makeTransferEvent } from "../data/history";
import { putRows } from "../data/db";
import { setModes, emptyPerms } from "../data/agentPerms.js";
import { PERMS_KEY } from "../data/permStore.js";

const FIRST = ["Ahmed", "Mona", "Karim", "Laila", "Hassan", "Yasmin", "Omar", "Salma", "Tarek", "Dina", "Fady", "Hana", "Samir", "Rania"];
const LAST = ["Youssef", "Adel", "Fathy", "Mostafa", "Kamal", "Nabil", "Ramzy", "Sameh", "Ezz", "Hegazy"];

// tiny deterministic generator so the demo looks the same every time
const rng = (seed) => () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);

const TEAMS = {
  "Sales A": { agents: ["nour", "sara", "sa.salesa"], globals: { label: "Region", options: ["Cairo", "Giza", "Delta"] } },
  "Sales B": { agents: ["emad"], globals: { label: "Region", options: ["Cairo", "Giza", "Delta"] } },
  Support: { agents: ["mona", "sa.support"], globals: { label: "Priority", options: ["Low", "Normal", "Urgent"] } },
};

const day = (n) => {
  const d = new Date(Date.now() - n * 86400000);
  const p = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export async function seedDemoData(demoOrg, byName = "Admin") {
  const read = (k, d) => {
    try {
      return JSON.parse(localStorage.getItem(k) || "null") ?? d;
    } catch {
      return d;
    }
  };
  const tables = read(STORAGE_KEY, []);
  const byTeam = read(GLOBAL_STORAGE_KEY, { byTeam: {} }).byTeam || {};
  let perms = emptyPerms();
  const allRows = [];
  const allEvents = [];
  const summary = [];

  for (const team of demoOrg.teams) {
    const cfg = TEAMS[team.name];
    if (!cfg) continue;
    const rand = rng([...team.name].reduce((a, c) => a + c.charCodeAt(0), 7));
    const pick = (arr) => arr[Math.floor(rand() * arr.length)];
    const digits = (n) => Array.from({ length: n }, () => Math.floor(rand() * 10)).join("");

    // team default column
    const g = buildGlobals([{ _uid: newUid(), label: cfg.globals.label, type: "choices", options: cfg.globals.options }], EMPTY_GLOBALS, []);
    byTeam[team.id] = g;
    const mk = (name, tableType) => normalizeTable(buildTable({ name, tableType, customColumns: [] }, null, g, team.id), g);
    const rej = mk("Rejection", "dataset");
    const leads = mk("Leads", "dataset");
    const acc = mk("Accepts", "general");
    tables.push(rej, leads, acc);

    const gKey = g.columns[0].key;
    const stamp = nowStamp();
    const makeRow = (table, i, over = {}) => {
      const agent = rand() < 0.8 ? pick(cfg.agents) : "";
      const values = {
        landline: `02${digits(8)}`,
        name: `${pick(FIRST)} ${pick(LAST)}`,
        contactPhone: `01${digits(9)}`,
        uploadDate: over.uploadDate || `${day(Math.floor(rand() * 20))} 09:00`,
        agent,
        feedback: rand() < 0.35 ? "" : pick(FEEDBACK_OPTIONS),
        agentNotes: rand() < 0.7 ? "" : "Call back after 5pm",
        [gKey]: pick(g.columns[0].options),
        ...over.values,
      };
      return createRow({ datasetTableId: table.id, values, extras: {} });
    };

    const rejRows = Array.from({ length: 24 }, (_, i) => makeRow(rej, i));
    const leadRows = Array.from({ length: 12 }, (_, i) => makeRow(leads, i));
    // 8 of the rejection rows were "transferred" to Accepts: the SAME row now also sits in that general table
    rejRows.slice(0, 8).forEach((r) => (r.generalTableId = acc.id));

    for (const [t, rows] of [[rej, rejRows], [leads, leadRows]]) rows.forEach((r) => allEvents.push(makeUploadEvent({ rowId: r.id, by: byName, table: t, note: "demo-data.xlsx" })));
    rejRows.slice(0, 8).forEach((r) => allEvents.push(makeTransferEvent({ rowId: r.id, by: cfg.agents[0], table: rej, from: null, to: acc, mode: "copy" })));
    // a couple of edits by agents so row history has something to show
    const col = (t, key) => t.columns.find((c) => c.key === key);
    rejRows.slice(0, 3).forEach((r) => {
      const to = "Accept";
      allEvents.push(makeEditEvent({ rowId: r.id, by: cfg.agents[0], table: rej, column: { ...col(rej, "feedback"), ownerTableId: null }, from: r.values.feedback, to }));
      r.values.feedback = to;
    });
    allRows.push(...rejRows, ...leadRows);
    summary.push({ team: team.name, tables: 3, rows: rejRows.length + leadRows.length });

    // permissions for this team's agents
    const colsOf = (t) => t.columns.map((c) => c.key);
    if (team.name === "Sales A") {
      for (const t of [rej, leads, acc]) {
        perms = setModes(perms, { kind: "default", teamId: team.id }, t.id, { contactPhone: "hidden", feedback: "read", agentNotes: "edit" });
      }
      const nour = demoOrg.userIds?.nour;
      if (nour) perms = setModes(perms, { kind: "agent", userId: nour }, rej.id, { feedback: "edit", contactPhone: "read" });
    }
    if (team.name === "Sales B") {
      perms = setModes(perms, { kind: "default", teamId: team.id }, leads.id, Object.fromEntries(colsOf(leads).map((k) => [k, "hidden"])));
      perms = setModes(perms, { kind: "default", teamId: team.id }, rej.id, { feedback: "edit", agentNotes: "edit" });
    }
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(tables));
  localStorage.setItem(GLOBAL_STORAGE_KEY, JSON.stringify({ byTeam }));
  localStorage.setItem(PERMS_KEY, JSON.stringify(perms));
  await putRows(allRows, allEvents);
  return summary;
}
