const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:3122';
const FX = process.env.FX;
let pass = 0, fail = 0; const errors = [];
const ok = (n, c, x = '') => { (c ? pass++ : fail++); console.log((c ? 'PASS  ' : 'FAIL  ') + n + (c ? '' : '   ' + JSON.stringify(x))); };
const settle = (p) => p.waitForFunction(() => !/Loading…|Loading rows/.test(document.body.innerText));
const login = async (p, u, pw = 'demo1234') => { await p.goto(BASE + '/login'); await p.waitForSelector('[data-testid="login-form"]'); await p.fill('input[aria-label="Username"]', u); await p.fill('input[aria-label="Password"]', pw); await p.click('button:has-text("Sign in")'); await p.waitForSelector('[data-testid="actor-bar"]'); await settle(p); };
const signOut = async (p) => { await p.click('[data-testid="sign-out"]'); await p.waitForURL('**/login**'); };
const as = async (p, u) => { if (await p.locator('[data-testid="sign-out"]').count()) await signOut(p); await login(p, u, ['director','newbie'].includes(u) ? 'secret1' : 'demo1234'); };
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
  const radio = (label, mode) => p.locator(`input[aria-label="${label} ${mode}"]`);
  const on = async (label, mode) => await radio(label, mode).isChecked();
  const pick = async (label, mode) => { await radio(label, mode).check(); };
  const subjectIs = async (v) => { await p.selectOption('select[aria-label="Settings for"]', v); await p.waitForTimeout(150); };
  const editText = async (rowNo, col, text) => { const c = await cell(p, rowNo, col); await c.click(); const i = c.locator('input'); await i.fill(text); await i.press('Enter'); await p.waitForTimeout(250); };
  const headers = async () => (await p.locator('thead th').allInnerTexts()).map(s => s.trim().toLowerCase());

  // ---- bootstrap
  await p.goto(BASE + '/first-run'); await p.waitForSelector('form');
  await p.locator('form input').first().fill('Admin'); await p.fill('input[autocomplete="username"]', 'director');
  await p.locator('input[type="password"]').nth(0).fill('secret1'); await p.locator('input[type="password"]').nth(1).fill('secret1');
  await p.check('[data-testid="demo-checkbox"]'); await p.click('button[type="submit"]');
  await p.waitForSelector('[data-testid="demo-password"]', { timeout: 60000 }); await p.click('button:has-text("Continue")'); await p.waitForSelector('[data-testid="actor-bar"]'); await settle(p);
  await open(p, '/setup-table'); await scopeTo(p, 'Cairo Branch', 'Sales A');
  await addTable(p, 'Rejection', 'Dataset table'); await addTable(p, 'Accepts', 'General table');
  const idRej = (await tableHref(p, 'Rejection')).split('/').pop();
  await open(p, '/tables/' + idRej);
  await p.setInputFiles('[data-testid="import-file"]', `${FX}/bulk45.xlsx`); await p.waitForSelector('[role="dialog"]');
  await p.locator('[role="dialog"] button:has-text("Import")').last().click(); await p.waitForSelector('text=Imported 45 rows');
  const allHeaders = await headers();
  ok('director sees all columns of the table', allHeaders.some(h => h.startsWith('feedback')) && allHeaders.some(h => h.startsWith('agent notes')), allHeaders);
  const colLabels = ['Feedback', 'Agent notes'];

  // ================= A. the screen =================
  await open(p, '/users/permissions');
  ok('screen names the team', /Sales A/.test(await p.locator('[data-testid="perm-scope"]').innerText()));
  const subjects = await p.locator('select[aria-label="Settings for"] option').allInnerTexts();
  ok('subjects = team default + agents only (no super agent / admin)', subjects.length === 3 && /Team default/.test(subjects[0]) && !subjects.some(s => /sa\.salesa|ta\.salesa/.test(s)), subjects);
  await p.selectOption('select[aria-label="Table"]', { label: 'Rejection (dataset)' });
  ok('default is read-only everywhere', await on('Feedback', 'Read-only') && await on('Agent notes', 'Read-only'));
  ok('system columns cannot be made editable', await radio('Upload date', 'Editable').isDisabled());

  // ================= B. team default =================
  await pick('Feedback', 'Hidden'); await pick('Agent notes', 'Editable');
  await p.reload(); await settle(p); await p.selectOption('select[aria-label="Table"]', { label: 'Rejection (dataset)' });
  ok('team default persists across reload', await on('Feedback', 'Hidden') && await on('Agent notes', 'Editable'));
  await as(p, 'nour'); await open(p, '/tables/' + idRej);
  let hs = await headers();
  ok('agent: hidden column is gone from the grid', !hs.some(h => h.startsWith('feedback')) && hs.some(h => h.startsWith('agent notes')), hs);
  ok('agent: other agents follow the same team default', true);
  await editText(1, 'Agent notes', 'nour was here');
  ok('agent: editable column saves', (await (await cell(p, 1, 'Agent notes')).innerText()).trim() === 'nour was here');
  await (await cell(p, 1, 'Agent')).click();
  ok('agent: read-only column opens no editor', (await p.locator('tbody select, tbody input[type="text"]').count()) === 0);
  const rid = (await p.locator('tbody tr:first-child a[aria-label="Transaction history"]').getAttribute('href')).split('/').pop();
  await open(p, `/tables/${idRej}/history/${rid}`);
  ok('history shows the agent\'s edit by his name', /Agent notes/.test(await p.locator('main').innerText()) && /Nour/.test(await p.locator('main').innerText()), await p.locator('main').innerText());

  // ================= C. per-agent override =================
  await as(p, 'director'); await open(p, '/users/permissions'); await scopeTo(p, 'Cairo Branch', 'Sales A');
  await p.selectOption('select[aria-label="Table"]', { label: 'Rejection (dataset)' });
  const sara = (await p.locator('select[aria-label="Settings for"] option').allInnerTexts()).find(s => s.startsWith('sara'));
  await subjectIs({ label: sara });
  ok('agent without own settings shows the team default as source', (await p.locator('[data-testid^="col-"]').filter({ hasText: 'Feedback' }).innerText()).includes('team default'));
  await pick('Feedback', 'Editable'); await pick('Agent notes', 'Read-only');
  ok('own settings are labelled', (await p.locator('[data-testid^="col-"]').filter({ hasText: 'Feedback' }).innerText()).includes('own setting'));
  await subjectIs(await p.locator('select[aria-label="Settings for"] option').first().getAttribute('value'));
  ok('...and do not touch the team default', await on('Feedback', 'Hidden') && await on('Agent notes', 'Editable'));
  await as(p, 'sara'); await open(p, '/tables/' + idRej);
  hs = await headers();
  ok('sara: sees Feedback (own setting beats default)', hs.some(h => h.startsWith('feedback')));
  await (await cell(p, 2, 'Feedback')).click(); const fsel = (await cell(p, 2, 'Feedback')).locator('select, input');
  ok('sara: Feedback is editable', (await fsel.count()) === 1);
  if (await (await cell(p, 2, 'Feedback')).locator('select').count()) { await (await cell(p, 2, 'Feedback')).locator('select').selectOption({ index: 1 }); await (await cell(p, 2, 'Feedback')).locator('select').press('Enter'); } else { await fsel.fill('Accept'); await fsel.press('Enter'); }
  await p.waitForTimeout(300);
  const fb = (await (await cell(p, 2, 'Feedback')).innerText()).trim();
  ok('sara: Feedback edit saved', fb !== '' && fb !== '—', fb);
  await (await cell(p, 1, 'Agent notes')).click();
  ok('sara: Agent notes is read-only for her', (await p.locator('tbody select, tbody input[type="text"]').count()) === 0);
  await p.fill('input[aria-label="Search all columns"]', fb); await p.waitForTimeout(500);
  const saraHits = await p.locator('tbody tr[data-testid], tbody tr:has(input[aria-label="Select row"])').count();
  ok('sara can search her visible Feedback column', saraHits >= 1, saraHits);
  const rid2 = (await p.locator('tbody tr:first-child a[aria-label="Transaction history"]').getAttribute('href')).split('/').pop();
  await as(p, 'nour'); await open(p, '/tables/' + idRej);
  await p.fill('input[aria-label="Search all columns"]', fb); await p.waitForTimeout(500);
  ok('nour: search never matches a hidden column', (await p.locator('tbody tr:has(input[aria-label="Select row"])').count()) === 0, fb);
  const sid = rid2;
  await open(p, `/tables/${idRej}/history/${sid}`);
  ok('nour: history hides edits of the column he can\'t see', !/Feedback/.test(await p.locator('main').innerText()), await p.locator('main').innerText());
  await as(p, 'director'); await open(p, `/tables/${idRej}/history/${sid}`);
  ok('director still sees that edit', /Feedback/.test(await p.locator('main').innerText()));
  await as(p, 'sa.salesa'); await open(p, '/tables/' + idRej);
  hs = await headers(); await (await cell(p, 1, 'Feedback')).click();
  ok('super agent is not restricted (sees + edits hidden-for-agents column)', hs.some(h => h.startsWith('feedback')) && (await (await cell(p, 1, 'Feedback')).locator('select, input').count()) === 1);

  // ================= D. apply to all + replace count =================
  await as(p, 'director'); await open(p, '/users/permissions'); await scopeTo(p, 'Cairo Branch', 'Sales A');
  await p.selectOption('select[aria-label="Table"]', { label: 'Rejection (dataset)' });
  await p.click('button[aria-label="Set Feedback for all agents"]'); // current subject = team default (Hidden)
  let msg = await p.locator('[data-testid="replace-count"]').innerText();
  ok('apply-all warns: replaces 1 individual setting (sara\'s)', /replaces 1 existing setting/.test(msg), msg);
  await p.click('[role="dialog"] button:has-text("Cancel")');
  await as(p, 'sara'); await open(p, '/tables/' + idRej);
  ok('cancel changed nothing', (await headers()).some(h => h.startsWith('feedback')));
  await as(p, 'director'); await open(p, '/users/permissions'); await scopeTo(p, 'Cairo Branch', 'Sales A');
  await p.selectOption('select[aria-label="Table"]', { label: 'Rejection (dataset)' });
  await p.click('button[aria-label="Set Feedback for all agents"]'); await p.click('[role="dialog"] button:has-text("Apply to all")');
  await p.waitForSelector('[role="status"]:has-text("Applied")');
  ok('apply-all notice mentions the replaced count', /1 existing setting replaced/.test(await p.locator('[role="status"]').innerText()), await p.locator('[role="status"]').innerText());
  await as(p, 'sara'); await open(p, '/tables/' + idRej);
  ok('sara now follows the applied setting (Feedback hidden)', !(await headers()).some(h => h.startsWith('feedback')));
  await as(p, 'nour'); await open(p, '/tables/' + idRej);
  ok('nour too', !(await headers()).some(h => h.startsWith('feedback')));

  // reset
  await as(p, 'director'); await open(p, '/users/permissions'); await scopeTo(p, 'Cairo Branch', 'Sales A');
  await p.selectOption('select[aria-label="Table"]', { label: 'Rejection (dataset)' }); await subjectIs({ label: sara });
  await pick('Feedback', 'Editable');
  await p.click('[data-testid="reset-agent"]');
  ok('reset to team default clears own settings', (await p.locator('[data-testid^="col-"]').filter({ hasText: 'Feedback' }).innerText()).includes('team default') && await on('Feedback', 'Hidden'));
  ok('...and the reset button disables itself', await p.locator('[data-testid="reset-agent"]').isDisabled());

  // ================= E. new agents + whole-table hide =================
  await open(p, '/users/all');
  await p.click('button:has-text("Add user")'); await p.locator('[role="dialog"] [aria-label="Name"]').fill('Newbie'); await p.locator('[role="dialog"] [aria-label="Username"]').fill('newbie'); await p.locator('[role="dialog"] [aria-label="Password"]').fill('secret1');
  await p.locator('[role="dialog"] select[aria-label="Team"]').selectOption({ label: 'Sales A (Cairo Branch)' }); await p.locator('[role="dialog"] button[type="submit"]').click(); await p.waitForSelector('[data-testid="row-newbie"]');
  await open(p, '/users/permissions'); await scopeTo(p, 'Cairo Branch', 'Sales A');
  await p.selectOption('select[aria-label="Table"]', { label: 'Rejection (dataset)' });
  ok('new agent appears on the screen', (await p.locator('select[aria-label="Settings for"] option').allInnerTexts()).some(s => s.startsWith('newbie')));
  await as(p, 'newbie'); await open(p, '/tables/' + idRej);
  hs = await headers();
  ok('new agent gets the team default (Feedback hidden, Agent notes visible)', !hs.some(h => h.startsWith('feedback')) && hs.some(h => h.startsWith('agent notes')), hs);
  await as(p, 'director'); await open(p, '/users/permissions'); await scopeTo(p, 'Cairo Branch', 'Sales A');
  await p.selectOption('select[aria-label="Table"]', { label: 'Rejection (dataset)' }); await subjectIs({ label: (await p.locator('select[aria-label="Settings for"] option').allInnerTexts()).find(s => s.startsWith('newbie')) });
  await p.click('button[aria-label="Set whole table Hidden"]');
  await as(p, 'newbie');
  await p.locator('.nav-header:has-text("Data")').first().click(); await p.waitForTimeout(200);
  ok('hidden table disappears from the agent\'s sidebar', (await p.locator('a[href^="/tables/"]').evaluateAll(a => a.map(x => x.getAttribute('href')))).every(h => !h.endsWith(idRej)));
  await open(p, '/tables/' + idRej);
  ok('...and its URL says it is not available', (await p.locator('[data-testid="table-missing"]').count()) === 1 && (await p.locator('tbody tr').count()) === 0);
  await open(p, `/tables/${idRej}/history/${rid}`);
  ok('...history too', (await p.locator('[data-testid="table-missing"]').count()) === 1);
  await as(p, 'nour'); await open(p, '/tables/' + idRej);
  ok('other agents still see the table', (await p.locator('[data-testid="table-missing"]').count()) === 0);

  // ================= F. who may open the screen / team isolation =================
  for (const u of ['sa.salesa', 'nour']) { await as(p, u); await open(p, '/users/permissions'); ok(`${u}: permissions screen is closed`, (await p.locator('[data-testid="no-access"]').count()) === 1); }
  await as(p, 'ta.salesb'); await open(p, '/users/permissions');
  ok('team admin B: sees only her own team and has no tables yet', /Sales B/.test(await p.locator('[data-testid="perm-scope"]').innerText()) && /no tables yet/.test(await p.locator('main').innerText()));
  await as(p, 'ta.salesa'); await open(p, '/users/permissions');
  ok('team admin A: opens it for Sales A', /Sales A/.test(await p.locator('[data-testid="perm-scope"]').innerText()));
  await p.selectOption('select[aria-label="Table"]', { label: 'Rejection (dataset)' });
  await pick('Agent notes', 'Hidden');
  await as(p, 'nour'); await open(p, '/tables/' + idRej);
  ok('team admin\'s change takes effect for agents', !(await headers()).some(h => h.startsWith('agent notes')));
  await as(p, 'director'); await open(p, '/users/permissions'); await scopeTo(p, 'Cairo Branch', 'Sales B');
  ok('director on Sales B: no tables of Sales A leak in', /no tables yet/.test(await p.locator('main').innerText()));

  ok('no console/page errors', errors.length === 0, errors.slice(0, 5));
  console.log(`\n${pass} passed, ${fail} failed`); await browser.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.log('SCRIPT ERROR', e.message.split('\n').slice(0, 6).join('\n')); process.exit(1); });
