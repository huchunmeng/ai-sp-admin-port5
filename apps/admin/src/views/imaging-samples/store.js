// 影像题库的**会话内**数据源（管理端）
//
// 为什么用模块级 reactive 而不是各页面各持一份：题库列表 → 病例编辑器 → 返回列表 是同一个
// 数据集的两种视图，各持一份会导致"编辑完返回还看到旧值"。共用一份最省事，也最不容易出漂移。
//
// ⚠️ 本期**无服务端**：改动只活在内存里，刷新浏览器即回到静态样本初始态。这是刻意的——
// 真实落库要等院方样本（Q2）与后端接口。接 API 时只换本文件的 loadSamples / upsertSample 实现，
// 页面不动。
//
// 【序列不是"三视图"】`views` 是**每个样本各自声明**的视图列表（1–5 个不等）：MR 按序列分
// （DWI/ADC/T2WI/FLAIR）、增强 CT 按期相分（平扫/动脉期/门脉期/延迟期）、DR 平扫按体位分
// （正位/侧位，每体位 1 帧）。`seriesFrames` 是 `{ [viewKey]: Frame[] }`。

import { reactive } from 'vue'
import {
  IMAGING_SAMPLE_ROWS,
  DEFAULT_VIEWS,
  emptyCapabilities,
  hasGoldStandard,
  scoreableOf
} from '@ai-sp/shared/imaging'

/** 静态帧数 → 占位帧数组（本期无真实图片，仅承载"共 N 帧 / 可拖拽排序 / 翻页"的交互） */
function placeholderFrames(viewKey, count) {
  const single = ['pa', 'lateral'].includes(viewKey)
  const n = single ? Math.min(1, count || 1) : (count || 0)
  return Array.from({ length: n }, (_, i) => ({
    name: `${viewKey}_${String(i + 1).padStart(3, '0')}.jpg`,
    size: 0, url: '', order: i + 1, builtin: true
  }))
}

/** 样本的序列声明：数组原样；早期对象形状 `{axial:62,...}` 转成列表 */
function viewsOf(row) {
  const s = row.series
  if (Array.isArray(s)) return s.map(x => ({ key: x.key, name: x.name, en: x.en }))
  if (s && typeof s === 'object') {
    return Object.keys(s).map(key => {
      const meta = DEFAULT_VIEWS.find(d => d.key === key)
      return meta ? { ...meta } : { key, name: key, en: String(key).toUpperCase() }
    })
  }
  return []
}

function framesOf(row, views) {
  const out = {}
  const s = row.series
  views.forEach(v => {
    const declared = Array.isArray(s)
      ? (s.find(x => x.key === v.key) || {}).frames
      : (s && typeof s === 'object' ? s[v.key] : 0)
    out[v.key] = placeholderFrames(v.key, declared)
  })
  return out
}

function normalize(row) {
  const views = viewsOf(row)
  const caps = { ...emptyCapabilities(), ...(row.capabilities || {}) }
  return {
    ...row,
    capabilities: caps,
    views,
    goldStandard: row.goldStandard ? { ...row.goldStandard } : null,
    seriesFrames: framesOf(row, views)
  }
}

export const sampleStore = reactive({ rows: [], loaded: false })

/** 重算派生量——可评分与落空条目**必须现算**，不得写死（PRD §5.5.1 / data-specs §14.2） */
export function recompute(row) {
  const { max, lost } = scoreableOf(row.id, row.capabilities)
  row.scoreableMax = max
  row.lost = lost
  row.goldStandardRecorded = hasGoldStandard(row)
  // 序列声明按帧数组现算，保证"共 N 帧"与编辑端一致
  row.series = (row.views || []).map(v => ({
    key: v.key, name: v.name, en: v.en,
    frames: ((row.seriesFrames || {})[v.key] || []).length
  }))
  row.viewCount = row.series.length
  row.seriesTotal = row.series.reduce((a, x) => a + x.frames, 0)
  return row
}

/** TODO(接口): 服务端就绪后换为 GET /api/imaging/samples */
export function loadSamples(force = false) {
  if (sampleStore.loaded && !force) return sampleStore.rows
  sampleStore.rows = IMAGING_SAMPLE_ROWS.map(r => normalize({ ...r }))
  sampleStore.rows.forEach(recompute)
  sampleStore.loaded = true
  return sampleStore.rows
}

export function getSample(id) {
  loadSamples()
  return sampleStore.rows.find(r => r.id === id) || null
}

/** 新建空白样本——三段金标准为空、状态草稿、版本 1；序列先给默认三视图模板（可增删） */
export function blankSample() {
  return {
    id: '',
    title: '',
    modality: 'CT',
    bodyPart: '胸部',
    level: 'R1',
    icon: 'fa-image',
    clinicalBrief: '',
    views: DEFAULT_VIEWS.map(v => ({ ...v })),
    series: [],
    seriesFrames: {},
    viewCount: DEFAULT_VIEWS.length,
    seriesTotal: 0,
    deidentify: {
      name: '', ageRange: '', sex: '', dept: '',
      examNo: '', imageNo: '', inpatientNo: '****', cardNo: '****', examTime: ''
    },
    capabilities: emptyCapabilities(),
    goldStandard: null,
    version: 1,
    status: 'draft',
    createdAt: now(), createdBy: '管理端',
    publishedAt: null, updatedAt: now(), updatedBy: '管理端',
    scoreableMax: 100, lost: [], goldStandardRecorded: false
  }
}

/** 新增或原地更新；返回落库后的行 */
export function upsertSample(row) {
  loadSamples()
  recompute(row)
  const i = sampleStore.rows.findIndex(r => r.id === row.id)
  if (i >= 0) sampleStore.rows.splice(i, 1, row)
  else sampleStore.rows.unshift(row)
  return row
}

/** 生成一个不冲突的副本 id（RC-001 → RC-001-C2） */
export function nextCopyId(baseId) {
  loadSamples()
  let n = 1
  let id = `${baseId}-C${n}`
  while (sampleStore.rows.some(r => r.id === id)) { n += 1; id = `${baseId}-C${n}` }
  return id
}

/** 生成新样本 id：IMG-YYYYMMDD-NNN */
export function nextSampleId() {
  loadSamples()
  const d = new Date()
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  let n = 1
  let id = `IMG-${stamp}-${String(n).padStart(3, '0')}`
  while (sampleStore.rows.some(r => r.id === id)) { n += 1; id = `IMG-${stamp}-${String(n).padStart(3, '0')}` }
  return id
}

export function now() {
  return new Date().toISOString().slice(0, 16).replace('T', ' ')
}
