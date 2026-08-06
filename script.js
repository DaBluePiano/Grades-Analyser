// script.js - Weighted Grade Calculator (Feature-Rich Edition)

let subjects = [];
let nextId = 0;
let taskCounters = {};
let targetGrades = {};
let chartInstances = {};
let undoStack = [];
let redoStack = [];
let bulkEditMode = false;
let shareLinkData = '';

const DEFAULT_SUBJECTS = [
  "Maths (Core)", "Maths (Path)", "English", "Science", "HSIE", "PDHPE", "Electronics", "Music", "STEM"
];

const COLORS = [
  '#7b61ff', '#ff6b6b', '#4ecdc4', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3'
];

const MAX_UNDO = 20;

/* ========== UNDO / REDO ========== */
function pushUndoSnapshot() {
  const snap = JSON.stringify({ subjects, nextId, taskCounters, targetGrades });
  undoStack.push(snap);
  if (undoStack.length > MAX_UNDO) undoStack.shift();
  redoStack = [];
  updateUndoRedoButtons();
}

function undo() {
  if (undoStack.length === 0) return;
  redoStack.push(JSON.stringify({ subjects, nextId, taskCounters, targetGrades }));
  const snap = JSON.parse(undoStack.pop());
  restoreSnapshot(snap);
  updateUndoRedoButtons();
}

function redo() {
  if (redoStack.length === 0) return;
  undoStack.push(JSON.stringify({ subjects, nextId, taskCounters, targetGrades }));
  const snap = JSON.parse(redoStack.pop());
  restoreSnapshot(snap);
  updateUndoRedoButtons();
}

function restoreSnapshot(snap) {
  subjects = snap.subjects; nextId = snap.nextId; taskCounters = snap.taskCounters; targetGrades = snap.targetGrades || {};
  document.getElementById('subjectsContainer').innerHTML = '';
  renderSavedSubjects();
  saveToLocalStorage();
}

function updateUndoRedoButtons() {
  const u = document.getElementById('undoBtn');
  const r = document.getElementById('redoBtn');
  u.classList.toggle('active', undoStack.length > 0);
  r.classList.toggle('active', redoStack.length > 0);
}

function toggleSubject(id) {
  const card = document.getElementById(`sub-${id}`);
  if (!card) return;
  const collapsed = card.classList.toggle('collapsed');
  const icon = card.querySelector('.collapse-btn .material-icons');
  if (icon) icon.textContent = collapsed ? 'expand_more' : 'expand_less';
}

document.getElementById('undoBtn').addEventListener('click', undo);
document.getElementById('redoBtn').addEventListener('click', redo);

/* ========== SAVE STATUS ========== */
let saveTimeout;
function showSaveStatus(msg = 'Saved') {
  const el = document.getElementById('saveStatus');
  el.textContent = msg;
  el.classList.add('visible');
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => el.classList.remove('visible'), 2000);
}

/* ========== INITIALIZATION ========== */
function initApp() {
  loadTheme();
  loadFromURL();
  initDefaultSubjectsButtons();
  if (!loadFromURLData()) {
    loadFromLocalStorage();
  }
  initDefaultSubjects();
}

function initDefaultSubjectsButtons() {
  const container = document.querySelector('.default-subjects');
  container.innerHTML = '';
  DEFAULT_SUBJECTS.forEach(sub => {
    const btn = document.createElement('button');
    btn.className = 'btn outline';
    btn.textContent = `Add ${sub}`;
    btn.onclick = () => addDefaultSubject(sub);
    container.appendChild(btn);
  });
}

function addDefaultSubject(name) {
  if (subjects.some(s => s.name === name)) {
    alert(`${name} already exists.`);
    return;
  }
  addSubject(name);
}

function loadTheme() {
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  applyTheme(theme);
}

function applyTheme(theme) {
  const body = document.body;
  const icon = document.getElementById('themeToggle').querySelector('.material-icons');
  if (theme === 'dark') {
    body.classList.add('dark');
    icon.textContent = 'light_mode';
  } else {
    body.classList.remove('dark');
    icon.textContent = 'dark_mode';
  }
}

document.getElementById('themeToggle').addEventListener('click', () => {
  const isDark = document.body.classList.contains('dark');
  const newTheme = isDark ? 'light' : 'dark';
  applyTheme(newTheme);
  localStorage.setItem('theme', newTheme);
});

/* ========== LOCAL STORAGE ========== */
function saveToLocalStorage() {
  const data = { subjects, nextId, taskCounters, targetGrades };
  localStorage.setItem('gradeData', JSON.stringify(data));
  showSaveStatus('\u2713 Saved');
}

function loadFromLocalStorage() {
  const saved = localStorage.getItem('gradeData');
  if (!saved) return false;
  try {
    const data = JSON.parse(saved);
    subjects = data.subjects || [];
    nextId = data.nextId || 0;
    taskCounters = data.taskCounters || {};
    targetGrades = data.targetGrades || {};
    renderSavedSubjects();
    return true;
  } catch (e) {
    console.warn("Failed to load saved data:", e);
    return false;
  }
}

/* ========== DUPLICATE SUBJECT ========== */
function duplicateLastSubject() {
  if (subjects.length === 0) { alert('No subjects to duplicate.'); return; }
  const last = subjects[subjects.length - 1];
  pushUndoSnapshot();
  const newName = last.name + ' (Copy)';
  addSubject(newName);
  const newSub = subjects[subjects.length - 1];
  const newCard = document.getElementById(`sub-${newSub.id}`);
  (last.tasks || []).forEach(task => {
    addTask(newSub.id, false);
    const tasksList = newCard.querySelector('.tasks-list');
    const entry = tasksList.lastChild;
    entry.children[1].value = task.taskName || '';
    entry.children[2].value = task.markGotten ?? '';
    entry.children[3].value = task.maxMark ?? '';
    entry.children[5].value = task.weight ?? '';
    entry.children[2].dispatchEvent(new Event('input'));
  });
  taskCounters[newSub.id] = (last.tasks?.length || 0) + 1;
  targetGrades[newName] = targetGrades[last.name] || 0;
  saveToLocalStorage();
}

