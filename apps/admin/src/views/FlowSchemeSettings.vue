<template>
  <div class="content-container">
    <div style="margin-bottom: 16px;">
      <h1 style="margin-top: 8px; font-size: 1.5rem; font-weight: 600;">全流程评分配置</h1>
    </div>

    <!-- 说明卡片 -->
    <div class="card" style="padding:12px 20px;margin-bottom:16px">
      <div style="font-size:13px;color:var(--text-secondary);line-height:1.6">
        临床思维全流程（6 模块）评分方案管理。考核项目固定（病史采集 / 体格检查 / 辅助检查 / 诊断 / 治疗计划 / 病历书写，所有专业一致），
        每套方案包含「通用基础分方案」与可选的各专业独立配置；训练端按当前病例专业读对应配置，未配置的专业自动使用通用基础。各专业配置只需设置各模块的评分占比（权重，合计须为 100）与绑定的评分表。
      </div>
    </div>

    <!-- 筛选 -->
    <div class="card" style="padding:16px;margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:8px;">
          <label style="font-size:13px;color:var(--text-secondary)">方案名称：</label>
          <input v-model="filterName" placeholder="请输入方案名称" style="padding:4px 8px;border:1px solid var(--border);border-radius:4px;font-size:13px;width:160px">
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <label style="font-size:13px;color:var(--text-secondary)">状态：</label>
          <select v-model="filterStatus" style="padding:4px 8px;border:1px solid var(--border);border-radius:4px;font-size:13px">
            <option value="">全部</option>
            <option value="enabled">启用</option>
            <option value="disabled">禁用</option>
          </select>
        </div>
        <button class="btn" @click="resetFilter">重置</button>
      </div>
    </div>

    <!-- 工具栏 -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <span style="font-size:13px;color:var(--text-secondary)">共 {{ filteredSchemes.length }} 套方案</span>
      <div style="display:flex;gap:8px">
        <button class="btn" @click="restoreDefault">恢复默认</button>
        <button class="btn btn-primary" @click="addScheme">+ 新增方案</button>
      </div>
    </div>

    <!-- 方案列表 -->
    <div class="card" style="padding:0">
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th style="width:50px">序号</th>
              <th>方案名称</th>
              <th>覆盖专业</th>
              <th>来源</th>
              <th style="width:120px">状态</th>
              <th style="width:220px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(scheme, index) in filteredSchemes" :key="scheme.id">
              <td>{{ index + 1 }}</td>
              <td>
                <a href="javascript:void(0)" @click="openEditPanel(scheme.id)"
                   style="font-size:13px;font-weight:500;color:#1e40af;cursor:pointer;text-decoration:none">{{ scheme.name }}</a>
                <span v-if="scheme.status === true" style="margin-left:8px;padding:2px 8px;background:#dcfce7;color:#15803d;border-radius:4px;font-size:11px">启用中</span>
              </td>
              <td style="font-size:12px;color:var(--text-secondary)">{{ majorSummary(scheme) }}</td>
              <td>{{ scheme.source }}</td>
              <td>
                <label class="switch">
                  <input type="checkbox" :checked="scheme.status === true" @change="toggleStatus(scheme.id)">
                  <span class="slider"></span>
                </label>
              </td>
              <td>
                <div style="display:flex;gap:8px">
                  <button class="btn btn-sm" @click="openEditPanel(scheme.id)">编辑</button>
                  <button class="btn btn-sm" @click="copyScheme(scheme.id)">复制</button>
                  <button class="btn btn-sm btn-danger" @click="deleteScheme(scheme.id)">删除</button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredSchemes.length === 0">
              <td colspan="6" style="text-align:center;padding:40px;color:var(--text-secondary)">暂无方案</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- slide-panel 编辑器 -->
    <div v-if="schemePanelVisible" class="slide-panel open"
         style="position:fixed;top:0;right:0;width:820px;max-width:95vw;height:100%;background:#fff;box-shadow:-4px 0 20px rgba(0,0,0,0.15);z-index:1000;display:flex;flex-direction:column">
      <div style="padding:16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;background:#f9fafb;flex-shrink:0">
        <h3 style="margin:0;font-size:16px;font-weight:600">{{ editingScheme?.isNew ? '新增方案' : '编辑：' + editingScheme?.name }}</h3>
        <button class="btn" @click="closeSchemePanel">✕ 关闭</button>
      </div>
      <div v-if="editingScheme" style="flex:1;overflow-y:auto;padding:16px">
        <div class="card" style="padding:16px;margin-bottom:16px">
          <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center">
            <div style="display:flex;align-items:center;gap:8px">
              <label style="font-size:13px;color:var(--text-secondary)">方案名称</label>
              <input v-model="editingScheme.name" style="padding:4px 8px;border:1px solid var(--border);border-radius:4px;font-size:13px;width:240px">
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <label style="font-size:13px;color:var(--text-secondary)">来源</label>
              <input v-model="editingScheme.source" style="padding:4px 8px;border:1px solid var(--border);border-radius:4px;font-size:13px;width:200px">
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <label style="font-size:13px;color:var(--text-secondary)">启用</label>
              <label class="switch">
                <input type="checkbox" v-model="editingScheme.status">
                <span class="slider"></span>
              </label>
            </div>
          </div>
        </div>

        <div class="card" style="padding:0">
          <div style="padding:12px 16px;background:var(--background);border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
            <strong>专业配置（通用基础 + 可选专业独立配置）</strong>
            <button class="btn btn-sm" @click="showAddMajorModal = true">＋ 添加专业</button>
          </div>
          <!-- 专业 tab 栏 -->
          <div style="display:flex;gap:8px;padding:10px 16px;border-bottom:1px solid var(--border);overflow-x:auto;align-items:center;">
            <div v-for="(major, idx) in editingScheme.majors" :key="major.name"
                 class="major-tab" :class="{ active: editingMajorTab === idx }" @click="editingMajorTab = idx">
              <span>{{ major.name }}<template v-if="idx === 0">（基础）</template></span>
              <span v-if="idx > 0" class="major-tab-del" @click.stop="deleteMajor(idx)" title="删除该专业配置">✕</span>
            </div>
            <div class="major-tab-add" @click="showAddMajorModal = true">＋ 添加</div>
          </div>
          <!-- 当前专业操作 -->
          <div v-if="editingMajorTab > 0" style="display:flex;gap:8px;padding:10px 16px;border-bottom:1px solid var(--border);align-items:center;flex-wrap:wrap">
            <span style="font-size:12px;color:var(--text-secondary)">「{{ currentMajorName }}」专业独立配置，未配置的专业自动使用通用基础</span>
            <button class="btn btn-sm" @click="openCopyMajorModal">复制配置</button>
          </div>
          <!-- 模块表 -->
          <div class="table-wrapper">
            <table class="table">
              <thead>
                <tr>
                  <th style="width:50px">序号</th>
                  <th>模块</th>
                  <th style="width:110px">权重占比</th>
                  <th>绑定评分表</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(mod, idx) in currentModules" :key="mod.moduleId">
                  <td>{{ idx + 1 }}</td>
                  <td>
                    <span style="font-weight:500">{{ mod.name }}</span>
                    <span style="margin-left:6px;font-size:11px;color:var(--text-tertiary);font-family:monospace">{{ mod.routeName }}</span>
                  </td>
                  <td>
                    <input type="number" v-model.number="mod.weight" min="0" max="100"
                           style="width:70px;padding:4px 6px;border:1px solid var(--border);border-radius:4px;text-align:center;font-size:13px">
                  </td>
                  <td>
                    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                      <span v-if="mod.scoreTableCode" style="font-size:12px;color:#1f2937;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:2px 8px;background:#eff6ff;border-radius:4px">{{ boundTableName(mod.scoreTableCode) }}</span>
                      <button class="btn btn-sm" @click="openScoreTableModal(idx)">{{ mod.scoreTableCode ? '更换' : '绑定评分表' }}</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style="padding:12px 16px;background:var(--background);border-top:1px solid var(--border);display:flex;justify-content:flex-end">
            <span :class="totalWeight === 100 ? 'weight-ok' : 'weight-err'">「{{ currentMajorName }}」权重合计：{{ totalWeight }} / 100</span>
          </div>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">
          <button class="btn" @click="closeSchemePanel">取消</button>
          <button class="btn btn-primary" @click="saveScheme">保存方案</button>
        </div>
      </div>
    </div>

    <!-- 评分表选择模态框（复用考站设置的交互：radio 单选 + 搜索 + 详情） -->
    <div v-if="showScoreTableModal" class="modal-overlay" @click.self="showScoreTableModal = false"
         style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;justify-content:center;align-items:center;z-index:1100;">
      <div style="background:white;border-radius:12px;width:600px;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 8px 32px rgba(0,0,0,0.12);">
        <div style="padding:18px 24px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;gap:12px;">
          <span style="width:36px;height:36px;border-radius:8px;background:#eff6ff;display:flex;align-items:center;justify-content:center;font-size:16px;">📋</span>
          <div>
            <h3 style="margin:0;font-size:15px;font-weight:600;">选择评分表</h3>
            <p style="margin:2px 0 0;font-size:12px;color:var(--text-tertiary);">为「{{ currentMajorName }}」的「{{ scoreTableModuleName }}」绑定评分表</p>
          </div>
        </div>
        <div style="padding:20px 24px;overflow-y:auto;flex:1;">
          <div style="position:relative;margin-bottom:16px;">
            <i class="fas fa-search" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-tertiary);font-size:13px;"></i>
            <input class="input" v-model="scoreTableSearchKeyword" placeholder="搜索评分表名称、编码或专业..." style="width:100%;padding-left:34px;box-sizing:border-box;height:38px;">
          </div>
          <div style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <div style="padding:8px 14px;background:#f9fafb;border-bottom:1px solid #e5e7eb;font-size:12px;color:var(--text-secondary);font-weight:600;">
              可选评分表 <span style="font-weight:400;color:var(--text-tertiary);">（{{ filteredScoreTableOptions.length }} 个，含考站版与全流程版）</span>
            </div>
            <div style="max-height:320px;overflow-y:auto;">
              <div v-if="filteredScoreTableOptions.length === 0" style="padding:24px;text-align:center;color:var(--text-tertiary);font-size:13px;">
                <i class="fas fa-inbox" style="font-size:24px;display:block;margin-bottom:8px;color:#d1d5db;"></i>
                无匹配评分表
              </div>
              <label v-for="(st, idx) in filteredScoreTableOptions" :key="st.template_code || idx"
                     style="display:flex;align-items:center;gap:12px;padding:10px 14px;cursor:pointer;transition:background .12s;border-bottom:1px solid #f3f4f6;"
                     :style="{ background: scoreTableSelectedCode === st.template_code ? '#eff6ff' : '#fff' }"
                     @mouseenter="$event.target.style.background = scoreTableSelectedCode !== st.template_code ? '#fafbfc' : '#eff6ff'"
                     @mouseleave="$event.target.style.background = scoreTableSelectedCode === st.template_code ? '#eff6ff' : '#fff'">
                <input type="radio" :value="st.template_code" v-model="scoreTableSelectedCode" style="flex-shrink:0;accent-color:var(--primary);">
                <div style="flex:1;min-width:0;">
                  <div style="font-size:13px;font-weight:500;color:#1f2937;line-height:1.4;">
                    {{ st.template_name }}
                    <span v-if="st.category === '全流程版'" style="margin-left:6px;padding:1px 6px;background:#eff6ff;color:#1e40af;border-radius:4px;font-size:10px;font-weight:600;">全流程</span>
                    <span v-else style="margin-left:6px;padding:1px 6px;background:#f3f4f6;color:#4b5563;border-radius:4px;font-size:10px;font-weight:600;">考站</span>
                  </div>
                  <div style="display:flex;gap:12px;margin-top:3px;">
                    <span style="font-size:11px;color:var(--text-tertiary);font-family:monospace;">{{ st.template_code }}</span>
                    <span style="font-size:11px;color:var(--text-tertiary);">{{ st.specialty }}</span>
                    <span style="font-size:11px;color:var(--text-tertiary);">引用 {{ st.usage_count }} 次</span>
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>
        <div style="padding:14px 24px;border-top:1px solid #f0f0f0;display:flex;justify-content:flex-end;gap:10px;">
          <button class="btn" @click="showScoreTableModal = false" style="min-width:80px;">取消</button>
          <button class="btn btn-primary" @click="confirmBindScoreTable" :disabled="!scoreTableSelectedCode" style="min-width:80px;">确定绑定</button>
        </div>
      </div>
    </div>

    <!-- 添加专业模态框 -->
    <div v-if="showAddMajorModal" class="modal-overlay" @click.self="showAddMajorModal = false"
         style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;justify-content:center;align-items:center;z-index:1100;">
      <div style="background:white;border-radius:12px;width:420px;padding:20px;">
        <h3 style="margin:0 0 12px;font-size:15px;font-weight:600;">添加专业配置</h3>
        <p style="font-size:12px;color:var(--text-secondary);margin-bottom:12px;">选择专业，将复制通用基础配置作为起手，可再调整权重与评分表。</p>
        <select v-model="newMajorName" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:13px;margin-bottom:16px;">
          <option value="" disabled>请选择专业</option>
          <option v-for="name in availableMajors" :key="name" :value="name">{{ name }}</option>
        </select>
        <div style="display:flex;justify-content:flex-end;gap:10px;">
          <button class="btn" @click="showAddMajorModal = false">取消</button>
          <button class="btn btn-primary" @click="confirmAddMajor" :disabled="!newMajorName">确定添加</button>
        </div>
      </div>
    </div>

    <!-- 复制配置模态框 -->
    <div v-if="showCopyMajorModal" class="modal-overlay" @click.self="showCopyMajorModal = false"
         style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;justify-content:center;align-items:center;z-index:1100;">
      <div style="background:white;border-radius:12px;width:420px;padding:20px;">
        <h3 style="margin:0 0 12px;font-size:15px;font-weight:600;">复制配置到「{{ currentMajorName }}」</h3>
        <p style="font-size:12px;color:var(--text-secondary);margin-bottom:12px;">将覆盖当前专业配置的权重与评分表绑定。</p>
        <select v-model="copySourceMajorName" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:13px;margin-bottom:16px;">
          <option v-for="m in copySourceOptions" :key="m.name" :value="m.name">{{ m.name }}{{ m.name === '通用' ? '（基础）' : '' }}</option>
        </select>
        <div style="display:flex;justify-content:flex-end;gap:10px;">
          <button class="btn" @click="showCopyMajorModal = false">取消</button>
          <button class="btn btn-primary" @click="confirmCopyMajor">确定复制</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { confirm, toast, flowScoreTables } from '@ai-sp/shared'
