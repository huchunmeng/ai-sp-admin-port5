<template>
  <!-- 可内嵌：宿主（「评分表管理」）负责页面外壳，本组件只出一块卡 -->
  <div class="tpl-embed">
    <div class="card mb-4">
      <div class="flex justify-between items-center mb-4">
        <div>
          <h3 style="margin:0">评分表模板</h3>
          <div class="text-secondary" style="font-size:12px;margin-top:4px">
            版本 {{ TEMPLATE_VERSION }} · 全难度共用一套模板；难度差异走下方「难度分层标定」
            <span v-if="dirty" class="badge badge-warning" style="margin-left:8px">有未保存改动</span>
          </div>
        </div>
        <div class="flex gap-2">
          <button class="btn btn-outline" @click="onReset" :disabled="!dirty">恢复默认</button>
          <button class="btn btn-primary" @click="onSave" :disabled="!dirty">保存</button>
        </div>
      </div>

      <div class="tpl-warn">
        <i class="fa-solid fa-triangle-exclamation"></i>
        本期无服务端，模板改动**只存在本机管理端**；训练端读的是内置默认模板。
        另外：改这里的**条目名称 / 标称分值 / 启用**会影响**全部样本**（样本编辑器里改的只是该样本的要点）。
      </div>

      <!-- ① 模板结构 -->
      <div class="card" style="padding:0;margin-bottom:16px">
        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th style="width:170px">维度</th>
                <th style="width:90px">编码</th>
                <th>条目名称</th>
                <th style="width:110px">标称分值</th>
                <th style="width:80px">启用</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="d in tpl" :key="d.dim">
                <tr v-for="(it, ii) in d.items" :key="it.code">
                  <td v-if="ii === 0" :rowspan="d.items.length" class="td-dim">
                    {{ d.dim }}
                    <div class="td-dim-sub">小计 {{ dimSum(d) }} 分</div>
                  </td>
                  <td><code class="code-chip">{{ it.code }}</code></td>
                  <td>
                    <input class="input" v-model="it.name" style="width:100%" @input="dirty = true">
                  </td>
                  <td>
                    <input class="input" type="number" step="0.5" min="0" v-model.number="it.score"
                           style="width:70px;text-align:center" @change="dirty = true">
                  </td>
                  <td style="text-align:center">
                    <input type="checkbox" v-model="it.enabled" @change="dirty = true">
                  </td>
                </tr>
              </template>
              <tr class="total-row">
                <td colspan="3" style="text-align:right;font-weight:600">合计</td>
                <td style="text-align:center;font-weight:700"
                    :class="{ 'text-error': totalScore !== 100 }">{{ totalScore }}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div v-if="totalScore !== 100" class="text-error" style="font-size:12.5px;margin-bottom:16px">
        <i class="fa-solid fa-circle-exclamation"></i> 标称分值合计 {{ totalScore }} ≠ 100，保存后各样本的满分口径会跟着变
      </div>

      <!-- ② 难度分层标定 -->
      <h4 style="margin:0 0 4px">难度分层标定</h4>
      <div class="text-secondary" style="font-size:12px;margin-bottom:10px">
        及格线按**本卷可评满分**的比例算；「停用条目」= 该难度下这些条目整条不计入分母（复用「不可评」机制）
      </div>
      <div class="card" style="padding:0">
        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th style="width:150px">难度</th>
                <th style="width:150px">及格线（%）</th>
                <th style="width:150px">折算（以示例样本）</th>
                <th>停用条目</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="lv in levelList" :key="lv.key">
                <td>{{ lv.key }} · {{ lv.label.replace(lv.key + ' ', '') }}</td>
                <td>
                  <input class="input" type="number" min="0" max="100" step="1"
                         :value="Math.round(cal[lv.key].passRate * 100)"
                         style="width:70px;text-align:center"
                         @change="setPassRate(lv.key, $event.target.value)">
                </td>
                <td class="text-secondary" style="font-size:12px">
                  {{ sampleMax ? Math.round(sampleMax * cal[lv.key].passRate) + ' 分' : '—' }}
                  <span style="font-size:11px">（本库样本可评满分多为 84–88）</span>
                </td>
                <td>
                  <select class="select" multiple size="3" style="width:100%;min-width:220px"
                          :value="cal[lv.key].disabledItems"
                          @change="setDisabled(lv.key, $event.target)">
                    <option v-for="it in allItems" :key="it.code" :value="it.code">
                      {{ it.code }} {{ it.name }}
                    </option>
                  </select>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { toast } from '@ai-sp/shared'
import {
  getScoreTemplate, getLevelCalibration, defaultScoreTemplate, defaultLevelCalibration,
  TEMPLATE_VERSION, LEVEL_CALIBRATION, resolveRubric, IMAGING_SAMPLES
} from '@ai-sp/shared/imaging'
import { saveTemplate, resetTemplate } from './templateStore'

const tpl = ref(JSON.parse(JSON.stringify(getScoreTemplate())))
const cal = ref(JSON.parse(JSON.stringify(getLevelCalibration())))
const dirty = ref(false)

const allItems = computed(() => tpl.value.flatMap(d => d.items || []))
const dimSum = d => (d.items || []).reduce((a, i) => a + (Number(i.score) || 0), 0)
const totalScore = computed(() => tpl.value.reduce((a, d) => a + dimSum(d), 0))
const levelList = computed(() =>
  Object.entries(LEVEL_CALIBRATION).map(([key, v]) => ({ key, label: v.label }))
)
/** 用库里第一个已发布样本的可评满分做「折算分数」的示例 */
const sampleMax = computed(() => {
  const s = IMAGING_SAMPLES.find(x => x.status === 'published')
  return s ? resolveRubric(s.id, s.capabilities).scoreableMax : 0
})

function setPassRate(level, v) {
  const n = Math.max(0, Math.min(100, Number(v) || 0))
  cal.value[level].passRate = n / 100
  dirty.value = true
}
function setDisabled(level, sel) {
  cal.value[level].disabledItems = [...sel.selectedOptions].map(o => o.value)
  dirty.value = true
}
function onSave() {
  saveTemplate(tpl.value, cal.value)
  dirty.value = false
  toast.show('模板已保存（仅本机管理端生效）', 'success')
}
function onReset() {
  tpl.value = defaultScoreTemplate()
  cal.value = defaultLevelCalibration()
  resetTemplate()
  dirty.value = false
  toast.show('已恢复内置默认模板', 'success')
}
</script>

<style scoped>
.tpl-embed { }
.tpl-warn {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 10px 14px; margin-bottom: 16px; border-radius: 8px;
  background: #fffbeb; border: 1px solid #fde68a; color: #92400e; font-size: 12.5px; line-height: 1.7;
}
.td-dim { background: #fafbfc; font-weight: 600; vertical-align: middle; text-align: center; }
.td-dim-sub { font-size: 11.5px; font-weight: 400; color: #9ca3af; margin-top: 4px; }
.code-chip { background: #f5f7fa; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
.total-row td { background: #e6f7ff; border-top: 2px solid #ebeef5; }
</style>
