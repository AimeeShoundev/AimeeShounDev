'use strict';

// All personal entries remain on this device; no analytics or network submission.
const $ = id => document.getElementById(id);
const STORAGE_KEY = 'balanced-bump-v1';
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const mealSlots = ['breakfast', 'lunch', 'dinner', 'snacks'];
const contextLabels = { fasting: 'Fasting', '1hour': '1 hour after a meal', '2hour': '2 hours after a meal', other: 'Other / as directed' };
let state = { plans: {}, readings: [] };
let storageAvailable = true;
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  if (saved && typeof saved === 'object') {
    for (const day of days) {
      if (saved.plans && saved.plans[day] && typeof saved.plans[day] === 'object') {
        state.plans[day] = {};
        for (const slot of mealSlots) state.plans[day][slot] = typeof saved.plans[day][slot] === 'string' ? saved.plans[day][slot] : '';
      }
    }
    if (Array.isArray(saved.readings)) state.readings = saved.readings.filter(r => r && typeof r.id === 'string' && typeof r.value === 'number' && Number.isFinite(r.value) && r.value > 0 && ['mg/dL', 'mmol/L'].includes(r.unit) && Object.hasOwn(contextLabels, r.context) && /^\d{4}-\d{2}-\d{2}$/.test(r.date) && /^\d{2}:\d{2}$/.test(r.time) && typeof r.note === 'string');
  }
} catch (error) { storageAvailable = false; }

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    storageAvailable = true;
    return true;
  } catch (error) {
    storageAvailable = false;
    document.querySelector('.local-badge').textContent = 'Session only · storage unavailable';
    return false;
  }
}
if (!storageAvailable) document.querySelector('.local-badge').textContent = 'Storage unavailable · session only';

// Responsive navigation.
$('menu-toggle').addEventListener('click', () => {
  const open = $('menu-toggle').getAttribute('aria-expanded') !== 'true';
  $('menu-toggle').setAttribute('aria-expanded', String(open));
  $('menu-toggle').setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  $('main-nav').classList.toggle('open', open);
});
document.querySelectorAll('#main-nav a').forEach(link => link.addEventListener('click', () => {
  $('main-nav').classList.remove('open');
  $('menu-toggle').setAttribute('aria-expanded', 'false');
  $('menu-toggle').setAttribute('aria-label', 'Open navigation');
}));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && $('main-nav').classList.contains('open')) {
    $('menu-toggle').click();
    $('menu-toggle').focus();
  }
});

// Meal builder: estimates are total carbohydrate for the specified portions.
const vegetables = {
  broccoli: { name: 'broccoli & bell peppers', carbs: 9 },
  salad: { name: 'leafy greens & cucumber', carbs: 4 },
  beans: { name: 'green beans & zucchini', carbs: 7 }
};
const proteins = {
  salmon: { name: 'Baked salmon', amount: '3 oz cooked salmon', carbs: 0 },
  chicken: { name: 'Grilled chicken', amount: '3 oz cooked chicken', carbs: 0 },
  tofu: { name: 'Firm tofu', amount: '150 g firm tofu', carbs: 4 },
  egg: { name: 'Fully cooked eggs', amount: '2 fully cooked eggs', carbs: 1 }
};
const carbFoods = {
  quinoa: { name: 'quinoa', carbs: 39 },
  rice: { name: 'brown rice', carbs: 45 },
  sweetpotato: { name: 'sweet potato', carbs: 41 },
  lentils: { name: 'lentils', carbs: 40 }
};
const portionLabels = { '0.5': '½ cup', '0.75': '¾ cup', '1': '1 cup' };
let currentMeal = '';
function updateMeal() {
  const veg = vegetables[$('veg').value];
  const protein = proteins[$('protein').value];
  const carb = carbFoods[$('carb').value];
  const portion = $('portion').value;
  const total = Math.round(veg.carbs + protein.carbs + carb.carbs * Number(portion));
  $('meal-title').textContent = `${protein.name} & ${carb.name}`;
  $('meal-description').textContent = `1 cup ${veg.name}, ${protein.amount}, and ${portionLabels[portion]} ${carb.name}.`;
  $('meal-carbs').textContent = `${total} g`;
  currentMeal = `${protein.name} with 1 cup ${veg.name} and ${portionLabels[portion]} ${carb.name} (${protein.amount}; approx. ${total} g total carbohydrate).`;
  $('meal-feedback').textContent = '';
}
['veg', 'protein', 'carb', 'portion'].forEach(id => $(id).addEventListener('change', updateMeal));
updateMeal();

