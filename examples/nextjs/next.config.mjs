import { withSayKit } from 'babel-plugin-saykit/next';

// Catalogues are served as real modules by a loader rather than inlined by the
// Babel plugin (see `.babelrc`), which is what lets editing one hot-reload.
// `withSayKit` derives the Turbopack and webpack rules from `saykit.config.ts`,
// so they always match the buckets. See https://github.com/k0d13/saykit/issues/71.
export default withSayKit({});
