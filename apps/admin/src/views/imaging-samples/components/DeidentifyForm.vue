<template>
  <div>
    <div class="is-grid">
      <div v-for="f in FIELDS" :key="f.key" class="filter-item" :style="f.span ? 'grid-column:span ' + f.span : ''">
        <label>
          {{ f.label }}
          <span v-if="f.locked" class="badge badge-info" style="margin-left:6px">强制全掩</span>
          <span v-else-if="f.rule" class="text-secondary" style="font-weight:400"> · {{ f.ruleText }}</span>
        </label>
        <input v-if="!f.locked" class="input" v-model="model[f.key]" :placeholder="f.placeholder" style="width:100%" @input="pushUp">
        <input v-else class="input" :value="model[f.key]" disabled style="width:100%;background:#F5F7FA">
        <span v-if="errors[f.key]" class="text-error" style="font-size:11.5px">{{ errors[f.key] }}</span>
      </div>
      <div class="filter-item" style="grid-column:span 4">
        <label>临床主要信息及检查目的<span class="text-secondary" style="font-weight:400"> · 原样录入临床申请信息，对应 GEN-04（10 分）</span></label>
        <textarea class="input" v-model="clinicalModel" rows="3" style="width:100%;resize:vertical"
                  placeholder="如：咳嗽伴痰中带血 2 周。胸部 CT 平扫发现右肺上叶占位，请评估结节性质，并回答有无纵隔淋巴结肿大及胸腔积液。"></textarea>
      </div>
    </div>

    <div v-if="missing.length || Object.keys(errors).length" class="is-invalid">
      <div v-for="(p, i) in missing" :key="'m' + i"><i class="fa-solid fa-circle-exclamation"></i> {{ p }}</div>
      <div v-for="(p, k) in errors" :key="'e' + k"><i class="fa-solid fa-circle-exclamation"></i> {{ FIELDS.find(f => f.key === k).label }}：{{ p }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'

/** 脱敏字段与硬校验（PRD §5.12.4）—— 不合规不允许保存 */
const FIELDS = [
  { key: 'name', label: '患者姓名', ruleText: '仅露首字，必须含 *', placeholder: '张*', test: v => /^\S\*+$/.test(v), msg: '须形如「张*」（仅露首字）' },
  { key: 'ageRange', label: '年龄', ruleText: '必须是年龄段，拒绝具体年龄', placeholder: '50–59 岁', test: v => /^\d{1,3}\s*[–\-~至]\s*\d{1,3}\s*岁$/.test(v), msg: '须形如「50–59 岁」（年龄段）' },
  { key: 'sex', label: '性别', placeholder: '女' },
  { key: 'dept', label: '科别', placeholder: '呼吸内科' },
  { key: 'examNo', label: '检查号', ruleText: '保留后 4 位', placeholder: '****1234', test: v => /^\*{4}\d{4}$/.test(v), msg: '须形如「****1234」（保留后 4 位）' },
  { key: 'imageNo', label: '影像号', ruleText: '保留后 4 位', placeholder: '****5678', test: v => /^\*{4}\d{4}$/.test(v), msg: '须形如「****5678」（保留后 4 位）' },
  { key: 'inpatientNo', label: '住院/门诊号', locked: true },
  { key: 'cardNo', label: '就诊卡号', locked: true },
  { key: 'examTime', label: '检查时间', ruleText: '原样', placeholder: '2026-09-16 14:32', span: 2 }
]

const props = defineProps({
  deidentify: { type: Object, required: true },
  clinicalBrief: { type: String, default: '' }
})
const emit = defineEmits(['update:deidentify', 'update:clinicalBrief'])

const model = reactive({ ...props.deidentify })
const clinicalModel = computed({
  get: () => props.clinicalBrief,
  set: v => emit('update:clinicalBrief', v)
})

// 父组件替换样本时同步；全掩字段锁死为 ****
watch(() => props.deidentify, v => {
  Object.assign(model, v)
  model.inpatientNo = '****'
  model.cardNo = '****'
}, { deep: true })

Object.assign(model, { inpatientNo: '****', cardNo: '****' })

/** 格式错误：只对**已填写**的字段判，避免新建空白表单一片红 */
const errors = computed(() => {
  const out = {}
  FIELDS.forEach(f => {
    if (f.locked) return
    const v = String(model[f.key] || '').trim()
    if (!v) return
    if (f.test && !f.test(v)) out[f.key] = f.msg
  })
  return out
})

/** 必填缺失 */
const missing = computed(() => FIELDS
  .filter(f => !f.locked && !String(model[f.key] || '').trim())
  .map(f => `${f.label}未填写`))

/** 提交前由父组件调用；返回问题清单（空数组 = 通过） */
function validate() {
  emit('update:deidentify', { ...model })
  return [...missing.value, ...Object.values(errors.value)]
}
defineExpose({ validate })

function pushUp() {
  emit('update:deidentify', { ...model })
}
</script>

<style scoped>
.is-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px 16px; align-items: end; }
.is-tip {
  margin-top: 14px; padding: 10px 14px; border-radius: 8px;
  background: #F5F7FA; color: var(--text-secondary); font-size: 12px; line-height: 1.9;
}
.is-invalid {
  margin-top: 10px; padding: 10px 14px; border-radius: 8px;
  background: #FFF1F0; border: 1px solid #FFCCC7; color: #CF1322; font-size: 12.5px; line-height: 1.9;
}
</style>
