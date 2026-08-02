<template>
  <div class="card mb-4">
    <h4>观察者（observer）</h4>
    <div class="form-item">
      <label>开场白（主持人迎接）</label>
      <textarea class="input" rows="2" v-model="f.roleScripts.observer.opening" placeholder="如：各位专家，今天讨论…请学员旁听，可随时提问。"></textarea>
    </div>
    <div class="form-item">
      <label>输入框占位提示</label>
      <input class="input" v-model="f.roleScripts.observer.interruptHint" placeholder="如：输入你的疑问...">
    </div>
  </div>

  <div class="card mb-4">
    <h4>住院医师（resident）</h4>
    <div class="form-item">
      <label>开场白（主持人点名）</label>
      <textarea class="input" rows="2" v-model="f.roleScripts.resident.opening" placeholder="如：请住院医师先说说你对这个病例的初步印象。"></textarea>
    </div>
    <label style="font-weight:500;margin-bottom:6px;display:block">各阶段点名语（callOut）</label>
    <div v-for="(c, i) in f.roleScripts.resident.callOut" :key="i" class="list-item">
      <input class="input" v-model="f.roleScripts.resident.callOut[i]" :placeholder="`点名语 ${i + 1}`">
      <button class="btn btn-sm btn-danger" @click="f.roleScripts.resident.callOut.splice(i, 1)">删除</button>
    </div>
    <button class="btn btn-sm" @click="f.roleScripts.resident.callOut.push('')">+ 添加点名语</button>
  </div>

  <div class="card mb-4">
    <h4>主诊医师（attending）</h4>
    <div class="form-item">
      <label>开场白（请主诊汇报）</label>
      <textarea class="input" rows="2" v-model="f.roleScripts.attending.opening" placeholder="如：您作为主诊医师，请先汇报病例并组织本次讨论。"></textarea>
    </div>
    <label style="font-weight:500;margin-bottom:6px;display:block">引导语（promptTemplates）</label>
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
h4 { margin: 0 0 14px; font-size: 15px; }
.list-item { display: flex; gap: 8px; margin-bottom: 6px; }
.list-item > .input { flex: 1; }
</style>
