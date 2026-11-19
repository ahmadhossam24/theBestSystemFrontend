# Users Stage 2 — Branches, Teams, Users pages

Copy the `app/` folder over your project (merge). New/changed: `first-run`, `branches/*`, `teams/*`, `users/*`, `components/org/*`, `lib/org/{session,demoSeed,orgService}.js`.

- Open the app on **localhost or https** (password hashing needs a secure context).
- Clear old browser storage once. First visit goes to /first-run: create the director, optionally load the demo organisation (password `demo1234`).
- Pages: Branches (all/deleted/add), Teams (all/deleted/add/members), Users (all/deleted). Actions follow the role rules.
- The "Switch user (temporary)" bar is a stand-in; Stage 3 replaces it with real login and removes `tempListAllForSwitcher`.
- Now unused and safe to delete: old BranchesTable/TeamsTable/UsersTable components, their 3 CSS files, and lib/branchShape.js, teamShape.js, userShape.js.
- Not built yet: /branches/settings, /users/roles, /users/permissions.
