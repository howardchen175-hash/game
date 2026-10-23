import data from '../../game-data/snapshot.json';
import { WORLD_CONFIG as config } from '../../game-data/world-config.ts';

export function random(seed: string): () => number {
  let h = 2166136261;
  for (const char of seed) h = Math.imul(h ^ char.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export interface Region {
  id: string;
  name: string;
  x: number;
  y: number;
}
export interface System {
  id: string;
  regionId: string;
  name: string;
  x: number;
  y: number;
  star: { id: string; type: 'star'; localX: number; localY: number };
  planets: Planet[];
}
export interface Planet {
  id: string;
  name: string;
  systemId: string;
  localX: number;
  localY: number;
  size: string;
  sizeScore: number;
  slots: number;
  appearance: number;
  resources: { id: string; amount: number }[];
}
export interface Route {
  id: string;
  from: string;
  to: string;
  distanceUnits: number;
}
export interface World {
  generatorVersion: string;
  regions: Region[];
  systems: System[];
  routes: Route[];
  homePlanetId: string;
  homeSystemId: string;
}
export type VisiblePlanet = Pick<
  Planet,
  'id' | 'systemId' | 'localX' | 'localY'
> & { known: boolean; details?: Planet };
export interface VisibleSystem extends Omit<System, 'planets'> {
  known: boolean;
  planets: VisiblePlanet[];
}
export interface VisibleWorld extends Omit<World, 'systems'> {
  systems: VisibleSystem[];
}

export function generateWorld(seed: string): World {
  const rng = random(seed);
  const int = (min: number, max: number) =>
    min + Math.floor(rng() * (max - min + 1));
  const regions = config.regions.map((name, i) => ({
    id: `R${i + 1}`,
    name,
    x: 18 + (i % 3) * 32,
    y: 82 - Math.floor(i / 3) * 32,
  }));
  const systems: System[] = [];
  const routes: Route[] = [];
  const linked = new Set<string>();
  const addRoute = (a: System, b: System) => {
    const pair = [a.id, b.id].sort();
    const id = pair.join('--');
    if (a.id === b.id || linked.has(id)) return;
    linked.add(id);
    routes.push({
      id,
      from: pair[0],
      to: pair[1],
      distanceUnits: +Math.hypot(a.x - b.x, a.y - b.y).toFixed(3),
    });
  };
  for (const region of regions) {
    const count = int(...config.systemsPerRegion);
    const grid = Array.from({ length: 16 }, (_, i) => i);
    // Seeded Fisher-Yates, never Array.sort(random).
    for (let i = grid.length - 1; i > 0; i--) {
      const j = int(0, i);
      [grid[i], grid[j]] = [grid[j], grid[i]];
    }
    const members: System[] = [];
    for (let i = 0; i < count; i++) {
      const cell = grid[i];
      const id = `${region.id}-S${String(i + 1).padStart(2, '0')}`;
      const system: System = {
        id,
        regionId: region.id,
        name: `${region.name.slice(0, -2)} ${String(i + 1).padStart(2, '0')}`,
        x: +(region.x - 12 + (cell % 4) * 8 + (rng() - 0.5) * 3).toFixed(3),
        y: +(
          region.y -
          12 +
          Math.floor(cell / 4) * 8 +
          (rng() - 0.5) * 3
        ).toFixed(3),
        star: { id: `${id}-STAR`, type: 'star', localX: 0, localY: 0 },
        planets: [],
      };
      const planetCount = int(...config.planetsPerSystem);
      const phase = rng() * Math.PI * 2;
      for (let p = 0; p < planetCount; p++) {
        const home = systems.length === 0 && i === 0 && p === 0;
        const score = home ? config.start.sizeScore : int(25, 320);
        const angle = phase + p * 2.39996;
        const radius = 27 + p * 12;
        const size =
          score < 70
            ? 'Tiny'
            : score < 110
              ? 'Small'
              : score < 170
                ? 'Medium'
                : score < 240
                  ? 'Large'
                  : 'Huge';
        const ores = [...data.ores];
        const chosen: typeof data.ores = [];
        if (home)
          for (const oreId of ['ORE_FE', 'ORE_U'])
            chosen.push(
              ores.splice(
                ores.findIndex((o) => o.id === oreId),
                1,
              )[0],
            );
        const oreCount = int(...config.oresPerPlanet);
        while (chosen.length < oreCount) {
          const weight = (o: (typeof ores)[number]) =>
            config.oreWeights[o.rarity as keyof typeof config.oreWeights];
          let pick = rng() * ores.reduce((s, o) => s + weight(o), 0);
          let selected = 0;
          for (; selected < ores.length - 1; selected++) {
            pick -= weight(ores[selected]);
            if (pick <= 0) break;
          }
          chosen.push(ores.splice(selected, 1)[0]);
        }
        const capacity = config.mineralCapacity;
        const total = Math.round(
          capacity.min +
            ((score - capacity.minScore) * (capacity.max - capacity.min)) /
              (capacity.maxScore - capacity.minScore),
        );
        // Provisional equal split, conserving the authoritative total exactly.
        const resources = chosen.map((o, index) => ({
          id: o.id,
          amount:
            Math.floor(total / chosen.length) +
            (index < total % chosen.length ? 1 : 0),
        }));
        system.planets.push({
          id: `${id}-P${p + 1}`,
          name: home
            ? '新曙光'
            : `${system.name} · ${['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ'][p]}`,
          systemId: id,
          localX: +(Math.cos(angle) * radius).toFixed(3),
          localY: +(Math.sin(angle) * radius).toFixed(3),
          size,
          sizeScore: score,
          slots: home
            ? config.start.slots
            : 1 +
              config.slotThresholds.filter(
                (t) => rng() < Math.min(0.95, Math.max(0, (score - t) / 80)),
              ).length,
          appearance: int(0, 4),
          resources,
        });
      }
      members.push(system);
    }
    // Prim's minimum spanning tree: sparse connected skeleton.
    const visited = new Set([members[0].id]);
    while (visited.size < members.length) {
      let best: [System, System] | undefined;
      let distance = Infinity;
      for (const a of members.filter((s) => visited.has(s.id)))
        for (const b of members.filter((s) => !visited.has(s.id))) {
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < distance) {
            best = [a, b];
            distance = d;
          }
        }
      if (!best) throw new Error('Cannot connect region');
      addRoute(...best);
      visited.add(best[1].id);
    }
    const extraCount = int(1, 3);
    for (let extra = 0; extra < extraCount; extra++) {
      const candidates: [System, System][] = [];
      for (let a = 0; a < members.length; a++)
        for (let b = a + 1; b < members.length; b++) {
          if (hops(members[a].id, members[b].id, routes) >= 4)
            candidates.push([members[a], members[b]]);
        }
      if (candidates.length)
        addRoute(...candidates[int(0, candidates.length - 1)]);
    }
    systems.push(...members);
  }
  for (let i = 0; i < regions.length; i++)
    for (const offset of [1, 3]) {
      if ((offset === 1 && i % 3 === 2) || i + offset >= regions.length)
        continue;
      const from = systems.filter((s) => s.regionId === regions[i].id);
      const to = systems.filter((s) => s.regionId === regions[i + offset].id);
      const pairs = from
        .flatMap((a) =>
          to.map((b) => ({ a, b, d: Math.hypot(a.x - b.x, a.y - b.y) })),
        )
        .sort((a, b) => a.d - b.d);
      for (const pair of pairs.slice(0, int(1, 3))) addRoute(pair.a, pair.b);
    }
  addRoute(
    systems.find((s) => s.regionId === 'R1')!,
    systems.find((s) => s.regionId === 'R9')!,
  );
  return {
    generatorVersion: config.generatorVersion,
    regions,
    systems,
    routes,
    homePlanetId: systems[0].planets[0].id,
    homeSystemId: systems[0].id,
  };
}
export function hops(from: string, to: string, routes: Route[]): number {
  const queue: [string, number][] = [[from, 0]];
  const visited = new Set([from]);
  for (let i = 0; i < queue.length; i++) {
    const [id, depth] = queue[i];
    if (id === to) return depth;
    for (const r of routes) {
      const other = r.from === id ? r.to : r.to === id ? r.from : null;
      if (other && !visited.has(other)) {
        visited.add(other);
        queue.push([other, depth + 1]);
      }
    }
  }
  return Infinity;
}
export function visibleWorld(world: World): VisibleWorld {
  return {
    ...world,
    systems: world.systems.map((s) => ({
      ...s,
      known: s.id === world.homeSystemId,
      name: s.id === world.homeSystemId ? s.name : '未识别星系',
      planets: s.planets.map((p) => ({
        id: p.id,
        systemId: p.systemId,
        localX: p.localX,
        localY: p.localY,
        known: p.id === world.homePlanetId,
        ...(p.id === world.homePlanetId ? { details: p } : {}),
      })),
    })),
  };
}
