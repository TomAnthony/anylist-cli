/**
 * AnyList API client wrapper
 */

// @ts-expect-error - anylist has no type definitions
import AnyList from "anylist";
import type {
  AnyListClient,
  AnyListList,
  AnyListItem,
  ListInfo,
  ItemInfo,
} from "./types.js";

let clientInstance: AnyListClient | null = null;

/**
 * Get an authenticated AnyList client
 */
export async function getClient(
  email: string,
  password: string
): Promise<AnyListClient> {
  const client = new AnyList({ email, password }) as AnyListClient;
  await client.login();
  clientInstance = client;
  return client;
}

/**
 * Clean up the client connection
 */
export function teardown(): void {
  if (clientInstance) {
    clientInstance.teardown();
    clientInstance = null;
  }
}

/**
 * Get all lists
 */
export async function getLists(client: AnyListClient): Promise<ListInfo[]> {
  const lists = await client.getLists();
  return lists.map((list: AnyListList) => ({
    name: list.name,
    identifier: list.identifier,
    itemCount: list.items.length,
    checkedCount: list.items.filter((i: AnyListItem) => i.checked).length,
  }));
}

/**
 * Get a list by name (case-insensitive)
 */
export async function getListByName(
  client: AnyListClient,
  name: string
): Promise<AnyListList | undefined> {
  // Ensure lists are loaded
  await client.getLists();

  // Try exact match first
  const exactMatch = client.getListByName(name);
  if (exactMatch) return exactMatch;

  // Try case-insensitive match
  const lists = await client.getLists();
  const lowerName = name.toLowerCase();
  return lists.find((l: AnyListList) => l.name.toLowerCase() === lowerName);
}

/**
 * Get items from a list
 */
export function getItems(list: AnyListList, uncheckedOnly = false): ItemInfo[] {
  let items = list.items;
  if (uncheckedOnly) {
    items = items.filter((i: AnyListItem) => !i.checked);
  }
  return items.map((item: AnyListItem) => ({
    name: item.name,
    quantity: item.quantity || "",
    details: item.details || "",
    checked: Boolean(item.checked),
    identifier: item.identifier,
    categoryMatchId: item.categoryMatchId || "other",
  }));
}

/**
 * Find an item by name (case-insensitive)
 */
export function findItemByName(
  list: AnyListList,
  name: string
): AnyListItem | undefined {
  // Try exact match first
  const exactMatch = list.getItemByName(name);
  if (exactMatch) return exactMatch;

  // Try case-insensitive match
  const lowerName = name.toLowerCase();
  return list.items.find(
    (i: AnyListItem) => i.name.toLowerCase() === lowerName
  );
}

/**
 * Add an item to a list
 * If item exists, it will be unchecked and updated
 */
export async function addItem(
  client: AnyListClient,
  list: AnyListList,
  name: string,
  quantity?: string,
  categoryMatchId?: string,
  details?: string
): Promise<ItemInfo> {
  // Check if item already exists
  const existing = findItemByName(list, name);
  if (existing) {
    let needsSave = false;

    if (existing.checked) {
      existing.checked = false;
      needsSave = true;
    }
    if (quantity) {
      existing.quantity = quantity;
      needsSave = true;
    }
    if (categoryMatchId) {
      existing.categoryMatchId = categoryMatchId;
      needsSave = true;
    }
    if (details !== undefined) {
      existing.details = details;
      needsSave = true;
    }

    if (needsSave) {
      await existing.save();
    }

    return {
      name: existing.name,
      quantity: existing.quantity || "",
      details: existing.details || "",
      checked: existing.checked,
      identifier: existing.identifier,
      categoryMatchId: existing.categoryMatchId || "other",
    };
  }

  // Create new item
  const options: {
    name: string;
    quantity?: string;
    details?: string;
    categoryMatchId?: string;
  } = { name };
  if (quantity) {
    options.quantity = quantity;
  }
  if (details !== undefined) {
    options.details = details;
  }
  if (categoryMatchId) {
    options.categoryMatchId = categoryMatchId;
  }
  const item = client.createItem(options);
  const added = await list.addItem(item);
  return {
    name: added.name,
    quantity: added.quantity || "",
    details: added.details || "",
    checked: added.checked,
    identifier: added.identifier,
    categoryMatchId: added.categoryMatchId || "other",
  };
}

/**
 * Check an item (mark as done)
 */
export async function checkItem(
  list: AnyListList,
  name: string
): Promise<ItemInfo | null> {
  const item = findItemByName(list, name);
  if (!item) return null;

  item.checked = true;
  await item.save();
  return {
    name: item.name,
    quantity: item.quantity || "",
    details: item.details || "",
    checked: item.checked,
    identifier: item.identifier,
    categoryMatchId: item.categoryMatchId || "other",
  };
}

/**
 * Uncheck an item
 */
export async function uncheckItem(
  list: AnyListList,
  name: string
): Promise<ItemInfo | null> {
  const item = findItemByName(list, name);
  if (!item) return null;

  item.checked = false;
  await item.save();
  return {
    name: item.name,
    quantity: item.quantity || "",
    details: item.details || "",
    checked: item.checked,
    identifier: item.identifier,
    categoryMatchId: item.categoryMatchId || "other",
  };
}

/**
 * Update an item's notes/details
 */
export async function updateItemDetails(
  list: AnyListList,
  name: string,
  details: string
): Promise<ItemInfo | null> {
  const item = findItemByName(list, name);
  if (!item) return null;

  item.details = details;
  await item.save();
  return {
    name: item.name,
    quantity: item.quantity || "",
    details: item.details || "",
    checked: item.checked,
    identifier: item.identifier,
    categoryMatchId: item.categoryMatchId || "other",
  };
}

/**
 * Remove an item from a list
 */
export async function removeItem(
  list: AnyListList,
  name: string
): Promise<boolean> {
  const item = findItemByName(list, name);
  if (!item) return false;

  await list.removeItem(item);
  return true;
}

/**
 * Clear all checked items from a list
 */
export async function clearChecked(list: AnyListList): Promise<number> {
  const checkedItems = list.items.filter((i: AnyListItem) => i.checked);
  let count = 0;

  for (const item of checkedItems) {
    await list.removeItem(item);
    count++;
  }

  return count;
}
