# SIGNAL Native Y2K Experience System

Status: implementation-ready design specification  
Target: Kotlin Multiplatform / Compose Multiplatform, Android and iOS  
Primary viewport: 360–430dp  
Related: `experience-design.md`, `signal-screen-spec.md`, `love-os-material-system.md`, `y2k-ui-performance.md`

## 1. Design objective

SIGNALのモバイル版を、Y2Kの記号を貼った診断アプリではなく、**2003年に存在した恋愛解析デバイスを2026年のスマートフォンへ移植した体験**として完成させる。

ユーザーが感じるべきことは次の3つ。

1. 入力は、出来事をシール帳へ残すように軽い。
2. 判定は、占いではなく小さな解析機を動かしているように見える。
3. 履歴は、一回の診断結果ではなく、関係の変化を残すテープになる。

見た目の目標は `Y2K + sticker diary + chrome scanner + neo-brutal outline`。ただし、情報構造と操作は現代のモバイルアプリとして明快にする。

## 2. Current diagnosis

現行KMP版は以下をすでに満たしている。

- Pink / Purple / Cyan / Lime / Yellowのブランドパレット
- 太い黒枠、hard shadow、大きな日本語タイポグラフィ
- CRUSH.SYS、FACT MODE、SIGNAL LEVELという独自ラベル
- ドット背景、非対称なステッカー配置、Glossy CTA
- Fact入力、Result、Historyまでの一貫したフロー

一方、Y2Kとして弱く見える主因は色ではない。

- ハートや星がUnicode文字中心で、実在するステッカーの質感がない
- すべての画面が似たgradient + white cardで、場面ごとの素材変化が少ない
- Chrome / hologram / translucent plasticが装飾に留まり、操作部品の意味になっていない
- 押した、追加した、スキャンしたという触覚的なフィードバックが弱い
- 背景のドットを全面に均等配置しており、視線の強弱が生まれにくい
- Resultがカードとしては成立しているが、専用デバイスを起動した感覚までは届いていない

## 3. Chosen direction

参考画像には3つの系統がある。

| 系統 | 採用する要素 | 採用しない要素 |
| --- | --- | --- |
| High-density sticker collage | 白いcut line、重なり、手描きのずれ、ラベル | 全画面を埋める密度、透かし入り素材、他ブランドの記号 |
| Pastel Heisei girl | flip phone、butterfly、heart、compact、soft pink | ファッション写真、既製素材のコピー、読みにくい淡色文字 |
| Cyber chrome / Web 1.0 | chrome、pixel status、scanner grid、black terminal | 全画面の黒背景、常時glow、Matrix風の世界観 |

SIGNALではこの3系統を画面の役割へ割り当てる。

```
Landing / Home      = Pastel Crush Device
Fact Input          = Sticker Diary
Validation          = Reality Check Slip
Analyzing / Result  = CRUSH.SYS Scanner
History             = Signal Tape
```

全画面を同じY2K表現にしない。画面遷移に合わせて物質が変わること自体を体験にする。

## 4. Visual hierarchy

### 4.1 Three layers

すべての画面を3層で考える。

1. **Content layer** — Fact、日本語説明、数値、履歴。White / Paperが基本。
2. **Device layer** — CTA、Scanner、status bar、navigation。Chrome / Gel / Black。
3. **Sticker layer** — 世界観と節目。1画面1〜3点だけ。

GlassやchromeはDevice layerに限定する。本文カードを透明にしすぎない。Appleの最新Material guidanceと同様に、透明素材は内容そのものではなく、操作・ナビゲーションとの階層を作るために使う。

### 4.2 Density rhythm

| Screen | Visual density | Sticker count | Primary material |
| --- | ---: | ---: | --- |
| Landing | High | 3 | translucent candy plastic |
| Fact Input | Low | 1 | white sticker paper |
| Validation | Low | 0 | receipt / correction slip |
| Analyzing | Medium | 1 | black scanner terminal |
| Result | Medium-high | 2 | chrome bezel + gel screen |
| History | Low-medium | 1 | translucent cassette tape |
| Save / Privacy | Low | 0–1 | white card + lock seal |

装飾量ではなく、素材の切り替えで印象を強くする。

