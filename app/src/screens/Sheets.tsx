import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppIcon, Button, Sheet, Tap } from '../components/UI';
import { CheckGlyph, ChevronGlyph, CloseGlyph, MoonGlyph, PlusGlyph, SearchGlyph, TwinGlyph } from '../components/Glyph';
import { InstalledApp, SpaceStatus } from '../native';
import { cloneColors, colors, popularPackages, radius } from '../theme';
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
    out.push({ type: 'header', title: 'All apps' });
    rest.forEach(app => out.push({ type: 'app', app }));
    return out;
  }, [apps, query]);

  return (
    <Sheet visible={visible} onClose={onClose} fullHeight>
      <View style={p.head}>
        <Text style={p.title}>Clone an app</Text>
        <Tap onPress={onClose} style={p.close}>
          <CloseGlyph size={16} color={colors.inkSoft} />
        </Tap>
      </View>
      <View style={p.search}>
        <SearchGlyph size={17} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search apps"
          placeholderTextColor={colors.muted}
          style={p.input}
          autoCorrect={false}
        />
      </View>
      {loading ? (
        <View style={p.loading}>
          <ActivityIndicator color={colors.sky} size="large" />
          <Text style={p.loadingText}>Finding your apps…</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(r, i) => (r.type === 'app' ? r.app.packageName : `h${i}`)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          initialNumToRender={14}
          renderItem={({ item }) =>
            item.type === 'header' ? (
              <Text style={p.section}>{item.title}</Text>
            ) : (
              <AppRow app={item.app} done={cloned.has(item.app.packageName)} onPick={onPick} />
            )
          }
          ListEmptyComponent={<Text style={p.loadingText}>No apps match “{query}”.</Text>}
        />
      )}
    </Sheet>
  );
}

function AppRow({ app, done, onPick }: { app: InstalledApp; done: boolean; onPick: (a: InstalledApp) => void }) {
  return (
    <Tap onPress={() => !done && onPick(app)} style={p.row} scaleTo={0.98}>
      <Image source={{ uri: app.icon }} style={p.rowIcon} />
      <View style={{ flex: 1 }}>
        <Text style={p.rowTitle} numberOfLines={1}>
          {app.label}
        </Text>
        <Text style={p.rowSub} numberOfLines={1}>
          {app.packageName}
        </Text>
      </View>
      {done ? (
        <View style={[p.pill, { backgroundColor: '#E7F8EE' }]}>
          <CheckGlyph size={12} color={colors.success} />
          <Text style={[p.pillText, { color: colors.success }]}>Cloned</Text>
        </View>
      ) : (
        <View style={p.pill}>
          <PlusGlyph size={11} color={colors.brand} />
          <Text style={p.pillText}>Clone</Text>
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
  onRename: (name: string) => void;
  onColor: (color: string) => void;
  onOpen: () => void;
  onShortcut: () => void;
  onToggleSleep: () => void;
  onSettings: () => void;
  onRemove: () => void;
}) {
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

  const commitName = () => {
    const n = name.trim();
    if (n && n !== c.name) {
      onRename(n);
    } else {
      setName(c.name);
    }
  };

  const confirmRemove = () =>
    Alert.alert(
      `Remove ${c.name}?`,
      'The clone and everything inside it (chats, login, files) will be deleted. Your original app is not touched.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: onRemove },
      ],
    );

  return (
    <Sheet visible={!!clone} onClose={onClose}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20 }} keyboardShouldPersistTaps="handled">
        <View style={d.top}>
          <AppIcon uri={c.icon} size={64} badgeColor={c.color} sleeping={c.sleeping} />
          <View style={{ flex: 1 }}>
            <TextInput
              value={name}
              onChangeText={setName}
              onBlur={commitName}
              onSubmitEditing={commitName}
              style={d.name}
              maxLength={28}
              returnKeyType="done"
            />
            <Text style={d.sub}>Clone of {c.originalLabel} · tap name to rename</Text>
          </View>
        </View>

        <Text style={d.label}>Color tag</Text>
        <View style={d.swatches}>
          {cloneColors.map(col => (
            <Tap key={col} onPress={() => onColor(col)} style={[d.swatch, { backgroundColor: col }]}>
              {col === c.color ? <CheckGlyph size={14} /> : null}
            </Tap>
          ))}
        </View>

        <View style={d.actions}>
          <ActionRow
            title={c.sleeping ? 'Wake up & open' : 'Open'}
            text="Launch this clone"
            icon={<TwinGlyph size={18} color={colors.brand} />}
            onPress={onOpen}
          />
          <ActionRow
            title="Add to home screen"
            text="A shortcut with your color badge"
            icon={<PlusGlyph size={14} color={colors.brand} />}
            onPress={onShortcut}
          />
          <ActionRow
            title={c.sleeping ? 'Wake up' : 'Put to sleep'}
            text={c.sleeping ? 'Clone will run and notify again' : 'No background activity or notifications'}
            icon={<MoonGlyph size={16} color={colors.brand} bg={colors.skySoft} />}
            onPress={onToggleSleep}
          />
          <ActionRow
            title="Permissions & storage"
            text="Android settings for this clone"
            icon={<ChevronGlyph size={12} color={colors.brand} />}
            onPress={onSettings}
            disabled={c.sleeping}
          />
        </View>

        <Button title="Remove clone" kind="danger" onPress={confirmRemove} style={{ marginTop: 18 }} />
      </ScrollView>
    </Sheet>
  );
}

