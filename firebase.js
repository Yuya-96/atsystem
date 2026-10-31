import {
  initializeApp
} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';

import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch
} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';

import { setupMobileMenu } from './mobile-menu.js';

const firebaseConfig = {
  apiKey: 'AIzaSyC3kY7LmRxYCZn6-xLIV_jE8Z7NhO0JbWs',
  authDomain: 'atsystem-2d229.firebaseapp.com',
  projectId: 'atsystem-2d229',
  storageBucket: 'atsystem-2d229.firebasestorage.app',
  messagingSenderId: '788813868521',
  appId: '1:788813868521:web:1afe762612dbd2fac5ef78'
};

const app = initializeApp(firebaseConfig),
      auth = getAuth(app),
      db = getFirestore(app);

const provider = new GoogleAuthProvider();

let user = null;

const ready = new Promise(resolve =>
  onAuthStateChanged(auth, u => {
    user = u;
    resolve(u);
  })
);

function errorText(e) {
  return e?.code === 'permission-denied'
    ? 'Firestoreのアクセス権限がありません。セキュリティルールとログインUIDを確認してください。'
    : (e?.message || String(e));
}

function showGate() {
  const gate = document.createElement('div');

  gate.id = 'auth-gate';

  gate.innerHTML =
    '<div class="auth-card"><h2>出退勤システム</h2><p>Googleアカウントでログインしてください。</p><button id="login-btn">Googleでログイン</button><p id="login-error" role="alert"></p></div>';

  document.body.appendChild(gate);

  gate.querySelector('#login-btn').onclick = async () => {
    try {
      await signInWithPopup(auth, provider);
      location.reload();

    } catch (e) {
      gate.querySelector('#login-error').textContent = errorText(e);
    }
  };
}

export async function requireUser() {
  await ready;

  if (!user) {
    showGate();
    await new Promise(() => {});
  }

  document.documentElement.classList.remove('auth-pending');

  return user;
}

export function currentUser() {
  return user;
}

function col(name) {
  if (!user) throw new Error('ログインが必要です');

  return collection(db, 'users', user.uid, name);
}

