import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CUISINE_COLORS, Edge, Recipe, THEME } from './types';
import { neighborsOf } from './edges';

interface Props {
  recipes: Recipe[];
  edges: Edge[];
  selected: number;
  onSelect: (i: number) => void;
  onClose: () => void;
}

export default function RecipeSheet({ recipes, edges, selected, onSelect, onClose }: Props) {
  if (selected < 0) return null;
  const r = recipes[selected];
  const col = CUISINE_COLORS[r.cuisine] ?? CUISINE_COLORS.Other;
  const nbrs = neighborsOf(selected, edges);

  return (
    <View style={styles.sheet}>
      <TouchableOpacity onPress={onClose}>
        <View style={styles.grab} />
      </TouchableOpacity>
      <ScrollView>
        <Text style={styles.name}>{r.name}</Text>
        <View style={styles.meta}>
          <View style={[styles.tag, { backgroundColor: col + '33' }]}>
            <Text style={[styles.tagTxt, { color: col }]}>{r.cuisine.toUpperCase()}</Text>
          </View>
          <Text style={styles.src}>saved from {r.source}</Text>
        </View>

        <Text style={styles.h3}>INGREDIENTS</Text>
        {r.ingredients.map((x, k) => {
          const also = nbrs.filter(j => recipes[j].ingredients.includes(x)).length;
          return (
            <View key={x} style={styles.ing}>
              <Text style={styles.ingTxt}>
                {r.quantities?.[k] ? r.quantities[k] + ' ' : ''}
                {x[0].toUpperCase() + x.slice(1)}
              </Text>
              {also > 0 && (
                <Text style={styles.ingNote}>in {also} linked recipe{also > 1 ? 's' : ''}</Text>
              )}
            </View>
          );
        })}

        <Text style={styles.h3}>CONNECTED RECIPES</Text>
        <View style={styles.links}>
          {nbrs.length === 0 && <Text style={styles.src}>No connections yet</Text>}
          {nbrs.map(j => {
            const e = edges.find(e => (e.a === selected && e.b === j) || (e.a === j && e.b === selected))!;
            return (
              <TouchableOpacity key={recipes[j].id} style={styles.linkChip} onPress={() => onSelect(j)}>
                <Text style={styles.linkTxt}>
                  {recipes[j].name} <Text style={{ color: THEME.accent }}>·{e.shared.length}</Text>
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '55%',
    backgroundColor: THEME.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 32,
    shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20, elevation: 20,
  },
  grab: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#44445c', alignSelf: 'center', marginBottom: 14 },
  name: { color: THEME.text, fontSize: 20, fontWeight: '700' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, marginBottom: 6, flexWrap: 'wrap' },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  tagTxt: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  src: { color: THEME.muted, fontSize: 13 },
  h3: { color: THEME.muted, fontSize: 12, letterSpacing: 1, marginTop: 16, marginBottom: 8 },
  ing: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9,
    borderBottomWidth: 1, borderBottomColor: '#2c2c3e',
  },
  ingTxt: { color: THEME.text, fontSize: 15 },
  ingNote: { color: THEME.muted, fontSize: 13 },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  linkChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: THEME.surface2, borderWidth: 1, borderColor: THEME.border,
  },
  linkTxt: { color: THEME.text, fontSize: 13 },
});
