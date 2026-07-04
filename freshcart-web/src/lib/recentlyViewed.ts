const STORAGE_KEY = 'freshcart-recently-viewed';
const MAX_STORED = 15;

function readIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function recordRecentlyViewed(productId: string) {
  if (typeof window === 'undefined') return;
  try {
    const next = [productId, ...readIds().filter((id) => id !== productId)].slice(0, MAX_STORED);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage can throw in private-browsing/storage-disabled contexts —
    // recently-viewed is a nice-to-have, not worth surfacing an error for.
  }
}

export function getRecentlyViewedIds(excludeId: string, limit = 15): string[] {
  return readIds().filter((id) => id !== excludeId).slice(0, limit);
}
