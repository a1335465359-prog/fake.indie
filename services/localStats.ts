
import { Site } from '../types';

const STATS_KEY = 'indie_nav_click_stats';
const PINNED_KEY = 'indie_nav_pinned_sites';

interface ClickStats {
  count: number;
  lastClick: number; // timestamp
}

type ClickMap = Record<string, ClickStats>;

// --- Storage Helpers ---

const loadClickMap = (): ClickMap => {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error("Failed to load click stats", e);
    return {};
  }
};

const saveClickMap = (map: ClickMap) => {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(map));
  } catch (e) {
    console.error("Failed to save click stats", e);
  }
};

export const loadPinned = (): string[] => {
  try {
    const raw = localStorage.getItem(PINNED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

export const savePinned = (list: string[]) => {
  try {
    localStorage.setItem(PINNED_KEY, JSON.stringify(list));
  } catch (e) {
    console.error("Failed to save pinned list", e);
  }
};

// --- Algorithm Core ---

// 1. Record Click
// Updates count and lastClick timestamp
export const recordClick = (siteIdOrUrl: string) => {
  const map = loadClickMap();
  const now = Date.now();
  const current = map[siteIdOrUrl] || { count: 0, lastClick: 0 };
  
  map[siteIdOrUrl] = {
    count: current.count + 1,
    lastClick: now
  };
  saveClickMap(map);
};

// 2. Compute Score
// Formula: score = clickCount * 0.7 + recentBoost * 0.3
// recentBoost = 1 if lastClick < 24h, else 0
const computeScore = (stats: ClickStats | undefined): number => {
  if (!stats) return 0;
  
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const isRecent = (Date.now() - stats.lastClick) < ONE_DAY;
  const recentBoost = isRecent ? 1 : 0;
  
  // Weights can be adjusted here
  return (stats.count * 0.7) + (recentBoost * 0.3);
};

// --- Pinned Logic ---

// 3. Toggle Pinned Status
// Returns the new list of pinned IDs
export const toggleLocalPin = (siteId: string): string[] => {
  const list = loadPinned();
  const index = list.indexOf(siteId);
  
  if (index > -1) {
    // Unpin: Remove from list
    list.splice(index, 1);
  } else {
    // Pin: Add to end of list
    list.push(siteId); 
  }
  
  savePinned(list);
  return list;
};

// 4. Check if pinned
export const isLocallyPinned = (siteId: string): boolean => {
  const list = loadPinned();
  return list.includes(siteId);
};

// 5. Reorder Pinned (Drag & Drop)
export const reorderPinned = (startIndex: number, endIndex: number): string[] => {
  const list = loadPinned();
  // Boundary checks
  if (startIndex < 0 || startIndex >= list.length || endIndex < 0 || endIndex >= list.length) {
    return list;
  }
  
  const [removed] = list.splice(startIndex, 1);
  list.splice(endIndex, 0, removed);
  
  savePinned(list);
  return list;
};

// --- Main Getter ---

export const getFavorites = (allSites: Site[]): { pinned: Site[], frequent: Site[] } => {
  const pinnedIds = loadPinned();
  const clickMap = loadClickMap();
  
  // 1. Identify Pinned Sites (in order)
  const pinnedSites: Site[] = [];
  // Preserve the order of pinnedIds
  pinnedIds.forEach(id => {
    const site = allSites.find(s => (s.objectId || s.u) === id);
    if (site) pinnedSites.push(site);
  });
  
  // 2. Identify Non-Pinned Sites & Sort by Score
  const otherSites = allSites.filter(s => !pinnedIds.includes(s.objectId || s.u));
  
  const sortedOthers = otherSites.sort((a, b) => {
    const scoreA = computeScore(clickMap[a.objectId || a.u]);
    const scoreB = computeScore(clickMap[b.objectId || b.u]);
    return scoreB - scoreA;
  });
  
  // 3. Combine and Limit to 20
  // Pinned sites come first, then algorithm sorted sites.
  // Truncate the total to 20.
  const combined = [...pinnedSites, ...sortedOthers].slice(0, 20);
  
  // 4. Split back for UI rendering
  // The App.tsx renders 'pinned' list first (draggable), then 'frequent' list (non-draggable).
  // We need to separate them based on whether they are in the pinned list.
  
  const finalPinned = combined.filter(s => pinnedIds.includes(s.objectId || s.u));
  
  // Ensure finalPinned maintains the user's manual sort order
  finalPinned.sort((a, b) => {
      const idxA = pinnedIds.indexOf(a.objectId || a.u);
      const idxB = pinnedIds.indexOf(b.objectId || b.u);
      return idxA - idxB;
  });

  const finalFrequent = combined.filter(s => !pinnedIds.includes(s.objectId || s.u));
  
  return {
    pinned: finalPinned,
    frequent: finalFrequent
  };
};
