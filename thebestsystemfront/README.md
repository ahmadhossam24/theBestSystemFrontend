# Users Stage 5 — agent permissions
Merge `app/` over your project (replaces tables/[tableId]/page.js, its history page, components/sidebar.jsx, lib/data/dataRules.js).

**Screen:** Users > Permissions (director, branch admin, team admin; works on the team chosen in the sidebar). Pick "Settings for" = Team default or one agent, pick a table, and set each column Hidden / Read-only / Editable. System columns (e.g. upload date) can't be editable.
- Default for every column is Read-only. An agent's setting = his own, else the team default, else Read-only. So new agents get the team default automatically, and agents with no settings of their own follow it.
- "Set for all agents" (per column) and "Apply this table to all agents" overwrite every agent's setting; the confirm dialog says how many individual settings are replaced first. "Reset to team default" clears one agent's settings for the table.
- Only role *agent* is limited. Directors, admins and super agents are never restricted.

**Enforcement (agents):** hidden columns vanish from the grid, search and filters; read-only columns open no editor; a table whose every column is hidden disappears from the sidebar and its URL says "not available"; history events about hidden columns are not shown. Transfer stays available to agents.

Storage: localStorage key `ops-perms-v2`. tests/ has the pure-logic tests (39) and the browser test (43 checks).
