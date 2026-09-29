import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { readableOn, storeColor, storeInitials } from '@/theme/color';

export function StoreAvatar({
  name,
  logoUri,
  size = 40,
  inverted,
}: {
  name: string;
  logoUri?: string | null;
  size?: number;
  inverted?: boolean;
}) {
  const bg = storeColor(name);
  const background = inverted ? 'rgba(255,255,255,0.22)' : bg;
  const fg = inverted ? '#FFFFFF' : readableOn(bg);
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size * 0.3, backgroundColor: background }]}>
      {logoUri ? (
        <Image source={{ uri: logoUri }} style={{ width: size, height: size, borderRadius: size * 0.3 }} contentFit="cover" />
      ) : (
        <Text variant="bodyStrong" color={fg} style={{ fontSize: size * 0.38, lineHeight: size * 0.46 }} maxFontSizeMultiplier={1}>
          {storeInitials(name)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
