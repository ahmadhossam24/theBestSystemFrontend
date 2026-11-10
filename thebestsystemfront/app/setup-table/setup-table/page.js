"use client";

import { Fragment, useState } from "react";
import { useTables } from "./hooks/useTables";
import TableFormModal from "./components/TableFormModal";
import DefaultColumnsModal from "./components/DefaultColumnsModal";

const TYPE_STYLES = {
  general: "bg-slate-100 text-slate-600",
  dataset: "bg-violet-50 text-violet-700",
};

// chip colour by where a column comes from
const ORIGIN_STYLES = {
  fixed: "bg-white text-slate-500 ring-slate-200",
  global: "bg-violet-50 text-violet-700 ring-violet-100",
  custom: "bg-blue-50 text-blue-700 ring-blue-100",
};

export default function SetupTablePage() {
  const { tables, globals, loaded, saveTable, deleteTable, saveGlobalColumns } = useTables();
  const [modal, setModal] = useState(null); // null | { kind: "table", table } | { kind: "defaults" }
  const [expandedId, setExpandedId] = useState(null);

  const handleDelete = (t) => {
    if (window.confirm(`Delete table "${t.name}"? This removes its setup from local storage.`)) {
      deleteTable(t.id);
    }
  };

  const handleSaveGlobals = (draftCols) => {
    const kept = new Set(draftCols.map((c) => c.key).filter(Boolean));
    const removed = globals.columns.filter((c) => !kept.has(c.key));
    if (removed.length > 0 && tables.length > 0) {
      const names = removed.map((c) => `"${c.label}"`).join(", ");
      if (!window.confirm(`Deleting ${names} removes it from all ${tables.length} table(s). Continue?`)) return;
    }
    saveGlobalColumns(draftCols);
    setModal(null);
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Setup tables</h1>
          <p className="text-sm text-slate-400">Define the tables the system will build. Saved to local storage.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setModal({ kind: "defaults" })}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Default columns{globals.columns.length > 0 && ` (${globals.columns.length})`}
          </button>
          <button
            onClick={() => setModal({ kind: "table", table: null })}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Add table
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3">Table name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Columns</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tables.map((t) => {
              const count = (origin) => t.columns.filter((c) => c.origin === origin).length;
              const open = expandedId === t.id;
              return (
                <Fragment key={t.id}>
                  <tr className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-medium text-slate-800">{t.name}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${TYPE_STYLES[t.tableType]}`}>
                        {t.tableType === "dataset" ? "Dataset" : "General"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {t.columns.length} total
                      <span className="text-slate-400">
                        {" "}
                        ({count("fixed")} built-in, {count("global")} shared, {count("custom")} extra)
                      </span>
                      <button
                        onClick={() => setExpandedId(open ? null : t.id)}
                        className="ml-2 text-xs font-medium text-blue-600 hover:underline"
                      >
                        {open ? "Hide" : "Show"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          title="Edit"
                          onClick={() => setModal({ kind: "table", table: t })}
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                        >
                          ✎
                        </button>
                        <button
                          title="Delete"
                          onClick={() => handleDelete(t)}
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                  {open && (
                    <tr className="bg-slate-50/50">
                      <td colSpan={4} className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {t.columns.map((c) => (
                            <span
                              key={c.key}
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${ORIGIN_STYLES[c.origin]}`}
                              title={c.type === "choices" ? c.options.join(", ") : c.type}
                            >
                              {c.label} · {c.type}
                              {c.type === "choices" && ` (${c.options.length})`}
                            </span>
                          ))}
                        </div>
                        <p className="mt-2 text-xs text-slate-400">
                          Grey = built-in, violet = shared default columns, blue = extra columns of this table.
                        </p>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {loaded && tables.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-400">
                  No tables yet. Click &quot;Add table&quot; to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modal?.kind === "table" && (
        <TableFormModal
          table={modal.table}
          allTables={tables}
          globals={globals}
          onClose={() => setModal(null)}
          onSave={(draft, editingId) => {
            saveTable(draft, editingId);
            setModal(null);
          }}
        />
      )}

      {modal?.kind === "defaults" && (
        <DefaultColumnsModal
          globals={globals}
          allTables={tables}
          onClose={() => setModal(null)}
          onSave={handleSaveGlobals}
        />
      )}
    </div>
  );
}
