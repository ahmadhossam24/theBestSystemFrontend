# Users Stage 4 — per-team tables and data
Merge `app/` over your project. Clear browser storage first (tables moved to new keys `setup-tables-v2` / `setup-default-columns-v2`).

- Every table belongs to ONE team (chosen with the sidebar scope picker when you add it) and never changes team. Default columns are per team; a new team starts empty. Table names only need to be unique inside a team.
- Setup page and the sidebar's Data menu show the chosen team's tables. Table and history URLs are checked: you can only open tables of teams you can see (director: all, branch admin: his branch, others: own team); a row can't be read through another team's table.
- Agent column choices = real agents + super agents of the table's team; the stored value is the username. Renaming a username updates the rows assigned to it. Agent history ("by") is the signed-in user; the old "Acting as" box and lib/data/currentUser.js are gone (file can be deleted).
- Table page by role: import + bulk edit = admins only; transfer = everyone, into general tables of the same team only; super agents edit cells; agents are view-only until Stage 5 adds per-agent permissions.
- A team can't be deleted while its tables hold rows (empty tables are fine and come back on restore).
- Setup's column chip for Agent now shows "choices (0)" because the real list is filled in per team when a table is displayed.
