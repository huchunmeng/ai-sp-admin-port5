<template>
  <div class="card mb-4">
    <h4>患者基本信息</h4>
    <div class="form-grid">
      <div class="form-item">
        <label>姓名</label>
        <input class="input" v-model="f.patientInfo.name">
      </div>
      <div class="form-item">
        <label>性别</label>
        <select class="select" v-model="f.patientInfo.gender">
          <option value="男">男</option>
          <option value="女">女</option>
        </select>
      </div>
      <div class="form-item">
        <label>年龄</label>
        <input class="input" type="number" min="0" max="120" v-model.number="f.patientInfo.age">
      </div>
    </div>
    <div class="form-item">
      <label>主诉</label>
      <textarea class="input" rows="2" v-model="f.patientInfo.chiefComplaint" placeholder="如：咳嗽、痰中带血2周，加重伴胸闷3天"></textarea>
    </div>
    <div class="form-item">
      <label>现病史</label>
      <textarea class="input" rows="3" v-model="f.patientInfo.presentIllness"></textarea>
    </div>
    <div class="form-grid">
      <div class="form-item">
        <label>体格检查</label>
        <textarea class="input" rows="2" v-model="f.patientInfo.physicalExam"></textarea>
      </div>
      <div class="form-item">
        <label>生命体征</label>
        <textarea class="input" rows="2" v-model="f.patientInfo.vitals" placeholder="如：T 37.2℃ / P 88 / R 20 / BP 138/85mmHg"></textarea>
      </div>
    </div>
    <div class="form-grid">
      <div class="form-item">
        <label>实验室检查</label>
        <textarea class="input" rows="2" v-model="f.patientInfo.labTests" placeholder="如：Hb 118g/L，WBC 9.8×10⁹/L，CEA 18ng/ml"></textarea>
      </div>
      <div class="form-item">
        <label>影像学检查</label>
        <textarea class="input" rows="2" v-model="f.patientInfo.imagingText" placeholder="如：CT示右肺上叶2.8×2.3cm结节，分叶+毛刺+空泡征"></textarea>
      </div>
    </div>
    <div class="form-grid">
      <div class="form-item">
        <label>既往史</label>
        <textarea class="input" rows="2" v-model="f.patientInfo.pastHistory"></textarea>
      </div>
      <div class="form-item">
        <label>家族史</label>
        <textarea class="input" rows="2" v-model="f.patientInfo.familyHistory"></textarea>
      </div>
    </div>
  </div>

  <div class="card mb-4">
    <h4>病例定位</h4>
    <div class="form-grid">
      <div class="form-item">
        <label>难度阶段</label>
        <select class="select" v-model="f.teachingPhase">
          <option v-for="p in TEACHING_PHASES" :key="p.value" :value="p.value">{{ p.label }}</option>
        </select>
      </div>
      <div class="form-item">
        <label>病例分级</label>
        <select class="select" v-model="f.levelLabel">
          <option v-for="l in LEVEL_LABELS" :key="l" :value="l">{{ l }}</option>
        </select>
      </div>
      <div class="form-item">
        <label>学科分类</label>
        <select class="select" v-model="f.filterKey">
          <option value="">—</option>
          <option v-for="k in MDT_FILTER_KEYS" :key="k.value" :value="k.value">{{ k.label }}</option>
        </select>
      </div>
      <div class="form-item">
        <label>来源</label>
        <input class="input" v-model="f.source" placeholder="如：院士精讲 / 金牌导师 / 国家级质控中心">
      </div>
    </div>
    <div class="form-item">
      <label>核心目标</label>
      <textarea class="input" rows="2" v-model="f.objective" placeholder="本次 MDT 要解决的核心问题"></textarea>
    </div>
    <div class="form-item">
      <label>参与学科（点击选择）</label>
      <div class="chip-wrap">
        <span
          v-for="d in MDT_DISCIPLINES"
          :key="d"
          :class="['chip', { active: f.disciplines.includes(d) }]"
          @click="toggleDiscipline(d)"
        >{{ d }}</span>
      </div>
    </div>
    <div v-if="f.sourceType === 'raw'" class="raw-ref-info">
      引用原始病历：<code>{{ f.sourceRecordId || '—' }}</code>
    </div>
  </div>
</template>

<script setup>
import { MDT_DISCIPLINES, MDT_FILTER_KEYS, TEACHING_PHASES, LEVEL_LABELS } from './shared.js'

const props = defineProps({ form: { type: Object, required: true } })
const f = props.form

function toggleDiscipline(d) {
  const i = f.disciplines.indexOf(d)
  if (i >= 0) f.disciplines.splice(i, 1)
  else f.disciplines.push(d)
}
</script>

<style scoped>
h4 { margin: 0 0 14px; font-size: 15px; }
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0 20px;
}
.chip-wrap { display: flex; flex-wrap: wrap; gap: 8px; }
.chip {
  padding: 5px 14px; border-radius: 16px; border: 1px solid var(--border);
  cursor: pointer; font-size: 13px; color: var(--text-secondary); user-select: none;
}
.chip.active { background: var(--primary); color: #fff; border-color: var(--primary); }
.raw-ref-info {
  margin-top: 12px; font-size: 13px; color: var(--text-secondary);
  background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 14px;
}
</style>
