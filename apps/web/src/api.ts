import { createAuthClient } from 'better-auth/react';
import type { VisibleWorld } from '../../../packages/game-core/src/world.ts';
import data from '../../../packages/game-data/snapshot.json';
export const authClient = createAuthClient();
export type Save = {
  id: string;
  slot: number;
  name: string;
  created_at: string;
  last_played_at: string;
  save_version: string;
  data_version: string;
};
export interface Game extends VisibleWorld {
  save: {
    id: string;
    name: string;
    seed: string;
    saveVersion: string;
    dataVersion: string;
  };
  player: {
    level: number;
    xp: number;
    nextXP: number;
    credits: number;
    planetCap: number;
    shipCap: number;
  };
  ships: (typeof data.ships)[number][];
}
export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${url}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || '网络请求失败，请重试。');
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
