import {
  requireUser,
  readAttendance,
  updateAttendance,
  removeAttendance,
  setupCommon,
  showError,
  toast
} from './firebase.js';

await requireUser();
setupCommon();

const form = document.getElementById('edit-form'),
      isHelp = document.getElementById('isHelp'),
      area = document.getElementById('helpSelectArea'),
      helpLocation = document.getElementById('helpLocation'),
      params = new URLSearchParams(location.search);

function toggle() {
  area.style.display = isHelp.checked ? 'block' : 'none';
  helpLocation.required = isHelp.checked;

  if (!isHelp.checked) {
    helpLocation.value = '';
  }
}

isHelp.addEventListener('change', toggle);

try {
  const data = await readAttendance();

  const record = data.find(r =>
    params.has('id')
      ? r.id === params.get('id')
      : r.date === params.get('date')
  );

  if (!record) {
    toast('該当する勤務記録が見つかりません。');

    form.querySelectorAll('input,button,select').forEach(e =>
      e.disabled = true
    );

  } else {
    form.elements.date.value = record.date;

    form.querySelectorAll('[name="periods"]').forEach(el =>
      el.checked = (record.periods || []).map(String).includes(el.value)
    );

    form.elements.office_minutes.value = record.officeMinutes ?? 0;
    form.elements.special_reason.value = record.specialReason || '';
    form.elements.special_amount.value = record.specialAmount ?? 0;

    isHelp.checked = Boolean(record.isHelp || record.helpLocation);

    if (
      record.helpLocation &&
      !Array.from(helpLocation.options).some(
        o => o.value === record.helpLocation
      )
    ) {
      helpLocation.add(
        new Option(record.helpLocation, record.helpLocation)
      );
    }

    helpLocation.value = record.helpLocation || '';

    toggle();

    form.addEventListener('submit', async e => {
      e.preventDefault();

      if (!form.reportValidity()) return;

      const f = new FormData(form),
            newDate = f.get('date');

      if (
        newDate !== record.date &&
        data.some(r => r.id !== record.id && r.date === newDate)
      ) {
        toast('変更先の日付には既に勤務記録があります。');
        return;
      }

      const btn = document.getElementById('saveBtn');
      btn.disabled = true;

      try {
        await updateAttendance(record.id, {
          date: newDate,
          periods: f.getAll('periods'),
          officeMinutes: Number(f.get('office_minutes') || 0),
          specialReason: f.get('special_reason') || '',
          specialAmount: Number(f.get('special_amount') || 0),
          isHelp: isHelp.checked,
          helpLocation: isHelp.checked ? helpLocation.value : ''
        });

        location.href = 'list.html';

      } catch (err) {
        showError(err);
        btn.disabled = false;
      }
    });

    document.getElementById('deleteBtn').onclick = async () => {
      if (!confirm('この打刻データを削除しますか？')) return;

      try {
        await removeAttendance(record.id);
        location.href = 'list.html';

      } catch (err) {
        showError(err);
      }
    };
  }

} catch (e) {
  showError(e);
}
