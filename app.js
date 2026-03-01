/* ════════════════════════════════════════════════
   StudyGrid – app.js  [UPDATED]
   Grid: Rows = Weeks, Cols = Days (Mon–Sun)
   Week numbers are ISO year-accurate (W1–W52)
   ════════════════════════════════════════════════ */

const QUOTES = [
  "Small progress is still progress.",
  "Every hour you study today is a problem you won't face tomorrow.",
  "The expert in anything was once a beginner.",
  "Consistency beats intensity. Show up every day.",
  "Study hard in silence; let your results make the noise.",
  "You don't have to be great to start, but you have to start to be great.",
  "Focus on the step in front of you, not the whole staircase.",
  "Your future self is watching you right now.",
  "Discipline is choosing between what you want now and what you want most.",
  "Hard work beats talent when talent doesn't work hard.",
  "The pain of studying is far less than the pain of regret.",
  "Do a little more each day than you think you possibly can.",
  "Learning is not attained by chance; it must be sought with ardor.",
  "Every page you read is a step closer to your goal.",
  "Push yourself because no one else is going to do it for you.",
  "Dream big. Start small. Act now.",
  "Mistakes are proof that you are trying.",
  "Your dedication today shapes your destiny tomorrow.",
  "One day or day one — you decide.",
  "Great things are done by a series of small things brought together.",
];

// ── STATE ─────────────────────────────────────────────────────────────────────
let viewDate = new Date();
viewDate.setDate(1);
let studyData = loadData();
let editingDateKey = null;

// ── STORAGE ───────────────────────────────────────────────────────────────────
function loadData() {
  try { return JSON.parse(localStorage.getItem('studygrid_data') || '{}'); }
  catch { return {}; }
}
function saveData() {
  localStorage.setItem('studygrid_data', JSON.stringify(studyData));
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function toKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function todayKey() { return toKey(new Date()); }

function hoursToLevel(h) {
  if (!h || h <= 0) return 0;
  if (h <= 2) return 1;
  if (h <= 4) return 2;
  if (h <= 6) return 3;
  return 4;
}

// Mon=1 ... Sun=7
function isoDayOfWeek(d) {
  return ((d.getDay() + 6) % 7) + 1;
}

// ISO week number W1–W52 (year-accurate)
function getISOWeekNumber(d) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

function getDailyQuote() {
  const day = new Date();
  const idx = (day.getFullYear() * 1000 + day.getMonth() * 31 + day.getDate()) % QUOTES.length;
  return QUOTES[idx];
}

// ── STREAKS ───────────────────────────────────────────────────────────────────
function calcStreaks() {
  const today = new Date(); today.setHours(0,0,0,0);
  let current = 0, best = 0, running = 0;
  const cursor = new Date(today);
  while (true) {
    const k = toKey(cursor);
    if ((studyData[k]?.hours || 0) > 0) { current++; cursor.setDate(cursor.getDate() - 1); }
    else break;
  }
  const allKeys = Object.keys(studyData).filter(k => studyData[k]?.hours > 0).sort();
  if (allKeys.length > 0) {
    running = 1; best = 1;
    for (let i = 1; i < allKeys.length; i++) {
      const diff = (new Date(allKeys[i]) - new Date(allKeys[i-1])) / 86400000;
      if (diff === 1) { running++; best = Math.max(best, running); }
      else running = 1;
    }
  }
  return { current, best };
}

// ── RENDER GRID ───────────────────────────────────────────────────────────────
// Each ROW = one week | Left label = W{ISO week number}
// Days outside the current month are faded
function renderGrid() {
  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const grid  = document.getElementById('grid');
  grid.innerHTML = '';

  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  const todayStr = todayKey();
  const now      = new Date();

  // Monday that starts the first visible week
  const startDow = isoDayOfWeek(firstDay);
  const gridStart = new Date(firstDay);
  gridStart.setDate(gridStart.getDate() - (startDow - 1));

  // Sunday that ends the last visible week
  const endDow = isoDayOfWeek(lastDay);
  const gridEnd = new Date(lastDay);
  gridEnd.setDate(gridEnd.getDate() + (7 - endDow));

  const cursor = new Date(gridStart);

  while (cursor <= gridEnd) {
    const weekRow = document.createElement('div');
    weekRow.className = 'week-row-grid';

    // Week number label on left
    const weekNum = getISOWeekNumber(cursor);
    const label = document.createElement('div');
    label.className = 'week-num-label';
    label.textContent = `W${weekNum}`;
    weekRow.appendChild(label);

    // 7 cells Mon–Sun
    for (let i = 0; i < 7; i++) {
      const date    = new Date(cursor);
      const key     = toKey(date);
      const inMonth = date.getMonth() === month;
      const hours   = studyData[key]?.hours || 0;
      const level   = hoursToLevel(hours);
      const isToday = key === todayStr;
      const isFuture = date > now;

      const cell = document.createElement('div');
      cell.className = 'day-cell';
      cell.dataset.level = inMonth ? level : 0;
      cell.dataset.key = key;

      if (!inMonth)          cell.classList.add('out-of-month');
      if (isToday)           cell.classList.add('today');
      if (isFuture||!inMonth) cell.classList.add('future');

      // Day number
      const num = document.createElement('span');
      num.className = 'day-num';
      num.textContent = date.getDate();
      cell.appendChild(num);

      if (inMonth && !isFuture) {
        cell.addEventListener('click', () => openModal(key, date));
      }

      weekRow.appendChild(cell);
      cursor.setDate(cursor.getDate() + 1);
    }

    grid.appendChild(weekRow);
  }
}

// ── RENDER WEEKLY SUMMARY ─────────────────────────────────────────────────────
function renderWeekly() {
  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const list  = document.getElementById('weekly-list');
  list.innerHTML = '';

  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  const MAX_HOURS = 50;

  const startDow = isoDayOfWeek(firstDay);
  const cursor   = new Date(firstDay);
  cursor.setDate(cursor.getDate() - (startDow - 1));

  const endDow = isoDayOfWeek(lastDay);
  const gridEnd = new Date(lastDay);
  gridEnd.setDate(gridEnd.getDate() + (7 - endDow));

  while (cursor <= gridEnd) {
    const weekNum = getISOWeekNumber(cursor);
    let weekHours = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(cursor);
      d.setDate(d.getDate() + i);
      if (d.getMonth() === month) weekHours += studyData[toKey(d)]?.hours || 0;
    }
    const pct = Math.min((weekHours / MAX_HOURS) * 100, 100);
    const row = document.createElement('div');
    row.className = 'week-summary-row';
    row.innerHTML = `
      <div class="week-label">W${weekNum}</div>
      <div class="week-bar-wrap"><div class="week-bar-fill" style="width:${pct}%"></div></div>
      <div class="week-hours">${weekHours}h</div>
    `;
    list.appendChild(row);
    cursor.setDate(cursor.getDate() + 7);
  }
}

