
export interface Site {
  objectId?: string; // LeanCloud ID
  n: string; // name
  u: string; // url
  t: string[]; // tags
  c: string; // category
  rating?: number;
  pinned?: boolean;
}

export type BackgroundMode = 'particles' | 'grid' | 'waves' | 'stars' | 'blobs' | 'matrix' | 'neural' | 'sunset' | 'snow' | 'fire' | 'sakura';

export interface Theme {
  name: string;
  bgMode: BackgroundMode;
  vars: React.CSSProperties;
}

export type CategoryFilter = 
  | 'all' 
  | 'favorites'
  | '5star' 
  | 'custom' 
  | 'shein' 
  | 'young' 
  | 'elegant' 
  | 'sport' 
  | 'french' 
  | 'gown' 
  | 'denim' 
  | 'linen' 
  | 'curve' 
  | 'fast' 
  | 'euro';

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  siteUrl: string | null;
}
