/**
 * Rewrites system URLs before Expo Router handles them. Content shared into
 * Shvar from other apps (share sheet → expo-sharing) arrives on an
 * `expo-sharing` URL; route it to the share handler screen.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    if (/^[a-z][a-z0-9+.-]*:\/\/expo-sharing\b/i.test(path) || path.startsWith('expo-sharing')) return '/handle-share';
    return path;
  } catch {
    return '/';
  }
}