## 5. Design tokens

### 5.1 Color

新しいメインカラーは追加しない。

| Token | Value | Meaning |
| --- | --- | --- |
| `ink` | `#15121B` | outline、本文、terminal |
| `paper` | `#FFF7FD` | 読む面、入力面 |
| `white` | `#FFFFFF` | highlight、cut line |
| `pink` | `#FF66D8` | 現在地、熱量、更新 |
| `purple` | `#A76CFF` | scan、計算、focus |
| `cyan` | `#75E9FF` | history、補助情報、反射 |
| `lime` | `#B9FF83` | ready、追加、primary action |
| `yellow` | `#FFE66D` | hint、small celebration |

Chromeは色ではなく、`white → cyan → purple → pink → white`の短いgradientで作る。Error専用の赤は追加せず、`paper + purple rule + text`で表現する。

### 5.2 Shape

| Token | Value | Usage |
| --- | ---: | --- |
| `radiusTicket` | 18dp | Fact、Evidence |
| `radiusPanel` | 22dp | Scanner、Result、History |
| `radiusControl` | 999dp | Primary CTA、chip |
| `strokeHairline` | 1dp | grid、meter divider |
| `strokeControl` | 2dp | chip、small control |
| `strokeHero` | 3dp | primary card、CTA |
| `hardShadowSmall` | 3dp × 4dp | chip、small sticker |
| `hardShadowLarge` | 6dp × 7dp | Scanner、primary CTA |

カード形状は完全な均一角丸にせず、主カードだけ左右で2〜4dpずらした非対称cornerを使う。入力欄とタップ領域の形は崩さない。

### 5.3 Type

- 日本語本文はsystem sans。可読性のため外部フォントを増やさない。
- 英語ラベルはBlack weight、0.8–1.2sp letter spacing、uppercase。
- 日本語heroはBlack weight、-3〜-6sp letter spacing。ただし文字が接触しない幅へclampする。
- Scoreはtabular numbersを使い、`73`を最大、`/ 100`を従属させる。
- Pixel表現は英語statusだけ。日本語本文をpixel font風にしない。
- Dynamic Type / font scaling 130%でCTAとScoreが切れない構成にする。

## 6. Native component system

現行の1ファイル中心の実装を、見た目の意味単位で次へ分割する。

```
commonMain/com/signal/app/ui/
  theme/
    SignalColors.kt
    SignalShapes.kt
    SignalTypography.kt
    SignalMotion.kt
  material/
    ChromeBezel.kt
    GelPanel.kt
    StickerPaper.kt
    PixelTerminal.kt
    DotField.kt
  sticker/
    SignalSticker.kt
    ChromeHeart.kt
    ScannerOrb.kt
    Butterfly.kt
    PixelSpark.kt
    Lightning.kt
  component/
    GlossyButton.kt
    FactTicket.kt
    RealityCheckSlip.kt
    SignalReceipt.kt
    SignalTape.kt
    StatusChip.kt
```

大規模な画面ロジック変更はしない。まず表示部品を抽出し、現在のScreen stateとJudgeGatewayを維持する。

## 7. Sticker system

### 7.1 Rules

- Unicode emojiを主ステッカーに使わない。OSごとに質感が変わるため。
- すべてのステッカーに `white cut line → black keyline → material fill → small hard shadow` の4層を持たせる。
- 同じ素材をscale / rotation / cropで再利用し、似たハートを複数作らない。
- 画面外へはみ出してよいのは25%まで。CTA、見出し、入力欄と重ねない。
- 装飾のみの場合はSemanticsから除外する。

### 7.2 Fixed motifs

| Motif | Meaning | Preferred implementation |
| --- | --- | --- |
| Chrome Heart | 保存、現在地、Result | transparent WebP or vector gradient |
| Scanner Orb | 観測、分析開始 | transparent WebP, hero/result only |
| Butterfly | 変化、再訪 | Compose vector path |
| Pixel Spark | 発見、完了 | Canvas/vector |
| Lightning | 新しいFact、差分 | Canvas/vector |
| SIGNAL Seal | FACT OK、PRIVATE、FIRST | vector + text component |

