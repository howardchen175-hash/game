import { useRef, useState } from 'react';
import {
  Plus,
  Minus,
  LocateFixed,
  Maximize2,
  Minimize2,
  ArrowLeft,
  Search,
  X,
} from 'lucide-react';
import type { Game } from './api';
import type { VisibleSystem } from '../../../packages/game-core/src/world';
export const position = (s: { x: number; y: number }) => ({
  x: 45 + s.x * 9.1,
  y: 755 - s.y * 7.1,
});
export function StarMap({
  game,
  selected,
  onSelect,
  systemView,
  onSystemView,
  planetId,
  onPlanet,
  expanded,
  onExpand,
}: {
  game: Game;
  selected: VisibleSystem;
  onSelect: (s: VisibleSystem) => void;
  systemView: boolean;
  onSystemView: (v: boolean) => void;
  planetId: string | null;
  onPlanet: (id: string) => void;
  expanded: boolean;
  onExpand: () => void;
}) {
  const initial = { x: 0, y: 0, w: 1000, h: 800 };
  const [view, setView] = useState(initial);
  const [labels, setLabels] = useState(true);
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('');
  const drag = useRef<{
    x: number;
    y: number;
    view: typeof initial;
    width: number;
    height: number;
  } | null>(null);
  const systems = new Map(game.systems.map((s) => [s.id, s]));
  const zoom = (factor: number) =>
    setView((v) => {
      const w = Math.min(1500, Math.max(250, v.w * factor));
      const h = w * 0.8;
      return { x: v.x + (v.w - w) / 2, y: v.y + (v.h - h) / 2, w, h };
    });
  const results = query.trim()
    ? game.systems
        .filter((s) =>
          `${s.id} ${s.known ? s.name : ''}`
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
        )
        .slice(0, 8)
    : [];
  const select = (s: VisibleSystem) => {
    onSelect(s);
    onPlanet(s.star.id);
  };
  function reset() {
    setView(initial);
    setRegion('');
  }
  return (
    <section
      className={`map-panel ${expanded ? 'expanded' : ''}`}
      aria-label="星图"
    >
      <div className="map-toolbar">
        <div className="map-view-title">
          {systemView ? (
            <button
              className="text-button"
              onClick={() => {
                onSystemView(false);
                reset();
              }}
            >
              <ArrowLeft size={15} />
              银河星图
            </button>
          ) : (
            <>
              <span className="live-dot" />
              银河星图
            </>
          )}
          <span className="toolbar-divider">/</span>
          <span className="muted">{systemView ? selected.id : '全部星域'}</span>
        </div>
        <div className="map-toolbar-actions">
          {!systemView && (
            <>
              <select
                aria-label="高亮星域"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              >
                <option value="">全部星域</option>
                {game.regions.map((r) => (
                  <option value={r.id} key={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <button
                className={`quiet label-toggle ${labels ? 'active' : ''}`}
                onClick={() => setLabels(!labels)}
              >
                标识
              </button>
            </>
          )}
          <button
            className="icon-button"
            aria-label={expanded ? '收起星图' : '展开星图'}
            onClick={onExpand}
          >
            {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>
      <div className="map-canvas">
        <div className="map-nebula" />
        {!systemView && (
          <div className="map-search">
            <Search size={15} />
            <input
              aria-label="搜索星系"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索星系名称或编号"
            />
            {query && (
              <button
                className="icon-button"
                aria-label="清除搜索"
                onClick={() => setQuery('')}
              >
                <X size={13} />
              </button>
            )}
            {query && (
              <div className="search-results">
                {results.length ? (
                  results.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        select(s);
                        setQuery('');
                      }}
                    >
                      <span>{s.known ? s.name : '未识别星系'}</span>
                      <small>{s.id}</small>
                    </button>
                  ))
                ) : (
                  <p>未找到匹配星系</p>
                )}
              </div>
            )}
          </div>
        )}
        {systemView ? (
          <svg
            className="system-svg"
            viewBox="-115 -115 230 230"
            aria-label={`${selected.id} 星系内天体图`}
            role="group"
          >
            <defs>
              <radialGradient id="star-glow">
                <stop offset="0%" stopColor="#ffe5a1" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#ffe5a1" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="planet-fill">
                <stop offset="0%" stopColor="#bad9b0" />
                <stop offset="50%" stopColor="#638985" />
                <stop offset="100%" stopColor="#162a38" />
              </radialGradient>
            </defs>
            {selected.planets.map((p) => (
              <circle
                key={p.id}
                cx={0}
                cy={0}
                r={Math.hypot(p.localX, p.localY)}
                fill="none"
                stroke="#8ca8bd"
                strokeOpacity="0.11"
                strokeWidth="0.25"
              />
            ))}
            <circle cx={0} cy={0} r={21} fill="url(#star-glow)" />
            <g
              data-node="true"
              tabIndex={0}
              role="button"
              aria-label={`恒星 ${selected.star.id}`}
              onClick={() => onPlanet(selected.star.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onPlanet(selected.star.id);
                }
              }}
              className="celestial-node"
            >
              <circle r={10} fill="transparent" />
              <circle r={5} fill="#f6ce7b" />
              {planetId === selected.star.id && (
                <circle r={8} fill="none" stroke="#f6ce7b" strokeWidth="0.4" />
              )}
              <text x={0} y={16} textAnchor="middle">
                中心恒星
              </text>
            </g>
            {selected.planets.map((p, i) => (
              <g
                key={p.id}
                data-node="true"
                transform={`translate(${p.localX} ${-p.localY})`}
                tabIndex={0}
                role="button"
                aria-label={p.details?.name || `未知行星 ${p.id}`}
                onClick={() => onPlanet(p.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onPlanet(p.id);
                  }
                }}
                className="celestial-node"
              >
                <circle r={10} fill="transparent" />
                {planetId === p.id && (
                  <circle
                    r={8}
                    fill="none"
                    stroke="#b9ee91"
                    strokeWidth="0.4"
                  />
                )}
                <circle
                  r={p.known ? 4.5 : 3}
                  fill={p.known ? 'url(#planet-fill)' : '#516078'}
                  stroke={p.known ? '#b9ee91' : '#748398'}
                  strokeWidth="0.3"
                />
                <text y={14} textAnchor="middle">
                  {p.details?.name || `未知行星 0${i + 1}`}
                </text>
              </g>
            ))}
            <text x={-107} y={108} className="coordinate-label">
              局部坐标 · X → / Y ↑
            </text>
          </svg>
        ) : (
          <svg
            className="galaxy-svg"
            viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
            role="group"
            aria-label="九大星域与星系航线图"
            onPointerDown={(e) => {
              if ((e.target as Element).closest('[data-node]')) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const scale = Math.min(rect.width / view.w, rect.height / view.h);
              drag.current = {
                x: e.clientX,
                y: e.clientY,
                view,
                width: scale,
                height: scale,
              };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (!drag.current) return;
              const d = drag.current;
              setView({
                ...d.view,
                x: d.view.x - (e.clientX - d.x) / d.width,
                y: d.view.y - (e.clientY - d.y) / d.height,
              });
            }}
            onPointerUp={() => {
              drag.current = null;
            }}
            onPointerCancel={() => {
              drag.current = null;
            }}
          >
            <defs>
              <radialGradient id="system-glow">
                <stop offset="0%" stopColor="#c1ee96" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#c1ee96" stopOpacity="0" />
              </radialGradient>
            </defs>
            {game.routes.map((route) => {
              const a = systems.get(route.from)!;
              const b = systems.get(route.to)!;
              const from = position(a);
              const to = position(b);
              const active = a.id === selected.id || b.id === selected.id;
              const dim =
                region && a.regionId !== region && b.regionId !== region;
              return (
                <line
                  key={route.id}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={active ? '#b5dc94' : '#66829c'}
                  strokeOpacity={dim ? 0.035 : active ? 0.65 : 0.2}
                  strokeWidth={active ? 1.2 : 0.8}
                  strokeDasharray={
                    a.regionId === b.regionId ? undefined : '3 5'
                  }
                />
              );
            })}
            {game.systems.map((s) => {
              const p = position(s);
              const active = selected.id === s.id;
              const dim = !!region && s.regionId !== region;
              return (
                <g
                  key={s.id}
                  data-node="true"
                  transform={`translate(${p.x},${p.y})`}
                  opacity={dim ? 0.15 : 1}
                  tabIndex={0}
                  role="button"
                  aria-label={`${s.known ? s.name : '未识别星系'} ${s.id}`}
                  onClick={() => select(s)}
                  onDoubleClick={() => {
                    select(s);
                    onSystemView(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      select(s);
                    }
                  }}
                  className="star-node"
                >
                  {s.known && <circle r={20} fill="url(#system-glow)" />}
                  <circle r={12} fill="transparent" />
                  {active && (
                    <>
                      <circle
                        r={9}
                        stroke="#b9ee91"
                        strokeWidth="0.7"
                        fill="none"
                      />
                      <path
                        d="M-12 0h-4M12 0h4M0-12v-4M0 12v4"
                        stroke="#b9ee91"
                        strokeWidth="0.7"
                      />
                    </>
                  )}
                  <circle
                    r={s.known ? 3.4 : 2.1}
                    fill={s.known ? '#caeeac' : active ? '#e3f2d6' : '#90a5bb'}
                  />
                  {labels && (
                    <text
                      y={17}
                      textAnchor="middle"
                      fill={s.known ? '#c3d9b5' : '#75899d'}
                      fontSize="6.3"
                      letterSpacing="0.7"
                    >
                      {s.known ? s.name : s.id}
                    </text>
                  )}
                </g>
              );
            })}
            {game.regions.map((r) => {
              const p = position({ x: r.x, y: r.y + 16 });
              return (
                <g
                  key={r.id}
                  className="region-label"
                  opacity={region && region !== r.id ? 0.3 : 1}
                >
                  <rect
                    x={p.x - 52}
                    y={p.y - 11}
                    width={104}
                    height={22}
                    rx={11}
                    fill="#111d28"
                    stroke="#2c3d49"
                    strokeWidth="0.65"
                  />
                  <text
                    x={p.x}
                    y={p.y + 3.5}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#d5e0e5"
                    letterSpacing="2"
                  >
                    {r.name}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
        <div className="map-coordinate">
          {systemView ? 'ORBITAL VIEW' : 'GALACTIC VIEW'}
          <span>
            {systemView
              ? '局部空间 / 中心恒星 (0, 0)'
              : 'GLOBAL X 0–100 / Y 0–100'}
          </span>
        </div>
        <div className="map-controls">
          {!systemView && (
            <>
              <button
                className="icon-button"
                aria-label="放大星图"
                onClick={() => zoom(0.8)}
              >
                <Plus size={16} />
              </button>
              <button
                className="icon-button"
                aria-label="缩小星图"
                onClick={() => zoom(1.25)}
              >
                <Minus size={16} />
              </button>
            </>
          )}
          <button
            className="icon-button"
            aria-label="返回母星"
            onClick={() => {
              const home = systems.get(game.homeSystemId)!;
              onSelect(home);
              onPlanet(game.homePlanetId);
              onSystemView(true);
              reset();
            }}
          >
            <LocateFixed size={16} />
          </button>
          {!systemView && (
            <button className="reset-map" onClick={reset}>
              复位
            </button>
          )}
        </div>
      </div>
      <div className="map-legend">
        <span>
          <i className="legend-dot known" />
          已知星系
        </span>
        <span>
          <i className="legend-dot" />
          未识别星系
        </span>
        <span>
          <i className="legend-line" />
          星系航线
        </span>
        <span className="map-help">
          {systemView ? '选择天体，查看详情' : '拖动平移 · 双击星系进入'}
        </span>
      </div>
    </section>
  );
}
