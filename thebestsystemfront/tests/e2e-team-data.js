const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:3122';
const FX = process.env.FX;
let pass = 0, fail = 0; const errors = [];
const ok = (n, c, x = '') => { (c ? pass++ : fail++); console.log((c ? 'PASS  ' : 'FAIL  ') + n + (c ? '' : '   ' + JSON.stringify(x))); };
const settle = (p) => p.waitForFunction(() => !/Loading…|Loading rows/.test(document.body.innerText));
const login = async (p, u, pw = 'demo1234') => { await p.goto(BASE + '/login'); await p.waitForSelector('[data-testid="login-form"]'); await p.fill('input[aria-label="Username"]', u); await p.fill('input[aria-label="Password"]', pw); await p.click('button:has-text("Sign in")'); await p.waitForSelector('[data-testid="actor-bar"]'); await settle(p); };
const signOut = async (p) => { await p.click('[data-testid="sign-out"]'); await p.waitForURL('**/login**'); };
const as = async (p, u) => { if (await p.locator('[data-testid="sign-out"]').count()) await signOut(p); await login(p, u, u === 'director' ? 'secret1' : 'demo1234'); };
const open = async (p, path) => { await p.goto(BASE + path); await p.waitForSelector('[data-testid="actor-bar"]'); await settle(p); };
const scopeTo = async (p, branch, team) => {
  if (branch) { await p.selectOption('select[aria-label="Scope branch"]', { label: branch }); await p.waitForFunction((t) => [...document.querySelectorAll('select[aria-label="Scope team"] option')].some(o => o.text === t), team); }
  await p.selectOption('select[aria-label="Scope team"]', { label: team });
  await p.waitForFunction((t) => document.querySelector('select[aria-label="Scope team"]')?.selectedOptions[0]?.text === t, team);
};
const addTable = async (p, name, type) => {
  await p.click('button:has-text("Add table")'); await p.fill('input[placeholder="e.g. Rejection"]', name);
  await p.selectOption('select >> nth=-1', type); await p.click('button:has-text("Create table")');
  await p.waitForSelector(`tr:has-text("${name}")`);
};
const setupNames = async (p) => (await p.locator('tbody tr td:first-child').allInnerTexts()).map(s => s.trim()).filter(Boolean);
const sideTables = async (p) => { // expand Data > Datasets
  if (!(await p.locator('.submenu-item:has-text("Datasets")').count())) await p.locator('.nav-header:has-text("Data")').first().click();
  const ds = p.locator('.nested-submenu'); if (!(await ds.count())) await p.locator('.submenu-item:has-text("Datasets")').first().click();
  await p.waitForTimeout(200);
  return (await p.locator('a[href^="/tables/"]').evaluateAll(as => as.map(a => a.innerText.trim() + '|' + a.getAttribute('href').split('/')[2]))).sort();
};
const tableHref = async (p, name) => (await p.locator(`tr:has-text("${name}") a:has-text("Open")`).first().getAttribute('href'));
const colIndex = async (p, label) => (await p.locator('thead th').allInnerTexts()).findIndex(h => h.replace(/\s+/g, ' ').trim().toLowerCase().startsWith(label.toLowerCase()));
const cell = async (p, rowNo, label) => p.locator(`tbody tr:nth-child(${rowNo}) td`).nth(await colIndex(p, label));
const idb = (p, db, store) => p.evaluate(([db, store]) => new Promise(res => { const r = indexedDB.open(db); r.onsuccess = () => { const q = r.result.transaction(store).objectStore(store).getAll(); q.onsuccess = () => res(q.result); }; }), [db, store]);

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 950 }, timezoneId: 'Africa/Cairo' });
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });

  // ---- bootstrap demo org
  await p.goto(BASE + '/first-run'); await p.waitForSelector('form');
  await p.locator('form input').first().fill('Admin'); await p.fill('input[autocomplete="username"]', 'director');
  await p.locator('input[type="password"]').nth(0).fill('secret1'); await p.locator('input[type="password"]').nth(1).fill('secret1');
  await p.check('[data-testid="demo-checkbox"]'); await p.click('button[type="submit"]');
  await p.waitForSelector('[data-testid="demo-password"]', { timeout: 60000 }); await p.click('button:has-text("Continue")'); await p.waitForSelector('[data-testid="actor-bar"]'); await settle(p);

  // ================= A. per-team setup =================
  await open(p, '/setup-table');
  await scopeTo(p, 'Cairo Branch', 'Sales A');
  ok('setup says which team it edits', /Tables of Sales A/.test(await p.locator('[data-testid="setup-scope"]').innerText()));
  ok('new team starts with no tables', (await setupNames(p)).join() === 'No tables in this team yet. Click "Add table" to create one.' || /No tables in this team/.test(await p.locator('tbody').innerText()));
  await addTable(p, 'Rejection', 'Dataset table'); await addTable(p, 'Accepts', 'General table');
  // default column only for this team
  await p.click('button:has-text("Default columns")'); await p.click('button:has-text("+ Add column")'); await p.fill('input[placeholder="Column name"]', 'Region');
  await p.click('button:has-text("Save default columns")'); await p.waitForSelector('button:has-text("Default columns (1)")');
  const hrefA = await tableHref(p, 'Rejection'); const idRejA = hrefA.split('/').pop();
  const idAccA = (await tableHref(p, 'Accepts')).split('/').pop();
  await scopeTo(p, null, 'Sales B');
  ok('Sales B has none of Sales A\'s tables', /No tables in this team/.test(await p.locator('tbody').innerText()));
  ok('Sales B has no default columns', (await p.locator('button:has-text("Default columns")').innerText()).trim() === 'Default columns');
  await addTable(p, 'Rejection', 'Dataset table'); await addTable(p, 'Accepts', 'General table');
  ok('same table name allowed in another team', (await setupNames(p)).sort().join() === 'Accepts,Rejection');
  await p.click('button:has-text("Add table")'); await p.fill('input[placeholder="e.g. Rejection"]', 'rejection'); await p.click('button:has-text("Create table")');
  ok('duplicate name inside the same team is rejected', /already exists/.test(await p.locator('body').innerText()));
  await p.click('button:has-text("Cancel")');
  const idRejB = (await tableHref(p, 'Rejection')).split('/').pop();
  const idAccB = (await tableHref(p, 'Accepts')).split('/').pop();
  ok('four distinct table ids', new Set([idRejA, idAccA, idRejB, idAccB]).size === 4);
  await p.locator('tr:has-text("Rejection") button[title="Edit"]').click();
  ok('edit form never offers a team change', !/team/i.test(await p.locator('.fixed, [class*="fixed"]').last().innerText()), await p.locator('select').count());
  await p.click('button:has-text("Cancel")');
  const stored = await p.evaluate(() => JSON.parse(localStorage.getItem('setup-tables-v2')));
  ok('every stored table carries its teamId', stored.length === 4 && stored.every(t => t.teamId) && new Set(stored.map(t => t.teamId)).size === 2);
  ok('Region column only in Sales A tables', stored.filter(t => t.columns.some(c => c.label === 'Region')).map(t => t.id).sort().join() === [idRejA, idAccA].sort().join());

  // sidebar follows scope
  await open(p, '/');
  await scopeTo(p, null, 'Sales A');
  let side = await sideTables(p);
  ok('sidebar lists Sales A tables only', side.length === 2 && side.every(x => [idRejA, idAccA].includes(x.split('|')[1])), side);
  await scopeTo(p, null, 'Sales B'); side = await sideTables(p);
  ok('sidebar switches with the scope picker', side.length === 2 && side.every(x => [idRejB, idAccB].includes(x.split('|')[1])), side);

  // ================= B. agents column + import into Sales A =================
  await scopeTo(p, null, 'Sales A');
  await open(p, '/tables/' + idRejA);
  ok('table page shows its team', /Team: Sales A/.test(await p.locator('[data-testid="table-team"]').innerText()));
  await p.setInputFiles('[data-testid="import-file"]', `${FX}/bulk45.xlsx`); await p.waitForSelector('[role="dialog"]');
  await p.locator('[role="dialog"] button:has-text("Import")').last().click(); await p.waitForSelector('text=Imported 45 rows');
  ok('45 rows imported into Sales A Rejection', /45 of 45 rows/.test(await p.locator('body').innerText()));
  await open(p, '/tables/' + idRejB);
  ok('Sales B Rejection has no rows', /0 of 0 rows/.test(await p.locator('body').innerText()));
  await open(p, '/tables/' + idRejA);
  const agentCell = await cell(p, 1, 'Agent'); await agentCell.click();
  const optsA = await agentCell.locator('select option').allInnerTexts();
  ok('Agent choices = real agents + super agents of Sales A', optsA.filter(o => !o.startsWith('—')).sort().join() === 'nour,sa.salesa,sara', optsA);
  await agentCell.locator('select').selectOption('sara'); await agentCell.locator('select').press('Enter');
  await p.waitForTimeout(300);
  ok('assigning to a real agent works', (await (await cell(p, 1, 'Agent')).innerText()).trim() === 'sara');
  const rid = (await p.locator('tbody tr:first-child a[aria-label="Transaction history"]').getAttribute('href')).split('/').pop();
  await p.goto(BASE + `/tables/${idRejA}/history/${rid}`); await settle(p);
  ok('history records the signed-in user, not a typed name', /Admin/.test(await p.locator('main').innerText()), await p.locator('main').innerText());

  // ================= C. other team's tables are closed =================
  await as(p, 'ta.salesb');
  await open(p, '/setup-table');
  ok('team admin B: setup lists only her team', (await setupNames(p)).sort().join() === 'Accepts,Rejection' && /Tables of Sales B/.test(await p.locator('[data-testid="setup-scope"]').innerText()));
  await open(p, '/tables/' + idRejA);
  ok('team admin B cannot open a Sales A table by URL', (await p.locator('[data-testid="table-missing"]').count()) === 1 && (await p.locator('tbody tr').count()) === 0);
  await open(p, `/tables/${idRejB}/history/${rid}`);
  ok('...nor read a Sales A row through her own table\'s history URL', (await p.locator('text=This row no longer exists').count()) === 1 && !/Admin/.test(await p.locator('main').innerText()));
  await open(p, `/tables/${idRejA}/history/${rid}`);
  ok('...nor through the right table id', (await p.locator('[data-testid="table-missing"]').count()) === 1);
  await open(p, '/tables/' + idRejB);
  ok('her own table opens, with import available', (await p.locator('button:has-text("Import Excel")').count()) === 1);
  const optsB = await (async () => { const c = await cell(p, 1, 'Agent').catch(() => null); return c; })();
  await as(p, 'ba.alex'); await open(p, '/tables/' + idRejA);
  ok('branch admin of another branch is locked out', (await p.locator('[data-testid="table-missing"]').count()) === 1);
  await as(p, 'ba.cairo'); await open(p, '/tables/' + idRejA);
  ok('branch admin of Cairo opens Sales A table', (await p.locator('button:has-text("Import Excel")').count()) === 1 && /45 of 45/.test(await p.locator('body').innerText()));
  await open(p, '/tables/' + idRejB);
  ok('...and Sales B table (same branch)', /Team: Sales B/.test(await p.locator('[data-testid="table-team"]').innerText()));

  // ================= D. role capabilities on a table =================
  await as(p, 'sa.salesa'); await open(p, '/tables/' + idRejA);
  ok('super agent: no Import Excel', (await p.locator('button:has-text("Import Excel")').count()) === 0);
  await (await cell(p, 2, 'Feedback')).click();
  await (await cell(p, 2, 'Feedback')).locator('select').selectOption('Accept'); await (await cell(p, 2, 'Feedback')).locator('select').press('Enter'); await p.waitForTimeout(300);
  ok('super agent can edit cells', (await (await cell(p, 2, 'Feedback')).innerText()).trim() === 'Accept');
  await p.locator('input[aria-label="Select row"]').nth(0).check(); await p.locator('input[aria-label="Select row"]').nth(1).check();
  const bar = p.locator('[aria-label="Bulk edit"]');
  ok('super agent: no bulk "Set" section, but Transfer is offered', (await bar.locator('select[aria-label="Column to set"]').count()) === 0 && (await bar.locator('select[aria-label="Transfer to table"]').count()) === 1);
  const tOpts = await bar.locator('select[aria-label="Transfer to table"] option').allInnerTexts();
  ok('transfer targets = general tables of the same team only', tOpts.filter(t => !t.startsWith('—')).join() === 'Accepts', tOpts);
  await p.selectOption('select[aria-label="Transfer to table"]', { label: 'Accepts' });
  await bar.locator('button:has-text("Transfer")').first().click(); await bar.locator('button:has-text("Confirm transfer")').click();
  await p.waitForSelector('text=Transferred to Accepts');
  const rows = await idb(p, 'ops-data-v1', 'rows');
  ok('rows moved into Sales A Accepts (never Sales B)', rows.filter(r => r.generalTableId === idAccA).length === 2 && rows.filter(r => r.generalTableId === idAccB).length === 0);
  const hist = await idb(p, 'ops-data-v1', 'history');
  const names = [...new Set(hist.filter(h => h.type === 'transfer' || h.kind === 'transfer').map(h => h.by))];
  const me = (await p.locator('[data-testid="actor-name"]').innerText()).trim();
  ok('transfer history names the signed-in super agent', names.length === 1 && names[0] === me, [names, me]);

  await as(p, 'sara'); await open(p, '/tables/' + idRejA);
  ok('agent: no Import Excel', (await p.locator('button:has-text("Import Excel")').count()) === 0);
  ok('agent: view-only banner', /view only/.test(await p.locator('[data-testid="table-team"]').innerText()));
  await (await cell(p, 3, 'Feedback')).click();
  ok('agent: clicking a cell does not open an editor', (await p.locator('tbody select, tbody input[type="text"]').count()) === 0);
  await p.locator('input[aria-label="Select row"]').nth(2).check();
  ok('agent: transfer still offered, bulk set is not', (await p.locator('[aria-label="Bulk edit"] select[aria-label="Transfer to table"]').count()) === 1 && (await p.locator('select[aria-label="Column to set"]').count()) === 0);
  await open(p, '/tables/' + idRejB);
  ok('agent cannot open another team\'s table', (await p.locator('[data-testid="table-missing"]').count()) === 1);
  await open(p, '/setup-table'); ok('agent: setup page is closed', (await p.locator('[data-testid="no-access"]').count()) === 1);

  // ================= E. username rename follows the data =================
  await as(p, 'director'); await open(p, '/users/all');
  await p.click('button[aria-label="Edit sara"]'); await p.locator('[role="dialog"] [aria-label="Username"]').fill('sara.k'); await p.locator('[role="dialog"] button[type="submit"]').click();
  await p.waitForSelector('[data-testid="row-sara.k"]');
  await p.waitForTimeout(400);
  const rows2 = await idb(p, 'ops-data-v1', 'rows');
  ok('rows assigned to sara now say sara.k', rows2.filter(r => r.values.agent === 'sara').length === 0 && rows2.filter(r => r.values.agent === 'sara.k').length >= 1);
  await scopeTo(p, 'Cairo Branch', 'Sales A'); await open(p, '/tables/' + idRejA);
  const c2 = await cell(p, 1, 'Agent'); await c2.click();
  ok('new username is offered in the Agent list', (await c2.locator('select option').allInnerTexts()).includes('sara.k'));
  await p.keyboard.press('Escape');

  // ================= F. team deletion + data =================
  await open(p, '/teams/all'); 
  await p.click('button:has-text("Add team")'); await p.locator('[role="dialog"] [aria-label="Team name"]').fill('Temp'); await p.locator('[role="dialog"] select[aria-label="Branch"]').selectOption({ label: 'Cairo Branch' }); await p.locator('[role="dialog"] button[type="submit"]').click();
  await p.waitForSelector('[data-testid="row-Temp-Cairo Branch"]');
  await open(p, '/setup-table'); await scopeTo(p, 'Cairo Branch', 'Temp'); await addTable(p, 'Leads', 'Dataset table');
  await open(p, '/teams/all');
  await p.click('button[aria-label="Delete Temp"]'); await p.click('button:has-text("Delete team")');
  await p.waitForFunction(() => !document.querySelector('[data-testid="row-Temp-Cairo Branch"]'));
  ok('team with only an EMPTY table can be deleted', true);
  await open(p, '/teams/deleted'); await p.click('button[aria-label="Restore Temp"]'); await p.waitForFunction(() => !document.querySelector('[data-testid="row-Temp-Cairo Branch"]'));
  await open(p, '/setup-table'); await scopeTo(p, 'Cairo Branch', 'Temp');
  ok('restored team gets its table back', (await setupNames(p)).join() === 'Leads');
  const idLeads = (await tableHref(p, 'Leads')).split('/').pop();
  await open(p, '/tables/' + idLeads);
  await p.setInputFiles('[data-testid="import-file"]', `${FX}/bulk45.xlsx`); await p.waitForSelector('[role="dialog"]');
  await p.locator('[role="dialog"] button:has-text("Import")').last().click(); await p.waitForSelector('text=Imported 45 rows');
  await open(p, '/teams/all');
  await p.click('button[aria-label="Delete Temp"]'); await p.click('button:has-text("Delete team")');
  await p.waitForSelector('[role="dialog"] [role="alert"]');
  ok('team whose tables hold rows cannot be deleted', /still has tables with rows/.test(await p.locator('[role="dialog"]').innerText()), await p.locator('[role="dialog"]').innerText());

  ok('no console/page errors', errors.length === 0, errors.slice(0, 5));
  console.log(`\n${pass} passed, ${fail} failed`); await browser.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.log('SCRIPT ERROR', e.message.split('\n').slice(0, 6).join('\n')); process.exit(1); });
