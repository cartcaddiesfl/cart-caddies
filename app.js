/* Cart Caddies — pricing & profit app
 * data lives in Supabase table cc_records (one row per record), synced live across devices.
 * a local copy is cached so the app opens instantly and works offline.
 */
(() => {
'use strict';

// ---------- config ----------
const SUPABASE_URL = 'https://tdhciptagygdtcxjloru.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkaGNpcHRhZ3lnZHRjeGpsb3J1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM2MzE1NTIsImV4cCI6MjEwOTIwNzU1Mn0.VD9t5V4aty22NNwICETOAcaaZBb-I4e0-pVtYKWAsRs';
const DEMO = /[?&]demo\b/.test(location.search) || !window.supabase;

// ---------- helpers ----------
const $ = id => document.getElementById(id);
const clone = o => JSON.parse(JSON.stringify(o));
const rid = p => p + '-' + Math.random().toString(36).slice(2, 9);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n, d = 0) => (n < 0 ? '-$' : '$') + Math.abs(+n || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const pct = n => (isFinite(n) ? (n * 100).toFixed(1) : '0.0') + '%';
const qty = n => (Math.round(n * 10) / 10).toLocaleString('en-US');
const num = v => { const x = parseFloat(v); return isNaN(x) ? 0 : x; };
const today = () => new Date().toISOString().slice(0, 10);
const toast = msg => { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2000); };

// ---------- starter data ----------
// [id, name, group, type, unit, pack size, pack price, store] — prices are estimates
const LIB = [
  ['mm-reg', 'Marshmallows, regular', "Marshmallows & s'mores", 'product', 'pcs', 240, 9.48, "Sam's Club"],
  ['mm-jumbo', 'Marshmallows, jumbo', "Marshmallows & s'mores", 'product', 'pcs', 96, 10.99, "BJ's"],
  ['mm-mini', 'Mini marshmallows', "Marshmallows & s'mores", 'product', 'oz', 40, 6.98, "Sam's Club"],
  ['mm-flavor', 'Flavored marshmallows', "Marshmallows & s'mores", 'product', 'pcs', 30, 3.99, "BJ's"],
  ['graham', 'Graham crackers', "Marshmallows & s'mores", 'product', 'sheets', 81, 9.98, "Sam's Club"],
  ['graham-crumbs', 'Graham cracker crumbs', "Marshmallows & s'mores", 'product', 'oz', 13.5, 3.49, 'Publix'],
  ['hershey', "Hershey's milk chocolate bars (1.55 oz)", 'Chocolate & candy', 'product', 'bars', 36, 36.98, "Sam's Club"],
  ['reeses', "Reese's peanut butter cups (minis)", 'Chocolate & candy', 'product', 'pcs', 105, 14.98, "Sam's Club"],
  ['ghirardelli', 'Ghirardelli chocolate squares', 'Chocolate & candy', 'product', 'pcs', 65, 14.98, "Sam's Club"],
  ['mms', "M&M's", 'Chocolate & candy', 'product', 'oz', 62, 17.98, "Sam's Club"],
  ['gummy', 'Gummy bears', 'Chocolate & candy', 'product', 'oz', 80, 14.98, "Sam's Club"],
  ['candy-mix', 'Assorted candy mix', 'Chocolate & candy', 'product', 'oz', 80, 22.98, "Sam's Club"],
  ['sour', 'Sour candy (belts / worms)', 'Chocolate & candy', 'product', 'oz', 48, 12.99, "BJ's"],
  ['biscoff', 'Biscoff cookies (wrapped)', 'Cookies & crumbs', 'product', 'pcs', 100, 13.98, "Sam's Club"],
  ['biscoff-spread', 'Biscoff cookie butter', 'Cookies & crumbs', 'product', 'oz', 28.2, 9.99, "BJ's"],
  ['oreo', 'Oreo cookies', 'Cookies & crumbs', 'product', 'pcs', 84, 10.48, "Sam's Club"],
  ['oreo-crumbs', 'Oreo cookie crumbs', 'Cookies & crumbs', 'product', 'oz', 15, 6.99, 'Amazon'],
  ['chips-ahoy', 'Chips Ahoy cookies', 'Cookies & crumbs', 'product', 'pcs', 72, 8.98, "Sam's Club"],
  ['nutella', 'Nutella', 'Sauces & spreads', 'product', 'oz', 35.2, 9.98, "Sam's Club"],
  ['choc-syrup', "Hershey's chocolate syrup", 'Sauces & spreads', 'product', 'oz', 72, 8.98, "Sam's Club"],
  ['caramel', 'Caramel sauce', 'Sauces & spreads', 'product', 'oz', 64, 9.98, "BJ's"],
  ['pb', 'Peanut butter', 'Sauces & spreads', 'product', 'oz', 80, 9.48, "Sam's Club"],
  ['sprinkles', 'Rainbow sprinkles', 'Toppings & fruit', 'product', 'oz', 24, 7.49, 'Amazon'],
  ['whipped', 'Whipped cream (aerosol)', 'Toppings & fruit', 'product', 'cans', 2, 7.98, "Sam's Club"],
  ['strawberries', 'Fresh strawberries', 'Toppings & fruit', 'product', 'oz', 32, 5.98, "Sam's Club"],
  ['grapes', 'Grapes', 'Toppings & fruit', 'product', 'oz', 48, 6.48, "Sam's Club"],
  ['cocoa', 'Hot cocoa mix packets', 'Drinks & dairy', 'product', 'packets', 60, 12.98, "Sam's Club"],
  ['milk', 'Whole milk (2 gal)', 'Drinks & dairy', 'product', 'oz', 256, 7.38, "Sam's Club"],
  ['lemonade', 'Lemonade (2 × 89 oz)', 'Drinks & dairy', 'product', 'oz', 178, 8.98, "Sam's Club"],
  ['water', 'Bottled water (40 pk)', 'Drinks & dairy', 'product', 'bottles', 40, 4.98, "BJ's"],
  ['ice', 'Ice (20 lb bag)', 'Drinks & dairy', 'supply', 'lb', 20, 3.99, 'Publix'],
  ['kernels', 'Popcorn kernels', 'Popcorn & cotton candy', 'product', 'oz', 400, 24.98, "Sam's Club"],
  ['coconut-oil', 'Coconut popping oil', 'Popcorn & cotton candy', 'product', 'oz', 128, 21.99, 'Amazon'],
  ['flavacol', 'Popcorn salt (Flavacol)', 'Popcorn & cotton candy', 'product', 'oz', 35, 6.99, 'Amazon'],
  ['floss', 'Cotton candy floss sugar', 'Popcorn & cotton candy', 'product', 'oz', 52, 15.99, 'Amazon'],
  ['cheese', 'Cheese, assorted cubes', 'Charcuterie', 'product', 'oz', 40, 11.98, "Sam's Club"],
  ['salami', 'Salami / cured meats', 'Charcuterie', 'product', 'oz', 32, 12.98, "Sam's Club"],
  ['crackers', 'Crackers assortment', 'Charcuterie', 'product', 'pcs', 180, 11.98, "Sam's Club"],
  ['cups-9', 'Clear cups 9 oz', 'Serveware & supplies', 'supply', 'pcs', 240, 13.98, "Sam's Club"],
  ['cups-hot', 'Hot cups 12 oz', 'Serveware & supplies', 'supply', 'pcs', 100, 15.98, "Sam's Club"],
  ['lids-hot', 'Hot cup lids', 'Serveware & supplies', 'supply', 'pcs', 100, 7.98, "Sam's Club"],
  ['cones-cc', 'Cotton candy cones', 'Serveware & supplies', 'supply', 'pcs', 100, 9.99, 'Amazon'],
  ['popcorn-bags', 'Popcorn bags', 'Serveware & supplies', 'supply', 'pcs', 100, 11.99, 'Amazon'],
  ['charc-cones', 'Charcuterie cones / cups', 'Serveware & supplies', 'supply', 'pcs', 50, 15.99, 'Amazon'],
  ['treat-bags', 'Treat bags & ties', 'Serveware & supplies', 'supply', 'pcs', 100, 8.99, 'Amazon'],
  ['plates', 'Dessert plates', 'Serveware & supplies', 'supply', 'pcs', 300, 13.98, "Sam's Club"],
  ['napkins', 'Beverage napkins', 'Serveware & supplies', 'supply', 'pcs', 500, 9.98, "Sam's Club"],
  ['skewers', 'Roasting sticks (bamboo)', 'Serveware & supplies', 'supply', 'pcs', 100, 12.99, 'Amazon'],
  ['picks', 'Cocktail picks', 'Serveware & supplies', 'supply', 'pcs', 300, 7.99, 'Amazon'],
  ['straws', 'Straws', 'Serveware & supplies', 'supply', 'pcs', 500, 6.98, "Sam's Club"],
  ['stirrers', 'Stir sticks', 'Serveware & supplies', 'supply', 'pcs', 1000, 5.98, "Sam's Club"],
  ['sterno', 'Chafing fuel cans', 'Serveware & supplies', 'supply', 'cans', 12, 24.98, "Sam's Club"],
  ['gloves', 'Food-safe gloves', 'Serveware & supplies', 'supply', 'pcs', 200, 15.98, "Sam's Club"],
  ['scoops', 'Scoops & tongs', 'Serveware & supplies', 'supply', 'pcs', 12, 8.99, 'Amazon'],
  ['labels', 'Labels / tags', 'Serveware & supplies', 'supply', 'pcs', 120, 7.99, 'Amazon'],
];
const STORES = ["Sam's Club", "BJ's", 'Publix', 'Costco', 'Walmart', 'Restaurant Depot', 'Amazon', 'Other'];
const UNITS = ['pcs', 'oz', 'lb', 'sheets', 'bars', 'cans', 'packets', 'bottles', 'servings', 'gal'];

const I = (ing, per, basis = 'guest') => ({ ing, per, basis });
const TEMPLATES = [
  ['smores', "S'mores cart", "S'mores", [I('mm-reg', 2), I('graham', 1), I('hershey', 0.17), I('skewers', 1.5), I('plates', 1), I('napkins', 1.5), I('sterno', 1, 'hour')]],
  ['biscoff-smores', "Biscoff s'mores cart", "Biscoff s'mores", [I('mm-jumbo', 1.5), I('biscoff', 2), I('biscoff-spread', 0.3), I('skewers', 1.5), I('napkins', 1.5), I('sterno', 1, 'hour')]],
  ['cottoncandy', 'Cotton candy cart', 'Cotton candy', [I('floss', 1), I('cones-cc', 1.1), I('treat-bags', 0.3), I('napkins', 1)]],
  ['popcorn', 'Popcorn cart', 'Popcorn', [I('kernels', 1.5), I('coconut-oil', 0.5), I('flavacol', 0.05), I('popcorn-bags', 1.1), I('napkins', 1)]],
  ['hotchocolate', 'Hot chocolate cart', 'Hot chocolate', [I('cocoa', 1), I('milk', 8), I('mm-mini', 0.3), I('whipped', 0.04), I('oreo-crumbs', 0.2), I('sprinkles', 0.1), I('cups-hot', 1.1), I('lids-hot', 1.1), I('stirrers', 1), I('napkins', 1)]],
  ['candy', 'Candy cart', 'Candy', [I('candy-mix', 3), I('gummy', 1), I('treat-bags', 1.1), I('scoops', 6, 'event'), I('labels', 1)]],
  ['charcuterie', 'Charcuterie cart', 'Charcuterie', [I('cheese', 2), I('salami', 2), I('crackers', 4), I('grapes', 1.5), I('charc-cones', 1), I('picks', 2), I('napkins', 1)]],
  ['lemonade', 'Lemonade & beverage cart', 'Beverage', [I('lemonade', 10), I('strawberries', 0.5), I('ice', 0.5), I('cups-9', 1.6), I('straws', 1.6), I('napkins', 1)]],
];

const SETTINGS0 = {
  f: { bizName: 'Cart Caddies', bizContact: '', mMin: 20, mTarget: 35, mPremium: 50, minBooking: 350, roundTo: '25', tax: 7, procFee: 3,
    guestsPerAtt: 150, eventsPerMonth: 6, ownerRate: 25, attRate: 20, mileRate: 0.7, freeMiles: 0, rushPct: 15, holidayFee: 75,
    depType: 'flat', depValue: 100, priceBy: 'used', balanceDays: 7, validDays: 7, closing: "Let me know if you have any questions — I can't wait to celebrate with you!" },
  overhead: [{ name: 'Insurance', amt: 85 }, { name: 'Cart / vehicle payment', amt: 150 }, { name: 'Storage', amt: 75 }, { name: 'Software & booking tools', amt: 40 }, { name: 'Marketing', amt: 100 }],
  decor: [{ name: 'Signage & decor', cost: 15 }, { name: 'Cart & equipment wear', cost: 25 }],
  addons: [{ name: 'Custom signage', cost: 15, price: 50 }, { name: 'Extra hour of service', cost: 40, price: 125 }, { name: 'Premium toppings bar', cost: 35, price: 95 }],
};
const DRAFT_F0 = { client: '', date: '', eventType: 'Wedding', venue: '', guests: 100, participation: 100, hours: 3, style: 'standard', level: 'attended', budget: '',
  overage: 10, prepHrs: 2, setupHrs: 1, breakdownHrs: 0.5, driveHrs: 1, attendants: '', attHours: '', miles: 30, tolls: 0, rushOn: false, holidayOn: false,
  customPrice: '', showIncluded: true, extraIncluded: '', payMethod: 'card' };
const STYLE = { light: 0.75, standard: 1, generous: 1.25 };
const STYLE_LABEL = { light: 'Light portions', standard: 'Standard portions', generous: 'Generous portions' };

// ---------- state ----------
let state = { settings: null, draft: null, library: {}, templates: {}, events: {} };
let SB = null, UID = null, EMAIL = '';
const dirty = new Set();

function seedState() {
  const library = {};
  LIB.forEach(([id, name, group, cat, unit, pack, price, store]) => library[id] = { id, name, group, cat, unit, pack, price, store, est: true, checked: '' });
  const templates = {};
  TEMPLATES.forEach(([id, name, service, items], i) => templates[id] = { id, name, service, items, order: i });
  const settings = clone(SETTINGS0);
  return { settings, library, templates, events: {}, draft: newDraft(settings, templates.smores) };
}
function newDraft(settings, tpl) {
  return { f: clone(DRAFT_F0), templateId: tpl ? tpl.id : '', items: tpl ? clone(tpl.items) : [], decor: clone(settings.decor),
    addons: settings.addons.map(a => ({ ...a, on: false })), tier: 'target', custom: false, eventId: null };
}
function normalize(s) {
  const base = seedState();
  s.settings = s.settings || base.settings;
  s.settings.f = Object.assign({}, SETTINGS0.f, s.settings.f || {});
  ['overhead', 'decor', 'addons'].forEach(k => { if (!Array.isArray(s.settings[k])) s.settings[k] = clone(SETTINGS0[k]); });
  s.library = s.library || {}; s.templates = s.templates || {}; s.events = s.events || {};
  if (!s.draft) s.draft = newDraft(s.settings, Object.values(s.templates)[0]);
  s.draft.f = Object.assign({}, DRAFT_F0, s.draft.f || {});
  ['items', 'decor', 'addons'].forEach(k => { if (!Array.isArray(s.draft[k])) s.draft[k] = []; });
  return s;
}

// ---------- local cache ----------
const cacheKey = () => 'cc.v3.' + (DEMO ? 'demo' : UID);
function saveCache() { try { localStorage.setItem(cacheKey(), JSON.stringify({ state, dirty: [...dirty] })); } catch {} }
function loadCache() {
  try { const c = JSON.parse(localStorage.getItem(cacheKey()) || 'null'); if (c && c.state) { state = normalize(c.state); (c.dirty || []).forEach(k => dirty.add(k)); return true; } } catch {}
  return false;
}

// ---------- sync ----------
function setSync(s) {
  const el = $('sync'); el.className = 'sync ' + s;
  $('syncText').textContent = { ok: 'Synced', saving: 'Saving', pending: 'Saving', error: 'Retrying', offline: 'Offline', demo: 'Demo' }[s] || s;
}
function recordFor(kind, id) {
  if (kind === 'settings') return state.settings;
  if (kind === 'draft') return state.draft;
  if (kind === 'ingredient') return state.library[id];
  if (kind === 'template') return state.templates[id];
  if (kind === 'event') return state.events[id];
}
function setRecord(s, kind, id, data) {
  if (kind === 'settings') s.settings = data;
  else if (kind === 'draft') s.draft = data;
  else { const m = { ingredient: 'library', template: 'templates', event: 'events' }[kind]; if (!m) return; if (data) s[m][id] = data; else delete s[m][id]; }
}
let flushTimer = null;
function markDirty(kind, id = 'main') {
  if (kind === 'draft') id = 'current';
  dirty.add(kind + '|' + id); saveCache();
  if (DEMO) return;
  setSync('pending'); clearTimeout(flushTimer); flushTimer = setTimeout(flush, 700);
}
async function flush() {
  if (DEMO || !SB || !UID) return;
  if (!navigator.onLine) { setSync('offline'); return; }
  const keys = [...dirty]; if (!keys.length) { setSync('ok'); return; }
  keys.forEach(k => dirty.delete(k));
  const now = new Date().toISOString(), ups = [], dels = [];
  for (const k of keys) { const [kind, id] = k.split('|'); const rec = recordFor(kind, id); if (rec) ups.push({ user_id: UID, kind, id, data: rec, updated_at: now }); else dels.push({ kind, id }); }
  setSync('saving');
  try {
    if (ups.length) { const { error } = await SB.from('cc_records').upsert(ups); if (error) throw error; }
    for (const d of dels) { const { error } = await SB.from('cc_records').delete().match(d); if (error) throw error; }
    saveCache();
    if (dirty.size) { clearTimeout(flushTimer); flushTimer = setTimeout(flush, 700); setSync('pending'); } else setSync('ok');
  } catch (e) {
    console.warn('sync failed', e);
    keys.forEach(k => dirty.add(k)); saveCache(); setSync(navigator.onLine ? 'error' : 'offline');
    clearTimeout(flushTimer); flushTimer = setTimeout(flush, 8000);
  }
}
function markAllDirty() {
  markDirty('settings'); markDirty('draft');
  Object.keys(state.library).forEach(id => markDirty('ingredient', id));
  Object.keys(state.templates).forEach(id => markDirty('template', id));
  Object.keys(state.events).forEach(id => markDirty('event', id));
}
async function pull() {
  const { data, error } = await SB.from('cc_records').select('kind,id,data');
  if (error) throw error;
  if (!data.length) {
    // first time on this account: upload what's here (cache or starter data)
    if (!state.settings) state = seedState();
    markAllDirty(); return;
  }
  const next = { settings: null, draft: null, library: {}, templates: {}, events: {} };
  data.forEach(r => setRecord(next, r.kind, r.id, r.data));
  for (const k of dirty) { const [kind, id] = k.split('|'); setRecord(next, kind, id, recordFor(kind, id) || null); }
  state = normalize(next); saveCache();
}
let realtime = null, renderTimer = null;
function subscribe() {
  if (realtime) SB.removeChannel(realtime);
  realtime = SB.channel('cc-' + UID)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'cc_records' }, p => {
      const row = p.eventType === 'DELETE' ? p.old : p.new;
      if (!row || !row.kind || (row.user_id && row.user_id !== UID)) return;
      const key = row.kind + '|' + row.id;
      if (dirty.has(key)) return;
      const cur = recordFor(row.kind, row.id);
      if (p.eventType === 'DELETE') { if (!cur) return; setRecord(state, row.kind, row.id, null); }
      else { if (JSON.stringify(cur) === JSON.stringify(row.data)) return; setRecord(state, row.kind, row.id, row.data); }
      state = normalize(state); saveCache();
      clearTimeout(renderTimer); renderTimer = setTimeout(() => { renderAll(); toast('Updated from another device'); }, 150);
    })
    .subscribe();
}
async function refresh() {
  if (DEMO || !SB || !UID || !navigator.onLine) return;
  try { await flush(); await pull(); renderAll(); setSync(dirty.size ? 'pending' : 'ok'); } catch (e) { console.warn(e); setSync('error'); }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refresh(); });
