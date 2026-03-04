import { create } from 'zustand';
import { hasEntitlement } from '@/lib/revenuecatClient';

export type SubscriptionTier = 'free' | 'pro' | 'plus';

interface SubscriptionStore {
  tier: SubscriptionTier;
  isLoading: boolean;
  checkSubscription: () => Promise<void>;
  maxInvestigations: () => number;
  maxNodesPerInvestigation: () => number;
}

const useSubscriptionStore = create<SubscriptionStore>()((set, get) => ({
  tier: 'free',
  isLoading: false,

  checkSubscription: async () => {
    set({ isLoading: true });
    try {
      const plusResult = await hasEntitlement('plus');
      if (plusResult.ok && plusResult.data) {
        set({ tier: 'plus', isLoading: false });
        return;
      }
      const proResult = await hasEntitlement('pro');
      if (proResult.ok && proResult.data) {
        set({ tier: 'pro', isLoading: false });
        return;
      }
      set({ tier: 'free', isLoading: false });
    } catch {
      set({ tier: 'free', isLoading: false });
    }
  },

  maxInvestigations: () => {
    const tier = get().tier;
    if (tier === 'plus') return Infinity;
    if (tier === 'pro') return 25;
    return 3;
  },

  maxNodesPerInvestigation: () => {
    const tier = get().tier;
    if (tier === 'plus') return Infinity;
    if (tier === 'pro') return 200;
    return 25;
  },
}));

export default useSubscriptionStore;
