"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTables } from "../../setup-table/hooks/useTables";
import { useTableRows } from "../../lib/data/useTableRows";
import { NO_DATASET, applyCellEdit, getCellValue, isRowInTable, resolveColumns } from "../../lib/data/rowModel";
import { activeFilters, buildFilterOptions, filterRows, filterableColumns } from "../../lib/data/filtering";
import { makeEditEvent } from "../../lib/data/history";
import { bulkColumns, planBulkEdit } from "../../lib/data/bulk";
import { planTransfer, transferTargets } from "../../lib/data/transfer";
import { useSession } from "../../lib/org/session.js";
import { tableToAoa, downloadWorkbook, safeFileName, stampForFile } from "../../lib/data/xlsxExport.js";
import { useScope } from "../../lib/org/scope.js";
import { tableCaps, canReachTeam } from "../../lib/data/dataRules";
import { usePerms } from "../../lib/data/permStore";
import { modeFor, visibleColumns, tableVisibleTo } from "../../lib/data/agentPerms";
import { useTeamAgents, withAgentOptions } from "../../lib/data/agents";
import { countSampleRows, deleteSampleRows, putRows, saveRowWithEvent } from "../../lib/data/db";
import { buildImportedRows } from "../../lib/data/xlsxImport";
import EditableCell from "../../components/EditableCell";
import ColumnFilters from "../../components/ColumnFilters";
import ImportButton from "../../components/ImportButton";
import BulkEditBar from "../../components/BulkEditBar";
import TablePagination from "../../components/TablePagination";

const PAGE_SIZE = 10;

const TYPE_STYLES = {
  general: "bg-slate-100 text-slate-600",
  dataset: "bg-violet-50 text-violet-700",
};

const inputCls =
  "rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100";