window.addEventListener('online', () => refresh());
window.addEventListener('offline', () => setSync('offline'));

// ---------- dialogs ----------
function openSheet({ title, body, buttons = [] }) {
  $('sheetTitle').textContent = title; $('sheetBody').innerHTML = body; const foot = $('sheetFoot'); foot.innerHTML = '';
  buttons.forEach(b => {
    if (b.spacer) { const s = document.createElement('span'); s.className = 'grow'; foot.appendChild(s); return; }
    const el = document.createElement('button'); el.className = 'btn ' + (b.cls || ''); el.textContent = b.label; el.type = 'button';
    el.onclick = () => b.onClick ? b.onClick() : closeSheet(); foot.appendChild(el);
  });
  $('sheet').hidden = false;
  const first = $('sheetBody').querySelector('input, select, textarea'); if (first && matchMedia('(min-width: 700px)').matches) first.focus();
  return $('sheetBody');
}
function closeSheet() { $('sheet').hidden = true; $('sheetBody').innerHTML = ''; if (closeSheet.after) { const f = closeSheet.after; closeSheet.after = null; f(); } }
$('sheetClose').onclick = closeSheet;
$('sheet').addEventListener('click', e => { if (e.target === $('sheet')) closeSheet(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('sheet').hidden) closeSheet(); });
const ask = (msg, yes = 'OK', no = 'Cancel', danger = false) => new Promise(res => {
  closeSheet.after = () => res(false);
  openSheet({ title: msg, body: '', buttons: [{ label: no, onClick: () => closeSheet() }, { label: yes, cls: danger ? 'danger' : 'primary', onClick: () => { closeSheet.after = null; closeSheet(); res(true); } }] });
});
const askText = (title, value = '', yes = 'Save') => new Promise(res => {
  closeSheet.after = () => res(null);
  openSheet({ title, body: `<input id="askInput" value="${esc(value)}">`, buttons: [{ label: 'Cancel' }, { label: yes, cls: 'primary', onClick: () => { const v = $('askInput').value.trim(); closeSheet.after = null; closeSheet(); res(v || null); } }] });
  setTimeout(() => $('askInput')?.focus(), 30);
});

