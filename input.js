import {
  requireUser,
  addAttendance,
  setupCommon,
  showError,
  toast
} from './firebase.js';
import { createTransportationEditor } from './transportation.js';

await requireUser();
setupCommon();

const form = document.getElementById('attendance-form');
const isHelp = document.getElementById('isHelp');
const helpArea = document.getElementById('helpSelectArea');
const locationSelect = document.getElementById('helpLocation');
const helpTransportationArea = document.getElementById('helpTransportationArea');
const hasSpecialTransport = document.getElementById('hasSpecialTransport');
const specialTransportationArea = document.getElementById('specialTransportationArea');

const helpTransportEditor = createTransportationEditor(
  document.getElementById('helpTransportEditor')
);
const specialTransportEditor = createTransportationEditor(
  document.getElementById('specialTransportEditor')
);

function toggleHelp() {
  helpArea.style.display = isHelp.checked ? 'block' : 'none';
  locationSelect.required = isHelp.checked;
  helpTransportationArea.hidden = !isHelp.checked;

  if (!isHelp.checked) {
    locationSelect.value = '';
  }
}

function toggleSpecialTransport() {
  specialTransportationArea.hidden = !hasSpecialTransport.checked;
}

isHelp.addEventListener('change', toggleHelp);
hasSpecialTransport.addEventListener('change', toggleSpecialTransport);

toggleHelp();
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

  const button = form.querySelector('[type="submit"]');
  button.disabled = true;

  const formData = new FormData(form);
  const transportation = {};

  if (isHelp.checked) {
    transportation.help = helpTransportEditor.getValue();
  }

  if (hasSpecialTransport.checked) {
    transportation.special = specialTransportEditor.getValue();
  }

  try {
    await addAttendance({
      date: formData.get('date'),
      periods: formData.getAll('periods'),
      officeMinutes: Number(formData.get('office_minutes') || 0),
      specialReason: formData.get('special_reason') || '',
      specialAmount: Number(formData.get('special_amount') || 0),
      isHelp: isHelp.checked,
      helpLocation: isHelp.checked ? locationSelect.value : '',
      transportation: Object.keys(transportation).length ? transportation : null
    });

    form.reset();
    helpArea.style.display = 'none';
    helpTransportationArea.hidden = true;
    specialTransportationArea.hidden = true;
    locationSelect.required = false;
    helpTransportEditor.reset();
    specialTransportEditor.reset();

    toast('✓ 打刻を保存しました');
  } catch (error) {
    showError(error);
  } finally {
    button.disabled = false;
  }
});
