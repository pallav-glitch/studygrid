/* ════════════════════════════════════════════════
   StudyGrid – app.js  [ORANGE WEEK BLOCKS]
   Each row = one solid week block
   Tap week → enter hours directly
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
  "The secret of getting ahead is getting started.",
  "Success is the sum of small efforts, repeated day in and day out.",
  "Don't wish it were easier. Wish you were better.",
  "You are capable of more than you know.",
  "Wake up with determination. Go to bed with satisfaction.",
  "It always seems impossible until it's done.",
  "Your only limit is your mind.",
  "Believe you can and you're halfway there.",
  "Make each day your masterpiece.",
  "Stay focused, go after your dreams and keep moving toward your goals.",
];

// ── STATE ─────────────────────────────────────────────────────────────────────
let viewDate = new Date();
viewDate.setDate(1);
let studyData = loadData();
let editingWeekKey = null; // key = "YYYY-WW"

// ── STORAGE ───────────────────────────────────────────────────────────────────
function loadData() {
  try { return JSON.parse(localStorage.getItem('studygrid_v2') || '{}'); }
  catch { return {}; }
}
function saveData() {
  localStorage.setItem('studygrid_v2', JSON.stringify(studyData));
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function toKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function todayKey() { return toKey(new Date()); }

// ISO week number (year-accurate)
function getISOWeekNumber(d) {
  const date = new Date(d);
  date.setHours(0,0,0,0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

// Unique key per week: "YYYY-WNN"
function weekKey(d) {
  return `${d.getFullYear()}-W${String(getISOWeekNumber(d)).padStart(2,'0')}`;
}

// Mon=1 ... Sun=7
function isoDayOfWeek(d) {
  return ((d.getDay() + 6) % 7) + 1;
}

// Hours → colour level 0–4 (orange palette)
function hoursToLevel(h) {
  if (!h || h <= 0) return 0;
  if (h <= 5)  return 1;
  if (h <= 15) return 2;
  if (h <= 30) return 3;
  return 4;
}

function getDailyQuote() {
  const day = new Date();
  const idx = (day.getFullYear() * 1000 + day.getMonth() * 31 + day.getDate()) % QUOTES.length;
  return QUOTES[idx];
}

// ── STREAKS (week-based) ──────────────────────────────────────────────────────
function calcStreaks() {
  const allKeys = Object.keys(studyData)
    .filter(k => k.includes('-W') && (studyData[k]?.hours || 0) > 0)
    .sort();

  // Current streak: count consecutive weeks backwards from current week
  const now = new Date();
  let current = 0;
  const cursorDate = new Date(now);
  while (true) {
    const k = weekKey(cursorDate);
    if ((studyData[k]?.hours || 0) > 0) {
      current++;
      cursorDate.setDate(cursorDate.getDate() - 7);
    } else break;
  }

  // Best streak
  let best = 0, running = 0;
  if (allKeys.length > 0) {
    running = 1; best = 1;
    for (let i = 1; i < allKeys.length; i++) {
      // Check if consecutive weeks
      const [y1, w1] = allKeys[i-1].split('-W').map(Number);
      const [y2, w2] = allKeys[i].split('-W').map(Number);
      const isNext = (y2 === y1 && w2 === w1 + 1) || (y2 === y1 + 1 && w1 >= 52 && w2 === 1);
      if (isNext) { running++; best = Math.max(best, running); }
      else running = 1;
    }
  }
  return { current, best };
}

// ── RENDER GRID ───────────────────────────────────────────────────────────────
function renderGrid() {
  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const grid  = document.getElementById('grid');
  grid.innerHTML = '';

  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  const now      = new Date();

  // Start from Monday of the first week
  const startDow = isoDayOfWeek(firstDay);
  const gridStart = new Date(firstDay);
  gridStart.setDate(gridStart.getDate() - (startDow - 1));

  // End on Sunday of the last week
  const endDow = isoDayOfWeek(lastDay);
  const gridEnd = new Date(lastDay);
  gridEnd.setDate(gridEnd.getDate() + (7 - endDow));

  const cursor = new Date(gridStart);

  while (cursor <= gridEnd) {
    const wKey    = weekKey(cursor);
    const wNum    = getISOWeekNumber(cursor);
    const entry   = studyData[wKey] || {};
    const hours   = entry.hours || 0;
    const note    = entry.note  || '';
    const level   = hoursToLevel(hours);

    // Check if this week is current week
    const isCurrentWeek = weekKey(now) === wKey;
    // Check if week is fully in the future
    const weekMonday = new Date(cursor);
    const isFuture = weekMonday > now;

    // Check if week overlaps with current month at all
    const weekSunday = new Date(cursor);
    weekSunday.setDate(weekSunday.getDate() + 6);
    const inMonth = cursor.getMonth() === month || weekSunday.getMonth() === month;

    const block = document.createElement('div');
    block.className = 'week-block';
    block.dataset.level = inMonth ? level : 0;
    block.dataset.wkey = wKey;

    if (isCurrentWeek) block.classList.add('current-week');
    if (isFuture || !inMonth) block.classList.add('future-week');

    // Week label
    const labelEl = document.createElement('span');
    labelEl.className = 'week-block-label';
    labelEl.textContent = `W${wNum}`;

    // Hours display
    const hoursEl = document.createElement('span');
    hoursEl.className = 'week-block-hours';
    hoursEl.textContent = hours > 0 ? `${hours}h` : '';

    // Note display
    const noteEl = document.createElement('span');
    noteEl.className = 'week-block-note';
    noteEl.textContent = note;

    block.appendChild(labelEl);
    block.appendChild(noteEl);
    block.appendChild(hoursEl);

    if (!isFuture && inMonth) {
      block.addEventListener('click', () => openModal(wKey, wNum, cursor));
    }

    grid.appendChild(block);
    cursor.setDate(cursor.getDate() + 7);
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
  const MAX_HOURS = 60;

  const startDow = isoDayOfWeek(firstDay);
  const cursor   = new Date(firstDay);
  cursor.setDate(cursor.getDate() - (startDow - 1));

  const endDow = isoDayOfWeek(lastDay);
  const gridEnd = new Date(lastDay);
  gridEnd.setDate(gridEnd.getDate() + (7 - endDow));

  while (cursor <= gridEnd) {
    const wKey    = weekKey(cursor);
    const wNum    = getISOWeekNumber(cursor);
    const hours   = studyData[wKey]?.hours || 0;
    const pct     = Math.min((hours / MAX_HOURS) * 100, 100);

    const row = document.createElement('div');
    row.className = 'week-summary-row';
    row.innerHTML = `
      <div class="week-label">W${wNum}</div>
      <div class="week-bar-wrap"><div class="week-bar-fill" style="width:${pct}%"></div></div>
      <div class="week-hours">${hours}h</div>
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

  // Total hours = sum of all weeks that overlap this month
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  const startDow = isoDayOfWeek(firstDay);
  const cursor   = new Date(firstDay);
  cursor.setDate(cursor.getDate() - (startDow - 1));
  const endDow   = isoDayOfWeek(lastDay);
  const gridEnd  = new Date(lastDay);
  gridEnd.setDate(gridEnd.getDate() + (7 - endDow));

  let total = 0;
  const cur2 = new Date(cursor);
  while (cur2 <= gridEnd) {
    total += studyData[weekKey(cur2)]?.hours || 0;
    cur2.setDate(cur2.getDate() + 7);
  }

  document.getElementById('month-hours').textContent = total;
  document.getElementById('daily-quote').textContent = getDailyQuote();

  const { current, best } = calcStreaks();
  document.getElementById('streak-count').textContent = current;
  document.getElementById('best-streak').textContent  = best;
}

function render() { renderHeader(); renderGrid(); renderWeekly(); }

// ── MODAL ─────────────────────────────────────────────────────────────────────
function openModal(wKey, wNum, mondayDate) {
  editingWeekKey = wKey;
  const entry = studyData[wKey] || {};

  document.getElementById('modal-date').textContent = `Week ${wNum}`;
  document.getElementById('modal-note').value = entry.note || '';

  const inp = document.getElementById('hour-input');
  inp.value = entry.hours || '';

  document.getElementById('modal-overlay').classList.remove('hidden');
  setTimeout(() => inp.focus(), 100);
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  editingWeekKey = null;
}

function saveModal() {
  if (!editingWeekKey) return;
  const note  = document.getElementById('modal-note').value.trim();
  const hours = parseInt(document.getElementById('hour-input').value) || 0;

  if (hours === 0 && !note) delete studyData[editingWeekKey];
  else studyData[editingWeekKey] = { hours, note };

  saveData();
  closeModal();

  // Animate updated block
  const block = document.querySelector(`.week-block[data-wkey="${editingWeekKey}"]`);
  if (block) {
    block.dataset.level = hoursToLevel(hours);
    block.classList.remove('animate'); void block.offsetWidth; block.classList.add('animate');
    setTimeout(() => block.classList.remove('animate'), 500);
  }
  render();
}

// ── EVENTS ────────────────────────────────────────────────────────────────────
document.getElementById('prev-month').addEventListener('click', () => { viewDate.setMonth(viewDate.getMonth()-1); render(); });
document.getElementById('next-month').addEventListener('click', () => { viewDate.setMonth(viewDate.getMonth()+1); render(); });
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
});
document.getElementById('modal-save').addEventListener('click', saveModal);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

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
  // Remove all week keys that fall in this month
  Object.keys(studyData).forEach(k => {
    if (k.includes('-W')) delete studyData[k];
  });
  saveData(); render();
});

// ── PWA INSTALL ───────────────────────────────────────────────────────────────
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); deferredInstallPrompt = e;
  document.getElementById('install-banner').classList.remove('hidden');
});
document.getElementById('install-btn').addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt(); await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  document.getElementById('install-banner').classList.add('hidden');
});
document.getElementById('dismiss-install').addEventListener('click', () => {
  document.getElementById('install-banner').classList.add('hidden');
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(e => console.warn('[SW]', e));
}

render();
