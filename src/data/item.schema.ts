// Item schema. Locked by IMPLEMENTATION_PLAN.md P6.3. Effect union expands
// in later iters (cosmetic gear → P8.6).

export interface HealEffect {
  type: "heal";
  amount: number;
}

export type ItemEffect = HealEffect;

export interface ItemDef {
  id: string;
  name: string;
  color: number;
  stack: number;
  effect?: ItemEffect;
}
