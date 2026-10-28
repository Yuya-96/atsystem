import { requireUser, readAttendance, setupCommon, showError } from './firebase.js';
await requireUser();setupCommon();
const yearSelect=document.getElementById('year-select'),picker=document.getElementById('month-picker'),body=document.getElementById('attendance-body');
const tableWrap=document.getElementById('attendance-table-wrap'),calendar=document.getElementById('attendance-calendar'),dayDetails=document.getElementById('calendar-day-details');
const monthTitle=document.getElementById('selected-month-title'),listButton=document.getElementById('list-view-button'),calendarButton=document.getElementById('calendar-view-button');
const months=Array.from({length:12},(_,i)=>(i+1)+'月');let data=[],selectedMonth=null,viewMode='list';
try{data=await readAttendance()}catch(error){showError(error)}
const currentYear=String(new Date().getFullYear());
const years=[...new Set([...data.map(row=>row.date?.split('-')[0]).filter(Boolean),currentYear])].sort();
years.forEach(year=>yearSelect.add(new Option(year,year)));yearSelect.value=years.includes(currentYear)?currentYear:years[years.length-1];
yearSelect.addEventListener('change',()=>{selectedMonth=null;monthTitle.textContent='上の年月を選択してください。';body.replaceChildren();calendar.replaceChildren();dayDetails.hidden=true;dayDetails.replaceChildren();renderMonthPicker()});listButton.addEventListener('click',()=>setViewMode('list'));calendarButton.addEventListener('click',()=>setViewMode('calendar'));renderMonthPicker();
function renderMonthPicker(){
 picker.replaceChildren();if(!yearSelect.value)return;const table=document.createElement('table');table.className='month-picker-table';
 const thead=document.createElement('thead'),headerRow=document.createElement('tr'),header=document.createElement('th');header.colSpan=3;header.textContent=yearSelect.value+'年';headerRow.appendChild(header);thead.appendChild(headerRow);table.appendChild(thead);
 const tbody=document.createElement('tbody');for(let rowIndex=0;rowIndex<4;rowIndex++){const tr=document.createElement('tr');for(let colIndex=0;colIndex<3;colIndex++){
  const monthNumber=rowIndex*3+colIndex+1,td=document.createElement('td');td.className='month'+(selectedMonth===yearSelect.value+'-'+String(monthNumber).padStart(2,'0')?' selected':'');td.textContent=months[monthNumber-1];td.tabIndex=0;td.setAttribute('role','button');td.setAttribute('aria-label',yearSelect.value+'年'+monthNumber+'月を表示');
  td.addEventListener('click',()=>showMonth(yearSelect.value+'-'+String(monthNumber).padStart(2,'0')));td.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();showMonth(yearSelect.value+'-'+String(monthNumber).padStart(2,'0'))}});tr.appendChild(td)
 }tbody.appendChild(tr)}table.appendChild(tbody);picker.appendChild(table)
}
function showMonth(month){selectedMonth=month;monthTitle.textContent=Number(month.slice(5,7))+'月の勤務記録';dayDetails.hidden=true;dayDetails.replaceChildren();renderMonthPicker();renderTable(month);renderCalendar(month)}
function setViewMode(mode){viewMode=mode;const isList=mode==='list';tableWrap.hidden=!isList;calendar.hidden=isList;listButton.classList.toggle('active',isList);calendarButton.classList.toggle('active',!isList);listButton.setAttribute('aria-pressed',String(isList));calendarButton.setAttribute('aria-pressed',String(!isList));if(selectedMonth){renderTable(selectedMonth);renderCalendar(selectedMonth)}}
function rowsForMonth(month){return data.filter(row=>row.date?.startsWith(month)).sort((a,b)=>(a.date||'').localeCompare(b.date||''))}
function rowRemarks(row){const remarks=[];if(row.isHelp&&row.helpLocation)remarks.push('ヘルプ '+row.helpLocation);if(row.specialReason)remarks.push('特別：'+row.specialReason);return remarks.join(' / ')||'—'}
function renderTable(month){
 body.replaceChildren();rowsForMonth(month).forEach(row=>{const tr=document.createElement('tr');[row.date||'—',(row.periods||[]).join(', ')||'—',Number(row.officeMinutes)||0,rowRemarks(row)].forEach(value=>{const td=document.createElement('td');td.textContent=value;tr.appendChild(td)});
 const actionCell=document.createElement('td'),editButton=document.createElement('button');editButton.textContent='編集';editButton.addEventListener('click',()=>{location.href='edit.html?id='+encodeURIComponent(row.id)});actionCell.appendChild(editButton);tr.appendChild(actionCell);body.appendChild(tr)});
 if(!body.children.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=5;td.className='empty-table-message';td.textContent='この月の勤務記録はありません。';tr.appendChild(td);body.appendChild(tr)}
}
function renderCalendar(month){
 calendar.replaceChildren();const [year,monthNumber]=month.split('-').map(Number),firstDay=new Date(year,monthNumber-1,1).getDay(),daysInMonth=new Date(year,monthNumber,0).getDate(),weekdays=['日','月','火','水','木','金','土'];
 const grid=document.createElement('div');grid.className='calendar-grid';weekdays.forEach((weekday,index)=>{const heading=document.createElement('div');heading.className='calendar-weekday'+(index===0?' sunday':'')+(index===6?' saturday':'');heading.textContent=weekday;grid.appendChild(heading)});
 for(let blank=0;blank<firstDay;blank++){const empty=document.createElement('div');empty.className='calendar-day calendar-day-empty';empty.setAttribute('aria-hidden','true');grid.appendChild(empty)}
 for(let day=1;day<=daysInMonth;day++){
  const date=year+'-'+String(monthNumber).padStart(2,'0')+'-'+String(day).padStart(2,'0'),dayRows=data.filter(row=>row.date===date);
  const dayPeriods=dayRows.reduce((sum,row)=>sum+(row.periods||[]).length,0),dayMinutes=dayRows.reduce((sum,row)=>sum+(Number(row.officeMinutes)||0),0),dateDay=new Date(year,monthNumber-1,day).getDay();
  const cell=document.createElement('button');cell.type='button';cell.className='calendar-day'+(dayRows.length?' has-attendance':'')+(dateDay===0?' sunday':'')+(dateDay===6?' saturday':'');cell.setAttribute('aria-label',date+'、'+(dayRows.length?dayRows.length+'件の勤務記録':'勤務記録なし'));cell.addEventListener('click',()=>showDayDetails(date,dayRows));
  const dayNumber=document.createElement('span');dayNumber.className='calendar-day-number';dayNumber.textContent=String(day);cell.appendChild(dayNumber);
  if(dayRows.length){const count=document.createElement('span');count.className='calendar-day-periods';count.textContent=dayPeriods+'コマ';cell.appendChild(count);
   if(dayMinutes>0){const minutes=document.createElement('span');minutes.className='calendar-day-minutes';minutes.textContent=dayMinutes+'分';cell.appendChild(minutes)}
   if(dayRows.some(row=>row.isHelp)){const help=document.createElement('span');help.className='calendar-day-tag';help.textContent='ヘルプ';cell.appendChild(help)}
  }grid.appendChild(cell)
 }calendar.appendChild(grid)
}
function showDayDetails(date,rows){
 dayDetails.replaceChildren();dayDetails.hidden=false;const heading=document.createElement('h3');heading.textContent=date+' の勤務詳細';dayDetails.appendChild(heading);
 if(!rows.length){const message=document.createElement('p');message.textContent='この日の勤務記録はありません。';dayDetails.appendChild(message);return}
 rows.forEach((row,index)=>{const item=document.createElement('div');item.className='calendar-detail-item';const summary=document.createElement('div');summary.className='calendar-detail-summary';const periods=(row.periods||[]).join('・')||'コマ記録なし';summary.textContent=(rows.length>1?'記録 '+(index+1)+'：':'')+periods+' ／ 事務 '+(Number(row.officeMinutes)||0)+'分 ／ '+rowRemarks(row);item.appendChild(summary);
  const editButton=document.createElement('button');editButton.type='button';editButton.textContent='この記録を編集';editButton.addEventListener('click',()=>{location.href='edit.html?id='+encodeURIComponent(row.id)});item.appendChild(editButton);dayDetails.appendChild(item)});
 dayDetails.scrollIntoView({behavior:'smooth',block:'nearest'})
}