import { SCORE_SHEET_TEMPLATES } from '@/data/templates/index.js'
import defaultFlow from '../../../../packages/shared/data/flow-score-tables.json'

// 固定 6 模块（所有专业一致）
const FLOW_MODULES = [
  { moduleId: 'historyTaking', name: '病史采集', routeName: 'historyTaking' },
  { moduleId: 'physicalExam', name: '体格检查', routeName: 'physicalExam' },
  { moduleId: 'ancillaryTests', name: '辅助检查', routeName: 'ancillaryTests' },
  { moduleId: 'diagnosis', name: '诊断', routeName: 'diagnosis' },
  { moduleId: 'treatmentPlan', name: '治疗计划', routeName: 'treatmentPlan' },
  { moduleId: 'medicalRecord', name: '病历书写', routeName: 'medicalRecord' }
]

// 可选专业列表（与考站设置一致）
const allMajors = [
  '内科', '儿科', '急诊科', '精神科', '全科', '皮肤科', '神经内科', '康复医学科', '重症医学科',
  '普通外科', '胸心外科', '泌尿外科', '整形外科', '骨科', '儿外科',
  '妇产科', '麻醉科',
  '眼科', '耳鼻咽喉科',
  '口腔全科', '口腔内科', '口腔颌面外科', '口腔修复科', '口腔正畸科', '口腔病理科', '口腔颌面影像科',
  '放射科', '超声科', '核医学科', '临床病理科', '检验医学科',
  '放射肿瘤科', '医学遗传科', '预防医学科'
]

