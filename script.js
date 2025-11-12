/* script.js - Weighted Grade Calculator (Colorful Edition) */

let subjects = [];
let nextId = 0;
let taskCounters = {};

const DEFAULT_SUBJECTS = [
  "Maths (Core)", "Maths (Path)", "English", "Science", "HSIE", "PDHPE", "Electronics", "Music", "STEM"
];

const COLORS = [
  '#7b61ff', '#ff6b6b', '#4ecdc4', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3'
];

/* ========== INITIALIZATION ========== */
function initApp() {
  loadTheme();
  initDefaultSubjectsButtons();
  initDefaultSubjects();
  loadFromLocalStorage();
}

function initDefaultSubjectsButtons() {
  const container = document.querySelector('.default-subjects');
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
      <div class="task-controls">
        <button type="button" onclick="addTask(${id})" class="btn task-btn add">Add Task</button>
        <button type="button" onclick="removeSubject(${id})" class="icon-btn task-remove" title="Remove Subject">
          <span class="material-icons">delete</span>
        </button>
      </div>
    </div>
    <div class="tasks-list"></div>
  `;

  document.getElementById('subjectsContainer').appendChild(card);
  subjects.push({ id, name, tasks: [] });
  saveToLocalStorage();
}

function renameSubject(id, newName) {
  const subject = subjects.find(s => s.id === id);
  if (subject) subject.name = newName.trim() || `Subject ${id}`;
  saveToLocalStorage();
}

function removeSubject(id) {
  document.getElementById(`sub-${id}`).remove();
  subjects = subjects.filter(s => s.id !== id);
  delete taskCounters[id];
  saveToLocalStorage();
}

/* ========== TASKS ========== */
function addTask(subId) {
  const subCard = document.getElementById(`sub-${subId}`);
  const list = subCard.querySelector('.tasks-list');
  const entryId = Date.now();
  const taskNum = taskCounters[subId]++;
  const defaultName = `Task ${taskNum}`;

  const entry = document.createElement('div');
  entry.className = 'task-entry';
  entry.id = `task-${entryId}`;
  entry.innerHTML = `
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
    
    // Color based on percentage
    if (perc >= 90) percentage.style.background = 'linear-gradient(135deg, #1dd1a1, #10ac84)';
    else if (perc >= 80) percentage.style.background = 'linear-gradient(135deg, #feca57, #f39c12)';
    else if (perc >= 70) percentage.style.background = 'linear-gradient(135deg, #ff9ff3, #f368e0)';
    else if (perc >= 60) percentage.style.background = 'linear-gradient(135deg, #54a0ff, #2e86de)';
    else percentage.style.background = 'linear-gradient(135deg, #ff6b6b, #ee5a24)';
  };

  markGotten.addEventListener('input', updatePercentage);
  maxMark.addEventListener('input', updatePercentage);

  const addBtn = subCard.querySelector('.task-btn.add');
  addBtn.textContent = 'Added!';
  addBtn.style.background = 'linear-gradient(135deg, #1dd1a1, #10ac84)';
  setTimeout(() => {
    addBtn.textContent = 'Add Task';
    addBtn.style.background = '';
  }, 800);

  saveToLocalStorage();
}

function removeTask(entryId) {
  const entry = document.getElementById(`task-${entryId}`);
  if (entry) entry.remove();
  saveToLocalStorage();
}

/* ========== LOCAL STORAGE ========== */
function saveToLocalStorage() {
  const data = { subjects, nextId, taskCounters };
  localStorage.setItem('gradeData', JSON.stringify(data));
}

