'use strict';

const STORAGE_KEY = 'interval-trainer-data-v1';
const DATA_VERSION = 1;

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
const clone = value => JSON.parse(JSON.stringify(value));

const defaults = {
  version: DATA_VERSION,
  preferences: { sound: true, vibration: true, speech: true, tenSecondWarning: true, voiceURI: '', selectedPlanId: 'lower-back' },
  bank: [
    { id: 'dead-bug', name: 'Dead bug', type: 'exercise', duration: 40 },
    { id: 'bird-dog', name: 'Bird dog', type: 'exercise', duration: 40 },
    { id: 'plank', name: 'Plank', type: 'exercise', duration: 30 },
    { id: 'side-plank-left', name: 'Side plank — left', type: 'exercise', duration: 30 },
    { id: 'side-plank-right', name: 'Side plank — right', type: 'exercise', duration: 30 },
    { id: 'chin-tucks', name: 'Chin tucks', type: 'exercise', duration: 30 },
    { id: 'wall-angels', name: 'Wall angels', type: 'exercise', duration: 40 },
    { id: 'calf-stretch-left', name: 'Calf stretch — left', type: 'stretch', duration: 30 },
    { id: 'calf-stretch-right', name: 'Calf stretch — right', type: 'stretch', duration: 30 },
    { id: 'glute-stretch-left', name: 'Glute stretch — left', type: 'stretch', duration: 30 },
    { id: 'glute-stretch-right', name: 'Glute stretch — right', type: 'stretch', duration: 30 },
    { id: 'hip-stretch-left', name: 'Hip flexor stretch — left', type: 'stretch', duration: 30 },
    { id: 'hip-stretch-right', name: 'Hip flexor stretch — right', type: 'stretch', duration: 30 },
    { id: 'lat-stretch', name: 'Lat stretch', type: 'stretch', duration: 30 },
    { id: 'chest-stretch', name: 'Chest stretch', type: 'stretch', duration: 30 },
    { id: 'shoulder-stretch', name: 'Shoulder stretch', type: 'stretch', duration: 30 },
    { id: 'hamstring-stretch', name: 'Hamstring stretch', type: 'stretch', duration: 30 },
    { id: 'quad-stretch', name: 'Quad stretch', type: 'stretch', duration: 30 }
  ],
  plans: [
    { id: 'lower-back', name: 'Lower Back', restDuration: 20, intervals: [
      { id: uid(), name: 'Dead bug', duration: 40, bankId: 'dead-bug' },
      { id: uid(), name: 'Bird dog', duration: 40, bankId: 'bird-dog' },
      { id: uid(), name: 'Plank', duration: 30, bankId: 'plank' },
      { id: uid(), name: 'Side plank — left', duration: 30, bankId: 'side-plank-left' },
      { id: uid(), name: 'Side plank — right', duration: 30, bankId: 'side-plank-right' }
    ]},
    { id: 'posture-work', name: 'Posture Work', restDuration: 15, intervals: [
      { id: uid(), name: 'Chin tucks', duration: 30, bankId: 'chin-tucks' },
      { id: uid(), name: 'Wall angels', duration: 40, bankId: 'wall-angels' },
      { id: uid(), name: 'Shoulder blade squeezes', duration: 30, bankId: null }
    ]},
    { id: 'whole-body-stretch', name: 'Whole Body Stretch', restDuration: 5, intervals: [
      { id: uid(), name: 'Calf stretch — left', duration: 30, bankId: 'calf-stretch-left' },
      { id: uid(), name: 'Calf stretch — right', duration: 30, bankId: 'calf-stretch-right' },
      { id: uid(), name: 'Hamstring stretch', duration: 30, bankId: 'hamstring-stretch' },
      { id: uid(), name: 'Quad stretch', duration: 30, bankId: 'quad-stretch' },
      { id: uid(), name: 'Glute stretch — left', duration: 30, bankId: 'glute-stretch-left' },
      { id: uid(), name: 'Glute stretch — right', duration: 30, bankId: 'glute-stretch-right' },
      { id: uid(), name: 'Hip flexor stretch — left', duration: 30, bankId: 'hip-stretch-left' },
      { id: uid(), name: 'Hip flexor stretch — right', duration: 30, bankId: 'hip-stretch-right' },
      { id: uid(), name: 'Lat stretch', duration: 30, bankId: 'lat-stretch' },
      { id: uid(), name: 'Chest stretch', duration: 30, bankId: 'chest-stretch' },
      { id: uid(), name: 'Shoulder stretch', duration: 30, bankId: 'shoulder-stretch' }
    ]}
  ]
};