const flowData = ref(null)
const schemeLoading = ref(false)

const filterName = ref('')
const filterStatus = ref('')

const schemes = computed(() => flowData.value?.schemes || [])

const filteredSchemes = computed(() => schemes.value.filter(s => {
  if (filterName.value && !s.name.includes(filterName.value)) return false
  if (filterStatus.value === 'enabled' && s.status !== true) return false
  if (filterStatus.value === 'disabled' && s.status === true) return false
  return true
}))

function majorSummary(scheme) {
  const specs = (scheme.majors || []).filter(m => m.name !== '通用').map(m => m.name)
  return specs.length ? '通用 + ' + specs.join('、') : '通用'
}

// 评分表选项：考站版 + 全流程版（复用考站设置的选项构造，附 category 标记）
const scoreTableOptions = computed(() => {
  const opts = SCORE_SHEET_TEMPLATES.map(tpl => ({
    template_code: tpl.code,
    template_name: tpl.name,
    specialty: tpl.specialty || '通用',
    usage_count: tpl.usage_count || 0,
    category: '考站版'
  }))
  const tables = flowData.value?.tables || {}
  for (const tpl of Object.values(tables)) {
    if (tpl?.code) opts.push({ template_code: tpl.code, template_name: tpl.name, specialty: '全流程版', usage_count: 0, category: '全流程版' })
  }
  return opts
})