複雑な立体素材は`Chrome Heart`と`Scanner Orb`の2点だけImageGenで独自生成してよい。透明背景、256px、WebP、各40KB以下を目標とする。他はCompose Vector / Canvasで作る。

参考画像そのものは使用しない。透かし、ライセンス、既存ブランド表現を持ち込まない。

## 8. Interaction language

Y2K感は静止画だけではなく、触れた瞬間で作る。

| Event | Feedback | Duration | Haptic |
| --- | --- | ---: | --- |
| CTA press | 2dp沈む、shadowが縮む | 90ms | light |
| CTA release | 元の位置へspring return | 140–180ms | none |
| Add Fact | Ticketが下から8dp + fade | 160ms | light |
| FACT OK | sealが0.92→1.0 | 140ms | selection |
| Needs rewrite | 左ruleが現れる。shakeしない | 160ms | warning once |
| Start scan | Ticketを順に短くhighlight | total 480ms max | medium at start |
| Result | Receiptが6dp上がりfade-in | 180ms | success once |
| History node open | tape flapが展開 | 160ms | selection |

ループアニメーション、点滅、常時浮遊は使わない。Scanner Orbのみ、idle中に最大2dpの呼吸を1回だけ行って静止する。Reduce Motionではすべて即時表示する。

## 9. Screen specification

### 9.1 Landing — Pastel Crush Device

目的はY2Kの第一印象と、SIGNALの仕組みの理解を同時に作ること。

```
SIGNAL                                  BETA ♡

                 [Scanner Orb]
       CRUSH.SYS  ●  FACT MODE: ON

             彼って、脈あり？

        起きたことだけ、教えて。
  相手の行動を記録して、変化を数字で追う。

        [ CHECK IT ↗ ]

              [Chrome Heart]
```

- 現状の情報量を維持しつつ、上半分の空白を24〜32dp減らす。
- 背景はPink → Purple → Cyanだが、ドット密度を上から下へ弱くする。
- Orbを本物の立体ステッカーにし、Heartは画面端から20%だけcropする。
- `REALITY CHECK FOR YOUR CRUSH`は説明ではなく小さなsealとして残す。
- CTAは現在のLime/Cyan glossy capsuleを継続し、pressed stateを追加する。

### 9.2 Fact Input — Sticker Diary

- 背景はPaper主体。色面はtop headerとTicket番号だけ。
- 3枚のFact Ticketを「同じ白カード」ではなく、わずかに異なるcornerと1〜2度の回転でシール帳の紙片に見せる。
- 入力中のTicketはrotationを0度へ戻し、Purple outlineを表示する。読む軸は必ず水平。
- `FACT 01`は剥離紙風tab、文字数は右下の小さな印字。
- `+ ADD FACT`はLightning付きの小ボタン。主CTAより強くしない。
- KeyboardのNextで次Ticketへ移動し、最後はDone。CTAをkeyboardで隠さない。
- 装飾は見出し付近のButterfly 1点だけ。入力欄内部へ置かない。

### 9.3 Validation — Reality Check Slip

- Pink塗りのエラーカードは使わない。
- Ticket直下からレシート状のPaperが8dpだけ伸びる。
- 左にPurple 3dp rule、上に`MAKE IT CLEARER`、本文は日本語。
- `FACT OK`はLimeの小seal。大きな成功演出にしない。
- 書き換え例はcopyできるが自動入力しない。

### 9.4 Analyzing — CRUSH.SYS Boot Sequence

独立した長い待機画面にはしない。Judge処理が速い場合は、Fact画面上で最大480msの短いsequenceを見せてResultへ移る。

```
CRUSH.SYS
[01] OBSERVABLE ........ OK
[02] OBSERVABLE ........ OK
[03] OBSERVABLE ........ OK
CALCULATING SIGNAL...
```

- Black terminal、Lime text、Cyan cursor。
- 実際の処理状況以上のfake progressを見せない。
- 800msを超えた場合だけ、`事実を照合しています`へ切り替える。

### 9.5 Result — SIGNAL Scanner

この画面をアプリの視覚的な頂点にする。