function ActionRow({
  title,
  text,
  icon,
  onPress,
  disabled,
}: {
  title: string;
  text: string;
  icon: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Tap onPress={onPress} style={d.row} scaleTo={0.98} disabled={disabled}>
      <View style={d.rowIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={d.rowTitle}>{title}</Text>
        <Text style={d.rowText}>{text}</Text>
      </View>
      <ChevronGlyph />
    </Tap>
  );
}

// ================= Settings / about =================

export function SettingsSheet({
  visible,
  onClose,
  status,
  onDestroy,
}: {
  visible: boolean;
  onClose: () => void;
  status: SpaceStatus | null;
  onDestroy: () => void;
}) {
  const confirmDestroy = () =>
    Alert.alert(
      'Delete Clone Space?',
      'All clones and their data will be permanently erased. Your original apps stay safe.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete everything', style: 'destructive', onPress: onDestroy },
      ],
    );

  const steps = [
    ['Your Clone Space', 'Multi-App creates a private, isolated area on your phone using Android’s built-in work-profile technology.'],
    ['Real copies', 'Each clone is a full second install with its own data. Log in with a different account — e.g. a second WhatsApp number.'],
    ['Everywhere you look', 'Clones also appear in your app drawer (in the “Work” tab) with a small briefcase badge.'],
    ['Sleep mode', 'Put a clone to sleep to stop it running in the background. Wake it any time.'],
  ];

  return (
    <Sheet visible={visible} onClose={onClose}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20 }}>
        <Text style={p.title}>How Multi-App works</Text>
        <View style={{ marginTop: 16, gap: 10 }}>
          {steps.map(([t, x], i) => (
            <View key={t} style={st.step}>
              <View style={st.num}>
                <Text style={st.numText}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={d.rowTitle}>{t}</Text>
                <Text style={d.rowText}>{x}</Text>
              </View>
            </View>
          ))}
        </View>
        <View style={st.meta}>
          <Text style={st.metaText}>Multi-App 1.0 · by ERI</Text>
          {status ? (
            <Text style={st.metaText}>
              {status.device} · Android API {status.sdk}
            </Text>
          ) : null}
        </View>
        <Button title="Delete Clone Space" kind="danger" onPress={confirmDestroy} />
      </ScrollView>
    </Sheet>
  );
}

const p = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  title: { fontSize: 22, fontWeight: '800', color: colors.ink },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
    paddingHorizontal: 16,
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  input: { flex: 1, fontSize: 16, color: colors.ink, paddingVertical: 0 },
  loading: { alignItems: 'center', paddingTop: 60, gap: 14 },
  loadingText: { color: colors.muted, textAlign: 'center', marginTop: 20 },
  section: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.muted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 18,
    marginBottom: 8,
    marginLeft: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 8,
  },
  rowIcon: { width: 44, height: 44 },
  rowTitle: { fontSize: 15.5, fontWeight: '700', color: colors.ink },
  rowSub: { fontSize: 11.5, color: colors.muted, marginTop: 1 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.skySoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  pillText: { color: colors.brand, fontWeight: '800', fontSize: 13 },
});

const d = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 8 },
  name: { fontSize: 22, fontWeight: '800', color: colors.ink, paddingVertical: 2, paddingHorizontal: 0 },
  sub: { fontSize: 12.5, color: colors.muted },
  label: { fontSize: 13, fontWeight: '800', color: colors.muted, marginTop: 24, marginBottom: 10 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  actions: { marginTop: 22, gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 14,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: colors.skySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontSize: 15, fontWeight: '700', color: colors.ink },
  rowText: { fontSize: 12.5, color: colors.muted, marginTop: 1, lineHeight: 17 },
});

const st = StyleSheet.create({
  step: { flexDirection: 'row', gap: 14, backgroundColor: colors.card, borderRadius: radius.md, padding: 14 },
  num: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.brandDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: { color: colors.white, fontWeight: '800' },
  meta: { alignItems: 'center', marginVertical: 22, gap: 4 },
  metaText: { color: colors.muted, fontSize: 12.5 },
});
