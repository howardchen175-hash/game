import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateWorld,
  visibleWorld,
  hops,
} from '../packages/game-core/src/world.ts';
import data from '../packages/game-data/snapshot.json';
test('same seed gives identical topology; another seed produces a new universe', () => {
  assert.deepEqual(generateWorld('owner-play'), generateWorld('owner-play'));
  assert.notDeepEqual(
    generateWorld('owner-play').systems,
    generateWorld('another').systems,
  );
});
test('20 worlds satisfy region, orbit, route, capacity and starter invariants', () => {
  for (let seed = 0; seed < 20; seed++) {
    const w = generateWorld(`world-${seed}`);
    const ids = new Set(w.systems.map((s) => s.id));
    assert.equal(w.regions.length, 9);
    assert.equal(ids.size, w.systems.length);
    assert.equal(new Set(w.routes.map((r) => r.id)).size, w.routes.length);
    for (const s of w.systems) {
      assert.ok(s.x >= 0 && s.x <= 100 && s.y >= 0 && s.y <= 100);
      assert.ok(s.planets.length >= 2 && s.planets.length <= 6);
      assert.equal(s.star.localX, 0);
      assert.equal(s.star.localY, 0);
      assert.ok(!('resources' in s.star));
      assert.ok(
        Number.isFinite(hops(w.homeSystemId, s.id, w.routes)),
        'entire galaxy must be connected',
      );
      for (const p of s.planets) {
        assert.ok(Math.abs(p.localX) <= 100 && Math.abs(p.localY) <= 100);
        assert.ok(p.slots >= 1 && p.slots <= 8);
        const total = p.resources.reduce((n, r) => n + r.amount, 0);
        assert.equal(
          total,
          Math.round(3000 + ((p.sizeScore - 25) * 27000) / 295),
        );
        assert.ok(total >= 3000 && total <= 30000);
      }
    }
    for (const r of w.regions) {
      const members = w.systems.filter((s) => s.regionId === r.id);
      assert.ok(members.length >= 10 && members.length <= 15);
      const internal = w.routes.filter(
        (route) =>
          members.some((s) => s.id === route.from) &&
          members.some((s) => s.id === route.to),
      );
      assert.ok(
        internal.length >= members.length &&
          internal.length <= members.length + 2,
      );
      for (const a of members)
        for (const b of members)
          if (a.id !== b.id) assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= 5);
      for (const route of internal)
        assert.ok(
          hops(
            route.from,
            route.to,
            internal.filter((e) => e !== route),
          ) >= 4,
          'no short local loops',
        );
    }
    for (const route of w.routes) {
      assert.notEqual(route.from, route.to);
      assert.ok(ids.has(route.from) && ids.has(route.to));
      assert.ok(route.distanceUnits > 0);
    }
    const home = w.systems[0].planets[0];
    assert.equal(home.sizeScore, 120);
    assert.equal(home.size, 'Medium');
    assert.equal(home.slots, 7);
    assert.ok(home.resources.some((r) => r.id === 'ORE_FE'));
    assert.ok(home.resources.some((r) => r.id === 'ORE_U'));
  }
});
test('fog of war strips hidden details at serialization boundary', () => {
  const w = generateWorld('secret');
  const visible = visibleWorld(w);
  for (const s of visible.systems) {
    if (!s.known) assert.equal(s.name, '未识别星系');
    for (const p of s.planets) {
      if (p.id === w.homePlanetId) assert.equal(p.details?.name, '新曙光');
      else {
        assert.equal(p.details, undefined);
        assert.ok(!('resources' in p));
        assert.ok(!('slots' in p));
        assert.ok(!('name' in p));
      }
    }
  }
});
test('authoritative starter hulls and level limits remain intact', () => {
  const scout = data.ships.find((s) => s.id === 'HULL_小型_侦察_E')!;
  const combat = data.ships.find((s) => s.id === 'HULL_小型_战斗_E')!;
  assert.equal(scout.hp, 598);
  assert.equal(combat.hp, 650);
  assert.equal(data.levels[0].planetCap, 1);
  assert.equal(data.levels[0].shipCap, 3);
});