```
╭─ chrome bezel ─────────────────────╮
│ ♥ SIGNAL SCANNER ♥          LIVE   │
│                                    │
│ SIGNAL LEVEL                       │
│ 73                         / 100    │
│ ████████████████░░░░               │
│ FIRST SIGNAL / ↑ +11               │
│                                    │
│ 会いたいサイン              81      │
│ 相手からの積極性            68      │
│ 判断材料                    57      │
╰────────────────────────────────────╯
```

- 外周だけChrome、内部はWhite/Cyanのgel screen。全面metallicにしない。
- `73`は最低80sp相当。背景のGridはScanner内部だけ。
- Heart meterは意味が曖昧なため主表示から外すか、装飾として1列だけにする。
- `GOOD SIGNAL`は確定表現に見えるため、初回は`FIRST SIGNAL`、更新は`SIGNAL UP / STEADY / SIGNAL DOWN`を中立に使う。
- 画面下部に`これは確率ではありません`を常時表示する。
- 次の主CTAは`この記録を残す`、保存済みなら`+ FACTを追加`。

### 9.6 History — Signal Tape

- 白いカードの中に普通の折れ線グラフを置くのではなく、半透明cassette/tapeをmetaphorにする。
- Purpleの一本線をテープ、各時点をreel/nodeとして描く。
- current nodeだけPink、past nodeはCyan、初回はYellow。
- 各nodeには必ず日付・score・deltaのテキストを併記する。
- nodeをtapすると、その時点で追加したFact Ticketが下へ展開する。
- 1件だけなら線を描かず、`次のFactで変化がつながります`を表示する。

## 10. Navigation and OS integration

- App contentはedge-to-edgeを維持し、status/navigation barのinsetsを尊重する。
- Androidではsystem back、iOSではedge swipeを妨げない。
- Bottom navigationはMVPでは追加しない。主フローが4画面のため、不要なchromeになる。
- iOSのLiquid Glassを模した全面blurは作らない。OS側のnavigation/control materialと、SIGNALのgel panelを役割で分離する。
- Android 16のMaterial 3 Expressiveからは、意味のあるshape、押下時のmotion、明確なgroupingだけを取り入れる。Dynamic Colorでブランド色を置き換えない。

## 11. Accessibility

- tap targetは48dpを基本、最低44dp。
- 本文は4.5:1、large textは3:1以上を目標にする。
- 色だけでup/down、error、readyを表現しない。
- Stickerは装飾ならsemanticsから除外し、意味があるsealだけlabelを持つ。
- font scaling 100%、130%、160%でFact、Score、CTAを確認する。
- Reduce Transparency相当ではGelをPaperへ、Chromeをsolid White/Cyan borderへfallbackする。
- Reduce Motionではtransitionを即時完了する。
- screen readerの順序は、label → 日本語見出し → content → primary action。装飾英語を重複読み上げしない。

## 12. Performance budget

軽量さをY2K品質の一部として扱う。

- 初期表示のraster stickerは最大2点、合計80KB以下を目標。
- 全native decorative assetsは180KB以下。
- 512px以上の装飾画像、動画、Lottie、WebGL、外部fontを追加しない。
- dot / grid patternは毎frame大量のcircleをloop描画せず、`drawWithCache`または小さなtileを再利用する。
- animationは`graphicsLayer` / draw phaseのtransformとalphaを優先し、layoutを毎frame変更しない。
- gradient brush、path、text measurementは可能な範囲でremember/cacheする。
- release buildではR8とresource shrinkingを有効化し、debug APKのサイズを基準にしない。
- mid-range Androidでcritical flowをMacrobenchmarkし、jank frameを記録する。

Target:

| Metric | Target |
| --- | ---: |
| Landing first interactive frame | 1.5s以内の体感目標 |
| Tap visual response | 100ms以内 |
| Normal animation | 60fps |
| Navigation animation | 180ms以下 |
| Scroll horizontal overflow | 0 |

## 13. What not to do

- 参考画像を一枚の背景として貼らない
- 全画面をchrome / glassにしない
- Unicode emojiを最終ステッカーとして量産しない
- 背景blur、outer glow、drop shadowを同時に重ねない
- Y2Kらしさのために色を増やさない
- 常に浮く、光る、点滅する装飾を増やさない
- Resultの73より大きなステッカーを置かない
- Fact本文、validation、privacy copyの上へ装飾を重ねない
- `脈あり確率`、`確定`、`彼はあなたが好き`と表現しない

