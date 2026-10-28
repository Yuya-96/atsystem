import {requireUser,readAttendance,readRates,rateFor,summarize,yen,setupCommon,showError} from './firebase.js';
await requireUser();setupCommon();const picker=document.getElementById('month-picker'),display=document.getElementById('salary-display'),reasons=document.getElementById('special-reasons-list'),yearSelect=document.getElementById('year-select');try{const [data,rates]=await Promise.all([readAttendance(),readRates()]);function updateYearlySalary() {
  const selectedYear = yearSelect.value;

  const yearlyData = data.filter(r =>
    r.date?.startsWith(selectedYear + '-')
  );

  const yearlySalary = summarize(yearlyData, rates);

  document.getElementById('total-salary-display').innerHTML =
    '<p><strong>' + yen(yearlySalary.total) + '</strong></p>' +
    (yearlySalary.missing
      ? '<p>※単価未設定の勤務があります。</p>'
      : '');
}const rate=rateFor(new Date().toISOString().slice(0,10),rates),current=document.getElementById('current-rate');if(rate){current.innerHTML='<p>通常コマ給：<strong>'+yen(rate.periodRate)+' / コマ</strong></p><p>6コマ目：<strong>'+yen(Math.round(rate.periodRate*1.25))+'</strong></p><p>事務時給：<strong>'+yen(rate.officeHourlyRate)+' / 時間</strong></p><p>適用開始日：'+rate.startDate+'</p>'}else current.textContent='現在適用できる単価がありません。';const years=[...new Set(data.map(r=>r.date?.split('-')[0]).filter(Boolean))].sort();years.forEach(y=>yearSelect.add(new Option(y,y)));if(years.includes(String(new Date().getFullYear())))yearSelect.value=String(new Date().getFullYear());yearSelect.addEventListener('change',()=>{
  renderPicker();
  updateYearlySalary();
  display.replaceChildren();
  reasons.replaceChildren();
});

renderPicker();
updateYearlySalary();function renderPicker(){picker.replaceChildren();if(!yearSelect.value)return;const t=document.createElement('table');t.innerHTML='<thead><tr><th colspan="3">'+yearSelect.value+'</th></tr></thead>';const tb=document.createElement('tbody');for(let i=0;i<4;i++){const tr=document.createElement('tr');for(let j=0;j<3;j++){const m=i*3+j,td=document.createElement('td');td.className='month';td.textContent=(m+1)+'月';td.onclick=()=>showSalary(yearSelect.value+'-'+String(m+1).padStart(2,'0'));tr.appendChild(td)}tb.appendChild(tr)}t.appendChild(tb);picker.appendChild(t)}function showSalary(month){const rows=data.filter(r=>r.date?.startsWith(month)),s=summarize(rows,rates);display.innerHTML='<div class="salary-table-wrap"><table><thead><tr><th>出勤コマ</th><th>事務時間（分）</th><th>給与</th></tr></thead><tbody><tr><td>'+s.periods+'</td><td>'+s.minutes+'</td><td>'+yen(s.total)+'</td></tr></tbody></table></div>'+(s.missing?'<p>※単価未設定の勤務があります。</p>':'');reasons.replaceChildren();const special=rows.filter(r=>r.specialReason && Number(r.specialAmount)>0);if(special.length){const ul=document.createElement('ul');special.forEach(r=>{const li=document.createElement('li');li.textContent=r.specialReason+' ('+yen(Number(r.specialAmount)||0)+')';ul.appendChild(li)});reasons.appendChild(ul)}else reasons.textContent='特別給なし'}}catch(e){showError(e)}
