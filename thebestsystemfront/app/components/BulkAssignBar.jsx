"use client";

export default function BulkAssignBar({ count, agentOptions, agent, onAgentChange, onApply, onClear }) {
  return (
    <div className="mb-4 flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5">
      <span className="text-sm font-medium text-blue-800">{count} selected</span>

      <select
        value={agent}
        onChange={(e) => onAgentChange(e.target.value)}
        className="rounded-lg border border-blue-200 bg-white px-2 py-1.5 text-sm text-slate-700 outline-none"
      >
        <option value="">Choose agent...</option>
        {agentOptions.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>

      <button
        disabled={!agent}
        onClick={onApply}
        className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40 hover:bg-blue-700"
      >
        Assign
      </button>

      <button onClick={onClear} className="ml-auto text-xs font-medium text-blue-700 hover:underline">
        Clear selection
      </button>
    </div>
  );
}
