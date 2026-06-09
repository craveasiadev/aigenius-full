/**
 * useCollection — React hook that re-renders any component when the
 * collection store (pets / inventions / secrets / SFX setting) changes.
 *
 * Returns live snapshots of everything UI cares about. Subscribes once per
 * component via the bus in `collection.ts`; the actual reads come straight
 * from localStorage so values are consistent across tabs after a focus
 * event (we re-run reads on the `storage` event too).
 */
import { useEffect, useState, useCallback } from 'react';
import {
  subscribe,
  getOwnedPets, getActivePet,
  getInventions,
  getSecrets,
  isSfxOn,
  type InventionCard,
} from './collection';

export interface CollectionSnapshot {
  pets: string[];
  activePet: string | null;
  inventions: InventionCard[];
  secrets: string[];
  sfxOn: boolean;
}

function snap(): CollectionSnapshot {
  return {
    pets: getOwnedPets(),
    activePet: getActivePet(),
    inventions: getInventions(),
    secrets: getSecrets(),
    sfxOn: isSfxOn(),
  };
}

export function useCollection(): CollectionSnapshot {
  const [state, setState] = useState<CollectionSnapshot>(() => snap());

  const refresh = useCallback(() => setState(snap()), []);

  useEffect(() => {
    const unsub = subscribe(refresh);
    window.addEventListener('storage', refresh);
    return () => { unsub(); window.removeEventListener('storage', refresh); };
  }, [refresh]);

  return state;
}
