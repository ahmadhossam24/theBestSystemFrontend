"use client";

import { useEffect, useMemo, useState } from "react";
import { useData } from "../context/DataContext";
import EditableCell from "./EditableCell";
import RowActions from "./RowActions";
import TrashModal from "./modals/TrashModal";
import TableFilterBar from "./TableFilterBar";
import TablePagination from "./TablePagination";
import { datasetFilters } from "../lib/datasetColumns";

const PAGE_SIZE = 10;

/**
 * tableKey: matches a key in DataContext state, e.g. "rejection", "clean"
 * columns: array of { key, label, type?, options? } — see datasetColumns.js
 */
export default function DataTable({ tableKey, title, subtitle, columns }) {
  const data = useData();
  const rows = data[tableKey] || [];
  const { updateCell, deleteRow, trashRow } = data;
  const [trashModalRow, setTrashModalRow] = useState(null);

  const filterConfig = datasetFilters[tableKey] || [];
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);

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

      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-400">
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
              <tr key={row.id} className="hover:bg-slate-50/60">
                {columns.map((c) => (
                  <td key={c.key} className="px-1 py-1">
                    <EditableCell
                      value={row[c.key]}
                      type={c.type || "text"}
                      options={c.options}
                      onSave={(v) => updateCell(tableKey, row.id, c.key, v, c.label)}
                    />
                  </td>
                ))}
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
                <td colSpan={columns.length + 1} className="px-3 py-8 text-center text-sm text-slate-400">
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
    </div>
  );
}
