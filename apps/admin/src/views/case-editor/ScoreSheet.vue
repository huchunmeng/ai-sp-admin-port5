<template>
  <div class="ss-root">
    <!-- 2.0 考站评分点（有考站方案） -->
    <template v-if="stationScores && stationScores.stations && stationScores.stations.length > 0">
      <div class="ss-header">
        <h3>评分表（考站配置）</h3>
        <span v-if="stationScores.scheme_name" class="ss-scheme-tag">方案：{{ stationScores.scheme_name }}</span>
      </div>

      <div v-for="(station, si) in stationScores.stations" :key="si" class="station-block">
        <div class="station-header" @click="toggleStation(si)">
          <div class="station-title">
            <i class="fas" :class="collapsedStations[si] ? 'fa-chevron-right' : 'fa-chevron-down'"></i>
            <strong>{{ station.station_name }}</strong>
            <span class="station-duration">{{ station.duration }} 分钟</span>
          </div>
          <span class="station-total" :class="{ 'score-ok': stationTotal(si) === 100, 'score-warn': stationTotal(si) !== 100 }">
            总分：{{ stationTotal(si) }}
            <i v-if="stationTotal(si) === 100" class="fas fa-check-circle" style="color:#22c55e;margin-left:4px;"></i>
            <i v-else class="fas fa-exclamation-circle" style="color:#f59e0b;margin-left:4px;"></i>
          </span>
        </div>

        <div v-show="!collapsedStations[si]" class="station-body">
          <!-- 评分表文件引用 -->
          <div v-if="station.score_tables && station.score_tables.length > 0" class="score-table-refs">
            <span style="font-size:12px;color:var(--text-secondary);">绑定评分表：</span>
            <span v-for="(st, sti) in station.score_tables" :key="sti" class="ref-tag">
              <i class="fas fa-file-alt"></i> {{ st.fileName || st.name }}
            </span>
          </div>

          <!-- 评分点按项目 -->
          <div v-for="(points, projName) in station.projects" :key="projName" class="project-section">
            <div class="project-header">
              <h5>{{ projName }}</h5>
              <span class="project-subtotal">{{ projectSubtotal(points) }} 分</span>
            </div>
            <div class="points-list">
              <div v-for="(p, pi) in points" :key="pi" class="point-row">
                <span class="point-num">{{ pi + 1 }}</span>
                <input class="point-input" :value="p.point"
                  @change="updatePoint(si, projName, pi, 'point', $event.target.value)"
                  placeholder="评分点描述">
                <span class="point-score-label">分值</span>
                <input class="point-score" type="number" :value="p.score" step="0.5" min="0"
                  @change="updatePoint(si, projName, pi, 'score', parseFloat($event.target.value) || 0)">
                <button class="btn-del" @click="deletePoint(si, projName, pi)" title="删除">×</button>
              </div>
            </div>
            <button class="btn btn-sm btn-outline" @click="addPoint(si, projName)" style="margin-top:4px;">
              <i class="fa-solid fa-plus"></i> 添加评分点
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- 2.0 领域评分点（无考站方案时，按领域展示） -->
    <template v-else-if="pointsByDomain && Object.keys(pointsByDomain).some(k => pointsByDomain[k] && pointsByDomain[k].length > 0)">
      <div class="ss-header">
        <h3>评分点（按领域）</h3>
        <span class="ss-scheme-tag">未绑定考站方案</span>
      </div>

      <div v-for="(displayName, domain) in DOMAIN_LABELS" :key="domain">
        <div v-if="pointsByDomain[domain] && pointsByDomain[domain].length > 0" class="station-block">
          <div class="station-header" @click="toggleDomain(domain)">
            <div class="station-title">
              <i class="fas" :class="collapsedDomains[domain] ? 'fa-chevron-right' : 'fa-chevron-down'"></i>
              <strong>{{ displayName }}</strong>
              <span class="station-duration">{{ pointsByDomain[domain].length }} 项</span>
            </div>
            <span class="station-total">{{ domainSubtotal(domain) }} 分</span>
          </div>
          <div v-show="!collapsedDomains[domain]" class="station-body">
            <div class="points-list">
              <div v-for="(p, pi) in pointsByDomain[domain]" :key="pi" class="point-row">
                <span class="point-num">{{ pi + 1 }}</span>
                <input class="point-input" :value="p.point"
                  @change="updateDomainPoint(domain, pi, 'point', $event.target.value)"
                  placeholder="评分点描述">
                <span class="point-score-label">分值</span>
                <input class="point-score" type="number" :value="p.score" step="0.5" min="0"
                  @change="updateDomainPoint(domain, pi, 'score', parseFloat($event.target.value) || 0)">
                <button class="btn-del" @click="deleteDomainPoint(domain, pi)" title="删除">×</button>
              </div>
            </div>
            <button class="btn btn-sm btn-outline" @click="addDomainPoint(domain)" style="margin-top:4px;">
              <i class="fa-solid fa-plus"></i> 添加评分点
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- 1.0 扁平评分表 -->
    <template v-else>
      <div class="ss-header">
        <h3>评分表<span v-if="templateName" style="font-size:12px;color:var(--text-secondary);font-weight:400;margin-left:8px;">— 模板：{{ templateName }}</span></h3>
        <div class="ss-header-right">
          <span class="ss-total">共 <strong>{{ items.length }}</strong> 项</span>
        </div>
      </div>

      <div v-if="items.length === 0" class="empty-state">
        <i class="fa-solid fa-table-list"></i>
        <p>暂无评分项，请先生成基础信息后自动生成评分表</p>
      </div>

      <div v-else class="ss-table-wrap">
        <table class="ss-table">
          <thead>
            <tr>
              <th style="width:40px">序号</th>
              <th style="width:80px">类别</th>
              <th>评分项</th>
              <th style="width:80px">评分项分值（{{ legacyGroupTotal }}）</th>
              <th>评分要点</th>
              <th style="width:60px">要点分值（{{ legacyScoreTotal }}）</th>
              <th>评分规则</th>
              <th style="width:50px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, idx) in items" :key="item.id || idx">
              <td class="td-num">{{ idx + 1 }}</td>
              <td v-if="categorySpans[idx] > 0" :rowspan="categorySpans[idx]" class="td-merged">{{ item.category }}</td>
              <td v-if="itemSpans[idx] > 0" :rowspan="itemSpans[idx]" class="td-merged" :title="item.item">{{ item.item }}</td>
              <td v-if="itemSpans[idx] > 0" :rowspan="itemSpans[idx]" class="td-merged cell-num">{{ item.score }}</td>
              <td><textarea class="cell-input cell-textarea" :value="item.key_point" @input="updateLegacyItem(idx, 'key_point', $event.target.value); autoResize($event.target)" placeholder="评分要点"></textarea></td>
              <td><input class="cell-input cell-num" type="number" :value="item.score" step="0.5" min="0" @change="updateLegacyItem(idx, 'score', parseFloat($event.target.value) || 0)"></td>
              <td><textarea class="cell-input cell-textarea" :value="item.rules" @input="updateLegacyItem(idx, 'rules', $event.target.value); autoResize($event.target)" placeholder="评分规则"></textarea></td>
              <td style="white-space:nowrap">
                <button class="btn-add-row" @click="insertLegacyItemAfter(idx)" title="在下方插入">+</button>
                <button class="btn-del" @click="deleteLegacyItem(idx)" title="删除"><i class="fas fa-trash-can"></i></button>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="ss-total-row">
              <td class="td-num" colspan="3" style="text-align:right;font-weight:600;font-size:12px;">合计</td>
              <td class="td-merged cell-num" style="font-weight:600;">{{ legacyGroupTotal }}</td>
              <td></td>
              <td class="cell-num" style="font-weight:600;">{{ legacyScoreTotal }}</td>
              <td colspan="2"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, watch, ref } from 'vue'
