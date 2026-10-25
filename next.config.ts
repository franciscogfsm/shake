import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The deck is one HTML file outside app/. Keep it in the serverless bundle for /pitch.
  outputFileTracingIncludes: {
    "/pitch": ["./pitchdeck/index.html"],
  },
  // smart-account-kit lazily imports this optional peer (external wallets) inside a try; we only use passkeys
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@creit-tech/stellar-wallets-kit": false,
      "@creit-tech/stellar-wallets-kit/modules/utils": false,
    };
    return config;
  },
};

export default nextConfig;
