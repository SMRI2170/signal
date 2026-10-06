# SIGNAL Native Cartridge / Snapshot flow

## 画面遷移

ログイン済みの再訪ユーザーは `MY CRUSH DEVICE` を開きます。保存済みの相手は `SIGNAL CARTRIDGE` として、記録名・最新の `SIGNAL LEVEL / 100`・更新日を表示します。

Homeでは最新Cartridgeの`+ FACTを追加`を主CTAとして表示します。選ぶとFact入力へ直接進みます。最新Receiptや履歴を見る操作、他Cartridgeを開く操作は副CTAです。

`YOUR SIGNAL HISTORY` は保存済みSnapshotを古い順に使い、日付・score・直前との差分・その時点までのFact数を表示します。scoreが同じSnapshotも省略せず、各行からその時点の`SIGNAL RECEIPT`を開けます。scoreは好意の確率ではなく、入力された事実から算出したSIGNALスコアです。

Homeの`DEVICE SKIN`からBubble Pink / Cyber Crush / Angel Signalを選べます。設定は端末内の暗号化ストアに保存し、再起動後も復元します。Skinは背景の色味と装飾密度だけを変え、画面の情報順序とスコアは変えません。

## API

- `GET /api/relationships/summaries`: 本人のCartridge一覧（最大20件）
- `GET /api/relationships/:id`: 本人のFactとSnapshot履歴
- `POST /api/relationships/:id/analyses`: 新しいFactを1件検証し、既存Factと合わせて再分析

Native APIはBearer sessionを検証し、取得・更新とも認証ユーザーの`user_id`へ限定します。FactをJevへ送る前に利用条件とデータ処理を説明し、明示同意を求めます。同意に加えて更新ボタンを押した場合だけ再分析し、未送信draftは自動送信しません。再分析は30 Factを上限とし、Postgres関数内の1トランザクションでFactとSnapshotを保存します。

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
5. SIGNAL TAPEに実際の日付・score・delta・Snapshot時点のFact数が表示されることを確認する。同じscoreのSnapshotも残る。
6. Historyの複数行からReceiptを開き、それぞれのscore・delta・Fact数が選んだSnapshotと一致することを確認する。
7. Skinを切り替えてアプリを再起動し、選んだSkinが復元することを確認する。
8. Jev同意前は再分析が始まらず、同意だけして画面を離れたdraftも送信されないことを確認する。
