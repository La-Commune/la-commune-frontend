export interface StampEvent {
  cardId: string;
  customerId?: string;

  createdAt: string | Date;

  drinkType?: string;
  size?: "10oz" | "12oz";

  /** Auditoría */
  addedBy?: "barista" | "system";
  baristaId?: string;

  notes?: string;

  source: "manual" | "promo" | "auto" | "redemption" | "referral_bonus";
}
