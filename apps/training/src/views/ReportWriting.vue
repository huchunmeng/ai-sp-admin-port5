<template>
  <div class="rw-page">
    <!-- 页头：模块名随模式切换（训练 / 考核） -->
    <div class="rw-head">
      <div class="rw-head-icon"><i class="fa-solid" :class="isExam ? 'fa-clipboard-check' : 'fa-file-pen'"></i></div>
      <div class="rw-head-text">
        <div class="rw-head-title">{{ isExam ? '影像报告书写考核' : '影像报告书写训练' }}</div>
        <div class="rw-head-sub">
          {{ isExam ? '考核模式 · 不提供提示，请独立完成' : '训练模式 · 边写边提示' }}
        </div>
      </div>
    </div>

    <div class="rw-body">
      <div class="rw-main">
        <!-- 影像显示控件（三视图） -->
        <section class="rw-block">
          <div class="rw-block-head">
            <i class="fa-solid fa-image"></i> 影像显示控件
            <span class="rw-block-tag">三视图 · {{ current.modality }}</span>
          </div>
          <div class="rw-viewer">
            <div class="rw-view" v-for="v in VIEWS" :key="v.key">
              <div class="rw-view-canvas">
                <i class="fa-solid fa-film"></i>
                <span>影像待接入</span>
              </div>
              <div class="rw-view-foot">
                <span class="rw-view-label">{{ v.zh }} / {{ v.en }}</span>
                <span class="rw-view-wl">W 400 · L 40</span>
              </div>
            </div>
          </div>
          <div class="rw-note">
            本期为界面骨架：影像本体待院方提供真实样本后接入（系统内置数据，非实时调阅 PACS）。
          </div>
        </section>

        <!-- 学生报告输入 -->
        <section class="rw-block">
          <div class="rw-block-head">
            <i class="fa-solid fa-pen-to-square"></i> 学生报告
            <span class="rw-block-tag">{{ current.title }}</span>
          </div>
          <textarea class="rw-textarea" v-model="report" :disabled="submitted"
                    placeholder="按「检查技术 → 影像所见 → 影像诊断」书写影像报告…"></textarea>
          <div class="rw-report-foot">
            <span class="rw-count">{{ report.length }} 字</span>
            <button v-if="!submitted" class="rw-btn primary" :disabled="!report.trim()" @click="submitReport">
              <i class="fa-solid fa-paper-plane"></i> 提交报告
            </button>
            <template v-else>
              <button class="rw-btn" @click="resetReport"><i class="fa-solid fa-rotate-left"></i> 重写</button>
              <button class="rw-btn primary" @click="nextCase"><i class="fa-solid fa-forward"></i> 下一例</button>
            </template>
          </div>

          <div v-if="submitted" class="rw-result">
            <div class="rw-result-head">
              <i class="fa-solid fa-circle-check"></i> 已提交 · 与金标准报告对照
            </div>
            <div class="rw-result-grid">
              <div class="rw-result-col">
                <div class="rw-result-label">你的报告</div>
                <p class="rw-result-text">{{ report }}</p>
              </div>
              <div class="rw-result-col gold">
                <div class="rw-result-label">金标准报告</div>
                <p class="rw-result-text">{{ current.goldStandard }}</p>
              </div>
            </div>
            <div class="rw-score">
              占位评分：<b>--</b>
              <span>评分规则（逐项打分 / 整体评级、是否计时可重考、成绩是否入库）待院方确认</span>
            </div>
          </div>
        </section>
      </div>

      <!-- 培训提示信息栏 -->
      <aside class="rw-side">
        <template v-if="!isExam">
          <div class="rw-side-head">
            <i class="fa-solid fa-lightbulb"></i> 培训提示
          </div>
          <div class="rw-tips">
            <div class="rw-tip" v-for="(t, i) in visibleHints" :key="i">
              <span class="rw-tip-no">{{ i + 1 }}</span>
              <span class="rw-tip-text">{{ t }}</span>
            </div>
          </div>
          <button v-if="visibleHints.length < current.hints.length" class="rw-tip-btn" @click="moreHint">
            <i class="fa-solid fa-plus"></i> 需要提示
          </button>
          <div v-else class="rw-tips-end"><i class="fa-solid fa-flag-checkered"></i> 本病例提示已全部给出</div>
          <div class="rw-side-note">
            提示内容本期为静态示例，后续接通用文本大模型，以金标准报告为参照实时提示。
          </div>
        </template>

        <div v-else class="rw-side-exam">
          <i class="fa-solid fa-lock"></i>
          <div class="rw-side-exam-title">考核模式</div>
          <div class="rw-side-exam-desc">不提供提示，请独立完成报告书写</div>
          <div class="rw-side-exam-note">提交后以金标准报告为评分依据</div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { REPORT_CASES } from '@/data/reportCases'

