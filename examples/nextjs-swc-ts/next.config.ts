import type { NextConfig } from 'next';

export default {
  experimental: {
    swcPlugins: [['@sayable/plugin-swc', {}]],
  },
} satisfies NextConfig;
