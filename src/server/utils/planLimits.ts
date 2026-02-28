export interface PlanLimits {
  maxVaults: number;
  maxItemsPerVault: number;
  maxGuests: number;
  storageMB: number;
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  Free: {
    maxVaults: 3,
    maxItemsPerVault: 20,
    maxGuests: 1,
    storageMB: 200,
  },
  Pro: {
    maxVaults: 10,
    maxItemsPerVault: 100,
    maxGuests: 5,
    storageMB: 500,
  },
  Scale: {
    maxVaults: 50,
    maxItemsPerVault: 500,
    maxGuests: 25,
    storageMB: 2000,
  },
};

export function getPlanLimits(plan?: string): PlanLimits {
  return PLAN_LIMITS[plan || 'Free'] || PLAN_LIMITS.Free;
}