## 14. Implementation order

### Phase 1 — Foundation

- tokenを`SignalTheme`へ集約
- Unicode stickerをVector / Canvas componentへ置換
- ChromeBezel、GelPanel、StickerPaper、GlossyButtonを共通化
- DotFieldをcache-friendlyに変更

### Phase 2 — Core flow

- LandingをPastel Crush Deviceへ更新
- Fact InputをSticker Diaryへ更新
- ValidationをReality Check Slipへ更新
- ResultをChrome Scannerへ更新
- HistoryをSignal Tapeへ更新

### Phase 3 — Native feel

- pressed state、short transitions、haptics
- IME Next / Done、focus移動、keyboard insets
- Android back / iOS swipe確認
- Reduce Motion / font scaling / screen reader確認

### Phase 4 — Finish and measure

- 独自Chrome Heart / Scanner Orbを必要な場合だけ生成
- 360 / 390 / 430dp screenshot regression
- Macrobenchmark、release APK、asset sizeを検証
- 5人の利用テストで初回分析90秒以内を確認

## 15. Definition of done

- 1枚目だけでY2K / sticker / deviceの世界観が認識できる
- 各画面がDiary / Slip / Scanner / Tapeとして役割を視覚的に区別できる
- Resultでは常にScoreが最大の視覚要素である
- 入力中は装飾密度が下がり、Factの読字軸が水平になる
- Unicode emojiに依存せず、Android/iOSで同じブランド形状になる
- 360dp、font scale 130%、Reduce Motionでフローを完走できる
- 装飾を非表示にしても、意味と操作が完全に残る
- raster asset、animation、recompositionが性能予算内に収まる
- ユーザーがSIGNALを「AI恋愛相談」ではなく「事実と変化の記録」と説明できる

## 16. From aesthetic to a product people keep

Y2Kを強くする目的は、スクリーンショット映えだけではない。ユーザーが`自分の記録`として持ち続けたくなることを優先する。

### 16.1 One ownable object — My Crush Device

アプリ全体を`My Crush Device`という一つの持ち物として扱う。

- Relationshipは一覧の行ではなく、匿名ラベル付きの`SIGNAL CARTRIDGE`になる。
- FactはCartridgeへ差し込む`FACT TICKET`になる。
- AnalysisはScannerから出る`SIGNAL RECEIPT`になる。
- HistoryはReceiptが連なる`SIGNAL TAPE`になる。

この物体metaphorを固定することで、画面ごとに違うY2K装飾を使っても、別アプリのように分断されない。

### 16.2 The repeat loop

継続率を作る中心ループはdaily streakではなく、現実に新しい出来事があった時だけ回る。

```
出来事が起きる
  → Fact Ticketを1枚追加
  → 前回との差分を見る
  → ReceiptがTapeへ残る
  → 次の出来事が起きた時に戻る
```

通知で恋愛不安を刺激しない。`3日入力していません`、`SIGNALが下がるかも`、連続記録日数は使わない。

代わりに次を使う。

- 保存直後に`次の出来事から、変化が見えるようになります`
- 再訪時に`前回から追加されたFact 1件`
- Historyで`この変化を作ったFact`
- 任意設定で週1回までの`何か起きたら、Factに残せます`

### 16.3 Personalization without profile collection

本名、性別、相手の写真を集めず、Deviceの見た目だけを選べるようにする。

無料Betaでは3 skinsまで。

| Skin | Base | Accent | Character |
| --- | --- | --- | --- |
| Bubble Pink | Paper / Pink | Lime | 平成ガーリー、軽い |
| Cyber Crush | Ink / Purple | Cyan | CRUSH.SYS、scanner感が強い |
| Angel Signal | White / Cyan | Pink / Yellow | soft、airy、butterfly中心 |

色tokenは同じで、面積比とmotifだけを変える。機能や判定結果によってskinをlockedにしない。課金圧ではなく、自分のもの感を作るために使う。

### 16.4 A signature interaction

SIGNALでしか味わえない瞬間を一つに絞る。