function boundTableName(code) {
  if (!code) return ''
  const hit = scoreTableOptions.value.find(o => o.template_code === code)
  return hit ? hit.template_name : code
}

function clone(obj) { return JSON.parse(JSON.stringify(obj)) }

onMounted(async () => {
  schemeLoading.value = true
  try {
    const data = await flowScoreTables.load()
    if (data?.schemes?.length) {
      flowData.value = data
      return
    }
  } catch (e) { /* 降级到内置默认 */ }
  flowData.value = clone(defaultFlow)
  schemeLoading.value = false
})

function makeScheme() {
  const generalModules = clone((defaultFlow.schemes?.[0]?.majors?.[0]?.modules) || (defaultFlow.schemes?.[0]?.modules) || [])
  const scheme = {
    id: 'FLOW-' + String(Date.now()).slice(-6),
    name: '临床思维全流程方案',
    source: '机构',
    status: false,
    isNew: true,
    majors: [{
      name: '通用',
      modules: generalModules.length ? generalModules : FLOW_MODULES.map(m => ({
        moduleId: m.moduleId, name: m.name, routeName: m.routeName, weight: 0, scoreTableCode: ''
      }))
    }]
  }
  return scheme
}

// 编辑面板
const schemePanelVisible = ref(false)
const editingScheme = ref(null)
const editingMajorTab = ref(0)

