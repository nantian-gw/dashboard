import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  transpilePackages: ["recharts"],
  output: "standalone",
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default withNextIntl(nextConfig);