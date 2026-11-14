// M5 offline sync status, for a small "Offline · Syncing… · Synced" indicator. In memory only: the
// outbox in SQLite is the source of truth, this just mirrors it for the UI.
import { create } from 'zustand';
import type { RejectedEvent } from '../data/local/outbox';

export interface SyncState {
  /** Events still owed to the BFF. */
  pending: number;
  /** Events the BFF refused (e.g. course removed); shown until dismissed. */
  rejected: RejectedEvent[];
  /** Last send failed because there was no network. */
  offline: boolean;
  /** The BFF session expired: events are kept, the learner must sign in again to send them. */
  needsSignIn: boolean;
  syncing: boolean;
  lastSyncedAt: Date | null;
}

export const useSyncStore = create<SyncState>()(() => ({
  pending: 0,
  rejected: [],
  offline: false,
  needsSignIn: false,
  syncing: false,
  lastSyncedAt: null,
}));
