<template>
  <div class="page" :class="{ portrait: store.portraitMode }" style="height:100%;display:flex;flex-direction:column;">
    <div class="scoring-info-bar">
      <span class="scoring-info-text">王莹莹创建的考试0409-190｜<span style="color:#4A90E2;">评分</span>｜考官:王考官｜{{ store.examInfo.topic }}·{{ store.examInfo.station }}｜绑定：{{ store.examInfo.deviceName }}（{{ store.examInfo.candidateName }}）</span>
      <a href="#" class="scoring-back-link" @click.prevent="store.setPage('ex-login')">← 返回</a>
    </div>
    <div class="scoring-status-bar">
      <span>考生：<strong>{{ store.examInfo.candidateName }}</strong></span>
      <span class="scoring-sep">|</span>
      <span>已完成<span class="scoring-stat-done">2人</span></span>
      <span>待考<span class="scoring-stat-wait">8人</span></span>
      <span>中止<span class="scoring-stat-abort">0人</span></span>
      <span class="scoring-actions">
        <button class="btn btn-sm scoring-btn-abort" @click="abortExam">中止考试</button>
      </span>
      <span>
        <button class="btn btn-sm scoring-btn-records" @click="store.setPage('ex-select')">📋 评分记录</button>
      </span>
    </div>

    <div v-if="store.scoringState === 'form'" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;">
      <div class="sheet-tab-bar">
        <template v-for="(sheet, si) in store.scoreSheets" :key="si">
          <div class="sheet-tab" :class="{ active: store.activeScoreSheet === si }"
            @click="store.switchScoreSheet(si)">
            {{ sheet.name }} <span class="sheet-tab-score">{{ sheetSubtotal(si).sum }}/{{ sheetSubtotal(si).max }}</span>
          </div>
          <div v-if="si < store.scoreSheets.length - 1" class="sheet-tab-line"></div>
        </template>
      </div>
      <table class="score-table">
        <thead><tr><th style="width:72px;">考核项</th><th style="width:90px;">评分项</th><th>评分要点</th><th style="width:150px;">评分</th></tr></thead>
        <tbody>
          <template v-for="cat in store.scoreSheets[store.activeScoreSheet].categories" :key="cat.category">
            <tr v-for="(item, idx) in cat.items" :key="idx">
              <td v-if="idx === 0" :rowspan="cat.items.length" class="cat-label">{{ cat.category }}</td>
              <td>{{ item.name }}</td>
              <td class="points-cell">{{ item.points }}</td>
              <td style="text-align:center">
                <span class="step-slider">
                  <input type="range" class="score-range" min="0" :max="item.max" step="0.5"
                    :value="item.score" @input="store.setScore(item, parseFloat($event.target.value))">
                  <span class="step-num">{{ item.score % 1 === 0 ? item.score : item.score.toFixed(1) }}</span>
                </span>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
      <div class="signature-section">
        <div class="signature-title">考官签名</div>
        <canvas ref="canvasRef" class="signature-canvas"></canvas>
        <div class="signature-actions">
          <button class="btn btn-sm" @click="sig.clear()">清除</button>
        </div>
      </div>
      <div class="score-footer">
        <span class="score-subtotal">当前：{{ store.totalScore.sum }}/{{ store.totalScore.max }}</span>
        <span class="score-total">合计：{{ store.allSheetsTotal.sum }}/{{ store.allSheetsTotal.max }}</span>
        <span style="flex:1;"></span>
        <button class="btn btn-primary" @click="submitScoreConfirm">提交评分</button>
      </div>
    </div>

    <div v-else style="flex:1;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;">
      <div style="font-size:48px;">✅</div>
      <div style="font-size:18px;font-weight:700;color:#52C41A;">评分已提交</div>
      <div style="font-size:13px;color:#4B5563;">等待下一个考生进入…</div>
      <div class="card" style="text-align:left;width:300px;">
        <div style="font-size:12px;font-weight:600;margin-bottom:6px;">📋 当前绑定</div>
        <div style="font-size:11px;color:#4B5563;line-height:1.8;">
          <div>考站：{{ store.examInfo.topic }} · {{ store.examInfo.station }}</div>
          <div>考生设备：{{ store.examInfo.deviceName }}（{{ store.examInfo.candidateName }}）</div>
          <div>考官设备：{{ store.examInfo.deviceBind }}</div>
        </div>
      </div>
      <button class="btn btn-primary" style="width:200px;" @click="store.loadNextCandidate()">加载考生</button>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, inject } from 'vue'