function analyzeFromFile() {
  const file = document.getElementById('csvFile').files[0];
  if (!file) return alert('Please select a file.');
  if (file.name.endsWith('.json')) return importJSONFile(file);
  analyzeFromCSV();
}

function importJSON() {
  const file = document.getElementById('csvFile').files[0];
  if (!file) return alert('Please select a JSON backup file.');
  importJSONFile(file);
}

function importJSONFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      pushUndoSnapshot();
      subjects = data.subjects || [];
      nextId = data.nextId || 0;
      taskCounters = data.taskCounters || {};
      targetGrades = data.targetGrades || {};
      document.getElementById('subjectsContainer').innerHTML = '';
      renderSavedSubjects();
      saveToLocalStorage();
      alert('JSON imported successfully!');
    } catch (e) {
      alert('Invalid JSON file.');
    }
  };
  reader.readAsText(file);
}

/* ========== SUBJECTS ========== */
function initDefaultSubjects() {
  if (subjects.length === 0) {
    DEFAULT_SUBJECTS.forEach(name => addSubject(name));
  }
}

function addSubject(presetName = "") {
  const id = nextId++;
  const name = presetName || `Subject ${id}`;
  taskCounters[id] = 1;

  const card = document.createElement('div');
  card.className = 'subject-card';
  card.id = `sub-${id}`;
  card.innerHTML = `
    <div class="subject-header">
      <input type="text" value="${name}" class="sub-name" onchange="renameSubject(${id}, this.value)">
      <button type="button" onclick="toggleSubject(${id})" class="icon-btn collapse-btn" title="Hide or show tasks">
        <span class="material-icons">expand_less</span>
      </button>
      <span class="grade-badge" id="badge-${id}" style="display:none;"></span>
      <div class="task-controls">
        <input type="number" class="target-input" placeholder="Target %" min="0" max="100" value="${targetGrades[name] || ''}" onchange="setTargetGrade('${name}', this.value)" title="Target grade for this subject" />
        <button type="button" onclick="addTask(${id})" class="btn task-btn add">Add Task</button>
        <button type="button" onclick="removeSubject(${id})" class="icon-btn task-remove" title="Remove Subject">
          <span class="material-icons">delete</span>
        </button>
      </div>
    </div>
    <div class="tasks-list"></div>
    <div class="weight-progress-bar" id="progress-${id}"><div class="fill" style="width:0%"></div></div>
    <div class="weight-meta"><div class="weight-progress-label" id="progressLabel-${id}">0% weight</div><span class="weight-status"></span></div>
  `;

  document.getElementById('subjectsContainer').appendChild(card);
  subjects.push({ id, name, tasks: [] });
  saveToLocalStorage();
}

function setTargetGrade(subName, val) {
  targetGrades[subName] = parseFloat(val) || 0;
  saveToLocalStorage();
}

function renameSubject(id, newName) {
  const subject = subjects.find(s => s.id === id);
  if (subject) {
    const oldName = subject.name;
    subject.name = newName.trim() || `Subject ${id}`;
    if (targetGrades[oldName]) { targetGrades[subject.name] = targetGrades[oldName]; delete targetGrades[oldName]; }
  }
  saveToLocalStorage();
}

function removeSubject(id) {
  pushUndoSnapshot();
  document.getElementById(`sub-${id}`).remove();
  subjects = subjects.filter(s => s.id !== id);
  delete taskCounters[id];
  saveToLocalStorage();
}

/* ========== TASKS ========== */
function addTask(subId, pushUndo = true) {
  const subCard = document.getElementById(`sub-${subId}`);
  const list = subCard.querySelector('.tasks-list');
  const entryId = Date.now() + Math.floor(Math.random() * 1000);
  const taskNum = taskCounters[subId]++;
  const defaultName = `Task ${taskNum}`;

  if (pushUndo) pushUndoSnapshot();

  const entry = document.createElement('div');
  entry.className = 'task-entry';
  entry.id = `task-${entryId}`;
  entry.draggable = true;
  entry.dataset.entryId = entryId;
  entry.dataset.subId = subId;
  entry.innerHTML = `
    <span class="drag-handle" title="Drag to reorder"><span class="material-icons">drag_indicator</span></span>
    <input type="text" value="${defaultName}">
    <input type="number" class="mark-gotten" min="0" placeholder="Mark Gotten">
    <input type="number" class="max-mark" min="0" placeholder="Max Mark">
    <span class="percentage">0%</span>
    <input type="number" min="0" max="100" placeholder="Weight (%)">
    <button type="button" onclick="removeTask(${entryId})" class="icon-btn task-remove" title="Remove Task">
      <span class="material-icons">close</span>
    </button>
  `;

  list.appendChild(entry);

  const markGotten = entry.querySelector('.mark-gotten');
  const maxMark = entry.querySelector('.max-mark');
  const percentage = entry.querySelector('.percentage');

  const updatePercentage = () => {
    const gotten = parseFloat(markGotten.value) || 0;
    const max = parseFloat(maxMark.value) || 0;
    const perc = max > 0 ? ((gotten / max) * 100).toFixed(1) : 0;
    percentage.textContent = `${perc}%`;
    const band = getGradeBand(perc);
    percentage.style.background = band.color;
  };

  markGotten.addEventListener('input', updatePercentage);
  maxMark.addEventListener('input', updatePercentage);

  // Bulk edit weight input
  const bulkInput = document.createElement('input');
  bulkInput.type = 'number';
  bulkInput.className = 'bulk-weight-input';
  bulkInput.placeholder = 'Weight';
  bulkInput.style.cssText = 'display:none;padding:6px;border:2px solid var(--md-primary);border-radius:8px;width:70px;background:var(--md-surface);color:var(--md-on-surface);font-family:var(--font-family);font-size:0.85rem;';
  bulkInput.addEventListener('change', () => { entry.children[5].value = bulkInput.value; updatePercentage(); });
  entry.appendChild(bulkInput);

  initDragDrop(entry);

  const addBtn = subCard.querySelector('.task-btn.add');
  if (addBtn) {
    addBtn.textContent = 'Added!';
    addBtn.style.background = 'linear-gradient(135deg, #1dd1a1, #10ac84)';
    setTimeout(() => { addBtn.textContent = 'Add Task'; addBtn.style.background = ''; }, 800);
  }

  updateWeightProgress(subId);
  saveToLocalStorage();
}

