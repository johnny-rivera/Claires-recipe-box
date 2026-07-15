import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GraphScreen from './src/GraphScreen';
import RecipeSheet from './src/RecipeSheet';
import AddRecipeScreen from './src/AddRecipeScreen';
import { SEED_RECIPES } from './src/seed';
import { computeEdges } from './src/edges';
import { Recipe, THEME } from './src/types';

export default function App() {
  const [recipes, setRecipes] = useState<Recipe[]>(SEED_RECIPES);
  const [selected, setSelected] = useState(-1);
  const [adding, setAdding] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [loaded, setLoaded] = useState(false);

  // load persisted state
  useEffect(() => {
    (async () => {
      try {
        const [r, k] = await Promise.all([
          AsyncStorage.getItem('recipes'),
          AsyncStorage.getItem('apiKey'),
        ]);
        if (r) setRecipes(JSON.parse(r));
        if (k) setApiKey(k);
      } catch {}
      setLoaded(true);
    })();
  }, []);

  // persist on change
  useEffect(() => {
    if (loaded) AsyncStorage.setItem('recipes', JSON.stringify(recipes)).catch(() => {});
  }, [recipes, loaded]);
  useEffect(() => {
    if (loaded) AsyncStorage.setItem('apiKey', apiKey).catch(() => {});
  }, [apiKey, loaded]);

  const edges = useMemo(() => computeEdges(recipes), [recipes]);

  return (
    <GestureHandlerRootView style={styles.fill}>
      <StatusBar style="light" />
      {adding ? (
        <AddRecipeScreen
          apiKey={apiKey}
          onApiKey={setApiKey}
          onClose={() => setAdding(false)}
          onSave={r => {
            setRecipes(prev => [...prev, r]);
            setAdding(false);
            setSelected(recipes.length); // select the new node
          }}
        />
      ) : (
        <>
          <GraphScreen recipes={recipes} edges={edges} selected={selected} onSelect={setSelected} />
          <RecipeSheet recipes={recipes} edges={edges} selected={selected}
            onSelect={setSelected} onClose={() => setSelected(-1)} />
          {selected < 0 && (
            <TouchableOpacity style={styles.fab} onPress={() => setAdding(true)}>
              <Text style={styles.fabTxt}>＋</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: THEME.bg },
  fab: {
    position: 'absolute', right: 20, bottom: 36, width: 58, height: 58, borderRadius: 29,
    backgroundColor: THEME.accent, alignItems: 'center', justifyContent: 'center',
    shadowColor: THEME.accent, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  fabTxt: { color: THEME.bg, fontSize: 28, fontWeight: '700', marginTop: -2 },
});
