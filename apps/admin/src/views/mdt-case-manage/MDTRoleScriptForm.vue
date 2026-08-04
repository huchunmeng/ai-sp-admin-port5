<template>
  <div>
    <h3>观察者（observer）</h3>
    <div class="filter-item" style="width:100%">
      <label>开场白（主持人迎接）</label>
      <textarea class="input" rows="2" v-model="f.roleScripts.observer.opening" placeholder="如：各位专家，今天讨论…请学员旁听，可随时提问。"></textarea>
    </div>
    <div class="filter-item" style="max-width:360px">
      <label>输入框占位提示</label>
      <input class="input" v-model="f.roleScripts.observer.interruptHint" placeholder="如：输入你的疑问...">
    </div>

    <h3>住院医师（resident）</h3>
    <div class="filter-item" style="width:100%">
      <label>开场白（主持人点名）</label>
      <textarea class="input" rows="2" v-model="f.roleScripts.resident.opening" placeholder="如：请住院医师先说说你对这个病例的初步印象。"></textarea>
    </div>
    <label class="ref-label">各阶段点名语（callOut）</label>
    <div v-for="(c, i) in f.roleScripts.resident.callOut" :key="i" class="list-item">
      <input class="input" v-model="f.roleScripts.resident.callOut[i]" :placeholder="`点名语 ${i + 1}`">
      <button class="btn btn-sm btn-danger" @click="f.roleScripts.resident.callOut.splice(i, 1)">删除</button>
    </div>
    <button class="btn btn-sm" @click="f.roleScripts.resident.callOut.push('')">+ 添加点名语</button>

    <h3>主诊医师（attending）</h3>
    <div class="filter-item" style="width:100%">
      <label>开场白（请主诊汇报）</label>
      <textarea class="input" rows="2" v-model="f.roleScripts.attending.opening" placeholder="如：您作为主诊医师，请先汇报病例并组织本次讨论。"></textarea>
    </div>
    <label class="ref-label">引导语（promptTemplates）</label>
    <div v-for="(p, i) in f.roleScripts.attending.promptTemplates" :key="i" class="list-item">
      <input class="input" v-model="f.roleScripts.attending.promptTemplates[i]" :placeholder="`引导语 ${i + 1}`">
      <button class="btn btn-sm btn-danger" @click="f.roleScripts.attending.promptTemplates.splice(i, 1)">删除</button>
    </div>
    <button class="btn btn-sm" @click="f.roleScripts.attending.promptTemplates.push('')">+ 添加引导语</button>
  </div>
</template>

<script setup>
const props = defineProps({ form: { type: Object, required: true } })
const f = props.form
</script>

<style scoped>
h3 { margin: 28px 0 8px; font-size: 15px; color: var(--text-main); }
h3:first-child { margin-top: 0; }
.filter-item { display: flex; flex-direction: column; gap: 4px; margin-bottom: 14px; }
.filter-item label { font-size: 12px; color: var(--text-secondary); }
.filter-item .input, .filter-item textarea { width: 100%; }
.ref-label { display: block; font-size: 13px; font-weight: 500; margin: 4px 0 8px; }
.list-item { display: flex; gap: 8px; margin-bottom: 6px; }
.list-item > .input { flex: 1; }
</style>
