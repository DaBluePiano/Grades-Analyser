// script.js
let subjects = [];
let subjectId = 0;

function addSubject() {
    const subjectDiv = document.createElement('div');
    subjectDiv.className = 'subject-section';
    subjectDiv.id = `subject-${subjectId}`;
    
    const subjectNameInput = document.createElement('input');
    subjectNameInput.type = 'text';
    subjectNameInput.placeholder = 'Subject Name (e.g., Math)';
    subjectNameInput.id = `subject-name-${subjectId}`;
    
    const addGradeBtn = document.createElement('button');
    addGradeBtn.textContent = 'Add Grade';
    addGradeBtn.onclick = () => addGradeEntry(subjectId);
    
    const removeSubjectBtn = document.createElement('button');
    removeSubjectBtn.textContent = 'Remove Subject';
    removeSubjectBtn.onclick = () => removeSubject(subjectId);
    
    subjectDiv.appendChild(subjectNameInput);
    subjectDiv.appendChild(addGradeBtn);
    subjectDiv.appendChild(removeSubjectBtn);
    subjectDiv.appendChild(document.createElement('div')); // Placeholder for grades
    
    document.getElementById('subjectsContainer').appendChild(subjectDiv);
    
    subjects.push({ id: subjectId, grades: [] });
    subjectId++;
}

function addGradeEntry(subId) {
    const subjectDiv = document.getElementById(`subject-${subId}`);
    const gradeDiv = document.createElement('div');
    gradeDiv.className = 'grade-entry';
    
    const periodInput = document.createElement('input');
    periodInput.type = 'text';
    periodInput.placeholder = 'Period (e.g., 2023-01-15)';
    
    const gradeInput = document.createElement('input');
    gradeInput.type = 'number';
    gradeInput.placeholder = 'Grade (0-100)';
    gradeInput.min = 0;
    gradeInput.max = 100;
    
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.onclick = () => gradeDiv.remove();
    
    gradeDiv.appendChild(periodInput);
    gradeDiv.appendChild(gradeInput);
    gradeDiv.appendChild(removeBtn);
    
    subjectDiv.appendChild(gradeDiv);
}

function removeSubject(subId) {
    document.getElementById(`subject-${subId}`).remove();
    subjects = subjects.filter(s => s.id !== subId);
}

function getManualData() {
    const data = [];
    subjects.forEach(sub => {
        const subjectName = document.getElementById(`subject-name-${sub.id}`).value.trim();
        if (!subjectName) return;
        
        const gradeEntries = document.querySelectorAll(`#subject-${sub.id} .grade-entry`);
        gradeEntries.forEach(entry => {
            const period = entry.querySelector('input[type="text"]').value.trim();
            const grade = parseFloat(entry.querySelector('input[type="number"]').value);
            if (period && !isNaN(grade)) {
                data.push({ Subject: subjectName, Period: period, Grade: grade });
            }
        });
    });
    return data;
}

function analyzeFromCSV() {
    const file = document.getElementById('csvFile').files[0];
    if (!file) {
        alert('Please upload a CSV file.');
        return;
    }

    Papa.parse(file, {
        header: true,
        complete: function(results) {
            const data = results.data.filter(row => row.Subject && row.Period && row.Grade);
            if (data.length === 0) {
                alert('No valid data found in CSV. Ensure columns are "Subject", "Period", and "Grade".');
                return;
            }
            processData(data.map(row => ({ ...row, Grade: parseFloat(row.Grade) })).filter(row => !isNaN(row.Grade)));
        }
    });
}

function analyzeGrades() {
    const data = getManualData();
    if (data.length === 0) {
        alert('No valid data entered.');
        return;
    }
    processData(data);
}

function processData(data) {
    const subjectsData = {};
    data.forEach(row => {
        if (!subjectsData[row.Subject]) {
            subjectsData[row.Subject] = [];
        }
        subjectsData[row.Subject].push({ Period: row.Period, Grade: row.Grade });
    });

    let html = '<h2>Overall Statistics</h2>';
    const allGrades = data.map(row => row.Grade);
    html += generateStatsHtml(allGrades, true);

    Object.keys(subjectsData).forEach(subject => {
        html += `<h2>${subject} Statistics</h2>`;
        const grades = subjectsData[subject].map(g => g.Grade);
        html += generateStatsHtml(grades);

        html += '<h3>Top 5 Grades</h3>';
        html += createTable(subjectsData[subject].slice().sort((a, b) => b.Grade - a.Grade).slice(0, 5));

        html += '<h3>Bottom 5 Grades</h3>';
        html += createTable(subjectsData[subject].slice().sort((a, b) => a.Grade - b.Grade).slice(0, 5));
    });

    document.getElementById('results').innerHTML = html;

    // Clear previous charts
    document.getElementById('chartsContainer').innerHTML = '';

    // Overall chart
    addChart('Overall Grades Over Time', data.sort((a, b) => new Date(a.Period) - new Date(b.Period)).map(row => row.Grade), data.map(row => row.Period));

    // Per subject charts
    Object.keys(subjectsData).forEach(subject => {
        const subjectData = subjectsData[subject].sort((a, b) => new Date(a.Period) - new Date(b.Period));
        addChart(`${subject} Grades Over Time`, subjectData.map(g => g.Grade), subjectData.map(g => g.Period));
    });
}

