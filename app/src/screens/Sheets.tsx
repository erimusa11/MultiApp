import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppIcon, Button, IconTile, Sheet, Switch, Tap } from '../components/UI';
import { Icon, IconName } from '../components/Icon';
import { InstalledApp, SecurityInfo, SpaceStatus } from '../native';
import { Settings } from '../store';
import { cloneColors, Palette, popularPackages, radius, ThemePref, useStyles, useTheme } from '../theme';
import type { CloneView } from './Home';

// ================= App picker =================

type Row = { type: 'header'; title: string } | { type: 'app'; app: InstalledApp };

export function AppPickerSheet({
  visible,
  onClose,
  apps,
  loading,
  cloned,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  apps: InstalledApp[];
  loading: boolean;
  cloned: Set<string>;
  onPick: (app: InstalledApp) => void;
}) {
  const { t } = useTheme();
  const s = useStyles(makeStyles);
  const [query, setQuery] = useState('');
  useEffect(() => {
    if (!visible) {
      setQuery('');
    }
  }, [visible]);

  const rows = useMemo<Row[]>(() => {
    const q = query.trim().toLowerCase();
    const match = (a: InstalledApp) =>
      !q || a.label.toLowerCase().includes(q) || a.packageName.toLowerCase().includes(q);
    const filtered = apps.filter(match);
    if (q) {
      return filtered.map(app => ({ type: 'app' as const, app }));
    }
    const popular = popularPackages
      .map(p => filtered.find(a => a.packageName === p))
      .filter((a): a is InstalledApp => !!a);
    const popularSet = new Set(popular.map(a => a.packageName));
    const rest = filtered.filter(a => !popularSet.has(a.packageName));
    const out: Row[] = [];
    if (popular.length) {
      out.push({ type: 'header', title: 'Popular to clone' });
      popular.forEach(app => out.push({ type: 'app', app }));
    }
    out.push({ type: 'header', title: `All apps · ${rest.length}` });
    rest.forEach(app => out.push({ type: 'app', app }));
    return out;
  }, [apps, query]);

  return (
    <Sheet visible={visible} onClose={onClose} fullHeight>
      <View style={s.head}>
        <View>
          <Text style={s.title}>Clone an app</Text>
          <Text style={s.subtitle}>Pick the app you want a second account of</Text>
        </View>
        <Tap onPress={onClose} style={s.close} accessibilityLabel="Close">
          <Icon name="close" size={18} color={t.inkSoft} />
        </Tap>
      </View>
      <View style={s.search}>
        <Icon name="search" size={19} color={t.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search apps"
          placeholderTextColor={t.muted}
          style={s.input}
          autoCorrect={false}
          maxLength={60}
        />
        {query ? (
          <Tap onPress={() => setQuery('')} accessibilityLabel="Clear search">
            <Icon name="close" size={16} color={t.muted} />
          </Tap>
        ) : null}
      </View>
      {loading ? (
        <View style={s.loading}>
          <ActivityIndicator color={t.sky} size="large" />
          <Text style={s.loadingText}>Finding your apps…</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(r, i) => (r.type === 'app' ? r.app.packageName : `h${i}`)}
          contentContainerStyle={s.list}
          initialNumToRender={14}
          renderItem={({ item }) =>
            item.type === 'header' ? (
              <Text style={s.section}>{item.title}</Text>
            ) : (
              <AppRow app={item.app} done={cloned.has(item.app.packageName)} onPick={onPick} />
            )
          }
          ListEmptyComponent={<Text style={s.loadingText}>No apps match “{query}”.</Text>}
        />
      )}
    </Sheet>
  );
}

function AppRow({ app, done, onPick }: { app: InstalledApp; done: boolean; onPick: (a: InstalledApp) => void }) {
  const { t } = useTheme();
  const s = useStyles(makeStyles);
  return (
    <Tap onPress={() => !done && onPick(app)} style={s.row} scaleTo={0.98}>
      <Image source={{ uri: app.icon }} style={s.rowIcon} />
      <View style={s.flex}>
        <Text style={s.rowTitle} numberOfLines={1}>
          {app.label}
        </Text>
        <Text style={s.rowSub} numberOfLines={1}>
          {app.packageName}
        </Text>
      </View>
      {done ? (
        <View style={[s.pill, { backgroundColor: t.successSoft }]}>
          <Icon name="check" size={13} color={t.success} stroke={3} />
          <Text style={[s.pillText, { color: t.success }]}>Cloned</Text>
        </View>
      ) : (
        <View style={s.pill}>
          <Icon name="plus" size={13} color={t.brand} stroke={3} />
          <Text style={s.pillText}>Clone</Text>
        </View>
      )}
    </Tap>
  );
}

// ================= Clone details =================