let data = loadData();
let timer = { planId: data.preferences.selectedPlanId, index: 0, remainingMs: 0, running: false, finished: false, warned10: false, endAt: 0, frame: null };
let wakeLock = null;
let deferredInstall = null;
let pendingImport = null;
let audioContext = null;
let activeUtterance = null;
let speechRetryTimer = null;

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const els = {
  tabs: $$('.tab'), views: $$('.view'), timerPlanSelect: $('#timerPlanSelect'), intervalPosition: $('#intervalPosition'),
  totalRemaining: $('#totalRemaining'), overallProgress: $('#overallProgress'), timerStage: $('#timerStage'), timerStatus: $('#timerStatus'),
  timerHeading: $('#timerHeading'), timeDisplay: $('#timeDisplay'), nextInterval: $('#nextInterval'), previousBtn: $('#previousBtn'),
  startPauseBtn: $('#startPauseBtn'), skipBtn: $('#skipBtn'), resetBtn: $('#resetBtn'), soundToggle: $('#soundToggle'),
  vibrationToggle: $('#vibrationToggle'), speechToggle: $('#speechToggle'), warningToggle: $('#warningToggle'), voiceSelect: $('#voiceSelect'), testVoiceBtn: $('#testVoiceBtn'), planRestTime: $('#planRestTime'), timerQueue: $('#timerQueue'), queuePlanName: $('#queuePlanName'), plansGrid: $('#plansGrid'),
  bankGrid: $('#bankGrid'), bankSearch: $('#bankSearch'), bankFilter: $('#bankFilter'), planDialog: $('#planDialog'), planForm: $('#planForm'),
  planDialogTitle: $('#planDialogTitle'), planId: $('#planId'), planName: $('#planName'), planRestDuration: $('#planRestDuration'), planRepeats: $('#planRepeats'), intervalEditor: $('#intervalEditor'),
  exerciseDialog: $('#exerciseDialog'), exerciseForm: $('#exerciseForm'), exerciseDialogTitle: $('#exerciseDialogTitle'),
  exerciseId: $('#exerciseId'), exerciseName: $('#exerciseName'), exerciseType: $('#exerciseType'), exerciseDuration: $('#exerciseDuration'),
  importFile: $('#importFile'), importDialog: $('#importDialog'), importSummary: $('#importSummary'), toast: $('#toast'), installBtn: $('#installBtn')
};

function loadData() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (isValidData(parsed)) return migrateData(parsed);
  } catch (error) { console.warn('Could not load saved data', error); }
  return clone(defaults);
}

