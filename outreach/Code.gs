/**
 * cart caddies — outreach email sequence (Google Sheets + Apps Script)
 *
 * setup (once):
 *   1. make a new Google Sheet while signed in as the sending Gmail account
 *   2. extensions → Apps Script → delete what's there → paste this file → save
 *   3. reload the sheet → menu "cart caddies outreach" → "1. set up sheet"
 *   4. menu → "2. turn on auto-send" (approve the Gmail permission)
 *
 * daily use: add a row in "leads", fill it in, tick "ready". that's it.
 * edit email copy and wait days in the "templates" tab, not here.
 */

const CONFIG = {
  TIMEZONE: 'America/New_York',
  START_HOUR: 9,        // first hour emails can go out
  END_HOUR: 17,         // no sends at or after this hour
  WEEKDAYS_ONLY: true,
  DAILY_CAP: 20,        // max emails per day across all leads
  SENDER_NAME: 'Cart Caddies',
  SIGNATURE: 'cart caddies team\ncartcaddiesfl@gmail.com · cartcaddiesfl.com',
};

const LEAD_HEADERS = ['ready', 'email', 'name', 'company', 'city', 'segment', 'detail',
  'status', 'step', 'last sent', 'next send', 'thread id', 'notes', 'instagram', 'website'];
// "new leads" is where Make drops scraped leads for review. column names must match in Make.
const INBOX_HEADERS = ['approve', 'name', 'email', 'company', 'city', 'segment', 'instagram', 'website', 'source'];
const INBOX_FIELDS = ['name', 'email', 'company', 'city', 'segment', 'instagram', 'website'];
const TEMPLATE_HEADERS = ['segment', 'step', 'label', 'wait days', 'subject', 'body'];
const LOG_HEADERS = ['time', 'email', 'segment', 'step', 'label'];
const SEGMENTS = ['planner', 'corporate', 'residential'];
const STOPPED = ['replied', 'done', 'bounced', 'paused', 'duplicate', 'error'];

// ---------- menu ----------

function onOpen() {
  SpreadsheetApp.getUi().createMenu('cart caddies outreach')
    .addItem('1. set up sheet', 'setupSheet')
    .addItem('2. turn on auto-send (hourly)', 'turnOnAutoSend')
    .addSeparator()
    .addItem('move approved leads now', 'moveApprovedNow')
    .addItem('send due emails now', 'sendNow')
    .addItem('turn off auto-send', 'turnOffAutoSend')
    .addToUi();
}

// ---------- setup ----------

function setupSheet() {
  const ss = SpreadsheetApp.getActive();
  ss.setSpreadsheetTimeZone(CONFIG.TIMEZONE);

  const leads = getOrCreateTab_(ss, 'leads', LEAD_HEADERS);
  leads.getRange('A2:A1000').insertCheckboxes();
  leads.getRange('F2:F1000').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(SEGMENTS, true).build());
  leads.getRange('J2:K1000').setNumberFormat('mmm d, yyyy');
  leads.getRange('C1').setNote('first name, used in the greeting');
  leads.getRange('D1').setNote('business, company or building name');
  leads.getRange('G1').setNote('the personal line. planner: what you loved about their work. corporate: the signal you saw.');
  leads.getRange('H1').setNote('filled by the script. type "paused" to stop a lead. clear it to retry after an error.');
  leads.getRange('H1:L1').setBackground('#eeeeee');

  // no checkboxes here on purpose: empty rows must stay empty so Make adds leads at the top
  const inbox = getOrCreateTab_(ss, 'new leads', INBOX_HEADERS);
  inbox.getRange('A2:A').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['yes', 'skip'], true).setAllowInvalid(true).build());
  inbox.getRange('F2:F').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(SEGMENTS, true).setAllowInvalid(true).build());
  inbox.getRange('A1').setNote('pick "yes" to send this lead to the leads tab. the script then marks it "moved".');

  const templates = getOrCreateTab_(ss, 'templates', TEMPLATE_HEADERS);
  if (templates.getLastRow() < 2) {
    templates.getRange(2, 1, DEFAULT_TEMPLATES.length, TEMPLATE_HEADERS.length).setValues(DEFAULT_TEMPLATES);
    templates.getRange('F2:F').setWrap(true);
    templates.setColumnWidth(5, 280);
    templates.setColumnWidth(6, 560);
  }

  getOrCreateTab_(ss, 'log', LOG_HEADERS);
  ss.setActiveSheet(leads);
  SpreadsheetApp.getUi().alert('sheet is set up. next: menu → "2. turn on auto-send".');
}

