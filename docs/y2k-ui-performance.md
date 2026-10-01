# Lightweight Y2K UI / LP Design Guide

## 1. Purpose

SIGNALのLP・Web UIでは、Y2K / 平成ギャル / sticker collage系の世界観を使う。

ただし、装飾画像を大量に読み込む構成にはしない。

目的は、

- 見た目は派手
- 実装は軽量
- モバイルでも高速
- AI実装エージェントが扱いやすい
- Webから将来のモバイル展開にも流用しやすい

という状態を作ること。

---

## 2. Core Principle

装飾をすべてPNG/JPGで作らない。

基本方針：

- 80%: CSS + SVG
- 20%: AVIF / WebP
- PNGは必要最低限
- 大きな全面背景画像は使わない
- 同じステッカー素材を再利用する

Y2K感は「画像の枚数」ではなく、

- 太いアウトライン
- 派手なアクセントカラー
- 回転
- 重なり
- ステッカー風の配置
- ドット / チェック / 星 / ハート
- 少しズレたhard shadow

で作る。

---

## 3. Asset Strategy

### CSSで作るもの

単純な装飾は画像化しない。

例：

- ハート
- 星
- 丸
- ドット
- チェック柄
- ストライプ
- 吹き出し
- 稲妻
- グラデーション
- 背景パターン
- 枠線
- hard shadow

これらはCSS pseudo-elementでもよい。

---

### SVGで作るもの

再利用するステッカー系。

例：

- butterfly
- smiley
- flower
- heart
- star
- lightning
- sparkle
- checker
- chain
- signal level badge

SVGは小さく、拡大縮小しても崩れないため、Y2Kステッカーに向いている。

---

### AVIF / WebPで作るもの

SVGに向かない複雑なイラストのみ。

例：

- 複雑な人物
- 質感のあるイラスト
- 写真
- 高密度なY2Kモチーフ

原則としてAVIF優先。
互換性が必要ならWebP fallback。

---

## 4. Do Not Use One Huge Background Image

避ける：

```
hero-background.png
hero-background.webp
```

のような1枚全面背景。

理由：

- 初期ロードが重い
- LCPが悪化しやすい
- モバイルで無駄が多い
- 一部だけ使いたくても全体を読み込む必要がある
- レスポンシブ対応しにくい

代わりに、背景はCSS、装飾はSVG、複雑な素材だけWebP/AVIFに分ける。

---

## 5. Hero Layout

Example:

```
            ✦                         ♡
       [butterfly.svg]

              SIGNAL

        彼って、脈あり？

    起きたことだけ教えて。

       [ CHECK IT ↗ ]

  ★                           ⚡
          [smiley.svg]
```

Hero上の装飾は6〜10個程度を上限目安にする。

必要以上に埋めない。

---

## 6. Form Section

分析入力部は読みやすさを優先する。

```
♡ WHAT HAPPENED? ★

┌────────────────────┐
│ 次のデートに誘われた │
└────────────────────┘

┌────────────────────┐
│ 相手からLINEが来た   │
└────────────────────┘

       [ JUDGE IT ]
```

装飾は外側。
入力欄の内部はシンプルにする。

---

## 7. Result Section

数字が主役。

```
        SIGNAL LEVEL

           73

        ♥ ♥ ♥ ♡

       ↑ +11

   ★ GOOD SIGNAL ★
```

73などのスコアは最も大きく表示する。

Y2K装飾よりも数値の可読性を優先する。

---

## 8. Sticker Component

AIが実装しやすいように、ステッカーを共通コンポーネント化する。

Recommended structure:

```
components/
  stickers/
    Heart.tsx
    Star.tsx
    Butterfly.tsx
    Smiley.tsx
    Lightning.tsx
    Flower.tsx
    Checker.tsx
    Sparkle.tsx
```

もしくは一つにまとめる。

```tsx
<Sticker
  type="butterfly"
  size="lg"
  rotate={12}
  className="absolute right-4 top-12"
/>
```

Props:

```ts
type StickerProps = {
  type:
    | "heart"
    | "star"
    | "butterfly"
    | "smiley"
    | "lightning"
    | "flower"
    | "checker"
    | "sparkle";

  size?: "sm" | "md" | "lg" | "xl";
  rotate?: number;
  className?: string;
};
```

同一素材を回転・サイズ変更して再利用する。

---

## 9. Avoid Duplicate Asset Downloads

同じハートを10個表示するために、

```
heart1.png
heart2.png
heart3.png
...
```

のようにしない。

1つのSVGを使い回す。

Example:

```tsx
<Heart className="rotate-[-12deg] scale-110" />
<Heart className="rotate-[18deg] scale-75" />
<Heart className="rotate-[4deg] scale-90" />
```

---

## 10. Mobile First

SIGNALはスマホ利用を主とする。

Primary viewport:

```
360px - 430px
```

スマホでは装飾を減らす。

Desktop:

- 8〜12 decorative stickers

Mobile:

- 4〜7 decorative stickers

重要情報の周辺には装飾を置きすぎない。

---

## 11. Do Not Rely Only on display:none

重い画像を読み込んだ後に

```css
display: none;
```

にしても通信量削減にならない場合がある。

画像アセットの場合は、

- picture
- responsive image
- conditional rendering
- Next/Image
- source / sizes

を利用する。

CSS / inline SVGならこの問題は小さい。

---

## 12. Next.js Image Rules

画像を使う場合はNext.jsのImageを利用する。

```tsx
import Image from "next/image";

<Image
  src="/assets/phone.avif"
  alt=""
  width={180}
  height={180}
  quality={70}
  sizes="(max-width: 640px) 100px, 180px"
/>
```