function openEditPanel(id) {
  const src = schemes.value.find(s => s.id === id)
  if (!src) return
  editingScheme.value = clone(src)
  editingScheme.value.isNew = false
  editingMajorTab.value = 0
  schemePanelVisible.value = true
}

function addScheme() {
  editingScheme.value = makeScheme()
  editingMajorTab.value = 0
  schemePanelVisible.value = true
}

function closeSchemePanel() {
  schemePanelVisible.value = false
  editingScheme.value = null
  editingMajorTab.value = 0
}

// 当前 tab 的 major / modules
const currentMajorName = computed(() => (editingScheme.value?.majors || [])[editingMajorTab.value]?.name || '通用')
const currentModules = computed(() => {
  const major = (editingScheme.value?.majors || [])[editingMajorTab.value]
  return (major && major.modules) || []
})

const totalWeight = computed(() => currentModules.value.reduce((s, m) => s + (m.weight || 0), 0))

// 添加专业
const showAddMajorModal = ref(false)
const newMajorName = ref('')

const availableMajors = computed(() => {
  if (!editingScheme.value) return allMajors
  const used = new Set((editingScheme.value.majors || []).map(m => m.name))
  return allMajors.filter(n => !used.has(n))
})

function confirmAddMajor() {
  if (!newMajorName.value) return
  const general = editingScheme.value.majors.find(m => m.name === '通用')
  editingScheme.value.majors.push({
    name: newMajorName.value,
    modules: clone((general && general.modules) || [])
  })
  editingMajorTab.value = editingScheme.value.majors.length - 1
  newMajorName.value = ''
  showAddMajorModal.value = false
}

