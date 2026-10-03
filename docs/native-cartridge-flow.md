# SIGNAL Native Cartridge / Snapshot flow

## 画面遷移

ログイン済みの再訪ユーザーは `MY CRUSH DEVICE` を開きます。保存済みの相手は `SIGNAL CARTRIDGE` として、記録名・最新の `SIGNAL LEVEL / 100`・更新日を表示します。

Cartridgeを開くと最新の `SIGNAL RECEIPT` が表示されます。`+ FACTを追加` から1画面で新しい出来事を1件入力し、再分析できます。Homeからは「Cartridgeを開く → Fact追加」の2タップで入力を開始できます。

`YOUR SIGNAL HISTORY` は保存済みSnapshotを古い順に使い、日付・score・直前との差分を表示します。scoreは好意の確率ではなく、入力された事実から算出したSIGNALスコアです。

## API

- `GET /api/relationships/summaries`: 本人のCartridge一覧（最大20件）
- `GET /api/relationships/:id`: 本人のFactとSnapshot履歴
- `POST /api/relationships/:id/analyses`: 新しいFactを1件検証し、既存Factと合わせて再分析

すべてBearer sessionを検証し、取得・更新とも認証ユーザーの`user_id`へ限定します。再分析は30 Factを上限とし、Postgres関数内の1トランザクションでFactとSnapshotを保存します。

## Draftと重複防止

- 入力途中の追加Fact、対象Relationship ID、idempotency keyを端末の安全な領域へ保存します。
- AndroidはKeystore暗号化、iOSはKeychainを使用します。
- 通信失敗・process death・session期限切れではdraftを削除しません。
- 再認証後は同じidempotency keyで自動再送します。
- Databaseのunique constraintとRPCにより、同じ送信からSnapshotが複数作られません。
- 成功後だけdraftを削除し、Cartridge一覧・選択中Relationship・SIGNAL TAPEを再取得します。

## 手動確認

1. Resultを保存してアプリを終了し、再起動後にMY CRUSH DEVICEへ同じCartridgeが出ることを確認する。
2. Cartridge → `+ FACTを追加` を開き、途中まで入力してアプリを終了する。再起動後に入力が復元されることを確認する。
3. 機内モードで送信し、エラー後も入力が残ることを確認する。
4. 通信を戻して再送し、FactとSnapshotが1件ずつ増えることを確認する。
5. SIGNAL TAPEに実際の日付・score・deltaが表示されることを確認する。
