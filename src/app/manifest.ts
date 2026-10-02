import type { MetadataRoute } from "next";

const basePath = process.env.GITHUB_PAGES === "true" ? "/signal" : "";
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SIGNAL — 事実から、関係性を見る。",
    short_name: "SIGNAL",
    description: "相手との間で起きた出来事から、関係性の変化を記録する。",
    start_url: `${basePath}/`,
    scope: `${basePath}/`,
    display: "standalone",
    background_color: "#fff7fd",
    theme_color: "#a76cff",
    icons: [{ src: `${basePath}/icons/signal-mark.svg`, sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