function deleteMajor(idx) {
  if (idx <= 0) return
  const major = editingScheme.value.majors[idx]
  confirm(`确认删除「${major.name}」专业配置吗？删除后该专业将使用通用基础方案。`).then(ok => {
    if (!ok) return
    editingScheme.value.majors.splice(idx, 1)
    if (editingMajorTab.value >= editingScheme.value.majors.length) editingMajorTab.value = 0
  }).catch(() => {})
}

// 复制配置（仅专业 tab）
const showCopyMajorModal = ref(false)
const copySourceMajorName = ref('')

const copySourceOptions = computed(() => {
  const majors = editingScheme.value?.majors || []
  const cur = currentMajorName.value
  return majors.filter(m => m.name !== cur)
})

function openCopyMajorModal() {
  copySourceMajorName.value = (copySourceOptions.value[0] || {}).name || '通用'
  showCopyMajorModal.value = true
}

function confirmCopyMajor() {
  const src = editingScheme.value.majors.find(m => m.name === copySourceMajorName.value)
  if (!src) return
  editingScheme.value.majors[editingMajorTab.value].modules = clone(src.modules || [])
  showCopyMajorModal.value = false
}

// 评分表绑定模态框
const showScoreTableModal = ref(false)
const scoreTableSearchKeyword = ref('')
const scoreTableSelectedCode = ref('')
const scoreTableModuleIndex = ref(-1)

const scoreTableModuleName = computed(() => {
  const mod = currentModules.value[scoreTableModuleIndex.value]
  return mod ? mod.name : ''
})

const filteredScoreTableOptions = computed(() => {
  const kw = scoreTableSearchKeyword.value.trim().toLowerCase()
  if (!kw) return scoreTableOptions.value
  return scoreTableOptions.value.filter(st =>
    st.template_name.toLowerCase().includes(kw) ||
    st.template_code.toLowerCase().includes(kw) ||
    st.specialty.toLowerCase().includes(kw)
  )
})

function openScoreTableModal(moduleIndex) {
  scoreTableModuleIndex.value = moduleIndex
  const mod = currentModules.value[moduleIndex]
  scoreTableSelectedCode.value = (mod && mod.scoreTableCode) || ''
  scoreTableSearchKeyword.value = ''
  showScoreTableModal.value = true
}

function confirmBindScoreTable() {
  const mod = currentModules.value[scoreTableModuleIndex.value]
  if (!mod) return
  mod.scoreTableCode = scoreTableSelectedCode.value
  showScoreTableModal.value = false
}