function generateStatsHtml(grades, isOverall = false) {
    const mean = grades.reduce((a, b) => a + b, 0) / grades.length;
    const sortedGrades = [...grades].sort((a, b) => a - b);
    const median = sortedGrades.length % 2 === 0 
        ? (sortedGrades[sortedGrades.length / 2 - 1] + sortedGrades[sortedGrades.length / 2]) / 2 
        : sortedGrades[Math.floor(sortedGrades.length / 2)];
    const mode = getMode(grades);
    const stdDev = Math.sqrt(grades.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / grades.length);
    const min = Math.min(...grades);
    const max = Math.max(...grades);
    const quartiles = getQuartiles(sortedGrades);
    const trend = getTrend(grades);

    let html = `<p>Mean: ${mean.toFixed(2)}</p>`;
    html += `<p>Median: ${median.toFixed(2)}</p>`;
    html += `<p>Mode: ${mode.toFixed(2)}</p>`;
    html += `<p>Standard Deviation: ${stdDev.toFixed(2)}</p>`;
    html += `<p>Minimum: ${min.toFixed(2)}</p>`;
    html += `<p>Maximum: ${max.toFixed(2)}</p>`;
    html += `<p>1st Quartile: ${quartiles[0].toFixed(2)}</p>`;
    html += `<p>2nd Quartile (Median): ${quartiles[1].toFixed(2)}</p>`;
    html += `<p>3rd Quartile: ${quartiles[2].toFixed(2)}</p>`;
    html += `<p>Trend (slope): ${trend.toFixed(2)} (positive indicates improvement over time)</p>`;

    if (isOverall) {
        const total = grades.reduce((a, b) => a + b, 0);
        html += `<p>Total Score: ${total.toFixed(2)}</p>`;
    }

    return html;
}

function getMode(arr) {
    const freq = {};
    arr.forEach(num => freq[num] = (freq[num] || 0) + 1);
    const maxFreq = Math.max(...Object.values(freq));
    return parseFloat(Object.keys(freq).find(key => freq[key] === maxFreq));
}

function getQuartiles(sortedArr) {
    const q1 = percentile(sortedArr, 25);
    const q2 = percentile(sortedArr, 50);
    const q3 = percentile(sortedArr, 75);
    return [q1, q2, q3];
}

function percentile(sortedArr, p) {
    const index = (p / 100) * (sortedArr.length - 1);
    if (Number.isInteger(index)) return sortedArr[index];
    const lower = Math.floor(index);
    const fraction = index - lower;
    return sortedArr[lower] + fraction * (sortedArr[lower + 1] - sortedArr[lower]);
}

function getTrend(grades) {
    const n = grades.length;
    const x = Array.from({length: n}, (_, i) => i + 1);
    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = grades.reduce((a, b) => a + b, 0) / n;
    const ssXY = x.reduce((sum, xi, i) => sum + (xi - meanX) * (grades[i] - meanY), 0);
    const ssXX = x.reduce((sum, xi) => sum + (xi - meanX) ** 2, 0);
    return ssXY / ssXX;
}

function createTable(data) {
    let table = '<table><tr><th>Period</th><th>Grade</th></tr>';
    data.forEach(row => {
        table += `<tr><td>${row.Period}</td><td>${row.Grade.toFixed(2)}</td></tr>`;
    });
    table += '</table>';
    return table;
}

function addChart(title, grades, periods) {
    const chartsContainer = document.getElementById('chartsContainer');
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 400;
    chartsContainer.appendChild(canvas);

    // Assume periods are sortable; if dates, sort accordingly
    const isDate = periods.every(p => !isNaN(Date.parse(p)));
    let sortedPeriods = periods;
    let sortedGrades = grades;
    if (isDate) {
        const combined = periods.map((p, i) => ({ period: p, grade: grades[i] }));
        combined.sort((a, b) => new Date(a.period) - new Date(b.period));
        sortedPeriods = combined.map(c => c.period);
        sortedGrades = combined.map(c => c.grade);
    }

    new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: sortedPeriods,
            datasets: [{
                label: title,
                data: sortedGrades,
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                fill: true
            }]
        },
        options: {
            scales: {
                y: { beginAtZero: false, suggestedMin: 0, suggestedMax: 100 },
                x: { title: { display: true, text: 'Period' } }
            }
        }
    });
}

// Initialize with one subject
addSubject();