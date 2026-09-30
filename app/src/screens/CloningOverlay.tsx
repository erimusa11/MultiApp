import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Modal, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, haptic } from '../components/UI';
import { Icon } from '../components/Icon';
import { Palette, useStyles, useTheme } from '../theme';

export type CloningState =
  | { phase: 'working'; label: string; icon: string; color: string }
  | { phase: 'done'; label: string; icon: string; color: string; name: string }
  | { phase: 'error'; label: string; icon: string; color: string; message: string };

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const RING = 150;
const STROKE = 5;
const CIRC = 2 * Math.PI * ((RING - STROKE) / 2);
const SPARKS = [
  { x: -92, y: -64, s: 18, d: 0 },
  { x: 96, y: -54, s: 14, d: 90 },
  { x: -80, y: 70, s: 12, d: 160 },
  { x: 90, y: 78, s: 20, d: 60 },
  { x: 4, y: -104, s: 12, d: 120 },
];

/**
 * Full-screen "duplication" moment: the original icon splits into a twin that
 * slides out while a progress ring fills, then sparkles on success.
 */
export function CloningOverlay({
  state,
  onOpen,
  onShortcut,
  onClose,
}: {
  state: CloningState | null;
  onOpen: () => void;
  onShortcut: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { t } = useTheme();
  const s = useStyles(makeStyles);
  const split = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const phase = state?.phase;
  const visible = !!state;

  useEffect(() => {
    if (!visible) {
      return;
    }
    [split, ring, pop, fade, spin].forEach(v => v.setValue(0));
    Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    Animated.timing(split, {
      toValue: 1,
      duration: 900,
      delay: 250,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start();
    // Ring eases toward 85% while Android works; completes on success.
    Animated.timing(ring, { toValue: 0.85, duration: 2600, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 2400, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [visible, split, ring, pop, fade, spin]);

  useEffect(() => {
    if (phase === 'done') {
      haptic('success');
      Animated.timing(ring, { toValue: 1, duration: 350, useNativeDriver: false }).start();
      Animated.spring(pop, { toValue: 1, useNativeDriver: true, bounciness: 14 }).start();
    } else if (phase === 'error') {
      haptic('warning');
      Animated.spring(pop, { toValue: 1, useNativeDriver: true }).start();
    }
  }, [phase, ring, pop]);

  if (!state) {
    return null;
  }

  const leftX = split.interpolate({ inputRange: [0, 1], outputRange: [0, -46] });
  const rightX = split.interpolate({ inputRange: [0, 1], outputRange: [0, 46] });
  const rightRot = split.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '8deg'] });
  const dash = ring.interpolate({ inputRange: [0, 1], outputRange: [CIRC, 0] });
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const accent = state.phase === 'error' ? t.danger : state.color;

  const title =
    state.phase === 'working'
      ? `Cloning ${state.label}…`
      : state.phase === 'done'
      ? `${state.name} is ready!`
      : 'Couldn’t clone this app';
  const text =
    state.phase === 'working'
      ? 'Creating a fresh, separate copy in your Clone Space. If Android asks, allow Multi-App and tap Install.'
      : state.phase === 'done'
      ? 'Open it and sign in with your other account.'
      : state.message;

  return (
    <Modal transparent visible statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[s.root, { opacity: fade, paddingBottom: insets.bottom + 24 }]}>
        <View style={s.stage}>
          <Animated.View style={[s.ringWrap, state.phase === 'working' && { transform: [{ rotate }] }]}>
            <Svg width={RING} height={RING}>
              <Circle
                cx={RING / 2}
                cy={RING / 2}
                r={(RING - STROKE) / 2}
                stroke={t.line}
                strokeWidth={STROKE}
                fill="none"
              />
              <AnimatedCircle
                cx={RING / 2}
                cy={RING / 2}
                r={(RING - STROKE) / 2}
                stroke={accent}
                strokeWidth={STROKE}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${CIRC} ${CIRC}`}
                strokeDashoffset={dash}
                transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
              />
            </Svg>
          </Animated.View>

          {state.phase === 'done'
            ? SPARKS.map((p, i) => (
                <Animated.View
                  key={i}
                  style={[
                    s.spark,
                    {
                      opacity: pop,
                      transform: [
                        { translateX: pop.interpolate({ inputRange: [0, 1], outputRange: [0, p.x] }) },
                        { translateY: pop.interpolate({ inputRange: [0, 1], outputRange: [0, p.y] }) },
                        { rotate: `${p.d}deg` },
                        { scale: pop },
                      ],
                    },
                  ]}>
                  <Icon name="sparkle" size={p.s} color={state.color} fill={state.color} stroke={1} />
                </Animated.View>
              ))
            : null}

          <Animated.View style={[s.iconWrap, { transform: [{ translateX: leftX }] }]}>
            <Image source={{ uri: state.icon }} style={s.icon} />
          </Animated.View>
          <Animated.View
            style={[s.iconWrap, s.clone, { borderColor: accent, transform: [{ translateX: rightX }, { rotate: rightRot }] }]}>
            <Image source={{ uri: state.icon }} style={s.icon} />
            <Animated.View style={[s.badge, { backgroundColor: accent, transform: [{ scale: pop }] }]}>
              <Icon name={state.phase === 'error' ? 'close' : 'check'} size={16} color="#FFFFFF" stroke={3.2} />
            </Animated.View>
          </Animated.View>
        </View>

        <Text style={s.title}>{title}</Text>
        <Text style={s.text}>{text}</Text>

        <View style={s.buttons}>
          {state.phase === 'done' ? (
            <>
              <Button title={`Open ${state.name}`} icon="open" onPress={onOpen} />
              <Button title="Add to home screen" icon="home" kind="soft" onPress={onShortcut} />
              <Button title="Done" kind="ghost" onPress={onClose} />
            </>
          ) : state.phase === 'error' ? (
            <Button title="Close" kind="soft" onPress={onClose} />
          ) : null}
        </View>
      </Animated.View>
    </Modal>
  );
}

const makeStyles = (t: Palette) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: t.dark ? 'rgba(6,16,28,0.98)' : 'rgba(243,248,253,0.98)',
      justifyContent: 'center',
      paddingHorizontal: 28,
    },
    stage: { height: 230, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    ringWrap: { position: 'absolute', width: RING, height: RING },
    spark: { position: 'absolute' },
    iconWrap: {
      position: 'absolute',
      width: 92,
      height: 92,
      borderRadius: 28,
      backgroundColor: t.card,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: t.shadow,
      shadowOpacity: 0.18,
      shadowRadius: 16,
      elevation: 8,
    },
    clone: { borderWidth: 2.5 },
    icon: { width: 64, height: 64 },
    badge: {
      position: 'absolute',
      right: -10,
      bottom: -10,
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 3,
      borderColor: t.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: { textAlign: 'center', fontSize: 25, fontWeight: '800', color: t.ink, letterSpacing: -0.3 },
    text: { textAlign: 'center', fontSize: 15, color: t.muted, marginTop: 8, lineHeight: 21 },
    buttons: { marginTop: 32, gap: 10 },
  });
