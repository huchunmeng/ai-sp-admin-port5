<template>
  <div>
    <h3>MDT 决策</h3>
    <div class="filter-item" style="width:100%">
      <label>最终决策</label>
      <textarea class="input" rows="3" v-model="f.decision" placeholder="MDT 最终诊疗决策，用于能力画像比对"></textarea>
    </div>
    <div class="filter-item" style="width:100%">
      <label>随访计划</label>
      <textarea class="input" rows="2" v-model="f.followUp"></textarea>
    </div>
    <label class="ref-label">参考文献</label>
    <div v-for="(r, i) in f.referencesList" :key="i" class="list-item">
      <input class="input" v-model="f.referencesList[i]" :placeholder="`文献 ${i + 1}`">
      <button class="btn btn-sm btn-danger" @click="f.referencesList.splice(i, 1)">删除</button>
    </div>
    <button class="btn btn-sm" @click="f.referencesList.push('')">+ 添加文献</button>

    <h3>任务反馈</h3>
    <p class="block-desc">任务级反馈（命中/遗漏）已在「剧本与任务」中逐任务配置，此处不再重复维护。</p>
  </div>
</template>

<script setup>
const props = defineProps({ form: { type: Object, required: true } })
const f = props.form
</script>

<style scoped>
h3 { margin: 28px 0 8px; font-size: 15px; color: var(--text-main); }
h3:first-child { margin-top: 0; }
.block-desc { margin: 0; font-size: 12px; color: var(--text-secondary); }
.filter-item { display: flex; flex-direction: column; gap: 4px; margin-bottom: 14px; }
.filter-item label { font-size: 12px; color: var(--text-secondary); }
.filter-item .input, .filter-item textarea { width: 100%; }
.ref-label { display: block; font-size: 13px; font-weight: 500; margin: 4px 0 8px; }
.list-item { display: flex; gap: 8px; margin-bottom: 6px; }
.list-item > .input { flex: 1; }
</style>