// ---------- navigation ----------
function showView(v) {
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.view === v));
  document.querySelectorAll('.view').forEach(s => s.classList.toggle('active', s.id === 'view-' + v));
  try { localStorage.setItem('cc.view', v); } catch {}
  window.scrollTo(0, 0);
}
function showStep(s) {
  if (!$('step-' + s)) s = s === 'budget' ? 'pricing' : 'event';
  showView('quote');
  document.querySelectorAll('#steps button').forEach(b => b.classList.toggle('active', b.dataset.step === s));
  document.querySelectorAll('.step').forEach(el => el.classList.toggle('active', el.id === 'step-' + s));
  document.querySelector(`#steps [data-step="${s}"]`)?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  try { localStorage.setItem('cc.step', s); } catch {}
  window.scrollTo(0, 0);
}
$('tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) showView(b.dataset.view); });
$('steps').addEventListener('click', e => { const b = e.target.closest('button'); if (b) showStep(b.dataset.step); });
document.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) showStep(b.dataset.go); });

// ---------- field binding ----------
const D = () => state.draft, S = () => state.settings;
const F = k => (k in D().f ? D().f[k] : S().f[k]);
const n = k => num(F(k));
const blank = k => String(F(k) ?? '').trim() === '';
function bindFields() {
  document.querySelectorAll('[data-f],[data-s]').forEach(el => {
    const isDraft = !!el.dataset.f, key = el.dataset.f || el.dataset.s;
    const ev = el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'input';
    el.addEventListener(ev, () => {
      const v = el.type === 'checkbox' ? el.checked : el.value;
      if (isDraft) { D().f[key] = v; markDirty('draft'); } else { S().f[key] = v; markDirty('settings'); }
      document.querySelectorAll(`[data-${isDraft ? 'f' : 's'}="${key}"]`).forEach(o => { if (o !== el) { if (o.type === 'checkbox') o.checked = !!v; else o.value = v; } });
      if (key === 'customPrice' && String(v).trim() !== '') D().custom = true;
      update();
    });
  });
}
function applyFields() {
  document.querySelectorAll('[data-f],[data-s]').forEach(el => {
    if (el === document.activeElement) return;
    const v = el.dataset.f ? D().f[el.dataset.f] : S().f[el.dataset.s];
    if (el.type === 'checkbox') el.checked = !!v; else el.value = v ?? '';
  });
}

// ---------- ingredient helpers ----------
const groups = () => [...new Set(Object.values(state.library).map(i => i.group || 'Other'))].sort();
function ingOptions(sel) {
  const byG = {};
  Object.values(state.library).forEach(i => (byG[i.group || 'Other'] ||= []).push(i));
  let h = sel && !state.library[sel] ? `<option value="${esc(sel)}" selected>(deleted ingredient)</option>` : (!sel ? '<option value="" selected disabled>Choose ingredient…</option>' : '');
  Object.keys(byG).sort().forEach(g => {
    h += `<optgroup label="${esc(g)}">` + byG[g].sort((a, b) => a.name.localeCompare(b.name)).map(i => `<option value="${esc(i.id)}" ${i.id === sel ? 'selected' : ''}>${esc(i.name)}</option>`).join('') + '</optgroup>';
  });
  return h + '<option value="__new">+ New ingredient…</option>';
}
const unitPrice = i => (i && i.pack > 0 ? i.price / i.pack : 0);

// item list editor, shared by the quote and cart templates
function itemsEditor(container, getArr, onChange, withCalc) {
  const render = () => {
    const arr = getArr();
    container.innerHTML = arr.length ? arr.map((it, i) => {
      const ing = state.library[it.ing];
      return `<div class="item" data-i="${i}">
        <div class="r1"><select data-k="ing" aria-label="Ingredient">${ingOptions(it.ing)}</select><button class="x" data-del="${i}" aria-label="Remove">✕</button></div>
        <div class="r2"><input data-k="per" type="number" inputmode="decimal" min="0" step="0.05" value="${esc(it.per)}" aria-label="Amount">
          <span>${esc(ing?.unit || '')} per</span>
          <select data-k="basis" aria-label="Per"><option value="guest" ${it.basis === 'guest' ? 'selected' : ''}>guest</option><option value="hour" ${it.basis === 'hour' ? 'selected' : ''}>hour</option><option value="event" ${it.basis === 'event' ? 'selected' : ''}>event</option></select>
          ${ing?.est ? '<span class="est">est. price</span>' : ''}</div>
        <div class="calc" data-calc="${i}">${withCalc ? '' : ing ? `<span>${esc(ing.pack)} ${esc(ing.unit)} for ${money(ing.price, 2)} · ${esc(ing.store || '')}</span><b>${money(unitPrice(ing) * it.per, 2)} / ${it.basis}</b>` : ''}</div>
      </div>`;
    }).join('') : '<div class="empty">No ingredients yet. Tap “+ Add ingredient”.</div>';
  };
  container.addEventListener('change', async e => {
    const t = e.target, card = t.closest('.item'); if (!card) return;
    const it = getArr()[+card.dataset.i];
    if (t.dataset.k === 'ing') {
      if (t.value === '__new') { const id = await editIngredient(null); if (id) it.ing = id; render(); onChange(); return; }
      it.ing = t.value; render(); onChange();
    } else if (t.dataset.k === 'basis') { it.basis = t.value; onChange(); render(); }
  });
  container.addEventListener('input', e => { const t = e.target; if (t.dataset.k !== 'per') return; getArr()[+t.closest('.item').dataset.i].per = num(t.value); onChange(); });
  container.addEventListener('click', e => { const d = e.target.closest('[data-del]'); if (!d) return; getArr().splice(+d.dataset.del, 1); render(); onChange(); });
  return render;
}

// simple row editors (overhead, decor, add-ons)
function miniEditor(container, getArr, cols, onChange, header) {
  const render = () => {
    const arr = getArr();
    container.innerHTML = (header && arr.length ? `<div class="mr ${cols.length === 4 ? 'three' : cols.length === 3 ? 'tri' : ''} mh">${header.map(h => `<span>${h}</span>`).join('')}</div>` : '') + arr.map((r, i) => `<div class="mr ${cols.length === 4 ? 'three' : cols.length === 3 ? 'tri' : ''}">` + cols.map(c => {
      if (c.type === 'check') return `<input type="checkbox" data-i="${i}" data-k="${c.k}" ${r[c.k] ? 'checked' : ''} aria-label="Include">`;
      if (c.type === 'text') return `<input data-i="${i}" data-k="${c.k}" value="${esc(r[c.k])}" aria-label="${c.k}">`;
      return `<span class="money"><input data-i="${i}" data-k="${c.k}" type="number" inputmode="decimal" min="0" value="${esc(r[c.k])}" aria-label="${c.k}"></span>`;
    }).join('') + `<button class="x" data-del="${i}" aria-label="Remove">✕</button></div>`).join('');
  };
  const edit = e => { const t = e.target; if (t.dataset.i === undefined) return; const c = cols.find(x => x.k === t.dataset.k); getArr()[+t.dataset.i][c.k] = c.type === 'check' ? t.checked : c.type === 'text' ? t.value : num(t.value); onChange(); };
  container.addEventListener('input', edit);
  container.addEventListener('change', e => { if (e.target.type === 'checkbox') edit(e); });
  container.addEventListener('click', e => { const d = e.target.closest('[data-del]'); if (d) { getArr().splice(+d.dataset.del, 1); render(); onChange(); } });
  return render;
}

const draftChanged = () => { markDirty('draft'); update(); };
const settingsChanged = () => { markDirty('settings'); update(); };
const renderDraftItems = itemsEditor($('draftItems'), () => D().items, draftChanged, true);
const renderDecor = miniEditor($('decorRows'), () => D().decor, [{ k: 'name', type: 'text' }, { k: 'cost', type: 'money' }], draftChanged);
const renderAddons = miniEditor($('addonRows'), () => D().addons, [{ k: 'on', type: 'check' }, { k: 'name', type: 'text' }, { k: 'cost', type: 'money' }, { k: 'price', type: 'money' }], draftChanged, ['', 'Upgrade', 'Your cost', 'Client', '']);
const renderOh = miniEditor($('ohRows'), () => S().overhead, [{ k: 'name', type: 'text' }, { k: 'amt', type: 'money' }], settingsChanged);
const renderDefAddons = miniEditor($('defAddonRows'), () => S().addons, [{ k: 'name', type: 'text' }, { k: 'cost', type: 'money' }, { k: 'price', type: 'money' }], settingsChanged);
const renderDefDecor = miniEditor($('defDecorRows'), () => S().decor, [{ k: 'name', type: 'text' }, { k: 'cost', type: 'money' }], settingsChanged);

$('addDraftItem').onclick = () => { D().items.push({ ing: '', per: 1, basis: 'guest' }); renderDraftItems(); draftChanged(); setTimeout(() => $('draftItems').lastElementChild?.querySelector('select')?.focus(), 30); };
$('addDecor').onclick = () => { D().decor.push({ name: '', cost: 0 }); renderDecor(); draftChanged(); };
$('addAddon').onclick = () => { D().addons.push({ on: true, name: '', cost: 0, price: 0 }); renderAddons(); draftChanged(); };
$('addOh').onclick = () => { S().overhead.push({ name: '', amt: 0 }); renderOh(); settingsChanged(); };
$('addDefAddon').onclick = () => { S().addons.push({ name: '', cost: 0, price: 0 }); renderDefAddons(); settingsChanged(); };
$('addDefDecor').onclick = () => { S().decor.push({ name: '', cost: 0 }); renderDefDecor(); settingsChanged(); };

// ---------- core math ----------
const overheadTotal = () => S().overhead.reduce((s, o) => s + num(o.amt), 0);
const roundUp = v => { const r = num(S().f.roundTo) || 1; return Math.ceil(v / r - 1e-9) * r; };

