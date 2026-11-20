"use client";
// "Does this team still own tables with rows?" Plugged into the org service so such a team can't be deleted.
import { STORAGE_KEY } from "../../setup-table/lib/tableSchema";
import { countRowsForTable } from "../data/db";

export async function teamHasData(teamId) {
  let tables = [];
  try {
    tables = (JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") || []).filter((t) => t && t.teamId === teamId);
  } catch {}
  for (const t of tables) {
    try {
      if ((await countRowsForTable(t.id)) > 0) return true;
    } catch {}
  }
  return false;
}
