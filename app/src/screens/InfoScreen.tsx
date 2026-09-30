import React from 'react';
import { ActivityIndicator, BackHandler, Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/UI';
import { colors } from '../theme';

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
  return (
    <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
      <Image source={logo} style={s.logo} resizeMode="contain" />
      {loading ? <ActivityIndicator color={colors.sky} size="large" style={{ marginTop: 20 }} /> : null}
      {title ? <Text style={s.title}>{title}</Text> : null}
      {text ? <Text style={s.text}>{text}</Text> : null}
      {actionTitle && onAction ? (
        <Button title={actionTitle} onPress={onAction} style={{ marginTop: 28, alignSelf: 'stretch' }} />
      ) : null}
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

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  logo: { width: 150, height: 150 },
  title: { fontSize: 22, fontWeight: '800', color: colors.ink, textAlign: 'center', marginTop: 20 },
  text: { fontSize: 15, color: colors.muted, textAlign: 'center', marginTop: 10, lineHeight: 22 },
});