export function CloneSheet({
  clone,
  onClose,
  onRename,
  onColor,
  onOpen,
  onShortcut,
  onToggleSleep,
  onSettings,
  onRemove,
}: {
  clone: CloneView | null;
  onClose: () => void;
  onRename: (pkg: string, name: string) => void;
  onColor: (pkg: string, color: string) => void;
  onOpen: (c: CloneView) => void;
  onShortcut: (c: CloneView) => void;
  onToggleSleep: (c: CloneView) => void;
  onSettings: (c: CloneView) => void;
  onRemove: (c: CloneView) => void;
}) {
  const { t } = useTheme();
  const s = useStyles(makeStyles);
  const [last, setLast] = useState<CloneView | null>(clone);
  const [name, setName] = useState(clone?.name ?? '');
  useEffect(() => {
    if (clone) {
      setLast(clone);
      setName(clone.name);
    }
  }, [clone]);
  const c = clone ?? last;
  if (!c) {
    return null;
  }

  // Uses the captured package name, so a rename survives closing the sheet mid-edit.
  const commitName = () => {
    const n = name.trim();
    if (n && n !== c.name) {
      onRename(c.packageName, n);
    } else {
      setName(c.name);
    }
  };

  const close = () => {
    commitName();
    onClose();
  };

  const confirmRemove = () =>
    Alert.alert(
      `Remove ${c.name}?`,
      'The clone and everything inside it (chats, login, files) will be deleted. Your original app is not touched.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => onRemove(c) },
      ],
    );

  const actions: { icon: IconName; title: string; text: string; onPress: () => void; disabled?: boolean }[] = [
    {
      icon: 'open',
      title: c.sleeping ? 'Wake up & open' : 'Open',
      text: 'Launch this clone',
      onPress: () => onOpen(c),
    },
    {
      icon: 'home',
      title: 'Add to home screen',
      text: 'A shortcut with your color badge',
      onPress: () => onShortcut(c),
    },
    {
      icon: c.sleeping ? 'sun' : 'moon',
      title: c.sleeping ? 'Wake up' : 'Put to sleep',
      text: c.sleeping ? 'Clone will run and notify again' : 'No background activity or notifications',
      onPress: () => onToggleSleep(c),
    },
    {
      icon: 'sliders',
      title: 'Permissions & storage',
      text: 'Android settings for this clone',
      onPress: () => onSettings(c),
      disabled: c.sleeping,
    },
  ];

  return (
    <Sheet visible={!!clone} onClose={close}>
      <ScrollView contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
        <View style={s.top}>
          <View style={[s.topIcon, { borderColor: c.color }]}>
            <AppIcon uri={c.icon} size={60} badgeColor={c.color} sleeping={c.sleeping} />
          </View>
          <View style={s.flex}>
            <View style={s.nameRow}>
              <TextInput
                value={name}
                onChangeText={setName}
                onBlur={commitName}
                onSubmitEditing={commitName}
                style={s.name}
                maxLength={28}
                returnKeyType="done"
                accessibilityLabel="Clone name"
              />
              <Icon name="edit" size={16} color={t.muted} />
            </View>
            <Text style={s.sub}>Clone of {c.originalLabel}</Text>
          </View>
        </View>

        <Text style={s.label}>Color tag</Text>
        <View style={s.swatches}>
          {cloneColors.map(col => (
            <Tap
              key={col}
              onPress={() => onColor(c.packageName, col)}
              style={[s.swatch, { backgroundColor: col }, col === c.color && s.swatchOn]}
              accessibilityLabel={`Color ${col}`}>
              {col === c.color ? <Icon name="check" size={16} color="#FFFFFF" stroke={3} /> : null}
            </Tap>
          ))}
        </View>

        <View style={s.actions}>
          {actions.map(a => (
            <Tap key={a.title} onPress={a.onPress} style={s.actionRow} scaleTo={0.98} disabled={a.disabled}>
              <IconTile name={a.icon} color={t.brand} bg={t.skySoft} size={40} />
              <View style={s.flex}>
                <Text style={s.rowTitle}>{a.title}</Text>
                <Text style={s.rowText}>{a.text}</Text>
              </View>
              <Icon name="chevron" size={18} color={t.muted} />
            </Tap>
          ))}
        </View>

        <Button title="Remove clone" kind="danger" icon="trash" onPress={confirmRemove} style={s.mt18} />
      </ScrollView>
    </Sheet>
  );
}

// ================= Settings, security & about =================

