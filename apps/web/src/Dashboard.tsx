import { Dialog } from './Dialog';
import { useState } from 'react';
import {
  Orbit,
  Map as MapIcon,
  Globe2,
  Rocket,
  ArrowUpRight,
  ChevronRight,
  Coins,
  Radio,
  Shield,
  Crosshair,
  Gauge,
  Package,
  Layers3,
  LockKeyhole,
  LocateFixed,
  Compass,
  BookOpen,
  X,
  ChevronDown,
} from 'lucide-react';
import { StarMap } from './StarMap';
import type { Game } from './api';
import ores from '../../../packages/game-data/ores.json';
import type { VisibleSystem } from '../../../packages/game-core/src/world';
const oreNames = new Map(ores.map((o) => [o.id, o.name]));
const number = (n: number) => n.toLocaleString('zh-CN');
export function Dashboard({
  game,
  name,
  onBack,
}: {
  game: Game;
  name: string;
  onBack: () => void;
}) {
  const [tab, setTab] = useState<'map' | 'colony' | 'fleet'>('map');
  const [selected, setSelected] = useState<VisibleSystem>(
    game.systems.find((s) => s.id === game.homeSystemId)!,
  );
  const [systemView, setSystemView] = useState(false);
  const [planetId, setPlanetId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [help, setHelp] = useState(false);
  const homeSystem = game.systems.find((s) => s.id === game.homeSystemId)!;
  const home = homeSystem.planets.find(
    (p) => p.id === game.homePlanetId,
  )!.details!;
  const planet = selected.planets.find((p) => p.id === planetId);
  const star = planetId === selected.star.id;
  const selectedRegion = game.regions.find((r) => r.id === selected.regionId)!;
  const adjacent = game.routes.filter(
    (r) => r.from === selected.id || r.to === selected.id,
  );
  const bodies = game.systems.reduce((sum, s) => sum + s.planets.length + 1, 0);
  function enterHome() {
    setTab('map');
    setSelected(homeSystem);
    setPlanetId(game.homePlanetId);
    setSystemView(true);
  }
  return (
    <div className="dashboard">
      <aside className="sidebar">
        <a
          className="sidebar-logo"
          href="#"
          aria-label="宇宙殖民，返回存档"
          onClick={(e) => {
            e.preventDefault();
            onBack();
          }}
        >
          <span className="brand-mark">
            <Orbit size={23} />
          </span>
          <span>
            宇宙殖民<small>COSMIC COLONY</small>
          </span>
        </a>
        <div className="sidebar-section">指挥中心</div>
        <nav>
          {(
            [
              { id: 'map', label: '星际地图', icon: MapIcon },
              { id: 'colony', label: '我的殖民地', icon: Globe2 },
              { id: 'fleet', label: '舰船档案', icon: Rocket },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              aria-label={item.label}
              className={`nav-item ${tab === item.id ? 'selected' : ''}`}
              onClick={() => setTab(item.id)}
            >
              <item.icon size={19} />
              <span>{item.label}</span>
              {item.id === 'colony' ? (
                <small>1</small>
              ) : item.id === 'fleet' ? (
                <small>2</small>
              ) : (
                <ChevronRight size={14} />
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-separator" />
        <div className="sidebar-section">远征支持</div>
        <button
          className="nav-item"
          aria-label="探索指南"
          onClick={() => setHelp(true)}
        >
          <BookOpen size={18} />
          <span>探索指南</span>
          <ArrowUpRight size={14} />
        </button>
        <div className="sidebar-bottom">
          <div className="expedition-card">
            <div className="eyebrow">
              <span className="live-dot" />
              远征进行中
            </div>
            <strong>{game.save.name}</strong>
            <span>一个宇宙，无数种可能。</span>
            <div className="tiny-star">✧</div>
          </div>
          <button
            className="commander-button"
            aria-label={`${name} 存档与账户`}
            onClick={onBack}
          >
            <span className="avatar">{name.slice(0, 1).toUpperCase()}</span>
            <span>
              <strong>{name}</strong>
              <small>存档与账户</small>
            </span>
            <ChevronRight size={16} />
          </button>
          <div className="sidebar-version">
            先行探索版 <span>v0.2.0</span>
          </div>
        </div>
      </aside>
      <div className="dashboard-main">
        <header className="dashboard-header">
          <div className="breadcrumb">
            指挥中心 <ChevronRight size={12} />
            <span>
              {tab === 'map'
                ? '星际地图'
                : tab === 'colony'
                  ? '我的殖民地'
                  : '舰船档案'}
            </span>
          </div>
          <div className="header-right">
            <span className="connection">
              <span className="live-dot" />
              已连接
            </span>
            <span className="header-divider" />
            <span className="currency">
              <Coins size={17} />
              {number(game.player.credits)}
              <small>星币</small>
            </span>
            <button
              className="header-profile"
              aria-label="返回存档与账户"
              onClick={onBack}
            >
              <span className="avatar">{name.slice(0, 1).toUpperCase()}</span>
              <ChevronDown size={13} />
            </button>
          </div>
        </header>
        <main className="dashboard-content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                {tab === 'map'
                  ? 'EXPLORE THE UNKNOWN'
                  : tab === 'colony'
                    ? 'A NEW HOME AMONG THE STARS'
                    : 'YOUR FIRST EXPEDITION'}
              </p>
              <h1>
                {tab === 'map'
                  ? '每一颗星辰，都是新的可能。'
                  : tab === 'colony'
                    ? '让文明，在这里扎根。'
                    : '你的舰队，蓄势待发。'}
              </h1>
              <p className="muted">
                {tab === 'map'
                  ? '跨越九大星域，寻找下一段旅程的方向。'
                  : tab === 'colony'
                    ? '母星是你的起点，也将是未来工业与探索的支点。'
                    : '了解你的初始舰船，为未来的星际远征做好准备。'}
              </p>
            </div>
            <button className="quiet home-button" onClick={enterHome}>
              <LocateFixed size={16} />
              返回母星
              <ArrowUpRight size={15} />
            </button>
          </div>
          <div className="overview-stats">
            <Stat
              label="已知星系 / 全部星系"
              value={`1 / ${game.systems.length}`}
              icon={<Compass size={19} />}
              detail="九大星域"
            />
            <Stat
              label="我的殖民地"
              value={`1 / ${game.player.planetCap}`}
              icon={<Globe2 size={19} />}
              detail="新曙光 · 母星"
            />
            <Stat
              label="初始舰船"
              value={`2 / ${game.player.shipCap}`}
              icon={<Rocket size={19} />}
              detail="侦察舰 ×1 · 战斗舰 ×1"
            />
            <Stat
              label="指挥官等级"
              value="LV. 1"
              icon={<Shield size={19} />}
              detail={`0 / ${game.player.nextXP} XP`}
            />
          </div>
          {tab === 'map' ? (
            <>
              <div className="workspace-heading">
                <div>
                  <span className="section-dot" />
                  <h2>{systemView ? '星系空间' : '银河全览'}</h2>
                  <span className="count-chip">
                    {systemView
                      ? `${selected.planets.length + 1} 个天体`
                      : `${game.systems.length} 个星系`}
                  </span>
                </div>
                <span className="small muted">
                  <Radio size={13} />
                  星图记录已同步
                </span>
              </div>
              <div className={`map-workspace ${expanded ? 'full-map' : ''}`}>
                <StarMap
                  game={game}
                  selected={selected}
                  onSelect={setSelected}
                  systemView={systemView}
                  onSystemView={setSystemView}
                  planetId={planetId}
                  onPlanet={setPlanetId}
                  expanded={expanded}
                  onExpand={() => setExpanded(!expanded)}
                />
                {!expanded && (
                  <aside className="detail-panel">
                    <div className="detail-heading">
                      <span className="eyebrow">
                        {systemView ? 'CELESTIAL BODY' : 'SYSTEM INTELLIGENCE'}
                      </span>
                      <span
                        className={`status-pill ${planet?.known || (!systemView && selected.known) ? 'green' : ''}`}
                      >
                        {planet?.known
                          ? '已知 · 已占领'
                          : !systemView && selected.known
                            ? '已知星系'
                            : star
                              ? '中心恒星'
                              : '未知区域'}
                      </span>
                    </div>
                    {systemView && planet ? (
                      <>
                        <div className="planet-portrait">
                          <div
                            className={`planet sphere-${planet.known ? 1 : 4} ${planet.known ? '' : 'unknown-planet'}`}
                          />
                          {!planet.known && <LockKeyhole size={24} />}
                        </div>
                        <p className="detail-code">{planet.id}</p>
                        <h2>{planet.details?.name || '未知行星'}</h2>
                        <p className="muted small">
                          {selectedRegion.name} / {selected.id}
                        </p>
                        <div className="detail-divider" />
                        {planet.details ? (
                          <>
                            <div className="detail-grid">
                              <Detail
                                label="星球尺寸"
                                value={`${planet.details.size} / ${planet.details.sizeScore}`}
                              />
                              <Detail
                                label="建筑槽位"
                                value={`${planet.details.slots} 槽`}
                              />
                              <Detail
                                label="局部坐标"
                                value={`${planet.localX}, ${planet.localY}`}
                              />
                              <Detail label="归属" value="你的殖民地" />
                            </div>
                            <div className="detail-divider" />
                            <h3>
                              矿藏概况{' '}
                              <span>{planet.details.resources.length} 种</span>
                            </h3>
                            <div className="resource-list">
                              {planet.details.resources.map((r) => (
                                <div key={r.id}>
                                  <span>
                                    <i className={`ore-dot ore-${r.id}`} />
                                    {oreNames.get(r.id)}
                                  </span>
                                  <b>{number(r.amount)}</b>
                                </div>
                              ))}
                            </div>
                            <button
                              className="primary"
                              onClick={() => setTab('colony')}
                            >
                              管理母星
                              <ArrowUpRight size={15} />
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="detail-grid">
                              <Detail label="可见状态" value="尚未发现" />
                              <Detail
                                label="局部坐标"
                                value={`${planet.localX}, ${planet.localY}`}
                              />
                            </div>
                            <div className="intel-notice">
                              <LockKeyhole size={17} />
                              <p>
                                这颗行星的名称、矿藏、槽位与占领情报仍未揭示。未来可通过侦察获得情报。
                              </p>
                            </div>
                          </>
                        )}
                      </>
                    ) : systemView && star ? (
                      <>
                        <div className="star-portrait">
                          <span>✦</span>
                        </div>
                        <p className="detail-code">{selected.star.id}</p>
                        <h2>中心恒星</h2>
                        <p className="muted small">
                          {selectedRegion.name} / {selected.id}
                        </p>
                        <div className="detail-divider" />
                        <div className="detail-grid">
                          <Detail label="天体类型" value="恒星" />
                          <Detail label="局部坐标" value="0, 0" />
                          <Detail label="可见状态" value="位置可见" />
                        </div>
                        <div className="intel-notice">
                          <Radio size={17} />
                          <p>
                            星系的中心参照天体。当前不参与资源开采、战斗与殖民。
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="system-emblem">
                          <Orbit size={64} strokeWidth={0.7} />
                          <span className="emblem-dot" />
                        </div>
                        <p className="detail-code">{selected.id}</p>
                        <h2>{selected.known ? selected.name : '未识别星系'}</h2>
                        <p className="muted small">
                          {selectedRegion.name} ·{' '}
                          {selected.known
                            ? '母星所在星系'
                            : '坐标已记录，详情待探索'}
                        </p>
                        <div className="detail-divider" />
                        <div className="detail-grid">
                          <Detail
                            label="星域归属"
                            value={selectedRegion.name}
                          />
                          <Detail
                            label="天体数量"
                            value={`${selected.planets.length + 1} 个`}
                          />
                          <Detail
                            label="银河坐标"
                            value={`${selected.x}, ${selected.y}`}
                          />
                          <Detail
                            label="相连航线"
                            value={`${adjacent.length} 条`}
                          />
                        </div>
                        <div className="detail-divider" />
                        <h3>
                          可用航线 <span>{adjacent.length}</span>
                        </h3>
                        <div className="route-list">
                          {adjacent.map((r) => {
                            const target = game.systems.find(
                              (s) =>
                                s.id ===
                                (r.from === selected.id ? r.to : r.from),
                            )!;
                            return (
                              <button
                                key={r.id}
                                onClick={() => {
                                  setSelected(target);
                                  setPlanetId(null);
                                }}
                              >
                                <span>
                                  <i />
                                  {target.id}
                                </span>
                                <small>{r.distanceUnits.toFixed(1)} DU</small>
                                <ChevronRight size={12} />
                              </button>
                            );
                          })}
                        </div>
                        <button
                          className="primary"
                          onClick={() => {
                            setSystemView(true);
                            setPlanetId(
                              selected.id === game.homeSystemId
                                ? game.homePlanetId
                                : selected.star.id,
                            );
                          }}
                        >
                          进入星系
                          <ArrowUpRight size={16} />
                        </button>
                        <p className="small detail-note">
                          查看星系内天体 · 不会派遣舰船
                        </p>
                      </>
                    )}
                  </aside>
                )}
              </div>
              <div className="map-summary">
                <span>
                  <Globe2 size={14} />
                  {bodies} 个天体已生成
                </span>
                <span>
                  <Layers3 size={14} />
                  {game.routes.length} 条星系航线
                </span>
                <span className="summary-right">
                  <Shield size={13} />
                  同一存档，始终是同一片星空
                </span>
              </div>
            </>
          ) : tab === 'colony' ? (
            <div className="colony-layout">
              <article className="colony-main panel">
                <div className="colony-banner">
                  <div className="planet sphere-1" />
                  <span className="status-pill green">母星 · 已占领</span>
                  <div>
                    <p className="eyebrow">HOME COLONY / {home.id}</p>
                    <h2>新曙光</h2>
                    <p>人类在这片宇宙的第一个家。</p>
                  </div>
                </div>
                <div className="colony-specs">
                  <Detail label="尺寸评分" value="Medium · 120" />
                  <Detail label="建筑槽位" value="7 槽" />
                  <Detail label="所属星域" value={game.regions[0].name} />
                  <Detail
                    label="星球坐标"
                    value={`${home.localX}, ${home.localY}`}
                  />
                </div>
                <div className="panel-title">
                  <h3>地表设施</h3>
                  <span className="small muted">3 / 7 槽</span>
                </div>
                <div className="facility-grid">
                  {['矿井', '燃料厂', '仓储站', '', '', '', ''].map(
                    (facility, i) => (
                      <div
                        key={i}
                        className={`facility ${facility ? '' : 'empty'}`}
                      >
                        {facility ? <Layers3 size={23} /> : <PlusIcon />}
                        <strong>{facility || '空闲槽位'}</strong>
                        <span>
                          {facility ? 'E 级 · 初始设施' : `SLOT 0${i + 1}`}
                        </span>
                      </div>
                    ),
                  )}
                </div>
                <p className="phase-note">
                  当前版本可查看初始设施；生产、加油与建造将在后续版本开放。
                </p>
              </article>
              <aside className="panel colony-resources">
                <h3>矿藏分布</h3>
                <p className="muted small">铁矿与铀矿为母星保障矿种。</p>
                {home.resources.map((r) => (
                  <div className="resource-detail" key={r.id}>
                    <div>
                      <span>
                        <i className={`ore-dot ore-${r.id}`} />
                        {oreNames.get(r.id)}
                      </span>
                      <b>{number(r.amount)}</b>
                    </div>
                    <div className="bar">
                      <span
                        style={{
                          width: `${(100 * r.amount) / home.resources.reduce((sum, o) => sum + o.amount, 0)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
                <button className="quiet full-width" onClick={enterHome}>
                  在星图中查看
                  <ArrowUpRight size={15} />
                </button>
              </aside>
            </div>
          ) : (
            <div className="fleet-grid">
              {game.ships.map((ship, i) => (
                <article className="ship-card panel" key={ship.id}>
                  <div className="ship-art">
                    <svg viewBox="0 0 300 170" aria-hidden="true">
                      <defs>
                        <linearGradient
                          id={`ship-${i}`}
                          x1="0"
                          y1="0"
                          x2="1"
                          y2="1"
                        >
                          <stop stopColor={i ? '#c1bba4' : '#a2c4c5'} />
                          <stop offset="1" stopColor="#273944" />
                        </linearGradient>
                      </defs>
                      <path
                        d={
                          i
                            ? 'M150 12 170 63 205 82 230 138 182 120 166 145 134 145 118 120 70 138 95 82 130 63Z'
                            : 'M150 12 166 83 210 119 195 137 163 117 156 147 144 147 137 117 105 137 90 119 134 83Z'
                        }
                        fill={`url(#ship-${i})`}
                        stroke="#c6dfd5"
                        strokeWidth="0.7"
                      />
                      <path
                        d="M150 30v90M137 87h26M145 128l5 15 5-15"
                        stroke="#b7ee94"
                        fill="none"
                      />
                      <ellipse
                        cx="150"
                        cy="155"
                        rx="9"
                        ry="3"
                        fill="#b9ee91"
                        opacity=".5"
                      />
                    </svg>
                    <span className="ship-grade">E CLASS</span>
                  </div>
                  <div className="ship-card-heading">
                    <div>
                      <p className="eyebrow">
                        {ship.role === '侦察'
                          ? 'RECONNAISSANCE'
                          : 'COMBAT VESSEL'}
                      </p>
                      <h2>{ship.role === '侦察' ? '先驱号' : '守望号'}</h2>
                      <p className="muted small">
                        E 级小型{ship.role}舰 · 新曙光
                      </p>
                    </div>
                    <span className="status-pill green">已停靠</span>
                  </div>
                  <div className="hp-label">
                    <span>船体耐久</span>
                    <b>
                      {ship.hp} / {ship.hp}
                    </b>
                  </div>
                  <div className="bar">
                    <span style={{ width: '100%' }} />
                  </div>
                  <div className="ship-stats">
                    <Detail
                      label="基础装甲"
                      value={String(ship.armor)}
                      icon={<Shield size={15} />}
                    />
                    <Detail
                      label="基础速度"
                      value={String(ship.speed)}
                      icon={<Gauge size={15} />}
                    />
                    <Detail
                      label="货舱容量"
                      value={String(ship.cargo)}
                      icon={<Package size={15} />}
                    />
                    <Detail
                      label="武器挂点"
                      value={String(ship.weaponSlots)}
                      icon={<Crosshair size={15} />}
                    />
                  </div>
                  <div className="ship-footer">
                    <span>{ship.armorType}永久基础护甲</span>
                    <span>装甲板槽 {ship.plateSlots}</span>
                  </div>
                </article>
              ))}
              <p className="phase-note">
                初始舰船已随存档配置。装备、编队、航行与战斗将在后续版本开放。
              </p>
            </div>
          )}
        </main>
        <footer className="dashboard-footer">
          <span>
            <span className="live-dot" />
            存档已保存
          </span>
          <span>
            {game.save.name} / SAVE {game.save.saveVersion} /{' '}
            {game.save.dataVersion}
          </span>
        </footer>
      </div>
      {help && (
        <Dialog
          titleId="help-title"
          onClose={() => setHelp(false)}
          className="help-modal"
        >
          <button
            className="modal-close icon-button"
            onClick={() => setHelp(false)}
            aria-label="关闭指南"
          >
            <X size={18} />
          </button>
          <span className="eyebrow">FIELD GUIDE / 01</span>
          <h2 id="help-title">读懂你的第一张星图</h2>
          <ol>
            <li>
              <strong>银河层，观察全局。</strong>
              <p>
                九大星域只表示星系归属。实线是区域内航线，虚线是跨区域航线；没有连接的星系不能直接通行。
              </p>
            </li>
            <li>
              <strong>选择星系，进入轨道。</strong>
              <p>
                点击圆点查看坐标与相邻航线，再点击「进入星系」。也可以直接双击星系。
              </p>
            </li>
            <li>
              <strong>回到母星，熟悉起点。</strong>
              <p>
                新曙光固定拥有七个建筑槽，并保证铁矿与铀矿。选择其他天体可查看已知坐标，未知详情保持隐藏。
              </p>
            </li>
            <li>
              <strong>随时返回，旅程会被记住。</strong>
              <p>
                点击左下角指挥官名称返回存档页。刷新或重新登录不会重新生成宇宙。
              </p>
            </li>
          </ol>
          <button className="primary" onClick={() => setHelp(false)}>
            开始探索
            <ArrowUpRight size={16} />
          </button>
        </Dialog>
      )}
    </div>
  );
}
function Detail({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="detail-item">
      <span>
        {icon}
        {label}
      </span>
      <strong>{value}</strong>
    </div>
  );
}
function Stat({
  label,
  value,
  icon,
  detail,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  detail: string;
}) {
  return (
    <div className="stat-card">
      <span className="stat-icon">{icon}</span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </div>
  );
}
function PlusIcon() {
  return <span className="plus-icon">+</span>;
}
