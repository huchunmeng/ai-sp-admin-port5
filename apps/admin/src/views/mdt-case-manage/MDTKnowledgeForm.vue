<template>
  <div>
    <h3>核心议题</h3>
    <p class="block-desc">MDT 讨论围绕的核心问题（左侧面板「MDT」Tab 展示）</p>
    <div v-for="(q, i) in f.keyQuestions" :key="i" class="list-item">
      <textarea class="input" rows="2" v-model="f.keyQuestions[i]" :placeholder="`议题 ${i + 1}`"></textarea>
      <button class="btn btn-sm btn-danger" @click="f.keyQuestions.splice(i, 1)">删除</button>
    </div>
    <button class="btn btn-sm" @click="f.keyQuestions.push('')">+ 添加议题</button>

    <h3>知识库 — 各学科观点</h3>
    <p class="block-desc">各参与学科的专业视角与分歧来源（驱动阶段2 起的分歧与 LLM 插话）</p>
    <div v-for="(p, i) in f.knowledgeBase.disciplinePerspectives" :key="i" class="disc-panel">
      <div class="disc-head">
        <select class="select" style="max-width:180px" v-model="f.knowledgeBase.disciplinePerspectives[i].dept">
          <option value="">— 学科 —</option>
          <option v-for="d in MDT_DISCIPLINES" :key="d" :value="d">{{ d }}</option>
        </select>
        <button class="btn btn-sm btn-danger" @click="f.knowledgeBase.disciplinePerspectives.splice(i, 1)">删除</button>
      </div>
      <div class="filter-item" style="width:100%">
        <label>学科观点</label>
        <textarea class="input" rows="3" v-model="f.knowledgeBase.disciplinePerspectives[i].view" placeholder="该学科的观点、循证依据与分歧点"></textarea>
      </div>
      <details class="expert-config">
        <summary>专家配置（阶段3 多智能体，可留空走降级）</summary>
        <div class="filter-row" style="margin-top:10px">
          <div class="filter-item"><label>专家姓名</label><input class="input" v-model="f.knowledgeBase.disciplinePerspectives[i].expertName" placeholder="如：陈明"></div>
          <div class="filter-item"><label>专家头衔</label><input class="input" v-model="f.knowledgeBase.disciplinePerspectives[i].expertTitle" placeholder="如：心血管内科 · 主任医师"></div>
          <div class="filter-item"><label>人设/发言风格</label><input class="input" v-model="f.knowledgeBase.disciplinePerspectives[i].persona" placeholder="如：严谨务实，重视循证"></div>
        </div>
        <div class="filter-item" style="width:100%">
          <label>学科独立知识库</label>
          <textarea class="input" rows="5" v-model="f.knowledgeBase.disciplinePerspectives[i].expertKB" placeholder="该学科独立知识库（LLM 生成，训练端多智能体发言依据；留空=该学科走静态/单智能体降级）"></textarea>
        </div>
      </details>
    </div>
    <button class="btn btn-sm" @click="f.knowledgeBase.disciplinePerspectives.push(createEmptyDisciplinePerspective())">+ 添加学科观点</button>

    <h3>知识库 — 临床要点与参考文献</h3>
    <div class="filter-item" style="width:100%">
      <label>临床关键要点</label>
      <textarea class="input" rows="3" v-model="f.knowledgeBase.clinicalKeyPoints" placeholder="本病例的诊疗关键要点与陷阱"></textarea>
    </div>
    <label class="ref-label">参考文献</label>
    <div v-for="(r, i) in f.knowledgeBase.references" :key="i" class="list-item">
      <input class="input" v-model="f.knowledgeBase.references[i]" :placeholder="`文献 ${i + 1}`">
      <button class="btn btn-sm btn-danger" @click="f.knowledgeBase.references.splice(i, 1)">删除</button>
    </div>
    <button class="btn btn-sm" @click="f.knowledgeBase.references.push('')">+ 添加文献</button>
  </div>
</template>

<script setup>
import { MDT_DISCIPLINES, createEmptyDisciplinePerspective } from './shared.js'

const props = defineProps({ form: { type: Object, required: true } })
const f = props.form
</script>

<style scoped>
h3 { margin: 28px 0 8px; font-size: 15px; color: var(--text-main); }
h3:first-child { margin-top: 0; }
.block-desc { margin: 0 0 12px; font-size: 12px; color: var(--text-secondary); }
.list-item { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.list-item > .input, .list-item > textarea { flex: 1; }
.disc-panel {
  border: 1px solid var(--border); border-radius: 10px;
  padding: 12px 14px; margin-bottom: 12px; background: var(--card-bg);
}
.disc-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
.filter-item { display: flex; flex-direction: column; gap: 4px; min-width: 140px; }
.filter-item label { font-size: 12px; color: var(--text-secondary); }
.filter-item .input, .filter-item .select, .filter-item textarea { width: 100%; }
.expert-config { margin-top: 10px; font-size: 13px; color: var(--text-secondary); }
.expert-config summary { cursor: pointer; user-select: none; }
.filter-row { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 16px; }
.ref-label { display: block; font-size: 13px; font-weight: 500; margin: 14px 0 8px; }
</style>
