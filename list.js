import {
  requireUser,
  readAttendance,
  setupCommon,
  showError,
  yen
} from './firebase.js';

await requireUser();
setupCommon();

const yearSelect = document.getElementById('year-select');
const picker = document.getElementById('month-picker');
const body = document.getElementById('attendance-body');
const months = Array.from({ length: 12 }, (_, index) => `${index + 1}月`);

let data = [];

try {
  data = await readAttendance();
} catch (error) {
  showError(error);
}

const years = [...new Set(
  data.map(row => row.date?.split('-')[0]).filter(Boolean)
)].sort();

years.forEach(year => yearSelect.add(new Option(year, year)));

if (years.includes(String(new Date().getFullYear()))) {
  yearSelect.value = String(new Date().getFullYear());
}

yearSelect.addEventListener('change', renderMonthPicker);
renderMonthPicker();

function transportationTotal(row) {
  const transportation = row.transportation || {};
  return (Number(transportation.help?.totalFare) || 0) +
    (Number(transportation.special?.totalFare) || 0);
}

function renderMonthPicker() {
  picker.replaceChildren();
  if (!yearSelect.value) return;

  const table = document.createElement('table');
  table.innerHTML = `<thead><tr><th colspan="3">${yearSelect.value}</th></tr></thead>`;

  const tableBody = document.createElement('tbody');

  for (let rowIndex = 0; rowIndex < 4; rowIndex++) {
    const row = document.createElement('tr');

    for (let columnIndex = 0; columnIndex < 3; columnIndex++) {
      const monthIndex = rowIndex * 3 + columnIndex;
      const cell = document.createElement('td');
      cell.className = 'month';
      cell.textContent = months[monthIndex];
      cell.addEventListener('click', () => {
        showAttendance(`${yearSelect.value}-${String(monthIndex + 1).padStart(2, '0')}`);
      });
      row.appendChild(cell);
    }

    tableBody.appendChild(row);
  }

  table.appendChild(tableBody);
  picker.appendChild(table);
}

function showAttendance(month) {
  body.replaceChildren();

  data
    .filter(row => row.date?.startsWith(month))
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach(row => {
      const tableRow = document.createElement('tr');
      const remarks = [];

      if (row.isHelp && row.helpLocation) remarks.push(`ヘルプ ${row.helpLocation}`);
      if (row.specialReason) remarks.push(`特別：${row.specialReason}`);

      const fare = transportationTotal(row);
      const values = [
        row.date,
        (row.periods || []).join(', '),
        Number(row.officeMinutes) || 0,
        fare ? yen(fare) : '—',
        remarks.join(' / ') || '—'
      ];

      values.forEach(value => {
        const cell = document.createElement('td');
        cell.textContent = value;
        tableRow.appendChild(cell);
      });

      const editCell = document.createElement('td');
      const editButton = document.createElement('button');
      editButton.textContent = '編集';
      editButton.addEventListener('click', () => {
        location.href = `edit.html?id=${encodeURIComponent(row.id)}`;
      });
      editCell.appendChild(editButton);
      tableRow.appendChild(editCell);
      body.appendChild(tableRow);
    });
}
