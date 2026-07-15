import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Platform, ScrollView, StyleSheet, Text as RNText, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Canvas, Circle, Line, Text as SkText, matchFont, vec } from '@shopify/react-native-skia';
import { CUISINE_COLORS, Edge, Recipe, THEME } from './types';
import { neighborsOf } from './edges';

const { width: W, height: H } = Dimensions.get('window');

interface Node { x: number; y: number; vx: number; vy: number; fx: number; fy: number; }
interface Cam { x: number; y: number; s: number; }

const labelFont = matchFont({
  fontFamily: Platform.select({ ios: 'Helvetica', default: 'sans-serif' }),
  fontSize: 11,
});

interface Props {
  recipes: Recipe[];
  edges: Edge[];
  selected: number;           // -1 = none
  onSelect: (i: number) => void;
}

export default function GraphScreen({ recipes, edges, selected, onSelect }: Props) {
  const nodesRef = useRef<Node[]>([]);
  const camRef = useRef<Cam>({ x: 0, y: 0, s: 1 });
  const dragRef = useRef<number>(-1);          // node index being dragged
  const pinchRef = useRef<{ s: number; x: number; y: number } | null>(null);
  const [, setTick] = useState(0);
  const [filter, setFilter] = useState<string>('All');

  // (re)create nodes when recipe count changes, keeping existing positions
  if (nodesRef.current.length !== recipes.length) {
    const old = nodesRef.current;
    nodesRef.current = recipes.map((_, i) =>
      old[i] ?? {
        x: W / 2 + (Math.random() - 0.5) * 260,
        y: H / 2 + (Math.random() - 0.5) * 260,
        vx: 0, vy: 0, fx: 0, fy: 0,
      });
  }

  // physics + render loop
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const nodes = nodesRef.current;
      const cx = W / 2, cy = H / 2;
      for (const n of nodes) { n.fx = (cx - n.x) * 0.0025; n.fy = (cy - n.y) * 0.0025; }
      for (let a = 0; a < nodes.length; a++) {
        for (let b = a + 1; b < nodes.length; b++) {
          const A = nodes[a], B = nodes[b];
          let dx = B.x - A.x, dy = B.y - A.y;
          const d2 = dx * dx + dy * dy || 1, d = Math.sqrt(d2);
          const rep = 5200 / d2;
          dx /= d; dy /= d;
          A.fx -= dx * rep; A.fy -= dy * rep;
          B.fx += dx * rep; B.fy += dy * rep;
        }
      }
      for (const e of edges) {
        const A = nodes[e.a], B = nodes[e.b];
        if (!A || !B) continue;
        const dx = B.x - A.x, dy = B.y - A.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const want = 150 - e.shared.length * 8;
        const f = ((d - want) * 0.018) / d;
        A.fx += dx * f; A.fy += dy * f;
        B.fx -= dx * f; B.fy -= dy * f;
      }
      nodes.forEach((n, i) => {
        if (i === dragRef.current) return;
        n.vx = (n.vx + n.fx) * 0.86;
        n.vy = (n.vy + n.fy) * 0.86;
        n.x += n.vx; n.y += n.vy;
      });
      setTick(t => t + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [edges]);

  const toWorld = (sx: number, sy: number) => {
    const c = camRef.current;
    return { x: (sx - c.x) / c.s, y: (sy - c.y) / c.s };
  };
  const nodeAt = (sx: number, sy: number): number => {
    const w = toWorld(sx, sy);
    return nodesRef.current.findIndex(n => (n.x - w.x) ** 2 + (n.y - w.y) ** 2 < 40 ** 2);
  };

  // gestures (runOnJS: no reanimated dependency needed)
  const pan = Gesture.Pan().runOnJS(true).maxPointers(1)
    .onStart(e => { dragRef.current = nodeAt(e.x, e.y); })
    .onUpdate(e => {
      if (dragRef.current >= 0) {
        const n = nodesRef.current[dragRef.current];
        const w = toWorld(e.x, e.y);
        n.x = w.x; n.y = w.y; n.vx = n.vy = 0;
      } else {
        camRef.current.x += e.changeX;
        camRef.current.y += e.changeY;
      }
    })
    .onEnd(() => { dragRef.current = -1; });

  const pinch = Gesture.Pinch().runOnJS(true)
    .onStart(e => { pinchRef.current = { s: camRef.current.s, x: e.focalX, y: e.focalY }; })
    .onUpdate(e => {
      const p = pinchRef.current; if (!p) return;
      const c = camRef.current;
      const s = Math.min(3, Math.max(0.35, p.s * e.scale));
      c.x = p.x - ((p.x - c.x) * s) / c.s;
      c.y = p.y - ((p.y - c.y) * s) / c.s;
      c.s = s;
    })
    .onEnd(() => { pinchRef.current = null; });

  const tap = Gesture.Tap().runOnJS(true).maxDistance(8)
    .onEnd(e => {
      const i = nodeAt(e.x, e.y);
      if (i >= 0) {
        onSelect(i);
        // center tapped node in upper third (above the sheet)
        const c = camRef.current, n = nodesRef.current[i];
        c.x += W / 2 - (n.x * c.s + c.x);
        c.y += H * 0.3 - (n.y * c.s + c.y);
      } else onSelect(-1);
    });

  const gesture = Gesture.Simultaneous(pinch, Gesture.Race(tap, pan));

  const dimmed = (i: number): boolean => {
    if (filter !== 'All' && recipes[i].cuisine !== filter) return true;
    if (selected >= 0 && i !== selected && !neighborsOf(selected, edges).includes(i)) return true;
    return false;
  };

  const cam = camRef.current;
  const sx = (n: Node) => n.x * cam.s + cam.x;
  const sy = (n: Node) => n.y * cam.s + cam.y;
  const cuisines = useMemo(
    () => ['All', ...Array.from(new Set(recipes.map(r => r.cuisine)))], [recipes]);

  return (
    <View style={styles.fill}>
      <GestureDetector gesture={gesture}>
        <Canvas style={styles.fill}>
          {edges.map((e, k) => {
            const A = nodesRef.current[e.a], B = nodesRef.current[e.b];
            if (!A || !B) return null;
            const dim = dimmed(e.a) || dimmed(e.b);
            const hot = selected >= 0 && (e.a === selected || e.b === selected) && !dim;
            return (
              <Line key={k}
                p1={vec(sx(A), sy(A))} p2={vec(sx(B), sy(B))}
                color={hot ? 'rgba(167,139,250,0.85)' : `rgba(122,122,160,${dim ? 0.06 : 0.2})`}
                strokeWidth={(hot ? 2.2 : 0.8 + e.shared.length * 0.5) * cam.s}
              />
            );
          })}
          {nodesRef.current.map((n, i) => {
            const r = recipes[i];
            if (!r) return null;
            const dim = dimmed(i), sel = i === selected;
            const col = CUISINE_COLORS[r.cuisine] ?? CUISINE_COLORS.Other;
            const rad = 26 * (sel ? 1.25 : 1) * cam.s;
            const op = dim ? 0.18 : 1;
            const tw = labelFont ? labelFont.measureText(r.name).width : r.name.length * 5.5;
            return (
              <React.Fragment key={r.id}>
                <Circle cx={sx(n)} cy={sy(n)} r={rad} color={col} opacity={op} />
                <Circle cx={sx(n)} cy={sy(n)} r={Math.max(1, rad - 4 * cam.s)} color={THEME.bg} opacity={op} />
                <Circle cx={sx(n)} cy={sy(n)} r={Math.max(1, rad - 7 * cam.s)} color={col} opacity={op * 0.25} />
                <SkText x={sx(n) - tw / 2} y={sy(n) + rad + 15} text={r.name}
                  font={labelFont} color={THEME.text} opacity={dim ? 0.25 : 1} />
              </React.Fragment>
            );
          })}
        </Canvas>
      </GestureDetector>

      {/* header */}
      <View style={styles.header} pointerEvents="none">
        <RNText style={styles.h1}>🍳 Recipe Box</RNText>
        <RNText style={styles.sub}>Your saved recipes, connected by ingredients</RNText>
      </View>

      {/* filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={styles.chips} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
        {cuisines.map(c => (
          <TouchableOpacity key={c}
            style={[styles.chip, filter === c && styles.chipOn]}
            onPress={() => { setFilter(c); onSelect(-1); }}>
            {c !== 'All' && (
              <View style={[styles.dot, { backgroundColor: CUISINE_COLORS[c] ?? CUISINE_COLORS.Other }]} />
            )}
            <RNText style={[styles.chipTxt, filter === c && styles.chipTxtOn]}>{c}</RNText>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: THEME.bg },
  header: { position: 'absolute', top: 54, left: 16, right: 16 },
  h1: { color: THEME.text, fontSize: 17, fontWeight: '700' },
  sub: { color: THEME.muted, fontSize: 12, marginTop: 2 },
  chips: { position: 'absolute', top: 100, left: 0, right: 0, maxHeight: 44 },
  chip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 999, backgroundColor: THEME.surface, borderWidth: 1, borderColor: THEME.border,
  },
  chipOn: { backgroundColor: THEME.accent, borderColor: THEME.accent },
  chipTxt: { color: THEME.muted, fontSize: 13, fontWeight: '600' },
  chipTxtOn: { color: THEME.bg },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
});
