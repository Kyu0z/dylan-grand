import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  transpilePackages: ['@dylan/ui', '@dylan/types', '@dylan/validation', '@dylan/api-client'],
};
export default nextConfig;
