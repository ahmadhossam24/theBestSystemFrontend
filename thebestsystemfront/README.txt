STAGE 1 (users part) - foundation: roles, permissions, org data. NO screens yet.

app/lib/org/   (copy into your project's app/lib/org/ - 8 new files, nothing existing is changed)
  roles.js        the 5 roles, ranks, scopes
  permissions.js  every "may this user do this?" rule, in ONE place (deny by default)
  password.js     PBKDF2-SHA256 hashing (WebCrypto), random salt per password
  validation.js   username / password / name rules
  memoryRepo.js   in-memory storage (tests)
  idbRepo.js      IndexedDB storage "ops-org-v2" (the browser demo) - the only file a Django backend replaces
  orgService.js   branches, teams, users, login, audit log - all rules + guards
  orgClient.js    getOrgService(): the shared instance the screens will use

tests/         (not part of the app; run them any time)
  cd tests && npm install && npm test
  perm.test.mjs     2,322 role x action x scope checks, hand-written expectations
  service.test.mjs  268 checks, run against BOTH the in-memory and the IndexedDB code

NOTE: password hashing needs a secure page - open the demo on http://localhost:3000 (or https).
      On a plain http://<network-ip> address the browser removes WebCrypto and the app says so.
