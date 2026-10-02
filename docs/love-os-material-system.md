# SIGNAL Love OS Material System

## 目的

SIGNALを、Y2Kの記号を足した恋愛LPではなく、**2003年に存在した恋愛解析ソフトを2026年のモバイルに移植したもの**として一貫させる。

この文書は色を増やすためのものではない。既存のPink / Purple / Cyan / Lime / Yellow / Black / Whiteだけで、何が「読む面」、何が「分析機」、何が「押せる操作」かを決めるための規約である。

## テーマ

`SIGNAL // CRUSH.SYS`

- Factを入力する面は **FACT TICKET**
- 結果を見る面は **CRUSH.SYS SCANNER / SIGNAL RECEIPT**
- 保存済みの現在地は **SIGNAL BOARD**
- 時間経過を読む面は **SIGNAL TAPE**

かわいさは、恋愛の確率を断定するためではなく、私的な記録を続けやすくするために使う。

## 素材トークン

| Token | 用途 | 使う場所 |
| --- | --- | --- |
| `chrome-bezel` | 鏡面の機械枠 | Scanner、主スコア、一次CTAの縁 |
| `gel-panel` | 半透明のプラスチック表面 | Scanner、Board、Historyの主カード |
| `glass-ticket` | 白く読める入力チケット | Fact Ticket、Evidence、下書き表示 |
| `scanner-grid` | 1pxの分析面 | Scanner内部だけ |
| `led-meter` | 変化・進行の表示 | SIGNAL LEVELの補助メーターだけ |

Chromeは本文の背景に使わない。Glassは入力文字や日本語本文を曇らせない。素材の役割が読めなければ、白いカードへ戻す。

## 固定モチーフ

| Motif | 意味 | 使える場面 |
| --- | --- | --- |
| Chrome Heart | 感情、保存、良い変化 | Save、Good Signal、Result |
| Scanner Orb | 観測、現在地、分析 | Scanner、Loading、Board |
| Pixel Sparkle | 発見、次の操作 | 一次CTA、履歴の節目 |
| Butterfly | 関係の変化、世界観 | Hero、CTA、空状態 |
| Lightning | 新しいFact、スコア変化 | Fact追加、差分 |

花とチェッカーはセクション区切りだけに使う。エラー、プライバシー説明、Fact本文、削除操作には装飾ステッカーを置かない。

## レイアウト規約

- 画面あたりのステッカーは原則1〜3点。主CTAに置くアイコンは1つまで。
- 非対称にするのはステッカー、ラベル、背景だけ。数値、本文、入力欄、エラー文の読字軸は揃える。
- Chrome / Gel / Gridを同じ面に重ねるのはScannerだけ。他のカードは最大2素材まで。
- 英語は短いラベル、数値、OS状態。意味・説明・エラーは日本語で伝える。
- ピクセル風の表現は英語ラベルと数値だけに限定し、日本語本文には使わない。

## 軽量性・アクセシビリティ

- CSS gradient、既存SVG、疑似要素を使う。ラスタ画像、Webフォント、外部アイコン、Canvas、動画は増やさない。
- `backdrop-filter`、大きなblur、常時アニメーション、パララックスは使わない。
- 動きは結果確定・Ticket追加など意味のある120〜180msの変化だけにする。`prefers-reduced-motion`では静止する。
- ChromeやGelの上でも、本文、focus、エラー、数値単位のコントラストを維持する。
- 360px幅でスコア、CTA、入力欄、下書き表示が横スクロールしないことを必須とする。

## 実装チェック

- Scanner以外の本文カードが過度に金属・透明化されていない
- 追加した色が既存パレットの透明度・グラデーション以外にない
- 新しい画像・依存関係・フォントがない
- 画面だけを見て、Fact → Scan → Board → Tape の役割が判別できる
