# Users system — overview (Stages 1–6)
Roles: director > branch admin > team admin > super agent > agent. Teams belong to a branch; users to one team (branch admins to a branch).
Storage (browser): IndexedDB `ops-org-v2` (branches, teams, users, log), `ops-data-v1` (rows, history); localStorage `setup-tables-v2`, `setup-default-columns-v2`, `ops-perms-v2`, `ops-session-v2`, `ops-scope-v2:<user>`.
Layers: lib/org/{roles,permissions,orgService,...} (rules + service, repo interface), lib/data/{agentPerms,dataRules,xlsxExport,...}, components/org/*.
Everything that must change for a Django backend sits behind getOrgService() (users/branches/teams/auth) and the db.js / useTables / permStore modules (data, tables, permissions).
Rules not enforced by a server yet: this is a UI demo, so anyone with the browser's dev tools can change their own storage. The server stage would move checks into the API.
Tests: see tests/ of each stage zip (unit: permissions matrix, service, seed, routes, agent permissions, export; browser: stages 2–6).
