import Image from "next/image";

type RealStickerKind = "scanner-orb" | "chrome-heart";
type RealStickerSize = "md" | "lg";

const stickerSources: Record<RealStickerKind, string> = {
  "scanner-orb": "/stickers/scanner-orb.webp",
  "chrome-heart": "/stickers/chrome-heart.webp",
};

type RealStickerProps = {
  kind: RealStickerKind;
  size?: RealStickerSize;
  className?: string;
  priority?: boolean;
};

/**
 * The two tactile stickers are deliberate raster exceptions: transparent WebP
 * gives the Hero a physical Y2K finish while the product UI remains CSS/SVG.
 */
export function RealSticker({ kind, size = "md", className = "", priority = false }: RealStickerProps) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  return (
    <Image
      alt=""
      aria-hidden="true"
      className={`real-sticker real-sticker-${size} real-sticker-${kind} ${className}`}
      height={256}
      priority={priority}
      sizes={size === "lg" ? "74px" : "62px"}
      src={`${basePath}${stickerSources[kind]}`}
      width={256}
    />
  );
}
