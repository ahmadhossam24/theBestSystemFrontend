"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const DataContext = createContext(null);
const STORAGE_KEY = "ops-dashboard-state-v1";

// ---------- seed data ----------

let seedId = 1000;
const nid = () => seedId++;

const now = () => {
  const d = new Date();
  const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-");
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  return `${date} ${time}`;
};

const seedMainRows = [
  { id: nid(), landline: "0212345678", customerName: "Ahmed Youssef", date: "01-09-2026", landlineOwner: "Ahmed Youssef", phoneContact: "01001234567", assignedAgent: "Nour", feedback: "Accept", agentNotes: "Customer interested, will confirm tomorrow." },
  { id: nid(), landline: "0223456789", customerName: "Mona Adel", date: "03-09-2026", landlineOwner: "Ali Hassan", phoneContact: "01112345678", assignedAgent: "Sara", feedback: "No Answer", agentNotes: "Tried twice, no response." },
  { id: nid(), landline: "0234567890", customerName: "Karim Fathy", date: "05-09-2026", landlineOwner: "Karim Fathy", phoneContact: "01212345678", assignedAgent: "Emad", feedback: "Not Needed", agentNotes: "Already has a package." },
];

const seedCreateRows = [
  { id: nid(), landline: "0245678901", customerName: "Laila Mostafa", date: "10-09-2026", landlineOwner: "Laila Mostafa", phoneContact: "01001112233", assignedAgent: "Nour", feedback: "Accept", agentNotes: "Ready to create.", created: "No", srType: "Normal", applyPhone: "01001112233", additionalPhone: "", packageName: "330GB", modem: "Yes", payMethod: "Cash", creationNotes: "Standard install." },
];

const seedCollectionRows = [
  { id: nid(), landline: "0256789012", customerName: "Hassan Kamal", date: "12-09-2026", landlineOwner: "Hassan Kamal", phoneContact: "01034567890", assignedAgent: "Sara", feedback: "Accept", agentNotes: "", created: "Yes", srType: "Red", applyPhone: "01034567890", additionalPhone: "01099998888", packageName: "450GB", modem: "No", payMethod: "Installment", creationNotes: "Follow up on modem.", gsm: "01034567890", activeDate: "2026-09-14", visitDate: "2026-09-15", assignStatus: "Assigned", pendingReason: "", followUpNotes: "Visit scheduled with technician.", naOrDate: "2026-09-15" },
];

const seedMonthCollectionRows = [
  { id: nid(), landline: "0267890123", customerName: "Yasmin Adel", date: "01-08-2026", landlineOwner: "Yasmin Adel", phoneContact: "01145678901", assignedAgent: "Emad", feedback: "Accept", agentNotes: "", created: "Yes", srType: "Normal", applyPhone: "01145678901", additionalPhone: "", packageName: "330GB", modem: "Yes", payMethod: "Cash", creationNotes: "", gsm: "01145678901", activeDate: "2026-08-05", visitDate: "2026-08-06", assignStatus: "Pending", pendingReason: "Customer not home", followUpNotes: "Reschedule next week.", naOrDate: "N/A" },
];

const seedMailResponseRows = [
  { id: nid(), landline: "0278901234", cusName: "Tarek Sami", packageName: "450GB", agent: "Nour", payMethod: "Cash", srId: "SR-10021", parentSr: "SR-10000", address: "6th of October, Giza", gsm: "01156789012", ratePlan: "RP-450", priceGroup: "PG-2", type: "Residential", case: "New Line", status: "Open", adslNumber: "ADSL-778812", callFeedback: "Accept", creationDate: "15-09-2026", sfid: "SF-99213", accountName: "Tarek Sami", rtm: "RTM-4" },
];

const seedTrashRows = [];

