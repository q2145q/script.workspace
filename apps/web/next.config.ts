import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

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

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
