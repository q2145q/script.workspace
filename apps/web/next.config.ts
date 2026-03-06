import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@script/api",
    "@script/db",
    "@script/types",
    "@script/editor",
    "@script/ai",
  ],
  serverExternalPackages: ["pdfkit"],
  allowedDevOrigins: ["164.90.224.171"],
};

export default nextConfig;
