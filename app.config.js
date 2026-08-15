const appConfig = require('./src/config/appConfig');

module.exports = ({ config }) => ({
  ...config,
  name: appConfig.appName,
  slug: appConfig.appSlug,
  version: appConfig.version,
  orientation: "portrait",
  icon: appConfig.assets.icon,
  scheme: appConfig.scheme,
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true
  },
  android: {
    adaptiveIcon: {
      backgroundColor: appConfig.assets.androidAdaptiveIconBackgroundColor,
      foregroundImage: appConfig.assets.androidAdaptiveIconForeground,
      backgroundImage: appConfig.assets.androidAdaptiveIconBackground,
      monochromeImage: appConfig.assets.androidAdaptiveIconMonochrome
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: appConfig.androidPackage
  },
  web: {
    output: "static",
    favicon: appConfig.assets.favicon
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: appConfig.assets.splashImage,
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: appConfig.assets.splashBackgroundColorLight,
        dark: {
          backgroundColor: appConfig.assets.splashBackgroundColorDark
        }
      }
    ]
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true
  },
  extra: {
    router: {},
    eas: {
      projectId: "00e1048a-ea59-4522-b996-662ad7502f5a"
    }
  }
});
