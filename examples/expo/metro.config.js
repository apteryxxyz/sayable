const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

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
