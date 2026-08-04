/**
 * Metro compiles with Babel, so SayKit hooks in as a Babel plugin rather than a
 * bundler plugin, rewriting the `<Say>` / `` say`…` `` macros.
 *
 * Catalogues are left to `withSayKit` in `metro.config.js` — see the
 * `catalogues` option — so that editing one hot-reloads.
 */
module.exports = function babelConfig(api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],
    plugins: [['saykit', { catalogues: 'module' }]],
  };
};
