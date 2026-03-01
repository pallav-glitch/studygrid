/* ════════════════════════════════════════════════
   StudyGrid – app.js
   All app logic: state, rendering, events, storage
   ════════════════════════════════════════════════ */

// ── MOTIVATIONAL QUOTES (one shown per calendar day) ──────────────────────────
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
// viewDate: the month currently being displayed
let viewDate = new Date();
viewDate.setDate(1); // normalise to 1st of month

// studyData: object keyed by 'YYYY-MM-DD' → { hours, note }
let studyData = loadData();

// Track the day cell being edited
let editingDateKey = null;

// ── DATA PERSISTENCE ──────────────────────────────────────────────────────────
/** Load all study data from localStorage */
function loadData() {
  try {
    return JSON.parse(localStorage.getItem('studygrid_data') || '{}');
  } catch {
    return {};
  }
}

/** Save all study data to localStorage */
function saveData() {
  localStorage.setItem('studygrid_data', JSON.stringify(studyData));
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
/** Format a Date to 'YYYY-MM-DD' */
function toKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/** Get today's key */
function todayKey() { return toKey(new Date()); }

/** Map study hours to a colour level (0–4) */
function hoursToLevel(h) {
  if (!h || h <= 0) return 0;
  if (h <= 2) return 1;
  if (h <= 4) return 2;
  if (h <= 6) return 3;
  return 4;
}

/** Get the ISO day-of-week (1=Mon … 7=Sun) for a date */
function isoDayOfWeek(d) {
  return ((d.getDay() + 6) % 7) + 1; // convert Sun=0 → Mon=1
}

/** Return the daily quote based on today's date (consistent for the day) */
function getDailyQuote() {
  const day = new Date();
  const idx = (day.getFullYear() * 1000 + day.getMonth() * 31 + day.getDate()) % QUOTES.length;
  return QUOTES[idx];
}

// ── STREAK CALCULATION ────────────────────────────────────────────────────────
/**
 * Calculate current streak (consecutive days up to today with >0 hours)
 * and best-ever streak.
 */
function calcStreaks() {
  const today = new Date();
  today.setHours(0,0,0,0);

  let current = 0;
  let best = 0;
  let running = 0;

  // Walk backwards from today to find current streak
  const cursor = new Date(today);
  while (true) {
    const k = toKey(cursor);
    const h = studyData[k]?.hours || 0;
    if (h > 0) {
      current++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  // Walk all keys sorted to find best streak
  const allKeys = Object.keys(studyData)
    .filter(k => studyData[k]?.hours > 0)
    .sort();

  if (allKeys.length > 0) {
    running = 1;
    best = 1;
    for (let i = 1; i < allKeys.length; i++) {
      const prev = new Date(allKeys[i-1]);
      const curr = new Date(allKeys[i]);
      const diff = (curr - prev) / 86400000;
      if (diff === 1) {
        running++;
        best = Math.max(best, running);
      } else {
        running = 1;
      }
    }
  }

  return { current, best };
}

// ── RENDER GRID ───────────────────────────────────────────────────────────────
function renderGrid() {
  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const grid = document.getElementById('grid');
  grid.innerHTML = '';

  const firstDay  = new Date(year, month, 1);
  const lastDay   = new Date(year, month + 1, 0);
  const todayStr  = todayKey();

  // How many blank padding cells before the 1st
  const leadingBlanks = isoDayOfWeek(firstDay) - 1;

  // Add leading blank cells (previous month overflow)
  for (let i = 0; i < leadingBlanks; i++) {
    const blank = document.createElement('div');
    blank.className = 'day-cell empty';
    grid.appendChild(blank);
  }

  // Render each day of the month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date    = new Date(year, month, d);
    const key     = toKey(date);
    const entry   = studyData[key];
    const hours   = entry?.hours || 0;
    const level   = hoursToLevel(hours);
    const isToday = key === todayStr;
    const isFuture = date > new Date();

    const cell = document.createElement('div');
    cell.className = 'day-cell';
    cell.dataset.level = level;
    cell.dataset.key   = key;

    if (isToday)  cell.classList.add('today');
    if (isFuture) cell.classList.add('future');

    // Small day number
    const num = document.createElement('span');
    num.className = 'day-num';
    num.textContent = d;
    cell.appendChild(num);

    // Open modal on tap/click
    if (!isFuture) {
      cell.addEventListener('click', () => openModal(key, date));
    }

    grid.appendChild(cell);
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

  // Determine the max possible weekly hours to size progress bars
  const MAX_HOURS = 50;

  let weekNum   = 1;
  let weekHours = 0;
  let weekStart = 1;

  const flush = (weekEnd) => {
    const row = document.createElement('div');
    row.className = 'week-row';

    const pct = Math.min((weekHours / MAX_HOURS) * 100, 100);

    row.innerHTML = `
      <div class="week-label">W${weekNum}</div>
      <div class="week-bar-wrap">
        <div class="week-bar-fill" style="width:${pct}%"></div>
      </div>
      <div class="week-hours">${weekHours}h</div>
    `;
    list.appendChild(row);
    weekNum++;
    weekHours = 0;
  };

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date  = new Date(year, month, d);
    const key   = toKey(date);
    weekHours  += studyData[key]?.hours || 0;

    // End of week = Sunday (isoDayOfWeek === 7) or last day of month
    if (isoDayOfWeek(date) === 7 || d === lastDay.getDate()) {
      flush(d);
      weekStart = d + 1;
    }
  }
}

// ── RENDER HEADER STATS ───────────────────────────────────────────────────────
function renderHeader() {
  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // Month name
  document.getElementById('month-name').textContent =
    new Date(year, month, 1).toLocaleString('default', { month: 'long', year: 'numeric' });

  // Total hours this month
  const lastDay = new Date(year, month + 1, 0).getDate();
  let total = 0;
  for (let d = 1; d <= lastDay; d++) {
    const key = toKey(new Date(year, month, d));
    total += studyData[key]?.hours || 0;
  }
  document.getElementById('month-hours').textContent = total;

  // Quote
  document.getElementById('daily-quote').textContent = getDailyQuote();

  // Streaks
  const { current, best } = calcStreaks();
  document.getElementById('streak-count').textContent = current;
  document.getElementById('best-streak').textContent  = best;
}

// ── FULL RE-RENDER ────────────────────────────────────────────────────────────
function render() {
  renderHeader();
  renderGrid();
  renderWeekly();
}

// ── MODAL ─────────────────────────────────────────────────────────────────────
let modalHours = 0; // local state for the hours picker

function openModal(key, date) {
  editingDateKey = key;
  const entry    = studyData[key] || {};
  modalHours     = entry.hours || 0;

  // Format date nicely
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

  if (modalHours === 0 && !note) {
    // Remove entry if nothing logged
    delete studyData[editingDateKey];
  } else {
    studyData[editingDateKey] = { hours: modalHours, note };
  }

  saveData();
  closeModal();

  // Animate the updated cell
  const cell = document.querySelector(`.day-cell[data-key="${editingDateKey}"]`);
  if (cell) {
    cell.dataset.level = hoursToLevel(modalHours);
    cell.classList.remove('animate');
    // Force reflow to restart animation
    void cell.offsetWidth;
    cell.classList.add('animate');
    setTimeout(() => cell.classList.remove('animate'), 500);
  }

  render();
}

// ── EVENT LISTENERS ───────────────────────────────────────────────────────────
// Month navigation
document.getElementById('prev-month').addEventListener('click', () => {
  viewDate.setMonth(viewDate.getMonth() - 1);
  render();
});
document.getElementById('next-month').addEventListener('click', () => {
  viewDate.setMonth(viewDate.getMonth() + 1);
  render();
});

// Modal controls
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
});
document.getElementById('modal-save').addEventListener('click', saveModal);