export async function readAttendance() {
  const snap = await getDocs(col('attendance'));

  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function addAttendance(row) {
  const ref = doc(col('attendance'));

  await setDoc(ref, row);

  return ref.id;
}

export async function updateAttendance(id, row) {
  await setDoc(doc(col('attendance'), id), row);
}

export async function removeAttendance(id) {
  await deleteDoc(doc(col('attendance'), id));
}

export const DEFAULT_RATES = [
  {
    startDate: '2000-01-01',
    periodRate: 2183,
    officeHourlyRate: 1080
  }
];

export async function readRates() {
  const snap = await getDocs(col('rates'));

  const rates = snap.docs.map(d => d.data());

  return (rates.length ? rates : DEFAULT_RATES)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export async function saveRate(rate, oldStart = null) {
  const batch = writeBatch(db);

  if (oldStart && oldStart !== rate.startDate) {
    batch.delete(doc(col('rates'), oldStart));
  }

  batch.set(doc(col('rates'), rate.startDate), rate);

  await batch.commit();
}

export async function removeRate(start) {
  await deleteDoc(doc(col('rates'), start));
}

export const yen = n =>
  Number(n).toLocaleString('ja-JP', {
    maximumFractionDigits: 2
  }) + '円';

export function rateFor(date, rates) {
  return rates.filter(r => r.startDate <= date).at(-1) || null;
}

export function calculateRow(row, rates) {
  const rate = rateFor(row.date, rates);

  const periods = (row.periods || []).length;
  const minutes = Number(row.officeMinutes) || 0;
  const special = Number(row.specialAmount) || 0;

  if (!rate) {
    return {
      periods,
      minutes,
      special: Math.round(special),
      total: Math.round(special),
      missing: true
    };
  }

  // 通常コマ給
  const normalPay = periods * rate.periodRate;

  // 6コマ勤務の場合、6コマ目だけ25%割増
  const extraPay = periods === 6
    ? rate.periodRate * 0.25
    : 0;

  // コマ給を四捨五入
  const periodPay = Math.round(normalPay + extraPay);

  // 事務給を勤務日ごとに四捨五入
  const officePay = Math.round(
    (minutes / 60) * rate.officeHourlyRate
  );

  // 特別給も四捨五入
  const specialPay = Math.round(special);

  // すべて整数で合計
  const total = periodPay + officePay + specialPay;

  return {
    periods,
    minutes,
    special: specialPay,
    total,
    missing: false
  };
}

export function summarize(rows, rates) {
  return rows.reduce((acc, row) => {
    const r = calculateRow(row, rates);

    for (const k of ['periods', 'minutes', 'special', 'total']) {
      acc[k] += r[k];
    }

    if (r.missing) acc.missing++;

    return acc;
  }, {
    periods: 0,
    minutes: 0,
    special: 0,
    total: 0,
    missing: 0
  });
}

export function showError(e) {
  console.error(e);

  const el = document.getElementById('sync-status');

  if (el) {
    el.textContent = 'エラー：' + errorText(e);
  } else {
    alert('エラー：' + errorText(e));
  }
}

export function toast(s) {
  let el = document.getElementById('sync-status');

  if (!el) {
    el = document.createElement('div');
    el.id = 'sync-status';

    document.querySelector('.content')?.prepend(el);
  }

  el.textContent = s;
}

export async function logout() {
  await signOut(auth);
  location.reload();
}

export async function migrateLocal() {
  const raw = localStorage.getItem('attendance');
  const rawRates = localStorage.getItem('salaryRates');

  const attendance = raw ? JSON.parse(raw) : [],
        rates = rawRates ? JSON.parse(rawRates) : [];

  if (!Array.isArray(attendance) || !Array.isArray(rates)) {
    throw Error('保存データ形式が不正です');
  }

  const existing = await readAttendance();

  const seen = new Set(
    existing.map(r =>
      JSON.stringify([
        r.date,
        r.periods,
        r.officeMinutes,
        r.specialReason,
        r.specialAmount,
        r.isHelp,
        r.helpLocation,
        r.transportation || null
      ])
    )
  );

  let count = 0;

  for (const r of attendance) {
    const key = JSON.stringify([
      r.date,
      r.periods,
      r.officeMinutes,
      r.specialReason,
      r.specialAmount,
      r.isHelp,
      r.helpLocation,
      r.transportation || null
    ]);

    if (seen.has(key)) continue;

    const { id, ...row } = r;

    await addAttendance(row);

    seen.add(key);
    count++;
  }

  let rateCount = 0;

  const existingRates = await readRates();

  for (const r of rates) {
    if (
      existingRates.some(
        x =>
          x.startDate === r.startDate &&
          x.periodRate === r.periodRate &&
          x.officeHourlyRate === r.officeHourlyRate
      )
    ) {
      continue;
    }

    if (
      existingRates.some(
        x =>
          x.startDate === r.startDate &&
          JSON.stringify(x) !== JSON.stringify(r)
      )
    ) {
      throw Error(
        r.startDate +
        ' の単価がクラウドと異なります。単価設定画面で確認してください。'
      );
    }

    await saveRate(r);
    rateCount++;
  }

  return { count, rateCount };
}

export function downloadBackup() {
  const payload = {
    attendance: JSON.parse(
      localStorage.getItem('attendance') || '[]'
    ),
    salaryRates: JSON.parse(
      localStorage.getItem('salaryRates') || '[]'
    ),
    exportedAt: new Date().toISOString()
  };

  const url = URL.createObjectURL(
    new Blob(
      [JSON.stringify(payload, null, 2)],
      { type: 'application/json' }
    )
  );

  const a = document.createElement('a');

  a.href = url;
  a.download =
    '勤怠ローカルバックアップ_' +
    new Date().toISOString().slice(0, 10) +
    '.json';

  a.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function setupCommon() {

  // 今日の日付を表示
  const today = document.getElementById('today');

  if (today) {
    today.textContent = new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    }).format(new Date());
  }

  // ログアウトボタン
  const foot = document.querySelector('.sidebar-foot');

  if (foot && !foot.querySelector('.logout-btn')) {
    const button = document.createElement('button');

    button.className = 'logout-btn';
    button.textContent = 'ログアウト';
    button.onclick = logout;

    foot.prepend(button);
  }

  // 給与単価設定リンクが存在しない場合のみ追加
  const sidebar = document.querySelector('.sidebar');

  if (
    sidebar &&
    !sidebar.querySelector('a[href="rates.html"]')
  ) {
    const link = document.createElement('a');

    link.href = 'rates.html';
    link.className = 'nav-link';
    link.innerHTML =
      '<span class="nav-icon">¥</span>給与単価設定';

    if (foot) {
      foot.before(link);
    } else {
      sidebar.appendChild(link);
    }
  }

  setupMobileMenu();
}
