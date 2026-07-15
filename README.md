# Recipe Box — mobile prototype

Obsidian-style recipe graph, native on iOS/Android via Expo. Recipes are nodes; shared ingredients are edges. Includes an LLM extraction flow: paste a TikTok/YouTube link → Claude pulls out structured ingredients → recipe joins the graph.

## Run it

Prerequisites: Node.js LTS, and the **Expo Go** app on your phone (App Store / Play Store).

```bash
cd recipe-box-app
npm install
npx expo install @shopify/react-native-skia react-native-gesture-handler @react-native-async-storage/async-storage
npx expo start
```

Scan the QR code with your phone (Camera app on iOS, Expo Go on Android). Phone and computer must be on the same Wi-Fi.

## Using the extraction flow

Tap **＋** → paste a TikTok or YouTube link (fetches the caption via oEmbed), or paste caption text directly (required for Instagram — their oEmbed needs an app token). Enter a Claude API key from console.anthropic.com; it's stored on-device only. Extracted recipes are saved locally (AsyncStorage) and appear as new nodes, auto-linked to anything sharing 2+ ingredients.

## Structure

- `App.tsx` — state, persistence, screen switching
- `src/GraphScreen.tsx` — Skia canvas, force-directed physics, pinch/pan/tap/drag gestures
- `src/RecipeSheet.tsx` — bottom sheet recipe card with linked-recipe hopping
- `src/AddRecipeScreen.tsx` — link/caption input + extraction preview
- `src/extract.ts` — oEmbed caption fetch + Claude API call
- `src/edges.ts`, `src/seed.ts`, `src/types.ts` — graph logic, sample data, theme

## Known prototype limitations / next steps

1. **Share sheet** ("share to Recipe Box" from TikTok) needs a dev build, not Expo Go: add `expo-share-intent`, then `npx expo run:ios` / `run:android`.
2. **API key on device** is fine for prototyping; production should proxy extraction through a small backend (e.g. Cloudflare Worker) holding the key.
3. **Instagram captions** require manual paste until you register a Meta app for oEmbed.
4. **Video-only recipes** (no caption text): add Whisper transcription of the audio track in the backend proxy.
5. Physics re-renders via React state ~60fps — fine under ~100 nodes; move to Reanimated shared values if the box gets big.
