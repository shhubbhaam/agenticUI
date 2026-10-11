// src/screens/home/actions.ts
// The ONLY place layout actions turn into behaviour. Exhaustive over the contract's
// closed allow-list; anything else is impossible by type and rejected by the contract.
// Authorization of complete-activity happens again on the BFF (session learner + course + published).
import type { LayoutAction } from '../../contracts/homeLayout';
import { markActivityComplete } from '../../core/api/learnhouse/client';

export interface ActionDeps {
  navigate: (screen: 'PathScreen' | 'PracticeScreen') => void;
  onCompleted: (activityUuid: string, status: 'applied' | 'received') => void;
  onError: (message: string) => void;
  newKey?: () => string;
}

const defaultKey = () => `k${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

export async function runLayoutAction(action: LayoutAction, deps: ActionDeps): Promise<void> {
  switch (action.type) {
    case 'open-path':
      return deps.navigate('PathScreen');
    case 'open-practice':
      return deps.navigate('PracticeScreen');
    case 'complete-activity': {
      try {
        const r = await markActivityComplete(action.activityUuid, (deps.newKey ?? defaultKey)());
        deps.onCompleted(action.activityUuid, r.status);
      } catch (e: any) {
        deps.onError(e?.status === 403 ? 'That activity is not available to you.' : 'Could not save progress. Try again.');
      }
      return;
    }
    default: {
      const never: never = action;
      return never;
    }
  }
}