document.getElementById('hour-inc').addEventListener('click', () => {
  if (modalHours < 24) modalHours++;
  document.getElementById('hour-display').textContent = modalHours;
});
document.getElementById('hour-dec').addEventListener('click', () => {
  if (modalHours > 0) modalHours--;
  document.getElementById('hour-display').textContent = modalHours;
});

// Export data as JSON
document.getElementById('export-btn').addEventListener('click', () => {
  const json  = JSON.stringify(studyData, null, 2);
  const blob  = new Blob([json], { type: 'application/json' });
  const url   = URL.createObjectURL(blob);
  const a     = document.createElement('a');
  a.href      = url;
  a.download  = `studygrid-${todayKey()}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

// Reset current month
document.getElementById('reset-btn').addEventListener('click', () => {
  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const label = new Date(year, month, 1).toLocaleString('default', { month: 'long' });

  if (!confirm(`Reset all data for ${label} ${year}? This cannot be undone.`)) return;

  const lastDay = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= lastDay; d++) {
    delete studyData[toKey(new Date(year, month, d))];
  }
  saveData();
  render();
});

// Keyboard: Escape closes modal
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// ── PWA INSTALL PROMPT ────────────────────────────────────────────────────────
let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  document.getElementById('install-banner').classList.remove('hidden');
});

document.getElementById('install-btn').addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  document.getElementById('install-banner').classList.add('hidden');
});

document.getElementById('dismiss-install').addEventListener('click', () => {
  document.getElementById('install-banner').classList.add('hidden');
});

// ── SERVICE WORKER REGISTRATION ───────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js')
    .then(() => console.log('[SW] Registered'))
    .catch(e => console.warn('[SW] Registration failed:', e));
}

// ── INIT ──────────────────────────────────────────────────────────────────────
render();