const VIEWS = [
  { key: 'axial', zh: '轴位', en: 'Axial' },
  { key: 'coronal', zh: '冠状位', en: 'Coronal' },
  { key: 'sagittal', zh: '矢状位', en: 'Sagittal' }
]

const route = useRoute()

const cases = REPORT_CASES
const currentId = ref(cases[0].id)
const current = computed(() => cases.find(c => c.id === currentId.value) || cases[0])

const isExam = computed(() => route.params.mode === 'exam')

const report = ref('')
const submitted = ref(false)
const hintCount = ref(1)
const visibleHints = computed(() => current.value.hints.slice(0, hintCount.value))

function nextCase() {
  const i = cases.findIndex(c => c.id === currentId.value)
  currentId.value = cases[(i + 1) % cases.length].id
  resetReport()
}

function moreHint() {
  if (hintCount.value < current.value.hints.length) hintCount.value += 1
}

function submitReport() {
  if (!report.value.trim()) return
  submitted.value = true
}

function resetReport() {
  report.value = ''
  submitted.value = false
  hintCount.value = 1
}
</script>

<style scoped>
.rw-page { max-width: 1240px; margin: 0 auto; padding: 20px 24px 48px; }

/* ─── 页头 ─── */
.rw-head {
  display: flex; align-items: center; gap: 14px;
  background: #fff; border: 1px solid #f0f2f5; border-radius: 14px;
  padding: 18px 22px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.rw-head-icon {
  width: 46px; height: 46px; flex-shrink: 0; border-radius: 12px;
  background: linear-gradient(135deg, #4f46e5, #6366f1);
  color: #fff; font-size: 20px;
  display: flex; align-items: center; justify-content: center;
}
.rw-head-text { flex: 1; min-width: 0; }
.rw-head-title { font-size: 20px; font-weight: 800; color: #111827; }
.rw-head-sub { font-size: 13px; color: #6b7280; margin-top: 4px; }

/* ─── 两栏布局 ─── */
.rw-body { display: flex; gap: 14px; margin-top: 14px; align-items: flex-start; }
.rw-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 14px; }

.rw-block {
  background: #fff; border: 1px solid #f0f2f5; border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04); overflow: hidden;
}
.rw-block-head {
  display: flex; align-items: center; gap: 8px;
  font-size: 14px; font-weight: 700; color: #1f2937;
  padding: 12px 18px; background: #fafbfc; border-bottom: 1px solid #f3f4f6;
}
.rw-block-head i { color: #4f46e5; }
.rw-block-tag {
  margin-left: auto; font-size: 11px; font-weight: 500;
  color: #6b7280; background: #f3f4f6; padding: 3px 10px; border-radius: 8px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 55%;
}

/* ─── 三视图 ─── */
.rw-viewer { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; padding: 16px 18px 12px; }
.rw-view { border: 1px solid #eef0f4; border-radius: 10px; overflow: hidden; }
.rw-view-canvas {
  aspect-ratio: 1 / 1;
  background: repeating-linear-gradient(45deg, #2b2f36, #2b2f36 10px, #31353d, #31353d 20px);
  color: #8b93a1; font-size: 12px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
}
.rw-view-canvas i { font-size: 26px; opacity: .7; }
.rw-view-foot {
  display: flex; align-items: center; justify-content: space-between;
  padding: 7px 12px; background: #fafbfc; border-top: 1px solid #f0f2f5;
}
.rw-view-label { font-size: 12px; font-weight: 600; color: #4b5563; }
.rw-view-wl { font-size: 11px; color: #9ca3af; font-family: monospace; }
.rw-note {
  font-size: 12px; color: #9ca3af; line-height: 1.6;
  padding: 0 18px 16px;
}

/* ─── 报告输入 ─── */
.rw-textarea {
  width: 100%; min-height: 170px; box-sizing: border-box;
  padding: 14px 18px; border: none; outline: none; resize: vertical;
  font-family: inherit; font-size: 14px; line-height: 1.8; color: #1f2937;
}
.rw-textarea:disabled { background: #fafbfc; color: #6b7280; }
.rw-report-foot {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 18px; border-top: 1px solid #f3f4f6; background: #fafbfc;
}
.rw-count { font-size: 12px; color: #9ca3af; }
.rw-btn {
  margin-left: auto; display: inline-flex; align-items: center; gap: 6px;
  font-family: inherit; font-size: 13px; font-weight: 600;
  padding: 8px 18px; border-radius: 8px; cursor: pointer;
  border: 1px solid #e5e7eb; background: #fff; color: #4b5563;
  transition: all .18s;
}
.rw-btn:hover { border-color: #c7d2fe; color: #4f46e5; }
.rw-btn.primary { background: #4f46e5; border-color: #4f46e5; color: #fff; }
.rw-btn.primary:hover { background: #4338ca; }
.rw-btn.primary:disabled { background: #c7d2fe; border-color: #c7d2fe; cursor: not-allowed; }
.rw-report-foot .rw-btn + .rw-btn { margin-left: 0; }

/* ─── 提交后对照 ─── */
.rw-result { border-top: 1px solid #f3f4f6; }
.rw-result-head {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; font-weight: 700; color: #059669;
  padding: 12px 18px;
}
.rw-result-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 0 18px 4px; }
.rw-result-col { background: #fafbfc; border: 1px solid #f0f2f5; border-radius: 10px; padding: 12px 14px; }
.rw-result-col.gold { background: #f0fdf4; border-color: #dcfce7; }
.rw-result-label { font-size: 12px; font-weight: 700; color: #6b7280; margin-bottom: 8px; }
.rw-result-col.gold .rw-result-label { color: #059669; }
.rw-result-text { font-size: 12.5px; line-height: 1.9; color: #374151; white-space: pre-wrap; margin: 0; }
.rw-score {
  display: flex; align-items: center; flex-wrap: wrap; gap: 6px 10px;
  padding: 12px 18px 16px; font-size: 13px; color: #4b5563;
}
.rw-score b { font-size: 18px; color: #d97706; }
.rw-score span { font-size: 11.5px; color: #9ca3af; }

/* ─── 右侧提示栏 ─── */
.rw-side {
  width: 300px; flex-shrink: 0;
  background: #fff; border: 1px solid #f0f2f5; border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04); overflow: hidden;
  position: sticky; top: 16px;
}
.rw-side-head {
  display: flex; align-items: center; gap: 8px;
  font-size: 14px; font-weight: 700; color: #1f2937;
  padding: 12px 18px; background: #fffbeb; border-bottom: 1px solid #fef3c7;
}
.rw-side-head i { color: #d97706; }
.rw-tips { padding: 12px 16px 4px; display: flex; flex-direction: column; gap: 10px; }
.rw-tip { display: flex; gap: 9px; font-size: 12.5px; line-height: 1.75; color: #4b5563; }
.rw-tip-no {
  flex-shrink: 0; width: 18px; height: 18px; margin-top: 2px; border-radius: 50%;
  background: #fef3c7; color: #b45309; font-size: 11px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}
.rw-tip-text { flex: 1; min-width: 0; }
.rw-tip-btn {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  width: calc(100% - 32px); margin: 12px 16px 0;
  font-family: inherit; font-size: 13px; font-weight: 600;
  padding: 9px 0; border-radius: 8px; cursor: pointer;
  border: 1px dashed #fcd34d; background: #fffbeb; color: #b45309;
  transition: all .18s;
}
.rw-tip-btn:hover { background: #fef3c7; border-style: solid; }
.rw-tips-end {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  margin: 12px 16px 0; font-size: 12px; color: #9ca3af;
}
.rw-side-note {
  font-size: 11px; line-height: 1.7; color: #9ca3af;
  padding: 12px 16px 16px; border-top: 1px solid #f3f4f6; margin-top: 14px;
}

.rw-side-exam {
  display: flex; flex-direction: column; align-items: center; text-align: center;
  padding: 44px 24px; gap: 10px;
}
.rw-side-exam i { font-size: 34px; color: #d1d5db; }
.rw-side-exam-title { font-size: 15px; font-weight: 700; color: #4b5563; }
.rw-side-exam-desc { font-size: 12.5px; line-height: 1.7; color: #6b7280; }
.rw-side-exam-note {
  font-size: 11px; color: #9ca3af; margin-top: 6px;
  padding-top: 12px; border-top: 1px solid #f3f4f6; width: 100%;
}

@media (max-width: 1100px) {
  .rw-body { flex-direction: column; }
  .rw-side { width: 100%; position: static; }
}
@media (max-width: 768px) {
  .rw-viewer { grid-template-columns: 1fr; }
  .rw-result-grid { grid-template-columns: 1fr; }
  .rw-head { flex-wrap: wrap; }
}
</style>