function calc(o = {}) {
  const d = D();
  const guests = o.guests ?? n('guests');
  const hours = o.hours ?? n('hours');
  const level = o.level ?? d.f.level;
  const style = o.style ?? d.f.style;
  const served = guests * n('participation') / 100;
  const over = 1 + n('overage') / 100;
  const byPacks = S().f.priceBy === 'packs';

  const list = d.items.map(it => {
    const ing = state.library[it.ing];
    if (!ing) return { ...it, ing: null, need: 0, packs: 0, cost: 0 };
    const mult = ing.cat === 'product' ? STYLE[style] || 1 : 1;
    const base = it.basis === 'guest' ? served * num(it.per) * mult : it.basis === 'hour' ? hours * num(it.per) * mult : num(it.per);
    const need = base > 0 ? base * over : 0;
    const packs = ing.pack > 0 ? Math.ceil(need / ing.pack - 1e-9) : 0;
    const usedCost = need * unitPrice(ing), packCost = packs * num(ing.price);
    return { ...it, lib: ing, need, packs, usedCost, packCost, cost: byPacks ? packCost : usedCost };
  });
  const shopping = list.reduce((s, i) => s + i.cost, 0);
  const shoppingTrip = list.reduce((s, i) => s + (i.packCost || 0), 0);
  const decor = d.decor.reduce((s, x) => s + num(x.cost), 0);

  const ownerHrs = n('prepHrs') + n('setupHrs') + (level === 'dropoff' ? 0 : hours) + n('breakdownHrs') + n('driveHrs');
  const laborValue = ownerHrs * n('ownerRate');
  const autoAtt = level === 'dropoff' ? 0 : Math.max(0, Math.ceil(guests / Math.max(1, n('guestsPerAtt'))) - 1) + (level === 'full' ? 1 : 0);
  const att = blank('attendants') ? autoAtt : n('attendants');
  const attHrs = blank('attHours') ? n('setupHrs') + hours + n('breakdownHrs') : n('attHours');
  const staff = att * attHrs * n('attRate');
  const travel = Math.max(0, n('miles') - n('freeMiles')) * n('mileRate') + n('tolls');
  const overhead = overheadTotal() / Math.max(1, n('eventsPerMonth'));
  const addons = o.noAddons ? [] : d.addons.filter(a => a.on);
  const addonCost = addons.reduce((s, a) => s + num(a.cost), 0);
  const addonPrice = addons.reduce((s, a) => s + num(a.price), 0);

  const baseCost = shopping + decor + laborValue + staff + travel + overhead;
  const totalCost = baseCost + addonCost;
  const card = d.f.payMethod !== 'cash';
  const fee = card ? n('procFee') / 100 : 0, taxR = n('tax') / 100;
  const out = base => {
    const rush = d.f.rushOn ? base * n('rushPct') / 100 : 0;
    const holiday = d.f.holidayOn ? n('holidayFee') : 0;
    const subtotal = base + rush + holiday + addonPrice;
    const processing = subtotal * (1 + taxR) * fee; // processors charge on the full total, tax included
    const profit = subtotal - totalCost - processing;
    return { base, rush, holiday, subtotal, processing, profit, margin: subtotal > 0 ? profit / subtotal : 0, tax: subtotal * taxR, total: subtotal * (1 + taxR) };
  };
  const tierBase = m => Math.max(n('minBooking'), roundUp(baseCost / Math.max(0.05, 1 - m - fee * (1 + taxR))));
  const tiers = {};
  [['min', 'Minimum', 'mMin'], ['target', 'Target', 'mTarget'], ['premium', 'Premium', 'mPremium']].forEach(([k, name, mk]) => { const m = n(mk) / 100; tiers[k] = { key: k, name, m, mk, ...out(tierBase(m)) }; });
  const custom = blank('customPrice') ? null : { key: 'custom', name: 'Custom', ...out(n('customPrice')) };
  const sel = d.custom && custom ? custom : tiers[d.tier] || tiers.target;
  return { guests, served, hours, level, style, list, shopping, shoppingTrip, byPacks, card, decor, ownerHrs, laborValue, att, autoAtt, attHrs, staff, travel, overhead, addons, addonCost, addonPrice, baseCost, totalCost, fee, taxR, tiers, custom, sel };
}

// ---------- render: quote ----------
const COSTS = [['shopping', 'Product & supplies', 'var(--champagne)'], ['decor', 'Decor & equipment', 'var(--gilt)'], ['laborValue', 'Your labor value', 'var(--rose)'],
  ['staff', 'Attendant pay', '#b98a83'], ['travel', 'Travel', '#8c7a5c'], ['addonCost', 'Add-on costs', '#d9c6a0'], ['overhead', 'Overhead share', '#6f665a']];

function update() {
  const r = calc(), d = D(), s = r.sel, g = r.guests;
  const tpl = state.templates[d.templateId];

  // strip
  $('sCost').textContent = money(r.totalCost + s.processing);
  $('sPriceK').textContent = s.key === 'custom' ? 'Your price' : s.name;
  $('sPrice').textContent = money(s.total);
  $('sProfit').textContent = money(s.profit);
  $('sMargin').textContent = pct(s.margin);
  const cls = s.profit < 0 ? 'bad' : s.margin < n('mMin') / 100 - 0.0005 ? 'warn' : 'good';
  $('sProfitBox').className = 'stat ' + cls; $('sMarginBox').className = 'stat ' + cls;

  // event
  $('cartPick').innerHTML = Object.values(state.templates).sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || a.name.localeCompare(b.name)).map(t => `<option value="${esc(t.id)}" ${t.id === d.templateId ? 'selected' : ''}>${esc(t.name)}</option>`).join('') + `<option value="" ${!tpl ? 'selected' : ''}>Custom (no template)</option>`;
  const ev = d.eventId && state.events[d.eventId];
  $('loadedNote').textContent = ev ? `Editing saved event: ${ev.client || 'unnamed'} · ${ev.status}` : 'Start here when an inquiry comes in.';
  $('glance').innerHTML = [['Cart', tpl ? tpl.name : 'Custom'], ['Guests served', `${qty(r.served)} of ${g}`], ['Your hours, all in', r.ownerHrs.toFixed(1)]]
    .map(([k, v]) => `<span class="m">${k}</span><span class="n">${esc(v)}</span>`).join('');

  // shopping
  $('shopCart').textContent = tpl ? tpl.name : 'Custom cart';
  $('updateCart').hidden = !tpl;
  r.list.forEach((it, i) => {
    const el = document.querySelector(`#draftItems [data-calc="${i}"]`); if (!el) return;
    el.innerHTML = it.lib ? `<span>use ${qty(it.need)} ${esc(it.lib.unit)} · buy ${it.packs} × ${qty(it.lib.pack)} (${money(it.packCost, 2)})</span><b>${money(it.cost, 2)}</b>` : '<span>Choose an ingredient</span>';
  });
  $('shopTotal').textContent = money(r.shopping, 2);
  $('shopTotalK').textContent = r.byPacks ? 'Product cost (whole packs)' : 'Product cost this event';
  $('shopHint').textContent = r.byPacks ? 'Each event pays for every pack you buy. Change this in Settings.' : 'Each event pays for what it uses (plus the buffer). Leftovers carry to your next event.';
  const left = r.shoppingTrip - r.list.reduce((s, i) => s + (i.usedCost || 0), 0);
  const tr = d.trip;
  $('shopTrip').innerHTML = `<span class="m">Shopping trip (whole packs)</span><span class="n">${money(r.shoppingTrip, 2)}</span>` +
    (left > 0.005 ? `<span class="m">Left over for next time</span><span class="n">${money(left, 2)}</span>` : '') +
    (tr ? `<span class="m">${tr.done ? 'Actually spent' : 'Trip in progress'} · ${esc(tr.date || '')}</span><span class="n">${money(tripSpent(tr), 2)}</span>` : '');
  $('startTrip').textContent = tr && !tr.done ? 'Continue trip' : 'Shopping trip';
  $('shopPerGuest').textContent = g > 0 ? `${money(r.shopping / g, 2)} / guest` : '';
  const byStore = {};
  r.list.filter(i => i.packs > 0).forEach(i => (byStore[i.lib.store || 'Other'] ||= []).push(i));
  $('shopText').value = `${tpl ? tpl.name : 'Cart'} · ${g} guests · ${d.f.date || 'date TBD'}\n` + Object.keys(byStore).sort().map(st =>
    `\n${st.toUpperCase()}\n` + byStore[st].map(i => `[ ] ${i.lib.name} — ${i.packs} × ${qty(i.lib.pack)} ${i.lib.unit}`).join('\n')).join('\n') + `\n\nEstimated total: ${money(r.shoppingTrip, 2)}`;

  // costs
  $('serviceView').value = r.level === 'dropoff' ? '0 (drop-off)' : r.hours;
  $('ownerNote').textContent = `${+r.ownerHrs.toFixed(2)} hrs × ${money(n('ownerRate'))} = ${money(r.laborValue)} labor value`;
  document.querySelector('[data-f="attendants"]').placeholder = `auto (${r.autoAtt})`;
  document.querySelector('[data-f="attHours"]').placeholder = `auto (${n('setupHrs') + r.hours + n('breakdownHrs')})`;
  $('attNote').textContent = r.att > 0 ? `${r.att} × ${r.attHrs} hrs × ${money(n('attRate'))} = ${money(r.staff)}` : 'No extra attendants for this event.';

  // tiers
  if (!$('tiers').children.length) {
    $('tiers').innerHTML = Object.values(r.tiers).map(t => `<div class="tier" role="button" tabindex="0" data-tier="${t.key}">${t.key === 'target' ? '<span class="badge">Recommended</span>' : ''}
      <div class="nm">${t.name}</div><div class="pr" id="tp-${t.key}"></div>
      <div class="mt">margin <input type="number" inputmode="decimal" min="0" max="90" data-s="${t.mk}" aria-label="${t.name} margin">%</div>
      <div class="pf" id="tpp-${t.key}"></div></div>`).join('');
    $('tiers').querySelectorAll('[data-s]').forEach(el => el.addEventListener('input', () => { S().f[el.dataset.s] = el.value; document.querySelectorAll(`[data-s="${el.dataset.s}"]`).forEach(o => { if (o !== el) o.value = el.value; }); markDirty('settings'); update(); }));
    applyFields();
  }
  Object.values(r.tiers).forEach(t => {
    $('tp-' + t.key).textContent = money(t.total);
    $('tpp-' + t.key).textContent = `profit ${money(t.profit)} · ${pct(t.margin)}`;
    $('tpp-' + t.key).style.color = t.profit < 0 ? 'var(--bad)' : 'var(--good)';
    document.querySelector(`.tier[data-tier="${t.key}"]`).classList.toggle('sel', s.key === t.key);
  });
  $('useCustom').checked = s.key === 'custom';
  let note = '';
  if (s.key === 'custom') {
    note = s.profit < 0 ? `<div class="note bad">You lose ${money(-s.profit)} at this price. Your minimum quote is ${money(r.tiers.min.total)}.</div>`
      : s.margin < r.tiers.min.m ? `<div class="note warn">Below your ${pct(r.tiers.min.m)} minimum margin. Your minimum quote is ${money(r.tiers.min.total)}.</div>`
      : `<div class="note good">Your price covers every cost with a ${pct(s.margin)} margin.</div>`;
  } else if (r.tiers.min.base === n('minBooking')) note = `<div class="note info">Your ${money(n('minBooking'))} minimum booking applies to at least one option.</div>`;
  note += `<div class="note info">Prices include ${r.taxR > 0 ? +(r.taxR * 100).toFixed(2) + '% sales tax' : 'no sales tax'} and ${r.card ? `a ${n('procFee')}% card fee on the full total` : 'no card fee (cash, Zelle or check)'}.</div>`;
  $('pricingNote').innerHTML = note;

  const parts = COSTS.map(([k, l, c]) => ({ l, c, v: r[k] })).concat([{ l: 'Card fee', c: '#4a433d', v: s.processing }]).filter(p => p.v > 0.005);
  const den = Math.max(1, s.subtotal, r.totalCost + s.processing);
  $('bar').innerHTML = parts.map(p => `<div style="width:${p.v / den * 100}%;background:${p.c}"></div>`).join('') + (s.profit > 0 ? `<div style="width:${s.profit / den * 100}%;background:var(--good)"></div>` : '');
  $('costLines').innerHTML = parts.map(p => `<span><span class="sw" style="background:${p.c}"></span>${p.l}${p.l === 'Your labor value' ? ` <span class="m">(${r.ownerHrs.toFixed(1)} hrs)</span>` : p.l === 'Product & supplies' ? ` <span class="m">(${r.byPacks ? 'whole packs' : 'used'})</span>` : ''}</span><span class="n">${money(p.v, 2)}</span>`).join('') +
    `<span class="t">Total event cost</span><span class="n t">${money(r.totalCost + s.processing, 2)}</span>` +
    `<span><span class="sw" style="background:var(--good)"></span>Projected profit</span><span class="n" style="font-weight:700;color:${s.profit < 0 ? 'var(--bad)' : 'var(--good)'}">${money(s.profit, 2)}</span>`;
  $('clientLines').innerHTML = [['Event price', s.base], s.rush ? ['Rush booking fee', s.rush] : null, s.holiday ? ['Holiday date fee', s.holiday] : null,
    ...r.addons.map(a => [a.name || 'Add-on', num(a.price)]), s.tax ? ['Sales tax', s.tax] : null].filter(Boolean)
    .map(([k, v]) => `<span>${esc(k)}</span><span class="n">${money(v, 2)}</span>`).join('') +
    `<span class="t">Final client quote</span><span class="n t">${money(s.total, 2)}</span>` +
    (r.staff ? `<span class="m">· attendant (included)</span><span class="n m">${money(r.staff)}</span>` : '') + (r.travel ? `<span class="m">· travel (included)</span><span class="n m">${money(r.travel)}</span>` : '');
  $('checks').innerHTML = [['Price per guest', g > 0 ? money(s.total / g, 2) : '—'], ['Cost per guest', g > 0 ? money(r.totalCost / g, 2) : '—'],
    ['Product cost % of price', s.subtotal > 0 ? pct(r.shopping / s.subtotal) : '—'], ['You earn per hour (labor + profit)', money(r.ownerHrs > 0 ? (s.profit + r.laborValue) / r.ownerHrs : 0, 2)]]
    .map(([k, v]) => `<span class="m">${k}</span><span class="n">${v}</span>`).join('');

  renderBudget(r);
  renderQuote(r);
  $('ohTotal').textContent = money(overheadTotal());
  $('ohPer').textContent = money(r.overhead, 2);
  saveCache();
}