function removeTask(entryId) {
  pushUndoSnapshot();
  const entry = document.getElementById(`task-${entryId}`);
  if (entry) {
    const subId = entry.dataset.subId;
    entry.remove();
    updateWeightProgress(parseInt(subId));
  }
  saveToLocalStorage();
}

/* ========== DRAG AND DROP ========== */
function initDragDrop(entry) {
  entry.addEventListener('dragstart', e => {
    e.dataTransfer.setData('text/plain', entry.dataset.entryId);
    entry.classList.add('dragging');
  });
  entry.addEventListener('dragend', () => entry.classList.remove('dragging'));
  entry.addEventListener('dragover', e => {
    e.preventDefault();
    const dragging = document.querySelector('.dragging');
    if (dragging && dragging !== entry) {
      const list = entry.parentElement;
      const entries = [...list.querySelectorAll('.task-entry')];
      const idx = entries.indexOf(entry);
      if (entries.indexOf(dragging) < idx) list.insertBefore(dragging, entry.nextSibling);
      else list.insertBefore(dragging, entry);
    }
  });
}

/* ========== GRADE BANDS ========== */
function getGradeBand(grade) {
  if (grade >= 90) return { band: 'A', color: 'linear-gradient(135deg, #1dd1a1, #10ac84)', class: 'a' };
  if (grade >= 80) return { band: 'B', color: 'linear-gradient(135deg, #feca57, #f39c12)', class: 'b' };
  if (grade >= 70) return { band: 'C', color: 'linear-gradient(135deg, #ff9ff3, #f368e0)', class: 'c' };
  if (grade >= 60) return { band: 'D', color: 'linear-gradient(135deg, #54a0ff, #2e86de)', class: 'd' };
  return { band: 'E', color: 'linear-gradient(135deg, #ff6b6b, #ee5a24)', class: 'e' };
}

function createBadgeHTML(grade) {
  const b = getGradeBand(grade);
  return `<span class="grade-badge ${b.class}">${b.band}</span>`;
}

/* ========== WEIGHT PROGRESS ========== */
function updateWeightProgress(subId) {
  const bar = document.getElementById(`progress-${subId}`);
  const label = document.getElementById(`progressLabel-${subId}`);
  const card = document.getElementById(`sub-${subId}`);
  if (!bar || !label || !card) return;
  let total = 0;
  card.querySelectorAll('.task-entry').forEach(row => {
    total += parseFloat(row.children[5].value) || 0;
  });
  const pct = Math.min(total, 100);
  const fill = bar.querySelector('.fill');
  fill.style.width = pct + '%';
  fill.className = 'fill';
  if (total >= 100) fill.classList.add('complete');
  if (total > 100) fill.classList.add('over');
  label.textContent = `${total.toFixed(1)}% weight`;

  const status = card.querySelector('.weight-status');
  if (status) {
    if (total < 100) {
      status.textContent = 'Incomplete';
      status.className = 'weight-status warning';
    } else if (total > 100) {
      status.textContent = 'Overloaded';
      status.className = 'weight-status over';
    } else {
      status.textContent = 'Balanced';
      status.className = 'weight-status balanced';
    }
  }
}

