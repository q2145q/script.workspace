import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@script/api",
    "@script/db",
    "@script/types",
    "@script/editor",
    "@script/ai",
  ],
};

export default nextConfig;
