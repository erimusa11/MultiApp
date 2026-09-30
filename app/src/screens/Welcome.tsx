import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, IconTile } from '../components/UI';
import { Gradient, Waves } from '../components/Art';
import { IconName } from '../components/Icon';
import { Palette, radius, shadow, useStyles, useTheme } from '../theme';

const logo = require('../../assets/logo-mark.png');

const features: { icon: IconName; title: string; text: string }[] = [
  { icon: 'twin', title: 'Two accounts, one phone', text: 'A second WhatsApp, Instagram, Telegram and more — side by side.' },
  { icon: 'lock', title: 'Truly separate', text: 'Each clone has its own login, chats, files and notifications.' },
  { icon: 'wifiOff', title: 'Offline & private', text: 'No servers, no tracking. Built on Android’s own isolation.' },
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
  const { height } = useWindowDimensions();
  const { t } = useTheme();
  const s = useStyles(makeStyles);
  const float = useRef(new Animated.Value(0)).current;
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    Animated.timing(enter, { toValue: 1, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    return () => loop.stop();
  }, [float, enter]);

  const heroH = Math.min(380, height * 0.44) + insets.top;
  const rise = (i: number) => ({
    opacity: enter,
    transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [30 + i * 12, 0] }) }],
  });

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 28 }} bounces={false}>
        <View style={[s.hero, { height: heroH, paddingTop: insets.top }]}>
          <Gradient from={t.heroA} to={t.heroB} />
          <Waves opacity={0.16} />
          <Animated.View
            style={[
              s.logoTile,
              shadow(t, 2),
              { transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) }] },
            ]}>
            <Image source={logo} style={s.logo} resizeMode="contain" />
          </Animated.View>
          <Text style={s.brand}>MULTI-APP</Text>
          <Text style={s.by}>BY ERI</Text>
          <View style={s.curve} />
        </View>

        <View style={s.body}>
          <Animated.Text style={[s.title, rise(0)]}>Clone any app.{'\n'}Live two lives.</Animated.Text>

          <View style={s.features}>
            {features.map((f, i) => (
              <Animated.View key={f.title} style={[s.feature, rise(i + 1)]}>
                <IconTile name={f.icon} color={t.brand} bg={t.skySoft} />
                <View style={s.flex}>
                  <Text style={s.featureTitle}>{f.title}</Text>
                  <Text style={s.featureText}>{f.text}</Text>
                </View>
              </Animated.View>
            ))}
          </View>

          <Animated.View style={rise(4)}>
            <Button
              title={finishing ? 'Finishing setup…' : 'Create my Clone Space'}
              icon="sparkle"
              onPress={onCreate}
              loading={creating || finishing}
            />
            <Text style={s.note}>
              Android will show a short “work profile” setup — that’s your Clone Space. It takes about 30 seconds and
              happens only once.
            </Text>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (t: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: t.bg },
    flex: { flex: 1 },
    hero: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    logoTile: {
      width: 132,
      height: 132,
      borderRadius: 40,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 18,
    },
    logo: { width: 104, height: 104 },
    brand: { fontSize: 38, fontWeight: '900', color: '#FFFFFF', letterSpacing: 3 },
    by: { color: 'rgba(255,255,255,0.8)', letterSpacing: 7, fontSize: 12, fontWeight: '700', marginTop: 2 },
    curve: {
      position: 'absolute',
      bottom: -40,
      left: -40,
      right: -40,
      height: 80,
      borderRadius: 400,
      backgroundColor: t.bg,
    },
    body: { paddingHorizontal: 22, marginTop: 4 },
    title: { textAlign: 'center', fontSize: 26, lineHeight: 34, fontWeight: '800', color: t.ink, letterSpacing: -0.3 },
    features: { marginTop: 24, marginBottom: 26, gap: 10 },
    feature: {
      flexDirection: 'row',
      gap: 14,
      alignItems: 'center',
      backgroundColor: t.card,
      borderRadius: radius.md,
      padding: 14,
      borderWidth: 1,
      borderColor: t.line,
    },
    featureTitle: { fontSize: 15.5, fontWeight: '700', color: t.ink },
    featureText: { fontSize: 13.5, color: t.muted, marginTop: 2, lineHeight: 19 },
    note: { textAlign: 'center', color: t.muted, fontSize: 12.5, lineHeight: 18, marginTop: 14, paddingHorizontal: 8 },
  });