function saveData() { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
function isValidData(value) {
  return value && Array.isArray(value.plans) && Array.isArray(value.bank) && value.preferences &&
    value.plans.every(p => typeof p.name === 'string' && Array.isArray(p.intervals) && p.intervals.every(i => typeof i.name === 'string' && Number.isFinite(Number(i.duration)) && Number(i.duration) > 0)) &&
    value.bank.every(i => typeof i.name === 'string' && ['exercise', 'stretch', 'rest'].includes(i.type) && Number.isFinite(Number(i.duration)) && Number(i.duration) > 0);
}

function normalizeData(value) {
  return {
    version: DATA_VERSION,
    preferences: { sound: value.preferences?.sound !== false, vibration: value.preferences?.vibration !== false, speech: value.preferences?.speech === true, tenSecondWarning: value.preferences?.tenSecondWarning !== false, voiceURI: value.preferences?.voiceURI || '', selectedPlanId: value.preferences?.selectedPlanId || value.plans[0]?.id || null },
    bank: value.bank.map(item => ({ id: item.id || uid(), name: item.name.trim(), type: item.type, duration: Math.round(Number(item.duration)) })),
    plans: value.plans.map(plan => ({ id: plan.id || uid(), name: plan.name.trim(), restDuration: Math.max(0, Math.round(Number(plan.restDuration) || 0)), repeats: Math.max(1, Math.round(Number(plan.repeats) || 1)), intervals: plan.intervals.map(item => ({ id: item.id || uid(), name: item.name.trim(), duration: Math.round(Number(item.duration)), bankId: item.bankId || null })) }))
  };
}

function migrateData(value) {
  const planIds = value.plans.map(plan => plan.id).sort().join(',');
  if (planIds === 'desk-reset,quick-hiit') return clone(defaults);
  const migrated = normalizeData(value);
  migrated.plans.forEach(plan => {
    const rests = plan.intervals.filter(item => item.bankId === 'rest' || item.name.trim().toLowerCase() === 'rest');
    if (!plan.restDuration && rests.length) plan.restDuration = rests[0].duration;
    if (rests.length) plan.intervals = plan.intervals.filter(item => !rests.includes(item));
  });
  migrated.bank = migrated.bank.filter(item => item.type !== 'rest');
  return migrated;
}

function currentPlan() { return data.plans.find(p => p.id === timer.planId) || data.plans[0] || null; }
function workoutSequence(plan = currentPlan()) {
  if (!plan) return [];
  const sequence = [];
  const repeats = Math.max(1, Number(plan.repeats) || 1);
  for (let repeat = 0; repeat < repeats; repeat += 1) plan.intervals.forEach((item, index) => {
    sequence.push({ ...item, sequenceId: `${item.id}-${repeat}`, repeat: repeat + 1 });
    const isFinalExercise = repeat === repeats - 1 && index === plan.intervals.length - 1;
    if (plan.restDuration > 0 && !isFinalExercise) sequence.push({ id: `rest-${item.id}-${repeat}`, name: 'Rest', duration: plan.restDuration, bankId: null, generatedRest: true, repeat: repeat + 1 });
  });
  return sequence;
}
function currentInterval() { return workoutSequence()[timer.index] || null; }
function formatTime(seconds) { const safe = Math.max(0, Math.ceil(seconds)); return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`; }
function totalDuration(plan) { return workoutSequence(plan).reduce((sum, item) => sum + Number(item.duration), 0); }
function toast(message) { els.toast.textContent = message; els.toast.classList.add('show'); clearTimeout(toast.timeout); toast.timeout = setTimeout(() => els.toast.classList.remove('show'), 2600); }

function setView(name) {
  els.tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.view === name));
  els.views.forEach(view => view.classList.toggle('active', view.id === `${name}View`));
  history.replaceState(null, '', `#${name}`);
}

function renderAll() { renderPlanSelect(); renderPlans(); renderBank(); resetTimer(false); els.soundToggle.checked = data.preferences.sound; els.vibrationToggle.checked = data.preferences.vibration; els.speechToggle.checked = data.preferences.speech; els.warningToggle.checked = data.preferences.tenSecondWarning; renderVoices(); }

function renderPlanSelect() {
  els.timerPlanSelect.innerHTML = data.plans.length ? data.plans.map(plan => `<option value="${escapeHtml(plan.id)}">${escapeHtml(plan.name)}</option>`).join('') : '<option value="">No plans yet</option>';
  if (!data.plans.some(p => p.id === timer.planId)) timer.planId = data.plans[0]?.id || null;
  els.timerPlanSelect.value = timer.planId || '';
}

function renderPlans() {
  els.plansGrid.innerHTML = data.plans.length ? data.plans.map(plan => `<article class="item-card">
    <span class="type-pill">Workout</span><h2>${escapeHtml(plan.name)}</h2>
    <p class="card-meta">${plan.intervals.length} exercise${plan.intervals.length === 1 ? '' : 's'} · ${plan.repeats || 1}× · ${plan.restDuration || 0}s rest · ${formatTime(totalDuration(plan))}</p>
    <div class="card-actions"><button class="button primary compact" data-action="use-plan" data-id="${escapeHtml(plan.id)}">Use</button><button class="button secondary compact" data-action="edit-plan" data-id="${escapeHtml(plan.id)}">Edit</button><button class="button ghost compact" data-action="duplicate-plan" data-id="${escapeHtml(plan.id)}">Copy</button><button class="button danger ghost compact" data-action="delete-plan" data-id="${escapeHtml(plan.id)}" aria-label="Delete ${escapeHtml(plan.name)}">×</button></div>
  </article>`).join('') : '<div class="empty">No workout plans yet. Create one to begin.</div>';
}

function renderBank() {
  const term = els.bankSearch.value.trim().toLowerCase(); const filter = els.bankFilter.value;
  const items = data.bank.filter(item => (!term || item.name.toLowerCase().includes(term)) && (filter === 'all' || item.type === filter));
  els.bankGrid.innerHTML = items.length ? items.map(item => `<article class="item-card">
    <span class="type-pill">${escapeHtml(item.type)}</span><h2>${escapeHtml(item.name)}</h2><p class="card-meta">Default · ${formatTime(item.duration)}</p>
    <div class="card-actions"><button class="button secondary compact" data-action="edit-exercise" data-id="${escapeHtml(item.id)}">Edit</button><button class="button danger ghost compact" data-action="delete-exercise" data-id="${escapeHtml(item.id)}">Delete</button></div>
  </article>`).join('') : '<div class="empty">No bank items match this view.</div>';
}

function renderTimer() {
  const plan = currentPlan(); const sequence = workoutSequence(plan); const interval = currentInterval();
  if (!plan || !interval) {
    els.timerHeading.textContent = plan ? 'Add an interval' : 'Create a workout plan'; els.timeDisplay.textContent = '00:00'; els.timerStatus.textContent = 'Ready';
    els.intervalPosition.textContent = '0 of 0'; els.totalRemaining.textContent = 'Total 00:00'; els.nextInterval.textContent = 'Next: —'; els.timerQueue.innerHTML = '';
    els.queuePlanName.textContent = plan?.name || 'Intervals'; els.planRestTime.textContent = plan ? `Rest between exercises: ${plan.restDuration || 0} seconds` : 'Rest between exercises: —'; els.startPauseBtn.disabled = true; els.previousBtn.disabled = true; els.skipBtn.disabled = true; els.overallProgress.style.width = '0%'; return;
  }
  const elapsedBefore = sequence.slice(0, timer.index).reduce((sum, item) => sum + Number(item.duration), 0);
  const elapsedCurrent = Number(interval.duration) - timer.remainingMs / 1000;
  const duration = totalDuration(plan); const totalLeft = Math.max(0, duration - elapsedBefore - elapsedCurrent);
  els.timerHeading.textContent = interval.name; els.timeDisplay.textContent = formatTime(timer.remainingMs / 1000);
  els.timerStatus.textContent = timer.finished ? 'Complete' : timer.running ? 'In progress' : timer.remainingMs < interval.duration * 1000 ? 'Paused' : 'Ready';
  els.timerStage.dataset.state = timer.finished ? 'finished' : timer.running ? 'running' : 'ready';
  els.intervalPosition.textContent = `${timer.index + 1} of ${sequence.length}`; els.totalRemaining.textContent = `Total ${formatTime(totalLeft)}`;
  els.nextInterval.textContent = `Next: ${sequence[timer.index + 1]?.name || 'Workout complete'}`; els.queuePlanName.textContent = plan.name;
  els.planRestTime.textContent = `${plan.repeats || 1} repeat${(plan.repeats || 1) === 1 ? '' : 's'} · Rest between exercises: ${plan.restDuration || 0} seconds`;
  els.startPauseBtn.textContent = timer.finished ? 'Restart' : timer.running ? 'Pause' : timer.remainingMs < interval.duration * 1000 ? 'Resume' : 'Start';
  els.startPauseBtn.disabled = false; els.previousBtn.disabled = timer.index === 0 && timer.remainingMs === interval.duration * 1000; els.skipBtn.disabled = false;
  els.overallProgress.style.width = `${duration ? Math.min(100, ((elapsedBefore + elapsedCurrent) / duration) * 100) : 0}%`;
  els.timerQueue.innerHTML = sequence.map((item, index) => `<li class="${index === timer.index ? 'active' : ''}"><span class="queue-index">${index + 1}</span><span>${escapeHtml(item.name)}</span><span>${formatTime(item.duration)}</span></li>`).join('');
}

function resetTimer(render = true) {
  stopTicking(); timer.index = 0; timer.finished = false; timer.warned10 = false; const interval = currentInterval(); timer.remainingMs = interval ? interval.duration * 1000 : 0;
  releaseWakeLock(); if (render) renderTimer(); else renderTimer();
}

function startPause() {
  if (timer.finished) resetTimer();
  if (timer.running) { timer.remainingMs = Math.max(0, timer.endAt - performance.now()); stopTicking(); releaseWakeLock(); renderTimer(); return; }
  if (!currentInterval()) return;
  unlockAudio(); timer.running = true; timer.endAt = performance.now() + timer.remainingMs; requestWakeLock(); speakInterval(currentInterval()); tick(); renderTimer();
}

function tick() {
  if (!timer.running) return;
  timer.remainingMs = Math.max(0, timer.endAt - performance.now());
  if (data.preferences.tenSecondWarning && !timer.warned10 && currentInterval()?.duration > 10 && timer.remainingMs <= 10000 && timer.remainingMs > 0) { timer.warned10 = true; speakInterval({ name: '10 seconds remaining' }); }
  if (timer.remainingMs <= 0) { advanceInterval(); return; }
  renderTimer(); timer.frame = requestAnimationFrame(tick);
}

function stopTicking() { timer.running = false; if (timer.frame) cancelAnimationFrame(timer.frame); timer.frame = null; }
function advanceInterval() {
  const sequence = workoutSequence(); cue();
  if (timer.index < sequence.length - 1) { timer.index += 1; timer.warned10 = false; timer.remainingMs = sequence[timer.index].duration * 1000; if (timer.running) timer.endAt = performance.now() + timer.remainingMs; speakInterval(currentInterval()); renderTimer(); if (timer.running) timer.frame = requestAnimationFrame(tick); }
  else { stopTicking(); timer.finished = true; timer.remainingMs = 0; releaseWakeLock(); renderTimer(); }
}
function skip() { if (!currentPlan()) return; const wasRunning = timer.running; const sequence = workoutSequence(); stopTicking(); if (timer.index < sequence.length - 1) { timer.index++; timer.warned10 = false; timer.remainingMs = currentInterval().duration * 1000; timer.finished = false; speakInterval(currentInterval()); } else { timer.finished = true; timer.remainingMs = 0; } if (wasRunning && !timer.finished) { timer.running = true; timer.endAt = performance.now() + timer.remainingMs; tick(); } renderTimer(); }
function previous() { if (!currentPlan()) return; const wasRunning = timer.running; stopTicking(); if (timer.remainingMs < currentInterval().duration * 700) timer.remainingMs = currentInterval().duration * 1000; else if (timer.index > 0) { timer.index--; timer.remainingMs = currentInterval().duration * 1000; } timer.warned10 = false; timer.finished = false; if (wasRunning) { timer.running = true; timer.endAt = performance.now() + timer.remainingMs; tick(); } renderTimer(); }

function unlockAudio() { if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)(); if (audioContext.state === 'suspended') audioContext.resume(); }
function cue() {
  if (data.preferences.sound) { unlockAudio(); const osc = audioContext.createOscillator(); const gain = audioContext.createGain(); osc.frequency.value = timer.index === workoutSequence().length - 1 ? 880 : 660; gain.gain.setValueAtTime(.12, audioContext.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + .28); osc.connect(gain).connect(audioContext.destination); osc.start(); osc.stop(audioContext.currentTime + .3); }
  if (data.preferences.vibration && navigator.vibrate) navigator.vibrate([160, 70, 160]);
}
function renderVoices() {
  if (!('speechSynthesis' in window)) { els.speechToggle.disabled = true; els.voiceSelect.innerHTML = '<option>Not supported</option>'; return; }
  const voices = speechSynthesis.getVoices();
  els.voiceSelect.innerHTML = `<option value="">System default</option>${voices.map(voice => `<option value="${escapeHtml(voice.voiceURI)}" ${voice.voiceURI === data.preferences.voiceURI ? 'selected' : ''}>${escapeHtml(voice.name)} (${escapeHtml(voice.lang)})</option>`).join('')}`;
  els.voiceSelect.value = voices.some(voice => voice.voiceURI === data.preferences.voiceURI) ? data.preferences.voiceURI : '';
}
function speakInterval(interval) {
  if (!data.preferences.speech || !interval || !('speechSynthesis' in window)) return;
  clearTimeout(speechRetryTimer);
  const speak = () => {
    activeUtterance = new SpeechSynthesisUtterance(interval.name);
    activeUtterance.volume = 1; activeUtterance.rate = .95; activeUtterance.pitch = 1;
    const selected = speechSynthesis.getVoices().find(voice => voice.voiceURI === data.preferences.voiceURI); if (selected) { activeUtterance.voice = selected; activeUtterance.lang = selected.lang; }
    activeUtterance.onend = activeUtterance.onerror = () => { activeUtterance = null; };
    if (speechSynthesis.paused) speechSynthesis.resume(); speechSynthesis.speak(activeUtterance);
  };
  if (speechSynthesis.speaking || speechSynthesis.pending) { speechSynthesis.cancel(); speechRetryTimer = setTimeout(speak, 80); } else speak();
}
function testVoice() {
  if (!('speechSynthesis' in window)) { toast('Text-to-speech is not supported in this browser'); return; }
  data.preferences.speech = true; els.speechToggle.checked = true; saveData();
  speakInterval({ name: 'Voice announcements are ready' });
}
async function requestWakeLock() { try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch (error) { console.info('Wake lock unavailable', error); } }
function releaseWakeLock() { if (wakeLock) wakeLock.release().catch(() => {}); wakeLock = null; }

