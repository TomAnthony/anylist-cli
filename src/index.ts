/**
 * anylist-cli - Unofficial CLI for AnyList grocery and shopping lists
 *
 * @packageDocumentation
 */

// Re-export client functions for programmatic use
export {
  getClient,
  teardown,
  getLists,
  getListByName,
  getItems,
  findItemByName,
  addItem,
  checkItem,
  uncheckItem,
  removeItem,
  clearChecked,
} from "./client.js";

// Re-export types
export type {
  AnyListClient,
  AnyListList,
  AnyListItem,
  ListInfo,
  ItemInfo,
  CategoryName,
} from "./types.js";

export { ANYLIST_CATEGORIES, ExitCode } from "./types.js";
