import { create } from 'zustand';

import type { BarcodeFormat } from '@/domain/types';

export interface ScannedCode {
  data: string;
  format: BarcodeFormat;
}

interface ScannedCodeState {
  result: ScannedCode | null;
  set: (r: ScannedCode) => void;
  clear: () => void;
}

/** Hands a barcode read by the camera screen back to the form that asked for it. */
export const useScannedCode = create<ScannedCodeState>((set) => ({
  result: null,
  set: (result) => set({ result }),
  clear: () => set({ result: null }),
}));
