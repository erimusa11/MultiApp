import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon, Tap } from '../components/UI';
import { DotsGlyph, PlusGlyph, TwinGlyph } from '../components/Glyph';
import { SpaceState } from '../native';
import { CloneMeta } from '../store';
import { colors, radius, shadow } from '../theme';

const logo = require('../../assets/logo-mark.png');

export interface CloneView extends CloneMeta {
  icon?: string;
  originalLabel: string;
}

export function Home({
  clones,
  state,
  refreshing,
  onRefresh,
  onOpen,
  onManage,
  onAdd,
  onQuickClone,
  onSettings,
  onResume,
  suggestions,
}: {
  clones: CloneView[];
  state: SpaceState;
  refreshing: boolean;
  onRefresh: () => void;
  onOpen: (c: CloneView) => void;
  onManage: (c: CloneView) => void;
  onAdd: () => void;
  onQuickClone: (pkg: string) => void;
  onSettings: () => void;
  onResume: () => void;
  suggestions: { packageName: string; label: string; icon: string }[];
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cols = width > 600 ? 5 : 3;
  const gap = 12;
  const tileW = (width - 40 - gap * (cols - 1)) / cols;
  const sleeping = clones.filter(c => c.sleeping).length;
  const paused = state === 'paused';

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <View style={s.brandRow}>
          <Image source={logo} style={s.headerLogo} />
          <View>
            <Text style={s.brand}>MULTI-APP</Text>
            <Text style={s.by}>BY ERI</Text>
          </View>
        </View>
        <Tap onPress={onSettings} style={s.iconBtn}>
          <DotsGlyph size={18} color={colors.ink} />
        </Tap>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.sky]} />}>
        {/* Space card */}
        <View style={[s.spaceCard, shadow]}>
          <View style={s.waveA} />
          <View style={s.waveB} />
          <Image source={logo} style={s.cardLogo} />
          <View style={[s.pill, { backgroundColor: paused ? colors.warnSoft : 'rgba(255,255,255,0.18)' }]}>
            <View style={[s.dot, { backgroundColor: paused ? colors.warn : '#7CF3B0' }]} />
            <Text style={[s.pillText, paused && { color: '#9A5B00' }]}>{paused ? 'Paused' : 'Active'}</Text>
          </View>
          <Text style={s.cardTitle}>Your Clone Space</Text>
          <Text style={s.cardCount}>
            {clones.length} {clones.length === 1 ? 'clone' : 'clones'}
            {sleeping ? `  ·  ${sleeping} sleeping` : ''}
          </Text>
          {paused ? (
            <Tap onPress={onResume} style={s.resume}>
              <Text style={s.resumeText}>Resume clones</Text>
            </Tap>
          ) : null}
        </View>

        {clones.length === 0 ? (
          <EmptyState suggestions={suggestions} onPick={onQuickClone} />
        ) : (
          <>
            <Text style={s.section}>Your clones</Text>
            <View style={[s.grid, { gap }]}>
              {clones.map((c, i) => (
                <CloneTile key={c.packageName} clone={c} width={tileW} index={i} onOpen={onOpen} onManage={onManage} />
              ))}
            </View>
            <Text style={s.hint}>Tap to open · hold to customize</Text>
          </>
        )}
      </ScrollView>

      <View style={[s.fabWrap, { bottom: insets.bottom + 20 }]} pointerEvents="box-none">
        <Tap onPress={onAdd} style={[s.fab, shadow]}>
          <PlusGlyph size={18} />
          <Text style={s.fabText}>Clone an app</Text>
        </Tap>
      </View>
    </View>
  );
}

