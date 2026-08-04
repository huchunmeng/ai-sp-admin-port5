<template>
  <div>
    <h3>患者基本信息</h3>
    <div class="filter-row">
      <div class="filter-item" style="max-width:200px"><label>姓名</label><input class="input" v-model="f.patientInfo.name"></div>
      <div class="filter-item" style="max-width:120px"><label>性别</label><select class="select" v-model="f.patientInfo.gender"><option value="男">男</option><option value="女">女</option></select></div>
      <div class="filter-item" style="max-width:120px"><label>年龄</label><input class="input" type="number" min="0" max="120" v-model.number="f.patientInfo.age"></div>
    </div>
    <div class="filter-item" style="width:100%"><label>主诉</label><textarea class="input" rows="2" v-model="f.patientInfo.chiefComplaint" placeholder="如：咳嗽、痰中带血2周，加重伴胸闷3天"></textarea></div>
    <div class="filter-item" style="width:100%"><label>现病史</label><textarea class="input" rows="3" v-model="f.patientInfo.presentIllness"></textarea></div>
    <div class="filter-row">
      <div class="filter-item"><label>体格检查</label><textarea class="input" rows="2" v-model="f.patientInfo.physicalExam"></textarea></div>
      <div class="filter-item"><label>生命体征</label><textarea class="input" rows="2" v-model="f.patientInfo.vitals" placeholder="如：T 37.2℃ / P 88 / R 20 / BP 138/85mmHg"></textarea></div>
    </div>
    <div class="filter-row">
      <div class="filter-item"><label>实验室检查</label><textarea class="input" rows="2" v-model="f.patientInfo.labTests" placeholder="如：Hb 118g/L，WBC 9.8×10⁹/L，CEA 18ng/ml"></textarea></div>
      <div class="filter-item"><label>影像学检查</label><textarea class="input" rows="2" v-model="f.patientInfo.imagingText" placeholder="如：CT示右肺上叶2.8×2.3cm结节，分叶+毛刺+空泡征"></textarea></div>
    </div>
    <div class="filter-row">
      <div class="filter-item"><label>既往史</label><textarea class="input" rows="2" v-model="f.patientInfo.pastHistory"></textarea></div>
      <div class="filter-item"><label>家族史</label><textarea class="input" rows="2" v-model="f.patientInfo.familyHistory"></textarea></div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({ form: { type: Object, required: true } })
const f = props.form
</script>

<style scoped>
h3 { margin: 28px 0 16px; font-size: 15px; color: var(--text-main); }
h3:first-child { margin-top: 0; }
.filter-row { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 16px; margin-bottom: 20px; }
.filter-item { display: flex; flex-direction: column; gap: 4px; min-width: 140px; flex: 1 0 auto; }
.filter-item label { font-size: 12px; color: var(--text-secondary); }
.filter-item .input, .filter-item .select, .filter-item textarea { width: 100%; }
</style>
