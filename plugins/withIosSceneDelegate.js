const { withAppDelegate, withInfoPlist } = require("@expo/config-plugins");

// Very new iOS/Xcode versions hard-crash any app that doesn't declare full
// UIScene lifecycle adoption (see plugins/withIosMinDeploymentTarget.js's
// sibling problem — same root cause: this toolchain is ahead of what
// React Native's default AppDelegate template supports out of the box).
//
// This adds a real UIWindowSceneDelegate rather than just the Info.plist
// declaration, because a bare declaration only silences the *old*, soft
// version of Apple's runtime check — this OS enforces it for real.
//
// iOS instantiates the scene delegate named in Info.plist as a fresh object
// (not the running AppDelegate singleton), so it must reach the already-
// created RN factory via `UIApplication.shared.delegate`, and it must also
// forward URL/user-activity callbacks to AppDelegate's existing methods —
// otherwise deep links (invite links, Firebase auth's redirect back into
// the app) would silently stop working once scene lifecycle takes over
// from the classic UIApplicationDelegate callbacks.

const SCENE_DELEGATE_CLASS = "SceneDelegate";

const SCENE_DELEGATE_BLOCK = `
#if os(iOS) || os(tvOS)
// Added by plugins/withIosSceneDelegate.js
class ${SCENE_DELEGATE_CLASS}: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
    guard let windowScene = scene as? UIWindowScene else { return }
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    appDelegate.window = window
    appDelegate.reactNativeFactory?.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: nil)

    // Cold start via a URL / universal link: forward to AppDelegate's existing handlers.
    if let url = connectionOptions.urlContexts.first?.url {
      _ = appDelegate.application(UIApplication.shared, open: url, options: [:])
    }
    if let userActivity = connectionOptions.userActivities.first {
      _ = appDelegate.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
    }
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let url = URLContexts.first?.url else { return }
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }
    _ = appDelegate.application(UIApplication.shared, open: url, options: [:])
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }
    _ = appDelegate.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
  }
}
#endif
`;

const WINDOW_LINE = "    window = UIWindow(frame: UIScreen.main.bounds)\n";
const START_RN_BLOCK = `    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
`;

function patchAppDelegate(contents) {
  const marker = `// Added by plugins/withIosSceneDelegate.js`;
  if (contents.includes(marker)) return contents;

  if (!contents.includes(WINDOW_LINE)) {
    throw new Error(
      "withIosSceneDelegate: couldn't find the expected `window = UIWindow(frame: UIScreen.main.bounds)` line in AppDelegate.swift — the Expo template may have changed."
    );
  }
  if (!contents.includes(START_RN_BLOCK)) {
    throw new Error(
      "withIosSceneDelegate: couldn't find the expected `factory.startReactNative(...)` block in AppDelegate.swift — the Expo template may have changed."
    );
  }

  // Window creation + starting RN now happens once a scene connects, not at
  // app-launch time — didFinishLaunchingWithOptions just builds the factory.
  contents = contents.replace(WINDOW_LINE, "");
  contents = contents.replace(START_RN_BLOCK, "");
  contents = contents.trimEnd() + "\n" + SCENE_DELEGATE_BLOCK;
  return contents;
}

const withIosSceneDelegate = (config) => {
  config = withAppDelegate(config, (config) => {
    if (config.modResults.language !== "swift") {
      throw new Error(`withIosSceneDelegate only supports Swift AppDelegates, got "${config.modResults.language}"`);
    }
    config.modResults.contents = patchAppDelegate(config.modResults.contents);
    return config;
  });

  config = withInfoPlist(config, (config) => {
    config.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: "Default Configuration",
            UISceneDelegateClassName: `$(PRODUCT_MODULE_NAME).${SCENE_DELEGATE_CLASS}`,
          },
        ],
      },
    };
    return config;
  });

  return config;
};

module.exports = withIosSceneDelegate;
