export interface Reward {
    name: string;
    description: string;
    requiredStamps: number;
    type: "drink" | "discount";
    active: boolean;
  }
  