function renderBudget(r) {
  const B = num(D().f.budget);
  $('budgetWrap').hidden = !(B > 0);
  if (!(B > 0)) return;
  const rows = Object.values(r.tiers).map(t => { const gap = B - t.total; return `<span>${t.name} <span class="m">${money(t.total)}</span></span><span class="n" style="color:${gap >= 0 ? 'var(--good)' : 'var(--bad)'}">${gap >= 0 ? 'fits · ' + money(gap) + ' under' : money(-gap) + ' over'}</span>`; }).join('');
  const sub = B / (1 + r.taxR), profitAt = sub - B * r.fee - r.totalCost, marginAt = sub > 0 ? profitAt / sub : 0;
  const v = profitAt < 0 ? ['bad', `At ${money(B)} you would lose ${money(-profitAt)}. Change the scope or pass on it.`]
    : marginAt < r.tiers.min.m ? ['warn', `At ${money(B)} you'd make ${money(profitAt)} (${pct(marginAt)}), below your ${pct(r.tiers.min.m)} minimum.`]
    : marginAt < r.tiers.target.m ? ['info', `At ${money(B)} you'd make ${money(profitAt)} (${pct(marginAt)}). Above your minimum, under your target.`]
    : ['good', `At ${money(B)} you'd make ${money(profitAt)} (${pct(marginAt)}). The budget works.`];
  $('budgetOut').innerHTML = `<div class="lines">${rows}</div><div class="note ${v[0]}">${v[1]}</div>`;
  const tgt = r.tiers.target.total;
  if (tgt <= B) {
    const up = D().addons.filter(a => !a.on && num(a.price) <= B - tgt);
    $('budgetIdeas').innerHTML = `<div class="note good">Your target quote fits with ${money(B - tgt)} to spare.</div>` + (up.length ? `<p class="hint" style="margin-top:12px">Upgrades that still fit:</p><div class="lines">${up.map(a => `<span>${esc(a.name)}</span><span class="n">+${money(a.price)}</span>`).join('')}</div>` : '');
    return;
  }
  const ideas = [];
  if (r.tiers.min.total <= B) ideas.push(['Quote your minimum price', 'fits, lower margin', r.tiers.min.total]);
  let best = 0; for (let gg = 1; gg < r.guests; gg++) if (calc({ guests: gg }).tiers.target.total <= B) best = gg;
  if (best > 0) ideas.push([`Lower guests to ${best}`, 'fits at target', calc({ guests: best }).tiers.target.total]);
  for (let h = r.hours - 0.5; h >= 1; h -= 0.5) { const t = calc({ hours: h }).tiers.target.total; if (t <= B || h <= 1) { ideas.push([`Shorten service to ${h} hrs`, t <= B ? 'fits' : 'still over', t]); break; } }
  if (r.style !== 'light') { const t = calc({ style: 'light' }).tiers.target.total; ideas.push(['Light portions', t <= B ? 'fits' : 'still over', t]); }
  if (r.level !== 'dropoff') { const t = calc({ level: 'dropoff' }).tiers.target.total; ideas.push(['Drop-off & setup only', t <= B ? 'fits' : 'still over', t]); }
  if (r.addons.length) { const t = calc({ noAddons: true }).tiers.target.total; ideas.push(['Remove add-ons', t <= B ? 'fits' : 'still over', t]); }
  $('budgetIdeas').innerHTML = `<div class="lines">${ideas.map(([a, b, t]) => `<span>${a} <span class="m">· ${b}</span></span><span class="n">${money(t)}</span>`).join('')}</div>`;
}

function quoteData(r) {
  const d = D(), tpl = state.templates[d.templateId], s = r.sel;
  const service = (tpl && tpl.service) || 'Custom cart';
  const date = d.f.date ? new Date(d.f.date + 'T12:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'TBD';
  const included = [`${service} service for ${r.guests} guests`, `${r.hours} hour${r.hours === 1 ? '' : 's'} of service`, STYLE_LABEL[r.style], 'Delivery and setup',
    r.level !== 'dropoff' ? (r.att > 0 ? `On-site attendants during service (${r.att + 1})` : 'On-site attendant during service') : null,
    r.level !== 'dropoff' ? 'Breakdown and cleanup' : 'Pickup after the event', ...r.addons.map(a => a.name).filter(Boolean),
    ...String(d.f.extraIncluded || '').split('\n').map(x => x.trim()).filter(Boolean)].filter(Boolean);
  const dep = Math.min(s.total, S().f.depType === 'pct' ? s.total * n('depValue') / 100 : n('depValue'));
  const lines = [['Event package', s.base]];
  if (s.rush) lines.push(['Rush booking fee', s.rush]);
  if (s.holiday) lines.push(['Holiday date fee', s.holiday]);
  r.addons.forEach(a => lines.push([a.name || 'Add-on', num(a.price)]));
  if (s.tax) lines.push([`Sales tax (${+(r.taxR * 100).toFixed(2)}%)`, s.tax]);
  const inc = [];
  if (d.f.showIncluded) { if (r.staff) inc.push([r.att > 1 ? 'Attendants' : 'Attendant', r.staff]); if (r.travel) inc.push(['Travel', r.travel]); }
  return { service, s, date, included, dep, lines, inc, biz: S().f.bizName || 'Cart Caddies', contact: S().f.bizContact };
}
function renderQuote(r) {
  const q = quoteData(r), d = D(), days = n('balanceDays');
  const bizHtml = esc(q.biz).replace(/(\S+)$/, '<em>$1</em>');
  $('quotePreview').innerHTML = `
    <div class="qb">${bizHtml}</div>
    <div class="qs">Event quote${d.f.client ? ' for ' + esc(d.f.client) : ''} · ${new Date().toLocaleDateString('en-US', { dateStyle: 'medium' })}${q.contact ? ' · ' + esc(q.contact) : ''}</div>
    <h4>Event details</h4>
    <div class="ql"><span>Service</span><span class="n">${esc(q.service)} cart</span><span>Date</span><span class="n">${esc(q.date)}</span>
      ${d.f.venue ? `<span>Location</span><span class="n">${esc(d.f.venue)}</span>` : ''}<span>Guests</span><span class="n">${r.guests}</span><span>Service time</span><span class="n">${r.hours} hours</span></div>
    <h4>What's included</h4><ul>${q.included.map(i => `<li>${esc(i)}</li>`).join('')}</ul>
    ${q.inc.length ? `<h4>Included in your total</h4><div class="ql">${q.inc.map(([k, v]) => `<span>${k}</span><span class="n">${money(v)}</span>`).join('')}</div>` : ''}
    <h4>Investment</h4>
    <div class="ql">${q.lines.length > 1 ? q.lines.map(([k, v]) => `<span>${esc(k)}</span><span class="n">${money(v, 2)}</span>`).join('') : ''}
      <span class="tt">Event total</span><span class="n tt">${money(q.s.total, 2)}</span>
      <span>Deposit to reserve your date <span style="color:#6d6253">(applied toward your total)</span></span><span class="n">${money(q.dep, 2)}</span>
      <span>Remaining balance${days ? `, due ${days} day${days === 1 ? '' : 's'} before the event` : ''}</span><span class="n">${money(q.s.total - q.dep, 2)}</span></div>
    <p style="margin-top:18px">${esc(S().f.closing)}</p>
    <p class="fine">This quote is an estimate based on the event details provided and may change if guest count, timing or services change.${n('validDays') ? ` Quote valid for ${n('validDays')} days.` : ''}</p>`;
}
function quoteText() {
  const r = calc(), q = quoteData(r), d = D(), days = n('balanceDays'), L = [];
  L.push(`${q.biz.toUpperCase()} — EVENT QUOTE${d.f.client ? ' for ' + d.f.client : ''}`, '', 'EVENT DETAILS', `Service: ${q.service} cart`, `Date: ${q.date}`);
  if (d.f.venue) L.push(`Location: ${d.f.venue}`);
  L.push(`Guests: ${r.guests}`, `Service time: ${r.hours} hours`, '', "WHAT'S INCLUDED", ...q.included.map(i => `- ${i}`), '');
  if (q.inc.length) L.push('INCLUDED IN YOUR TOTAL', ...q.inc.map(([k, v]) => `- ${k}: ${money(v)}`), '');
  L.push('INVESTMENT');
  if (q.lines.length > 1) q.lines.forEach(([k, v]) => L.push(`${k}: ${money(v, 2)}`));
  L.push(`Event total: ${money(q.s.total, 2)}`, `Deposit to reserve your date: ${money(q.dep, 2)} (applied toward your total)`,
    `Remaining balance: ${money(q.s.total - q.dep, 2)}${days ? `, due ${days} days before the event` : ''}`, '', S().f.closing, '',
    'This quote is an estimate based on the event details provided and may change if guest count, timing or services change.');
  if (q.contact) L.push('', q.contact);
  return L.join('\n');
}
async function copy(text, msg) {
  try { await navigator.clipboard.writeText(text); toast(msg); }
  catch { const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); toast(msg); } catch { toast('Copy failed'); } t.remove(); }
}
$('copyQuote').onclick = () => copy(quoteText(), 'Quote copied');
$('copyShop').onclick = () => copy($('shopText').value, 'Shopping list copied');
$('printQuote').onclick = () => window.print();
$('shareQuote').onclick = async () => {
  const text = quoteText();
  if (navigator.share) { try { await navigator.share({ title: 'Event quote', text }); } catch {} } else copy(text, 'Quote copied');
};