export function SettingsSheet({
  visible,
  onClose,
  status,
  security,
  settings,
  onToggleLock,
  onToggleSecureScreen,
  onTheme,
  onDestroy,
}: {
  visible: boolean;
  onClose: () => void;
  status: SpaceStatus | null;
  security: SecurityInfo | null;
  settings: Settings;
  onToggleLock: (v: boolean) => void;
  onToggleSecureScreen: (v: boolean) => void;
  onTheme: (p: ThemePref) => void;
  onDestroy: () => void;
}) {
  const { t } = useTheme();
  const s = useStyles(makeStyles);

  const confirmDestroy = () =>
    Alert.alert(
      'Delete Clone Space?',
      'All clones and their data will be permanently erased. Your original apps stay safe.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete everything', style: 'destructive', onPress: onDestroy },
      ],
    );

  const checks: { ok: boolean; title: string; text: string }[] = [
    {
      ok: true,
      title: 'Locked-down Clone Space',
      text: 'Only Multi-App, signed with its own key, can control your clones. Other apps are rejected.',
    },
    {
      ok: security ? !security.internet : true,
      title: security?.internet ? 'Developer build (internet on)' : 'No internet access',
      text: security?.internet
        ? 'Debug builds need internet for development. Release builds are fully offline.'
        : 'Multi-App cannot send data anywhere — it has no network permission.',
    },
    {
      ok: true,
      title: 'Minimal rights',
      text: 'Admin rights apply only inside the Clone Space — never to your personal apps or data.',
    },
    {
      ok: true,
      title: 'No backups, no transfer',
      text: 'Multi-App data is never copied to the cloud or to another device.',
    },
    {
      ok: !!security?.deviceSecure,
      title: security?.deviceSecure ? 'Phone screen lock set' : 'No screen lock on this phone',
      text: security?.deviceSecure
        ? 'App lock uses your fingerprint, face or PIN.'
        : 'Set a PIN, pattern or fingerprint in Android settings to use App lock.',
    },
  ];

  const themes: { key: ThemePref; label: string; icon: IconName }[] = [
    { key: 'system', label: 'Auto', icon: 'phone' },
    { key: 'light', label: 'Light', icon: 'sun' },
    { key: 'dark', label: 'Dark', icon: 'moon' },
  ];

  const steps = [
    ['Your Clone Space', 'An isolated area on your phone, built with Android’s work-profile technology.'],
    ['Real copies', 'Each clone is a full second install with its own data — e.g. a second WhatsApp number.'],
    ['Everywhere', 'Clones also appear in your app drawer’s “Work” tab with a small briefcase badge.'],
  ];

  return (
    <Sheet visible={visible} onClose={onClose} fullHeight>
      <View style={s.head}>
        <Text style={s.title}>Settings</Text>
        <Tap onPress={onClose} style={s.close} accessibilityLabel="Close">
          <Icon name="close" size={18} color={t.inkSoft} />
        </Tap>
      </View>
      <ScrollView contentContainerStyle={s.pad}>
        <Text style={s.group}>Privacy & security</Text>
        <View style={s.card}>
          <View style={s.settingRow}>
            <IconTile name="lock" color={t.brand} bg={t.skySoft} size={40} />
            <View style={s.flex}>
              <Text style={s.rowTitle}>App lock</Text>
              <Text style={s.rowText}>Fingerprint, face or PIN to open Multi-App and to delete anything</Text>
            </View>
            <Switch value={settings.appLock} onChange={onToggleLock} />
          </View>
          <View style={s.divider} />
          <View style={s.settingRow}>
            <IconTile name="eyeOff" color={t.brand} bg={t.skySoft} size={40} />
            <View style={s.flex}>
              <Text style={s.rowTitle}>Hide content</Text>
              <Text style={s.rowText}>Block screenshots, screen recording and the recent-apps preview</Text>
            </View>
            <Switch value={settings.secureScreen} onChange={onToggleSecureScreen} />
          </View>
        </View>

        <View style={[s.card, s.mt12]}>
          {checks.map((c, i) => (
            <View key={c.title}>
              {i ? <View style={s.divider} /> : null}
              <View style={s.checkRow}>
                <View style={[s.checkIcon, { backgroundColor: c.ok ? t.successSoft : t.warnSoft }]}>
                  <Icon name={c.ok ? 'shieldCheck' : 'info'} size={17} color={c.ok ? t.success : t.warn} />
                </View>
                <View style={s.flex}>
                  <Text style={s.rowTitle}>{c.title}</Text>
                  <Text style={s.rowText}>{c.text}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <Text style={s.group}>Appearance</Text>
        <View style={s.segment}>
          {themes.map(th => {
            const on = settings.theme === th.key;
            return (
              <Tap key={th.key} onPress={() => onTheme(th.key)} style={[s.segItem, on && s.segOn]} scaleTo={0.97}>
                <Icon name={th.icon} size={17} color={on ? t.white : t.inkSoft} />
                <Text style={[s.segText, on && s.segTextOn]}>{th.label}</Text>
              </Tap>
            );
          })}
        </View>

        <Text style={s.group}>How it works</Text>
        <View style={s.card}>
          {steps.map(([title, text], i) => (
            <View key={title}>
              {i ? <View style={s.divider} /> : null}
              <View style={s.checkRow}>
                <View style={s.num}>
                  <Text style={s.numText}>{i + 1}</Text>
                </View>
                <View style={s.flex}>
                  <Text style={s.rowTitle}>{title}</Text>
                  <Text style={s.rowText}>{text}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <Text style={s.group}>Danger zone</Text>
        <Button title="Delete Clone Space" kind="danger" icon="trash" onPress={confirmDestroy} />

        <View style={s.meta}>
          <Text style={s.metaText}>Multi-App 1.1 · by ERI</Text>
          {status ? (
            <Text style={s.metaText}>
              {status.device} · Android API {status.sdk}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </Sheet>
  );
}

const makeStyles = (t: Palette) =>
  StyleSheet.create({
    flex: { flex: 1 },
    pad: { paddingHorizontal: 20, paddingBottom: 8 },
    mt12: { marginTop: 12 },
    mt18: { marginTop: 18 },
    head: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      marginBottom: 6,
    },
    title: { fontSize: 23, fontWeight: '800', color: t.ink },
    subtitle: { fontSize: 13, color: t.muted, marginTop: 2 },
    close: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: t.card,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: t.line,
    },
    search: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginHorizontal: 16,
      marginTop: 10,
      marginBottom: 4,
      paddingHorizontal: 16,
      height: 52,
      borderRadius: radius.md,
      backgroundColor: t.card,
      borderWidth: 1,
      borderColor: t.line,
    },
    input: { flex: 1, fontSize: 16, color: t.ink, paddingVertical: 0 },
    list: { paddingHorizontal: 16, paddingBottom: 24 },
    loading: { alignItems: 'center', paddingTop: 60, gap: 14 },
    loadingText: { color: t.muted, textAlign: 'center', marginTop: 20 },
    section: {
      fontSize: 12,
      fontWeight: '800',
      color: t.muted,
      letterSpacing: 1.1,
      textTransform: 'uppercase',
      marginTop: 18,
      marginBottom: 8,
      marginLeft: 4,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: t.card,
      borderRadius: radius.md,
      padding: 12,
      marginBottom: 8,
    },
    rowIcon: { width: 46, height: 46 },
    rowTitle: { fontSize: 15, fontWeight: '700', color: t.ink },
    rowSub: { fontSize: 11.5, color: t.muted, marginTop: 1 },
    rowText: { fontSize: 12.5, color: t.muted, marginTop: 2, lineHeight: 17 },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: t.skySoft,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
    },
    pillText: { color: t.brand, fontWeight: '800', fontSize: 13 },
    top: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 6 },
    topIcon: {
      padding: 10,
      borderRadius: 26,
      borderWidth: 2,
      backgroundColor: t.card,
    },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    name: { flex: 1, fontSize: 22, fontWeight: '800', color: t.ink, paddingVertical: 2, paddingHorizontal: 0 },
    sub: { fontSize: 13, color: t.muted },
    label: { fontSize: 12, fontWeight: '800', color: t.muted, letterSpacing: 1, marginTop: 24, marginBottom: 10 },
    swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    swatch: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
    swatchOn: { borderWidth: 3, borderColor: t.card, transform: [{ scale: 1.1 }] },
    actions: { marginTop: 22, gap: 8 },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: t.card,
      borderRadius: radius.md,
      padding: 12,
    },
    group: {
      fontSize: 12,
      fontWeight: '800',
      color: t.muted,
      letterSpacing: 1.1,
      textTransform: 'uppercase',
      marginTop: 22,
      marginBottom: 10,
      marginLeft: 4,
    },
    card: { backgroundColor: t.card, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 4 },
    settingRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
    checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingVertical: 12 },
    checkIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    divider: { height: 1, backgroundColor: t.line, marginLeft: 54 },
    segment: { flexDirection: 'row', backgroundColor: t.card, borderRadius: radius.md, padding: 5, gap: 5 },
    segItem: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      height: 44,
      borderRadius: 13,
    },
    segOn: { backgroundColor: t.brandDeep },
    segText: { fontWeight: '700', color: t.inkSoft, fontSize: 14 },
    segTextOn: { color: t.white },
    num: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: t.brandDeep,
      alignItems: 'center',
      justifyContent: 'center',
    },
    numText: { color: t.white, fontWeight: '800' },
    meta: { alignItems: 'center', marginTop: 22, gap: 4 },
    metaText: { color: t.muted, fontSize: 12.5 },
  });
