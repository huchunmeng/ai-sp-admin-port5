<template>
  <div class="mrkb-layout">
    <aside class="mrkb-sidebar">
      <div class="mrkb-search">
        <input class="input" v-model="searchText" placeholder="搜索字段..." style="width:100%">
      </div>
      <nav class="mrkb-nav">
        <button
          v-for="item in filteredEntries"
          :key="item.key"
          :class="['mrkb-nav-item', { active: selectedKey === item.key }]"
          @click="selectedKey = item.key"
        >
          <span class="mrkb-nav-label">{{ item.label }}</span>
        </button>
      </nav>
      <div v-if="filteredEntries.length === 0" class="mrkb-nav-empty">无匹配字段</div>
    </aside>

    <main class="mrkb-content">
      <template v-if="current">
        <div class="mrkb-content-header">
          <h3>{{ current.label }}</h3>
          <span class="mrkb-content-count">{{ current.type === 'list' ? `共 ${current.lines} 条` : '文本内容' }}</span>
        </div>
        <div class="mrkb-card card">
          <div class="mrkb-card-header">
            <div class="mrkb-card-meta">
              <span v-if="current.type === 'list'">参考文献列表</span>
              <span v-else>{{ current.meta || '病历内容' }}</span>
            </div>
            <button class="btn btn-sm btn-outline" @click="expanded = !expanded">
              {{ expanded ? '收起' : '展开' }}
            </button>
          </div>
          <div :class="['mrkb-card-body', { collapsed: !expanded }]">
            <pre class="mrkb-content-text">{{ current.content }}</pre>
          </div>
        </div>
      </template>

      <div v-else class="mrkb-empty">
        <i class="fas fa-folder-open" style="font-size:48px;color:var(--text-tertiary);margin-bottom:16px;display:block"></i>
        <p>暂无病例知识库内容</p>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'

const props = defineProps({ form: { type: Object, required: true } })
const f = props.form

const searchText = ref('')
const selectedKey = ref('')
const expanded = ref(true)
const rawRecord = ref(null)

onMounted(async () => {
  const srcId = f.sourceRecordId
  if (!srcId) return
  try {
    const res = await fetch(`/api/raw-records/${srcId}`)
    if (res.ok) rawRecord.value = await res.json()
  } catch (e) { /* ignore */ }
})

const entries = computed(() => {
  const pi = f.patientInfo || {}
  const list = []
  if (rawRecord.value?.content) {
    list.push({ key: 'raw', label: '原始病历全文', type: 'text', content: rawRecord.value.content, meta: rawRecord.value.title || rawRecord.value.id || '原始病历' })
  }
  const tfs = [
    ['chief', '主诉', pi.chiefComplaint],
    ['present', '现病史', pi.presentIllness],
    ['vitals', '生命体征', pi.vitals],
    ['physical', '体格检查', pi.physicalExam],
    ['lab', '实验室检查', pi.labTests],
    ['imaging', '影像学检查', pi.imagingText],
    ['past', '既往史', pi.pastHistory],
    ['family', '家族史', pi.familyHistory]
  ]
  for (const [key, label, val] of tfs) {
    if (val) list.push({ key, label, type: 'text', content: String(val), meta: label })
  }
  const pers = f.knowledgeBase?.disciplinePerspectives || []
  for (const p of pers) {
    if (p.dept && p.view) list.push({ key: 'pers-' + p.dept, label: '学科观点 · ' + p.dept, type: 'text', content: String(p.view), meta: '学科观点' })
  }
  if (f.knowledgeBase?.clinicalKeyPoints) {
    list.push({ key: 'points', label: '临床关键要点', type: 'text', content: String(f.knowledgeBase.clinicalKeyPoints), meta: '知识库' })
  }
  const refs = f.knowledgeBase?.references || []
  if (refs.length) {
    list.push({ key: 'refs', label: '参考文献', type: 'list', content: refs.join('\n'), lines: refs.length, meta: '知识库' })
  }
  return list
})

const filteredEntries = computed(() => {
  const q = searchText.value.trim().toLowerCase()
  if (!q) return entries.value
  return entries.value.filter(e => e.label.toLowerCase().includes(q))
})

const current = computed(() => entries.value.find(e => e.key === selectedKey.value) || null)

watch(filteredEntries, (list) => {
  if (list.length && !list.some(e => e.key === selectedKey.value)) {
    selectedKey.value = list[0].key
  }
}, { immediate: true })
</script>

<style scoped>
.mrkb-layout {
  display: flex;
  gap: 0;
  min-height: calc(100vh - 340px);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}
.mrkb-sidebar {
  width: 220px;
  min-width: 220px;
  border-right: 1px solid var(--border);
  background: #fafbfc;
  display: flex;
  flex-direction: column;
}
.mrkb-search {
  padding: 12px;
  border-bottom: 1px solid var(--border);
}
.mrkb-nav {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}
.mrkb-nav-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 16px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-main);
  text-align: left;
  transition: background 0.15s;
}
.mrkb-nav-item:hover { background: #eef2ff; }
.mrkb-nav-item.active {
  background: var(--primary-light);
  color: var(--primary);
  font-weight: 600;
  border-right: 3px solid var(--primary);
}
.mrkb-nav-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mrkb-nav-empty {
  padding: 24px 16px;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 13px;
}
.mrkb-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  min-width: 0;
}
.mrkb-content-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}
.mrkb-content-header h3 {
  margin: 0;
  font-size: 18px;
  color: var(--text-main);
}
.mrkb-content-count {
  font-size: 13px;
  color: var(--text-tertiary);
}
.mrkb-card {
  margin-bottom: 16px;
  padding: 0;
  overflow: hidden;
}
.mrkb-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f8fafc;
  border-bottom: 1px solid var(--border);
}
.mrkb-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 12px;
  color: var(--text-secondary);
}
.mrkb-card-body {
  padding: 16px;
  max-height: 600px;
  overflow-y: auto;
  transition: max-height 0.3s ease;
}
.mrkb-card-body.collapsed {
  max-height: 120px;
  overflow: hidden;
  position: relative;
}
.mrkb-card-body.collapsed::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 48px;
  background: linear-gradient(transparent, #fff);
}
.mrkb-content-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.8;
  color: var(--text-main);
  white-space: pre-wrap;
  word-break: break-all;
  font-family: inherit;
}
.mrkb-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 300px;
  color: var(--text-tertiary);
  font-size: 14px;
}
</style>