function loadFromLocalStorage() {
  const saved = localStorage.getItem('gradeData');
  if (!saved) return;

  try {
    const data = JSON.parse(saved);
    subjects = data.subjects || [];
    nextId = data.nextId || 0;
    taskCounters = data.taskCounters || {};
    renderSavedSubjects();
  } catch (e) {
    console.warn("Failed to load saved data:", e);
  }
}

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
        <div class="task-controls">
          <button type="button" onclick="addTask(${sub.id})" class="btn task-btn add">Add Task</button>
          <button type="button" onclick="removeSubject(${sub.id})" class="icon-btn task-remove" title="Remove Subject">
            <span class="material-icons">delete</span>
          </button>
        </div>
      </div>
      <div class="tasks-list"></div>
    `;

    const list = card.querySelector('.tasks-list');
    (sub.tasks || []).forEach(task => {
      const entry = document.createElement('div');
      entry.className = 'task-entry';
      entry.innerHTML = `
        <input type="text" value="${task.taskName || ''}">
        <input type="number" class="mark-gotten" value="${task.markGotten ?? ''}" min="0">
        <input type="number" class="max-mark" value="${task.maxMark ?? ''}" min="0">
        <span class="percentage">0%</span>
        <input type="number" value="${task.weight ?? ''}" min="0" max="100">
        <button type="button" onclick="this.parentElement.remove(); saveToLocalStorage()" class="icon-btn task-remove" title="Remove Task">
          <span class="material-icons">close</span>
        </button>
      `;

      const markGotten = entry.querySelector('.mark-gotten');
      const maxMark = entry.querySelector('.max-mark');
      const percentage = entry.querySelector('.percentage');

      const updatePercentage = () => {
        const gotten = parseFloat(markGotten.value) || 0;
        const max = parseFloat(maxMark.value) || 0;
        const perc = max > 0 ? ((gotten / max) * 100).toFixed(1) : 0;
        percentage.textContent = `${perc}%`;
        
        if (perc >= 90) percentage.style.background = 'linear-gradient(135deg, #1dd1a1, #10ac84)';
        else if (perc >= 80) percentage.style.background = 'linear-gradient(135deg, #feca57, #f39c12)';
        else if (perc >= 70) percentage.style.background = 'linear-gradient(135deg, #ff9ff3, #f368e0)';
        else if (perc >= 60) percentage.style.background = 'linear-gradient(135deg, #54a0ff, #2e86de)';
        else percentage.style.background = 'linear-gradient(135deg, #ff6b6b, #ee5a24)';
      };

      updatePercentage();
      markGotten.addEventListener('input', updatePercentage);
      maxMark.addEventListener('input', updatePercentage);

      list.appendChild(entry);
    });

    container.appendChild(card);
  });
}

/* ========== DATA COLLECTION ========== */
function collectManualData() {
  const data = [];
  document.querySelectorAll('.subject-card').forEach(card => {
    const name = card.querySelector('.sub-name').value.trim();
    if (!name) return;

    card.querySelectorAll('.task-entry').forEach(row => {
      const taskName = row.children[0].value.trim() || 'Task';
      const markGotten = parseFloat(row.children[1].value);
      const maxMark = parseFloat(row.children[2].value);
      const weight = parseFloat(row.children[4].value);
      const grade = maxMark > 0 ? (markGotten / maxMark) * 100 : 0;

      if (!isNaN(markGotten) && !isNaN(maxMark) && !isNaN(weight) && weight > 0) {
        data.push({ Subject: name, Task: taskName, MarkGotten: markGotten, MaxMark: maxMark, Grade: grade, Weight: weight });

        const sub = subjects.find(s => s.id === parseInt(card.id.split('-')[1]));
        if (sub) {
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
      addTask(subId);
      const lastEntry = document.getElementById(`sub-${subId}`).querySelector('.tasks-list').lastChild;
      lastEntry.children[0].value = task.Task;
      lastEntry.children[1].value = task.MarkGotten;
      lastEntry.children[2].value = task.MaxMark;
      lastEntry.children[4].value = task.Weight;
      lastEntry.children[1].dispatchEvent(new Event('input'));
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

  let html = `<div class="card"><h2>Overall Weighted Grade</h2>`;
  const totalWeighted = raw.reduce((s, r) => s + r.Grade * r.Weight, 0);
  const totalWeight = raw.reduce((s, r) => s + r.Weight, 0);
  const overallAvg = totalWeight > 0 ? totalWeighted / totalWeight : 0;
  html += `<p style="font-size:1.5rem; font-weight:700; background: linear-gradient(90deg, #7b61ff, #ff6b6b); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
    Final Grade: ${overallAvg.toFixed(2)}%</p>`;
  html += `<p style="font-size:1rem; color:var(--md-outline);">Total Weight: ${totalWeight.toFixed(1)}%</p></div>`;

  Object.keys(bySubject).forEach(sub => {
    const tasks = bySubject[sub];
    const wSum = tasks.reduce((s, t) => s + t.Grade * t.Weight, 0);
    const wTotal = tasks.reduce((s, t) => s + t.Weight, 0);
    const avg = wTotal > 0 ? wSum / wTotal : 0;

    html += `<div class="card"><h2>${sub}</h2>`;
    html += `<p style="font-size:1.3rem; font-weight:600; color:var(--md-primary);">Weighted Average: ${avg.toFixed(2)}%</p>`;
    html += `<p style="color:var(--md-outline);">${wTotal.toFixed(1)}% weight</p>`;
    html += statsHTML(tasks.map(t => t.Grade));
    html += `<h3 style="margin-top:16px; color:var(--md-secondary);">Tasks</h3>${tableHTML(tasks)}</div>`;
  });

  document.getElementById('results').innerHTML = html;
  renderCharts(bySubject);
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
      <div style="background:var(--md-primary-container); padding:8px 12px; border-radius:12px; color:var(--md-primary);">
        <strong>Mean:</strong> ${mean.toFixed(2)}%
      </div>
      <div style="background:var(--md-secondary-container); padding:8px 12px; border-radius:12px; color:var(--md-secondary);">
        <strong>Median:</strong> ${median.toFixed(2)}%
      </div>
      <div style="background:var(--md-tertiary-container); padding:8px 12px; border-radius:12px; color:var(--md-tertiary);">
        <strong>Mode:</strong> ${mode}%
      </div>
      <div style="background:var(--md-surface); padding:8px 12px; border-radius:12px; color:var(--md-on-surface);">
        <strong>Std Dev:</strong> ${std.toFixed(2)}
      </div>
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
  let h = '<table><tr><th>Task</th><th>Got</th><th>Max</th><th>%</th><th>Weight</th><th>Contrib</th></tr>';
  tasks.forEach(t => {
    const contrib = (t.Grade * t.Weight).toFixed(2);
    const perc = t.Grade.toFixed(1);
    h += `<tr>
      <td style="font-weight:600;">${t.Task}</td>
      <td>${t.MarkGotten}</td>
      <td>${t.MaxMark}</td>
      <td style="font-weight:600; color:${perc>=90?'#1dd1a1':perc>=80?'#f39c12':perc>=70?'#f368e0':perc>=60?'#2e86de':'#ee5a24'}">${perc}%</td>
      <td>${t.Weight}</td>
      <td style="font-weight:600; color:var(--md-primary);">${contrib}</td>
    </tr>`;
  });
  h += '</table>';
  return h;
}

/* ========== CHARTS ========== */
function renderCharts(bySubject) {
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

    new Chart(canvas.getContext('2d'), {
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
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.raw.toFixed(1)}%`
            }
          }
        },
        scales: {
          y: { 
            suggestedMin: 0, 
            suggestedMax: 100,
            grid: { color: 'rgba(123, 97, 255, 0.1)' }
          },
          x: { grid: { display: false } }
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

  Object.keys(bySubject).forEach((sub, i) => {
    const tasks = bySubject[sub];
    const wSum = tasks.reduce((s, t) => s + t.Grade * t.Weight, 0);
    const wTotal = tasks.reduce((s, t) => s + t.Weight, 0);
    const avg = wTotal > 0 ? wSum / wTotal : 0;
    labels.push(sub);
    data.push(avg);
    colors.push(COLORS[i % COLORS.length]);
  });

  const chartCard = document.createElement('div');
  chartCard.className = 'chart-card';
  chartCard.style.gridColumn = '1 / -1';
  chartCard.innerHTML = `<h3 style="margin:0 0 12px; background: linear-gradient(90deg, #7b61ff, #ff6b6b); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Subject Comparison</h3>`;
  
  const canvas = document.createElement('canvas');
  chartCard.appendChild(canvas);
  grid.appendChild(chartCard);

  new Chart(canvas.getContext('2d'), {
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
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.raw.toFixed(2)}%`
          }
        }
      },
      scales: {
        y: { 
          suggestedMin: 0, 
          suggestedMax: 100,
          grid: { color: 'rgba(123, 97, 255, 0.1)' },
          title: { display: true, text: 'Weighted Average (%)', color: '#7b61ff' }
        },
        x: { grid: { display: false } }
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
  setTimeout(() => {
    btn.innerHTML = original;
    btn.style.background = '';
  }, 1500);
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

/* ========== START APP ========== */
initApp();