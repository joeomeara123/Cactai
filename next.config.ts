import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['tiktoken'],
  webpack: (config: any) => {
    // Handle tiktoken WASM files
    config.experiments = {
      ...config.experiments,
      topLevelAwait: true,
      asyncWebAssembly: true,
    };
    
    // Add rule for WASM files
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });

    return config;
  },
};

export default nextConfig;