function CloneTile({
  clone,
  width,
  index,
  onOpen,
  onManage,
}: {
  clone: CloneView;
  width: number;
  index: number;
  onOpen: (c: CloneView) => void;
  onManage: (c: CloneView) => void;
}) {
  const appear = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(appear, { toValue: 1, delay: index * 45, useNativeDriver: true, bounciness: 9 }).start();
  }, [appear, index]);

  return (
    <Animated.View
      style={{
        width,
        opacity: appear,
        transform: [{ scale: appear.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
      }}>
      <Tap onPress={() => onOpen(clone)} onLongPress={() => onManage(clone)} style={s.tile}>
        <View style={[s.tileAccent, { backgroundColor: clone.color }]} />
        <AppIcon uri={clone.icon} size={54} badgeColor={clone.color} sleeping={clone.sleeping} />
        <Text numberOfLines={1} style={[s.tileName, clone.sleeping && { color: colors.muted }]}>
          {clone.name}
        </Text>
        <Text numberOfLines={1} style={s.tileSub}>
          {clone.sleeping ? 'Sleeping' : clone.originalLabel}
        </Text>
      </Tap>
    </Animated.View>
  );
}

function EmptyState({
  suggestions,
  onPick,
}: {
  suggestions: { packageName: string; label: string; icon: string }[];
  onPick: (pkg: string) => void;
}) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ]),
    ).start();
  }, [pulse]);
  const shift = pulse.interpolate({ inputRange: [0, 1], outputRange: [0, 14] });
  const first = suggestions[0];

  return (
    <View style={s.empty}>
      <View style={s.emptyArt}>
        <View style={[s.ghost, { backgroundColor: colors.skySoft }]}>
          {first ? <Image source={{ uri: first.icon }} style={s.ghostIcon} /> : null}
        </View>
        <Animated.View style={[s.ghost, s.ghostFront, { transform: [{ translateX: shift }, { translateY: shift }] }]}>
          {first ? <Image source={{ uri: first.icon }} style={s.ghostIcon} /> : <TwinGlyph size={28} color={colors.sky} />}
        </Animated.View>
      </View>
      <Text style={s.emptyTitle}>No clones yet</Text>
      <Text style={s.emptyText}>Pick an app and Multi-App will create a brand-new, separate copy of it.</Text>
      {suggestions.length ? (
        <View style={s.chips}>
          {suggestions.slice(0, 4).map(a => (
            <Tap key={a.packageName} onPress={() => onPick(a.packageName)} style={s.chip}>
              <Image source={{ uri: a.icon }} style={s.chipIcon} />
              <Text style={s.chipText}>{a.label}</Text>
            </Tap>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerLogo: { width: 42, height: 42 },
  brand: { fontSize: 21, fontWeight: '900', color: colors.brand, letterSpacing: 1.2 },
  by: { fontSize: 9, color: colors.sky, letterSpacing: 4, fontWeight: '700', marginTop: -2 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  spaceCard: {
    backgroundColor: colors.brandDeep,
    borderRadius: radius.lg,
    padding: 22,
    overflow: 'hidden',
    marginTop: 4,
    minHeight: 150,
  },
  waveA: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 260,
    backgroundColor: colors.sky,
    opacity: 0.35,
    right: -90,
    top: -110,
  },
  waveB: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 200,
    backgroundColor: '#5FD0FA',
    opacity: 0.22,
    right: 30,
    bottom: -130,
  },
  cardLogo: { position: 'absolute', right: 14, top: 26, width: 110, height: 110, opacity: 0.95, tintColor: '#FFFFFF' },
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  dot: { width: 7, height: 7, borderRadius: 7 },
  pillText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  cardTitle: { color: colors.white, fontSize: 22, fontWeight: '800', marginTop: 16 },
  cardCount: { color: 'rgba(255,255,255,0.85)', fontSize: 14.5, marginTop: 4, fontWeight: '500' },
  resume: {
    marginTop: 14,
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  resumeText: { color: colors.brandDeep, fontWeight: '800' },
  section: { fontSize: 17, fontWeight: '800', color: colors.ink, marginTop: 28, marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  tile: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    alignItems: 'center',
    paddingTop: 18,
    paddingBottom: 14,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  tileAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 4 },
  tileName: { marginTop: 12, fontSize: 13.5, fontWeight: '700', color: colors.ink },
  tileSub: { fontSize: 11.5, color: colors.muted, marginTop: 2 },
  hint: { textAlign: 'center', color: colors.muted, fontSize: 12.5, marginTop: 20 },
  empty: { alignItems: 'center', marginTop: 40, paddingHorizontal: 12 },
  emptyArt: { width: 120, height: 110, marginBottom: 18 },
  ghost: {
    position: 'absolute',
    width: 84,
    height: 84,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostFront: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.sky,
    borderStyle: 'dashed',
    left: 10,
    top: 6,
  },
  ghostIcon: { width: 52, height: 52 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.ink },
  emptyText: { textAlign: 'center', color: colors.muted, marginTop: 6, lineHeight: 20, fontSize: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 20 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: 30,
    paddingLeft: 6,
    paddingRight: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipIcon: { width: 26, height: 26 },
  chipText: { fontWeight: '600', color: colors.ink, fontSize: 13.5 },
  fabWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.brandDeep,
    paddingHorizontal: 26,
    height: 58,
    borderRadius: 30,
  },
  fabText: { color: colors.white, fontSize: 16, fontWeight: '800' },
});
