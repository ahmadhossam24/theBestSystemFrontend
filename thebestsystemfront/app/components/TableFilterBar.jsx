"use client";

const inputCls =
  "rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100";

export default function TableFilterBar({ search, onSearchChange, filterConfig, filters, onFilterChange, onClear, hasActiveFilters }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <input
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search all columns..."
        className={`${inputCls} w-56`}
      />

      {filterConfig.map((f) => {
        if (f.type === "select") {
          return (
            <select
              key={f.key}
              value={filters[f.key] || ""}
              onChange={(e) => onFilterChange(f.key, e.target.value)}
              className={inputCls}
            >
              <option value="">All {f.label}</option>
              {f.options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          );
        }

        // dateRange
        const range = filters[f.key] || {};
        return (
          <div key={f.key} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1">
            <span className="text-xs font-medium text-slate-400">{f.label}</span>
            <input
              type="date"
              value={range.from || ""}
              onChange={(e) => onFilterChange(f.key, { ...range, from: e.target.value })}
              className="rounded-md text-sm text-slate-600 outline-none"
            />
            <span className="text-xs text-slate-300">to</span>
            <input
              type="date"
              value={range.to || ""}
              onChange={(e) => onFilterChange(f.key, { ...range, to: e.target.value })}
              className="rounded-md text-sm text-slate-600 outline-none"
            />
          </div>
        );
      })}

      {hasActiveFilters && (
        <button onClick={onClear} className="text-xs font-medium text-blue-600 hover:underline">
          Clear filters
        </button>
      )}
    </div>
  );
}
