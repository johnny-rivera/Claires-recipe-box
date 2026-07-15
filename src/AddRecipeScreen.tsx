import React, { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { CUISINE_COLORS, Recipe, THEME } from './types';
import { extractRecipe, fetchCaption } from './extract';

interface Props {
  apiKey: string;
  onApiKey: (k: string) => void;
  onSave: (r: Recipe) => void;
  onClose: () => void;
}

export default function AddRecipeScreen({ apiKey, onApiKey, onSave, onClose }: Props) {
  const [url, setUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<Recipe | null>(null);

  const run = async () => {
    setError(''); setPreview(null); setBusy(true);
    try {
      let text = caption.trim();
      if (!text && url.trim()) {
        const fetched = await fetchCaption(url.trim());
        if (fetched) { text = fetched; setCaption(fetched); }
      }
      if (!text) throw new Error('Paste a TikTok/YouTube link, or paste the caption text directly (Instagram needs manual paste).');
      if (!apiKey.trim()) throw new Error('Enter your Claude API key first (get one at console.anthropic.com).');
      const source = url.trim() || 'pasted text';
      setPreview(await extractRecipe(text, apiKey.trim(), source));
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.row}>
          <Text style={styles.h1}>＋ Add recipe</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.close}>✕</Text></TouchableOpacity>
        </View>

        <Text style={styles.label}>POST LINK (TIKTOK / YOUTUBE)</Text>
        <TextInput style={styles.input} value={url} onChangeText={setUrl}
          placeholder="https://www.tiktok.com/@…" placeholderTextColor={THEME.muted}
          autoCapitalize="none" autoCorrect={false} />

        <Text style={styles.label}>OR PASTE THE CAPTION</Text>
        <TextInput style={[styles.input, styles.multi]} value={caption} onChangeText={setCaption}
          placeholder="Paste the recipe text from the post…" placeholderTextColor={THEME.muted}
          multiline />

        <Text style={styles.label}>CLAUDE API KEY (STORED ON DEVICE)</Text>
        <TextInput style={styles.input} value={apiKey} onChangeText={onApiKey}
          placeholder="sk-ant-…" placeholderTextColor={THEME.muted}
          autoCapitalize="none" autoCorrect={false} secureTextEntry />

        <TouchableOpacity style={styles.btn} onPress={run} disabled={busy}>
          {busy ? <ActivityIndicator color={THEME.bg} />
                : <Text style={styles.btnTxt}>Extract ingredients</Text>}
        </TouchableOpacity>

        {!!error && <Text style={styles.err}>{error}</Text>}

        {preview && (
          <View style={styles.card}>
            <Text style={styles.name}>{preview.name}</Text>
            <View style={[styles.tag, { backgroundColor: (CUISINE_COLORS[preview.cuisine] ?? CUISINE_COLORS.Other) + '33' }]}>
              <Text style={{ color: CUISINE_COLORS[preview.cuisine] ?? CUISINE_COLORS.Other, fontSize: 11, fontWeight: '700' }}>
                {preview.cuisine.toUpperCase()}
              </Text>
            </View>
            {preview.ingredients.map((x, k) => (
              <Text key={k} style={styles.ing}>
                • {preview.quantities?.[k] ? preview.quantities[k] + ' ' : ''}{x}
              </Text>
            ))}
            <TouchableOpacity style={styles.btn} onPress={() => onSave(preview)}>
              <Text style={styles.btnTxt}>Save to recipe box</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: THEME.bg },
  body: { padding: 20, paddingTop: 64 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  h1: { color: THEME.text, fontSize: 22, fontWeight: '700' },
  close: { color: THEME.muted, fontSize: 22, padding: 4 },
  label: { color: THEME.muted, fontSize: 11, letterSpacing: 1, marginTop: 18, marginBottom: 6 },
  input: {
    backgroundColor: THEME.surface, borderWidth: 1, borderColor: THEME.border,
    borderRadius: 12, padding: 14, color: THEME.text, fontSize: 15,
  },
  multi: { minHeight: 110, textAlignVertical: 'top' },
  btn: {
    marginTop: 22, backgroundColor: THEME.accent, borderRadius: 14,
    padding: 15, alignItems: 'center',
  },
  btnTxt: { color: THEME.bg, fontSize: 15, fontWeight: '700' },
  err: { color: '#e5636c', marginTop: 14, fontSize: 13, lineHeight: 18 },
  card: {
    marginTop: 24, backgroundColor: THEME.surface, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: THEME.border,
  },
  name: { color: THEME.text, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  tag: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginBottom: 10 },
  ing: { color: THEME.text, fontSize: 14, paddingVertical: 3 },
});
