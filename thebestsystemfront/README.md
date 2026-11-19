# Users Stage 3 — login, guards, role-based sidebar, scope picker
Merge `app/` over your project (replaces layout.js, page.js, components/sidebar.jsx, OrgGate, orgService.js).
- /login (username not case-sensitive, ?next= honoured). Signed out -> every page redirects to /login; no director yet -> /first-run.
- The temporary switch-user bar and `tempListAllForSwitcher` are gone. Sign out is in the sidebar.
- Sidebar hides what a role can't open (Branches: director/branch admin; Users, Setup Table, Audit Log: admins). Typing a blocked URL shows "No access".
- Scope picker (sidebar): director = Branch > Team; branch admin = Team of his branch; others = fixed own team. Remembered per user. The sidebar's table list still shows all tables until Stage 4 makes tables per-team.
- Unbuilt pages (Permissions, Dashboard, Audit Log) still point at placeholders.
- Demo accounts: password demo1234 (open on localhost/https).
