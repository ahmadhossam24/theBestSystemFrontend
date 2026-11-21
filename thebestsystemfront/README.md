# Users Stage 6 — export, full demo data, role test run
Merge `app/` over your project (replaces page.js, components/sidebar.jsx, first-run/page.js, tables/[tableId]/page.js, lib/data/dataRules.js, lib/org/demoSeed.js, lib/org/routes.js). Clear browser storage to try the demo.

**Export (admins only: director, branch admin, team admin)**
- Table page: "Export Excel (N)" downloads exactly what the grid shows (search, filters, dataset type).
- Export Data page (`/export`): ticks per table of the chosen team -> one workbook, one sheet per table + an Info sheet (who, when, rows per table). Director/branch admins with several teams also get "Export all N teams" (sheets named "Team - Table"), limited to the teams they can see.
- Values are written as text (phone numbers keep leading zeros). Super agents and agents have no export anywhere.
- Note: a general table's sheet has its own columns + Dataset type; a dataset's own extra columns are on the dataset's sheet.

**Demo data** (first-run, tick the demo box; a sub-option controls the sample data): per team Rejection + Leads (datasets) and Accepts (general), 36 rows each with real agents, upload/edit/transfer history, a default column (Region / Priority), and agent permissions: Sales A hides contact phones (nour may see them and edit Feedback), Sales B hides its Leads table, Support is read-only.

**Home page** shows who you are, your team and shortcuts for your role.

tests/: export unit tests (15) and the browser test of the demo + every role (54 checks).
