import { View } from 'react-native';

import { Text } from '@/components/ui';

// Implemented in M7.
export default function LocationPermissionScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text tone="secondary">location</Text>
    </View>
  );
}
