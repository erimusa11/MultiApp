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
import { Gradient, Waves } from '../components/Art';
import { Icon } from '../components/Icon';
import { SpaceState } from '../native';
import { CloneMeta } from '../store';
import { Palette, radius, shadow, useStyles, useTheme } from '../theme';

const logo = require('../../assets/logo-mark.png');

export interface CloneView extends CloneMeta {
  icon?: string;
  originalLabel: string;
}

type Suggestion = { packageName: string; label: string; icon: string };

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export function Home({
  clones,
  state,
  refreshing,
  protectedMode,
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
  protectedMode: boolean;
  onRefresh: () => void;
  onOpen: (c: CloneView) => void;
  onManage: (c: CloneView) => void;
  onAdd: () => void;
  onQuickClone: (pkg: string) => void;
  onSettings: () => void;
  onResume: () => void;
  suggestions: Suggestion[];
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { t } = useTheme();
  const s = useStyles(makeStyles);
  const cols = width > 600 ? 5 : 3;
  const gap = 12;
  const tileW = (width - 40 - gap * (cols - 1)) / cols;
  const sleeping = clones.filter(c => c.sleeping).length;
  const paused = state === 'paused';
  const dotColor = paused ? '#FBBF24' : '#6EF0A8';

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <View>
          <Text style={s.hello}>{greeting()}</Text>
          <Text style={s.brand}>MULTI-APP</Text>
        </View>
        <View style={s.headerActions}>
          <Tap onPress={onSettings} style={[s.iconBtn, protectedMode && s.iconBtnOn]} accessibilityLabel="Security">
            <Icon name={protectedMode ? 'shieldCheck' : 'shield'} size={20} color={protectedMode ? t.success : t.ink} />
          </Tap>
          <Tap onPress={onSettings} style={s.iconBtn} accessibilityLabel="Settings">
            <Icon name="sliders" size={20} color={t.ink} />
          </Tap>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[s.scrollPad, { paddingBottom: insets.bottom + 120 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[t.sky]} />}>
        {/* Space card */}
        <View style={[s.hero, shadow(t, 2)]}>
          <Gradient from={t.heroA} to={t.heroB} />
          <Waves opacity={0.14} />
          <View style={s.heroTop}>
            <View style={[s.pill, paused && s.pillPaused]}>
              <View style={[s.dot, { backgroundColor: dotColor }]} />
              <Text style={s.pillText}>{paused ? 'Paused' : 'Clone Space active'}</Text>
            </View>
            <View style={s.heroLogo}>
              <Image source={logo} style={s.heroLogoImg} />
            </View>
          </View>
          <View style={s.countRow}>
            <Text style={s.count}>{clones.length}</Text>
            <View style={s.countLabel}>
              <Text style={s.countTitle}>{clones.length === 1 ? 'clone' : 'clones'}</Text>
              <Text style={s.countSub}>{sleeping ? `${sleeping} sleeping` : 'all awake'}</Text>
            </View>
          </View>
          <View style={s.heroActions}>
            {paused ? (
              <Tap onPress={onResume} style={s.heroBtn}>
                <Icon name="play" size={16} color="#0B5DA6" stroke={2.6} />
                <Text style={s.heroBtnText}>Resume clones</Text>
              </Tap>
            ) : (
              <Tap onPress={onAdd} style={s.heroBtn}>
                <Icon name="plus" size={16} color="#0B5DA6" stroke={2.8} />
                <Text style={s.heroBtnText}>New clone</Text>
              </Tap>
            )}
          </View>
        </View>

        {!protectedMode ? (
          <Tap onPress={onSettings} style={s.tip} scaleTo={0.98}>
            <View style={s.tipIcon}>
              <Icon name="lock" size={18} color={t.warn} />
            </View>
            <View style={s.flex}>
              <Text style={s.tipTitle}>Protect your clones</Text>
              <Text style={s.tipText}>Turn on App lock so only you can open Multi-App.</Text>
            </View>
            <Icon name="chevron" size={18} color={t.muted} />
          </Tap>
        ) : null}

        {clones.length === 0 ? (
          <EmptyState suggestions={suggestions} onPick={onQuickClone} />
        ) : (
          <>
            <View style={s.sectionRow}>
              <Text style={s.section}>Your clones</Text>
              <Text style={s.sectionHint}>Hold to customize</Text>
            </View>
            <View style={[s.grid, { gap }]}>
              {clones.map((c, i) => (
                <CloneTile key={c.packageName} clone={c} width={tileW} index={i} onOpen={onOpen} onManage={onManage} />
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <View style={[s.fabWrap, { bottom: insets.bottom + 20 }]} pointerEvents="box-none">
        <Tap onPress={onAdd} style={[s.fab, shadow(t, 2)]}>
          <Gradient from={t.heroA} to={t.heroB} angle="horizontal" />
          <Icon name="plus" size={20} color="#FFFFFF" stroke={2.8} />
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
  const s = useStyles(makeStyles);
  const appear = useRef(new Animated.Value(0)).current;
  const subDotColor = clone.sleeping ? '#9AA9BA' : clone.color;
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
      <Tap
        onPress={() => onOpen(clone)}
        onLongPress={() => onManage(clone)}
        style={s.tile}
        accessibilityLabel={`Open ${clone.name}. Long press for options`}>
        <View style={[s.tileGlow, { backgroundColor: clone.color }]} />
        <AppIcon uri={clone.icon} size={54} badgeColor={clone.color} sleeping={clone.sleeping} />
        <Text numberOfLines={1} style={[s.tileName, clone.sleeping && s.tileNameSleeping]}>
          {clone.name}
        </Text>
        <View style={s.tileSubRow}>
          <View style={[s.tileDot, { backgroundColor: subDotColor }]} />
          <Text numberOfLines={1} style={s.tileSub}>
            {clone.sleeping ? 'Sleeping' : clone.originalLabel}
          </Text>
        </View>
      </Tap>
    </Animated.View>
  );
}

function EmptyState({ suggestions, onPick }: { suggestions: Suggestion[]; onPick: (pkg: string) => void }) {
  const { t } = useTheme();
  const s = useStyles(makeStyles);
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const shift = pulse.interpolate({ inputRange: [0, 1], outputRange: [0, 14] });
  const first = suggestions[0];

  return (
    <View style={s.empty}>
      <View style={s.emptyArt}>
        <View style={[s.ghost, s.ghostBack]}>
          {first ? <Image source={{ uri: first.icon }} style={s.ghostIcon} /> : null}
        </View>
        <Animated.View style={[s.ghost, s.ghostFront, { transform: [{ translateX: shift }, { translateY: shift }] }]}>
          {first ? <Image source={{ uri: first.icon }} style={s.ghostIcon} /> : <Icon name="twin" size={30} color={t.sky} />}
        </Animated.View>
      </View>
      <Text style={s.emptyTitle}>No clones yet</Text>
      <Text style={s.emptyText}>Tap an app below, or “Clone an app”, and Multi-App creates a brand-new, separate copy.</Text>
      {suggestions.length ? (
        <View style={s.chips}>
          {suggestions.slice(0, 6).map(a => (
            <Tap key={a.packageName} onPress={() => onPick(a.packageName)} style={s.chip}>
              <Image source={{ uri: a.icon }} style={s.chipIcon} />
              <Text style={s.chipText}>{a.label}</Text>
              <Icon name="plus" size={14} color={t.brand} stroke={2.6} />
            </Tap>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (t: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: t.bg },
    flex: { flex: 1 },
    scrollPad: { paddingHorizontal: 20 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 16,
    },
    hello: { fontSize: 14, color: t.muted, fontWeight: '600' },
    brand: { fontSize: 26, fontWeight: '900', color: t.dark ? t.ink : t.brand, letterSpacing: 1.6, marginTop: 1 },
    headerActions: { flexDirection: 'row', gap: 10 },
    iconBtn: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: t.card,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: t.line,
    },
    iconBtnOn: { backgroundColor: t.successSoft, borderColor: 'transparent' },
    hero: { borderRadius: radius.lg, padding: 20, overflow: 'hidden', minHeight: 196 },
    heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      paddingHorizontal: 11,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.18)',
    },
    pillPaused: { backgroundColor: 'rgba(0,0,0,0.22)' },
    dot: { width: 8, height: 8, borderRadius: 4 },
    pillText: { color: '#FFFFFF', fontSize: 12.5, fontWeight: '700' },
    heroLogo: {
      width: 52,
      height: 52,
      borderRadius: 18,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroLogoImg: { width: 40, height: 40 },
    countRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 10 },
    count: { color: '#FFFFFF', fontSize: 60, fontWeight: '900', lineHeight: 66, letterSpacing: -2 },
    countLabel: { paddingBottom: 10 },
    countTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
    countSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13.5, fontWeight: '600' },
    heroActions: { flexDirection: 'row', marginTop: 12 },
    heroBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: '#FFFFFF',
      paddingHorizontal: 16,
      paddingVertical: 11,
      borderRadius: 14,
    },
    heroBtnText: { color: '#0B5DA6', fontWeight: '800', fontSize: 14.5 },
    tip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: t.warnSoft,
      borderRadius: radius.md,
      padding: 14,
      marginTop: 14,
    },
    tipIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: t.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tipTitle: { fontSize: 14.5, fontWeight: '800', color: t.ink },
    tipText: { fontSize: 12.5, color: t.inkSoft, marginTop: 1 },
    sectionRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      marginTop: 28,
      marginBottom: 14,
    },
    section: { fontSize: 18, fontWeight: '800', color: t.ink },
    sectionHint: { fontSize: 12.5, color: t.muted, fontWeight: '600' },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    tile: {
      backgroundColor: t.card,
      borderRadius: radius.md,
      alignItems: 'center',
      paddingTop: 20,
      paddingBottom: 14,
      paddingHorizontal: 8,
      borderWidth: 1,
      borderColor: t.line,
      overflow: 'hidden',
    },
    tileGlow: { position: 'absolute', top: -40, width: 90, height: 60, borderRadius: 45, opacity: t.dark ? 0.22 : 0.14 },
    tileName: { marginTop: 13, fontSize: 13.5, fontWeight: '800', color: t.ink },
    tileNameSleeping: { color: t.muted },
    tileSubRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3, maxWidth: '100%' },
    tileDot: { width: 6, height: 6, borderRadius: 3 },
    tileSub: { fontSize: 11.5, color: t.muted, flexShrink: 1 },
    empty: { alignItems: 'center', marginTop: 36, paddingHorizontal: 8 },
    emptyArt: { width: 120, height: 110, marginBottom: 18 },
    ghost: {
      position: 'absolute',
      width: 84,
      height: 84,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ghostBack: { backgroundColor: t.skySoft },
    ghostFront: {
      backgroundColor: t.card,
      borderWidth: 2,
      borderColor: t.sky,
      borderStyle: 'dashed',
      left: 10,
      top: 6,
    },
    ghostIcon: { width: 52, height: 52 },
    emptyTitle: { fontSize: 21, fontWeight: '800', color: t.ink },
    emptyText: { textAlign: 'center', color: t.muted, marginTop: 6, lineHeight: 20, fontSize: 14 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 20 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: t.card,
      borderRadius: 30,
      paddingLeft: 6,
      paddingRight: 12,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: t.line,
    },
    chipIcon: { width: 28, height: 28 },
    chipText: { fontWeight: '700', color: t.ink, fontSize: 13.5 },
    fabWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
    fab: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 28,
      height: 60,
      borderRadius: 30,
      overflow: 'hidden',
    },
    fabText: { color: '#FFFFFF', fontSize: 16.5, fontWeight: '800' },
  });
