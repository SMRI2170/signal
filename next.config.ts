import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  ...(isGitHubPages
    ? {
        output: "export",
        basePath: "/signal",
        assetPrefix: "/signal/",
        images: { unoptimized: true },
        trailingSlash: true,
      }
    : {}),
  reactStrictMode: true,
};

export default nextConfig;
