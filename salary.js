import {
  requireUser,
  readAttendance,
  readRates,
  rateFor,
  summarize,
  yen,
  setupCommon,
  showError
} from './firebase.js';

await requireUser();
setupCommon();

const picker = document.getElementById('month-picker');
const display = document.getElementById('salary-display');
const reasons = document.getElementById('special-reasons-list');
const yearSelect = document.getElementById('year-select');
const totalTransportationDisplay = document.getElementById('total-transportation-display');
const totalTaxableDisplay = document.getElementById('total-taxable-display');

function transportationTotal(row) {
  const transportation = row.transportation || {};
  return (Number(transportation.help?.totalFare) || 0) +
    (Number(transportation.special?.totalFare) || 0);
}

try {
  const [data, rates] = await Promise.all([readAttendance(), readRates()]);

  function updateYearlySalary() {
    const selectedYear = yearSelect.value;
    const yearlyData = data.filter(row => row.date?.startsWith(`${selectedYear}-`));
    const yearlySalary = summarize(yearlyData, rates);
    const yearlyTransportation = yearlyData.reduce(
      (total, row) => total + transportationTotal(row),
      0
    );

    const yearlyGross = yearlySalary.total + yearlyTransportation;

    document.getElementById('total-salary-display').innerHTML =
      '<p><strong>' + yen(yearlyGross) + '</strong></p>' +
      '<p class="rate-hint">課税対象額 ' + yen(yearlySalary.total) +
      ' ＋ 交通費 ' + yen(yearlyTransportation) + '</p>' +
      (yearlySalary.missing ? '<p>※単価未設定の勤務があります。</p>' : '');

    totalTaxableDisplay.innerHTML =
      '<p><strong>' + yen(yearlySalary.total) + '</strong></p>' +
      '<p class="rate-hint">コマ給・事務給・特別給の合計</p>';

    totalTransportationDisplay.innerHTML =
      '<p><strong>' + yen(yearlyTransportation) + '</strong></p>';
  }

  const currentRate = rateFor(new Date().toISOString().slice(0, 10), rates);
  const currentRateDisplay = document.getElementById('current-rate');

  if (currentRate) {
    currentRateDisplay.innerHTML =
      '<p>通常コマ給：<strong>' + yen(currentRate.periodRate) + ' / コマ</strong></p>' +
      '<p>6コマ目：<strong>' + yen(Math.round(currentRate.periodRate * 1.25)) + '</strong></p>' +
      '<p>事務時給：<strong>' + yen(currentRate.officeHourlyRate) + ' / 時間</strong></p>' +
      '<p>適用開始日：' + currentRate.startDate + '</p>';
  } else {
    currentRateDisplay.textContent = '現在適用できる単価がありません。';
  }

  const years = [...new Set(
    data.map(row => row.date?.split('-')[0]).filter(Boolean)
  )].sort();

  years.forEach(year => yearSelect.add(new Option(year, year)));

  if (years.includes(String(new Date().getFullYear()))) {
    yearSelect.value = String(new Date().getFullYear());
  }

  yearSelect.addEventListener('change', () => {
    renderPicker();
    updateYearlySalary();
    display.replaceChildren();
    reasons.replaceChildren();
  });

  renderPicker();
  updateYearlySalary();

  function renderPicker() {
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
        cell.textContent = `${monthIndex + 1}月`;
        cell.addEventListener('click', () => {
          showSalary(`${yearSelect.value}-${String(monthIndex + 1).padStart(2, '0')}`);
        });
        row.appendChild(cell);
      }

      tableBody.appendChild(row);
    }

    table.appendChild(tableBody);
    picker.appendChild(table);
  }

  function showSalary(month) {
    const rows = data.filter(row => row.date?.startsWith(month));
    const salary = summarize(rows, rates);
    const transportation = rows.reduce(
      (total, row) => total + transportationTotal(row),
      0
    );

    const gross = salary.total + transportation;

    display.innerHTML =
      '<div class="salary-table-wrap"><table><thead><tr>' +
      '<th>出勤コマ</th><th>事務時間（分）</th>' +
      '<th>課税対象額</th><th>交通費</th><th>総支給額（交通費込み）</th>' +
      '</tr></thead><tbody><tr>' +
      '<td>' + salary.periods + '</td>' +
      '<td>' + salary.minutes + '</td>' +
      '<td>' + yen(salary.total) + '</td>' +
      '<td>' + yen(transportation) + '</td>' +
      '<td><strong>' + yen(gross) + '</strong></td>' +
      '</tr></tbody></table></div>' +
      (salary.missing ? '<p>※単価未設定の勤務があります。</p>' : '') +
      '<p class="rate-hint">総支給額 ＝ 課税対象額 ＋ 交通費</p>';

    reasons.replaceChildren();
    const special = rows.filter(row => row.specialReason && Number(row.specialAmount) > 0);

    if (special.length) {
      const list = document.createElement('ul');
      special.forEach(row => {
        const item = document.createElement('li');
        item.textContent = `${row.specialReason} (${yen(Number(row.specialAmount) || 0)})`;
        list.appendChild(item);
      });
      reasons.appendChild(list);
    } else {
      reasons.textContent = '特別給なし';
    }
  }
} catch (error) {
  showError(error);
}