// tier picking
$('tiers').addEventListener('click', e => { if (e.target.matches('input')) return; const t = e.target.closest('.tier'); if (!t) return; D().tier = t.dataset.tier; D().custom = false; draftChanged(); });
$('tiers').addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('tier')) { e.preventDefault(); e.target.click(); } });
$('useCustom').addEventListener('change', e => { D().custom = e.target.checked; draftChanged(); if (e.target.checked && blank('customPrice')) document.querySelector('[data-f="customPrice"]').focus(); });

// cart pick on the event step
$('cartPick').addEventListener('change', async e => {
  const id = e.target.value, tpl = state.templates[id];
  if (D().items.length && !(await ask(`Switch to ${tpl ? tpl.name : 'a custom cart'}? This replaces the shopping list on this quote.`, 'Switch'))) { update(); return; }
  D().templateId = id; D().items = tpl ? clone(tpl.items) : []; renderDraftItems(); draftChanged();
});
$('saveAsCart').onclick = async () => {
  const name = await askText('Name this cart', (state.templates[D().templateId]?.name || 'My cart') + ' (copy)'); if (!name) return;
  const id = rid('cart'); state.templates[id] = { id, name, service: name.replace(/ cart$/i, ''), items: clone(D().items), order: 50 };
  D().templateId = id; markDirty('template', id); draftChanged(); renderCarts(); toast('Cart saved');
};
$('updateCart').onclick = async () => {
  const tpl = state.templates[D().templateId]; if (!tpl) return;
  if (!(await ask(`Replace the ${tpl.name} template with this shopping list?`, 'Update'))) return;
  tpl.items = clone(D().items); markDirty('template', tpl.id); renderCarts(); toast('Cart updated');
};

// ---------- events ----------
$('saveEvent').onclick = async () => {
  const r = calc(), d = D(), tpl = state.templates[d.templateId];
  const snap = { client: d.f.client, date: d.f.date, cart: tpl ? tpl.name : 'Custom', guests: r.guests, price: r.sel.total, cost: r.totalCost + r.sel.processing, profit: r.sel.profit, margin: r.sel.margin, savedAt: new Date().toISOString() };
  let id = d.eventId;
  if (id && state.events[id] && !(await ask('Update the saved event, or save this as a new one?', 'Update', 'Save as new'))) id = null;
  if (!id || !state.events[id]) { id = rid('ev'); state.events[id] = { id, status: 'quoted', ...snap }; } else Object.assign(state.events[id], snap);
  state.events[id].draft = clone({ ...d, eventId: id });
  d.eventId = id; markDirty('event', id); draftChanged(); renderEvents(); toast('Event saved');
};
$('newEvent').onclick = async () => {
  if (!(await ask('Start a new event? The current quote clears. Saved events, carts and settings stay.', 'Start new'))) return;
  const tpl = state.templates[D().templateId] || Object.values(state.templates)[0];
  state.draft = newDraft(S(), tpl); markDirty('draft'); renderAll(); showStep('event');
};
function renderEvents() {
  const ev = Object.values(state.events), won = ev.filter(e => e.status === 'booked' || e.status === 'paid');
  const profOf = e => e.actuals ? num(e.actuals.profit) : num(e.profit);
  const rev = won.reduce((s, e) => s + num(e.price), 0), prof = won.reduce((s, e) => s + profOf(e), 0);
  $('evRevenue').textContent = money(rev); $('evProfit').textContent = money(prof);
  const checked = ev.filter(e => e.actuals);
  $('evMarginK').textContent = checked.length ? `Actual margin (${checked.length})` : 'Avg margin';
  const cSub = checked.reduce((s, e) => s + num(e.actuals.subtotal), 0);
  $('evMargin').textContent = checked.length ? (cSub > 0 ? pct(checked.reduce((s, e) => s + num(e.actuals.profit), 0) / cSub) : '—') : rev > 0 ? pct(prof / rev) : '—'; $('evOpen').textContent = ev.filter(e => e.status === 'quoted').length;
  $('evList').innerHTML = ev.length ? ev.sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(e => `
    <button class="li" data-ev="${esc(e.id)}"><div class="main"><div class="t1">${esc(e.client || 'Unnamed client')}</div>
      <div class="t2">${esc(e.date || 'no date')} · ${esc(e.cart)} · ${e.guests} guests</div></div>
      <span class="chip ${esc(e.status)}">${esc(e.status)}</span>
      <div class="rt">${money(e.price)}<small>${e.actuals ? `actual ${money(e.actuals.profit)} · ${pct(e.actuals.margin)}` : `est. ${money(e.profit)} · ${pct(e.margin)}`}</small></div></button>`).join('')
    : '<div class="empty">No saved events yet. Build a quote and tap Save on the event step.</div>';
}
$('evList').addEventListener('click', e => {
  const b = e.target.closest('[data-ev]'); if (!b) return;
  const ev = state.events[b.dataset.ev];
  openSheet({ title: ev.client || 'Unnamed client', body: `
    <div class="lines"><span class="m">Date</span><span class="n">${esc(ev.date || '—')}</span><span class="m">Cart</span><span class="n">${esc(ev.cart)}</span>
    <span class="m">Guests</span><span class="n">${ev.guests}</span><span class="m">Quote</span><span class="n">${money(ev.price, 2)}</span>
    <span class="m">Estimated profit</span><span class="n">${money(ev.profit, 2)} · ${pct(ev.margin)}</span>
    ${ev.actuals ? `<span class="m">Actual profit</span><span class="n" style="color:${ev.actuals.profit < 0 ? 'var(--bad)' : 'var(--good)'}">${money(ev.actuals.profit, 2)} · ${pct(ev.actuals.margin)}</span>` : ''}</div>
    <label class="f" style="margin-top:16px">Status<select id="evStatus">${['quoted', 'booked', 'paid', 'lost'].map(s => `<option ${s === ev.status ? 'selected' : ''}>${s}</option>`).join('')}</select></label>`,
    buttons: [{ label: 'Delete', cls: 'danger', onClick: async () => { closeSheet(); if (await ask('Delete this saved event?', 'Delete', 'Cancel', true)) { delete state.events[ev.id]; if (D().eventId === ev.id) { D().eventId = null; markDirty('draft'); } markDirty('event', ev.id); renderEvents(); update(); } } },
      { spacer: true },
      { label: ev.actuals ? 'Edit after-event check' : 'After-event check', onClick: () => { closeSheet(); openActuals(ev.id); } },
      { label: 'Open quote', onClick: () => { closeSheet(); if (ev.draft) { state.draft = normalize({ ...state, draft: clone(ev.draft) }).draft; state.draft.eventId = ev.id; markDirty('draft'); renderAll(); } showStep('pricing'); } },
      { label: 'Save', cls: 'primary', onClick: () => { ev.status = $('evStatus').value; markDirty('event', ev.id); closeSheet(); renderEvents(); } }] });
});
$('copyCsv').onclick = () => {
  const rows = [['date', 'client', 'cart', 'guests', 'quote', 'cost', 'profit', 'margin', 'status']].concat(Object.values(state.events).map(e => [e.date, e.client, e.cart, e.guests, num(e.price).toFixed(2), num(e.cost).toFixed(2), num(e.profit).toFixed(2), (num(e.margin) * 100).toFixed(1) + '%', e.status]));
  copy(rows.map(r => r.map(c => String(c ?? '').replace(/[\t\n]/g, ' ')).join('\t')).join('\n'), 'Copied — paste into Google Sheets or Excel');
};

// ---------- shopping trip ----------
const tripSpent = tr => (tr?.items || []).filter(i => i.got).reduce((s, i) => s + num(i.packs) * num(i.price), 0);
function openTrip() {
  const d = D(), r = calc();
  const planned = r.list.filter(i => i.lib && i.packs > 0).map(i => ({ ing: i.ing, packs: i.packs, price: num(i.lib.price), got: false }));
  if (!d.trip || d.trip.done) d.trip = { date: today(), items: planned, done: false };
  else planned.forEach(p => { if (!d.trip.items.some(x => x.ing === p.ing)) d.trip.items.push(p); });
  markDirty('draft');
  const tr = d.trip, plannedTotal = planned.reduce((s, i) => s + i.packs * i.price, 0);
  const rows = () => {
    const byStore = {};
    tr.items.forEach((it, i) => { const lib = state.library[it.ing]; if (lib) (byStore[lib.store || 'Other'] ||= []).push([it, i, lib]); });
    return Object.keys(byStore).sort().map(st => `<div class="group-h">${esc(st)}</div>` + byStore[st].map(([it, i, lib]) => `
      <div class="trip-row ${it.got ? 'got' : ''}" data-t="${i}">
        <input type="checkbox" data-tk="got" ${it.got ? 'checked' : ''} aria-label="Got it">
        <div><div class="tn">${esc(lib.name)}</div><div class="tm">${qty(lib.pack)} ${esc(lib.unit)} per pack${lib.est ? ' · est. price' : ''}</div></div>
        <div class="tf"><input data-tk="packs" type="number" inputmode="numeric" min="0" value="${esc(it.packs)}" aria-label="Packs"> packs ×
          <span class="money"><input data-tk="price" type="number" inputmode="decimal" min="0" step="0.01" value="${esc(it.price)}" aria-label="Price per pack"></span>
          <b data-tt="${i}" style="color:var(--text)">${money(num(it.packs) * num(it.price), 2)}</b></div>
      </div>`).join('')).join('') || '<div class="empty">Nothing to buy — add ingredients to the shopping list first.</div>';
  };
  const sum = () => { const got = tr.items.filter(i => i.got).length; $('tripSum').innerHTML = `<div class="lines"><span class="m">Checked off</span><span class="n">${got} of ${tr.items.length}</span><span class="m">Spent so far</span><span class="n">${money(tripSpent(tr), 2)}</span><span class="m">Planned</span><span class="n">${money(plannedTotal, 2)}</span></div>`; };
  const body = openSheet({ title: 'Shopping trip', body: `<div class="trip-sum" id="tripSum"></div><p class="hint" style="margin-top:10px">Tick items as they go in the cart. Change the price if the shelf price is different — it updates your ingredient list when you finish.</p><div id="tripRows">${rows()}</div>`,
    buttons: [{ label: 'Close' }, { spacer: true }, { label: 'Finish trip', cls: 'primary', onClick: finish }] });
  sum();
  let t = null;
  body.addEventListener('input', e => {
    const row = e.target.closest('[data-t]'); if (!row) return;
    const it = tr.items[+row.dataset.t], k = e.target.dataset.tk;
    if (k === 'got') { it.got = e.target.checked; row.classList.toggle('got', it.got); } else it[k] = num(e.target.value);
    body.querySelector(`[data-tt="${row.dataset.t}"]`).textContent = money(num(it.packs) * num(it.price), 2);
    sum(); clearTimeout(t); t = setTimeout(() => { markDirty('draft'); update(); }, 400);
  });
  function finish() {
    let changed = 0;
    tr.items.filter(i => i.got).forEach(i => {
      const lib = state.library[i.ing]; if (!lib) return;
      if (Math.abs(num(lib.price) - num(i.price)) > 0.004) { lib.price = num(i.price); changed++; }
      lib.est = false; lib.checked = today(); markDirty('ingredient', lib.id);
    });
    tr.done = true; tr.spent = tripSpent(tr); tr.date = today();
    if (d.eventId && state.events[d.eventId]) { state.events[d.eventId].trip = clone(tr); markDirty('event', d.eventId); }
    markDirty('draft'); closeSheet(); renderAll();
    toast(`Trip saved · ${money(tr.spent, 2)} spent${changed ? ` · ${changed} price${changed > 1 ? 's' : ''} updated` : ''}`);
  }
}
$('startTrip').onclick = openTrip;

