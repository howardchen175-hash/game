// Versioned design decisions; values missing from authority are explicitly provisional.
export const WORLD_CONFIG = {
  generatorVersion: 'world-2.0.0',
  regions: [
    '曙光星域',
    '天琴星域',
    '远望星域',
    '织女星域',
    '猎户星域',
    '英仙星域',
    '南十字星域',
    '天鹅星域',
    '边陲星域',
  ],
  systemsPerRegion: [10, 15],
  planetsPerSystem: [2, 6],
  slotThresholds: [0, 40, 80, 125, 175, 230, 285],
  // XLSX 成长与容量: sizeScore 25–320 maps to 3,000–30,000; outranks obsolete ×8,000 prose.
  mineralCapacity: { minScore: 25, maxScore: 320, min: 3000, max: 30000 },
  oreWeights: { 常见: 10, 较稀有: 5, 稀有: 2, 罕见: 1 },
  // Provisional: names, planet appearance and ore variety are presentation/generation choices.
  oresPerPlanet: [3, 5],
  start: { sizeScore: 120, slots: 7, credits: 25000, fragments: 0 },
} as const;
