import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@script/ai", "@script/db", "@script/types"],
};

export default nextConfig;
