<template>
  <div class="card mb-4">
    <h4>MDT 决策</h4>
    <div class="form-item">
      <label>最终决策</label>
      <textarea class="input" rows="3" v-model="f.decision" placeholder="MDT 最终诊疗决策，用于能力画像比对"></textarea>
    </div>
    <div class="form-item">
      <label>随访计划</label>
      <textarea class="input" rows="2" v-model="f.followUp"></textarea>
    </div>
    <label style="font-weight:500;margin-bottom:6px;display:block">参考文献</label>
    <div v-for="(r, i) in f.referencesList" :key="i" class="list-item">
      <input class="input" v-model="f.referencesList[i]" :placeholder="`文献 ${i + 1}`">
      <button class="btn btn-sm btn-danger" @click="f.referencesList.splice(i, 1)">删除</button>
    </div>
    <button class="btn btn-sm" @click="f.referencesList.push('')">+ 添加文献</button>
  </div>

  <div class="card mb-4">
    <h4>任务反馈</h4>
    <p class="text-secondary" style="font-size:12px">任务级反馈（命中/遗漏）已在「剧本与任务」中逐任务配置，此处不再重复维护。</p>
  </div>
</template>

<script setup>
const props = defineProps({ form: { type: Object, required: true } })
const f = props.form
</script>

<style scoped>
h4 { margin: 0 0 14px; font-size: 15px; }
.list-item { display: flex; gap: 8px; margin-bottom: 6px; }
.list-item > .input { flex: 1; }
</style>