// 保存：校验所有专业配置
function validateScheme() {
  const majors = editingScheme.value.majors || []
  if (!majors.length) return '至少保留通用基础配置'
  for (const major of majors) {
    const sum = (major.modules || []).reduce((s, m) => s + (m.weight || 0), 0)
    if (sum !== 100) return `「${major.name}」权重合计须为 100，当前 ${sum}`
    const missing = (major.modules || []).filter(m => !m.scoreTableCode)
    if (missing.length) return `「${major.name}」请为「${missing.map(m => m.name).join('、')}」绑定评分表`
  }
  return ''
}

async function saveScheme() {
  if (!editingScheme.value) return
  const err = validateScheme()
  if (err) {
    toast.show(err, 'warning')
    return
  }
  const idx = (flowData.value.schemes || []).findIndex(s => s.id === editingScheme.value.id)
  if (idx >= 0) {
    flowData.value.schemes[idx] = clone(editingScheme.value)
  } else {
    flowData.value.schemes.push(clone(editingScheme.value))
  }
  await saveFlow()
  closeSchemePanel()
}

async function saveFlow() {
  try {
    await flowScoreTables.save(flowData.value)
    toast.show('方案已保存', 'success')
  } catch (e) {
    toast.show('保存失败：' + (e.message || e), 'error')
  }
}

function toggleStatus(id) {
  const target = schemes.value.find(s => s.id === id)
  if (!target) return
  if (target.status === true) {
    const enabledCount = schemes.value.filter(s => s.status === true).length
    if (enabledCount <= 1) {
      toast.show('至少保留一套启用方案', 'warning')
      return
    }
    target.status = false
  } else {
    // 置启用时其余全部停用（只用一个启用方案）
    schemes.value.forEach(s => { s.status = false })
    target.status = true
  }
  saveFlow()
}

function copyScheme(id) {
  const src = schemes.value.find(s => s.id === id)
  if (!src) return
  const copy = clone(src)
  copy.id = 'FLOW-' + String(Date.now()).slice(-6)
  copy.name = src.name + '（副本）'
  copy.status = false
  flowData.value.schemes.push(copy)
  saveFlow()
}

function deleteScheme(id) {
  if (schemes.value.length <= 1) {
    toast.show('至少保留一套方案', 'warning')
    return
  }
  const target = schemes.value.find(s => s.id === id)
  confirm(`确认删除方案「${target?.name}」吗？`).then(ok => {
    if (!ok) return
    flowData.value.schemes = flowData.value.schemes.filter(s => s.id !== id)
    if (target?.status === true && flowData.value.schemes.length > 0) {
      flowData.value.schemes[0].status = true
    }
    saveFlow()
  }).catch(() => {})
}

function restoreDefault() {
  confirm('恢复默认将覆盖当前全部方案与配置，确认？').then(ok => {
    if (!ok) return
    flowData.value = clone(defaultFlow)
    saveFlow()
  }).catch(() => {})
}

function resetFilter() {
  filterName.value = ''
  filterStatus.value = ''
}
</script>

<style scoped>
.slide-panel { animation: slideIn .2s ease; }
@keyframes slideIn {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
.weight-ok { color: #16a34a; font-weight: 600; font-size: 13px; }
.weight-err { color: #dc2626; font-weight: 600; font-size: 13px; }
.major-tab {
  display: flex; align-items: center; gap: 6px; padding: 6px 14px;
  border: 1px solid var(--border); border-radius: 20px; font-size: 13px;
  cursor: pointer; background: #fff; color: var(--text-secondary); white-space: nowrap; flex-shrink: 0;
}
.major-tab:hover { color: var(--primary); border-color: var(--primary); }
.major-tab.active { background: var(--primary); border-color: var(--primary); color: #fff; }
.major-tab-del { font-size: 11px; opacity: .7; }
.major-tab-del:hover { opacity: 1; }
.major-tab-add {
  display: flex; align-items: center; padding: 6px 12px; border: 1px dashed var(--border);
  border-radius: 20px; font-size: 13px; cursor: pointer; color: var(--text-secondary); white-space: nowrap; flex-shrink: 0;
}
.major-tab-add:hover { color: var(--primary); border-color: var(--primary); }
</style>