/* ========== RENDER SAVED SUBJECTS ========== */
function renderSavedSubjects() {
  const container = document.getElementById('subjectsContainer');
  container.innerHTML = '';

  subjects.forEach(sub => {
    const card = document.createElement('div');
    card.className = 'subject-card';
    card.id = `sub-${sub.id}`;
    card.innerHTML = `
      <div class="subject-header">
        <input type="text" value="${sub.name}" class="sub-name" onchange="renameSubject(${sub.id}, this.value)">
        <button type="button" onclick="toggleSubject(${sub.id})" class="icon-btn collapse-btn" title="Hide or show tasks">
          <span class="material-icons">expand_less</span>
        </button>
        <span class="grade-badge" id="badge-${sub.id}" style="display:none;"></span>
        <div class="task-controls">
          <input type="number" class="target-input" placeholder="Target %" min="0" max="100" value="${targetGrades[sub.name] || ''}" onchange="setTargetGrade('${sub.name}', this.value)" />
          <button type="button" onclick="addTask(${sub.id})" class="btn task-btn add">Add Task</button>
          <button type="button" onclick="removeSubject(${sub.id})" class="icon-btn task-remove" title="Remove Subject">
            <span class="material-icons">delete</span>
          </button>
        </div>
      </div>
      <div class="tasks-list"></div>
      <div class="weight-progress-bar" id="progress-${sub.id}"><div class="fill" style="width:0%"></div></div>
      <div class="weight-meta"><div class="weight-progress-label" id="progressLabel-${sub.id}">0% weight</div><span class="weight-status"></span></div>
    `;

    const list = card.querySelector('.tasks-list');
    (sub.tasks || []).forEach(task => {
      const entry = document.createElement('div');
      const taskEntryId = task.entryId || Date.now() + Math.floor(Math.random() * 1000);
      entry.className = 'task-entry';
      entry.id = `task-${taskEntryId}`;
      entry.draggable = true;
      entry.dataset.entryId = taskEntryId;
      entry.dataset.subId = sub.id;
      entry.innerHTML = `
        <span class="drag-handle" title="Drag to reorder"><span class="material-icons">drag_indicator</span></span>
        <input type="text" value="${task.taskName || ''}">
        <input type="number" class="mark-gotten" value="${task.markGotten ?? ''}" min="0">
        <input type="number" class="max-mark" value="${task.maxMark ?? ''}" min="0">
        <span class="percentage">0%</span>
        <input type="number" value="${task.weight ?? ''}" min="0" max="100" placeholder="Weight (%)">
        <button type="button" onclick="removeTask(${taskEntryId})" class="icon-btn task-remove" title="Remove Task">
          <span class="material-icons">close</span>
        </button>
      `;

      const bulkInput = document.createElement('input');
      bulkInput.type = 'number';
      bulkInput.className = 'bulk-weight-input';
      bulkInput.placeholder = 'Weight';
      bulkInput.style.cssText = 'display:none;padding:6px;border:2px solid var(--md-primary);border-radius:8px;width:70px;background:var(--md-surface);color:var(--md-on-surface);font-family:var(--font-family);font-size:0.85rem;';
      bulkInput.addEventListener('change', () => { entry.children[5].value = bulkInput.value; updatePercentage(); });
      entry.appendChild(bulkInput);

      initDragDrop(entry);

      const markGotten = entry.querySelector('.mark-gotten');
      const maxMark = entry.querySelector('.max-mark');
      const percentage = entry.querySelector('.percentage');

      const updatePercentage = () => {
        const gotten = parseFloat(markGotten.value) || 0;
        const max = parseFloat(maxMark.value) || 0;
        const perc = max > 0 ? ((gotten / max) * 100).toFixed(1) : 0;
        percentage.textContent = `${perc}%`;
        percentage.style.background = getGradeBand(perc).color;
      };

      updatePercentage();
      markGotten.addEventListener('input', updatePercentage);
      maxMark.addEventListener('input', updatePercentage);

      list.appendChild(entry);
    });

    updateWeightProgress(sub.id);
    container.appendChild(card);
  });
}

/* ========== SEARCH / FILTER ========== */
function filterTasks(query) {
  const q = query.toLowerCase().trim();
  document.querySelectorAll('.task-entry').forEach(entry => {
    const name = entry.children[1].value.toLowerCase();
    if (!q || name.includes(q)) {
      entry.classList.remove('hidden');
    } else {
      entry.classList.add('hidden');
    }
  });
}

/* ========== BULK EDIT ========== */
function toggleBulkEdit() {
  bulkEditMode = !bulkEditMode;
  document.getElementById('bulkEditBtn').classList.toggle('primary', bulkEditMode);
  document.querySelectorAll('.bulk-edit-overlay').forEach(el => {
    el.classList.toggle('visible', bulkEditMode);
  });
  if (bulkEditMode) {
    document.querySelectorAll('.task-entry').forEach(entry => {
      const bi = entry.querySelector('.bulk-weight-input');
      if (bi) bi.style.display = 'inline-block';
    });
  } else {
    document.querySelectorAll('.bulk-weight-input').forEach(bi => bi.style.display = 'none');
  }
}

function applyBulkEdit(subId) {
  const card = document.getElementById(`sub-${subId}`);
  const multInput = card.querySelector('.bulk-mult-input');
  const mult = parseFloat(multInput.value) || 0;
  if (mult === 0) return;

  pushUndoSnapshot();
  card.querySelectorAll('.task-entry').forEach(entry => {
    const wInput = entry.children[5];
    const current = parseFloat(wInput.value) || 0;
    wInput.value = Math.round(current * (1 + mult / 100));
    wInput.dispatchEvent(new Event('input'));
  });
  updateWeightProgress(subId);
  saveToLocalStorage();
}

/* ========== DATA COLLECTION ========== */
function collectManualData() {
  const data = [];
  document.querySelectorAll('.subject-card').forEach(card => {
    const name = card.querySelector('.sub-name').value.trim();
    if (!name) return;
    const subId = parseInt(card.id.split('-')[1]);

    card.querySelectorAll('.task-entry').forEach(row => {
      const taskName = row.children[1].value.trim() || 'Task';
      const markGotten = parseFloat(row.children[2].value);
      const maxMark = parseFloat(row.children[3].value);
      const weight = parseFloat(row.children[5].value);
      const grade = maxMark > 0 ? (markGotten / maxMark) * 100 : 0;

      if (!isNaN(markGotten) && !isNaN(maxMark) && !isNaN(weight) && weight > 0) {
        data.push({ Subject: name, Task: taskName, MarkGotten: markGotten, MaxMark: maxMark, Grade: grade, Weight: weight });

        const sub = subjects.find(s => s.id === subId);
        if (sub) {
          if (!sub.tasks) sub.tasks = [];
          const existing = sub.tasks.find(t => t.taskName === taskName);
          if (existing) {
            existing.markGotten = markGotten;
            existing.maxMark = maxMark;
            existing.weight = weight;
          } else {
            sub.tasks.push({ taskName, markGotten, maxMark, weight });
          }
        }
      }
    });
  });
  saveToLocalStorage();
  return data;
}

