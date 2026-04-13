import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/lib/i18n/request.ts');

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: [
    '@flama/shared',
    '@flama/frontend',
    '@flama/design-system',
    '@flama/api-client',
    '@flama/translations',
  ],
};

export default withNextIntl(nextConfig);
