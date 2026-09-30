import { Space } from './native';

export interface CloneMeta {
  packageName: string;
  /** Custom name, e.g. "WhatsApp Work". */
  name: string;
  color: string;
  sleeping: boolean;
  createdAt: number;
}

export type CloneMap = Record<string, CloneMeta>;

export async function loadClones(): Promise<CloneMap> {
  try {
    const raw = await Space.getStore();
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    return parsed?.clones ?? {};
  } catch {
    return {};
  }
}

export async function saveClones(clones: CloneMap): Promise<void> {
  await Space.setStore(JSON.stringify({ version: 1, clones }));
}
