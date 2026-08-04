<template>
  <div>
    <h3>讨论阶段（stages）</h3>
    <p class="block-desc">阶段指示器按此展示；留空则训练端使用默认五阶段。agenda 的「阶段」数字应与此对齐（从 0 开始）</p>
    <div v-for="(s, i) in f.stages" :key="i" class="list-item">
      <input class="input" v-model="f.stages[i]">
      <button class="btn btn-sm btn-danger" @click="f.stages.splice(i, 1)">删除</button>
    </div>
    <button class="btn btn-sm" @click="f.stages.push('')">+ 添加阶段</button>

    <h3>讨论剧本（agenda）</h3>
    <p class="block-desc">按此顺序逐条播放；带 nextTask 的条目发言后暂停，弹出学员任务卡片</p>
    <div v-for="(a, i) in f.agenda" :key="i" class="item-panel">
      <div class="agenda-head">
        <span class="agenda-phase">阶段 {{ a.phase }}</span>
        <input class="input" style="width:70px" type="number" min="0" max="6" v-model.number="f.agenda[i].phase" placeholder="阶段">
        <select class="select" style="flex:1" v-model="f.agenda[i].speaker">
          <option value="host">主持人</option>
          <option v-for="d in f.disciplines" :key="d" :value="d">{{ d }}</option>
        </select>
        <select class="select" style="flex:1" v-model="f.agenda[i].nextTask">
          <option value="">无任务</option>
          <option v-for="t in f.tasks" :key="t.key || t.type" :value="t.key">{{ t.label || t.key || t.type }}</option>
        </select>
        <button class="btn btn-sm btn-danger" @click="f.agenda.splice(i, 1)">删除</button>
      </div>
      <textarea class="input" rows="2" v-model="f.agenda[i].text" :placeholder="`第 ${i + 1} 条发言内容`"></textarea>
    </div>
    <button class="btn btn-sm" @click="addAgenda">+ 添加发言</button>

    <h3>任务卡片（tasks）</h3>
    <p class="block-desc">通用任务模型：text（文字作答）/ choice（选择作答）/ exhibit（影像标注）。agenda 的 nextTask 引用任务 key，任务可任意组合。</p>
    <div v-for="(t, i) in f.tasks" :key="i" class="item-panel">
      <div class="task-head">
        <input class="input" style="width:100px" v-model="f.tasks[i].key" placeholder="任务key">
        <select class="select" style="flex:1" v-model="f.tasks[i].type" @change="ensureTaskShape(i)">
          <option v-for="tt in MDT_TASK_TYPES" :key="tt.value" :value="tt.value">{{ tt.label }}</option>
        </select>
        <select class="select" style="width:130px" v-model="f.tasks[i].assess">
          <option value="">不纳入画像</option>
          <option v-for="a in MDT_TASK_ASSESS" :key="a.value" :value="a.value">{{ a.label }}</option>
        </select>
        <button class="btn btn-sm btn-danger" @click="f.tasks.splice(i, 1)">删除</button>
      </div>
      <div class="form-grid">
        <div class="form-item">
          <label>任务标题</label>
          <input class="input" v-model="f.tasks[i].label" placeholder="如：初步诊断印象">
        </div>
      </div>
      <div class="form-item">
        <label>任务说明</label>
        <textarea class="input" rows="2" v-model="f.tasks[i].prompt" placeholder="任务说明"></textarea>
      </div>

      <template v-if="f.tasks[i].type === 'text'">
        <div class="form-grid">
          <div class="form-item">
            <label>输入行数</label>
            <input class="input" type="number" min="1" max="10" v-model.number="f.tasks[i].rows">
          </div>
          <div class="form-item">
            <label>占位提示</label>
            <input class="input" v-model="f.tasks[i].placeholder" placeholder="换行用 \n">
          </div>
        </div>
      </template>

      <template v-if="f.tasks[i].type === 'choice'">
        <div class="form-item">
          <label class="check-label">
            <input type="checkbox" v-model="f.tasks[i].multi"> 允许多选
          </label>
        </div>
        <label class="sub-label">选项（勾选为正确答案）</label>
        <div v-for="(o, oi) in f.tasks[i].options" :key="oi" class="list-item">
          <input type="checkbox" class="opt-check" :checked="isCorrect(i, oi)" @change="toggleCorrect(i, oi)">
          <input class="input" v-model="f.tasks[i].options[oi]">
          <button class="btn btn-sm btn-danger" @click="f.tasks[i].options.splice(oi, 1)">删除</button>
        </div>
        <button class="btn btn-sm" @click="f.tasks[i].options.push('')">+ 添加选项</button>
      </template>

      <template v-if="f.tasks[i].type === 'exhibit'">
        <div class="form-grid">
          <div class="form-item">
            <label>影像标题</label>
            <input class="input" v-model="f.tasks[i].image.title" placeholder="如：胸部CT·肺窗">
          </div>
          <div class="form-item">
            <label>影像模态</label>
            <input class="input" v-model="f.tasks[i].image.modality" placeholder="如：CT">
          </div>
        </div>
        <label class="sub-label">标注期望病灶</label>
        <div v-for="(e, ei) in f.tasks[i].image.expected" :key="ei" class="list-item">
          <input class="input" v-model="f.tasks[i].image.expected[ei]">
          <button class="btn btn-sm btn-danger" @click="f.tasks[i].image.expected.splice(ei, 1)">删除</button>
        </div>
        <button class="btn btn-sm" @click="f.tasks[i].image.expected.push('')">+ 添加期望病灶</button>
      </template>

      <div class="fb-block">
        <label class="fb-label">任务反馈</label>
        <div class="fb-col">
          <label class="fb-sub">命中（学员答对时展示）</label>
          <div v-for="(h, hi) in f.tasks[i].feedback.hits" :key="'h' + hi" class="list-item">
            <input class="input" style="width:70px" v-model="f.tasks[i].feedback.hits[hi].icon" placeholder="✓">
            <input class="input" v-model="f.tasks[i].feedback.hits[hi].point" placeholder="反馈要点">
            <button class="btn btn-sm btn-danger" @click="f.tasks[i].feedback.hits.splice(hi, 1)">删除</button>
          </div>
          <button class="btn btn-sm" @click="f.tasks[i].feedback.hits.push({ icon: '✓', point: '' })">+ 添加命中</button>
        </div>
        <div class="fb-col">
          <label class="fb-sub">遗漏（学员遗漏时展示）</label>
          <div v-for="(m, mi) in f.tasks[i].feedback.misses" :key="'m' + mi" class="list-item">
            <input class="input" style="width:70px" v-model="f.tasks[i].feedback.misses[mi].icon" placeholder="✗">
            <input class="input" v-model="f.tasks[i].feedback.misses[mi].point" placeholder="反馈要点">
            <button class="btn btn-sm btn-danger" @click="f.tasks[i].feedback.misses.splice(mi, 1)">删除</button>
          </div>
          <button class="btn btn-sm" @click="f.tasks[i].feedback.misses.push({ icon: '✗', point: '' })">+ 添加遗漏</button>
        </div>
      </div>
    </div>
    <button class="btn btn-sm" @click="addTask">+ 添加任务</button>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { MDT_TASK_TYPES, MDT_TASK_ASSESS } from './shared.js'

