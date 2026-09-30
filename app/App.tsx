/**
 * Multi-App — clone any Android app into a private Clone Space.
 *
 * @format
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { haptic, ToastProvider, useToast } from './src/components/UI';
import { errorMessage, InstalledApp, SecurityInfo, Space, SpaceStatus } from './src/native';
import { CloneMap, CloneMeta, defaultSettings, loadStore, saveStore, Settings } from './src/store';
import { cloneColors, popularPackages, ThemePref, ThemeProvider, useTheme } from './src/theme';
import { Welcome } from './src/screens/Welcome';
import { CloneView, Home } from './src/screens/Home';
import { AppPickerSheet, CloneSheet, SettingsSheet } from './src/screens/Sheets';
import { CloningOverlay, CloningState } from './src/screens/CloningOverlay';
import { InfoScreen, InsideSpaceScreen, LockScreen } from './src/screens/InfoScreen';

const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
/** Re-lock after Multi-App has been in the background this long. */
const LOCK_AFTER_MS = 15_000;
/** Freshly cloned apps can take a moment to show up in the Space listing. */
const NEW_CLONE_GRACE_MS = 30_000;

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ToastProvider>
          <Main />
        </ToastProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function Main() {
  const toast = useToast();
  const { t, setPref } = useTheme();
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<SpaceStatus | null>(null);
  const [security, setSecurity] = useState<SecurityInfo | null>(null);
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [appsLoading, setAppsLoading] = useState(true);
  const [clones, setClonesState] = useState<CloneMap>({});
  const [settings, setSettingsState] = useState<Settings>(defaultSettings);
  const [locked, setLocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [managePkg, setManagePkg] = useState<string | null>(null);
  const [cloning, setCloning] = useState<CloningState | null>(null);
  const [lastCloned, setLastCloned] = useState<string | null>(null);

  const clonesRef = useRef<CloneMap>({});
  const settingsRef = useRef<Settings>(defaultSettings);
  const appsRef = useRef<InstalledApp[]>([]);
  /** >0 while Multi-App itself opened a system screen (auth, Space action…). */
  const suppressLock = useRef(0);
  const backgroundAt = useRef<number | null>(null);
  const busy = useRef(false);

  const persist = useCallback(() => {
    saveStore({ clones: clonesRef.current, settings: settingsRef.current }).catch(() => {});
  }, []);

  const setClones = useCallback(
    (next: CloneMap) => {
      clonesRef.current = next;
      setClonesState(next);
      persist();
    },
    [persist],
  );

  const setSettings = useCallback(
    (patch: Partial<Settings>) => {
      settingsRef.current = { ...settingsRef.current, ...patch };
      setSettingsState(settingsRef.current);
      persist();
    },
    [persist],
  );

  const updateClone = useCallback(
    (pkg: string, patch: Partial<CloneMeta>) => {
      const cur = clonesRef.current[pkg];
      if (cur) {
        setClones({ ...clonesRef.current, [pkg]: { ...cur, ...patch } });
      }
    },
    [setClones],
  );

  /** Runs a step that opens a system screen without triggering App lock on return. */
  const withoutLock = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    suppressLock.current++;
    try {
      return await fn();
    } finally {
      setTimeout(() => {
        suppressLock.current = Math.max(0, suppressLock.current - 1);
      }, 800);
    }
  }, []);

  /** When App lock is on, sensitive actions need a fresh fingerprint / PIN. */
  const confirmIdentity = useCallback(
    async (reason: string) => {
      if (!settingsRef.current.appLock) {
        return true;
      }
      const r = await withoutLock(() => Space.authenticate('Confirm it’s you', reason));
      if (r === 'success' || r === 'unavailable') {
        return true;
      }
      if (r === 'lockout') {
        toast('Too many attempts. Try again later.', 'error');
      }
      return false;
    },
    [toast, withoutLock],
  );

  /** Aligns our saved clone list with what really lives in the Space. */
  const reconcile = useCallback(
    (spacePkgs: string[], state: SpaceStatus['state']) => {
      const inSpace = new Set(spacePkgs);
      const next: CloneMap = {};
      let changed = false;
      const now = Date.now();
      for (const c of Object.values(clonesRef.current)) {
        if (inSpace.has(c.packageName)) {
          next[c.packageName] = c.sleeping ? { ...c, sleeping: false } : c;
          changed = changed || c.sleeping;
        } else if (c.sleeping || state !== 'ready' || now - c.createdAt < NEW_CLONE_GRACE_MS) {
          next[c.packageName] = c;
        } else {
          changed = true; // removed from outside Multi-App
        }
      }
      // Apps installed into the Space some other way (e.g. its Play Store) count as clones too.
      if (appsRef.current.length) {
        for (const pkg of spacePkgs) {
          const app = appsRef.current.find(a => a.packageName === pkg);
          if (!next[pkg] && app && !app.system) {
            next[pkg] = {
              packageName: pkg,
              name: app.label,
              color: cloneColors[Object.keys(next).length % cloneColors.length],
              sleeping: false,
              createdAt: now,
            };
            changed = true;
          }
        }
      }
      if (changed) {
        setClones(next);
      }
    },
    [setClones],
  );

  const refresh = useCallback(async () => {
    try {
      const st = await Space.getSpaceStatus();
      setStatus(st);
      if ((st.state === 'ready' || st.state === 'paused') && !busy.current) {
        reconcile(await Space.getSpacePackages(), st.state);
      }
      return st;
    } catch (e) {
      toast(errorMessage(e), 'error');
      return null;
    }
  }, [reconcile, toast]);

  const loadApps = useCallback(async () => {
    try {
      const list = await Space.getInstalledApps();
      appsRef.current = list;
      setApps(list);
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setAppsLoading(false);
    }
  }, [toast]);

  const refreshSecurity = useCallback(() => {
    Space.getSecurityInfo().then(setSecurity).catch(() => {});
  }, []);

  // ---------- Boot ----------

  useEffect(() => {
    (async () => {
      const data = await loadStore();
      clonesRef.current = data.clones;
      settingsRef.current = data.settings;
      setClonesState(data.clones);
      setSettingsState(data.settings);
      setPref(data.settings.theme);
      setLocked(data.settings.appLock);
      Space.setSecureScreen(data.settings.secureScreen).catch(() => {});
      setLoaded(true);
      refreshSecurity();
      await refresh();
      await loadApps();
      await refresh();
    })();
  }, [refresh, loadApps, refreshSecurity, setPref]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', next => {
      if (next === 'background') {
        backgroundAt.current = suppressLock.current > 0 ? null : Date.now();
      } else if (next === 'active') {
        const away = backgroundAt.current;
        backgroundAt.current = null;
        if (settingsRef.current.appLock && away && Date.now() - away > LOCK_AFTER_MS) {
          setLocked(true);
          setPickerOpen(false);
          setSettingsOpen(false);
          setManagePkg(null);
        }
        refresh();
        refreshSecurity();
      }
    });
    return () => sub.remove();
  }, [refresh, refreshSecurity]);

  // ---------- Lock ----------

  const unlock = useCallback(async () => {
    setUnlocking(true);
    const r = await withoutLock(() => Space.authenticate('Unlock Multi-App', 'Confirm it’s you to see your clones'));
    setUnlocking(false);
    if (r === 'success') {
      haptic('success');
      setLocked(false);
    } else if (r === 'unavailable') {
      // The phone no longer has a screen lock, so App lock can't be enforced.
      setLocked(false);
      setSettings({ appLock: false });
      toast('No screen lock on this phone — App lock turned off', 'error');
    } else if (r === 'lockout') {
      toast('Too many attempts. Try again later.', 'error');
    }
  }, [setSettings, toast, withoutLock]);

  const autoPrompted = useRef(false);
  useEffect(() => {
    if (!locked) {
      autoPrompted.current = false;
    } else if (!autoPrompted.current && AppState.currentState === 'active') {
      autoPrompted.current = true;
      unlock();
    }
  }, [locked, unlock]);

  const toggleLock = async (on: boolean) => {
    if (on) {
      const r = await withoutLock(() => Space.authenticate('Turn on App lock', 'Confirm it’s you'));
      if (r === 'success') {
        setSettings({ appLock: true, secureScreen: true });
        Space.setSecureScreen(true).catch(() => {});
        toast('App lock is on 🔒', 'success');
      } else if (r === 'unavailable') {
        toast('Set a PIN, pattern or fingerprint in Android settings first', 'error');
      }
    } else if (await confirmIdentity('Turn off App lock')) {
      setSettings({ appLock: false });
      toast('App lock is off');
    }
  };

  const toggleSecureScreen = async (on: boolean) => {
    if (!on && !(await confirmIdentity('Show Multi-App in screenshots'))) {
      return;
    }
    setSettings({ secureScreen: on });
    await Space.setSecureScreen(on).catch(() => {});
  };

  const changeTheme = (p: ThemePref) => {
    setPref(p);
    setSettings({ theme: p });
  };

  // ---------- Clone actions ----------

  const createSpace = async () => {
    setCreating(true);
    try {
      const ok = await withoutLock(() => Space.createSpace());
      if (!ok) {
        toast('Setup was cancelled');
        return;
      }
      setFinishing(true);
      for (let i = 0; i < 25; i++) {
        const st = await refresh();
        if (st && (st.state === 'ready' || st.state === 'paused')) {
          haptic('success');
          toast('Your Clone Space is ready ✨', 'success');
          setPickerOpen(true);
          break;
        }
        await wait(1000);
      }
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setCreating(false);
      setFinishing(false);
    }
  };

  const cloneApp = async (app: InstalledApp) => {
    if (clonesRef.current[app.packageName]) {
      toast(`${app.label} is already cloned`);
      return;
    }
    setPickerOpen(false);
    const color = cloneColors[Object.keys(clonesRef.current).length % cloneColors.length];
    const base = { label: app.label, icon: app.icon, color };
    setCloning({ phase: 'working', ...base });
    busy.current = true;
    const started = Date.now();
    try {
      await withoutLock(() => Space.cloneApp(app.packageName));
      await wait(Math.max(0, 1600 - (Date.now() - started)));
      const name = `${app.label} 2`;
      setClones({
        ...clonesRef.current,
        [app.packageName]: { packageName: app.packageName, name, color, sleeping: false, createdAt: Date.now() },
      });
      setLastCloned(app.packageName);
      setCloning({ phase: 'done', name, ...base });
    } catch (e) {
      await wait(Math.max(0, 900 - (Date.now() - started)));
      setCloning({ phase: 'error', message: errorMessage(e), ...base });
    } finally {
      busy.current = false;
    }
  };

  const quickClone = (pkg: string) => {
    const app = apps.find(a => a.packageName === pkg);
    if (app) {
      cloneApp(app);
    }
  };

  const openClone = async (c: CloneMeta) => {
    busy.current = true;
    try {
      if (c.sleeping) {
        await withoutLock(() => Space.unfreezeClone(c.packageName));
        updateClone(c.packageName, { sleeping: false });
        await wait(300);
      }
      await Space.launchClone(c.packageName);
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      busy.current = false;
    }
  };

  const pinShortcut = async (c: CloneMeta) => {
    try {
      const ok = await withoutLock(() => Space.pinShortcut(c.packageName, c.name, c.color));
      toast(ok ? 'Confirm to add it to your home screen' : 'Your launcher doesn’t support shortcuts', ok ? 'success' : 'error');
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  const toggleSleep = async (c: CloneMeta) => {
    busy.current = true;
    try {
      if (c.sleeping) {
        await withoutLock(() => Space.unfreezeClone(c.packageName));
        updateClone(c.packageName, { sleeping: false });
        toast(`${c.name} is awake`, 'success');
      } else {
        await withoutLock(() => Space.freezeClone(c.packageName));
        updateClone(c.packageName, { sleeping: true });
        toast(`${c.name} is sleeping 💤`, 'success');
      }
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      busy.current = false;
    }
  };

  const removeClone = async (c: CloneMeta) => {
    if (!(await confirmIdentity(`Remove ${c.name}`))) {
      return;
    }
    setManagePkg(null);
    busy.current = true;
    try {
      await withoutLock(() => Space.removeClone(c.packageName));
      const next = { ...clonesRef.current };
      delete next[c.packageName];
      setClones(next);
      toast(`${c.name} removed`, 'success');
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      busy.current = false;
    }
  };

  const destroySpace = async () => {
    if (!(await confirmIdentity('Delete your Clone Space'))) {
      return;
    }
    setSettingsOpen(false);
    try {
      await withoutLock(() => Space.destroySpace());
      setClones({});
      toast('Clone Space deleted');
      for (let i = 0; i < 10; i++) {
        await wait(800);
        const st = await refresh();
        if (st?.state === 'none') {
          break;
        }
      }
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  const resume = async () => {
    const ok = await Space.unpauseSpace();
    if (!ok) {
      toast('Turn on “Work apps” from your quick settings');
    }
    setTimeout(refresh, 800);
  };

  // ---------- View models ----------

  const appMap = useMemo(() => new Map(apps.map(a => [a.packageName, a])), [apps]);
  const cloneViews: CloneView[] = useMemo(
    () =>
      Object.values(clones)
        .sort((a, b) => a.createdAt - b.createdAt)
        .map(c => ({
          ...c,
          icon: appMap.get(c.packageName)?.icon,
          originalLabel: appMap.get(c.packageName)?.label ?? c.packageName,
        })),
    [clones, appMap],
  );
  const clonedSet = useMemo(() => new Set(Object.keys(clones)), [clones]);
  const suggestions = useMemo(() => {
    const pop = popularPackages.map(p => appMap.get(p)).filter((a): a is InstalledApp => !!a);
    return (pop.length ? pop : apps.filter(a => !a.system)).filter(a => !clonedSet.has(a.packageName));
  }, [appMap, apps, clonedSet]);
  const managed = managePkg ? cloneViews.find(c => c.packageName === managePkg) ?? null : null;
  const doneClone = lastCloned ? clones[lastCloned] : undefined;

  // ---------- Screens ----------

  if (!loaded || !status) {
    return <InfoScreen loading />;
  }
  if (status.insideSpace) {
    return <InsideSpaceScreen />;
  }
  if (locked) {
    return (
      <>
        <StatusBar barStyle="light-content" />
        <LockScreen onUnlock={unlock} busy={unlocking} />
      </>
    );
  }
  if (!status.supported) {
    return (
      <InfoScreen
        title="Clone Space isn’t available"
        text={`Multi-App needs Android 9 or newer with work-profile support. This device (${status.device}, API ${status.sdk}) doesn’t provide it.`}
      />
    );
  }
  if (status.state === 'foreign') {
    return (
      <InfoScreen
        title="Another work profile is active"
        text="Android allows only one work profile per phone, and one already exists (from your company or an app like Shelter or Island). Remove it in Settings › Accounts › Work, then come back."
        actionTitle="Check again"
        onAction={refresh}
      />
    );
  }
  if (status.state === 'none') {
    return (
      <>
        <StatusBar barStyle="light-content" />
        <Welcome onCreate={createSpace} creating={creating} finishing={finishing} />
      </>
    );
  }

  return (
    <>
      <StatusBar barStyle={t.dark ? 'light-content' : 'dark-content'} />
      <Home
        clones={cloneViews}
        state={status.state}
        refreshing={refreshing}
        protectedMode={settings.appLock}
        onRefresh={async () => {
          setRefreshing(true);
          await Promise.all([refresh(), loadApps()]);
          setRefreshing(false);
        }}
        onOpen={openClone}
        onManage={c => setManagePkg(c.packageName)}
        onAdd={() => {
          setPickerOpen(true);
          loadApps();
        }}
        onQuickClone={quickClone}
        onSettings={() => {
          refreshSecurity();
          setSettingsOpen(true);
        }}
        onResume={resume}
        suggestions={suggestions}
      />
      <AppPickerSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        apps={apps}
        loading={appsLoading && !apps.length}
        cloned={clonedSet}
        onPick={cloneApp}
      />
      <CloneSheet
        clone={managed}
        onClose={() => setManagePkg(null)}
        onRename={(pkg, name) => updateClone(pkg, { name })}
        onColor={(pkg, color) => updateClone(pkg, { color })}
        onOpen={c => {
          setManagePkg(null);
          openClone(c);
        }}
        onShortcut={pinShortcut}
        onToggleSleep={toggleSleep}
        onSettings={c => withoutLock(() => Space.openCloneSettings(c.packageName))}
        onRemove={removeClone}
      />
      <SettingsSheet
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        status={status}
        security={security}
        settings={settings}
        onToggleLock={toggleLock}
        onToggleSecureScreen={toggleSecureScreen}
        onTheme={changeTheme}
        onDestroy={destroySpace}
      />
      <CloningOverlay
        state={cloning}
        onClose={() => setCloning(null)}
        onOpen={() => {
          setCloning(null);
          if (doneClone) {
            openClone(doneClone);
          }
        }}
        onShortcut={() => doneClone && pinShortcut(doneClone)}
      />
    </>
  );
}
