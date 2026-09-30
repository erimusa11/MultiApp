import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Modal, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/UI';
import { CheckGlyph, TwinGlyph } from '../components/Glyph';
import { colors } from '../theme';

export type CloningState =
  | { phase: 'working'; label: string; icon: string; color: string }
  | { phase: 'done'; label: string; icon: string; color: string; name: string }
  | { phase: 'error'; label: string; icon: string; color: string; message: string };

/**
 * Full-screen "duplication" moment: the original icon splits into a twin that
 * slides out and gets its colored clone badge.
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
  const split = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const badge = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const phase = state?.phase;
  const visible = !!state;

  useEffect(() => {
    if (!visible) {
      return;
    }
    split.setValue(0);
    badge.setValue(0);
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    const loop = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 1300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    );
    loop.start();
    Animated.timing(split, {
      toValue: 1,
      duration: 900,
      delay: 250,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start();
    return () => loop.stop();
  }, [visible, split, pulse, badge, fade]);

  useEffect(() => {
    if (phase === 'done') {
      Animated.spring(badge, { toValue: 1, useNativeDriver: true, bounciness: 14 }).start();
    }
  }, [phase, badge]);

  if (!state) {
    return null;
  }

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.9] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });
  const leftX = split.interpolate({ inputRange: [0, 1], outputRange: [0, -58] });
  const rightX = split.interpolate({ inputRange: [0, 1], outputRange: [0, 58] });
  const rightRot = split.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '8deg'] });

  const title =
    state.phase === 'working'
      ? `Cloning ${state.label}…`
      : state.phase === 'done'
      ? `${state.name} is ready!`
      : 'Couldn’t clone this app';
  const text =
    state.phase === 'working'
      ? 'Creating a fresh, separate copy in your Clone Space.'
      : state.phase === 'done'
      ? 'Open it and sign in with your other account.'
      : state.message;

  return (
    <Modal transparent visible statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[o.root, { opacity: fade, paddingBottom: insets.bottom + 24 }]}>
        <View style={o.stage}>
          {state.phase === 'working' ? (
            <Animated.View
              style={[o.ring, { borderColor: state.color, opacity: ringOpacity, transform: [{ scale: ringScale }] }]}
            />
          ) : null}
          <Animated.View style={[o.iconWrap, { transform: [{ translateX: leftX }] }]}>
            <Image source={{ uri: state.icon }} style={o.icon} />
          </Animated.View>
          <Animated.View
            style={[
              o.iconWrap,
              o.clone,
              { borderColor: state.color, transform: [{ translateX: rightX }, { rotate: rightRot }] },
            ]}>
            <Image source={{ uri: state.icon }} style={o.icon} />
            <Animated.View
              style={[
                o.badge,
                { backgroundColor: state.phase === 'error' ? colors.danger : state.color, transform: [{ scale: badge }] },
              ]}>
              {state.phase === 'done' ? <CheckGlyph size={16} /> : <TwinGlyph size={16} fill={state.color} />}
            </Animated.View>
          </Animated.View>
        </View>

        <Text style={o.title}>{title}</Text>
        <Text style={o.text}>{text}</Text>

        <View style={o.buttons}>
          {state.phase === 'done' ? (
            <>
              <Button title={`Open ${state.name}`} onPress={onOpen} />
              <Button title="Add to home screen" kind="soft" onPress={onShortcut} />
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

const o = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'rgba(244,250,255,0.98)', justifyContent: 'center', paddingHorizontal: 28 },
  stage: { height: 200, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  ring: { position: 'absolute', width: 130, height: 130, borderRadius: 65, borderWidth: 3 },
  iconWrap: {
    position: 'absolute',
    width: 104,
    height: 104,
    borderRadius: 30,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0B4A7A',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  clone: { borderWidth: 2.5 },
  icon: { width: 72, height: 72 },
  badge: {
    position: 'absolute',
    right: -10,
    bottom: -10,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { textAlign: 'center', fontSize: 24, fontWeight: '800', color: colors.ink },
  text: { textAlign: 'center', fontSize: 15, color: colors.muted, marginTop: 8, lineHeight: 21 },
  buttons: { marginTop: 32, gap: 10 },
});
