export const ITEM_TAGS = ["Fuerte", "Cremoso", "Dulce", "Gourmet", "Intenso", "Refrescante"];

export const SECTION_TYPES = [
  { value: "drink", label: "Bebida" },
  { value: "food", label: "Alimento" },
  { value: "other", label: "Otro" },
] as const;

export interface DeleteTarget {
  type: "item" | "section";
  sectionId: string;
  itemId?: string;
  name: string;
}
