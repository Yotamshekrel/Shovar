import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import type { AttachmentKind } from '@/domain/types';
import type { PendingAttachment } from '@/state/drafts';

export type PickResult = { status: 'picked'; attachment: PendingAttachment } | { status: 'cancelled' } | { status: 'denied' };

function fromImageAsset(asset: ImagePicker.ImagePickerAsset, kind: AttachmentKind): PendingAttachment {
  return {
    uri: asset.uri,
    mimeType: asset.mimeType ?? 'image/jpeg',
    kind,
    width: asset.width ?? null,
    height: asset.height ?? null,
    sizeBytes: asset.fileSize ?? null,
  };
}

const IMAGE_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  // < 1 re-encodes to JPEG (no HEIC surprises) and keeps receipts legible.
  quality: 0.85,
  exif: false,
};

export async function pickFromCamera(kind: AttachmentKind = 'receipt'): Promise<PickResult> {
  if (Platform.OS !== 'web') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return { status: 'denied' };
  }
  const res = await ImagePicker.launchCameraAsync(IMAGE_OPTIONS);
  if (res.canceled || !res.assets?.[0]) return { status: 'cancelled' };
  return { status: 'picked', attachment: fromImageAsset(res.assets[0], kind) };
}

export async function pickFromGallery(kind: AttachmentKind = 'receipt'): Promise<PickResult> {
  if (Platform.OS === 'ios') {
    // Asking up front avoids a permission prompt appearing after selection.
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted && perm.accessPrivileges !== 'limited') return { status: 'denied' };
  }
  const res = await ImagePicker.launchImageLibraryAsync(IMAGE_OPTIONS);
  if (res.canceled || !res.assets?.[0]) return { status: 'cancelled' };
  return { status: 'picked', attachment: fromImageAsset(res.assets[0], kind) };
}

export async function pickDocument(kind: AttachmentKind = 'receipt'): Promise<PickResult> {
  const res = await DocumentPicker.getDocumentAsync({
    type: ['image/*', 'application/pdf'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (res.canceled || !res.assets?.[0]) return { status: 'cancelled' };
  const a = res.assets[0];
  const mimeType = a.mimeType ?? (a.name?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
  return {
    status: 'picked',
    attachment: {
      uri: a.uri,
      mimeType,
      kind: mimeType === 'application/pdf' ? 'document' : kind,
      sizeBytes: a.size ?? null,
    },
  };
}
