import { Alert, Platform } from 'react-native';

/** Promise-based confirm dialog (native Alert; window.confirm on the web preview). */
export function confirm(opts: {
  title: string;
  message?: string;
  confirmText: string;
  cancelText: string;
  destructive?: boolean;
}): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(typeof window !== 'undefined' ? window.confirm([opts.title, opts.message].filter(Boolean).join('\n\n')) : false);
  }
  return new Promise((resolve) => {
    Alert.alert(
      opts.title,
      opts.message,
      [
        { text: opts.cancelText, style: 'cancel', onPress: () => resolve(false) },
        { text: opts.confirmText, style: opts.destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

export function notify(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert([title, message].filter(Boolean).join('\n\n'));
    return;
  }
  Alert.alert(title, message);
}