/* ========== CSV ANALYSIS ========== */
function analyzeFromCSV() {
  const file = document.getElementById('csvFile').files[0];
  if (!file) return alert('Please select a CSV file.');

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: res => {
      const rows = res.data
        .map(r => {
          const markGotten = +r.MarkGotten;
          const maxMark = +r.MaxMark;
          const grade = maxMark > 0 ? (markGotten / maxMark) * 100 : 0;
          return { ...r, MarkGotten: markGotten, MaxMark: maxMark, Grade: grade, Weight: +r.Weight };
        })
        .filter(r => r.Subject && r.Task && !isNaN(r.MarkGotten) && !isNaN(r.MaxMark) && !isNaN(r.Weight) && r.Weight > 0);
      if (!rows.length) return alert('No valid data in CSV.');
      populateFromCSV(rows);
      processData(rows);
    },
    error: () => alert('Error reading CSV.')
  });
}

/* ========== POPULATE FROM CSV ========== */
function populateFromCSV(rows) {
  pushUndoSnapshot();
  subjects = [];
  taskCounters = {};
  nextId = 0;
  document.getElementById('subjectsContainer').innerHTML = '';

  const uniqueSubjects = [...new Set(rows.map(r => r.Subject))];

  uniqueSubjects.forEach(subName => {
    addSubject(subName);
    const subId = nextId - 1;
    const subTasks = rows.filter(r => r.Subject === subName);

    subTasks.forEach(task => {
      addTask(subId, false);
      const lastEntry = document.getElementById(`sub-${subId}`).querySelector('.tasks-list').lastChild;
      lastEntry.children[1].value = task.Task;
      lastEntry.children[2].value = task.MarkGotten;
      lastEntry.children[3].value = task.MaxMark;
      lastEntry.children[5].value = task.Weight;
      lastEntry.children[2].dispatchEvent(new Event('input'));
    });

    taskCounters[subId] = subTasks.length + 1;
  });

  collectManualData();
}

/* ========== PROCESS RESULTS ========== */
function processData(raw) {
  const bySubject = {};
  raw.forEach(r => {
    if (!bySubject[r.Subject]) bySubject[r.Subject] = [];
    bySubject[r.Subject].push(r);
  });

  const totalWeighted = raw.reduce((s, r) => s + r.Grade * r.Weight, 0);
  const totalWeight = raw.reduce((s, r) => s + r.Weight, 0);
  const overallAvg = totalWeight > 0 ? totalWeighted / totalWeight : 0;
  const subjectDetails = Object.keys(bySubject).map(sub => {
    const tasks = bySubject[sub];
    const total = tasks.reduce((s, t) => s + t.Weight, 0);
    const weighted = tasks.reduce((s, t) => s + t.Grade * t.Weight, 0);
    const avg = total > 0 ? weighted / total : 0;
    const target = targetGrades[sub] > 0 ? targetGrades[sub] : null;
    return { sub, total, avg, target, gap: target !== null ? avg - target : null };
  });
  const mismatchCount = subjectDetails.filter(i => i.total !== 100).length;
  const onTargetCount = subjectDetails.filter(i => i.target !== null && i.gap >= 0).length;
  const belowTargetCount = subjectDetails.filter(i => i.target !== null && i.gap < 0).length;

  let html = `<div class="card"><h2>Overall Weighted Grade</h2>`;
  html += `<div class="summary-panel">
      <div class="summary-item"><strong>${Object.keys(bySubject).length}</strong><span>Subjects</span></div>
      <div class="summary-item"><strong>${mismatchCount}</strong><span>Weight Mismatches</span></div>
      <div class="summary-item"><strong>${onTargetCount}</strong><span>At/Above Target</span></div>
      <div class="summary-item"><strong>${belowTargetCount}</strong><span>Below Target</span></div>
    </div>`;
  html += `<p style="font-size:1.4rem; font-weight:700; margin-top:10px;">Final Grade: ${overallAvg.toFixed(2)}%</p>`;
  html += `${createBadgeHTML(overallAvg)}<br>`;
  html += `<p style="font-size:0.95rem; color:var(--md-outline);">Total Weight: ${totalWeight.toFixed(1)}%</p></div>`;

  // Subject rankings
  const rankings = computeRankings(bySubject);
  html += `<div class="card"><h2>Subject Rankings</h2>`;
  html += '<div style="display:flex;flex-direction:column;gap:12px;">';
  rankings.forEach(r => {
    const rankClass = r.rank <= 3 ? ['gold', 'silver', 'bronze'][r.rank - 1] : '';
    html += `<div style="display:flex;align-items:center;gap:12px;">
      <span class="rank-badge ${rankClass}">${r.rank}</span>
      <span style="font-weight:600;">${r.name}</span>
      <span style="color:var(--md-on-surface);">${r.avg.toFixed(2)}%</span>
      ${createBadgeHTML(r.avg)}
      <span class="trend-arrow ${r.trend.direction}" title="Trend: ${r.trend.direction}">${r.trend.icon}</span>
    </div>`;
  });
  html += '</div></div>';

  Object.keys(bySubject).forEach((sub, idx) => {
    const tasks = bySubject[sub];
    const wSum = tasks.reduce((s, t) => s + t.Grade * t.Weight, 0);
    const wTotal = tasks.reduce((s, t) => s + t.Weight, 0);
    const avg = wTotal > 0 ? wSum / wTotal : 0;
    const trend = computeTrend(tasks);

    html += `<div class="card"><h2>${sub} <span class="trend-arrow ${trend.direction}">${trend.icon}</span></h2>`;
    html += `<p style="font-size:1.3rem; font-weight:600; color:var(--md-primary);">Weighted Average: ${avg.toFixed(2)}%</p>`;
    html += `${createBadgeHTML(avg)}<br>`;
    html += `<p style="color:var(--md-outline);">${wTotal.toFixed(1)}% weight</p>`;
    html += statsHTML(tasks.map(t => t.Grade));
    html += `<h3 style="margin-top:16px; color:var(--md-secondary);">Tasks</h3>${tableHTML(tasks)}`;

    // Target comparison
    const target = targetGrades[sub];
    if (target) {
      const diff = avg - target;
      const cls = diff >= 0 ? 'achievable' : 'impossible';
      html += `<p class="${cls}" style="font-weight:600;margin-top:8px;">Target: ${target}% — ${diff >= 0 ? 'Above by' : 'Below by'} ${Math.abs(diff).toFixed(1)}%</p>`;
    }

    html += '</div>';
  });

  document.getElementById('results').innerHTML = html;
  renderCharts(bySubject);
}

