export type Cuisine = 'Italian' | 'Mexican' | 'Asian' | 'Comfort' | 'Healthy' | 'Other';

export interface Recipe {
  id: string;
  name: string;
  cuisine: Cuisine;
  source: string;        // creator handle or URL
  ingredients: string[]; // canonical, lowercase, no quantities
  quantities?: string[]; // parallel to ingredients, e.g. "2 cloves"
  steps?: string[];
}

export interface Edge {
  a: number;             // index into recipes array
  b: number;
  shared: string[];      // shared ingredients
}

export const CUISINE_COLORS: Record<string, string> = {
  Italian: '#f2a65a',
  Mexican: '#e5636c',
  Asian: '#5ac8a8',
  Comfort: '#e8b84b',
  Healthy: '#6db2f2',
  Other: '#a78bfa',
};

export const THEME = {
  bg: '#16161e',
  surface: '#1f1f2b',
  surface2: '#282838',
  text: '#e8e8f0',
  muted: '#9a9ab0',
  accent: '#a78bfa',
  border: '#33334a',
};
