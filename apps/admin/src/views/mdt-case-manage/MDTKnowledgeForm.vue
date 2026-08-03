<template>
  <div class="card mb-4">
    <h4>核心议题</h4>
    <p class="text-secondary" style="font-size:12px">MDT 讨论围绕的核心问题（左侧面板「MDT」Tab 展示）</p>
    <div v-for="(q, i) in f.keyQuestions" :key="i" class="list-item">
      <textarea class="input" rows="2" v-model="f.keyQuestions[i]" :placeholder="`议题 ${i + 1}`"></textarea>
      <button class="btn btn-sm btn-danger" @click="f.keyQuestions.splice(i, 1)">删除</button>
    </div>
    <button class="btn btn-sm" @click="f.keyQuestions.push('')">+ 添加议题</button>
  </div>

  <div class="card mb-4">
    <h4>知识库 — 各学科观点</h4>
    <p class="text-secondary" style="font-size:12px">各参与学科的专业视角与分歧来源（驱动阶段2 起的分歧与 LLM 插话）</p>
    <div v-for="(p, i) in f.knowledgeBase.disciplinePerspectives" :key="i" class="list-item" style="align-items:flex-start">
      <div style="flex:1">
        <select class="select" style="width:100%;margin-bottom:6px" v-model="f.knowledgeBase.disciplinePerspectives[i].dept">
          <option value="">— 学科 —</option>
          <option v-for="d in MDT_DISCIPLINES" :key="d" :value="d">{{ d }}</option>
        </select>
        <textarea class="input" rows="3" v-model="f.knowledgeBase.disciplinePerspectives[i].view" placeholder="该学科的观点、循证依据与分歧点"></textarea>
        <details class="expert-config">
          <summary>专家配置（阶段3 多智能体，可留空走降级）</summary>
          <input class="input" style="width:100%;margin-top:6px" v-model="f.knowledgeBase.disciplinePerspectives[i].expertName" placeholder="专家姓名（如：陈明）">
          <input class="input" style="width:100%;margin-top:4px" v-model="f.knowledgeBase.disciplinePerspectives[i].expertTitle" placeholder="专家头衔（如：心血管内科 · 主任医师）">
          <input class="input" style="width:100%;margin-top:4px" v-model="f.knowledgeBase.disciplinePerspectives[i].persona" placeholder="人设/发言风格（如：严谨务实，重视循证）">
          <textarea class="input" rows="5" style="margin-top:4px" v-model="f.knowledgeBase.disciplinePerspectives[i].expertKB" placeholder="该学科独立知识库（LLM 生成，训练端多智能体发言依据；留空=该学科走静态/单智能体降级）"></textarea>
        </details>
      </div>
      <button class="btn btn-sm btn-danger" @click="f.knowledgeBase.disciplinePerspectives.splice(i, 1)">删除</button>
    </div>
    <button class="btn btn-sm" @click="f.knowledgeBase.disciplinePerspectives.push(createEmptyDisciplinePerspective())">+ 添加学科观点</button>
  </div>

  <div class="card mb-4">
    <h4>知识库 — 临床要点与参考文献</h4>
    <div class="form-item">
      <label>临床关键要点</label>
      <textarea class="input" rows="3" v-model="f.knowledgeBase.clinicalKeyPoints" placeholder="本病例的诊疗关键要点与陷阱"></textarea>
    </div>
    <label style="font-weight:500;margin-bottom:6px;display:block">参考文献</label>
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
h4 { margin: 0 0 6px; font-size: 15px; }
.list-item {
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 8px;
}
.list-item > .input { flex: 1; }
.list-item > div { flex: 1; }
</style>
