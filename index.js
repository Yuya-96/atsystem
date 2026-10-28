import { requireUser, readAttendance, readRates, summarize, yen, setupCommon, showError, migrateLocal, downloadBackup } from './firebase.js';
await requireUser();
setupCommon();
const salaryChartYear=document.getElementById('salary-chart-year');
const salaryChart=document.getElementById('salary-chart');
const salaryChartTotal=document.getElementById('salary-chart-total');
const salaryChartNote=document.getElementById('salary-chart-note');
let attendance=[],rates=[];
try {
  [attendance,rates]=await Promise.all([readAttendance(),readRates()]);
  const now=new Date();
  const currentMonth=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  const thisMonth=attendance.filter(row=>row.date?.startsWith(currentMonth));
  document.getElementById('days').textContent=new Set(thisMonth.map(row=>row.date)).size+' 日';
  document.getElementById('period-count').textContent=thisMonth.reduce((sum,row)=>sum+(row.periods||[]).length,0)+' コマ';
  document.getElementById('minutes').textContent=thisMonth.reduce((sum,row)=>sum+(Number(row.officeMinutes)||0),0)+' 分';
  document.getElementById('records').textContent=attendance.length+' 件';
  const recent=document.getElementById('recent');
  const recentRows=attendance.slice().sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,5);
  if(!recentRows.length) recent.textContent='まだ勤務記録がありません。打刻入力から登録できます。';
  else {
    const table=document.createElement('table');
    table.innerHTML='<thead><tr><th>日付</th><th>出勤コマ</th><th>事務時間</th></tr></thead>';
    const tbody=document.createElement('tbody');
    recentRows.forEach(row=>{const tr=document.createElement('tr');[row.date||'—',(row.periods||[]).join('・')||'—',(Number(row.officeMinutes)||0)+' 分'].forEach(value=>{const td=document.createElement('td');td.textContent=value;tr.appendChild(td)});tbody.appendChild(tr)});
    table.appendChild(tbody);recent.appendChild(table);
  }
  setupSalaryChart();
} catch(error) { showError(error); }
function setupSalaryChart(){
  const currentYear=String(new Date().getFullYear());
  const years=[...new Set([...attendance.map(row=>row.date?.slice(0,4)).filter(Boolean),currentYear])].sort();
  years.forEach(year=>salaryChartYear.add(new Option(year+'年',year)));
  salaryChartYear.value=years.includes(currentYear)?currentYear:years[years.length-1];
  salaryChartYear.addEventListener('change',renderSalaryChart);renderSalaryChart();
}
function renderSalaryChart(){
  const year=salaryChartYear.value;salaryChart.replaceChildren();salaryChartNote.textContent='';
  const monthSummaries=Array.from({length:12},(_,index)=>{
    const month=String(index+1).padStart(2,'0');
    const rows=attendance.filter(row=>row.date?.startsWith(year+'-'+month));
    return {month:index+1,summary:summarize(rows,rates)};
  });
  const annualTotal=monthSummaries.reduce((sum,item)=>sum+item.summary.total,0);
  salaryChartTotal.textContent=yen(annualTotal);
  const maxTotal=Math.max(1,...monthSummaries.map(item=>item.summary.total));
  monthSummaries.forEach(({month,summary})=>{
    const column=document.createElement('div');column.className='salary-chart-column';
    const amount=document.createElement('div');amount.className='salary-chart-amount';amount.textContent=summary.total>0?yen(summary.total):'';
    const track=document.createElement('div');track.className='salary-chart-track';
    const bar=document.createElement('div');bar.className='salary-chart-bar'+(summary.total>0?'':' is-empty');
    bar.style.height=summary.total>0?Math.max(3,(summary.total/maxTotal)*100)+'%':'3px';
    bar.title=month+'月：'+yen(summary.total);bar.setAttribute('aria-label',month+'月 '+yen(summary.total));track.appendChild(bar);
    const label=document.createElement('div');label.className='salary-chart-month';label.textContent=month+'月';
    column.append(amount,track,label);salaryChart.appendChild(column);
  });
  const missingRates=monthSummaries.some(item=>item.summary.missing>0);
  if(missingRates) salaryChartNote.textContent='※単価未設定の勤務がある月は、その勤務の給与が正しく計算されていない可能性があります。給与単価設定を確認してください。';
  else if(annualTotal===0) salaryChartNote.textContent='この年の勤務記録はまだありません。';
  else salaryChartNote.textContent='棒にマウスを合わせると各月の支給額を確認できます。';
}
document.getElementById('backup-local').onclick=downloadBackup;
document.getElementById('migrate-local').onclick=async()=>{
  if(!confirm('この端末のローカルデータをクラウドへ追加します。先にバックアップを取りましたか？'))return;
  const button=document.getElementById('migrate-local');button.disabled=true;
  try{const result=await migrateLocal();document.getElementById('migration-result').textContent=`勤怠 ${result.count}件・単価 ${result.rateCount}件を移行しました。ページを再読み込みすると反映されます。`}
  catch(error){showError(error)}finally{button.disabled=false}
};