const seedLogs = {};
seedMainRows.forEach((r, i) => {
  seedLogs[r.id] = [
    { text: `Nour added number at ${r.date} 10:30 AM`, id: nid() },
  ];
});
if (seedCollectionRows[0]) {
  seedLogs[seedCollectionRows[0].id] = [
    { text: "Nour added number at 12-09-2026 09:10 AM", id: nid() },
    { text: "Sara changed landline owner name from Ali to Hassan Kamal at 12-09-2026 11:30 AM", id: nid() },
    { text: "Emad transferred row to Create table at 13-09-2026 02:00 PM", id: nid() },
  ];
}

const FALLBACK_LOG = [
  { text: "Nour added number at 23-09-2026 10:30 AM", id: "fallback-1" },
  { text: "Sara changed landline owner name from Ali to Emad at 23-09-2026 11:30 AM", id: "fallback-2" },
];

const initialState = {
  main: seedMainRows,
  create: seedCreateRows,
  collection: seedCollectionRows,
  monthCollection: seedMonthCollectionRows,
  mailResponse: seedMailResponseRows,
  trash: seedTrashRows,
  logs: seedLogs,
};

export function DataProvider({ children }) {
  const [state, setState] = useState(initialState);
  const [toast, setToast] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState(JSON.parse(raw));
    } catch (e) {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
  }, [state, loaded]);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2600);
  };

  const getLog = (rowId) => state.logs[rowId] || FALLBACK_LOG;

  const updateCellSafe = (table, id, field, value, fieldLabel) => {
    setState((s) => {
      const row = s[table].find((r) => r.id === id);
      if (!row) return s;
      const oldVal = row[field] ?? "";
      if (String(oldVal) === String(value)) return s;
      const rows = s[table].map((r) => (r.id === id ? { ...r, [field]: value } : r));
      const logText = `You changed ${fieldLabel} from "${oldVal || "empty"}" to "${value || "empty"}" at ${now()}`;
      const logs = { ...s.logs, [id]: [...(s.logs[id] || []), { id: nid(), text: logText }] };
      return { ...s, [table]: rows, logs };
    });
  };

  const deleteRow = (table, id) => {
    setState((s) => ({ ...s, [table]: s[table].filter((r) => r.id !== id) }));
    showToast("Row deleted");
  };

  const trashRow = (table, id, trashNotes) => {
    setState((s) => {
      const row = s[table].find((r) => r.id === id);
      if (!row) return s;
      const trashed = { ...row, originTable: table, trashNotes: trashNotes || "" };
      const logs = { ...s.logs, [id]: [...(s.logs[id] || []), { id: nid(), text: `You transferred row to Trash table at ${now()}` }] };
      return { ...s, [table]: s[table].filter((r) => r.id !== id), trash: [...s.trash, trashed], logs };
    });
    showToast("Row transferred successfully");
  };

  const transferToCreate = (id, extra) => {
    setState((s) => {
      const row = s.main.find((r) => r.id === id);
      if (!row) return s;
      const newRow = { ...row, ...extra };
      const logs = { ...s.logs, [id]: [...(s.logs[id] || []), { id: nid(), text: `You transferred row to Create table at ${now()}` }] };
      return { ...s, main: s.main.filter((r) => r.id !== id), create: [...s.create, newRow], logs };
    });
    showToast("Row transferred successfully");
  };

  const transferToCollection = (id, extra) => {
    setState((s) => {
      const row = s.create.find((r) => r.id === id);
      if (!row) return s;
      const newRow = { ...row, ...extra };
      const logs = { ...s.logs, [id]: [...(s.logs[id] || []), { id: nid(), text: `You transferred row to Collection table at ${now()}` }] };
      return { ...s, create: s.create.filter((r) => r.id !== id), collection: [...s.collection, newRow], logs };
    });
    showToast("Row transferred successfully");
  };

  const value = useMemo(
    () => ({
      ...state,
      toast,
      showToast,
      updateCell: updateCellSafe,
      deleteRow,
      trashRow,
      transferToCreate,
      transferToCollection,
      getLog,
    }),
    [state, toast]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