`SCAN`を押すと、入力したFact Ticketが小さく重なり、Scanner slotへ順番に吸い込まれ、180ms後にReceiptが出る。

- drag操作を必須にしない。tap後のtransitionとして見せる。
- 実際のAPI待機を隠すfake countdownにはしない。
- Reduce MotionではTicket stackからReceiptへ即時crossfadeする。
- Resultの数字をslot machineのように回さない。不安を煽るため。

この一つを高品質にし、他の画面で派手なtransitionを増やさない。

### 16.5 Receipt worth keeping

結果をgeneric cardではなく、保存したくなる小さな`SIGNAL RECEIPT`にする。

Receiptに含めるもの:

- 匿名ラベル
- SIGNAL LEVEL / 100
- 前回差分またはFIRST SIGNAL
- 日付
- Evidence label最大2件
- `確率ではありません`

共有画像はfacts本文と匿名ラベルを既定で隠す。ユーザーが明示的に選んだ場合だけ含める。公開feed、like数、rankingは作らない。

### 16.6 Widget as a quiet doorway

Widgetは継続導線として相性がよいが、恋愛記録がHome Screenから見える危険がある。

Default widget:

```
SIGNAL
何かあった？
[ + FACT ]
```

既定ではscore、相手ラベル、Fact本文を表示しない。設定した人だけ`前回更新 10/02`またはscoreを表示できるようにする。AppleもWidgetをglanceableでfocusedな操作として位置づけているため、情報を詰め込まずFact追加への入口に限定する。

Widgetは本番API・保存・deep linkが安定してから実装し、MVPの前提にしない。

## 17. Usability before decoration

使われるアプリにするため、デザイン実装より先に次の体験が成立している必要がある。

### P0 — Returnable product

- KMPから実データを保存できる
- Relationshipを再度開ける
- 新しいFactを1件追加できる
- Historyがsampleではなく実Snapshotになる
- 入力途中のdraftがアプリ終了後も残る
- offline / timeoutで入力が消えない

### P1 — Understandable first run

- アカウントなしで最初のResultまで到達
- 90秒以内に3 Factsを入力
- Result後に保存価値を説明してからMagic Link
- `73 / 100`を確率だと誤解しない
- Validationで責められた印象を持たない

### P2 — Desirable return

- My Crush Device skin
- Receipt archive
- private-by-default share card
- privacy-safe widget
- native haptics

### P3 — Extra expression

- 季節ごとのsticker set
- sound theme
- additional chrome assets
- elaborate transition variants

P0が未完成の間はP3を増やさない。Y2K素材が豊富でも、履歴が実データでなければ継続する理由にはならない。

## 18. Product design metrics

Y2Kらしさは好みの投票だけで判断しない。

| Question | Target |
| --- | ---: |
| 初回Fact入力を始めるまで | 20秒以内 |
| 初回Resultまで | 90秒以内 |
| Resultを確率と誤解した人 | 10%未満 |
| Validation後に書き換えを完了 | 70%以上 |
| Result後の保存開始率 | 40%以上 |
| 新しい出来事後の再訪 | Betaで基準値を測定 |
| 360dpで主要tap target 44dp未満 | 0件 |
| 装飾を外しても完走できる | 100% |

5人単位の観察では、次を質問する。

1. このアプリは何をするものだと思ったか。
2. どこを押せばよいか迷った瞬間はあったか。
3. Scoreをどういう数字だと理解したか。
4. また開くとしたら、どんな時か。
5. Device、Ticket、Receipt、Tapeのうち何が記憶に残ったか。

## 19. External design references

- Apple Human Interface Guidelines — Materials: https://developer.apple.com/design/human-interface-guidelines/materials
- Apple Human Interface Guidelines — Motion: https://developer.apple.com/design/human-interface-guidelines/motion
- Apple Human Interface Guidelines — Widgets: https://developer.apple.com/design/human-interface-guidelines/widgets
- Android — Material 3 in Compose: https://developer.android.com/develop/ui/compose/designsystems/material3
- Android — Compose animation performance: https://developer.android.com/develop/ui/compose/animation/quick-guide
- Android — Compose performance: https://developer.android.com/develop/ui/compose/performance

参考画像は方向性の分解にのみ使用し、本番assetとして再利用しない。
