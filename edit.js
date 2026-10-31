import {
  requireUser,
  readAttendance,
  updateAttendance,
  removeAttendance,
  setupCommon,
  showError,
  toast
} from './firebase.js';
import { createTransportationEditor } from './transportation.js';

await requireUser();
setupCommon();

const form = document.getElementById('edit-form');
const isHelp = document.getElementById('isHelp');
const helpArea = document.getElementById('helpSelectArea');
const helpLocation = document.getElementById('helpLocation');
const helpTransportationArea = document.getElementById('helpTransportationArea');
const hasSpecialTransport = document.getElementById('hasSpecialTransport');
const specialTransportationArea = document.getElementById('specialTransportationArea');
const params = new URLSearchParams(location.search);

let helpTransportEditor;
let specialTransportEditor;

function toggleHelp() {
  helpArea.style.display = isHelp.checked ? 'block' : 'none';
  helpLocation.required = isHelp.checked;
  helpTransportationArea.hidden = !isHelp.checked;

  if (!isHelp.checked) {
    helpLocation.value = '';
  }
}

function toggleSpecialTransport() {
  specialTransportationArea.hidden = !hasSpecialTransport.checked;
}

isHelp.addEventListener('change', toggleHelp);
hasSpecialTransport.addEventListener('change', toggleSpecialTransport);

try {
  const data = await readAttendance();
  const record = data.find(item =>
    params.has('id')
      ? item.id === params.get('id')
      : item.date === params.get('date')
  );

  if (!record) {
    toast('該当する勤務記録が見つかりません。');
    form.querySelectorAll('input, button, select').forEach(element => {
      element.disabled = true;
    });
  } else {
    form.elements.date.value = record.date;

    form.querySelectorAll('[name="periods"]').forEach(element => {
      element.checked = (record.periods || []).map(String).includes(element.value);
    });

    form.elements.office_minutes.value = record.officeMinutes ?? 0;
    form.elements.special_reason.value = record.specialReason || '';
    form.elements.special_amount.value = record.specialAmount ?? 0;

    isHelp.checked = Boolean(record.isHelp || record.helpLocation);

    if (
      record.helpLocation &&
      !Array.from(helpLocation.options).some(option => option.value === record.helpLocation)
    ) {
      helpLocation.add(new Option(record.helpLocation, record.helpLocation));
    }

    helpLocation.value = record.helpLocation || '';
    helpTransportEditor = createTransportationEditor(
      document.getElementById('helpTransportEditor'),
      record.transportation?.help || null
    );
    specialTransportEditor = createTransportationEditor(
      document.getElementById('specialTransportEditor'),
      record.transportation?.special || null
    );

    toggleHelp();
    hasSpecialTransport.checked = Boolean(record.transportation?.special);
    toggleSpecialTransport();

    form.addEventListener('submit', async event => {
      event.preventDefault();

      if (!form.reportValidity()) return;

      if (isHelp.checked) {
        const error = helpTransportEditor.validate();
        if (error) {
          toast(error);
          return;
        }
      }

      if (hasSpecialTransport.checked) {
        const error = specialTransportEditor.validate();
        if (error) {
          toast(error);
          return;
        }
      }

      const formData = new FormData(form);
      const newDate = formData.get('date');

      if (
        newDate !== record.date &&
        data.some(item => item.id !== record.id && item.date === newDate)
      ) {
        toast('変更先の日付には既に勤務記録があります。');
        return;
      }

      const button = document.getElementById('saveBtn');
      button.disabled = true;

      const transportation = {};
      if (isHelp.checked) transportation.help = helpTransportEditor.getValue();
      if (hasSpecialTransport.checked) transportation.special = specialTransportEditor.getValue();

      try {
        await updateAttendance(record.id, {
          date: newDate,
          periods: formData.getAll('periods'),
          officeMinutes: Number(formData.get('office_minutes') || 0),
          specialReason: formData.get('special_reason') || '',
          specialAmount: Number(formData.get('special_amount') || 0),
          isHelp: isHelp.checked,
          helpLocation: isHelp.checked ? helpLocation.value : '',
          transportation: Object.keys(transportation).length ? transportation : null
        });

        location.href = 'list.html';
      } catch (error) {
        showError(error);
        button.disabled = false;
      }
    });

    document.getElementById('deleteBtn').onclick = async () => {
      if (!confirm('この打刻データを削除しますか？')) return;

      try {
        await removeAttendance(record.id);
        location.href = 'list.html';
      } catch (error) {
        showError(error);
      }
    };
  }
} catch (error) {
  showError(error);
}