import { useExamStore } from '@/stores/exam'
import { useSignature } from '@/composables/useSignature'

const store = useExamStore()
const showSubmitScoreModal = inject('showSubmitScoreModal')
const showAbortModal = inject('showAbortModal')
const sig = useSignature()
const canvasRef = sig.canvasRef

function sheetSubtotal(si) {
  let sum = 0, max = 0
  const sheet = store.scoreSheets[si]
  if (sheet) {
    sheet.categories.forEach(cat => {
      cat.items.forEach(item => { sum += item.score; max += item.max })
    })
  }
  return { sum, max }
}

function submitScoreConfirm() { showSubmitScoreModal() }
function abortExam() { showAbortModal() }

onMounted(() => sig.init())
onUnmounted(() => sig.destroy())
</script>

<style scoped>
.card { background:#fff; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.05); padding:20px; }
.scoring-info-bar { padding:8px 12px; border-bottom:1px solid #E5E7EB; font-size:12px; display:flex; justify-content:space-between; flex-shrink:0; }
.scoring-info-text { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; min-width:0; }
.scoring-back-link { font-size:11px; color:#4A90E2; text-decoration:none; flex-shrink:0; margin-left:8px; }
.scoring-status-bar { display:flex; align-items:center; gap:8px; padding:6px 12px; font-size:12px; border-bottom:1px solid #E5E7EB; flex-shrink:0; }
.scoring-sep { color:#E5E7EB; }
.scoring-stat-done { color:#52C41A; font-weight:600; }
.scoring-stat-wait { color:#FF9F43; font-weight:600; }
.scoring-stat-abort { color:#FF4D4F; font-weight:600; }
.scoring-actions { margin-left:auto; }
.scoring-btn-abort { color:#FF4D4F; border:1px solid #FF4D4F; background:#fff; }
.scoring-btn-records { color:#4A90E2; border:1px solid #4A90E2; background:#fff; }

.score-table { width:100%; border-collapse:collapse; font-size:13px; table-layout:auto; }
.score-table th { background:#f9fafb; padding:10px 8px; text-align:center; font-weight:600; border-bottom:2px solid #E5E7EB; white-space:nowrap; }
.score-table td { padding:10px 12px; border-bottom:1px solid #E5E7EB; vertical-align:middle; }
.score-table tr:hover td { background:#fafbfc; }
.score-table .cat-label { font-weight:600; color:#1F2937; font-size:13px; vertical-align:middle; background:#f9fafb; text-align:center; }
.points-cell { font-size:12px; color:#4B5563; line-height:1.6; }

.step-slider { display:inline-flex; align-items:center; gap:8px; }
.score-range { width:120px; height:6px; -webkit-appearance:none; appearance:none; background:#E5E7EB; border-radius:3px; outline:none; cursor:pointer; }
.score-range::-webkit-slider-thumb { -webkit-appearance:none; appearance:none; width:18px; height:18px; border-radius:50%; background:#4A90E2; border:2px solid #fff; box-shadow:0 1px 3px rgba(0,0,0,0.2); cursor:pointer; }
.score-range::-moz-range-thumb { width:18px; height:18px; border-radius:50%; background:#4A90E2; border:2px solid #fff; box-shadow:0 1px 3px rgba(0,0,0,0.2); cursor:pointer; }
.score-range::-webkit-slider-runnable-track { height:6px; border-radius:3px; }
.score-range::-moz-range-track { height:6px; border-radius:3px; background:#E5E7EB; }
.step-num { font-size:14px; font-weight:600; color:#1F2937; min-width:24px; text-align:center; }

.signature-section { margin:12px 16px; padding:12px 16px; border-top:1px solid #E5E7EB; border-bottom:1px solid #E5E7EB; }
.signature-title { font-weight:600; margin-bottom:8px; font-size:13px; }
.signature-canvas { width:100%; height:80px; display:block; margin-bottom:6px; border:1px dashed #E5E7EB; border-radius:8px; cursor:crosshair; background:#fff; }
.signature-actions { display:flex; gap:8px; }

.score-footer { padding:8px 16px; display:flex; gap:8px; align-items:center; }
.score-subtotal { font-size:12px; color:#9CA3AF; }
.score-total { font-size:12px; color:#4B5563; font-weight:600; }

.btn { display:inline-flex; align-items:center; justify-content:center; padding:6px 14px; border-radius:8px; font-size:12px; cursor:pointer; border:1px solid #E5E7EB; background:#fff; color:#4B5563; min-height:32px; }
.btn-primary { background:#4A90E2; color:#fff; border:none; padding:10px 24px; font-size:14px; min-height:44px; } .btn-primary:hover { background:#3A7BC8; }

/* Sheet tab bar */
.sheet-tab-bar { display: flex; align-items: stretch; padding: 0 12px; border-bottom: 2px solid #E5E7EB; gap: 0; flex-shrink: 0; }
.sheet-tab { padding: 8px 18px; font-size: 13px; color: #909399; cursor: pointer; transition: all .15s; white-space: nowrap; border-bottom: 2px solid transparent; margin-bottom: -2px; }
.sheet-tab.active { color: #4A90E2; font-weight: 600; border-bottom-color: #4A90E2; }
.sheet-tab:hover:not(.active) { color: #4B5563; border-bottom-color: #DCDFE6; }
.sheet-tab-score { font-size: 12px; color: inherit; opacity: 0.65; margin-left: 4px; }
.sheet-tab.active .sheet-tab-score { opacity: 1; }
.sheet-tab-line { width: 1px; height: 20px; background: #E5E7EB; align-self: center; flex-shrink: 0; margin: 0 2px; }

/* Portrait mode */
.portrait .score-table { font-size: 11px; }
.portrait .score-table th { padding: 6px 4px; font-size: 10px; }
.portrait .score-table td { padding: 6px 6px; }
.portrait .score-table .cat-label { font-size: 11px; }
.portrait .score-range { width: 90px; }
.portrait .step-num { font-size: 11px; min-width: 20px; }
.portrait .sheet-tab { padding: 6px 10px; font-size: 11px; }
.portrait .sheet-tab-score { font-size: 10px; }
.portrait .sheet-tab-bar { padding: 0 6px; }
.portrait .scoring-info-bar { padding: 4px 8px; font-size: 10px; }
.portrait .scoring-info-text { font-size: 10px; }
.portrait .scoring-back-link { font-size: 10px; }
.portrait .scoring-status-bar { padding: 3px 8px; font-size: 10px; gap: 4px; }
.portrait .scoring-status-bar .btn-sm { padding: 2px 6px; font-size: 10px; min-height: 24px; }
.portrait .points-cell { font-size: 10px; }
.portrait .signature-section { margin: 8px 10px; padding: 8px 10px; }
.portrait .signature-canvas { height: 60px; }

</style>

<style>
.page::-webkit-scrollbar,
.page ::-webkit-scrollbar { width: 6px; height: 6px; }
.page::-webkit-scrollbar-track,
.page ::-webkit-scrollbar-track { background: transparent; }
.page::-webkit-scrollbar-thumb,
.page ::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 3px; }
.page::-webkit-scrollbar-thumb:hover,
.page ::-webkit-scrollbar-thumb:hover { background: #9CA3AF; }
</style>