/* ========== RANKINGS & TREND ========== */
function computeRankings(bySubject) {
  const avgs = Object.keys(bySubject).map(sub => {
    const tasks = bySubject[sub];
    const wSum = tasks.reduce((s, t) => s + t.Grade * t.Weight, 0);
    const wTotal = tasks.reduce((s, t) => s + t.Weight, 0);
    return { name: sub, avg: wTotal > 0 ? wSum / wTotal : 0, trend: computeTrend(tasks) };
  });
  avgs.sort((a, b) => b.avg - a.avg);
  avgs.forEach((r, i) => r.rank = i + 1);
  return avgs;
}

function computeTrend(tasks) {
  if (tasks.length < 2) return { direction: 'stable', icon: 'remove' };
  const grades = tasks.map(t => t.Grade);
  const n = grades.length;
  const half = Math.floor(n / 2);
  const firstHalf = grades.slice(0, half).reduce((a, b) => a + b, 0) / half;
  const secondHalf = grades.slice(half).reduce((a, b) => a + b, 0) / (n - half);
  const diff = secondHalf - firstHalf;
  if (diff > 3) return { direction: 'up', icon: 'trending_up' };
  if (diff < -3) return { direction: 'down', icon: 'trending_down' };
  return { direction: 'stable', icon: 'remove' };
}

/* ========== STATS ========== */
function statsHTML(grades) {
  if (!grades.length) return '';
  const mean = grades.reduce((a,b)=>a+b,0)/grades.length;
  const sorted = [...grades].sort((a,b)=>a-b);
  const median = sorted.length%2===0
    ? (sorted[grades.length/2-1] + sorted[grades.length/2])/2
    : sorted[Math.floor(grades.length/2)];
  const mode = getMode(grades);
  const std = Math.sqrt(grades.reduce((s,g)=>s+Math.pow(g-mean,2),0)/grades.length);
  return `
    <div style="display:flex; gap:16px; flex-wrap:wrap; margin:12px 0; font-size:0.9rem;">
      <div style="background:var(--md-primary-container); padding:8px 12px; border-radius:12px; color:var(--md-primary);"><strong>Mean:</strong> ${mean.toFixed(2)}%</div>
      <div style="background:var(--md-secondary-container); padding:8px 12px; border-radius:12px; color:var(--md-secondary);"><strong>Median:</strong> ${median.toFixed(2)}%</div>
      <div style="background:var(--md-tertiary-container); padding:8px 12px; border-radius:12px; color:var(--md-tertiary);"><strong>Mode:</strong> ${mode}%</div>
      <div style="background:var(--md-surface); padding:8px 12px; border-radius:12px; color:var(--md-on-surface);"><strong>Std Dev:</strong> ${std.toFixed(2)}</div>
    </div>
  `;
}

function getMode(arr) {
  const freq = {};
  arr.forEach(v => freq[v] = (freq[v] || 0) + 1);
  return +Object.keys(freq).reduce((a,b) => freq[a] > freq[b] ? a : b);
}

/* ========== TABLE ========== */
function tableHTML(tasks) {
  let h = '<table><tr><th>Task</th><th>Got</th><th>Max</th><th>%</th><th>Weight</th><th>Contrib</th><th>Grade</th></tr>';
  tasks.forEach(t => {
    const contrib = (t.Grade * t.Weight).toFixed(2);
    const perc = t.Grade.toFixed(1);
    const band = getGradeBand(t.Grade);
    const percColor = perc>=90?'#22c55e':perc>=80?'#f59e0b':perc>=70?'#a855f7':perc>=60?'#3b82f6':'#ef4444';
    h += `<tr>
      <td style="font-weight:600;">${t.Task}</td>
      <td>${t.MarkGotten}</td>
      <td>${t.MaxMark}</td>
      <td class="grade-cell" data-grade="${perc}" style="font-weight:600; color:${percColor}">${perc}%</td>
      <td>${t.Weight}</td>
      <td style="font-weight:600; color:var(--md-primary)">${contrib}</td>
      <td>${createBadgeHTML(t.Grade)}</td>
    </tr>`;
  });
  h += '</table>';
  return h;
}