// Reusable weekly planner. Switching days also saves the day being left.
let activeDay = days[(new Date().getDay() + 6) % 7];
let plannerDirty = false;
function capturePlan() {
  state.plans[activeDay] = {};
  mealSlots.forEach(slot => { state.plans[activeDay][slot] = $(`plan-${slot}`).value.trim(); });
  plannerDirty = false;
  return persist();
}
function loadPlan() {
  mealSlots.forEach(slot => { $(`plan-${slot}`).value = state.plans[activeDay]?.[slot] || ''; });
  document.querySelectorAll('#day-tabs button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.day === activeDay)));
  $('planner-form').setAttribute('aria-label', `${activeDay} meal plan`);
  plannerDirty = false;
}
days.forEach(day => {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = day.slice(0, 3);
  button.dataset.day = day;
  button.setAttribute('aria-label', day);
  button.addEventListener('click', () => {
    if (activeDay === day) return;
    const previous = activeDay;
    const hadChanges = plannerDirty;
    const saved = hadChanges ? capturePlan() : true;
    activeDay = day;
    loadPlan();
    $('planner-feedback').textContent = hadChanges ? (saved ? `${previous} saved. Now planning ${day}.` : `${previous} kept for this session only; device storage is unavailable. Now planning ${day}.`) : `Planning ${day}.`;
  });
  $('day-tabs').append(button);
});
mealSlots.forEach(slot => {
  $(`plan-${slot}`).maxLength = 2500;
  $(`plan-${slot}`).addEventListener('input', () => {
    plannerDirty = true;
    $('planner-feedback').textContent = 'Unsaved changes — save this day when you’re ready.';
  });
});
$('planner-form').addEventListener('submit', event => {
  event.preventDefault();
  const saved = capturePlan();
  $('planner-feedback').textContent = saved ? `${activeDay} saved. A little less to think about.` : 'Kept for this session only. Browser storage is unavailable; copy your plan before closing.';
});
loadPlan();
$('save-meal').addEventListener('click', () => {
  const dinner = $('plan-dinner');
  if (!dinner.value.includes(currentMeal)) dinner.value = dinner.value.trim() ? `${dinner.value.trim()}\n${currentMeal}` : currentMeal;
  const saved = capturePlan();
  const message = saved ? `Added to ${activeDay}’s dinner. You can edit it below.` : `Added to ${activeDay}’s dinner for this session only. Browser storage is unavailable.`;
  $('meal-feedback').textContent = message;
  $('planner-feedback').textContent = message;
  $('planner').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  dinner.focus({ preventScroll: true });
});
window.addEventListener('beforeunload', event => {
  if (plannerDirty) { event.preventDefault(); event.returnValue = ''; }
});

// Glucose log deliberately does not classify readings or provide medical advice.
function setCurrentDateTime() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  $('glucose-date').value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  $('glucose-time').value = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}
setCurrentDateTime();
$('glucose-unit').addEventListener('change', () => {
  const mmol = $('glucose-unit').value === 'mmol/L';
  const input = $('glucose-value');
  input.value = '';
  input.min = mmol ? '0.1' : '1';
  input.max = mmol ? '55.5' : '1000';
  input.placeholder = mmol ? 'e.g. 5.1' : 'e.g. 92';
  $('glucose-feedback').textContent = 'Unit changed. Enter your reading in the selected unit.';
});
function readableDate(date, time) {
  const value = new Date(`${date}T${time}`);
  return Number.isNaN(value.getTime()) ? `${date} ${time}` : value.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function renderReadings() {
  const list = $('readings-list');
  list.replaceChildren();
  if (!state.readings.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-log';
    empty.innerHTML = '<span class="empty-icon" aria-hidden="true">⌁</span><h4>A fresh page, just for you.</h4><p>Your readings will appear here. Add your first entry whenever you’re ready.</p>';
    list.append(empty);
    return;
  }
  [...state.readings].sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`)).forEach(reading => {
    const row = document.createElement('article');
    row.className = 'reading';
    const info = document.createElement('div');
    const context = document.createElement('span');
    context.className = 'reading-context';
    context.textContent = contextLabels[reading.context];
    const date = document.createElement('span');
    date.className = 'reading-date';
    date.textContent = readableDate(reading.date, reading.time);
    info.append(context, date);
    if (reading.note) {
      const note = document.createElement('p');
      note.className = 'reading-note';
      note.textContent = reading.note;
      info.append(note);
    }
    const number = document.createElement('div');
    number.className = 'reading-number';
    number.textContent = String(reading.value);
    const unit = document.createElement('small');
    unit.textContent = reading.unit;
    number.append(unit);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'delete-reading';
    remove.textContent = '×';
    remove.setAttribute('aria-label', `Delete ${reading.value} ${reading.unit} reading from ${date.textContent}`);
    remove.addEventListener('click', () => {
      state.readings = state.readings.filter(r => r.id !== reading.id);
      const saved = persist();
      renderReadings();
      $('glucose-feedback').textContent = saved ? 'Reading deleted.' : 'Removed for this session only. Could not update device storage.';
      const next = list.querySelector('.delete-reading');
      (next || $('glucose-value')).focus({ preventScroll: true });
    });
    row.append(info, number, remove);
    list.append(row);
  });
}
$('glucose-form').addEventListener('submit', event => {
  event.preventDefault();
  if (!$('glucose-form').reportValidity()) return;
  state.readings.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    date: $('glucose-date').value,
    time: $('glucose-time').value,
    context: $('glucose-context').value,
    value: Number($('glucose-value').value),
    unit: $('glucose-unit').value,
    note: $('glucose-note').value.trim()
  });
  const saved = persist();
  renderReadings();
  $('glucose-feedback').textContent = saved ? 'Reading saved. Follow your care team’s guidance for your result.' : 'Kept for this session only. Device storage is unavailable; export your readings to keep them.';
  $('glucose-value').value = '';
  $('glucose-note').value = '';
  $('glucose-value').focus({ preventScroll: true });
});
$('export-log').addEventListener('click', () => {
  if (!state.readings.length) {
    $('glucose-feedback').textContent = 'Add a reading first, then export your log.';
    $('glucose-value').focus({ preventScroll: true });
    return;
  }
  function csvCell(value) {
    let text = String(value);
    // Keep user notes from being treated as spreadsheet formulas.
    if (/^[\s]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  }
  const rows = [['Date', 'Time', 'Context', 'Glucose', 'Unit', 'Note'], ...[...state.readings].sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)).map(r => [r.date, r.time, contextLabels[r.context], r.value, r.unit, r.note])];
  const blob = new Blob(['\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'balanced-bump-glucose-log.csv';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  $('glucose-feedback').textContent = 'Your CSV download is ready. Keep this health information somewhere private.';
});
renderReadings();

// Small, curated reference collection; rounded values vary with preparation.
const foods = [
  { name: 'Rolled oats', portion: '½ cup cooked in water', carbs: 14, group: 'Grains & starches', icon: '◒', keywords: 'oatmeal porridge whole grain' },
  { name: 'Brown rice', portion: '½ cup cooked', carbs: 23, group: 'Grains & starches', icon: '◌', keywords: 'grain wholegrain starch' },
  { name: 'Quinoa', portion: '½ cup cooked', carbs: 20, group: 'Grains & starches', icon: '⁙', keywords: 'grain wholegrain' },
  { name: 'Sweet potato', portion: '½ cup baked, cubed', carbs: 21, group: 'Grains & starches', icon: '◓', keywords: 'starch potato' },
  { name: 'Apple', portion: '1 small (about 150 g)', carbs: 21, group: 'Fruit', icon: '♧', keywords: 'fresh whole fruit' },
  { name: 'Blueberries', portion: '½ cup fresh', carbs: 11, group: 'Fruit', icon: '⁙', keywords: 'berry berries fresh' },
  { name: 'Broccoli', portion: '1 cup raw, chopped', carbs: 6, group: 'Vegetables', icon: '♧', keywords: 'non starchy fiber fibre' },
  { name: 'Bell pepper', portion: '1 cup raw, chopped', carbs: 9, group: 'Vegetables', icon: '◒', keywords: 'capsicum non starchy peppers' },
  { name: 'Lentils', portion: '½ cup cooked', carbs: 20, group: 'Protein', icon: '⁙', keywords: 'legumes pulses plant based carbohydrate fiber fibre' },
  { name: 'Firm tofu', portion: '150 g, plain', carbs: 4, group: 'Protein', icon: '▱', keywords: 'soy plant based vegetarian' },
  { name: 'Plain Greek yogurt', portion: '¾ cup (170 g), unsweetened', carbs: 6, group: 'Dairy & alternatives', icon: '◡', keywords: 'yoghurt milk pasteurized protein' },
  { name: 'Milk', portion: '1 cup (240 mL), pasteurized', carbs: 12, group: 'Dairy & alternatives', icon: '♧', keywords: 'dairy calcium' }
];
function renderFoods() {
  const query = $('food-search').value.trim().toLowerCase();
  const category = $('food-category').value;
  const matches = foods.filter(food => (category === 'all' || food.group === category) && `${food.name} ${food.keywords} ${food.group}`.toLowerCase().includes(query));
  $('food-count').textContent = `${matches.length} ${matches.length === 1 ? 'food' : 'foods'} in this collection${query ? ` matching “${$('food-search').value.trim()}”` : ''}`;
  const container = $('food-results');
  container.replaceChildren();
  if (!matches.length) {
    const empty = document.createElement('p');
    empty.className = 'no-results';
    empty.textContent = 'No matches in our small collection. Try a different food or choose “All food groups.”';
    container.append(empty);
  }
  matches.forEach(food => {
    const card = document.createElement('article');
    card.className = 'food-card';
    // This template uses only the curated constants above, never user input.
    card.innerHTML = `<div class="food-card-top"><span class="food-icon" aria-hidden="true">${food.icon}</span><span class="food-group">${food.group}</span></div><h3>${food.name}</h3><p>${food.portion}</p><div class="food-card-bottom"><span>Approx. carbohydrate</span><strong>${food.carbs} g</strong></div>`;
    container.append(card);
  });
}
$('food-search').addEventListener('input', renderFoods);
$('food-category').addEventListener('change', renderFoods);
renderFoods();

// Explicit confirmation before deleting personal data.
$('clear-data').addEventListener('click', () => $('delete-dialog').showModal());
$('cancel-delete').addEventListener('click', () => $('delete-dialog').close());
$('confirm-delete').addEventListener('click', () => {
  let deleted = true;
  try { localStorage.removeItem(STORAGE_KEY); } catch (error) { deleted = false; }
  state = { plans: {}, readings: [] };
  loadPlan();
  renderReadings();
  $('meal-feedback').textContent = '';
  $('planner-feedback').textContent = '';
  $('glucose-feedback').textContent = deleted ? 'All saved meal plans and readings have been deleted from this browser.' : 'Session data cleared. Device storage could not be accessed; also clear this site’s data in browser settings.';
  $('global-status').textContent = $('glucose-feedback').textContent;
  $('delete-dialog').close();
});
