<template>
  <div>
    <div class="is-grid">
      <div v-for="f in FIELDS" :key="f.key" class="filter-item" :class="'is-w-' + f.key">
        <label>
          {{ f.label }}
          <span v-if="f.rule" class="text-secondary" style="font-weight:400"> · {{ f.ruleText }}</span>
        </label>
        <input v-if="f.type === 'datetime'" class="input" type="datetime-local"
               :value="toLocalInput(model[f.key])" @input="setTime($event.target.value)">
        <input v-else class="input" v-model="model[f.key]" :placeholder="f.placeholder" style="width:100%" @input="pushUp">
        <span v-if="errors[f.key]" class="text-error" style="font-size:11.5px">{{ errors[f.key] }}</span>
      </div>
      <div class="filter-item is-w-history">
        <label>患者病史</label>
        <textarea class="input" v-model="historyModel" rows="4" style="width:100%;resize:vertical"
                  placeholder="如：咳嗽伴痰中带血 2 周。胸部 CT 平扫发现右肺上叶占位。"></textarea>
      </div>
      <div class="filter-item is-w-purpose">
        <label>检查目的</label>
        <textarea class="input" v-model="purposeModel" rows="4" style="width:100%;resize:vertical"
                  placeholder="如：请评估结节性质，并回答有无纵隔淋巴结肿大及胸腔积液。"></textarea>
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

/** 患者信息字段与硬校验（PRD §5.12.4）—— 不合规不允许保存
 *  2026-09-20 批注：删掉「检查号 / 影像号 / 住院门诊号 / 就诊卡号」四个号码字段 */
const FIELDS = [
  { key: 'name', label: '患者姓名', ruleText: '仅露首字，必须含 *', placeholder: '张*', test: v => /^\S\*+$/.test(v), msg: '须形如「张*」（仅露首字）' },
  { key: 'ageRange', label: '年龄', ruleText: '必须是年龄段，拒绝具体年龄', placeholder: '50–59 岁', test: v => /^\d{1,3}\s*[–\-~至]\s*\d{1,3}\s*岁$/.test(v), msg: '须形如「50–59 岁」（年龄段）' },
  { key: 'sex', label: '性别', placeholder: '女' },
  { key: 'dept', label: '科别', placeholder: '呼吸内科' },
  { key: 'examTime', label: '检查时间', type: 'datetime' }
]

/** 存储形如 `2026-09-16 14:32`；`datetime-local` 需要 `2026-09-16T14:32` */
function toLocalInput(v) {
  const s = String(v || '').trim()
  if (!s) return ''
  return s.includes('T') ? s.slice(0, 16) : s.replace(' ', 'T').slice(0, 16)
}

function setTime(v) {
  model.examTime = String(v || '').replace('T', ' ')
  pushUp()
}

const props = defineProps({
  deidentify: { type: Object, required: true },
  history: { type: String, default: '' },
  purpose: { type: String, default: '' }
})
const emit = defineEmits(['update:deidentify', 'update:history', 'update:purpose'])

const model = reactive({ ...props.deidentify })
const historyModel = computed({
  get: () => props.history,
  set: v => emit('update:history', v)
})
const purposeModel = computed({
  get: () => props.purpose,
  set: v => emit('update:purpose', v)
})

// 父组件替换样本时同步
watch(() => props.deidentify, v => { Object.assign(model, v) }, { deep: true })

/** 格式错误：只对**已填写**的字段判，避免新建空白表单一片红 */
const errors = computed(() => {
  const out = {}
  FIELDS.forEach(f => {
    const v = String(model[f.key] || '').trim()
    if (!v) return
    if (f.test && !f.test(v)) out[f.key] = f.msg
  })
  return out
})

/** 必填缺失 */
const missing = computed(() => FIELDS
  .filter(f => !String(model[f.key] || '').trim())
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
.is-grid {
  display: grid;
  /* 五个字段排一行，按内容宽度分配（批注：性别/年龄窄一点、检查时间宽一点） */
  grid-template-columns: minmax(0, 1.4fr) minmax(0, .9fr) minmax(0, .7fr) minmax(0, 1fr) minmax(0, 1.3fr);
  gap: 12px 16px; align-items: end;
}
.is-w-history { grid-column: 1 / span 3; }
.is-w-purpose { grid-column: 4 / -1; }
.is-tip {
  margin-top: 14px; padding: 10px 14px; border-radius: 8px;
  background: #F5F7FA; color: var(--text-secondary); font-size: 12px; line-height: 1.9;
}
.is-invalid {
  margin-top: 10px; padding: 10px 14px; border-radius: 8px;
  background: #FFF1F0; border: 1px solid #FFCCC7; color: #CF1322; font-size: 12.5px; line-height: 1.9;
}
</style>