// ---------- after-event check ----------
function calcFor(draft, o) { const keep = state.draft; state.draft = normalize({ ...state, draft: clone(draft) }).draft; try { return calc(o); } finally { state.draft = keep; } }
function openActuals(evId) {
  const ev = state.events[evId]; if (!ev || !ev.draft) { toast('This event has no saved quote to compare'); return; }
  const dr = ev.draft, r = calcFor(dr), trip = ev.trip || (dr.trip && dr.trip.done ? dr.trip : null);
  const a = clone(ev.actuals || {});
  const subtotal = num(ev.price) / (1 + r.taxR);
  const lines = r.list.filter(i => i.lib).map((i, k) => {
    const tItem = trip && trip.items.find(x => x.ing === i.ing);
    const bought = (tItem ? num(tItem.packs) : i.packs) * num(i.lib.pack);
    return { k, ing: i.ing, lib: i.lib, basis: i.basis, per: num(i.per), planUse: i.need, bought, left: a.left?.[i.ing] ?? '' };
  });
  const v = {
    guests: a.guests ?? r.guests, served: a.served ?? n0(dr.f.participation, 100),
    spend: a.spend ?? (trip ? tripSpent(trip) : r.shoppingTrip), hours: a.hours ?? +r.ownerHrs.toFixed(2),
    staff: a.staff ?? +r.staff.toFixed(2), travel: a.travel ?? +r.travel.toFixed(2), other: a.other ?? 0, notes: a.notes ?? '',
  };
  function n0(x, d) { const y = parseFloat(x); return isNaN(y) ? d : y; }
  const body = openSheet({ title: `After-event check · ${ev.client || 'event'}`, body: `
    <p class="hint">Fill this in after the event. It compares your quote with what really happened and suggests better amounts for next time.</p>
    <div class="fields">
      <label class="f">Actual guests<input data-a="guests" type="number" inputmode="numeric" min="0" value="${esc(v.guests)}"></label>
      <label class="f">Guests served<span class="pct"><input data-a="served" type="number" inputmode="numeric" min="0" max="100" value="${esc(v.served)}"></span></label>
    </div>
    <div class="eyebrow" style="margin-top:18px">What's left over</div>
    <p class="hint">Count what came home. Leave blank to skip an item.</p>
    <div id="leftRows">${lines.map(l => `<div class="left-row" data-l="${l.k}"><div style="font-weight:600">${esc(l.lib.name)}</div>
      <div class="lr">bought ${qty(l.bought)} ${esc(l.lib.unit)} · left over <input data-left="${l.k}" type="number" inputmode="decimal" min="0" value="${esc(l.left)}" aria-label="Left over"> ${esc(l.lib.unit)}</div>
      <div class="sug" id="sug${l.k}"></div></div>`).join('')}</div>
    <div class="eyebrow" style="margin-top:18px">Actual costs</div>
    <div class="fields" style="margin-top:8px">
      <label class="f">Spent on product<span class="money"><input data-a="spend" type="number" inputmode="decimal" min="0" value="${esc(+num(v.spend).toFixed(2))}"></span></label>
      <label class="f">Your hours, all in<input data-a="hours" type="number" inputmode="decimal" min="0" step="0.25" value="${esc(v.hours)}"></label>
      <label class="f">Attendant pay<span class="money"><input data-a="staff" type="number" inputmode="decimal" min="0" value="${esc(v.staff)}"></span></label>
      <label class="f">Travel<span class="money"><input data-a="travel" type="number" inputmode="decimal" min="0" value="${esc(v.travel)}"></span></label>
      <label class="f">Other costs<span class="money"><input data-a="other" type="number" inputmode="decimal" min="0" value="${esc(v.other)}"></span></label>
    </div>
    <label class="f" style="margin-top:12px">Notes<textarea data-a="notes" placeholder="e.g. rain, kids came back for seconds">${esc(v.notes)}</textarea></label>
    <div class="eyebrow" style="margin-top:18px">Quote vs actual</div>
    <div class="cmp" id="cmp" style="margin-top:8px"></div>
    <div id="sugNote"></div>`,
    buttons: [{ label: 'Cancel' }, { spacer: true }, { label: 'Update cart amounts', onClick: applySug }, { label: 'Save', cls: 'primary', onClick: saveA }] });

  let result = null;
  function compute() {
    const g = num(v.guests), served = g * num(v.served) / 100;
    const sugs = []; let usedCost = 0, counted = 0;
    lines.forEach(l => {
      const el = body.querySelector('#sug' + l.k);
      if (String(l.left).trim() === '') { el.innerHTML = '<span class="m">not counted</span>'; usedCost += l.planUse * unitPrice(l.lib); return; }
      counted++;
      const used = Math.max(0, l.bought - num(l.left)); usedCost += used * unitPrice(l.lib);
      const mult = l.lib.cat === 'product' ? (STYLE[dr.f.style] || 1) : 1;
      const base = l.basis === 'guest' ? served * mult : l.basis === 'hour' ? num(dr.f.hours) * mult : 1;
      const actualPer = base > 0 ? used / base : 0;
      const diff = l.per > 0 ? (actualPer - l.per) / l.per : 0;
      const color = Math.abs(diff) < 0.1 ? 'var(--good)' : 'var(--warn)';
      el.innerHTML = `used ${qty(used)} ${esc(l.lib.unit)} (planned ${qty(l.planUse)}) · <span style="color:${color}">${+actualPer.toFixed(2)} per ${l.basis} vs ${l.per} planned</span>`;
      if (l.basis !== 'event' && Math.abs(diff) >= 0.1) sugs.push({ ing: l.ing, name: l.lib.name, from: l.per, to: Math.round(actualPer * 100) / 100, basis: l.basis });
    });
    const productCost = r.byPacks ? num(v.spend) : usedCost;
    const cost = productCost + r.decor + num(v.hours) * n('ownerRate') + num(v.staff) + num(v.travel) + r.overhead + r.addonCost + num(v.other) + r.sel.processing;
    const profit = subtotal - cost, margin = subtotal > 0 ? profit / subtotal : 0;
    const estCost = num(ev.cost);
    body.querySelector('#cmp').innerHTML = `<span class="h"></span><span class="h n">Quote</span><span class="h n">Actual</span>
      <span>Event cost</span><span class="n">${money(estCost)}</span><span class="n">${money(cost)}</span>
      <span>Product spend</span><span class="n">${money(r.shoppingTrip)}</span><span class="n">${money(v.spend)}</span>
      <span>Profit</span><span class="n">${money(ev.profit)}</span><span class="n" style="font-weight:700;color:${profit < 0 ? 'var(--bad)' : 'var(--good)'}">${money(profit)}</span>
      <span>Margin</span><span class="n">${pct(ev.margin)}</span><span class="n">${pct(margin)}</span>`;
    const tpl = state.templates[dr.templateId];
    body.querySelector('#sugNote').innerHTML = sugs.length
      ? `<div class="note warn">${sugs.length} amount${sugs.length > 1 ? 's were' : ' was'} off by 10% or more: ${sugs.map(x => `${esc(x.name)} ${x.from} → ${x.to}`).join(', ')}. ${tpl ? `Tap <b>Update cart amounts</b> to use these in ${esc(tpl.name)}.` : ''}</div>`
      : counted ? '<div class="note good">Your per-guest amounts were within 10%. Nothing to change.</div>' : '';
    result = { profit, margin, cost, sugs, subtotal };
  }
  body.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.a) v[t.dataset.a] = t.dataset.a === 'notes' ? t.value : t.value;
    if (t.dataset.left !== undefined) lines[+t.dataset.left].left = t.value;
    compute();
  });
  compute();
  function saveA() {
    ev.actuals = { ...v, left: Object.fromEntries(lines.filter(l => String(l.left).trim() !== '').map(l => [l.ing, num(l.left)])),
      profit: result.profit, margin: result.margin, cost: result.cost, subtotal: result.subtotal, checked: today() };
    markDirty('event', ev.id); closeSheet(); renderEvents(); toast('After-event check saved');
  }
  async function applySug() {
    const tpl = state.templates[dr.templateId];
    if (!tpl) { toast('This event used a custom list, so there is no cart to update'); return; }
    if (!result.sugs.length) { toast('Nothing to update — enter leftovers first'); return; }
    const sugs = result.sugs; saveA();
    if (!(await ask(`Update ${tpl.name}? ${sugs.map(x => `${x.name}: ${x.from} → ${x.to} per ${x.basis}`).join(' · ')}`, 'Update cart'))) return;
    sugs.forEach(x => tpl.items.filter(i => i.ing === x.ing && i.basis === x.basis).forEach(i => i.per = x.to));
    markDirty('template', tpl.id); renderAll(); toast(`${tpl.name} updated`);
  }
}

// ---------- library ----------
function renderLibrary() {
  const q = $('libSearch').value.trim().toLowerCase();
  const items = Object.values(state.library).filter(i => !q || (i.name + ' ' + i.group + ' ' + i.store).toLowerCase().includes(q));
  const byG = {}; items.forEach(i => (byG[i.group || 'Other'] ||= []).push(i));
  $('libList').innerHTML = Object.keys(byG).sort().map(g => `<div class="group-h">${esc(g)}</div><div class="list">` + byG[g].sort((a, b) => a.name.localeCompare(b.name)).map(i => `
    <button class="li" data-ing="${esc(i.id)}"><div class="main"><div class="t1">${esc(i.name)}</div>
      <div class="t2">${qty(i.pack)} ${esc(i.unit)} · ${esc(i.store || '—')}${i.checked ? ' · checked ' + esc(i.checked) : ''}</div></div>
      ${i.est ? '<span class="chip est">est.</span>' : ''}<div class="rt">${money(i.price, 2)}<small>${money(unitPrice(i), 3)} / ${esc(i.unit)}</small></div></button>`).join('') + '</div>').join('')
    || '<div class="empty">No ingredients match.</div>';
}
$('libSearch').addEventListener('input', renderLibrary);
$('libList').addEventListener('click', e => { const b = e.target.closest('[data-ing]'); if (b) editIngredient(b.dataset.ing); });
$('newIng').onclick = () => editIngredient(null);

