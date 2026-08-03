export default {
  turbopack: {
    rules: { '*.po': { loaders: ['babel-plugin-saykit/webpack'], as: '*.js' } },
  },

  // Turbopack is the default, but `next --webpack` needs the same rule.
  webpack: (config) => {
    config.module.rules.push({ test: /\.po$/, use: 'babel-plugin-saykit/webpack' });
    return config;
  },
};
