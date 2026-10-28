Firebase対応版・導入手順

1. Firebase Console > Firestore Database > ルール に firestore.rules の内容を貼り付けて公開。
   これはログインした本人の /users/{UID}/ 以下だけを許可します。
2. Firebase Authentication > Sign-in method で Google を有効化。承認済みドメインに yuya-96.github.io を追加。
3. ZIPのHTML/CSS/JSファイルを GitHub Pages の System リポジトリの同じ階層にアップロード。
   既存の meiko.ico / meiko.png も残してください。
4. ページを開いて Google ログイン。最初はクラウドの勤怠が空です。
5. 以前のデータが入っていたブラウザで index.html を開き「ローカルデータをバックアップ」を押してJSONを保存。
   続いて「この端末のデータを移行」を押します。Mac miniとMacBookの両方に別の記録があるなら、それぞれで実行。
   同じ内容の重複は一部スキップしますが、同日の異なる勤務内容は別レコードとして残る場合があります。移行後に確認してください。
6. Firebase Console > Authentication > Users で自分の UID を確認。
   個人専用にしたい場合、firestore.rules の `request.auth.uid == userId` に加え
   `&& request.auth.uid == '自分のUID'` を入れてルールを再公開してください。

重要: FirestoreのアクセスルールはHTML側のログイン画面とは別に必ず設定してください。
旧データは移行後もブラウザのlocalStorageに残し、勝手に削除しません。
Googleログインのポップアップがブロックされた場合はブラウザのポップアップ設定を確認してください。
本ファイルは静的な検査を行っていますが、実際のFirebase接続・端末間同期の動作は環境側で確認が必要です。