const props = defineProps({ form: { type: Object, required: true } })
const f = props.form

function addAgenda() {
  f.agenda.push({ phase: f.agenda.length, speaker: 'host', text: '', nextTask: '' })
}

function addTask() {
  f.tasks.push({
    key: `task${f.tasks.length + 1}`,
    type: 'text',
    label: '',
    assess: '',
    prompt: '',
    rows: 4,
    placeholder: '',
    options: [],
    correct: [],
    multi: false,
    image: { title: '', modality: '', expected: [] },
    feedback: { hits: [], misses: [] }
  })
}

function ensureTaskShape(i) {
  const t = f.tasks[i]
  if (!t.image) t.image = { title: '', modality: '', expected: [] }
  if (!Array.isArray(t.options)) t.options = []
  if (!Array.isArray(t.correct)) t.correct = []
  if (!t.feedback) t.feedback = { hits: [], misses: [] }
  if (!Array.isArray(t.feedback.hits)) t.feedback.hits = []
  if (!Array.isArray(t.feedback.misses)) t.feedback.misses = []
  if (t.rows == null) t.rows = 4
}

function isCorrect(i, oi) {
  return (f.tasks[i].correct || []).includes(f.tasks[i].options[oi])
}

function toggleCorrect(i, oi) {
  const opt = f.tasks[i].options[oi]
  if (!opt) return
  if (!Array.isArray(f.tasks[i].correct)) f.tasks[i].correct = []
  const correct = f.tasks[i].correct
  const idx = correct.indexOf(opt)
  if (idx >= 0) {
    correct.splice(idx, 1)
  } else if (f.tasks[i].multi) {
    correct.push(opt)
  } else {
    correct.length = 0
    correct.push(opt)
  }
}

onMounted(() => {
  if (!Array.isArray(f.stages)) f.stages = []
  f.tasks.forEach((_, i) => ensureTaskShape(i))
})
</script>

<style scoped>
h3 { margin: 28px 0 8px; font-size: 15px; color: var(--text-main); }
h3:first-child { margin-top: 0; }
.block-desc { margin: 0 0 12px; font-size: 12px; color: var(--text-secondary); }
.list-item { display: flex; gap: 8px; margin-bottom: 6px; }
.list-item > .input { flex: 1; }
.item-panel {
  border: 1px solid var(--border); border-radius: 10px;
  padding: 12px; margin-bottom: 12px; background: var(--card-bg);
}
.agenda-head, .task-head { display: flex; gap: 8px; margin-bottom: 8px; }
.agenda-phase { font-size: 13px; font-weight: 600; color: var(--primary); align-self: center; min-width: 56px; }
.opt-check { align-self: center; }
.form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0 16px; }
.form-item { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; }
.form-item label, .sub-label { font-size: 12px; color: var(--text-secondary); }
.sub-label { display: block; margin-bottom: 6px; }
.check-label { display: flex; align-items: center; gap: 8px; font-weight: 500; color: var(--text-main); }
.fb-block {
  margin-top: 10px; border: 1px dashed var(--border); border-radius: 8px;
  padding: 10px; background: var(--background);
}
.fb-label { font-weight: 600; display: block; margin-bottom: 8px; font-size: 13px; color: var(--text-main); }
.fb-col { margin-bottom: 8px; }
.fb-sub { font-size: 12px; color: var(--text-secondary); display: block; margin-bottom: 4px; }
</style>
