# 出退勤システム — 完全版 README・開発／運用取扱説明書

> 個人用の勤怠記録・給与確認Webアプリ。HTML / CSS / JavaScript、Firebase Authentication、Cloud Firestore、GitHub Pagesで構成。

## 目次

1. [この文書の前提・確認範囲](#1-この文書の前提確認範囲)
2. [システム概要と全体構成](#2-システム概要と全体構成)
3. [ファイル構成と各ファイルの役割](#3-ファイル構成と各ファイルの役割)
4. [画面ごとの機能と処理の流れ](#4-画面ごとの機能と処理の流れ)
5. [Firebase・ログイン・データ保存](#5-firebaseログインデータ保存)
6. [勤怠データと給与単価のデータ形式](#6-勤怠データと給与単価のデータ形式)
7. [給与計算の詳しい仕様](#7-給与計算の詳しい仕様)
8. [変更したい内容から編集ファイルを探す](#8-変更したい内容から編集ファイルを探す)
9. [CSS・アイコン・スマホメニュー](#9-cssアイコンスマホメニュー)
10. [初期導入・GitHub Pagesへの反映](#10-初期導入github-pagesへの反映)
11. [データ移行・バックアップ・復元の注意](#11-データ移行バックアップ復元の注意)
12. [トラブルシューティング](#12-トラブルシューティング)
13. [変更時のチェックリスト](#13-変更時のチェックリスト)
14. [今後の保守・改善メモ](#14-今後の保守改善メモ)

---

## 1. この文書の前提・確認範囲

この文書は、共有された `atsystem-グラフとカレンダー追加版.zip` 内のコード（18ファイル）を確認し、**その後の会話で提示された `firebase.js`、`input.js`、`edit.js`、`salary.js`、`input.html` の変更情報**を併せて整理したものです。

**重要なバージョン差分**：ZIP版には `mobile-menu.js`、`manifest.webmanifest`、`apple-touch-icon.png` は含まれていません。これらは後から導入を案内したファイルです。現在のリポジトリに実際に置かれているかは未確認です。`salary.js` の「特別給0円を内訳から除外する」変更も、ZIP内では反映前の可能性があります。以下では「ZIPで確認済み」「会話で追加予定／変更済み」を区別します。

本READMEは**説明書**です。READMEを配置しただけで機能が追加されたり、Firebaseの設定が変わったりすることはありません。実際の画面・Firebase接続の動作確認は行っていません。

## 2. システム概要と全体構成

### 2.1 できること

- Googleアカウントでログインする。
- 日付、1〜6限の出勤コマ、事務作業時間（分）、特別給（円）、備考を登録する。
- ヘルプ勤務をチェックしてヘルプ先教室を選択する。
- 保存済み勤怠を一覧表示し、編集・削除する。
- 月別の勤怠をカレンダーで確認する（グラフ・カレンダー追加版）。
- 適用開始日付きの給与単価を登録・編集・削除する。
- 月別・年別の給与を確認する。
- ダッシュボードに今月の勤務状況、最近の勤務履歴、月別給与グラフを表示する。
- 旧 `localStorage` の勤怠・単価をFirestoreへ移行する。
- 旧ローカルデータをJSON形式で書き出す。

### 2.2 構成図

```text
Mac / iPhone / その他ブラウザ
         │
         ▼
GitHub Pages（HTML / CSS / JSを公開）
         │
         ├── 画面: index / input / list / edit / salary / rates
         │       └── 各ページの *.js
         │                │
         │                ▼
         │            firebase.js（共通処理）
         │                ├── Firebase Authentication（Googleログイン）
         │                └── Cloud Firestore（勤怠・給与単価の保存）
         │
         └── style.css（共通デザイン）

※ mobile-menu.js が導入済みなら firebase.js → mobile-menu.js
※ GitHub Pagesは画面・コードの配信元。勤怠データの保存先はFirestore。
```

### 2.3 端末間同期の仕組み

ログインしたGoogleアカウントの**Firebase UID**を使い、`users/{uid}/...` にアクセスします。同じFirebaseユーザーとしてログインすれば、Mac mini、MacBookなどの端末から同じクラウドデータを参照できます。別のGoogleアカウントなら原則別のデータ領域です。

**リアルタイム同期ではありません。** 現在の実装は `getDocs()` による画面表示時の読み込みです。別端末で変更した直後は、ページの再読み込みが必要な場合があります。

---

## 3. ファイル構成と各ファイルの役割

### 3.1 プロジェクト構成

```text
atsystem-main/
├── index.html             # ダッシュボード画面
├── index.js               # ダッシュボードの表示・給与グラフ・移行ボタン
├── input.html             # 打刻入力フォーム
├── input.js               # 打刻の登録処理
├── list.html              # 勤怠一覧／カレンダー画面
├── list.js                # 年月選択・一覧／カレンダー表示・編集への移動
├── edit.html              # 勤怠編集・削除フォーム
├── edit.js                # 既存データ読込・更新・削除
├── salary.html            # 給与確認画面
├── salary.js              # 月別・年別給与、特別給内訳の表示
├── rates.html             # 給与単価設定画面
├── rates.js               # 単価履歴の登録・編集・削除
├── firebase.js            # 認証、Firestore、給与計算、共通UI
├── style.css              # 全画面共通CSS・レスポンシブ表示
├── meiko.ico              # ロゴ／favicon画像
├── firestore.rules        # Firestoreのセキュリティルール例
├── README.md              # リポジトリの説明文（元ZIPでは簡易）
└── README_導入手順.txt    # Firebase導入に関する既存メモ

# 以下は会話で追加・設定を案内したもの（ZIPには未収録）
├── mobile-menu.js         # スマホ用スライド式メニュー
├── manifest.webmanifest   # ホーム画面追加時のアプリ名・アイコン等
├── apple-touch-icon.png  # iPhoneホーム画面用画像
├── icon-192.png           # Android等のアイコン（任意）
└── icon-512.png           # Android等のアイコン（任意）
```

### 3.2 ファイル一覧（詳細）

| ファイル | 役割 | 代表的な編集対象 |
|---|---|---|
| `index.html` | ダッシュボードの画面構造。統計、グラフ、クイックアクセス、データ移行、最近の勤務履歴の表示場所を定義 | 見出し、ボタン、カードの追加・文言変更 |
| `index.js` | 勤怠・単価を読み、今月の集計、最近の5件、月別給与棒グラフを描画 | 集計項目、グラフ、件数表示 |
| `input.html` | 日付・コマ・事務時間・特別給・備考・ヘルプ先の入力UI | 入力欄、ヘルプ先の選択肢 |
| `input.js` | フォーム検証、ヘルプ欄の表示切替、Firestoreへの新規保存 | 保存項目、保存後のメッセージ |
| `list.html` | 年・月の選択、一覧表、カレンダー、日付詳細の表示枠 | 一覧の見出し、表示切替ボタン |
| `list.js` | 月選択、一覧行、カレンダー日付、備考表示、編集ページへの遷移 | 一覧列、カレンダー表示内容、備考の書式 |
| `edit.html` | 既存勤怠を修正・削除する入力フォーム | 編集できる項目、ヘルプ先の選択肢 |
| `edit.js` | URLの `id` または `date` から記録を探し、フォームに反映して更新・削除 | 更新項目、重複日付チェック、削除確認 |
| `salary.html` | 給与単価・年別総額・月別明細・特別給内訳の表示枠 | 給与画面のレイアウト、見出し |
| `salary.js` | 給与集計結果と特別給理由の描画、対象年・月の切替 | 特別給内訳の表示条件、月別／年別表示 |
| `rates.html` | 単価設定フォーム・単価履歴テーブル | 単価入力項目、表の見出し |
| `rates.js` | 単価履歴の取得、編集、削除、適用期間表示 | 単価履歴のUI、確認ダイアログ |
| `firebase.js` | Firebase初期化、Google認証、Firestore操作、給与計算、共通UI、移行、バックアップ | 計算ルール、DB構造、認証、共通機能 |
| `style.css` | 配色、サイドバー、カード、フォーム、表、グラフ、カレンダー、スマホ表示 | デザイン・サイズ・レスポンシブ |
| `meiko.ico` | サイドバーの画像とブラウザ用アイコン | アイコン差し替え |
| `firestore.rules` | サーバー側のFirestoreアクセス制御 | UID制限・権限ルール（慎重に） |
| `mobile-menu.js` | スマホ用の開閉メニュー（導入した場合） | ハンバーガーボタンの動作 |
| `manifest.webmanifest` | ホーム画面追加時の名称、起動先、アイコン（導入した場合） | アプリ名、起動時の表示方法 |

### 3.3 HTMLとJSの対応関係

```text
index.html  ── index.js  ──┐
input.html  ── input.js  ──┤
list.html   ── list.js   ──┤
edit.html   ── edit.js   ──┼── firebase.js ── Firebase
salary.html ── salary.js ──┤
rates.html  ── rates.js  ──┘

各HTML ── style.css
各HTML ── favicon / manifest（設定した場合）
```

原則として、**表示位置やフォームを変えるならHTML、データ取得・保存・計算を変えるならJS、色や大きさを変えるならCSS**です。

---

## 4. 画面ごとの機能と処理の流れ

### 4.1 ホーム／ダッシュボード（`index.html` + `index.js`）

1. `requireUser()` でログインを確認。
2. `setupCommon()` で共通UIを準備。
3. `readAttendance()` と `readRates()` でFirestoreからデータを取得。
4. 現在の年月に該当する勤務記録を抽出。
5. 勤務日数（ユニークな日付数）、コマ数、事務時間、全期間の記録件数を表示。
6. 新しい順に最近の勤務5件を表示。
7. 年を選択できる月別給与棒グラフを描画。12か月分の `summarize()` を呼んで計算。
8. 旧データのバックアップ・クラウド移行ボタンを提供。

**変更の例**：最近の勤務履歴を5件から10件にするなら `index.js` の `.slice(0,5)` を変更。グラフの見た目は `style.css` の `.salary-chart...` 系を変更。

### 4.2 打刻入力（`input.html` + `input.js`）

入力項目：日付、1〜6限（複数選択）、事務時間（分）、特別給額（円）、備考、ヘルプ勤務、ヘルプ先。

送信すると `FormData(form)` で値を取り出し、`addAttendance()` でFirestoreに1件追加。成功するとフォームをリセットし、`toast('✓ 打刻を保存しました')` を表示します。ヘルプ勤務をオフにするとヘルプ先の選択値を空にします。

**注意**：`addAttendance()` は新しい自動IDを発行します。同じ日付の登録を入力画面で禁止する仕組みは、確認した `input.js` にはありません。

### 4.3 勤怠一覧／カレンダー（`list.html` + `list.js`）

- 年を選び、1〜12月から月を選択。
- 一覧表示：日付、コマ、事務時間、備考、編集ボタン。
- カレンダー表示：日付ごとのコマ数、事務時間、ヘルプ表示。日付選択で詳細表示と編集へのリンク。
- 編集リンクは `edit.html?id=...` の形で、FirestoreのレコードIDを渡す。
- 備考欄はヘルプ先と `specialReason` を組み合わせて表示。

**変更の例**：一覧の備考表示は `list.js` の `rowRemarks()`、カレンダーの日付表示は `renderCalendar()`、日付の詳細は `showDayDetails()` を編集。

### 4.4 勤怠編集・削除（`edit.html` + `edit.js`）

1. URLの `id` パラメータを優先し、なければ `date` でレコードを検索。
2. フォームに保存済み値をセット。
3. ヘルプ先が現在の選択肢にない場合、選択肢を動的に追加。
4. 保存時、日付変更先に別レコードがないかチェック。
5. `updateAttendance(record.id, row)` で更新後、`list.html` へ移動。
6. 削除時は確認ダイアログを表示し、`removeAttendance(record.id)` を実行。

**注意**：日付重複チェックは編集画面の処理であり、Firestore全体に一意制約があるわけではありません。

### 4.5 給与確認（`salary.html` + `salary.js`）

- 現在のコマ給、6コマ目の割増額、事務時給、適用開始日を表示。
- 対象年を選択すると、その年の勤務データから年間支給総額を計算。
- 月を選択すると、コマ数・事務時間・給与額を表示。
- 特別給の理由と金額を一覧表示。
- 単価が未設定の勤務があれば注意書きを表示。

**特別給の表示条件**：以前のコードは `rows.filter(r => r.specialReason)` だったため、金額が0円でも理由があれば表示されました。0円を非表示にしたい場合の修正は以下です（実際に反映済みか確認してください）。

```js
const special = rows.filter(
  r => r.specialReason && Number(r.specialAmount) > 0
);
```

これは**内訳の表示条件のみ**を変更します。給与の合計額は `firebase.js` の `summarize()` で計算します。

### 4.6 給与単価設定（`rates.html` + `rates.js`）

- 適用開始日、通常コマ給、事務時給を登録。
- 開始日順に単価履歴を表示し、次の単価の前日までを適用期間として表示。
- 6コマ目の参考額は `Math.round(periodRate * 1.25)` で表示。
- 編集・削除時は確認ダイアログを表示する場合があります。
- 単価を変えると、その期間の過去の給与も再計算されます。**過去の給与額を確定値として保存している方式ではありません。**

---

## 5. Firebase・ログイン・データ保存

### 5.1 Firebaseを初期化する場所

`firebase.js` の `firebaseConfig` に `apiKey`、`authDomain`、`projectId`、`storageBucket`、`messagingSenderId`、`appId` を設定し、`initializeApp(firebaseConfig)` で初期化しています。

Firebase SDKは `https://www.gstatic.com/firebasejs/13.1.0/...` からES Modulesで読み込む構成です。**SDKのバージョンを変更するときは関連importを整合させてください。**

FirebaseのWeb APIキーは一般にクライアントに公開される設定値ですが、**APIキーがあるから安全なのではなく、Firestore Security Rulesでアクセスを制御する**ことが重要です。

### 5.2 ログインの流れ

```text
HTMLを開く
  ↓
各ページのJS → requireUser()
  ↓
onAuthStateChanged() でログイン状態を確認
  ├─ 未ログイン → Googleログイン画面（showGate）
  │                 └─ signInWithPopup → 成功後再読み込み
  └─ ログイン済み → auth-pending解除 → 画面表示
```

各HTMLの `<script>document.documentElement.classList.add('auth-pending')</script>` と、`style.css` の `html.auth-pending ...` はログイン確認中の画面を隠す目的で使われています。

### 5.3 Firestoreの保存先

```text
users/
└── {Firebase認証UID}/
    ├── attendance/
    │   ├── {自動生成ドキュメントID}
    │   └── {自動生成ドキュメントID}
    └── rates/
        ├── 2025-04-01
        └── 2026-04-01
```

- `attendance`：1件ごとの勤務記録。ドキュメントIDはFirestoreが生成。
- `rates`：給与単価。ドキュメントIDは `startDate` と同じ日付文字列。
- `col(name)`：ログインユーザーのUIDを使って対象コレクションを作る共通関数。

### 5.4 Firestoreアクセス制御

ZIPに含まれる `firestore.rules` は、ログイン済みで、パスの `{userId}` が本人のUIDと一致し、コレクションが `attendance` または `rates` の場合に読み書きを許可する例です。

```js
match /users/{userId}/{collectionName}/{documentId} {
  allow read, write: if request.auth != null
                     && request.auth.uid == userId
                     && collectionName in ['attendance', 'rates'];
}
```

**このルールは「Googleでログインした本人のデータ」を保護しますが、「アプリ利用者を自分1人だけに限定する」設定ではありません。** 別のGoogleアカウントでログインできる場合、その人も自分自身のUID配下にはデータを作れる可能性があります。個人専用に限定するなら、特定UIDの許可をルール側に追加するなどの対策が必要です。

**重要**：`firestore.rules` をGitHubに置いただけではFirebaseのルールは変わりません。Firebase Consoleでルールを公開するか、Firebase CLI等でデプロイする必要があります。

### 5.5 `firebase.js` の主要関数

| 関数 | 内容 | 呼び出し元の例 |
|---|---|---|
| `requireUser()` | ログイン確認・ログイン画面表示 | 全ページ |
| `currentUser()` | 現在のユーザー取得 | 必要に応じて |
| `readAttendance()` | 勤怠一覧取得・日付順にソート | ホーム、一覧、編集、給与 |
| `addAttendance(row)` | 勤怠を新規登録 | 入力 |
| `updateAttendance(id,row)` | 勤怠を上書き | 編集 |
| `removeAttendance(id)` | 勤怠を削除 | 編集 |
| `readRates()` | 単価履歴を取得（未登録時は初期値） | ホーム、給与、単価設定 |
| `saveRate(rate,oldStart)` | 単価を登録／更新 | 単価設定 |
| `removeRate(start)` | 単価を削除 | 単価設定 |
| `rateFor(date,rates)` | 指定日に適用する単価を取得 | 給与計算、給与画面 |
| `calculateRow(row,rates)` | 1件の勤務の給与を計算 | `summarize()` |
| `summarize(rows,rates)` | 複数勤務を集計 | ホーム、給与 |
| `yen(n)` | 数値を円表示に整形 | 各給与表示 |
| `setupCommon()` | 日付、ログアウト、単価設定リンク等を準備 | 全ページ |
| `showError(e)` | エラーを表示 | 各ページ |
| `toast(s)` | ページ内メッセージを表示 | 入力、編集、単価設定 |
| `logout()` | ログアウトして再読み込み | サイドバー |
| `migrateLocal()` | 旧ローカルデータをクラウドへ追加 | ホーム |
| `downloadBackup()` | 旧ローカルデータをJSONに書き出し | ホーム |

---

## 6. 勤怠データと給与単価のデータ形式

### 6.1 勤怠データ（1件の例）

```json
{
  "date": "2026-10-30",
  "periods": ["2", "3", "4"],
  "officeMinutes": 45,
  "specialReason": "臨時会議",
  "specialAmount": 1000,
  "isHelp": true,
  "helpLocation": "菊名教室"
}
```

| キー | 型 | 意味 |
|---|---|---|
| `date` | 文字列 `YYYY-MM-DD` | 勤務日 |
| `periods` | 文字列配列 | 出勤コマ（`"1"`〜`"6"`） |
| `officeMinutes` | 数値 | 事務作業時間（分） |
| `specialReason` | 文字列 | 備考・特別給の理由 |
| `specialAmount` | 数値 | 特別給（円） |
| `isHelp` | 真偽値 | ヘルプ勤務か |
| `helpLocation` | 文字列 | ヘルプ先の教室名。通常勤務なら空文字 |

Firestoreから読み出した際は `readAttendance()` が `id` を追加して返します。`id` はデータ本体のフィールドではなく、FirestoreドキュメントIDです。

**名称の注意**：画面では「備考」と表示していても、保存キーは `specialReason` のままです。名称だけ変更したい場合、フォームの `name` 属性やJSの参照先を不用意に変更しないでください。

### 6.2 給与単価データ（1件の例）

```json
{
  "startDate": "2026-04-01",
  "periodRate": 2183,
  "officeHourlyRate": 1080
}
```

| キー | 型 | 意味 |
|---|---|---|
| `startDate` | 文字列 `YYYY-MM-DD` | この単価を適用し始める日 |
| `periodRate` | 数値 | 通常の1コマ給 |
| `officeHourlyRate` | 数値 | 事務作業1時間あたりの給料 |

`DEFAULT_RATES` はFirestoreに単価が**1件もない場合**に使う初期値です。実際の単価履歴を登録している場合、`DEFAULT_RATES` を変更しても既存履歴には反映されません。

---

## 7. 給与計算の詳しい仕様

給与計算の中心は `firebase.js` の `calculateRow(row, rates)` です。各勤務日の計算結果を `summarize()` で合計します。

### 7.1 適用単価の決定

`rateFor(date,rates)` は `startDate <= 勤務日` の単価のうち、開始日が最も新しいものを使います。該当する単価がない場合は `missing: true` として扱います。

### 7.2 コマ給

```js
const periods = (row.periods || []).length;
const normalPay = periods * rate.periodRate;
const extraPay = periods === 6 ? rate.periodRate * 0.25 : 0;
const periodPay = Math.round(normalPay + extraPay);
```

- 1〜5コマの場合：コマ数 × 通常コマ給。
- **6コマの場合のみ**：6コマ目に相当する25%割増を1回加算。
- 割増対象は「6限のチェックが入っているか」ではなく、**選択したコマの総数が6個かどうか**です。
- コマ給は勤務日ごとに `Math.round()` で円単位に四捨五入。

### 7.3 事務給・特別給・合計

```js
const officePay = Math.round(
  (minutes / 60) * rate.officeHourlyRate
);
const specialPay = Math.round(special);
const total = periodPay + officePay + specialPay;
```

- 事務時間は分単位で保存。給与計算時に `60` で割り、時間給を掛ける。
- 事務給も勤務日ごとに四捨五入。
- 特別給も四捨五入。
- 最後に `periodPay + officePay + specialPay` を合算。
- 月給・年給は**日別に四捨五入した結果の合計**。月末にまとめて丸める方式とは結果が異なる場合があります。

### 7.4 計算例（初期単価の場合）

初期値：通常コマ給2,183円、事務時給1,080円。

**例A：3コマ＋事務45分＋特別給1,000円**

```text
コマ給  = 3 × 2,183              = 6,549円
事務給  = 45 ÷ 60 × 1,080        =   810円
特別給  =                           1,000円
合計    =                           8,359円
```

**例B：6コマ＋事務0分＋特別給0円**

```text
通常分  = 6 × 2,183              = 13,098円
割増分  = 2,183 × 0.25           = 545.75円
コマ給  = round(13,643.75)       = 13,644円
合計    =                          13,644円
```

### 7.5 単価未設定の場合

対象日より前に適用開始した単価が存在しない場合、`calculateRow()` は `missing: true` を返し、特別給のみを `total` に含めます。表示上の注意書きを見逃さず、`rates.html` で適用期間を確認してください。

### 7.6 円表示のフォーマット

`yen(n)` は `Number(n).toLocaleString('ja-JP',{maximumFractionDigits:2}) + '円'`。**円表示関数そのものは整数丸めを強制していません。** 日別の給与計算では四捨五入していますが、単価など別の数値表示では小数が出る余地があります。

---

## 8. 変更したい内容から編集ファイルを探す

| やりたいこと | 編集するファイル | 探す場所・ポイント |
|---|---|---|
| サイドバーのロゴを大きくする | `style.css` | `.brand-mark`、`.brand-mark img` |
| ロゴだけ左にずらす | `style.css` | `.sidebar .brand-mark { transform: translateX(-6px); }` など |
| サイドバーの幅を変える | `style.css` | `.sidebar { width:248px; }` と `.app-main { margin-left:248px; }` をセットで |
| サイドバーのメニュー名を変える | 各HTML | `.nav-link` の表示文字列 |
| 全ページ共通の単価設定リンクを変える | `firebase.js` | `setupCommon()` 内の `rates.html` リンク追加処理 |
| スマホの三本線メニューを変える | `mobile-menu.js` + `style.css` | `setupMobileMenu()` と `.menu-toggle` / `.sidebar`（導入済みの場合） |
| 画面の色を変える | `style.css` | `:root` の `--blue`、`--navy`、`--bg` など |
| 全体の文字サイズを変える | `style.css` | `body`、`.content`、各見出し |
| ブラウザのタブ・ブックマークのアイコンを変える | 各HTML + 画像 | `<link rel="icon" ...>` |
| iPhoneのホーム画面アイコンを変える | 各HTML + PNG | `<link rel="apple-touch-icon" ...>` |
| Androidホーム画面のアイコン・アプリ名を変える | `manifest.webmanifest` | `icons`、`name`、`short_name`（導入済みの場合） |
| 入力欄を増やす | `input.html`、`input.js`、`edit.html`、`edit.js` | `name` 属性、`FormData`、編集画面への反映をセットで |
| ヘルプ先の教室を追加する | `input.html`、`edit.html` | `<select id="helpLocation">` 内の `<option>` |
| ヘルプチェック時の表示を変える | `input.js`、`edit.js` | `isHelp`、`helpSelectArea`、`toggle()` |
| 保存後のメッセージを変える | `input.js` | `toast('✓ 打刻を保存しました')` |
| 勤怠一覧の列を増やす | `list.html`、`list.js` | `<th>` と `renderTable()` の行生成をセットで |
| 備考の表示形式を変える | `list.js` | `rowRemarks()` |
| カレンダーの1日分の表示を変える | `list.js`、`style.css` | `renderCalendar()` と `.calendar-...` |
| 編集ページの保存内容を変える | `edit.js` | `updateAttendance(record.id, {...})` |
| 削除確認メッセージを変える | `edit.js` | `confirm('この打刻データを削除しますか？')` |
| 給与計算式を変える | `firebase.js` | `calculateRow()`（最重要） |
| 6コマ目の割増率を変える | `firebase.js` | `rate.periodRate * 0.25`。画面の参考額表示も併せて確認 |
| 給与単価の初期値を変える | `firebase.js` | `DEFAULT_RATES`。既存のFirestore単価には自動反映されない |
| 単価を日付ごとに変える | 原則 `rates.html` 画面から | `rates.js` → `saveRate()`。コード変更は不要 |
| 特別給0円を内訳から隠す | `salary.js` | `rows.filter(...)` の条件 |
| 年間給与の集計条件を変える | `salary.js` | `updateYearlySalary()` |
| 月別給与グラフを変える | `index.js`、`style.css` | `renderSalaryChart()`、`.salary-chart...` |
| 最近の勤務履歴の件数を変える | `index.js` | `.slice(0,5)` |
| Googleログインの文言を変える | `firebase.js` | `showGate()` |
| Googleログイン方式を変える | `firebase.js` | `signInWithPopup()` など。認証設定と動作検証が必要 |
| Firestoreの保存先を変える | `firebase.js`、`firestore.rules` | `col(name)` とルールを同時に確認。データ移行も必要 |
| 他のGoogleアカウントからの利用を制限する | Firebase Consoleのルール | `request.auth.uid` の制限を検討 |
| 旧ローカルデータの移行を変更する | `firebase.js`、`index.js` | `migrateLocal()`、移行ボタン |
| 旧ローカルデータのバックアップを変更する | `firebase.js` | `downloadBackup()` |

**編集時の基本ルール**：保存項目を追加・名称変更する場合は、入力画面だけでなく編集画面・一覧画面・給与計算・旧データとの互換性も確認してください。

---

## 9. CSS・アイコン・スマホメニュー

### 9.1 CSSの基本

`style.css` には共通デザインと `@media(max-width:720px)` などのスマホ向け設定があります。

代表的なクラス：

- `.sidebar`：サイドバー本体。
- `.brand`：ロゴと「出退勤システム」の文字。
- `.brand-mark`：ロゴ画像の枠。
- `.nav-link`：サイドバーメニュー。
- `.app-main`：メイン領域。
- `.topbar`：上部ヘッダー。
- `.content`：ページ本文。
- `.panel`：白いカード枠。
- `.stats`、`.stat`：ダッシュボードの数値カード。
- `.salary-chart...`：給与グラフ。
- `.calendar-...`：カレンダー。

同じセレクターを後ろに追記すると、条件・詳細度が同じなら後の指定が優先されます。**過去の追記が重複している可能性があるため、変更前にCSS内を検索**してください。

### 9.2 スマホ用メニュー（導入した場合）

会話で追加した構成は次のとおりです。

```text
firebase.js
  ├── import { setupMobileMenu } from './mobile-menu.js';
  └── setupCommon() の最後で setupMobileMenu()

mobile-menu.js
  ├── ☰ボタン生成
  ├── サイドバーの開閉
  ├── 背景オーバーレイの開閉
  └── メニュー項目・×・Esc・画面外タップによる閉じる操作

style.css
  └── @media (max-width: 720px) で下部ナビを左スライド式に変更
```

**注意**：`firebase.js` にimportだけ追加して `mobile-menu.js` をGitHubにアップロードし忘れると、モジュール読込エラーによりページ全体のJSが動かなくなる可能性があります。

### 9.3 faviconとホーム画面アイコン

各HTMLの `<head>` 内で設定します。

```html
<link rel="icon" type="image/x-icon" href="./meiko.ico">
<link rel="apple-touch-icon" href="./apple-touch-icon.png">
<link rel="manifest" href="./manifest.webmanifest">
```

- `meiko.ico`：ブラウザのタブ・ブックマーク向け。
- `apple-touch-icon.png`：iPhoneホーム画面向け。**ファイルが実在すること**。
- `manifest.webmanifest`：Android等のホーム画面用アプリ設定。**ファイルが実在すること**。
- `manifest.webmanifest` 内の `icons` で指定するPNG等も必要。

ホーム画面に追加済みのアイコンはキャッシュが残ることがあります。反映しない場合は画像の存在・パスを確認し、必要ならホーム画面のショートカットを登録し直します。

---

## 10. 初期導入・GitHub Pagesへの反映

### 10.1 最初に必要なもの

1. GitHubリポジトリ（HTML / CSS / JSを公開する場所）。
2. GitHub Pages（静的サイトの公開）。
3. Firebaseプロジェクト。
4. Firebase AuthenticationのGoogleログイン設定。
5. Cloud Firestoreデータベースと適切なセキュリティルール。

### 10.2 Firebaseの設定

1. Firebase Consoleでプロジェクトを作成／開く。
2. Authentication → Sign-in method でGoogleを有効化。
3. Authenticationの承認済みドメインに、実際に使うGitHub Pagesのホスト名を追加（例：`yuya-96.github.io`）。
4. Firestore Databaseを用意。
5. セキュリティルールを確認し、Firebase側で**公開**。
6. `firebase.js` の `firebaseConfig` が対象プロジェクトを指しているか確認。

### 10.3 GitHub Pagesへの反映

1. 編集前のファイルをバックアップする。
2. 対象ファイルをローカルで編集する。
3. GitHubの公開対象リポジトリへアップロード／pushする。
4. 変更をコミットする。
5. GitHub Pagesの公開設定（ブランチ・フォルダ）を確認する。
6. 公開URLで再読み込みし、PC・スマホ双方で動作を確認する。

**パスの注意**：GitHub Pagesでリポジトリ名を含むURL（例：`...github.io/System/`）の場合、`./firebase.js` のような相対パスは**HTMLと同じディレクトリにファイルがあること**が前提です。

### 10.4 編集後に反映されない場合

- GitHub上のファイルが更新されているか確認。
- Pagesの公開ブランチ・公開フォルダが合っているか確認。
- ブラウザの再読み込み・キャッシュ削除を試す。
- アイコンはキャッシュされやすいため、必要なら `?v=2` などのクエリを付ける。
- ブラウザの開発者ツールで404・JavaScriptエラーを確認。

---

## 11. データ移行・バックアップ・復元の注意

### 11.1 旧データの移行

ホーム画面の「ローカルデータをバックアップ」→「この端末のデータを移行」の順に操作します。

`migrateLocal()` は `localStorage` の `attendance` と `salaryRates` を読み取り、既存Firestoreデータとの比較を行いながら追加します。

**注意点**：

- 同一内容と判断した勤怠記録は一部スキップしますが、同日の内容違いは別レコードとして保存され得ます。
- 同じ適用開始日の単価がクラウド側と異なる場合はエラーにします。
- 移行後も元の `localStorage` は削除しません。
- 移行前にバックアップを保存し、移行後は一覧・給与・単価を確認してください。

### 11.2 「バックアップ」の重要な制限

**現行の `downloadBackup()` が保存するのは `localStorage` の旧データであり、Firestoreに保存済みのクラウドデータではありません。**

つまり、クラウドで新しく入力した勤怠を、このボタンだけで完全バックアップできるわけではありません。クラウドデータのエクスポート／復元機能は、別途実装が必要です。

### 11.3 削除・単価変更時の注意

- `removeAttendance()` はFirestoreの対象レコードを削除します。画面上に取り消し機能はありません。
- 単価履歴の編集・削除は過去の給与計算結果に影響します。
- 誤操作を避けるため、単価変更前に対象期間を確認してください。

---

## 12. トラブルシューティング

| 症状 | 確認ポイント |
|---|---|
| ログイン画面から進めない | Googleログインが有効か、承認済みドメイン、ポップアップブロック、ブラウザのコンソール |
| Firestoreアクセス権限エラー | Firebase Consoleのルールが公開済みか、ログインUIDとパスのUIDが一致するか |
| 別端末でデータが見えない | 同じGoogleアカウントか、同じFirebaseプロジェクトか、ページを再読み込みしたか |
| 打刻が保存されない | `input.js` のフォームIDとHTMLの `id` / `name`、コンソール、Firestoreルール |
| ヘルプ先が表示されない | `isHelp`、`helpSelectArea`、`helpLocation` のID一致、`input.js` のchangeイベント |
| 給与が0円になる | 対象年・月、勤務データ、`rates` の適用開始日、`missing` の注意書き |
| 6コマ目の割増が違う | `calculateRow()` の `periods === 6` と割増率、単価履歴 |
| 特別給0円なのに内訳に表示される | `salary.js` の `rows.filter(r => r.specialReason)` を確認 |
| カレンダーが表示されない | `list.html` にカレンダー用要素があるか、`list.js` が対応版か、CSSが読み込まれているか |
| スマホの☰が出ない | `mobile-menu.js` の有無、`firebase.js` のimportと `setupMobileMenu()`、スマホ用CSS |
| 画面全体のJSが動かない | 開発者ツールで `Failed to load module script` / 404 を確認。JSファイル名の大文字小文字も確認 |
| アイコンが古い | HTMLの `rel="icon"`、画像の存在、ブラウザキャッシュ |
| iPhoneホーム画面アイコンが出ない | `apple-touch-icon.png` の実在・PNG形式・パス、ショートカットの再登録 |
| 変更をGitHubに上げても反映されない | Pagesの公開設定、コミット状況、ブラウザキャッシュ |
| 単価設定リンクが二重に出る | HTML側に同じリンクがあるか、`setupCommon()` の重複防止条件 |

### 12.1 ブラウザでエラーを調べる

Macのブラウザで開発者ツールを開き、**Console（コンソール）**と**Network（ネットワーク）**を確認します。赤いエラーのファイル名・行番号が手がかりになります。`404` はファイルのアップロード漏れやパス違い、`permission-denied` はFirestoreルールやログイン状態の問題であることが多いです。

---

## 13. 変更時のチェックリスト

### 13.1 変更前

- [ ] 現在動作しているファイルをバックアップした。
- [ ] 変更対象がHTML／JS／CSS／Firebaseルールのどれか特定した。
- [ ] 関連ファイル（例：入力と編集、HTMLとJS）を確認した。
- [ ] データ構造や給与計算に影響するか確認した。

### 13.2 変更後

- [ ] ブラウザのコンソールにエラーがない。
- [ ] Googleログインできる。
- [ ] 新規打刻が保存できる。
- [ ] 一覧・カレンダーに表示される。
- [ ] 編集・削除できる。
- [ ] 月別給与・年別給与が想定どおり。
- [ ] 6コマ目割増・事務給・特別給が想定どおり。
- [ ] 給与単価の適用開始日が正しい。
- [ ] PCのサイドバーとスマホのメニューが動く。
- [ ] タブ・ブックマーク・ホーム画面のアイコンを確認した。
- [ ] 別端末でも同じアカウントでデータを参照できる。

### 13.3 特に注意が必要な変更

**`firebase.js`、`firestore.rules`、`calculateRow()`、保存フィールド名の変更は影響範囲が大きい**ため、見た目だけの変更より慎重に扱ってください。既存データを壊さないよう、変更前後の計算例を残すと安全です。

---

## 14. 今後の保守・改善メモ

以下は**現行機能の説明ではなく、今後の改善候補**です。

1. **クラウドデータの完全バックアップ**：Firestoreの勤怠・単価をJSONでエクスポートし、必要ならインポートする機能。
2. **重複日付の扱いの統一**：新規登録・編集で同じルールにする。
3. **CSSの重複整理**：追記で増えた `.brand` / `.brand-mark` 等を整理する。
4. **全ページ共通レイアウトの部品化**：サイドバーやアイコン設定をページごとに書き直さずに済むようにする。
5. **テストの追加**：給与計算（6コマ目、端数、単価切替、未設定時）の自動テスト。
6. **データ変更履歴**：編集・削除時の誤操作に備えた履歴や復元方法。
7. **スマホ・PWAの確認**：`manifest.webmanifest` とアイコンの実ファイルを整備し、ホーム画面起動を端末ごとに検証。
8. **認証とアクセス制御の見直し**：本人だけが使える設定にしたい場合はFirestoreルールを追加検討。

---

## 付録A：どのファイルを触ればよいか迷ったとき

```text
見た目・余白・色・アイコンサイズ → style.css
表示文字・見出し・入力欄         → 対応する *.html
ボタンを押したときの処理         → 対応する *.js
保存・取得・削除の共通処理       → firebase.js
給与の計算ルール                 → firebase.js / calculateRow()
給与画面での表示方法             → salary.js
給与単価の登録画面               → rates.html + rates.js
スマホの三本線メニュー           → mobile-menu.js + style.css
Googleログイン                   → firebase.js + Firebase Console
データ閲覧・書き込みの権限       → Firestore Security Rules
Webページの公開                  → GitHub Pages
```

## 付録B：新しい入力項目を増やす場合の流れ

例：「交通費」を新設する場合（**現行コードには未実装**）：

1. `input.html` に入力欄を追加。
2. `input.js` の `addAttendance({...})` に保存キーを追加。
3. `edit.html` に同じ入力欄を追加。
4. `edit.js` で保存済み値の反映と `updateAttendance({...})` の更新を追加。
5. `list.js` に必要なら表示欄を追加。
6. 給与に含める場合は `firebase.js` の `calculateRow()` を変更。
7. `salary.js`、`index.js` の表示・集計が意図どおりか確認。
8. 古い勤怠データに新フィールドがない場合の既定値を決める。
9. 保存・編集・給与計算・スマホ表示をテスト。

---

**このREADMEの対象**：共有済みZIP版＋その後の会話で示された改修情報。リポジトリの最新状態がZIPと異なる場合は、実際のファイル内容を優先してください。
