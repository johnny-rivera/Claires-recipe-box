import { Edge, Recipe } from './types';

/** Recipes sharing >= 2 ingredients get an edge. */
export function computeEdges(recipes: Recipe[]): Edge[] {
  const edges: Edge[] = [];
  for (let a = 0; a < recipes.length; a++) {
    for (let b = a + 1; b < recipes.length; b++) {
      const shared = recipes[a].ingredients.filter(x => recipes[b].ingredients.includes(x));
      if (shared.length >= 2) edges.push({ a, b, shared });
    }
  }
  return edges;
}

export function neighborsOf(i: number, edges: Edge[]): number[] {
  return edges.filter(e => e.a === i || e.b === i).map(e => (e.a === i ? e.b : e.a));
}
