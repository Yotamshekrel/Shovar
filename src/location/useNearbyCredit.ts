import type { Item } from '@/domain/types';

export interface NearbyCredit {
  item: Item;
  distanceM: number;
  distanceLabel: string;
}

/** Stores with credit near the user's last known position (implemented with the places cache in M7). */
export function useNearbyCredit(): NearbyCredit[] {
  return [];
}