function openPlanEditor(id = null) {
  const plan = id ? data.plans.find(p => p.id === id) : null; els.planId.value = plan?.id || ''; els.planName.value = plan?.name || ''; els.planDialogTitle.textContent = plan ? 'Edit plan' : 'New plan';
  els.planRestDuration.value = plan?.restDuration ?? 20;
  els.planRepeats.value = plan?.repeats ?? 1;
  els.intervalEditor.innerHTML = ''; (plan?.intervals || [{ id: uid(), name: '', duration: 30, bankId: null }]).forEach(addIntervalRow); els.planDialog.showModal(); setTimeout(() => els.planName.focus(), 0);
}
function addIntervalRow(item = { id: uid(), name: '', duration: 30, bankId: null }) {
  const row = document.createElement('div'); row.className = 'interval-row'; row.dataset.id = item.id || uid(); row.dataset.bankId = item.bankId || '';
  row.innerHTML = `<span class="drag-handle">⋮⋮</span><div><div class="source-toggle"><button type="button" data-source="bank" class="${item.bankId ? 'active' : ''}">Bank</button><button type="button" data-source="manual" class="${item.bankId ? '' : 'active'}">Manual</button></div><select class="interval-bank" ${item.bankId ? '' : 'hidden disabled'} aria-label="Bank item">${data.bank.filter(bank => bank.type !== 'rest').map(bank => `<option value="${escapeHtml(bank.id)}" ${bank.id === item.bankId ? 'selected' : ''}>${escapeHtml(bank.name)}</option>`).join('')}</select><input class="interval-name" maxlength="80" required placeholder="Interval name" value="${escapeHtml(item.name)}" ${item.bankId ? 'hidden disabled' : ''}></div><label>Seconds<input class="interval-duration" type="number" min="1" max="86400" required inputmode="numeric" value="${Number(item.duration) || 30}"></label><button type="button" class="remove-interval" aria-label="Remove interval">×</button>`;
  els.intervalEditor.appendChild(row);
}
function savePlan(event) {
  event.preventDefault(); if (!els.planForm.reportValidity()) return;
  const intervals = $$('.interval-row').map(row => { const bankId = row.dataset.bankId || null; const bankItem = data.bank.find(i => i.id === bankId); return { id: row.dataset.id || uid(), name: bankId ? bankItem?.name || 'Untitled' : row.querySelector('.interval-name').value.trim(), duration: Math.round(Number(row.querySelector('.interval-duration').value)), bankId }; });
  if (!intervals.length) { toast('Add at least one interval'); return; }
  const id = els.planId.value; const plan = { id: id || uid(), name: els.planName.value.trim(), restDuration: Math.max(0, Math.round(Number(els.planRestDuration.value))), repeats: Math.max(1, Math.round(Number(els.planRepeats.value))), intervals };
  if (id) data.plans[data.plans.findIndex(p => p.id === id)] = plan; else data.plans.push(plan);
  timer.planId = plan.id; data.preferences.selectedPlanId = plan.id; saveData(); els.planDialog.close(); renderAll(); toast(id ? 'Plan updated' : 'Plan created');
}

