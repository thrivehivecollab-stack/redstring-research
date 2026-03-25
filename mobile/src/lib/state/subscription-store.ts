import { create } from 'zustand';
import { hasEntitlement } from '@/lib/revenuecatClient';

export type SubscriptionTier = 'free' | 'researcher' | 'investigator' | 'professional' | 'lifetime' | 'founding_member';

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
      // Check highest tiers first
      const lifetimeResult = await hasEntitlement('lifetime');
      if (lifetimeResult.ok && lifetimeResult.data) {
        set({ tier: 'lifetime', isLoading: false });
        return;
      }
      const professionalResult = await hasEntitlement('professional');
      if (professionalResult.ok && professionalResult.data) {
        set({ tier: 'professional', isLoading: false });
        return;
      }
      const investigatorResult = await hasEntitlement('investigator');
      if (investigatorResult.ok && investigatorResult.data) {
        set({ tier: 'investigator', isLoading: false });
        return;
      }
      const foundingResult = await hasEntitlement('founding_member');
      if (foundingResult.ok && foundingResult.data) {
        set({ tier: 'founding_member', isLoading: false });
        return;
      }
      const researcherResult = await hasEntitlement('researcher');
      if (researcherResult.ok && researcherResult.data) {
        set({ tier: 'researcher', isLoading: false });
        return;
      }
      set({ tier: 'free', isLoading: false });
    } catch {
      set({ tier: 'free', isLoading: false });
    }
  },

  maxInvestigations: () => {
    const tier = get().tier;
    if (tier === 'lifetime' || tier === 'professional' || tier === 'investigator') return Infinity;
    if (tier === 'founding_member' || tier === 'researcher') return 25;
    return 3;
  },

  maxNodesPerInvestigation: () => {
    const tier = get().tier;
    if (tier === 'lifetime' || tier === 'professional' || tier === 'investigator') return Infinity;
    if (tier === 'founding_member' || tier === 'researcher') return 200;
    return 25;
  },
}));

export default useSubscriptionStore;