/* ========== CHARTS ========== */
function renderCharts(bySubject) {
  // Destroy old charts
  Object.values(chartInstances).forEach(c => c.destroy());
  chartInstances = {};

  const container = document.getElementById('chartsContainer');
  container.innerHTML = '<div class="charts-grid"></div>';
  const grid = container.querySelector('.charts-grid');

  const subjectNames = Object.keys(bySubject);
  subjectNames.forEach((sub, index) => {
    const tasks = bySubject[sub];
    const color = COLORS[index % COLORS.length];

    const chartCard = document.createElement('div');
    chartCard.className = 'chart-card';
    chartCard.innerHTML = `<h3 style="margin:0 0 12px; color:${color};">${sub}</h3>`;

    const canvas = document.createElement('canvas');
    chartCard.appendChild(canvas);
    grid.appendChild(chartCard);

    // Target line annotation
    const target = targetGrades[sub];
    const annotations = {};
    if (target) {
      annotations.targetLine = {
        type: 'line',
        yMin: target, yMax: target,
        borderColor: '#ff4757',
        borderWidth: 2,
        borderDash: [6, 4],
        label: { display: true, content: `Target: ${target}%`, position: 'end', backgroundColor: '#ff4757', font: { size: 11 } }
      };
    }

    chartInstances[sub] = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels: tasks.map(t => t.Task),
        datasets: [{
          label: 'Grade %',
          data: tasks.map(t => t.Grade),
          borderColor: color,
          backgroundColor: color + '20',
          fill: true,
          tension: 0.4,
          pointRadius: 6,
          pointBackgroundColor: color,
          pointBorderColor: getComputedStyle(document.body).getPropertyValue('--md-surface').trim(),
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        animation: { duration: 800, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false },
          annotation: { annotations },
          tooltip: { callbacks: { label: ctx => `${ctx.raw.toFixed(1)}%` } }
        },
        scales: {
          y: {
            suggestedMin: 0, suggestedMax: 100,
            grid: { color: getComputedStyle(document.body).getPropertyValue('--md-outline') + '22' },
            ticks: { color: '#666' }
          },
          x: { grid: { display: false }, ticks: { color: '#666' } }
        }
      }
    });
  });

  // Comparison bar chart
  makeSubjectComparisonChart(bySubject, grid);
}

function makeSubjectComparisonChart(bySubject, grid) {
  const labels = [];
  const data = [];
  const colors = [];
  const targets = [];

  Object.keys(bySubject).forEach((sub, i) => {
    const tasks = bySubject[sub];
    const wSum = tasks.reduce((s, t) => s + t.Grade * t.Weight, 0);
    const wTotal = tasks.reduce((s, t) => s + t.Weight, 0);
    const avg = wTotal > 0 ? wSum / wTotal : 0;
    labels.push(sub);
    data.push(avg);
    colors.push(COLORS[i % COLORS.length]);
    if (targetGrades[sub]) targets.push(targetGrades[sub]);
  });

  const chartCard = document.createElement('div');
  chartCard.className = 'chart-card';
  chartCard.style.gridColumn = '1 / -1';
  chartCard.innerHTML = `<h3 style="margin:0 0 12px; background: linear-gradient(90deg, #647bf7, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Subject Comparison</h3>`;

  const canvas = document.createElement('canvas');
  chartCard.appendChild(canvas);
  grid.appendChild(chartCard);

  const annotations = { targetLines: { type: 'line', yMin: null, yMax: null } };
  if (targets.length > 0) {
    annotations.targetLines = targets.map((t, i) => ({
      type: 'line',
      yMin: t, yMax: t,
      borderColor: '#ff4757',
      borderWidth: 1,
      borderDash: [4, 4],
      label: { display: true, content: `Target ${i + 1}`, position: 'end', backgroundColor: '#ff4757', font: { size: 10 } }
    }));
  }

  chartInstances['comparison'] = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Weighted Average',
        data: data,
        backgroundColor: colors.map(c => c + '90'),
        borderColor: colors,
        borderWidth: 2,
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      animation: { duration: 800, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        annotation: { annotations },
        tooltip: { callbacks: { label: ctx => `${ctx.raw.toFixed(2)}%` } }
      },
      scales: {
        y: {
          suggestedMin: 0, suggestedMax: 100,
          grid: { color: getComputedStyle(document.body).getPropertyValue('--md-outline') + '22' },
          ticks: { color: '#666' },
          title: { display: true, text: 'Weighted Average (%)', color: '#647bf7' }
        },
        x: { grid: { display: false }, ticks: { color: '#666' } }
      }
    }
  });
}

