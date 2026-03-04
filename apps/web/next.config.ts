import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@script/api",
    "@script/db",
    "@script/types",
    "@script/editor",
  ],
};

export default nextConfig;