Heroの主画像以外はlazy loadを基本とする。

---

## 13. Decorative Images

装飾だけの画像には意味を持たせない。

```tsx
alt=""
aria-hidden="true"
```

SVGアイコンも必要に応じてaria-hiddenを使う。

---

## 14. Performance Budget

目標：

Initial decorative assets:

```
100KB - 200KB
```

程度。

できれば100KB台前半。

目安：

```
butterfly.svg  4KB
smiley.svg     3KB
heart.svg      2KB
flower.svg     5KB
phone.avif    20-30KB
```

複数回利用しても同一ファイルならブラウザキャッシュを利用できる。

---

## 15. Performance Goals

Target:

- LCP < 2.5s
- CLS < 0.1
- 初期表示で不要な画像をロードしない
- Heroで必要な素材のみ優先ロード
- 下部セクションはlazy load
- フォントの読み込みを最小化

---

## 16. Font Strategy

多数のWeb Fontを読み込まない。

基本：

- 本文: system font / 1種類
- ロゴ・見出し: 特徴的なフォント1種類まで

必要ならY2K感はフォントではなくCSS装飾で補う。

---

## 17. Design Tokens

例：

```css
:root {
  --bg: #fff7fd;
  --surface: #ffffff;
  --text: #111111;

  --pink: #ff66d8;
  --purple: #b66cff;
  --lime: #9cff9c;
  --yellow: #ffe66d;

  --border: #111111;

  --radius-card: 20px;
  --border-width: 2px;
}
```

実際の色は実装時に調整してよい。

---

## 18. Hard Shadow

典型的なSaaS風のぼかした影を多用しない。

Example:

```css
.sticker-card {
  border: 2px solid #111;
  box-shadow: 5px 5px 0 #111;
}
```

Y2K感を軽量に作れる。

---

## 19. Background Patterns

画像を使わずCSSで作る。

Example dot pattern:

```css
.y2k-dots {
  background-image:
    radial-gradient(circle, rgba(255, 102, 216, 0.35) 2px, transparent 2px);
  background-size: 18px 18px;
}
```

Checker:

```css
.y2k-checker {
  background:
    linear-gradient(45deg, #111 25%, transparent 25%) 0 0 / 24px 24px,
    linear-gradient(-45deg, #111 25%, transparent 25%) 0 0 / 24px 24px;
}
```

必要に応じて調整する。

---

## 20. Animation

アニメーションは軽量にする。

利用してよい：

- transform
- opacity

避ける：

- 大量のfilter
- 大きなblur animation
- 複数巨大画像のparallax
- 常時動く多数の要素

Example:

```css
@keyframes float {
  0%, 100% {
    transform: translateY(0) rotate(-3deg);
  }

  50% {
    transform: translateY(-6px) rotate(3deg);
  }
}
```

装飾の1〜2個程度に使う。

---

## 21. Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
```

を考慮する。

---

## 22. Page Structure

Recommended LP:

```
Hero
  ↓
What is SIGNAL?
  ↓
Fact Input Demo
  ↓
Result Preview
  ↓
History / Signal Graph
  ↓
How it works
  ↓
CTA
```

すべてのセクションをコラージュ画像で埋めない。

装飾密度：

Hero: High
Input: Low
Result: Medium
Graph: Low
CTA: High

というリズムにする。

---

## 23. Reference Image Usage

参考画像のデザイン要素：

- Y2K
- 平成ギャル
- sticker collage
- rainbow
- heart
- smiley
- butterfly
- checker
- flower
- lightning
- star
- black outline
- pink / purple base

を参考にする。

ただし参考画像そのものを公開サービスの素材として使用しない。

透かし・著作権・ライセンス上の問題がない独自素材を作る。

---

## 24. SIGNAL-specific Sticker Ideas

SIGNAL専用に以下のステッカーを作る。

- SIGNAL LEVEL
- GOOD SIGNAL
- MIXED SIGNALS
- NEW FACT
- +12
- CHECK IT
- REALITY CHECK
- HEART RADAR
- FACT ONLY
- NO OVERTHINKING

これにより、一般的なY2K素材との差別化を作る。

---

## 25. UX Rule

ビジュアルは派手でも、操作は派手にしない。

特に、

- 入力
- 結果
- グラフ
- CTA

は一目で分かること。

ユーザーが「どこを押すのか分からない」状態はNG。

---

## 26. AI Implementation Rule

AI実装エージェントは、見た目を再現するために大量の外部画像を追加してはいけない。

優先順位：

1. CSS
2. Inline / local SVG
3. optimized AVIF / WebP
4. PNG only if unavoidable

同じ意味の装飾素材を複数追加しない。

---

## 27. Definition of Done

Y2Kデザイン実装は以下を満たせば完了。

- HeroにY2K / sticker collage感がある
- 入力UIは読みやすい
- Resultの数字が最も目立つ
- Mobile 360pxで破綻しない
- Desktopでも余白が不自然にならない
- SVGを再利用している
- 大きな全面背景画像に依存していない
- 初期装飾画像サイズが概ね100〜200KB以内
- 下部画像はlazy load
- Lighthouseで大きな画像警告が出ない
- UI操作が装飾に埋もれない

---

## 28. Core Principle

SIGNALのY2Kデザインは、

**「大量の画像を読み込んで派手にする」**

のではなく、

**「CSS・SVG・再利用可能なステッカーコンポーネントで軽量に派手さを作る」**

こと。

見た目の密度と通信量を分離する。