function openExerciseEditor(id = null) { const item = id ? data.bank.find(i => i.id === id) : null; els.exerciseId.value = item?.id || ''; els.exerciseName.value = item?.name || ''; els.exerciseType.value = item?.type || 'exercise'; els.exerciseDuration.value = item?.duration || 30; els.exerciseDialogTitle.textContent = item ? 'Edit item' : 'Add item'; els.exerciseDialog.showModal(); }
function saveExercise(event) { event.preventDefault(); if (!els.exerciseForm.reportValidity()) return; const id = els.exerciseId.value; const item = { id: id || uid(), name: els.exerciseName.value.trim(), type: els.exerciseType.value, duration: Math.round(Number(els.exerciseDuration.value)) }; if (id) data.bank[data.bank.findIndex(i => i.id === id)] = item; else data.bank.push(item); saveData(); els.exerciseDialog.close(); renderBank(); toast(id ? 'Bank item updated' : 'Bank item added'); }

function exportData() { const payload = { app: 'Interval Trainer', exportedAt: new Date().toISOString(), version: DATA_VERSION, preferences: data.preferences, bank: data.bank, plans: data.plans }; const blob = new Blob([JSON.stringify(payload, null, 2) + '\n'], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `interval-trainer-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url); toast('JSON exported'); }
async function readImport(file) { try { const parsed = JSON.parse(await file.text()); if (!isValidData(parsed)) throw new Error('The file does not contain valid Interval Trainer data.'); pendingImport = migrateData(parsed); els.importSummary.textContent = `${pendingImport.plans.length} plan(s) and ${pendingImport.bank.length} bank item(s) are ready to import.`; els.importDialog.showModal(); } catch (error) { toast(error.message || 'Could not read that file'); } finally { els.importFile.value = ''; } }
function applyImport(mode) { if (!pendingImport) return; if (mode === 'replace') data = pendingImport; else { const existingPlanIds = new Set(data.plans.map(i => i.id)); const existingBankIds = new Set(data.bank.map(i => i.id)); const incomingBank = pendingImport.bank.map(i => existingBankIds.has(i.id) ? { ...i, id: uid() } : i); const idMap = new Map(pendingImport.bank.map((old, idx) => [old.id, incomingBank[idx].id])); const incomingPlans = pendingImport.plans.map(p => ({ ...p, id: existingPlanIds.has(p.id) ? uid() : p.id, name: data.plans.some(x => x.name === p.name) ? `${p.name} (imported)` : p.name, intervals: p.intervals.map(i => ({ ...i, id: uid(), bankId: idMap.get(i.bankId) || i.bankId })) })); data.bank.push(...incomingBank); data.plans.push(...incomingPlans); } timer.planId = data.preferences.selectedPlanId || data.plans[0]?.id; saveData(); pendingImport = null; renderAll(); toast(`Data ${mode === 'replace' ? 'replaced' : 'merged'}`); }

function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[char]); }

els.tabs.forEach(tab => tab.addEventListener('click', () => setView(tab.dataset.view)));
els.timerPlanSelect.addEventListener('change', () => { timer.planId = els.timerPlanSelect.value; data.preferences.selectedPlanId = timer.planId; saveData(); resetTimer(); });
els.startPauseBtn.addEventListener('click', startPause); els.skipBtn.addEventListener('click', skip); els.previousBtn.addEventListener('click', previous); els.resetBtn.addEventListener('click', () => resetTimer());
els.soundToggle.addEventListener('change', () => { data.preferences.sound = els.soundToggle.checked; saveData(); if (els.soundToggle.checked) unlockAudio(); });
els.vibrationToggle.addEventListener('change', () => { data.preferences.vibration = els.vibrationToggle.checked; saveData(); });
els.speechToggle.addEventListener('change', () => { data.preferences.speech = els.speechToggle.checked; saveData(); if (els.speechToggle.checked) speakInterval(currentInterval()); else if ('speechSynthesis' in window) speechSynthesis.cancel(); });
els.warningToggle.addEventListener('change', () => { data.preferences.tenSecondWarning = els.warningToggle.checked; saveData(); });
els.voiceSelect.addEventListener('change', () => { data.preferences.voiceURI = els.voiceSelect.value; saveData(); if (data.preferences.speech) speakInterval(currentInterval()); });
els.testVoiceBtn.addEventListener('click', testVoice);
$$('[data-close]').forEach(button => button.addEventListener('click', () => document.getElementById(button.dataset.close).close()));
$('#newPlanBtn').addEventListener('click', () => openPlanEditor()); $('#editCurrentPlanBtn').addEventListener('click', () => currentPlan() ? openPlanEditor(currentPlan().id) : openPlanEditor());
$('#addIntervalBtn').addEventListener('click', () => addIntervalRow()); els.planForm.addEventListener('submit', savePlan);
els.intervalEditor.addEventListener('click', event => { const row = event.target.closest('.interval-row'); if (!row) return; if (event.target.matches('.remove-interval')) row.remove(); if (event.target.dataset.source) { const bankMode = event.target.dataset.source === 'bank'; const bankSelect = row.querySelector('.interval-bank'); const manualInput = row.querySelector('.interval-name'); row.dataset.bankId = bankMode ? bankSelect.value || data.bank.find(item => item.type !== 'rest')?.id || '' : ''; bankSelect.hidden = !bankMode; bankSelect.disabled = !bankMode; manualInput.hidden = bankMode; manualInput.disabled = bankMode; row.querySelectorAll('[data-source]').forEach(b => b.classList.toggle('active', b === event.target)); if (bankMode) { const bank = data.bank.find(i => i.id === row.dataset.bankId); if (bank) row.querySelector('.interval-duration').value = bank.duration; } } });
els.intervalEditor.addEventListener('change', event => { if (event.target.matches('.interval-bank')) { const row = event.target.closest('.interval-row'); row.dataset.bankId = event.target.value; const bank = data.bank.find(i => i.id === event.target.value); if (bank) row.querySelector('.interval-duration').value = bank.duration; } });
els.plansGrid.addEventListener('click', event => { const button = event.target.closest('[data-action]'); if (!button) return; const plan = data.plans.find(p => p.id === button.dataset.id); if (button.dataset.action === 'use-plan') { timer.planId = plan.id; data.preferences.selectedPlanId = plan.id; saveData(); resetTimer(); setView('timer'); } if (button.dataset.action === 'edit-plan') openPlanEditor(plan.id); if (button.dataset.action === 'duplicate-plan') { const copy = clone(plan); copy.id = uid(); copy.name += ' copy'; copy.intervals.forEach(i => i.id = uid()); data.plans.push(copy); saveData(); renderPlans(); toast('Plan copied'); } if (button.dataset.action === 'delete-plan' && confirm(`Delete “${plan.name}”?`)) { data.plans = data.plans.filter(p => p.id !== plan.id); timer.planId = data.plans[0]?.id || null; data.preferences.selectedPlanId = timer.planId; saveData(); renderAll(); } });
$('#newExerciseBtn').addEventListener('click', () => openExerciseEditor()); els.exerciseForm.addEventListener('submit', saveExercise); els.bankSearch.addEventListener('input', renderBank); els.bankFilter.addEventListener('change', renderBank);
els.bankGrid.addEventListener('click', event => { const button = event.target.closest('[data-action]'); if (!button) return; const item = data.bank.find(i => i.id === button.dataset.id); if (button.dataset.action === 'edit-exercise') openExerciseEditor(item.id); if (button.dataset.action === 'delete-exercise' && confirm(`Delete “${item.name}” from the bank? Existing plan intervals will keep their names and durations.`)) { data.bank = data.bank.filter(i => i.id !== item.id); data.plans.forEach(p => p.intervals.forEach(i => { if (i.bankId === item.id) i.bankId = null; })); saveData(); renderBank(); } });
$('#exportBtn').addEventListener('click', exportData); $('#chooseImportBtn').addEventListener('click', () => els.importFile.click()); els.importFile.addEventListener('change', () => els.importFile.files[0] && readImport(els.importFile.files[0]));
$('#mergeImportBtn').addEventListener('click', () => applyImport('merge')); $('#replaceImportBtn').addEventListener('click', () => applyImport('replace'));
$('#restoreDefaultsBtn').addEventListener('click', () => { if (confirm('Replace all current data with the sample plans and bank?')) { data = clone(defaults); timer.planId = data.preferences.selectedPlanId; saveData(); renderAll(); toast('Sample data restored'); } });
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); deferredInstall = event; els.installBtn.hidden = false; });
els.installBtn.addEventListener('click', async () => { if (!deferredInstall) return; deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; els.installBtn.hidden = true; });
window.addEventListener('appinstalled', () => { els.installBtn.hidden = true; toast('App installed'); });
if ('speechSynthesis' in window) speechSynthesis.addEventListener('voiceschanged', renderVoices);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && timer.running) { timer.remainingMs = Math.max(0, timer.endAt - performance.now()); if (timer.remainingMs <= 0) advanceInterval(); requestWakeLock(); } });
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('service-worker.js').catch(error => console.warn('Service worker registration failed', error)));

setView(['timer','plans','bank','settings'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'timer');
renderAll();
