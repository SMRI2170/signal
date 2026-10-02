# Y2K 2.0 Mobile QA

対象: `#20`〜`#23` の Love OS / CRUSH.SYS 更新。

実施日: 2026-10-02

## レイアウト確認

LPとFact Inputを明示的なモバイルviewportで確認した。`scrollWidth` はブラウザの縦スクロールバー分を除き、いずれもviewport幅を超えない。

| 幅 | LP Scanner | LP CTA | Fact Ticket | 分析CTA | 横スクロール |
| --- | ---: | ---: | ---: | ---: | --- |
| 360px | 305px | 223px | 309px | 309px | なし |
| 390px | 335px | 223px | 339px | 339px | なし |
| 430px | 375px | 223px | 379px | 379px | なし |

- [x] Hero → Fact / Guess → Fact Input → Scanner → History → CTAの順で読める
- [x] `73 / 100` がScannerの最大要素で、内訳・単位は従属する
- [x] Fact本文、Validation、下書き表示、削除操作に装飾が重ならない
- [x] 主要タップ操作は44px以上
- [x] Grid、scanline、巨大なSIGNAL文字は背景に限定され、本文のコントラストを下げない

## 動きとアクセシビリティ

- [x] focus-visibleはPurpleの3px outlineを維持する
- [x] `prefers-reduced-motion`では浮遊、pulse、sheen、View Transitionのアニメーションを登録しない
- [x] ステッカーは`aria-hidden`、メーターは数値を含むaria-labelを持つ
- [x] 上昇・初回・材料不足は色だけでなく、`↑ +n`、`FIRST`、`MORE FACTS NEEDED`で区別する
- [x] disabled分析CTAには残りFact数の説明を併記する

## PWAと公開ビルド

- [x] 通常のproduction buildが成功
- [x] GitHub Pages向けstatic buildが成功
- [x] Pages配下でmanifestの`start_url`は`/signal/`
- [x] Pages配下でfavicon / Apple iconは`/signal/icons/signal-mark.svg`
- [x] Service WorkerはGETかつsame-originだけを対象にし、`/api/`を即時除外する
- [x] UI shellのnetwork-first fallbackと静的assetのcache-first fallbackをソースおよびstatic buildで確認

## 実行コマンド

```text
npm run lint
npm run typecheck
npm run test
npm run build
GITHUB_PAGES=true NEXT_PUBLIC_STATIC_DEMO=true NEXT_PUBLIC_BASE_PATH=/signal npm run build
```

すべて成功。追加したラスタ画像、Webフォント、外部アイコン、動画、Canvas、Chartライブラリはない。
