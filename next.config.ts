import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
