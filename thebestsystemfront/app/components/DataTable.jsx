"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useData } from "../context/DataContext";
import EditableCell from "./EditableCell";
import RowActions from "./RowActions";
import TrashModal from "./modals/TrashModal";
import TableFilterBar from "./TableFilterBar";
import TablePagination from "./TablePagination";
import UploadButton from "./UploadButton";
import BulkAssignBar from "./BulkAssignBar";
import AcceptPopup from "./AcceptPopup";
import NextTimePopup from "./NextTimePopup";
import { datasetFilters, AGENT_OPTIONS } from "../lib/datasetColumns";
import { draftKey } from "../lib/draftKey";

const PAGE_SIZE = 10;
const AGENT_CHOICES = AGENT_OPTIONS.filter(Boolean);

/**
 * tableKey: matches a key in DataContext state, e.g. "rejection", "clean"
 * columns: array of { key, label, type?, options? } — see datasetColumns.js
 */
export default function DataTable({ tableKey, title, subtitle, columns }) {
  const data = useData();
  const rows = data[tableKey] || [];
  const { updateCell, deleteRow, trashRow, addRows, bulkUpdateField, drafts, saveDraft, acceptRow, nextTimeRow } = data;
  const [trashModalRow, setTrashModalRow] = useState(null);
  const [feedbackPopup, setFeedbackPopup] = useState(null); // { kind: "Accept" | "Next time", row }

  const filterConfig = datasetFilters[tableKey] || [];
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);

  // ---- selection for bulk agent assignment ----
  const [selected, setSelected] = useState(() => new Set());
  const [bulkAgent, setBulkAgent] = useState("");
  const lastClickedIdRef = useRef(null); // the anchor row's id — looked up fresh on every shift-click, never a stale index
  const shiftHeldRef = useRef(false); // change events don't carry shiftKey, so capture it on click instead

  const hasActiveFilters =
    search.trim() !== "" ||
    Object.values(filters).some((v) => (typeof v === "string" ? v : v?.from || v?.to));

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (term) {
        const hit = columns.some((c) => String(row[c.key] ?? "").toLowerCase().includes(term));
        if (!hit) return false;
      }
      for (const f of filterConfig) {
        if (f.type === "select") {
          const val = filters[f.key];
          if (val && row[f.key] !== val) return false;
        } else if (f.type === "dateRange") {
          const range = filters[f.key];
          if (range && (range.from || range.to)) {
            const datePart = String(row[f.key] ?? "").slice(0, 10); // expects "YYYY-MM-DD..."
            if (range.from && datePart < range.from) return false;
            if (range.to && datePart > range.to) return false;
          }
        }
      }
      return true;
    });
  }, [rows, columns, search, filters, filterConfig]);

  // reset to page 1 whenever the result set changes shape
  useEffect(() => {
    setPage(1);
  }, [search, JSON.stringify(filters), tableKey]);



  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rangeStart = filteredRows.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = (safePage - 1) * PAGE_SIZE + pageRows.length;

  const allOnPageSelected = pageRows.length > 0 && pageRows.every((r) => selected.has(r.id));

  // checked/shiftKey come from the real browser toggle (via onChange), so we
  // never fight the native checkbox behavior — we just mirror it into state.
  // The range is resolved from the anchor's *id*, looked up in the current
  // pageRows right now — never a stored index that could go stale.
  const handleRowCheck = (id, checked, shiftKey) => {
    // Freeze the anchor now, before we move it. React (in dev) may re-run the
    // updater below more than once for the same click — if it read the ref
    // directly, a re-run could see the *new* anchor (already moved to `id`)
    // and think anchor===target, collapsing the range to a single row.
    const anchorId = lastClickedIdRef.current;
    lastClickedIdRef.current = id;

    setSelected((prev) => {
      const next = new Set(prev);
      const anchorIndex = shiftKey && anchorId !== null ? pageRows.findIndex((r) => r.id === anchorId) : -1;
      const targetIndex = pageRows.findIndex((r) => r.id === id);

      if (shiftKey && anchorIndex !== -1 && targetIndex !== -1) {
        const from = Math.min(anchorIndex, targetIndex);
        const to = Math.max(anchorIndex, targetIndex);
        for (let i = from; i <= to; i++) {
          if (checked) next.add(pageRows[i].id);
          else next.delete(pageRows[i].id);
        }
      } else if (checked) {
        // no usable anchor (no shift held, or the anchor row scrolled/filtered out) — plain toggle
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const toggleSelectAllOnPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      pageRows.forEach((r) => (allOnPageSelected ? next.delete(r.id) : next.add(r.id)));
      return next;
    });
  };

  const clearSelection = () => {
    setSelected(new Set());
    setBulkAgent("");
    lastClickedIdRef.current = null;
  };

  const handleFeedbackChange = (row, newValue) => {
    updateCell(tableKey, row.id, "feedback", newValue, "Feedback");
    if (newValue === "Accept" || newValue === "Next time") {
      setFeedbackPopup({ kind: newValue, row });
    }
  };

  const applyBulkAgent = () => {
    if (!bulkAgent || selected.size === 0) return;
    bulkUpdateField(tableKey, Array.from(selected), "agent", bulkAgent, "Agent");
    clearSelection();
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">{title}</h1>
          {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
          {filteredRows.length} of {rows.length} rows
        </span>
      </div>

      <div className="mb-4">
        <UploadButton columns={columns} onImport={(newRows) => addRows(tableKey, newRows)} />
      </div>

      <TableFilterBar
        search={search}
        onSearchChange={setSearch}
        filterConfig={filterConfig}
        filters={filters}
        onFilterChange={(key, value) => setFilters((f) => ({ ...f, [key]: value }))}
        onClear={() => {
          setSearch("");
          setFilters({});
        }}
        hasActiveFilters={hasActiveFilters}
      />

      {selected.size > 0 && (
        <BulkAssignBar
          count={selected.size}
          agentOptions={AGENT_CHOICES}
          agent={bulkAgent}
          onAgentChange={setBulkAgent}
          onApply={applyBulkAgent}
          onClear={clearSelection}
        />
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <th className="w-10 px-3 py-3">
                <input type="checkbox" checked={allOnPageSelected} onChange={toggleSelectAllOnPage} />
              </th>
              {columns.map((c) => (
                <th key={c.key} className="whitespace-nowrap px-3 py-3">
                  {c.label}
                </th>
              ))}
              <th className="px-3 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pageRows.map((row) => (
              <tr key={row.id} className={selected.has(row.id) ? "bg-blue-50/50" : "hover:bg-slate-50/60"}>
                <td className="px-3 py-1">
                  <input
                    type="checkbox"
                    checked={selected.has(row.id)}
                    onClick={(e) => {
                      shiftHeldRef.current = e.shiftKey;
                    }}
                    onChange={(e) => handleRowCheck(row.id, e.target.checked, shiftHeldRef.current)}
                  />
                </td>
                {columns.map((c) =>
                  c.key === "feedback" ? (
                    <td key={c.key} className="px-1 py-1">
                      <div className="flex items-center gap-1">
                        <EditableCell
                          value={row.feedback}
                          type="select"
                          options={c.options}
                          onSave={(v) => handleFeedbackChange(row, v)}
                        />
                        {(row.feedback === "Accept" || row.feedback === "Next time") && (
                          <button
                            title={`Edit ${row.feedback} details`}
                            onClick={() => setFeedbackPopup({ kind: row.feedback, row })}
                            className="shrink-0 text-sm text-blue-500 hover:text-blue-700"
                          >
                            ✎
                          </button>
                        )}
                      </div>
                    </td>
                  ) : (
                    <td key={c.key} className="px-1 py-1">
                      <EditableCell
                        value={row[c.key]}
                        type={c.type || "text"}
                        options={c.options}
                        onSave={(v) => updateCell(tableKey, row.id, c.key, v, c.label)}
                      />
                    </td>
                  )
                )}
                <td className="px-3 py-1">
                  <RowActions
                    rowId={row.id}
                    onDelete={() => deleteRow(tableKey, row.id)}
                    transferOptions={[{ label: "Trash table", onSelect: () => setTrashModalRow(row.id) }]}
                  />
                </td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 2} className="px-3 py-8 text-center text-sm text-slate-400">
                  {rows.length === 0 ? "No rows here. Upload a file to get started." : "No rows match your search or filters."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <TablePagination
        page={safePage}
        totalPages={totalPages}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        total={filteredRows.length}
        onPageChange={setPage}
      />

      {trashModalRow && (
        <TrashModal
          onClose={() => setTrashModalRow(null)}
          onConfirm={(notes) => {
            trashRow(tableKey, trashModalRow, notes);
            setTrashModalRow(null);
          }}
        />
      )}

      {feedbackPopup?.kind === "Accept" && (
        <AcceptPopup
          initialValues={drafts[draftKey(tableKey, feedbackPopup.row.id, "Accept")] || { agentNotes: feedbackPopup.row.agentNotes || "" }}
          onCancel={(form) => {
            saveDraft(tableKey, feedbackPopup.row.id, "Accept", form);
            setFeedbackPopup(null);
          }}
          onSave={(form) => {
            acceptRow(tableKey, feedbackPopup.row.id, form);
            setFeedbackPopup(null);
          }}
        />
      )}

      {feedbackPopup?.kind === "Next time" && (
        <NextTimePopup
          initialValues={drafts[draftKey(tableKey, feedbackPopup.row.id, "Next time")] || { agentNotes: feedbackPopup.row.agentNotes || "" }}
          onCancel={(form) => {
            saveDraft(tableKey, feedbackPopup.row.id, "Next time", form);
            setFeedbackPopup(null);
          }}
          onSave={(form) => {
            nextTimeRow(tableKey, feedbackPopup.row.id, form);
            setFeedbackPopup(null);
          }}
        />
      )}
    </div>
  );
}
