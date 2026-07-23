import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const base = path.resolve(__dirname, '..');

const json = JSON.parse(fs.readFileSync(base + '/docs/评分表与考站配置_完整数据.json', 'utf8'));
const platformScheme = json.schemes.find(s => s.type === 'platform');

// ===== Generate IDs for all entities =====

// 1. Score table templates (already have code: TPL-STD ~ TPL-STD-7)
const templates = Object.values(json.scoreTemplates).map(tpl => ({
  id: tpl.code,
  name: tpl.name,
  description: tpl.description,
  totalScore: tpl.totalScore,
  categories: tpl.categories.map(cat => ({
    name: cat.name,
    maxScore: cat.maxScore,
    weight: cat.weight,
    items: cat.items.map(item => ({
      name: item.name,
      maxScore: item.maxScore
    })),
    grading: {
      excellent: { label: cat.grading.excellent.label, description: cat.grading.excellent.description, score: cat.grading.scores.excellent },
      good: { label: cat.grading.good.label, description: cat.grading.good.description, score: cat.grading.scores.good },
      pass: { label: cat.grading.pass.label, description: cat.grading.pass.description, score: cat.grading.scores.pass },
      fail: { label: cat.grading.fail.label, description: cat.grading.fail.description, score: cat.grading.scores.fail }
    }
  }))
}));

// 2. Stations - collect all unique station configs with generated IDs
const stationMap = new Map();
let stationIdCounter = 0;

function stationKey(station) {
  const projStr = station.projects.map(p => p.name + ':' + p.score).sort().join('|');
  const tblStr = (station.scoreTables || []).map(t => t.templateCode).sort().join('|');
  return station.name + '||' + projStr + '||' + tblStr;
}

for (const major of platformScheme.majors) {
  if (!major.stations) continue;
  for (const station of major.stations) {
    const key = stationKey(station);
    if (!stationMap.has(key)) {
      stationIdCounter++;
      stationMap.set(key, {
        id: 'ST-' + String(stationIdCounter).padStart(3, '0'),
        name: station.name,
        duration: station.duration,
        totalScore: station.projects.reduce((s, p) => s + p.score, 0),
        projects: station.projects.map(p => ({ name: p.name, score: p.score })),
        scoreTableRefs: (station.scoreTables || []).map(st => ({
          templateCode: st.templateCode,
          templateName: st.name,
          bindProjects: st.bindProjects
        }))
      });
    }
  }
}

// 3. Specialties → Station mapping
const specialties = [];
for (const major of platformScheme.majors) {
  if (!major.stations || major.stations.length === 0) continue;

  const stationRefs = [];
  for (const station of major.stations) {
    const key = stationKey(station);
    const st = stationMap.get(key);
    if (st) {
      stationRefs.push({
        stationId: st.id,
        stationName: st.name,
        // Project-to-template mapping for THIS specialty's station
        projectTemplateMap: station.scoreTables.map(tbl => ({
          templateCode: tbl.templateCode,
          bindProjects: tbl.bindProjects
        }))
      });
    }
  }

  specialties.push({
    name: major.name,
    stations: stationRefs
  });
}

// ===== Assemble import document =====
const importData = {
  _meta: {
    generatedAt: new Date().toISOString(),
    description: 'AI-SP 考站配置与评分表导入数据 — 含完整关联关系',
    version: '2.0',
    importOrder: ['1.先导入 scoreTemplates', '2.再导入 stations', '3.最后导入 specialtyStationLinks'],
    relationDiagram: `
      scoreTemplates (id=templateCode)
           ↑
           │ templateCode (FK)
           │
      stations.scoreTableRefs[] ──→ scoreTemplates
           ↑
           │ stationId (FK)
           │
      specialtyStationLinks[specialty].stations[].stationId ──→ stations

      评分表文件与考站的关联:
      - 每个评分表Excel文件对应一个 (specialty + station) 组合
      - 文件名格式: {specialty}-{stationName}.xlsx
      - 文件内的评分项按 templateCode 分组，可与 scoreTemplates 交叉验证
    `
  },

  // Layer 1: 评分表模板（独立实体，先导入）
  scoreTemplates: templates,

  // Layer 2: 考站配置（引用模板，后导入）
  stations: [...stationMap.values()],

  // Layer 3: 专业→考站关联（引用考站，最后导入）
  specialtyStationLinks: specialties,

  // 交叉索引：专业名 → 考站 → 评分表文件路径
  fileIndex: platformScheme.majors
    .filter(m => m.stations && m.stations.length > 0)
    .map(m => ({
      specialty: m.name,
      files: m.stations.map(s => ({
        fileName: m.name + '-' + s.name + '.xlsx',
        stationName: s.name,
        templateCodes: (s.scoreTables || []).map(t => t.templateCode)
      }))
    }))
};

fs.writeFileSync(
  base + '/docs/考站与评分表导入数据.json',
  JSON.stringify(importData, null, 2),
  'utf8'
);

console.log('Done: docs/考站与评分表导入数据.json');
console.log('  Templates: ' + templates.length);
console.log('  Stations: ' + stationMap.size);
console.log('  Specialties: ' + specialties.length);
