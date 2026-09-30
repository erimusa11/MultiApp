import { NativeModules, Platform } from 'react-native';

export type SpaceState = 'none' | 'ready' | 'paused' | 'foreign' | 'inside';

export interface SpaceStatus {
  supported: boolean;
  insideSpace: boolean;
  state: SpaceState;
  sdk: number;
  device: string;
}

export interface InstalledApp {
  packageName: string;
  label: string;
  icon: string; // data: URI
  system: boolean;
}

interface MultiAppSpaceNative {
  getSpaceStatus(): Promise<SpaceStatus>;
  createSpace(): Promise<boolean>;
  unpauseSpace(): Promise<boolean>;
  destroySpace(): Promise<boolean>;
  getInstalledApps(): Promise<InstalledApp[]>;
  getSpacePackages(): Promise<string[]>;
  cloneApp(pkg: string): Promise<boolean>;
  removeClone(pkg: string): Promise<boolean>;
  freezeClone(pkg: string): Promise<boolean>;
  unfreezeClone(pkg: string): Promise<boolean>;
  launchClone(pkg: string): Promise<boolean>;
  openCloneSettings(pkg: string): Promise<boolean>;
  pinShortcut(pkg: string, label: string, color: string): Promise<boolean>;
  getStore(): Promise<string | null>;
  setStore(json: string): Promise<boolean>;
}

const mod: MultiAppSpaceNative | undefined = NativeModules.MultiAppSpace;

if (!mod && Platform.OS === 'android') {
  console.warn('MultiAppSpace native module is missing — rebuild the Android app.');
}

export const Space = mod as MultiAppSpaceNative;

export function errorMessage(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) {
    return String((e as { message: unknown }).message);
  }
  return 'Something went wrong';
}
