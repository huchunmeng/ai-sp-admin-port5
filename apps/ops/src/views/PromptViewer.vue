<template>
  <div class="content-container">
    <h2 style="margin-bottom:4px;">提示词与策略查看</h2>
    <p class="text-secondary mb-4" style="font-size:13px;">只读查看各模块的提示词模板和情绪策略引擎源码</p>

    <!-- Loading -->
    <div v-if="loading" class="card" style="padding:48px; text-align:center;">
      <p class="text-secondary"><i class="fa-solid fa-spinner fa-spin"></i> 加载中...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="card" style="padding:48px; text-align:center;">
      <p style="color:var(--danger);"><i class="fa-solid fa-triangle-exclamation"></i> {{ error }}</p>
      <button class="btn mt-3" @click="load">重试</button>
    </div>

    <!-- Empty -->
    <div v-else-if="!sections.length" class="card" style="padding:48px; text-align:center;">
      <p class="text-secondary">暂无数据</p>
    </div>

    <!-- Content -->
    <template v-else>
      <!-- 快速导航 -->
      <div class="quick-nav mb-4">
        <span
          v-for="sec in sections" :key="sec.key"
          class="nav-chip"
          :style="{ borderLeftColor: sectionColor(sec.key) }"
          @click="scrollToSection(sec.key)"
        >{{ sec.label }}</span>
      </div>

      <div
        v-for="sec in sections" :key="sec.key"
        :id="'section-' + sec.key"
        class="card mb-4 section-card"
        :class="{ collapsed: sec._collapsed }"
      >
        <!-- 分区头部 -->
        <div class="section-header" @click="sec._collapsed = !sec._collapsed">
          <div class="section-header-left">
            <span class="section-dot" :style="{ background: sectionColor(sec.key) }"></span>
            <h3>{{ sec.label }}</h3>
            <span class="section-count">{{ sec.files.length }} 个文件</span>
          </div>
          <i class="fa-solid section-chevron" :class="sec._collapsed ? 'fa-chevron-down' : 'fa-chevron-up'"></i>
        </div>

        <!-- 文件列表 -->
        <div v-show="!sec._collapsed" class="file-list">
          <div v-if="!sec.files.length" class="file-empty">暂无文件</div>
          <div
            v-for="(f, fi) in sec.files" :key="fi"
            class="file-item"
            :class="{ expanded: f._expanded }"
          >
            <div class="file-header" @click="f._expanded = !f._expanded">
              <i class="fa-solid fa-file-lines file-icon"></i>
              <span class="file-name">{{ f.name }}</span>
              <span class="file-meta">{{ f.content.split('\n').length }} 行 · {{ formatSize(f.content.length) }}</span>
              <i class="fa-solid file-chevron" :class="f._expanded ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
            </div>
            <pre v-show="f._expanded" class="file-content"><code>{{ f.content }}</code></pre>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const SP_API = 'http://localhost:5100'

const loading = ref(false)
const error = ref('')
const sections = ref([])

const SECTION_COLORS = {
  'case-basic':     '#059669',
  'case-reception': '#0891b2',
  'case-analysis':  '#7c3aed',
  'case-humanity':  '#d97706',
  'case-meta':      '#6b7280',
  'sp-system':      '#2563eb',
  'strategy':       '#dc2626'
}
function sectionColor(key) { return SECTION_COLORS[key] || '#6b7280' }

function scrollToSection(key) {
  const el = document.getElementById('section-' + key)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  return (bytes / 1024).toFixed(1) + ' KB'
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch(`${SP_API}/api/sp/admin/prompts`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (!data.ok) throw new Error(data.error || '未知错误')
    // 给分区和文件附加折叠状态
    sections.value = (data.sections || []).map(sec => {
      sec._collapsed = false
      sec.files = (sec.files || []).map(f => { f._expanded = false; return f })
      return sec
    })
  } catch (e) {
    error.value = '无法连接到 SP API 服务: ' + e.message
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
/* ── 快速导航 ── */
.quick-nav { display: flex; flex-wrap: wrap; gap: 8px; }
.nav-chip {
  display: inline-block; padding: 3px 10px; border-radius: 4px;
  font-size: 12px; color: var(--text-secondary); background: #fff;
  border: 1px solid var(--border); border-left: 3px solid #ccc;
  cursor: pointer; text-decoration: none; transition: all 0.15s;
}
.nav-chip:hover { color: var(--primary); background: var(--primary-light); }

/* ── 分区卡片 ── */
.section-card { padding: 0; overflow: hidden; }
.section-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; cursor: pointer; user-select: none;
  transition: background 0.15s;
}
.section-header:hover { background: #f9fafb; }
.section-card.collapsed .section-header { border-bottom: none; }
.section-header-left { display: flex; align-items: center; gap: 10px; }
.section-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.section-header h3 { margin: 0; font-size: 15px; font-weight: 600; }
.section-count {
  font-size: 12px; color: var(--text-tertiary);
  background: #f3f4f6; padding: 2px 8px; border-radius: 10px;
}
.section-chevron { font-size: 12px; color: var(--text-tertiary); }

/* ── 文件列表 ── */
.file-list { border-top: 1px solid var(--border-light); }
.file-empty { padding: 24px; text-align: center; color: var(--text-tertiary); font-size: 13px; }
.file-item { border-bottom: 1px solid var(--border-light); }
.file-item:last-child { border-bottom: none; }
.file-header {
  display: flex; align-items: center; gap: 8px; padding: 10px 20px;
  cursor: pointer; transition: background 0.12s; font-size: 13px;
}
.file-header:hover { background: #fafbfc; }
.file-item.expanded .file-header { background: #f0f9ff; }
.file-icon { color: var(--text-tertiary); font-size: 13px; flex-shrink: 0; }
.file-name { flex: 1; font-weight: 500; font-family: 'SF Mono', 'Cascadia Code', 'Consolas', monospace; font-size: 12px; }
.file-meta { font-size: 11px; color: var(--text-tertiary); white-space: nowrap; }
.file-chevron { font-size: 10px; color: var(--text-tertiary); }

/* ── 文件内容 ── */
.file-content {
  margin: 0; padding: 16px 20px; background: #1e1e2e; color: #cdd6f4;
  font-size: 12px; line-height: 1.6; overflow-x: auto; white-space: pre;
  font-family: 'SF Mono', 'Cascadia Code', 'Consolas', 'Courier New', monospace;
  max-height: 600px; overflow-y: auto; border-top: 1px solid #313244;
}
</style>
