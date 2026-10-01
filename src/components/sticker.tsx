import { useId, type CSSProperties } from "react";

export type StickerType =
  | "heart"
  | "star"
  | "butterfly"
  | "smiley"
  | "lightning"
  | "flower"
  | "checker"
  | "sparkle";

type StickerProps = {
  type: StickerType;
  size?: "sm" | "md" | "lg" | "xl";
  rotate?: number;
  className?: string;
};

export function Sticker({ type, size = "md", rotate = 0, className = "" }: StickerProps) {
  const style = { "--sticker-rotate": `${rotate}deg` } as CSSProperties;

  return (
    <span aria-hidden="true" className={`sticker sticker-${type} sticker-${size} ${className}`} style={style}>
      <StickerArtwork type={type} />
    </span>
  );
}

function StickerArtwork({ type }: { type: StickerType }) {
  const id = useId().replace(/:/g, "");
  const cutlineId = `cutline-${id}`;
  const hologramId = `hologram-${id}`;

  return (
    <svg viewBox={viewBoxFor(type)}>
      <defs>
        <filter id={cutlineId} x="-22%" y="-22%" width="144%" height="144%">
          <feMorphology in="SourceAlpha" operator="dilate" radius="3.4" result="expanded" />
          <feFlood floodColor="var(--surface)" result="paper" />
          <feComposite in="paper" in2="expanded" operator="in" result="whiteCutline" />
          <feMerge><feMergeNode in="whiteCutline" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <linearGradient id={hologramId} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="var(--aqua)" />
          <stop offset=".28" stopColor="var(--purple)" />
          <stop offset=".52" stopColor="var(--pink)" />
          <stop offset=".75" stopColor="var(--yellow)" />
          <stop offset="1" stopColor="var(--lime)" />
        </linearGradient>
      </defs>
      <g filter={`url(#${cutlineId})`}>
        <StickerShape hologramId={hologramId} type={type} />
      </g>
    </svg>
  );
}

function viewBoxFor(type: StickerType) {
  return type === "butterfly" ? "0 0 80 64" : type === "lightning" ? "0 0 52 70" : type === "flower" || type === "checker" ? "0 0 72 72" : "0 0 64 64";
}

function StickerShape({ type, hologramId }: { type: StickerType; hologramId: string }) {
  switch (type) {
    case "heart":
      return <>
        <path d="M32 57 6 32C-9 17 5 0 20 7c6 3 10 9 12 15C35 16 39 10 45 7c15-7 29 10 14 25L32 57Z" />
        <path className="sticker-inner-line" d="M15 26c0-8 10-13 16-2" />
        <path className="sticker-shine" d="M15 19c3-6 10-8 14-4" />
        <circle className="sticker-dot" cx="48" cy="32" r="2.3" />
      </>;
    case "star":
      return <>
        <path fill={`url(#${hologramId})`} d="m32 3 7 20 22 1-17 14 6 22-18-12-18 12 6-22L3 24l22-1 7-20Z" />
        <path className="sticker-shine" d="m31 11 3 10 10 1" />
        <path className="sticker-inner-line" d="m32 27 2 6 6 1" />
      </>;
    case "butterfly":
      return <>
        <path fill={`url(#${hologramId})`} d="M38 32C23 2 3 6 7 28c2 14 16 15 31 8Z" />
        <path fill={`url(#${hologramId})`} d="M42 32C57 2 77 6 73 28c-2 14-16 15-31 8Z" />
        <path d="M38 35c-13 6-13 20-2 23 9 2 8-15 6-23ZM42 35c13 6 13 20 2 23-9 2-8-15-6-23Z" />
        <path className="sticker-ink-line" d="M40 20v29M36 14l4 6 4-6" />
        <path className="sticker-shine" d="M18 19c5-5 11-3 15 5M62 19c-5-5-11-3-15 5" />
      </>;
    case "smiley":
      return <>
        <circle cx="32" cy="32" r="27" />
        <path className="sticker-shine" d="M18 17c5-5 12-6 16-3" />
        <circle className="sticker-ink" cx="22" cy="28" r="3" />
        <circle className="sticker-ink" cx="42" cy="28" r="3" />
        <path className="sticker-ink-line" d="M19 38c8 12 18 12 26 0" />
        <path className="sticker-halftone" d="M15 35h7M42 35h7" />
      </>;
    case "lightning":
      return <>
        <path fill={`url(#${hologramId})`} d="M31 3 7 38h18l-4 29 24-37H27l4-27Z" />
        <path className="sticker-shine" d="m29 12-8 16h10" />
        <path className="sticker-inner-line" d="m34 33-7 12h7" />
      </>;
    case "flower":
      return <>
        <path d="M35 31C17 1 1 15 8 31c-18 8-7 25 9 21 2 18 20 15 21 1 14 12 28-4 14-16 14-15-4-29-17-10Z" />
        <circle className="sticker-detail" cx="35" cy="36" r="9" />
        <circle className="sticker-ink" cx="35" cy="36" r="3" />
        <path className="sticker-shine" d="M17 19c5-6 11-4 14 2" />
        <path className="sticker-halftone" d="M47 20c5 2 7 5 8 9" />
      </>;
    case "checker":
      return <>
        <path d="M4 4h64v64H4z" />
        <path className="sticker-ink" d="M4 4h16v16H4zm32 0h16v16H36zm16 16h16v16H52zM20 20h16v16H20zm16 16h16v16H36zM4 36h16v16H4zm16 16h16v16H20zm32 0h16v16H52zM36 52h16v16H36z" />
        <path className="sticker-shine" d="M10 10h8" />
      </>;
    case "sparkle":
      return <>
        <path fill={`url(#${hologramId})`} d="M32 2c3 19 11 27 30 30-19 3-27 11-30 30-3-19-11-27-30-30 19-3 27-11 30-30Z" />
        <path className="sticker-shine" d="M32 11c2 10 6 14 15 18" />
        <circle className="sticker-dot" cx="18" cy="41" r="2" />
      </>;
  }
}
