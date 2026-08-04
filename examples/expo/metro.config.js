const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');
const { withSayKit } = require('babel-plugin-saykit/metro');

// Metro never runs Babel over `.json`, so the catalogues are assembled by a
// transformer rather than the Babel plugin. That also keeps them real modules,
// which is what lets Metro invalidate them — its transform cache is keyed on
// each file's own bytes, so a record inlined into an importer can never go
// stale-free. See https://github.com/k0d13/saykit/issues/71.
const config = withSayKit(getDefaultConfig(__dirname));

// Workspace packages (e.g. @saykit/react) keep their own React devDependency,
// which Metro would otherwise bundle as a second copy alongside the app's.
// Two copies of React break hooks, so force every request to this app's copy.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react' || moduleName.startsWith('react/')) {
    return context.resolveRequest(
      { ...context, originModulePath: path.join(__dirname, 'index.ts') },
      moduleName,
      platform,
    );
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
