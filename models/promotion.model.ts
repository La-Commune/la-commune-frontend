export interface Promotion {
  id?: string;
  title: string;
  description: string;
  /** e.g. "2x1", "descuento", "gratis", "otro" */
  type: "2x1" | "descuento" | "gratis" | "otro";
  /** Optional discount percentage (for type "descuento") */
  discountPercent?: number;
  /** ISO date strings or Date objects */
  startsAt: string | Date;
  endsAt: string | Date;
  /** Days of the week this promo applies (0=Sun … 6=Sat). Empty = every day */
  daysOfWeek: number[];
  /** Whether the promo is currently enabled by the barista */
  active: boolean;
  /** Optional: specific menu items or section this applies to */
  appliesTo?: string;
  order: number;
  schemaVersion: number;
}
