import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Set output file tracing root to frontend directory for workspace support
  outputFileTracingRoot: path.join(__dirname),
  
  webpack: (config, { isServer }) => {
    // Ensure webpack resolves modules from frontend node_modules first
    config.resolve = config.resolve || {};
    config.resolve.modules = [
      path.join(__dirname, 'node_modules'),
      ...(config.resolve.modules || []),
    ];
    
    if (isServer) {
      // Externalize sqlite3 and better-sqlite3 to prevent build-time errors
      // These are native modules that shouldn't be bundled
      const originalExternals = config.externals;
      config.externals = [
        ...(Array.isArray(originalExternals) ? originalExternals : []),
        ({ request }: { request?: string }, callback: (err: Error | null, result?: string) => void) => {
          if (request === 'sqlite3' || request === 'better-sqlite3') {
            return callback(null, `commonjs ${request}`);
          }
          if (typeof originalExternals === 'function') {
            return originalExternals({ request } as any, callback);
          }
          callback(null);
        },
      ];
    }
    return config;
  },
};

export default nextConfig;