// ── RENDER HEADER ─────────────────────────────────────────────────────────────
function renderHeader() {
  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  document.getElementById('month-name').textContent =
    new Date(year, month, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  const lastDay = new Date(year, month + 1, 0).getDate();
  let total = 0;
  for (let d = 1; d <= lastDay; d++) total += studyData[toKey(new Date(year, month, d))]?.hours || 0;
  document.getElementById('month-hours').textContent = total;
  document.getElementById('daily-quote').textContent = getDailyQuote();
  const { current, best } = calcStreaks();
  document.getElementById('streak-count').textContent = current;
  document.getElementById('best-streak').textContent  = best;
}

function render() { renderHeader(); renderGrid(); renderWeekly(); }

// ── MODAL ─────────────────────────────────────────────────────────────────────
let modalHours = 0;

function openModal(key, date) {
  editingDateKey = key;
  const entry = studyData[key] || {};
  modalHours = entry.hours || 0;
  document.getElementById('modal-date').textContent =
    date.toLocaleDateString('default', { weekday: 'long', day: 'numeric', month: 'long' });
  document.getElementById('hour-display').textContent = modalHours;
  document.getElementById('modal-note').value = entry.note || '';
  document.getElementById('modal-overlay').classList.remove('hidden');
}
function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  editingDateKey = null;
}
function saveModal() {
  if (!editingDateKey) return;
  const note = document.getElementById('modal-note').value.trim();
  if (modalHours === 0 && !note) delete studyData[editingDateKey];
  else studyData[editingDateKey] = { hours: modalHours, note };
  saveData(); closeModal();
  const cell = document.querySelector(`.day-cell[data-key="${editingDateKey}"]`);
  if (cell) {
    cell.dataset.level = hoursToLevel(modalHours);
    cell.classList.remove('animate'); void cell.offsetWidth; cell.classList.add('animate');
    setTimeout(() => cell.classList.remove('animate'), 500);
  }
  render();
}

// ── EVENTS ────────────────────────────────────────────────────────────────────
document.getElementById('prev-month').addEventListener('click', () => { viewDate.setMonth(viewDate.getMonth()-1); render(); });
document.getElementById('next-month').addEventListener('click', () => { viewDate.setMonth(viewDate.getMonth()+1); render(); });
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', e => { if (e.target===document.getElementById('modal-overlay')) closeModal(); });
document.getElementById('modal-save').addEventListener('click', saveModal);
document.getElementById('hour-inc').addEventListener('click', () => { if (modalHours<24) modalHours++; document.getElementById('hour-display').textContent=modalHours; });
document.getElementById('hour-dec').addEventListener('click', () => { if (modalHours>0) modalHours--; document.getElementById('hour-display').textContent=modalHours; });
document.addEventListener('keydown', e => { if (e.key==='Escape') closeModal(); });

document.getElementById('export-btn').addEventListener('click', () => {
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([JSON.stringify(studyData,null,2)],{type:'application/json'})),
    download: `studygrid-${todayKey()}.json`
  });
  a.click();
});

document.getElementById('reset-btn').addEventListener('click', () => {
  const year=viewDate.getFullYear(), month=viewDate.getMonth();
  const label=new Date(year,month,1).toLocaleString('default',{month:'long'});
  if (!confirm(`Reset all data for ${label} ${year}?`)) return;
  const last=new Date(year,month+1,0).getDate();
  for (let d=1;d<=last;d++) delete studyData[toKey(new Date(year,month,d))];
  saveData(); render();
});

// ── PWA INSTALL ───────────────────────────────────────────────────────────────
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); deferredInstallPrompt=e;
  document.getElementById('install-banner').classList.remove('hidden');
});
document.getElementById('install-btn').addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt(); await deferredInstallPrompt.userChoice;
  deferredInstallPrompt=null; document.getElementById('install-banner').classList.add('hidden');
});
document.getElementById('dismiss-install').addEventListener('click', () => {
  document.getElementById('install-banner').classList.add('hidden');
});

// ── SERVICE WORKER ────────────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(e => console.warn('[SW]',e));
}

render();