/* ========== EXPORT TO CSV ========== */
function exportToCSV() {
  const data = collectManualData();
  if (!data.length) {
    alert('No grades to export. Add some tasks first.');
    return;
  }

  let csv = 'Subject,Task,MarkGotten,MaxMark,Weight\n';
  data.forEach(row => {
    csv += `"${row.Subject}","${row.Task}",${row.MarkGotten},${row.MaxMark},${row.Weight}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'grades.csv');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  const btn = document.getElementById('exportBtn');
  const original = btn.innerHTML;
  btn.innerHTML = '<span class="material-icons">check</span> Exported!';
  btn.style.background = 'linear-gradient(135deg, #1dd1a1, #10ac84)';
  setTimeout(() => { btn.innerHTML = original; btn.style.background = ''; }, 1500);
}

/* ========== BACKUP / RESTORE ========== */
function backupData() {
  const data = collectManualData();
  const backup = { subjects, nextId, taskCounters, targetGrades };
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'grades-backup.json';
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showSaveStatus('✓ Backup downloaded');
}

/* ========== SHARE ========== */
function shareData() {
  const data = collectManualData();
  const backup = { subjects, nextId, taskCounters, targetGrades };
  const json = JSON.stringify(backup);
  const encoded = btoa(encodeURIComponent(json));
  shareLinkData = `${window.location.origin}${window.location.pathname}?g=${encoded}`;
  const toast = document.getElementById('shareToast');
  document.getElementById('shareToastMsg').textContent = 'Share link generated!';
  toast.style.display = 'flex';
  setTimeout(() => toast.style.display = 'none', 5000);
}

function copyShareLink() {
  navigator.clipboard.writeText(shareLinkData).then(() => showSaveStatus('✓ Link copied!'));
  document.getElementById('shareToast').style.display = 'none';
}

function loadFromURL() {
  const params = new URLSearchParams(window.location.search);
  const g = params.get('g');
  if (g) {
    try {
      const json = decodeURIComponent(atob(g));
      const data = JSON.parse(json);
      subjects = data.subjects || [];
      nextId = data.nextId || 0;
      taskCounters = data.taskCounters || {};
      targetGrades = data.targetGrades || {};
      renderSavedSubjects();
      URL.revokeObjectURL(window.location.href);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    } catch (e) {
      console.warn('Failed to load shared data:', e);
    }
  }
}

function loadFromURLData() {
  const params = new URLSearchParams(window.location.search);
  return !!params.get('g');
}

/* ========== PREDICTION ========== */
function openPredictionModal() {
  const data = collectManualData();
  if (data.length === 0) { alert('Add some grades first!'); return; }
  const modal = document.getElementById('predictionModal');
  const sel = document.getElementById('predictSubject');
  sel.innerHTML = '';
  const unique = [...new Set(data.map(d => d.Subject))];
  unique.forEach(sub => { const opt = document.createElement('option'); opt.value = sub; opt.textContent = sub; sel.appendChild(opt); });
  document.getElementById('predictResult').style.display = 'none';
  modal.style.display = 'flex';
}

function closePredictionModal() {
  document.getElementById('predictionModal').style.display = 'none';
}

function predictGrade() {
  const subName = document.getElementById('predictSubject').value;
  const target = parseFloat(document.getElementById('predictTarget').value);
  const taskName = document.getElementById('predictTaskName').value.trim() || 'Next Task';
  const weight = parseFloat(document.getElementById('predictWeight').value);

  if (isNaN(target) || isNaN(weight) || weight <= 0) { alert('Fill in all fields.'); return; }

  const data = collectManualData();
  const subTasks = data.filter(d => d.Subject === subName);
  const currentWeighted = subTasks.reduce((s, t) => s + t.Grade * t.Weight, 0);
  const currentWeight = subTasks.reduce((s, t) => s + t.Weight, 0);
  const totalWeightAfter = currentWeight + weight;
  const needed = (target * totalWeightAfter - currentWeighted) / weight;

  const result = document.getElementById('predictResult');
  result.style.display = 'block';

  if (needed > 100) {
    result.innerHTML = `
      <div class="required-mark">${Math.min(needed, 999).toFixed(1)}%</div>
      <p class="impossible">Not achievable — you'd need ${needed.toFixed(1)}% on "${taskName}"</p>
      <p style="margin-top:8px;color:var(--md-outline);">Max possible with 100% on this task: ${((currentWeighted + 100 * weight) / totalWeightAfter).toFixed(2)}%</p>
    `;
  } else if (needed <= 0) {
    result.innerHTML = `
      <div class="required-mark" style="color:var(--md-success);">0%</div>
      <p class="achievable">Already on track! You don't need any marks on this task to reach ${target}%.</p>
    `;
  } else {
    result.innerHTML = `
      <div class="required-mark">${needed.toFixed(1)}%</div>
      <p class="achievable">${needed <= 100 ? 'Achievable!' : ''} You need ${needed.toFixed(1)}% on "${taskName}" (${weight}% weight) to reach your target of ${target}%.</p>
    `;
  }
}

/* ========== SHORTCUTS MODAL ========== */
function openShortcutsModal() {
  document.getElementById('shortcutsModal').style.display = 'flex';
}

function closeShortcutsModal() {
  document.getElementById('shortcutsModal').style.display = 'none';
}

document.getElementById('shortcutsBtn').addEventListener('click', openShortcutsModal);

/* ========== KEYBOARD SHORTCUTS ========== */
document.addEventListener('keydown', (e) => {
  // Don't trigger shortcuts when typing in inputs
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
    if (e.key === '/' && e.target.tagName !== 'INPUT') { e.preventDefault(); document.getElementById('taskSearch').focus(); }
    return;
  }
  if (e.key === '/') { e.preventDefault(); document.getElementById('taskSearch').focus(); return; }
  if (e.key === 'Escape') { closePredictionModal(); closeShortcutsModal(); return; }
  if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); analyzeGrades(); return; }
  if (e.ctrlKey && e.shiftKey && e.key === 'S') { e.preventDefault(); exportToCSV(); return; }
  if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); return; }
  if (e.ctrlKey && e.shiftKey && e.key === 'z') { e.preventDefault(); redo(); return; }
});

/* ========== EXPORT PDF ========== */
function exportPDF() {
  const results = document.getElementById('results');
  if (!results.innerHTML) { alert('Calculate grades first!'); return; }
  window.print();
}

/* ========== ANALYZE GRADES ========== */
function analyzeGrades() {
  const data = collectManualData();
  if (data.length === 0) {
    alert('Please add some grades first!');
    return;
  }
  processData(data);
}

/* ========== CLOSE MODALS ON BACKDROP CLICK ========== */
document.getElementById('predictionModal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('predictionModal')) closePredictionModal();
});
document.getElementById('shortcutsModal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('shortcutsModal')) closeShortcutsModal();
});

/* ========== START APP ========== */
initApp();
