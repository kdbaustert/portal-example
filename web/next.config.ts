import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  sassOptions: {
    // Bootstrap 5.3 still uses @import and global Sass functions. Hide the
    // deprecation noise coming from node_modules without hiding ours.
    quietDeps: true,
    silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'if-function'],
  },
};

export default nextConfig;