import { SCORE_SHEET_TEMPLATES } from '@/data/templates/index.js'

const props = defineProps({
  modelValue: { type: [Array, Object], default: () => [] },
  stationScores: { type: Object, default: null },
  templateCode: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue', 'update:stationScores'])

const DOMAIN_LABELS = {
  history: '病史采集',
  physical_exam: '体格检查',
  diagnosis: '初步诊断',
  communication: '人文沟通',
  medical_record: '病历书写',
  case_analysis: '病例分析'
}

const items = ref(normalizeLegacy(props.modelValue))
const collapsedStations = ref({})
const collapsedDomains = ref({})

const templateName = computed(() => {
  if (!props.templateCode) return ''
  const tpl = SCORE_SHEET_TEMPLATES.find(t => t.code === props.templateCode)
  return tpl ? tpl.name : ''
})

const categorySpans = computed(() => computeRowSpans(items.value, 'category'))
const itemSpans = computed(() => computeRowSpans(items.value, 'item'))

const legacyGroupTotal = computed(() => {
  return items.value.reduce((sum, it) => sum + (it.score || 0), 0)
})

const legacyScoreTotal = computed(() => {
  return items.value.reduce((sum, it) => sum + (it.score || 0), 0)
})

function computeRowSpans(arr, field) {
  const spans = []
  let i = 0
  while (i < arr.length) {
    let j = i + 1
    while (j < arr.length && arr[j][field] === arr[i][field]) j++
    const count = j - i
    for (let k = 0; k < count; k++) spans.push(k === 0 ? count : 0)
    i = j
  }
  return spans
}

// 判断是否是领域评分点格式（无 .stations 但有领域 key）
const pointsByDomain = computed(() => {
  const ss = props.stationScores
  if (!ss || ss.stations) return null
  // 检查是否包含已知领域 key
  const hasDomain = ['history', 'physical_exam', 'diagnosis', 'communication'].some(k => ss[k])
  return hasDomain ? ss : null
})

watch(() => props.modelValue, (val) => { items.value = normalizeLegacy(val) }, { deep: true })

function normalizeLegacy(val) {
  if (Array.isArray(val)) return val
  return []
}

// ── 1.0 操作 ──

function emitLegacyUpdate() {
  emit('update:modelValue', JSON.parse(JSON.stringify(items.value)))
}

function addLegacyItem() {
  const maxId = items.value.reduce((m, it) => Math.max(m, it.id || 0), 0)
  items.value.push({ id: maxId + 1, category: '', item: '', group_score: 5, key_point: '', score: 3, rules: '' })
  emitLegacyUpdate()
}

function updateLegacyItem(idx, field, value) {
  items.value[idx][field] = value
  emitLegacyUpdate()
}

function deleteLegacyItem(idx) {
  items.value.splice(idx, 1)
  emitLegacyUpdate()
}

function insertLegacyItemAfter(idx) {
  const item = items.value[idx]
  const maxId = items.value.reduce((m, it) => Math.max(m, it.id || 0), 0)
  items.value.splice(idx + 1, 0, {
    id: maxId + 1,
    category: item.category,
    item: item.item,
    group_score: item.score,
    key_point: '',
    score: 0,
    rules: ''
  })
  emitLegacyUpdate()
}

function autoResize(el) {
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

// ── 2.0 操作 ──

function toggleStation(si) {
  collapsedStations.value[si] = !collapsedStations.value[si]
}

function stationTotal(si) {
  const station = props.stationScores?.stations?.[si]
  if (!station || !station.projects) return 0
  let total = 0
  for (const points of Object.values(station.projects)) {
    for (const p of points) total += (p.score || 0)
  }
  return Math.round(total * 10) / 10
}

function projectSubtotal(points) {
  return points.reduce((s, p) => s + (p.score || 0), 0)
}

function emitStationUpdate() {
  emit('update:stationScores', JSON.parse(JSON.stringify(props.stationScores)))
}

function updatePoint(si, projName, pi, field, value) {
  const station = props.stationScores.stations[si]
  if (station && station.projects[projName] && station.projects[projName][pi]) {
    station.projects[projName][pi][field] = value
    emitStationUpdate()
  }
}

function deletePoint(si, projName, pi) {
  const station = props.stationScores.stations[si]
  if (station && station.projects[projName]) {
    station.projects[projName].splice(pi, 1)
    emitStationUpdate()
  }
}

function addPoint(si, projName) {
  const station = props.stationScores.stations[si]
  if (station && station.projects[projName]) {
    station.projects[projName].push({ point: '', score: 3 })
    emitStationUpdate()
  }
}

// ── 领域评分点操作 ──

function toggleDomain(domain) {
  collapsedDomains.value[domain] = !collapsedDomains.value[domain]
}

function domainSubtotal(domain) {
  const pts = pointsByDomain.value?.[domain] || []
  return pts.reduce((s, p) => s + (p.score || 0), 0)
}

function emitDomainUpdate() {
  emit('update:stationScores', JSON.parse(JSON.stringify(props.stationScores)))
}

function updateDomainPoint(domain, pi, field, value) {
  if (props.stationScores && props.stationScores[domain] && props.stationScores[domain][pi]) {
    props.stationScores[domain][pi][field] = value
    emitDomainUpdate()
  }
}

function deleteDomainPoint(domain, pi) {
  if (props.stationScores && props.stationScores[domain]) {
    props.stationScores[domain].splice(pi, 1)
    emitDomainUpdate()
  }
}

function addDomainPoint(domain) {
  if (props.stationScores && props.stationScores[domain]) {
    props.stationScores[domain].push({ point: '', score: 3 })
    emitDomainUpdate()
  }
}
</script>

<style scoped>
.ss-root { }
.ss-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }
.ss-header h3 { margin: 0; }
.ss-header-right { display: flex; align-items: center; gap: 12px; }
.ss-total { font-size: 14px; color: var(--text-secondary); }
.ss-total strong { color: var(--primary); font-size: 18px; }
.ss-scheme-tag { font-size: 12px; color: var(--primary); background: var(--primary-light, #eff6ff); padding: 2px 10px; border-radius: 10px; }

/* 1.0 table */
.ss-table-wrap { overflow-x: auto; border: 1px solid #e5e7eb; border-radius: 8px; }
.ss-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.ss-table th { background: #f8fafc; padding: 10px 8px; text-align: center; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb; white-space: nowrap; font-size: 12px; }
.ss-table td { padding: 4px 6px; border-bottom: 1px solid #f3f4f6; }
.ss-table tr:last-child td { border-bottom: none; }
.td-num { text-align: center; color: #9ca3af; font-size: 12px; width: 40px; }
.td-merged { vertical-align: middle; text-align: center; font-size: 13px; color: #374151; font-weight: 500; background: #fafbfc; border-right: 1px solid #e5e7eb; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cell-input { width: 100%; border: 1px solid transparent; background: transparent; padding: 6px 8px; font-size: 13px; color: #303133; border-radius: 4px; outline: none; font-family: inherit; box-sizing: border-box; }
.cell-input:hover { border-color: #d9d9d9; background: #fafafa; }
.cell-input:focus { border-color: var(--primary); background: #fff; box-shadow: 0 0 0 2px #ecf5ff; }
.cell-num { text-align: center; }
.cell-textarea { resize: none; overflow: hidden; min-height: 32px; }
.ss-total-row td { background: #f0f4ff; border-top: 2px solid #e5e7eb; }

.btn-add-row { width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center; border: none; background: transparent; color: #9ca3af; cursor: pointer; border-radius: 4px; font-size: 16px; font-weight: 700; flex-shrink: 0; transition: all .15s; }
.btn-add-row:hover { color: #22c55e; background: #f0fdf4; }

/* 2.0 station blocks */
.station-block { border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 16px; overflow: hidden; }
.station-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #f8fafc; cursor: pointer; user-select: none; border-bottom: 1px solid #e5e7eb; }
.station-header:hover { background: #f0f4ff; }
.station-title { display: flex; align-items: center; gap: 8px; }
.station-title i { color: var(--text-tertiary); font-size: 12px; width: 14px; }
.station-duration { font-size: 12px; color: var(--text-secondary); background: #f3f4f6; padding: 2px 8px; border-radius: 4px; }
.station-total { font-size: 14px; font-weight: 600; }
.station-total.score-ok { color: #22c55e; }
.station-total.score-warn { color: #f59e0b; }
.station-body { padding: 12px 16px; }

.score-table-refs { margin-bottom: 12px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.ref-tag { font-size: 11px; color: #1e40af; background: #dbeafe; padding: 2px 8px; border-radius: 4px; }

.project-section { margin-bottom: 16px; }
.project-section:last-child { margin-bottom: 0; }
.project-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px solid #f3f4f6; }
.project-header h5 { margin: 0; font-size: 13px; color: #374151; }
.project-subtotal { font-size: 13px; color: var(--primary); font-weight: 600; background: var(--primary-light, #eff6ff); padding: 2px 10px; border-radius: 10px; }

.points-list { }
.point-row { display: flex; align-items: center; gap: 6px; padding: 3px 4px; border-bottom: 1px solid #f9fafb; }
.point-row:last-child { border-bottom: none; }
.point-num { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; background: #f3f4f6; border-radius: 50%; font-size: 11px; font-weight: 600; color: #6b7280; flex-shrink: 0; }
.point-input { flex: 1; border: 1px solid transparent; background: transparent; padding: 5px 8px; font-size: 13px; color: #303133; border-radius: 4px; outline: none; font-family: inherit; }
.point-input:hover { border-color: #d9d9d9; background: #fafafa; }
.point-input:focus { border-color: var(--primary); background: #fff; box-shadow: 0 0 0 2px #ecf5ff; }
.point-score-label { font-size: 11px; color: #9ca3af; flex-shrink: 0; }
.point-score { width: 52px; text-align: center; border: 1px solid transparent; background: transparent; padding: 5px 4px; font-size: 13px; color: var(--primary); font-weight: 600; border-radius: 4px; outline: none; font-family: inherit; flex-shrink: 0; }
.point-score:hover { border-color: #d9d9d9; background: #fafafa; }
.point-score:focus { border-color: var(--primary); background: #fff; box-shadow: 0 0 0 2px #ecf5ff; }

.btn-del { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border: none; background: transparent; color: #d1d5db; cursor: pointer; border-radius: 4px; font-size: 16px; flex-shrink: 0; transition: all .15s; }
.btn-del:hover { color: #ef4444; background: #fef2f2; }

.btn { padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; border: none; transition: all .15s; display: inline-flex; align-items: center; gap: 4px; }
.btn-primary { background: var(--primary); color: #fff; }
.btn-primary:hover { opacity: .9; }
.btn-outline { background: #fff; color: var(--text-secondary); border: 1px solid #d9d9d9; }
.btn-outline:hover { border-color: var(--primary); color: var(--primary); }
.btn-sm { padding: 4px 10px; font-size: 11px; }

.empty-state { text-align: center; padding: 40px 20px; color: var(--text-secondary); }
.empty-state i { font-size: 36px; color: var(--text-placeholder); margin-bottom: 8px; display: block; }
.empty-state p { margin: 0; font-size: 14px; }
</style>
