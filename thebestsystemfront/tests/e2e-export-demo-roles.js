const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:3122';
const FX = process.env.FX;
const XLSX = require(process.env.XLSXPATH);
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

const editText = async (p, rowNo, col, text) => { const c = await cell(p, rowNo, col); await c.click(); const i = c.locator('input'); await i.fill(text); await i.press('Enter'); await p.waitForTimeout(250); };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 950 }, timezoneId: 'Africa/Cairo', acceptDownloads: true });
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  const download = async (click) => { const [d] = await Promise.all([p.waitForEvent('download', { timeout: 20000 }), click()]); const path = await d.path(); const wb = XLSX.readFile(path); return { name: d.suggestedFilename(), wb, rows: (n) => XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: false, defval: '' }) }; };
  const rowsText = async () => (await p.locator('body').innerText()).match(/(\d[\d,]*) of (\d[\d,]*) rows/);
  const tableId = async (team, name) => { await open(p, '/setup-table'); await scopeTo(p, team === 'Support' ? 'Alexandria Branch' : 'Cairo Branch', team); return (await tableHref(p, name)).split('/').pop(); };
  const nav = async () => (await p.locator('.nav-header span').allInnerTexts()).map(s => s.trim());
  const headersOf = async () => (await p.locator('thead th').allInnerTexts()).map(s => s.trim().toLowerCase());

  // ============ demo load ============
  await p.goto(BASE + '/first-run'); await p.waitForSelector('form');
  await p.locator('form input').first().fill('Admin'); await p.fill('input[autocomplete="username"]', 'director');
  await p.locator('input[type="password"]').nth(0).fill('secret1'); await p.locator('input[type="password"]').nth(1).fill('secret1');
  await p.check('[data-testid="demo-checkbox"]'); await p.click('button[type="submit"]');
  await p.waitForSelector('[data-testid="demo-data"]', { timeout: 60000 });
  const dd = await p.locator('[data-testid="demo-data"]').innerText();
  ok('demo loader reports tables + rows for all three teams', /Sales A – 3 tables, 36 rows/.test(dd) && /Sales B – 3 tables, 36 rows/.test(dd) && /Support – 3 tables, 36 rows/.test(dd), dd);
  await p.click('button:has-text("Continue")'); await p.waitForSelector('[data-testid="actor-bar"]'); await settle(p);
  await open(p, '/');
  ok('home greets the director', /Welcome, Admin/.test(await p.locator('[data-testid="home"]').innerText()) && (await p.locator('[data-testid="home"] a[href="/export"]').count()) === 1);

  // ============ director: data, scope, export ============
  const idRejA = await tableId('Sales A', 'Rejection'); const idLeadsA = (await tableHref(p, 'Leads')).split('/').pop(); const idAccA = (await tableHref(p, 'Accepts')).split('/').pop();
  await open(p, '/tables/' + idRejA);
  let m = await rowsText(); ok('Sales A Rejection has 24 rows', m && m[2] === '24', m && m[0]);
  await open(p, '/tables/' + idAccA); m = await rowsText(); ok('Accepts has the 8 transferred rows', m && m[2] === '8', m && m[0]);
  ok('General table shows the dataset type', (await p.locator('tbody tr:first-child').innerText()).includes('Rejection'));
  await open(p, '/tables/' + idLeadsA); m = await rowsText(); ok('Leads has 12', m && m[2] === '12');
  await open(p, '/tables/' + idRejA);
  ok('Region (team default column) is present for Sales A', (await headersOf()).some(h => h.startsWith('region')));
  const idRejSup = await tableId('Support', 'Rejection'); await open(p, '/tables/' + idRejSup);
  ok('Support has its own default column, not Region', (await headersOf()).some(h => h.startsWith('priority')) && !(await headersOf()).some(h => h.startsWith('region')));
  const histHref = await p.locator('tbody tr:first-child a[aria-label="Transaction history"]').getAttribute('href');
  await open(p, histHref); ok('demo rows come with history', /added this row/.test(await p.locator('main').innerText()) && /transferred this row/.test(await p.locator('main').innerText()), await p.locator('main').innerText());

  // table-page export
  await open(p, '/tables/' + idRejA);
  ok('export button shows the row count', /Export Excel \(24\)/.test(await p.locator('[data-testid="export-table"]').innerText()));
  let dl = await download(() => p.click('[data-testid="export-table"]'));
  let r = dl.rows(dl.wb.SheetNames[0]);
  ok('file name carries team, table and date', /^Sales-A-Rejection-\d{4}-\d{2}-\d{2}\.xlsx$/.test(dl.name), dl.name);
  ok('sheet has header + 24 rows', r.length === 25, r.length);
  ok('header = the table columns', ['Landline', 'Name', 'Contact phone', 'Upload date', 'Agent', 'Feedback', 'Agent notes', 'Region'].every(h => r[0].includes(h)), r[0]);
  const phoneCol = r[0].indexOf('Contact phone'), landCol = r[0].indexOf('Landline');
  ok('phone numbers keep their leading zero (text)', r.slice(1).every(x => /^01\d{9}$/.test(x[phoneCol]) && /^02\d{8}$/.test(x[landCol])));
  const agentCol = r[0].indexOf('Agent');
  ok('agents exported by username', r.slice(1).every(x => ['', 'nour', 'sara', 'sa.salesa'].includes(x[agentCol])), [...new Set(r.slice(1).map(x => x[agentCol]))]);
  ok('dates exported as text YYYY-MM-DD HH:mm', r.slice(1).every(x => /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(x[r[0].indexOf('Upload date')])));
  // filtered export = what the grid shows
  await p.fill('input[aria-label="Search all columns"]', 'Ahmed'); await p.waitForTimeout(500);
  const shown = (await rowsText())[1];
  ok('button count follows the search', new RegExp(`Export Excel \\(${shown}\\)`).test(await p.locator('[data-testid="export-table"]').innerText()), shown);
  dl = await download(() => p.click('[data-testid="export-table"]')); r = dl.rows(dl.wb.SheetNames[0]);
  ok('filtered export has exactly the visible rows', r.length - 1 === Number(shown) && r.slice(1).every(x => x.some(c => /Ahmed/.test(c))), r.length);

  // export page: team
  await open(p, '/export'); await scopeTo(p, 'Cairo Branch', 'Sales A');
  ok('export page lists tables with row counts', /24 rows/.test(await p.locator('[data-testid="export-row-Rejection"]').innerText()) && /8 rows/.test(await p.locator('[data-testid="export-row-Accepts"]').innerText()));
  dl = await download(() => p.click('[data-testid="export-team"]'));
  ok('team workbook = Info + one sheet per table', JSON.stringify(dl.wb.SheetNames) === JSON.stringify(['Info', 'Rejection', 'Leads', 'Accepts']), dl.wb.SheetNames);
  ok('row counts per sheet', dl.rows('Rejection').length === 25 && dl.rows('Leads').length === 13 && dl.rows('Accepts').length === 9);
  const info = dl.rows('Info'); ok('Info sheet: who + per-table rows', info[0][1] === 'Admin' && info.some(x => x[2] === 'Rejection' && x[4] === '24'), info);
  ok('general sheet carries Dataset type', dl.rows('Accepts')[0].includes('Dataset type') && dl.rows('Accepts').slice(1).every(x => x[dl.rows('Accepts')[0].indexOf('Dataset type')] === 'Rejection'));
  await p.locator('input[aria-label="Export Leads"]').uncheck();
  dl = await download(() => p.click('[data-testid="export-team"]'));
  ok('unticked tables are left out', JSON.stringify(dl.wb.SheetNames) === JSON.stringify(['Info', 'Rejection', 'Accepts']), dl.wb.SheetNames);
  dl = await (async () => { await p.locator('input[aria-label="Export Rejection"]').uncheck(); await p.locator('input[aria-label="Export Accepts"]').uncheck(); await p.waitForTimeout(100); return null; })();
  ok('nothing ticked -> export disabled', await p.locator('[data-testid="export-team"]').isDisabled());
  await p.locator('input[aria-label="Export Rejection"]').check();
  dl = await download(() => p.click('[data-testid="export-all"]'));
  ok('all-teams workbook: Info + 9 sheets named Team - Table', dl.wb.SheetNames.length === 10 && dl.wb.SheetNames.includes('Sales B - Leads') && dl.wb.SheetNames.includes('Support - Rejection'), dl.wb.SheetNames);
  ok('...with the whole 108 rows listed in Info', dl.rows('Info').slice(4).reduce((n, x) => n + Number(x[4]), 0) === 36 * 3 + 24, dl.rows('Info').slice(4).reduce((n, x) => n + Number(x[4]), 0));

  // ============ branch / team admins ============
  await as(p, 'ba.cairo'); await open(p, '/export');
  dl = await download(() => p.click('[data-testid="export-all"]'));
  ok('branch admin: all-teams export covers only Cairo teams', dl.wb.SheetNames.length === 7 && !dl.wb.SheetNames.some(n => /Support/.test(n)), dl.wb.SheetNames);
  await open(p, '/tables/' + idRejSup); ok('branch admin: other branch tables closed', (await p.locator('[data-testid="table-missing"]').count()) === 1);
  await as(p, 'ba.alex'); await open(p, '/export');
  ok('branch admin Alexandria: one team, no export-all', (await p.locator('[data-testid="export-all"]').count()) === 0 && /Support/.test(await p.locator('[data-testid="export-scope"]').innerText()));
  dl = await download(() => p.click('[data-testid="export-team"]')); ok('...and exports just Support', dl.wb.SheetNames.length === 4 && /^Support-/.test(dl.name), dl.name);
  await as(p, 'ta.salesb'); await open(p, '/export');
  ok('team admin: own team only', /Sales B/.test(await p.locator('[data-testid="export-scope"]').innerText()) && (await p.locator('[data-testid="export-all"]').count()) === 0);
  await open(p, '/tables/' + idRejA); ok('team admin: other team table closed', (await p.locator('[data-testid="table-missing"]').count()) === 1);

  // ============ super agent / agents ============
  await as(p, 'sa.salesa');
  ok('super agent: no Export Data in the sidebar', !(await nav()).includes('Export Data'));
  await open(p, '/export'); ok('super agent: /export closed', (await p.locator('[data-testid="no-access"]').count()) === 1);
  await open(p, '/tables/' + idRejA); ok('super agent: no export or import button', (await p.locator('[data-testid="export-table"], button:has-text("Import Excel")').count()) === 0);
  ok('super agent sees every column incl. contact phone', (await headersOf()).some(h => h.startsWith('contact phone')));
  await open(p, '/tables/' + idLeadsA);
  await p.locator('input[aria-label="Select row"]').nth(0).check(); await p.locator('input[aria-label="Select row"]').nth(1).check();
  await p.selectOption('select[aria-label="Transfer to table"]', { label: 'Accepts' });
  await p.locator('[aria-label="Bulk edit"] button:has-text("Transfer")').first().click(); await p.locator('[aria-label="Bulk edit"] button:has-text("Confirm transfer")').click();
  await p.waitForSelector('text=Transferred to Accepts');
  await open(p, '/tables/' + idAccA); m = await rowsText(); ok('super agent transfer: Accepts 8 -> 10', m && m[2] === '10', m && m[0]);

  await as(p, 'nour'); await open(p, '/tables/' + idRejA);
  m = await rowsText(); ok('agent sees ALL 24 rows of her team', m && m[2] === '24');
  let hs = await headersOf();
  ok('nour: contact phone visible (own override: read)', hs.some(h => h.startsWith('contact phone')));
  await (await cell(p, 1, 'Contact phone')).click(); ok('nour: phone is read-only', (await p.locator('tbody input[type="text"]').count()) === 0);
  await (await cell(p, 1, 'Feedback')).click(); ok('nour: Feedback editable (own override)', (await (await cell(p, 1, 'Feedback')).locator('select').count()) === 1);
  await p.keyboard.press('Escape');
  ok('nour: no export / import', (await p.locator('[data-testid="export-table"], button:has-text("Import Excel")').count()) === 0);
  await as(p, 'sara'); await open(p, '/tables/' + idRejA); hs = await headersOf();
  ok('sara: contact phone hidden by the Sales A team default', !hs.some(h => h.startsWith('contact phone')) && hs.some(h => h.startsWith('name')));
  await (await cell(p, 1, 'Feedback')).click(); ok('sara: Feedback read-only', (await p.locator('tbody select').count()) === 0);
  await editText(p, 1, 'Agent notes', 'sara note'); ok('sara: Agent notes editable', (await (await cell(p, 1, 'Agent notes')).innerText()).trim() === 'sara note');
  await open(p, '/tables/' + idRejSup); ok('sara cannot open Support tables', (await p.locator('[data-testid="table-missing"]').count()) === 1);
  await as(p, 'emad'); await p.locator('.nav-header:has-text("Data")').first().click(); await p.waitForTimeout(200);
  const idLeadsB = await (async () => { await as(p, 'director'); return tableId('Sales B', 'Leads'); })(); const idRejB = (await tableHref(p, 'Rejection')).split('/').pop();
  await as(p, 'emad'); await open(p, '/tables/' + idLeadsB);
  ok('emad: Sales B Leads table is hidden from agents', (await p.locator('[data-testid="table-missing"]').count()) === 1);
  await open(p, '/tables/' + idRejB); await (await cell(p, 1, 'Feedback')).click();
  ok('emad: Rejection Feedback editable by team default', (await (await cell(p, 1, 'Feedback')).locator('select').count()) === 1);
  await as(p, 'mona'); await open(p, '/tables/' + idRejSup); await (await cell(p, 1, 'Feedback')).click(); await (await cell(p, 1, 'Agent notes')).click();
  ok('mona (Support): everything read-only', (await p.locator('tbody select, tbody input[type="text"]').count()) === 0);
  await open(p, '/users/permissions'); ok('agents never reach the permissions page', (await p.locator('[data-testid="no-access"]').count()) === 1);

  // ============ team deletion is blocked by data ============
  await as(p, 'director'); await open(p, '/users/all');
  for (const u of ['ta.salesb', 'emad']) { await p.click(`button[aria-label="Delete ${u}"]`); await p.click('button:has-text("Delete user")'); await p.waitForFunction((u) => !document.querySelector(`[data-testid="row-${u}"]`), u); }
  await open(p, '/teams/all'); await p.click('button[aria-label="Delete Sales B"]'); await p.click('button:has-text("Delete team")');
  await p.waitForSelector('[role="dialog"] [role="alert"]');
  ok('empty of people but full of data: team deletion refused', /still has tables with rows/.test(await p.locator('[role="dialog"]').innerText()), await p.locator('[role="dialog"]').innerText());

  // ============ persistence ============
  await p.keyboard.press('Escape'); await p.reload(); await settle(p);
  await open(p, '/tables/' + idAccA); m = await rowsText(); ok('everything survives a reload', m && m[2] === '10');

  ok('no console/page errors', errors.length === 0, errors.slice(0, 5));
  console.log(`\n${pass} passed, ${fail} failed`); await browser.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.log('SCRIPT ERROR', e.message.split('\n').slice(0, 6).join('\n')); process.exit(1); });