function editIngredient(id) {
  return new Promise(res => {
    const i = id ? state.library[id] : { name: '', group: '', cat: 'product', unit: 'pcs', pack: 1, price: 0, store: "Sam's Club" };
    closeSheet.after = () => res(null);
    openSheet({ title: id ? 'Edit ingredient' : 'New ingredient', body: `
      <div class="fields">
        <label class="f" style="grid-column:1/-1">Name<input id="ingName" value="${esc(i.name)}" placeholder="e.g. Biscoff cookies"></label>
        <label class="f">Group<input id="ingGroup" list="groupList" value="${esc(i.group)}" placeholder="e.g. Cookies & crumbs"></label>
        <label class="f">Type<select id="ingCat"><option value="product" ${i.cat === 'product' ? 'selected' : ''}>Product (scales with portions)</option><option value="supply" ${i.cat === 'supply' ? 'selected' : ''}>Supply (cups, napkins…)</option></select></label>
        <label class="f">Unit<input id="ingUnit" list="unitList" value="${esc(i.unit)}"></label>
        <label class="f">Units per pack<input id="ingPack" type="number" inputmode="decimal" min="0" value="${esc(i.pack)}"></label>
        <label class="f">Pack price<span class="money"><input id="ingPrice" type="number" inputmode="decimal" min="0" step="0.01" value="${esc(i.price)}"></span></label>
        <label class="f">Store<select id="ingStore">${STORES.map(s => `<option ${s === i.store ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
      </div>
      <datalist id="groupList">${groups().map(g => `<option value="${esc(g)}">`).join('')}</datalist>
      <datalist id="unitList">${UNITS.map(u => `<option value="${u}">`).join('')}</datalist>
      <p class="hint" id="ingPer" style="margin-top:12px"></p>
      ${id && i.est ? '<p class="hint">This price is an estimate. Saving a new price marks it as checked today.</p>' : ''}`,
      buttons: [
        ...(id ? [{ label: 'Delete', cls: 'danger', onClick: async () => {
          const used = Object.values(state.templates).filter(t => t.items.some(x => x.ing === id)).map(t => t.name);
          closeSheet();
          if (!(await ask(used.length ? `Delete ${i.name}? It's used in: ${used.join(', ')}.` : `Delete ${i.name}?`, 'Delete', 'Cancel', true))) { res(null); return; }
          delete state.library[id]; markDirty('ingredient', id); renderAll(); res(null);
        } }] : []),
        { spacer: true }, { label: 'Cancel' },
        { label: 'Save', cls: 'primary', onClick: () => {
          const name = $('ingName').value.trim(); if (!name) { $('ingName').focus(); return; }
          const nid = id || rid('ing');
          const price = num($('ingPrice').value), pack = num($('ingPack').value);
          const changed = !id || price !== num(i.price) || pack !== num(i.pack);
          state.library[nid] = { ...i, id: nid, name, group: $('ingGroup').value.trim() || 'Other', cat: $('ingCat').value, unit: $('ingUnit').value.trim() || 'pcs', pack, price, store: $('ingStore').value,
            est: changed ? false : i.est, checked: changed ? today() : i.checked };
          markDirty('ingredient', nid); closeSheet.after = null; closeSheet(); renderAll(); toast(id ? 'Price updated everywhere' : 'Ingredient added'); res(nid);
        } }] });
    const per = () => { const p = num($('ingPrice').value), k = num($('ingPack').value); $('ingPer').textContent = k > 0 ? `= ${money(p / k, 3)} per ${$('ingUnit').value || 'unit'}` : ''; };
    ['ingPrice', 'ingPack', 'ingUnit'].forEach(x => $(x).addEventListener('input', per)); per();
  });
}

// ---------- carts (templates) ----------
function templateCost(t, guests = 100) {
  return t.items.reduce((s, it) => { const ing = state.library[it.ing]; if (!ing) return s; const q = it.basis === 'guest' ? guests * num(it.per) : it.basis === 'hour' ? 3 * num(it.per) : num(it.per); return s + q * unitPrice(ing); }, 0);
}
function renderCarts() {
  const ts = Object.values(state.templates).sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || a.name.localeCompare(b.name));
  $('cartList').innerHTML = ts.length ? ts.map(t => `<button class="li" data-cart="${esc(t.id)}"><div class="main"><div class="t1">${esc(t.name)}</div>
    <div class="t2">${t.items.length} ingredients${t.id === D().templateId ? ' · on current quote' : ''}</div></div>
    <div class="rt">${money(templateCost(t), 0)}<small>product cost / 100 guests</small></div></button>`).join('') : '<div class="empty">No carts yet.</div>';
}
$('cartList').addEventListener('click', e => { const b = e.target.closest('[data-cart]'); if (b) editCart(b.dataset.cart); });
$('newCart').onclick = () => editCart(null);
function editCart(id) {
  const t = id ? clone(state.templates[id]) : { id: rid('cart'), name: '', service: '', items: [], order: 60 };
  const body = openSheet({ title: id ? 'Edit cart' : 'New cart', body: `
    <div class="fields"><label class="f">Cart name<input id="cartName" value="${esc(t.name)}" placeholder="e.g. Biscoff s'mores cart"></label>
    <label class="f">Name on quotes<input id="cartService" value="${esc(t.service)}" placeholder="e.g. Biscoff s'mores"></label></div>
    <p class="hint" style="margin-top:14px">Amounts per guest at standard portions. Cost shown is per guest, hour or event.</p>
    <div class="items" id="cartItems"></div>
    <div class="row" style="margin-top:10px"><button class="btn small" id="cartAdd" type="button">+ Add ingredient</button></div>`,
    buttons: [
      ...(id ? [{ label: 'Delete', cls: 'danger', onClick: async () => { closeSheet(); if (await ask(`Delete ${t.name}?`, 'Delete', 'Cancel', true)) { delete state.templates[id]; markDirty('template', id); renderAll(); } } },
        { label: 'Duplicate', onClick: () => { const c = clone(t); c.id = rid('cart'); c.name = ($('cartName').value || t.name) + ' (copy)'; c.items = t.items; state.templates[c.id] = c; markDirty('template', c.id); closeSheet(); renderAll(); editCart(c.id); } }] : []),
      { spacer: true },
      { label: 'Use on quote', onClick: () => { save(); closeSheet(); D().templateId = t.id; D().items = clone(t.items); markDirty('draft'); renderAll(); showStep('shop'); } },
      { label: 'Save', cls: 'primary', onClick: () => { save(); closeSheet(); renderAll(); toast('Cart saved'); } }] });
  function save() {
    t.name = $('cartName').value.trim() || 'Untitled cart'; t.service = $('cartService').value.trim() || t.name.replace(/ cart$/i, '');
    t.items = t.items.filter(x => x.ing); state.templates[t.id] = clone(t); markDirty('template', t.id);
  }
  const render = itemsEditor(body.querySelector('#cartItems'), () => t.items, () => render2(), false);
  const render2 = () => body.querySelectorAll('#cartItems .item').forEach(card => {
    const it = t.items[+card.dataset.i], ing = state.library[it.ing], c = card.querySelector('.calc');
    if (c) c.innerHTML = ing ? `<span>${qty(ing.pack)} ${esc(ing.unit)} for ${money(ing.price, 2)} · ${esc(ing.store || '')}</span><b>${money(unitPrice(ing) * num(it.per), 2)} / ${it.basis}</b>` : '';
  });
  render();
  body.querySelector('#cartAdd').onclick = () => { t.items.push({ ing: '', per: 1, basis: 'guest' }); render(); };
}

// ---------- settings / account ----------
$('signOut').onclick = async () => { if (!(await ask('Sign out on this device?', 'Sign out'))) return; await flush(); if (SB) await SB.auth.signOut(); location.reload(); };
$('syncNow').onclick = () => { if (DEMO) { toast('Demo mode does not sync'); return; } refresh().then(() => toast('Synced')); };

function renderAll() {
  applyFields(); renderDraftItems(); renderDecor(); renderAddons(); renderOh(); renderDefAddons(); renderDefDecor();
  renderLibrary(); renderCarts(); renderEvents(); update();
}

// ---------- boot ----------
let booted = false;
function startApp() {
  $('loginView').hidden = true; $('appView').hidden = false;
  if (!booted) { bindFields(); booted = true; }
  $('acctEmail').textContent = DEMO ? 'Demo mode — not signed in.' : `Signed in as ${EMAIL}`;
  $('demoBanner').hidden = !DEMO;
  renderAll();
  try { const v = localStorage.getItem('cc.view'), s = localStorage.getItem('cc.step'); if (s) showStep(s); if (v && v !== 'quote') showView(v); } catch {}
}
async function startUser(session) {
  UID = session.user.id; EMAIL = session.user.email || '';
  const cached = loadCache();
  if (!cached) state = seedState();
  startApp();
  setSync(navigator.onLine ? 'saving' : 'offline');
  try {
    if (navigator.onLine) { await flush(); await pull(); renderAll(); await flush(); setSync(dirty.size ? 'pending' : 'ok'); }
  } catch (e) { console.warn(e); setSync('error'); }
  subscribe();
}

if (DEMO) {
  if (!loadCache()) state = seedState();
  startApp(); setSync('demo');
} else {
  SB = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  let started = false;
  SB.auth.onAuthStateChange(async (event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      const pw = await askText('Choose a new password (6+ characters)', '', 'Set password');
      if (pw) { const { error } = await SB.auth.updateUser({ password: pw }); toast(error ? error.message : 'Password updated'); }
    }
    if (session && !started) { started = true; startUser(session); }
    if (event === 'SIGNED_OUT') location.reload();
  });
  SB.auth.getSession().then(({ data }) => { if (!data.session) $('loginView').hidden = false; });

  const msg = (t, bad) => { $('loginMsg').textContent = t; $('loginMsg').style.color = bad ? 'var(--bad)' : 'var(--good)'; };
  $('loginForm').addEventListener('submit', async e => {
    e.preventDefault(); msg('Signing in…');
    const { error } = await SB.auth.signInWithPassword({ email: $('loginEmail').value.trim(), password: $('loginPass').value });
    if (error) msg(error.message === 'Email not confirmed' ? 'Confirm your email first — check your inbox for the link.' : error.message, true); else msg('');
  });
  $('signupBtn').onclick = async () => {
    const email = $('loginEmail').value.trim(), password = $('loginPass').value;
    if (!email || password.length < 6) { msg('Enter your email and a password of 6+ characters, then tap Create account.', true); return; }
    const { data, error } = await SB.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } });
    if (error) msg(error.message, true); else if (!data.session) msg('Check your email and tap the confirm link, then come back and sign in.');
  };
  $('forgotBtn').onclick = async () => {
    const email = $('loginEmail').value.trim(); if (!email) { msg('Enter your email first.', true); return; }
    const { error } = await SB.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    msg(error ? error.message : 'Check your email for a reset link.', !!error);
  };
}

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