function getOrCreateTab_(ss, name, headers) {
  const sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  } else {
    // add any columns introduced by a newer version of this script
    const have = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim().toLowerCase());
    headers.filter(h => have.indexOf(h) === -1).forEach(h =>
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(h).setFontWeight('bold'));
  }
  return sheet;
}

function turnOnAutoSend() {
  turnOffAutoSend_();
  ScriptApp.newTrigger('runOutreach').timeBased().everyHours(1).create();
  SpreadsheetApp.getUi().alert('auto-send is on. the sheet is checked every hour, ' +
    CONFIG.START_HOUR + ':00–' + CONFIG.END_HOUR + ':00' + (CONFIG.WEEKDAYS_ONLY ? ', weekdays' : '') + '.');
}

function turnOffAutoSend() {
  turnOffAutoSend_();
  SpreadsheetApp.getUi().alert('auto-send is off. nothing sends until you turn it back on.');
}

function turnOffAutoSend_() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'runOutreach')
    .forEach(t => ScriptApp.deleteTrigger(t));
}

// ---------- main ----------

/** hourly trigger entry point: respects business hours. */
function runOutreach() {
  moveApprovedLeads_();
  process_(false);
}

function moveApprovedNow() {
  SpreadsheetApp.getUi().alert(moveApprovedLeads_() + ' lead(s) moved to the leads tab.');
}

/**
 * copies rows marked "yes" in "new leads" into "leads" (ready left unticked),
 * then marks them "moved". rows with no email or an email already in leads are flagged instead.
 */
function moveApprovedLeads_() {
  const ss = SpreadsheetApp.getActive();
  const inbox = ss.getSheetByName('new leads');
  const leads = ss.getSheetByName('leads');
  if (!inbox || !leads || inbox.getLastRow() < 2) return 0;

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return 0;
  try {
    const inValues = inbox.getDataRange().getValues();
    const inCol = headerMap_(inValues[0]);
    const leadValues = leads.getDataRange().getValues();
    const col = headerMap_(leadValues[0]);

    const known = {};
    let free = 1; // 0-based index of the first row after the last lead
    for (let i = 1; i < leadValues.length; i++) {
      const e = String(leadValues[i][col['email']]).trim().toLowerCase();
      if (e) { known[e] = true; free = i + 1; }
    }

    let moved = 0;
    for (let r = 1; r < inValues.length; r++) {
      if (String(inValues[r][inCol['approve']]).trim().toLowerCase() !== 'yes') continue;
      const mark = value => inbox.getRange(r + 1, inCol['approve'] + 1).setValue(value);
      const email = String(inValues[r][inCol['email']]).trim();
      if (!email) { mark('no email'); continue; }
      if (known[email.toLowerCase()]) { mark('duplicate'); continue; }

      INBOX_FIELDS.forEach(field => {
        if (inCol[field] === undefined || col[field] === undefined) return;
        let value = String(inValues[r][inCol[field]]).trim();
        if (field === 'segment') value = value.toLowerCase();
        leads.getRange(free + 1, col[field] + 1).setValue(value);
      });
      leads.getRange(free + 1, col['ready'] + 1).insertCheckboxes();
      known[email.toLowerCase()] = true;
      free++;
      moved++;
      mark('moved');
    }
    return moved;
  } finally {
    lock.releaseLock();
  }
}

function headerMap_(headerRow) {
  const map = {};
  headerRow.forEach((h, i) => { map[String(h).trim().toLowerCase()] = i; });
  return map;
}

/** menu entry point: ignores business hours, still respects the daily cap. */
function sendNow() {
  const sent = process_(true);
  SpreadsheetApp.getUi().alert(sent + ' email(s) sent.');
}

