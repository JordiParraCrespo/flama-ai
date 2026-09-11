const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const { wrapWithReanimatedMetroConfig } = require('react-native-reanimated/metro-config');
const path = require('node:path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch all files in the monorepo
config.watchFolders = [workspaceRoot];

// Resolve modules from the project first, then the monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs'];

// Prevent Metro from resolving duplicate React/RN copies from web-only packages
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const singletons = ['react', 'react-native', 'react-native-css-interop'];
  if (singletons.includes(moduleName)) {
    return {
      type: 'sourceFile',
      filePath: require.resolve(moduleName, {
        paths: [projectRoot, workspaceRoot],
      }),
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(wrapWithReanimatedMetroConfig(config), {
  input: './global.css',
  inlineRem: 16,
});
