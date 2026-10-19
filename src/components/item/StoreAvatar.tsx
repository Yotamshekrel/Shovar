import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { storeLogo } from '@/networks/logos';
import { readableOn, storeColor, storeInitials } from '@/theme/color';

/**
 * Store mark: the card's own logo, else a bundled logo matched by store name, else colored initials.
 * `names` are extra spellings of the store to match (e.g. the English name of a Hebrew-named chain).
 */
export function StoreAvatar({
  name,
  names,
  logoUri,
  size = 40,
  inverted,
}: {
  name: string;
  names?: (string | null | undefined)[];
  logoUri?: string | null;
  size?: number;
  inverted?: boolean;
}) {
  const bundled = logoUri ? null : storeLogo(name, ...(names ?? []));
  const radius = size * 0.3;
  if (logoUri || bundled) {
    return (
      <View style={[styles.avatar, styles.logoTile, { width: size, height: size, borderRadius: radius }]}>
        <Image
          source={logoUri ? { uri: logoUri } : bundled}
          style={{ width: size, height: size }}
          contentFit="cover"
          accessibilityLabel={name}
        />
      </View>
    );
  }
  const bg = storeColor(name);
  const background = inverted ? 'rgba(255,255,255,0.22)' : bg;
  const fg = inverted ? '#FFFFFF' : readableOn(bg);
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: radius, backgroundColor: background }]}>
      <Text variant="bodyStrong" color={fg} style={{ fontSize: size * 0.38, lineHeight: size * 0.46 }} maxFontSizeMultiplier={1}>
        {storeInitials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  // Logos come on white: keep that tile (with a hairline) so they read on colored cards and in dark mode alike.
  logoTile: { backgroundColor: '#FFFFFF', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.12)' },
});
