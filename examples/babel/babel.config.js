/**
 * Babel and nothing else — no bundler, no loader, no `withSayKit`.
 *
 * `babel-plugin-saykit` with its defaults rewrites the macros *and* inlines the
 * catalogue imports, so the compiled output in `dist/` is plain JavaScript with
 * one object literal per locale and no `.po` file anywhere near it. That is the
 * `catalogues: 'inline'` mode, and this example exists to keep it working.
 */
module.exports = {
  presets: [['@babel/preset-env', { targets: { node: 'current' } }], '@babel/preset-typescript'],
  plugins: ['saykit'],
};
