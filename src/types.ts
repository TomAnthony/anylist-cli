/**
 * Type definitions for the anylist library
 */

export interface AnyListItem {
  name: string;
  quantity: string;
  checked: boolean;
  identifier: string;
  categoryMatchId: string;
  save(): Promise<void>;
}

export interface AnyListList {
  name: string;
  identifier: string;
  items: AnyListItem[];
  addItem(item: AnyListItem): Promise<AnyListItem>;
  removeItem(item: AnyListItem): Promise<void>;
  getItemByName(name: string): AnyListItem | undefined;
}

export interface AnyListClient {
  login(): Promise<void>;
  teardown(): void;
  getLists(): Promise<AnyListList[]>;
  getListByName(name: string): AnyListList | undefined;
  createItem(options: {
    name: string;
    quantity?: string;
    categoryMatchId?: string;
  }): AnyListItem;
}

/**
 * Serializable list info for JSON output
 */
export interface ListInfo {
  name: string;
  identifier: string;
  itemCount: number;
  checkedCount: number;
}

/**
 * Serializable item info for JSON output
 */
export interface ItemInfo {
  name: string;
  quantity: string;
  checked: boolean;
  identifier: string;
  categoryMatchId: string;
}

/**
 * Common category IDs used by AnyList
 * Maps friendly names to AnyList's internal category IDs
 */
export const ANYLIST_CATEGORIES = {
  produce: "produce",
  meat: "meat-seafood",
  seafood: "meat-seafood",
  dairy: "dairy",
  bakery: "bakery-bread",
  bread: "bakery-bread",
  frozen: "frozen",
  canned: "canned-goods",
  condiments: "condiments",
  beverages: "beverages",
  snacks: "snacks",
  pasta: "pasta-rice",
  rice: "pasta-rice",
  cereal: "breakfast",
  breakfast: "breakfast",
  baking: "baking",
  spices: "spices-seasonings",
  seasonings: "spices-seasonings",
  household: "household",
  "personal care": "personal-care",
  other: "other",
} as const;

export type CategoryName = keyof typeof ANYLIST_CATEGORIES;

/**
 * Exit codes following CLI conventions
 */
export const ExitCode = {
  Success: 0,
  Failure: 1,
  InvalidUsage: 2,
  AuthFailure: 3,
} as const;