export default function TablePage() {
  const { tableId } = useParams();
  const { tables: everyTable, loaded } = useTables(); // all teams: looked up by id, access checked below
  const { user } = useSession();
  const { teams, ready: teamsReady } = useScope(user);
  const found = useMemo(() => everyTable.find((t) => t.id === tableId), [everyTable, tableId]);
  // Only people who can see the table's team may open it (otherwise it looks like it doesn't exist).
  const { perms, ready: permsReady } = usePerms();
  // an agent whose every column is hidden doesn't see the table at all
  const sameTeamTables = useMemo(() => (found ? everyTable.filter((t) => t.teamId === found.teamId) : []), [everyTable, found]);
  const seesTable = !found || !user || tableVisibleTo(perms, user, found, resolveColumns(found, sameTeamTables, null));
  const allowed = !!found && teamsReady && permsReady && canReachTeam(teams, found.teamId) && seesTable;
  const table = allowed ? found : undefined;
  // Everything below (dataset types, transfers, columns) works inside the table's own team.
  const tables = useMemo(() => (table ? everyTable.filter((t) => t.teamId === table.teamId) : []), [everyTable, table]);
  const caps = tableCaps(user?.role);
  const userName = user?.displayName || "";
  const agents = useTeamAgents(user?.id, table?.teamId);

  const { rows, setRows, loading, error, reload } = useTableRows(table);

  const [datasetFilter, setDatasetFilter] = useState(""); // "" = all, NO_DATASET, or a dataset table id
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [filters, setFilters] = useState({});
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [selected, setSelected] = useState(() => new Set()); // ids of ticked rows
  const anchorRef = useRef(null); // last ticked row, for shift-click ranges
  const [bulkBusy, setBulkBusy] = useState(false);
  const [leftoverSamples, setLeftoverSamples] = useState(0);

  useEffect(() => {
    // One-time cleanup helper: fake rows left over from the testing tools of earlier stages.
    countSampleRows().then(setLeftoverSamples, () => {});
  }, []);

  const datasetTables = useMemo(() => tables.filter((t) => t.tableType === "dataset"), [tables]);

  // Reset the view when switching between tables.
  useEffect(() => {
    setDatasetFilter("");
    setSearch("");
    setFilters({});
    setPage(1);
    setNotice("");
    setActionError("");
    setSelected(new Set());
    anchorRef.current = null;
  }, [tableId]);

  // A dataset type that was deleted can't stay selected.
  useEffect(() => {
    if (datasetFilter && datasetFilter !== NO_DATASET && !datasetTables.some((t) => t.id === datasetFilter)) {
      setDatasetFilter("");
    }
  }, [datasetFilter, datasetTables]);

  const allColumns = useMemo(() => (table ? withAgentOptions(resolveColumns(table, tables, datasetFilter), agents) : []), [table, tables, datasetFilter, agents]);
  // agents only get the columns an admin left visible; everything below (search, filters, grid) uses this list
  const columns = useMemo(() => (table ? visibleColumns(perms, user, table.id, allColumns) : []), [perms, user, table, allColumns]);
  const canEditCol = (c) => !c.readOnly && caps.editCells && modeFor(perms, user, table.id, c) === "edit";
  // Excel headers are matched against the table's OWN columns (a direct upload has no dataset type).
  const importColumns = useMemo(() => (table ? withAgentOptions(resolveColumns(table, tables, null), agents) : []), [table, tables, agents]);
  const filterCols = useMemo(() => filterableColumns(columns), [columns]);

  // rows of the chosen dataset type (before search / column filters)
  const typeRows = useMemo(() => {
    if (!datasetFilter) return rows;
    if (datasetFilter === NO_DATASET) return rows.filter((r) => !r.datasetTableId);
    return rows.filter((r) => r.datasetTableId === datasetFilter);
  }, [rows, datasetFilter]);

  const filterOptions = useMemo(() => buildFilterOptions(filterCols, typeRows, tables), [filterCols, typeRows, tables]);

  const visibleRows = useMemo(
    () => filterRows(typeRows, columns, tables, deferredSearch, filters),
    [typeRows, columns, tables, deferredSearch, filters]
  );

  const activeCount = activeFilters(filters, columns).length;
  const anythingActive = activeCount > 0 || search.trim() !== "" || datasetFilter !== "";

  // Any change to what's being shown goes back to page 1.
  // A selection only makes sense for the list it was made in, so changing the list clears it.
  useEffect(() => {
    setPage(1);
    setSelected(new Set());
    anchorRef.current = null;
  }, [datasetFilter, deferredSearch, filters]);

  const totalPages = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = visibleRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rangeStart = visibleRows.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = (safePage - 1) * PAGE_SIZE + pageRows.length;

  // ---- editing ----------------------------------------------------------
  // Update the screen immediately, then save row + history event together.
  // If saving fails, re-read from the database so the screen shows the truth.
  const editCell = async (row, col, value) => {
    if (!canEditCol(col)) return;
    const old = getCellValue(row, col, tables);
    if (String(old) === String(value)) return;
    const next = applyCellEdit(row, col, value);
    const event = makeEditEvent({ rowId: row.id, by: userName, table, column: col, from: old, to: value });
    setRows((prev) => prev.map((r) => (r.id === row.id ? next : r)));
    try {
      await saveRowWithEvent(next, event);
      setActionError("");
    } catch (e) {
      setActionError(`Could not save the change: ${e?.message || "unknown error"}`);
      reload();
    }
  };

  // ---- Excel import -------------------------------------------------------
  const importRecords = async ({ records, fileName }) => {
    if (!caps.import) return;
    const { rows: fresh, events, stamp } = buildImportedRows(table, records, fileName, userName);
    await putRows(fresh, events); // rows + history in one transaction: all or nothing
    await reload();
    setActionError("");
    setNotice(`Imported ${fresh.length.toLocaleString()} row${fresh.length === 1 ? "" : "s"} from ${fileName} (upload date ${stamp}).`);
  };

  // ---- selecting + bulk edit ---------------------------------------------
  const bulkCols = useMemo(() => bulkColumns(columns), [columns]);
  const pageAllSelected = pageRows.length > 0 && pageRows.every((r) => selected.has(r.id));
  const pageSomeSelected = pageRows.some((r) => selected.has(r.id));

  // Plain click toggles one row. Shift-click ticks/unticks everything between the
  // last-clicked row and this one (across pages, in the order currently shown).
  const toggleRow = (rowId, checked, shift) => {
    let ids = [rowId];
    const anchor = anchorRef.current;
    if (shift && anchor && anchor !== rowId) {
      const a = visibleRows.findIndex((r) => r.id === anchor);
      const b = visibleRows.findIndex((r) => r.id === rowId);
      if (a !== -1 && b !== -1) ids = visibleRows.slice(Math.min(a, b), Math.max(a, b) + 1).map((r) => r.id);
    }
    anchorRef.current = rowId; // set here, never inside the updater (React runs updaters twice in dev)
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (checked ? next.add(id) : next.delete(id)));
      return next;
    });
  };

  const togglePage = (checked) => {
    const ids = pageRows.map((r) => r.id);
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (checked ? next.add(id) : next.delete(id)));
      return next;
    });
  };

  const selectAllMatching = () => setSelected(new Set(visibleRows.map((r) => r.id)));
  const clearSelection = () => {
    setSelected(new Set());
    anchorRef.current = null;
  };

  const applyBulk = async (column, value) => {
    if (!caps.bulkEdit) return;
    setBulkBusy(true);
    try {
      const plan = planBulkEdit({ rows, ids: selected, column, value, by: userName, table, tables });
      if (plan.changed > 0) {
        await putRows(plan.nextRows, plan.events); // rows + history together, or nothing
        const byId = new Map(plan.nextRows.map((r) => [r.id, r]));
        setRows((prev) => prev.map((r) => byId.get(r.id) || r));
      }
      const bits = [`${plan.changed.toLocaleString()} changed`];
      if (plan.unchanged) bits.push(`${plan.unchanged.toLocaleString()} already had that value`);
      if (plan.skipped) bits.push(`${plan.skipped.toLocaleString()} skipped (not ${column.datasetName} rows)`);
      setNotice(`${column.label} set to ${value === "" ? "empty" : `"${value}"`}: ${bits.join(", ")}.`);
      setActionError("");
      clearSelection();
    } catch (e) {
      setActionError(`Bulk change failed, nothing was changed: ${e?.message || "unknown error"}`);
      reload();
    } finally {
      setBulkBusy(false);
    }
  };

  // Transfers only ever go INTO a general table (never a dataset table, never the one you're in).
  const targets = useMemo(() => (table ? transferTargets(tables, table) : []), [tables, table]);

  // Admins: download exactly what the grid shows now (search, filters, dataset type, visible columns).
  const [exporting, setExporting] = useState(false);
  const exportView = async () => {
    if (!caps.export) return;
    setExporting(true);
    try {
      const aoa = tableToAoa(columns, visibleRows, (row, c) => getCellValue(row, c, tables));
      await downloadWorkbook([{ name: table.name, aoa }], `${safeFileName(`${team?.name || "team"}-${table.name}`)}-${stampForFile()}.xlsx`);
    } finally {
      setExporting(false);
    }
  };

  const transferSelected = async (targetId) => {
    if (!caps.transfer) return;
    const target = tables.find((t) => t.id === targetId && t.tableType === "general");
    if (!target) return;
    setBulkBusy(true);
    try {
      const plan = planTransfer({ rows, ids: selected, target, table, by: userName, tables });
      if (plan.nextRows.length > 0) {
        await putRows(plan.nextRows, plan.events); // rows + history together, or nothing
        const byId = new Map(plan.nextRows.map((r) => [r.id, r]));
        // a dataset table still shows the row; a general table no longer does
        setRows((prev) => prev.map((r) => byId.get(r.id) || r).filter((r) => isRowInTable(r, table)));
      }
      const bits = [];
      if (plan.copied) bits.push(`${plan.copied.toLocaleString()} now also shown there`);
      if (plan.moved) bits.push(`${plan.moved.toLocaleString()} moved`);
      if (plan.unchanged) bits.push(`${plan.unchanged.toLocaleString()} already in it`);
      setNotice(`Transferred to ${target.name}: ${bits.join(", ") || "nothing to do"}.`);
      setActionError("");
      clearSelection();
    } catch (e) {
      setActionError(`Transfer failed, nothing was changed: ${e?.message || "unknown error"}`);
      reload();
    } finally {
      setBulkBusy(false);
    }
  };

  const clearAll = () => {
    setSearch("");
    setFilters({});
    setDatasetFilter("");
  };

  if (!loaded || !user || !teamsReady || !permsReady) return <p className="text-sm text-slate-400">Loading…</p>;

  if (!table) {
    return (
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Table not found</h1>
        <p className="mt-1 text-sm text-slate-400" data-testid="table-missing">It may have been deleted, or it belongs to a team you can't open.</p>
        <Link href="/" className="mt-4 inline-block text-sm font-medium text-blue-600 hover:underline">
          Back home
        </Link>
      </div>
    );
  }

  const isGeneral = table.tableType === "general";
  const team = teams.find((t) => t.id === table.teamId);

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-800">{table.name}</h1>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${TYPE_STYLES[table.tableType]}`}>
              {isGeneral ? "General" : "Dataset"}
            </span>
          </div>
          <p className="text-sm text-slate-400">
            {isGeneral ? "Rows appear here once transferred in." : "Rows appear here from uploads."} Click a cell to edit it.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            {caps.export && (
              <button
                type="button"
                data-testid="export-table"
                onClick={exportView}
                disabled={loading || exporting}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                title="Download the rows you see now (with the current search, filters and dataset type) as an Excel file"
              >
                {exporting ? "Exporting…" : `Export Excel (${visibleRows.length.toLocaleString()})`}
              </button>
            )}
            {caps.import && <ImportButton table={table} columns={importColumns} onConfirm={importRecords} disabled={loading} />}
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              {visibleRows.length.toLocaleString()} of {rows.length.toLocaleString()} rows
            </span>
          </div>
          <span className="text-xs text-slate-400" data-testid="table-team">
            Team: {team?.name || "—"}
            {user.role === "agent" ? " · what you can see and edit is set by an admin" : ""}
          </span>
        </div>
      </div>

      {/* search + dataset type + filters toggle */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search all columns…"
          aria-label="Search all columns"
          className={`${inputCls} w-64`}
        />
        {isGeneral && (
          <select
            value={datasetFilter}
            onChange={(e) => setDatasetFilter(e.target.value)}
            aria-label="Dataset type"
            className={inputCls}
          >
            <option value="">All dataset types</option>
            {datasetTables.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
            <option value={NO_DATASET}>No dataset type</option>
          </select>
        )}
        {filterCols.length > 0 && (
          <button
            onClick={() => setFiltersOpen((o) => !o)}
            aria-expanded={filtersOpen}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Filters{activeCount > 0 ? ` (${activeCount})` : ""} {filtersOpen ? "▴" : "▾"}
          </button>
        )}
        {anythingActive && (
          <button onClick={clearAll} className="text-xs font-medium text-blue-600 hover:underline">
            Clear all
          </button>
        )}
        {isGeneral && !datasetFilter && (
          <span className="text-xs text-slate-400">Pick a dataset type to also see that dataset&apos;s extra columns.</span>
        )}
      </div>

      {filtersOpen && filterCols.length > 0 && (
        <div className="mb-4">
          <ColumnFilters
            columns={filterCols}
            options={filterOptions}
            filters={filters}
            onChange={(cellId, value) => setFilters((f) => ({ ...f, [cellId]: value }))}
          />
        </div>
      )}

      {notice && (
        <p role="status" className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {notice}
        </p>
      )}
      {leftoverSamples > 0 && (
        <p className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {leftoverSamples.toLocaleString()} fake test rows from earlier testing are still stored.
          <button
            onClick={async () => {
              await deleteSampleRows();
              setLeftoverSamples(0);
              await reload();
            }}
            className="font-medium underline"
          >
            Remove them
          </button>
        </p>
      )}

      {selected.size > 0 && (
        <BulkEditBar
          columns={caps.bulkEdit ? bulkCols : []}
          selected={selected.size}
          totalMatching={visibleRows.length}
          onSelectAll={selectAllMatching}
          onClear={clearSelection}
          onApply={applyBulk}
          targets={caps.transfer ? targets : []}
          onTransfer={transferSelected}
          busy={bulkBusy}
        />
      )}

      {(error || actionError) && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error || actionError}</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  aria-label="Select all rows on this page"
                  checked={pageAllSelected}
                  ref={(el) => el && (el.indeterminate = !pageAllSelected && pageSomeSelected)}
                  onChange={(e) => togglePage(e.target.checked)}
                  disabled={pageRows.length === 0}
                />
              </th>
              {columns.map((c) => (
                <th key={c.cellId} className={`whitespace-nowrap px-3 py-3 ${c.fromDataset ? "bg-violet-50/70 text-violet-500" : ""}`}>
                  {c.label}
                  {c.fromDataset && <span className="block text-[10px] font-normal normal-case tracking-normal">from {c.datasetName}</span>}
                </th>
              ))}
              <th className="px-3 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pageRows.map((row) => (
              <tr key={row.id} className={selected.has(row.id) ? "bg-blue-50/60" : "hover:bg-slate-50/60"}>
                <td className="w-10 px-3 py-1">
                  <input
                    type="checkbox"
                    aria-label="Select row"
                    checked={selected.has(row.id)}
                    onChange={(e) => toggleRow(row.id, e.target.checked, e.nativeEvent.shiftKey)}
                  />
                </td>
                {columns.map((c) => {
                  const v = getCellValue(row, c, tables);
                  if (!canEditCol(c)) {
                    return (
                      <td key={c.cellId} className="whitespace-nowrap px-3 py-2 text-sm text-slate-500" title={c.readOnly ? "Set by the system" : "Read-only"}>
                        {v === "" ? <span className="text-slate-300">—</span> : v}
                      </td>
                    );
                  }
                  const isChoice = c.type === "choices";
                  // keep a value that is no longer in the list selectable, so it isn't silently lost
                  const opts = isChoice ? ["", ...c.options, ...(v !== "" && !c.options.includes(v) ? [v] : [])] : undefined;
                  return (
                    <td key={c.cellId} className="px-1 py-1">
                      <EditableCell
                        value={v}
                        type={isChoice ? "select" : c.type === "date" ? "date" : "text"}
                        options={opts}
                        onSave={(nv) => editCell(row, c, nv)}
                      />
                    </td>
                  );
                })}
                <td className="px-3 py-1">
                  <div className="flex items-center justify-center">
                    <Link
                      href={`/tables/${table.id}/history/${row.id}`}
                      title="Transaction history"
                      aria-label="Transaction history"
                      className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                    >
                      🕒
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && pageRows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 2} className="px-3 py-10 text-center text-sm text-slate-400">
                  {rows.length === 0 ? "No rows in this table yet." : "No rows match your search or filters."}
                </td>
              </tr>
            )}
            {loading && pageRows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 2} className="px-3 py-10 text-center text-sm text-slate-400">
                  Loading rows…
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
        total={visibleRows.length}
        onPageChange={setPage}
      />
    </div>
  );
}
