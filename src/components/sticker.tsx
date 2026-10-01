import type { CSSProperties } from "react";

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
  switch (type) {
    case "heart":
      return <svg viewBox="0 0 64 58"><path d="M32 54 7 31C-7 17 5 1 19 7c6 3 10 9 13 14C35 16 39 10 45 7c14-6 26 10 12 24L32 54Z" /></svg>;
    case "star":
      return <svg viewBox="0 0 64 64"><path d="m32 3 7 20 22 1-17 14 6 22-18-12-18 12 6-22L3 24l22-1 7-20Z" /></svg>;
    case "butterfly":
      return <svg viewBox="0 0 80 64"><path d="M39 31C25 2 4 7 7 28c2 13 16 14 31 8M41 31C55 2 76 7 73 28c-2 13-16 14-31 8M37 35c-13 6-13 20-2 23 9 2 8-15 6-23M43 35c13 6 13 20 2 23-9 2-8-15-6-23" /><path d="M40 26v19" /></svg>;
    case "smiley":
      return <svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="27" /><circle className="sticker-detail" cx="22" cy="27" r="3" /><circle className="sticker-detail" cx="42" cy="27" r="3" /><path className="sticker-detail" d="M19 37c8 12 18 12 26 0" /></svg>;
    case "lightning":
      return <svg viewBox="0 0 52 70"><path d="M31 3 7 38h18l-4 29 24-37H27l4-27Z" /></svg>;
    case "flower":
      return <svg viewBox="0 0 70 70"><path d="M35 31C17 1 1 15 8 31c-18 8-7 25 9 21 2 18 20 15 21 1 14 12 28-4 14-16 14-15-4-29-17-10Z" /><circle className="sticker-detail" cx="35" cy="36" r="8" /></svg>;
    case "checker":
      return <svg viewBox="0 0 72 72"><path d="M4 4h64v64H4z" /><path className="sticker-detail" d="M4 4h16v16H4zm32 0h16v16H36zm16 16h16v16H52zM20 20h16v16H20zm16 16h16v16H36zM4 36h16v16H4zm16 16h16v16H20zm32 0h16v16H52zM36 52h16v16H36z" /></svg>;
    case "sparkle":
      return <svg viewBox="0 0 64 64"><path d="M32 2c3 19 11 27 30 30-19 3-27 11-30 30-3-19-11-27-30-30 19-3 27-11 30-30Z" /></svg>;
  }
}
