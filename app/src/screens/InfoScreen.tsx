import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, BackHandler, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/UI';
import { Gradient, Waves } from '../components/Art';
import { Icon } from '../components/Icon';
import { Palette, shadow, useStyles, useTheme } from '../theme';

const logo = require('../../assets/logo-mark.png');

/** Full-screen message for special states (loading, unsupported, inside the Space…). */
export function InfoScreen({
  title,
  text,
  loading,
  actionTitle,
  onAction,
}: {
  title?: string;
  text?: string;
  loading?: boolean;
  actionTitle?: string;
  onAction?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { t } = useTheme();
  const s = useStyles(makeStyles);
  return (
    <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
      <View style={[s.logoTile, shadow(t, 2)]}>
        <Image source={logo} style={s.logo} resizeMode="contain" />
      </View>
      {loading ? <ActivityIndicator color={t.sky} size="large" style={s.spinner} /> : null}
      {title ? <Text style={s.title}>{title}</Text> : null}
      {text ? <Text style={s.text}>{text}</Text> : null}
      {actionTitle && onAction ? <Button title={actionTitle} onPress={onAction} style={s.action} /> : null}
    </View>
  );
}

export const InsideSpaceScreen = () => (
  <InfoScreen
    title="You’re inside your Clone Space"
    text="This copy of Multi-App manages the Space behind the scenes. Open Multi-App from your normal apps to manage your clones."
    actionTitle="Got it"
    onAction={() => BackHandler.exitApp()}
  />
);

/** Shown while App lock is on and the user hasn't authenticated yet. */
export function LockScreen({ onUnlock, busy }: { onUnlock: () => void; busy: boolean }) {
  const insets = useSafeAreaInsets();
  const { t } = useTheme();
  const s = useStyles(makeStyles);
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={[s.lockRoot, { paddingTop: insets.top, paddingBottom: insets.bottom + 28 }]}>
      <Gradient from={t.heroA} to={t.heroB} />
      <Waves opacity={0.14} />
      <View style={s.lockCenter}>
        <View style={s.lockStage}>
          <Animated.View
            style={[
              s.lockPulse,
              {
                opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
                transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] }) }],
              },
            ]}
          />
          <View style={s.lockTile}>
            <Image source={logo} style={s.lockLogo} resizeMode="contain" />
            <View style={s.lockBadge}>
              <Icon name="lock" size={16} color="#FFFFFF" stroke={2.6} />
            </View>
          </View>
        </View>
        <Text style={s.lockTitle}>Multi-App is locked</Text>
        <Text style={s.lockText}>Your clones are protected. Unlock with your fingerprint, face or PIN.</Text>
      </View>
      <Button title="Unlock" icon="lock" kind="white" onPress={onUnlock} loading={busy} style={s.lockBtn} />
    </View>
  );
}

const makeStyles = (t: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
    logoTile: {
      width: 128,
      height: 128,
      borderRadius: 38,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    logo: { width: 100, height: 100 },
    spinner: { marginTop: 24 },
    title: { fontSize: 22, fontWeight: '800', color: t.ink, textAlign: 'center', marginTop: 24 },
    text: { fontSize: 15, color: t.muted, textAlign: 'center', marginTop: 10, lineHeight: 22 },
    action: { marginTop: 28, alignSelf: 'stretch' },
    lockRoot: { flex: 1, paddingHorizontal: 28, overflow: 'hidden' },
    lockCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    lockStage: { width: 170, height: 170, alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
    lockPulse: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: '#FFFFFF' },
    lockTile: {
      width: 120,
      height: 120,
      borderRadius: 36,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    lockLogo: { width: 92, height: 92 },
    lockBadge: {
      position: 'absolute',
      right: -8,
      bottom: -8,
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: '#0B2540',
      borderWidth: 3,
      borderColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    lockTitle: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', letterSpacing: -0.3 },
    lockText: {
      color: 'rgba(255,255,255,0.85)',
      fontSize: 15,
      textAlign: 'center',
      marginTop: 8,
      lineHeight: 22,
      paddingHorizontal: 12,
    },
    lockBtn: { alignSelf: 'stretch' },
  });
