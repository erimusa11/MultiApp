import { Space } from './native';
import { cloneColors, ThemePref } from './theme';

export interface CloneMeta {
  packageName: string;
  /** Custom name, e.g. "WhatsApp Work". */
  name: string;
  color: string;
  sleeping: boolean;
  createdAt: number;
}

export type CloneMap = Record<string, CloneMeta>;

export interface Settings {
  appLock: boolean;
  secureScreen: boolean;
  theme: ThemePref;
}

export interface StoreData {
  clones: CloneMap;
  settings: Settings;
}

export const defaultSettings: Settings = { appLock: false, secureScreen: false, theme: 'system' };

const PKG = /^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z0-9_]+)+$/;
const HEX = /^#[0-9A-Fa-f]{6}$/;

/** Parses and sanitizes persisted data, so a corrupted file can never break the app. */
function sanitize(raw: unknown): StoreData {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>;
  const clones: CloneMap = {};
  for (const c of Object.values(data.clones ?? {}) as any[]) {
    if (!c || typeof c.packageName !== 'string' || !PKG.test(c.packageName)) {
      continue;
    }
    clones[c.packageName] = {
      packageName: c.packageName,
      name: typeof c.name === 'string' && c.name.trim() ? c.name.slice(0, 40) : c.packageName,
      color: typeof c.color === 'string' && HEX.test(c.color) ? c.color : cloneColors[0],
      sleeping: c.sleeping === true,
      createdAt: typeof c.createdAt === 'number' ? c.createdAt : Date.now(),
    };
  }
  const s = data.settings ?? {};
  const settings: Settings = {
    appLock: s.appLock === true,
    secureScreen: s.secureScreen === true,
    theme: s.theme === 'light' || s.theme === 'dark' ? s.theme : 'system',
  };
  return { clones, settings };
}

export async function loadStore(): Promise<StoreData> {
  try {
    const raw = await Space.getStore();
    return sanitize(raw ? JSON.parse(raw) : null);
  } catch {
    return sanitize(null);
  }
}

export async function saveStore(data: StoreData): Promise<void> {
  await Space.setStore(JSON.stringify({ version: 2, ...data }));
}
