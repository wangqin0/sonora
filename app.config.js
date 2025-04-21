export default {
  name: "sonora",
  slug: "sonora",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  newArchEnabled: true,
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff"
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.sonora.musicplayer"
  },
  android: {
    package: "com.sonora.musicplayer",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff"
    }
  },
  web: {
    favicon: "./assets/favicon.png"
  },
  scheme: "sonora",
  expo: {
    scheme: "sonora",
    extra: {
      eas: {
        projectId: "982818a4-006b-43a3-8550-e17c068ad920"
      }
    },
    android: {
      package: "com.sonora.musicplayer"
    },
    ios: {
      bundleIdentifier: "com.sonora.musicplayer"
    },
    cli: {
      appVersionSource: "remote"
    }
  },
}; 