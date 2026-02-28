export interface SizeOption {
  label: string;
  price: number;
}

export interface MenuItem {
  id?: string;
  name: string;
  price?: number;
  sizes?: SizeOption[];
  ingredients: string[];
  optional?: string[];
  note?: string;
  available: boolean;
  tags: string[];
  highlight: boolean;
  seasonal: boolean;
  order: number;
  schemaVersion: number;
}

export interface MenuSection {
  id?: string;
  title: string;
  description: string;
  type: "drink" | "food" | "other";
  order: number;
  active: boolean;
  items?: MenuItem[];
  schemaVersion: number;
}
