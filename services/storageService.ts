import { Site } from '../types';
import { INITIAL_SITES } from '../constants';
import { EXTRA_SITES } from '../extraSites';

const ALL_INITIAL_SITES: Site[] = [...INITIAL_SITES, ...EXTRA_SITES];

// LeanCloud SDK is loaded via CDN in index.html, creating a global 'AV' object.
// We declare it here to satisfy TypeScript.
declare global {
  interface Window {
    AV: any;
  }
}

const APP_ID = "6P7pXdSfaRbIqcHY7j7A4YD4-gzGzoHsz";
const APP_KEY = "2IP6aCKKVp3Hk3NBt1zQp90C";
const SERVER_URL = "https://6p7pxdsf.lc-cn-n1-shared.com";

const parseTags = (raw: unknown): string[] => {
  try {
    const parsed = JSON.parse(typeof raw === 'string' ? raw : '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

// The first imported batch used the broad “有人模” rule and included empty studio
// backdrops. The replacement batch carries “实景优先”; remove only the old managed
// batch before syncing the stricter list.
const isLegacyImportedBatch = (obj: any): boolean => {
  const tags = parseTags(obj.get('icon'));
  const isManagedRegion = ['美国', '英国', '德国', '东欧'].some(region => tags.includes(region));
  return isManagedRegion && tags.includes('有人模') && !tags.includes('实景优先');
};

// --- Internal Helper: Lazy Initialize LeanCloud ---
const getAV = () => {
  const AV = window.AV;
  if (typeof AV === 'undefined') {
    console.error("LeanCloud SDK not loaded. Check index.html script tags.");
    return null;
  }
  
  try {
    // Check if already initialized to avoid re-init errors
    if (!AV.applicationId) {
      AV.init({
        appId: APP_ID,
        appKey: APP_KEY,
        serverURL: SERVER_URL
      });
      console.log("LeanCloud initialized.");
    }
    return AV;
  } catch (e) {
    console.log("LeanCloud init check error:", e);
    // Return AV anyway in case it was initialized elsewhere
    return AV;
  }
};

// --- Internal Helper: Seed Data ---
const seedInitialData = async () => {
  const AV = getAV();
  if (!AV) return;

  console.log("Seeding initial data to Cloud...");
  const objects = ALL_INITIAL_SITES.map(site => {
    const obj = new AV.Object('Sites');
    obj.set('name', site.n);
    obj.set('url', site.u);
    obj.set('category', site.c);
    obj.set('icon', JSON.stringify(site.t)); // Storing tags in 'icon' field
    obj.set('rating', site.rating || 0);
    obj.set('pinned', site.pinned || false);
    return obj;
  });

  try {
    await AV.Object.saveAll(objects);
    console.log("Seeding complete. Class 'Sites' populated.");
  } catch (e) {
    console.error("Seeding failed", e);
  }
};

// --- Exported Methods ---

export const fetchSites = async (): Promise<Site[]> => {
  const AV = getAV();
  if (!AV) return ALL_INITIAL_SITES;

  try {
    const query = new AV.Query('Sites');
    query.limit(1000);
    const results = await query.find();

    // If database is empty, seed it and return initial data
    if (results.length === 0) {
      console.log("No sites found in cloud. Seeding...");
      await seedInitialData();
      return ALL_INITIAL_SITES;
    }

    // Hide the previous loose batch immediately, then remove it from LeanCloud.
    const legacyObjects = results.filter(isLegacyImportedBatch);
    const legacyIds = new Set(legacyObjects.map((obj: any) => obj.id));
    const activeResults = results.filter((obj: any) => !legacyIds.has(obj.id));

    if (legacyObjects.length > 0) {
      console.log(`Removing ${legacyObjects.length} legacy studio-background sites...`);
      try {
        await Promise.all(legacyObjects.map((obj: any) => obj.destroy()));
      } catch (e) {
        console.error("Legacy batch cleanup failed", e);
      }
    }

    // Map Cloud Objects to Site Interface
    const cloudSites: Site[] = activeResults.map((obj: any) => ({
      objectId: obj.id,
      n: obj.get('name'),
      u: obj.get('url'),
      c: obj.get('category'),
      t: parseTags(obj.get('icon')),
      rating: obj.get('rating') || 0,
      pinned: obj.get('pinned') || false
    }));

    // Sync sites from the bundled lists that are missing in Cloud.
    const cloudUrls = new Set(cloudSites.map(s => s.u));
    const sitesToAdd = ALL_INITIAL_SITES.filter(s => !cloudUrls.has(s.u));

    if (sitesToAdd.length > 0) {
      console.log(`Syncing ${sitesToAdd.length} new sites from constants...`);
      const objectsToSave = sitesToAdd.map(site => {
        const obj = new AV.Object('Sites');
        obj.set('name', site.n);
        obj.set('url', site.u);
        obj.set('category', site.c);
        obj.set('icon', JSON.stringify(site.t));
        obj.set('rating', site.rating || 0);
        obj.set('pinned', site.pinned || false);
        return obj;
      });

      try {
        await AV.Object.saveAll(objectsToSave);
        const savedSites = objectsToSave.map((obj: any, index: number) => ({
          ...sitesToAdd[index],
          objectId: obj.id
        }));
        return [...cloudSites, ...savedSites];
      } catch (e) {
        console.error("Sync failed", e);
        // Fallback: return combined list even if save failed
        return [...cloudSites, ...sitesToAdd];
      }
    }

    return cloudSites;

  } catch (error: any) {
    // Error 101: Class not found (database empty/new)
    if (error.code === 101) {
      console.log("Class 'Sites' not found. Creating and seeding...");
      await seedInitialData();
      return ALL_INITIAL_SITES;
    }
    console.error("Fetch sites failed:", error);
    return ALL_INITIAL_SITES;
  }
};

export const createSite = async (site: Site): Promise<Site> => {
  const AV = getAV();
  if (!AV) throw new Error("Cloud not initialized");

  const obj = new AV.Object('Sites');
  obj.set('name', site.n);
  obj.set('url', site.u);
  obj.set('category', site.c);
  obj.set('icon', JSON.stringify(site.t));
  obj.set('rating', site.rating || 0);
  obj.set('pinned', site.pinned || false);

  const saved = await obj.save();
  return { ...site, objectId: saved.id };
};

export const updateSite = async (site: Site): Promise<void> => {
  const AV = getAV();
  if (!AV || !site.objectId) return;

  try {
    const obj = AV.Object.createWithoutData('Sites', site.objectId);
    obj.set('name', site.n);
    obj.set('url', site.u);
    obj.set('category', site.c);
    obj.set('icon', JSON.stringify(site.t));
    obj.set('rating', site.rating || 0);
    obj.set('pinned', site.pinned || false);
    await obj.save();
  } catch (e) {
    console.error("Failed to update site", e);
  }
};

export const deleteSite = async (siteId: string): Promise<void> => {
  const AV = getAV();
  if (!AV) return;

  try {
    const obj = AV.Object.createWithoutData('Sites', siteId);
    await obj.destroy();
  } catch (e) {
    console.error("Failed to delete site", e);
  }
};
