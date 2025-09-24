import type { NextConfig } from 'next';

export default {
  experimental: {
    swcPlugins: [['@sayable/swc-plugin', {}]],
  },
} satisfies NextConfig;
