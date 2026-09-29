import { requireOptionalNativeModule } from 'expo';

/**
 * Optional on-device OCR via `expo-text-extractor` (ML Kit on Android, Apple
 * Vision on iOS). The native module only exists in development/production
 * builds — in Expo Go it is absent and OCR reports unavailable, so we load it
 * optionally instead of importing the package (which would throw).
 */
interface TextExtractorModule {
  isSupported: boolean;
  extractTextFromImage(uri: string): Promise<string[]>;
}

const native = requireOptionalNativeModule<TextExtractorModule>('ExpoTextExtractor');

export function isOcrAvailable(): boolean {
  return !!native?.isSupported;
}

export async function recognizeText(uri: string): Promise<string | null> {
  if (!native?.isSupported) return null;
  try {
    const lines = await native.extractTextFromImage(uri.replace('file://', ''));
    const text = lines.join('\n').trim();
    return text || null;
  } catch (e) {
    console.warn('[ocr] failed', e);
    return null;
  }
}
