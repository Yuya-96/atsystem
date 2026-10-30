```javascript
import {
  requireUser,
  addAttendance,
  setupCommon,
  showError,
  toast
} from './firebase.js';

await requireUser();
setupCommon();

const form = document.getElementById('attendance-form'),
      isHelp = document.getElementById('isHelp'),
      area = document.getElementById('helpSelectArea'),
      locationSelect = document.getElementById('helpLocation');

// ヘルプ勤務の選択状態に応じて表示を切り替え
isHelp.addEventListener('change', () => {
  area.style.display = isHelp.checked ? 'block' : 'none';
  locationSelect.required = isHelp.checked;

  if (!isHelp.checked) {
    locationSelect.value = '';
  }
});

// 打刻データの保存
form.addEventListener('submit', async e => {
  e.preventDefault();

  if (!form.reportValidity()) return;

  const button = form.querySelector('[type="submit"]');
  button.disabled = true;

  const f = new FormData(form);

  try {
    await addAttendance({
      date: f.get('date'),
      periods: f.getAll('periods'),
      officeMinutes: Number(f.get('office_minutes') || 0),
      specialReason: f.get('special_reason') || '',
      specialAmount: Number(f.get('special_amount') || 0),
      isHelp: isHelp.checked,
      helpLocation: isHelp.checked ? locationSelect.value : ''
    });

    form.reset();

    area.style.display = 'none';
    locationSelect.required = false;

    toast('✓ 打刻を保存しました');

  } catch (err) {
    showError(err);

  } finally {
    button.disabled = false;
  }
});