function process_(ignoreHours) {
  if (!ignoreHours && !insideSendWindow_()) return 0;

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return 0;
  try {
    const ss = SpreadsheetApp.getActive();
    const sheet = ss.getSheetByName('leads');
    const log = ss.getSheetByName('log');
    const templates = loadTemplates_(ss.getSheetByName('templates'));
    const me = (Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail()).toLowerCase();

    const values = sheet.getDataRange().getValues();
    const col = {};
    values[0].forEach((h, i) => { col[String(h).trim().toLowerCase()] = i; });
    const set = (rowIndex, header, value) => sheet.getRange(rowIndex + 1, col[header] + 1).setValue(value);

    let budget = Math.min(CONFIG.DAILY_CAP - sentToday_(), MailApp.getRemainingDailyQuota());
    let sent = 0;
    const seen = {};

    for (let r = 1; r < values.length; r++) {
      const row = values[r];
      const email = String(row[col['email']]).trim();
      if (!email) continue;
      const emailKey = email.toLowerCase();
      const isRepeat = seen[emailKey];
      seen[emailKey] = true;

      const status = String(row[col['status']]).trim().toLowerCase();
      if (row[col['ready']] !== true || STOPPED.indexOf(status) !== -1) continue;

      try {
        const segment = String(row[col['segment']]).trim().toLowerCase();
        const steps = templates[segment];
        if (!steps) { set(r, 'status', 'check segment'); continue; }

        const lead = {
          name: String(row[col['name']]).trim(),
          company: String(row[col['company']]).trim(),
          city: String(row[col['city']]).trim(),
          detail: String(row[col['detail']]).trim(),
        };
        const step = Number(row[col['step']]) || 0;
        const lastStep = Math.max.apply(null, Object.keys(steps).map(Number));
        let threadId = String(row[col['thread id']]).trim();

        // already in a sequence: stop if they replied or the email bounced
        if (step > 0) {
          const thread = GmailApp.getThreadById(threadId);
          if (!thread) throw new Error('email thread not found');
          const outcome = threadOutcome_(thread, me);
          if (outcome) { set(r, 'status', outcome); set(r, 'next send', ''); continue; }
          if (step >= lastStep) { set(r, 'status', 'done'); set(r, 'next send', ''); continue; }
          const due = row[col['next send']];
          if (due instanceof Date && due > new Date()) continue;
        }

        if (budget <= 0) continue; // keep looping so reply checks still run

        const next = steps[step + 1];
        if (!next) throw new Error('no template for step ' + (step + 1));

        if (step === 0) {
          if (isRepeat) { set(r, 'status', 'duplicate'); continue; }
          const missing = missingFields_(steps, lead);
          if (missing.length) { set(r, 'status', 'missing: ' + missing.join(', ')); continue; }
        }

        const body = fill_(next.body, lead) + '\n\n' + CONFIG.SIGNATURE;
        if (step === 0) {
          const message = GmailApp.createDraft(email, fill_(next.subject, lead), body,
            { name: CONFIG.SENDER_NAME }).send();
          threadId = message.getThread().getId();
        } else {
          threadId = sendFollowUp_(threadId, email, body);
        }

        // write progress right away so a crash can't cause a double send
        const now = new Date();
        const newStep = step + 1;
        const after = steps[newStep + 1];
        set(r, 'step', newStep);
        set(r, 'last sent', now);
        set(r, 'thread id', threadId);
        set(r, 'status', after ? 'active' : 'done');
        set(r, 'next send', after ? addDays_(now, after.wait) : '');
        if (step === 0 && segment === 'planner') {
          set(r, 'notes', (String(row[col['notes']]) + ' instagram: like/comment on a post this week').trim());
        }
        log.appendRow([now, email, segment, newStep, next.label]);
        SpreadsheetApp.flush();
        bumpSentToday_();
        budget--;
        sent++;
      } catch (err) {
        set(r, 'status', 'error');
        set(r, 'notes', String(err.message || err));
      }
    }
    return sent;
  } finally {
    lock.releaseLock();
  }
}

// ---------- helpers ----------

/** follow-ups go out as a reply in the original thread. */
function sendFollowUp_(threadId, email, body) {
  const thread = GmailApp.getThreadById(threadId);
  let draft = thread.createDraftReplyAll(body, { name: CONFIG.SENDER_NAME });
  // safety check: make sure the reply is addressed to the lead, not back to us
  if (draft.getMessage().getTo().toLowerCase().indexOf(email.toLowerCase()) === -1) {
    draft.deleteDraft();
    draft = GmailApp.createDraft(email, 're: ' + thread.getFirstMessageSubject(), body,
      { name: CONFIG.SENDER_NAME });
  }
  return draft.send().getThread().getId();
}

/** returns 'bounced', 'replied' or '' for a thread we started. */
function threadOutcome_(thread, me) {
  const senders = thread.getMessages().map(m => m.getFrom().toLowerCase());
  if (senders.some(f => f.indexOf('mailer-daemon') !== -1 || f.indexOf('postmaster') !== -1)) return 'bounced';
  if (senders.some(f => f.indexOf(me) === -1)) return 'replied';
  return '';
}

function loadTemplates_(sheet) {
  const map = {};
  sheet.getDataRange().getValues().slice(1).forEach(row => {
    const segment = String(row[0]).trim().toLowerCase();
    const step = Number(row[1]);
    if (!segment || !step) return;
    map[segment] = map[segment] || {};
    map[segment][step] = {
      label: String(row[2]),
      wait: Number(row[3]) || 0,
      subject: String(row[4]),
      body: String(row[5]),
    };
  });
  return map;
}

function fill_(text, lead) {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(lead, key) ? lead[key] : match);
}

