/**
 * Metro compiles with Babel, so SayKit hooks in as a Babel plugin rather than a
 * bundler plugin. `babel-plugin-saykit` does the same two jobs `unplugin-saykit`
 * does elsewhere: rewrite the `<Say>` / `` say`…` `` macros, and inline
 * `import en from './locales/en.json'` as a plain object.
 */
module.exports = function babelConfig(api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],
    plugins: ['saykit'],
  };
};
