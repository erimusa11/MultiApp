/**
 * Multi-App — clone any Android app into a private Clone Space.
 *
 * @format
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastProvider, useToast } from './src/components/UI';
import { errorMessage, InstalledApp, Space, SpaceStatus } from './src/native';
import { CloneMap, CloneMeta, loadClones, saveClones } from './src/store';
import { cloneColors, popularPackages } from './src/theme';
import { Welcome } from './src/screens/Welcome';
import { CloneView, Home } from './src/screens/Home';
import { AppPickerSheet, CloneSheet, SettingsSheet } from './src/screens/Sheets';
import { CloningOverlay, CloningState } from './src/screens/CloningOverlay';
import { InfoScreen, InsideSpaceScreen } from './src/screens/InfoScreen';

const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <ToastProvider>
        <Main />
      </ToastProvider>
    </SafeAreaProvider>
  );
}

function Main() {
  const toast = useToast();
  const [status, setStatus] = useState<SpaceStatus | null>(null);
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [appsLoading, setAppsLoading] = useState(true);
  const [clones, setClonesState] = useState<CloneMap>({});
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [managePkg, setManagePkg] = useState<string | null>(null);
  const [cloning, setCloning] = useState<CloningState | null>(null);
  const [lastCloned, setLastCloned] = useState<string | null>(null);

  const clonesRef = useRef<CloneMap>({});
  const appsRef = useRef<InstalledApp[]>([]);
  const busy = useRef(false);

  const setClones = useCallback((next: CloneMap) => {
    clonesRef.current = next;
    setClonesState(next);
    saveClones(next).catch(() => {});
  }, []);

  const updateClone = useCallback(
    (pkg: string, patch: Partial<CloneMeta>) => {
      const cur = clonesRef.current[pkg];
      if (cur) {
        setClones({ ...clonesRef.current, [pkg]: { ...cur, ...patch } });
      }
    },
    [setClones],
  );

  /** Aligns our saved clone list with what really lives in the Space. */
  const reconcile = useCallback(
    (spacePkgs: string[], state: SpaceStatus['state']) => {
      const inSpace = new Set(spacePkgs);
      const next: CloneMap = {};
      let changed = false;
      for (const c of Object.values(clonesRef.current)) {
        if (inSpace.has(c.packageName)) {
          next[c.packageName] = c.sleeping ? { ...c, sleeping: false } : c;
          changed = changed || c.sleeping;
        } else if (c.sleeping || state !== 'ready') {
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
              createdAt: Date.now(),
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

  useEffect(() => {
    (async () => {
      clonesRef.current = await loadClones();
      setClonesState(clonesRef.current);
      await refresh();
      await loadApps();
      await refresh();
    })();
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') {
        refresh();
      }
    });
    return () => sub.remove();
  }, [refresh, loadApps]);

  // ---------- Actions ----------

  const createSpace = async () => {
    setCreating(true);
    try {
      const ok = await Space.createSpace();
      if (!ok) {
        toast('Setup was cancelled');
        return;
      }
      setFinishing(true);
      for (let i = 0; i < 25; i++) {
        const st = await refresh();
        if (st && (st.state === 'ready' || st.state === 'paused')) {
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
      await Space.cloneApp(app.packageName);
      await wait(Math.max(0, 1500 - (Date.now() - started)));
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
    try {
      if (c.sleeping) {
        busy.current = true;
        await Space.unfreezeClone(c.packageName);
        updateClone(c.packageName, { sleeping: false });
        busy.current = false;
        await wait(300);
      }
      await Space.launchClone(c.packageName);
    } catch (e) {
      busy.current = false;
      toast(errorMessage(e), 'error');
    }
  };

  const pinShortcut = async (c: CloneMeta) => {
    try {
      const ok = await Space.pinShortcut(c.packageName, c.name, c.color);
      toast(ok ? 'Confirm to add it to your home screen' : 'Your launcher doesn’t support shortcuts', ok ? 'success' : 'error');
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  const toggleSleep = async (c: CloneMeta) => {
    busy.current = true;
    try {
      if (c.sleeping) {
        await Space.unfreezeClone(c.packageName);
        updateClone(c.packageName, { sleeping: false });
        toast(`${c.name} is awake`, 'success');
      } else {
        await Space.freezeClone(c.packageName);
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
    setManagePkg(null);
    busy.current = true;
    try {
      await Space.removeClone(c.packageName);
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
    setSettingsOpen(false);
    try {
      await Space.destroySpace();
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
      toast('Turn on “Work apps” from your quick settings', 'info');
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

  if (!status) {
    return <InfoScreen loading />;
  }
  if (status.insideSpace) {
    return <InsideSpaceScreen />;
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
    return <Welcome onCreate={createSpace} creating={creating} finishing={finishing} />;
  }

  return (
    <>
      <Home
        clones={cloneViews}
        state={status.state}
        refreshing={refreshing}
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
        onSettings={() => setSettingsOpen(true)}
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
        onRename={name => managed && updateClone(managed.packageName, { name })}
        onColor={color => managed && updateClone(managed.packageName, { color })}
        onOpen={() => {
          if (managed) {
            setManagePkg(null);
            openClone(managed);
          }
        }}
        onShortcut={() => managed && pinShortcut(managed)}
        onToggleSleep={() => managed && toggleSleep(managed)}
        onSettings={() => managed && Space.openCloneSettings(managed.packageName)}
        onRemove={() => managed && removeClone(managed)}
      />
      <SettingsSheet
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        status={status}
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