/** lead fields used by this segment's templates that are still blank. */
function missingFields_(steps, lead) {
  const used = {};
  Object.keys(steps).forEach(n => {
    const text = steps[n].subject + ' ' + steps[n].body;
    (text.match(/\{\{\s*(\w+)\s*\}\}/g) || []).forEach(p => { used[p.replace(/[{}\s]/g, '')] = true; });
  });
  return Object.keys(used).filter(key => !lead[key]);
}

function insideSendWindow_() {
  const now = new Date();
  const hour = Number(Utilities.formatDate(now, CONFIG.TIMEZONE, 'H'));
  const day = Number(Utilities.formatDate(now, CONFIG.TIMEZONE, 'u')); // 1 = monday … 7 = sunday
  if (CONFIG.WEEKDAYS_ONLY && day > 5) return false;
  return hour >= CONFIG.START_HOUR && hour < CONFIG.END_HOUR;
}

function addDays_(date, days) {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function todayKey_() {
  return 'sent_' + Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd');
}

function sentToday_() {
  return Number(PropertiesService.getScriptProperties().getProperty(todayKey_())) || 0;
}

function bumpSentToday_() {
  PropertiesService.getScriptProperties().setProperty(todayKey_(), String(sentToday_() + 1));
}

// ---------- starter templates (loaded into the "templates" tab by setup) ----------
// placeholders: {{name}} {{company}} {{city}} {{detail}}. the signature is added automatically.
// "wait days" = days after the previous email. the subject only matters on step 1.

const DEFAULT_TEMPLATES = [
  ['planner', 1, 'intro', 0, 'quick intro — Cart Caddies, {{city}} events',
    'hi {{name}},\n\ni came across {{company}} and loved {{detail}}. i\'m with Cart Caddies, a luxury party cart serving {{city}} — we\'re building out our vendor network with planners doing the kind of work you do.\n\nwould love to send over our concept and photos, or grab 15 minutes if it\'s useful heading into your next season. no pressure either way.'],
  ['planner', 2, 'follow-up 1', 2, '',
    'hi {{name}},\n\nbumping this up in case it got buried. happy to send our concept and photos so you have them on hand — just say the word.'],
  ['planner', 3, 'follow-up 2', 3, '',
    'hi {{name}},\n\none more thought: a party cart is an easy add when a client wants one more memorable moment without more moving parts for you. it arrives ready to go.\n\nworth a quick 15 minutes?'],
  ['planner', 4, 'close', 4, '',
    'hi {{name}},\n\nlast note from me — i won\'t keep filling your inbox. if a party cart ever fits one of your events, we\'d love to be on your vendor list. keep us in mind for next season.'],

  ['corporate', 1, 'intro', 0, 'a party cart for {{company}}\'s next team event',
    'hi {{name}},\n\nsaw {{detail}} and figured this might be a fun fit for your next one. Cart Caddies is a luxury party cart that comes right to your office — an easy way to do something memorable without the usual event-planning lift.\n\nwant me to send over a quick overview for your next team celebration or holiday event?'],
  ['corporate', 2, 'follow-up 1', 2, '',
    'hi {{name}},\n\nbumping this up in case it got buried. happy to send a short overview of how the party cart works for a team event at {{company}} — want it?'],
  ['corporate', 3, 'follow-up 2', 3, '',
    'hi {{name}},\n\none more thought: the cart comes to you, so there\'s no venue to book and nothing for your team to set up. it works for a team celebration, an appreciation day or a holiday event.\n\nopen to a quick overview?'],
  ['corporate', 4, 'close', 4, '',
    'hi {{name}},\n\nlast note from me — i won\'t keep filling your inbox. if a party cart sounds right for a future {{company}} event, just reply here and we\'ll take it from there.'],

  ['residential', 1, 'intro', 0, 'a party cart for {{company}}\'s next resident event',
    'hi {{name}},\n\n{{company}}\'s amenities caught my eye — looks like a great fit for something a little different for residents. Cart Caddies is a luxury party cart that comes right to the building, an easy way to make a resident event feel special with zero extra lift on your end.\n\nhappy to send details for an upcoming resident event if useful — let me know.'],
  ['residential', 2, 'follow-up 1', 2, '',
    'hi {{name}},\n\nbumping this up in case it got buried. happy to send details on how the party cart works for a resident event at {{company}} — want them?'],
  ['residential', 3, 'follow-up 2', 3, '',
    'hi {{name}},\n\none more thought: the cart comes to the building, so there\'s nothing for your team to set up. it fits a resident mixer, a pool day or a holiday gathering.\n\nopen to seeing the details?'],
  ['residential', 4, 'close', 4, '',
    'hi {{name}},\n\nlast note from me — i won\'t keep filling your inbox. if a party cart sounds right for a future resident event at {{company}}, just reply here and we\'ll take it from there.'],
];
