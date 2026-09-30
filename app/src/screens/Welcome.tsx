import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/UI';
import { TwinGlyph } from '../components/Glyph';
import { colors, radius } from '../theme';

const logo = require('../../assets/logo-mark.png');

const features = [
  { title: 'Two accounts, one phone', text: 'Run a second WhatsApp, Instagram, Telegram and more — side by side.' },
  { title: 'Truly separate', text: 'Every clone has its own login, chats, storage and notifications.' },
  { title: 'Private by design', text: 'Built on Android’s own profile isolation. Nothing leaves your phone.' },
];

export function Welcome({
  onCreate,
  creating,
  finishing,
}: {
  onCreate: () => void;
  creating: boolean;
  finishing: boolean;
}) {
  const insets = useSafeAreaInsets();
  const float = useRef(new Animated.Value(0)).current;
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();
    Animated.timing(enter, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [float, enter]);

  const translateY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -12] });
  const rise = (i: number) => ({
    opacity: enter,
    transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [24 + i * 10, 0] }) }],
  });

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.glowA} />
      <View style={s.glowB} />
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 24 }]}>
        <Animated.View style={[s.hero, { transform: [{ translateY }] }]}>
          <Image source={logo} style={s.logo} resizeMode="contain" />
        </Animated.View>

        <Animated.View style={rise(0)}>
          <Text style={s.brand}>MULTI-APP</Text>
          <Text style={s.by}>BY ERI</Text>
          <Text style={s.title}>Clone any app.{'\n'}Live two lives.</Text>
        </Animated.View>

        <View style={s.features}>
          {features.map((f, i) => (
            <Animated.View key={f.title} style={[s.feature, rise(i + 1)]}>
              <View style={s.featureIcon}>
                <TwinGlyph size={20} color={colors.brand} fill={colors.skySoft} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.featureTitle}>{f.title}</Text>
                <Text style={s.featureText}>{f.text}</Text>
              </View>
            </Animated.View>
          ))}
        </View>

        <Animated.View style={rise(4)}>
          <Button
            title={finishing ? 'Finishing setup…' : 'Create my Clone Space'}
            onPress={onCreate}
            loading={creating || finishing}
          />
          <Text style={s.note}>
            Android will show a short “work profile” setup — that’s your Clone Space. It takes about 30 seconds and
            only happens once.
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, overflow: 'hidden' },
  glowA: {
    position: 'absolute',
    width: 420,
    height: 420,
    borderRadius: 420,
    backgroundColor: '#DDF2FD',
    top: -160,
    right: -140,
  },
  glowB: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 300,
    backgroundColor: '#E8F1FB',
    top: 200,
    left: -170,
  },
  content: { paddingHorizontal: 24, paddingTop: 24 },
  hero: { alignItems: 'center', marginTop: 12, marginBottom: 8 },
  logo: { width: 230, height: 230 },
  brand: {
    textAlign: 'center',
    fontSize: 40,
    fontWeight: '900',
    color: colors.brand,
    letterSpacing: 2,
  },
  by: { textAlign: 'center', color: colors.sky, letterSpacing: 6, fontSize: 12, fontWeight: '600', marginTop: 2 },
  title: {
    textAlign: 'center',
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '700',
    color: colors.ink,
    marginTop: 22,
  },
  features: { marginTop: 26, marginBottom: 28, gap: 12 },
  feature: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },
  featureIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.skySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: { fontSize: 15.5, fontWeight: '700', color: colors.ink },
  featureText: { fontSize: 13.5, color: colors.muted, marginTop: 2, lineHeight: 19 },
  note: { textAlign: 'center', color: colors.muted, fontSize: 12.5, lineHeight: 18, marginTop: 14, paddingHorizontal: 8 },
});
