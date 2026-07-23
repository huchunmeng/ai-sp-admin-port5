<template>
  <div class="page" :class="{ portrait: store.portraitMode }" style="height:100%;display:flex;flex-direction:column;">
    <div style="padding:10px 14px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
      <span class="font-bold">设备用途选择</span>
      <a href="#" style="font-size:11px;color:var(--primary);text-decoration:none;" @click.prevent="store.setPage('password')">切换考试 (重新输入口令)</a>
    </div>
    <div style="padding:6px 12px;background:#E6F0FA;font-size:11px;border-bottom:1px solid var(--border);">
      当前考试：<strong>{{ store.examName }}</strong> ｜ 口令：{{ store.examPassword }} ｜ 总设备：<strong style="color:#4A90E2;">14台</strong>
    </div>
    <div style="padding:6px 14px;border-bottom:1px solid var(--border);display:flex;gap:0;">
      <button class="dev-type-tab" :class="{ sel: store.deviceMode === 'candidate' }" @click="store.toggleDeviceTab('candidate')">🔵 本设备用作考生答题</button>
      <button class="dev-type-tab" :class="{ sel: store.deviceMode === 'examiner' }" @click="store.toggleDeviceTab('examiner')">🔴 本设备用作考官评分</button>
    </div>

    <div v-if="store.deviceMode === 'candidate'" class="table-wrap candidate-wrap" style="flex:1;overflow-y:auto;padding:4px 10px;">
      <div style="padding:4px 0;font-size:10px;color:#9CA3AF;display:flex;gap:14px;">
        <span><span class="dev-dot dev-ok"></span> 有设备在线</span>
        <span><span class="dev-dot dev-no"></span> 无设备</span>
        <span>选择考站下的考核项目，本设备参与执考</span>
      </div>
      <table class="device-table">
        <thead><tr><th style="width:56px;">专业</th><th style="width:76px;">考站</th><th style="min-width:90px;">考核项目</th><th style="width:38px;text-align:center;">时长</th><th style="width:130px;text-align:center;">考生设备</th><th style="width:44px;text-align:center;">选择</th></tr></thead>
        <tbody>
          <template v-for="(spec, si) in store.deviceData.candidateStations" :key="si">
            <template v-for="(st, sti) in spec.stations" :key="st.name + sti">
              <tr>
                <td v-if="sti === 0" :rowspan="spec.rowSpan" class="spec-cell">{{ spec.specialty }}</td>
                <td :rowspan="st.rowSpan" class="station-cell">{{ st.name }}</td>
                <td>{{ st.projects[0].name }}</td>
                <td style="text-align:center;">{{ st.projects[0].duration }}</td>
                <td style="text-align:center;color:#4B5563;">
                  <a href="#" @click.prevent style="color:#4A90E2;text-decoration:none;" v-if="st.projects[0].deviceCount > 0"><span class="dev-dot dev-ok"></span>{{ st.projects[0].deviceCount }}台</a>
                  <span v-else><span class="dev-dot dev-no"></span>0台</span>
                </td>
                <td style="text-align:center;"><input type="checkbox" :checked="st.projects[0].checked" @change="store.toggleCandidateProj(si, sti, 0)" style="accent-color:#4A90E2;width:16px;height:16px;"></td>
              </tr>
              <tr v-for="(proj, pi) in st.projects.slice(1)" :key="pi + 1">
                <td>{{ proj.name }}</td>
                <td style="text-align:center;">{{ proj.duration }}</td>
                <td style="text-align:center;color:#4B5563;">
                  <span v-if="proj.deviceCount > 0"><span class="dev-dot dev-ok"></span>{{ proj.deviceCount }}台</span>
                  <span v-else><span class="dev-dot dev-no"></span>0台</span>
                </td>
                <td style="text-align:center;"><input type="checkbox" :checked="proj.checked" @change="store.toggleCandidateProj(si, sti, pi + 1)" style="accent-color:#4A90E2;width:16px;height:16px;"></td>
              </tr>
            </template>
          </template>
        </tbody>
      </table>
    </div>

    <div v-else class="table-wrap examiner-wrap" style="flex:1;overflow-y:auto;padding:4px 10px;">
      <div style="padding:4px 0;font-size:10px;color:#9CA3AF;display:flex;gap:14px;">
        <span>考官绑定：<span style="color:#52C41A;">● 已达标</span> <span style="color:#FF9F43;">● 不足</span> <span style="color:#FF4D4F;">● 无</span></span>
        <span>选择一个考站，将本考官设备绑定到该考站</span>
      </div>
      <table class="device-table">
        <thead><tr><th style="width:56px;">专业</th><th style="width:76px;">考站</th><th style="width:100px;text-align:center;">评分表</th><th style="min-width:140px;">已绑定考官设备</th><th style="width:44px;text-align:center;">绑定</th></tr></thead>
        <tbody>
          <tr v-for="(st, si) in store.deviceData.examinerStations" :key="si">
            <td v-if="examinerSpecFirst(si)" :rowspan="examinerSpecRowSpan(si)" class="spec-cell">{{ st.specialty }}</td>
            <td class="station-cell">{{ st.station }}</td>
            <td style="text-align:center;font-size:11px;">{{ st.scoreSheet }}</td>
            <td>
              <div v-for="b in st.bindings" :key="b.name"><span :style="{ color: b.ok ? '#52C41A' : '#FF9F43' }">●</span> {{ b.name }}</div>
              <div v-if="st.bindings.length === 0"><span style="color:#FF4D4F;">● 未绑定</span></div>
            </td>
            <td style="text-align:center;"><input type="checkbox" :checked="st.checked" @change="store.toggleExaminerStation(si)" style="accent-color:#4A90E2;width:16px;height:16px;"></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div style="padding:10px 14px;border-top:1px solid var(--border);display:flex;gap:12px;align-items:center;">
      <span style="font-size:11px;color:#9CA3AF;">{{ bottomSummary }}</span>
      <div style="margin-left:auto;"></div>
      <button class="btn btn-primary" @click="store.applyDeviceConfig()">确 定</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useExamStore } from '@/stores/exam'
const store = useExamStore()

function examinerSpecFirst(idx) {
  if (idx === 0) return true
  return store.deviceData.examinerStations[idx].specialty !== store.deviceData.examinerStations[idx - 1].specialty
}

function examinerSpecRowSpan(idx) {
  const spec = store.deviceData.examinerStations[idx].specialty
  let count = 0
  for (let i = idx; i < store.deviceData.examinerStations.length; i++) {
    if (store.deviceData.examinerStations[i].specialty === spec) count++
    else break
  }
  return count
}

const bottomSummary = computed(() => {
  if (store.deviceMode === 'examiner') {
    const sel = store.deviceData.examinerStations.find(s => s.checked)
    return sel ? `已绑定：${sel.specialty} · ${sel.station}` : '未选择任何考站'
  }
  return store.deviceData.selectedSummary
})
</script>

<style scoped>
.font-bold { font-weight:600; }
.spec-cell { background:#E6F0FA; font-weight:700; color:#4A90E2; font-size:13px; }
.station-cell { font-weight:600; color:#1F2937; }
.dev-dot { display:inline-block; width:8px; height:8px; border-radius:50%; margin-right:4px; }
.dev-ok { background:#4A90E2; } .dev-no { background:#FF4D4F; }
.device-table { width:100%; border-collapse:collapse; font-size:12px; }
.device-table th { background:#f9fafb; padding:6px 8px; text-align:left; font-weight:600; border-bottom:2px solid #E5E7EB; position:sticky; top:0; z-index:1; }
.device-table td { padding:6px 8px; border-bottom:1px solid #f3f4f6; vertical-align:middle; }
.device-table tr:hover td { background:#fafbfc; }
.dev-type-tab { padding:6px 16px; border:none; background:transparent; font-size:12px; cursor:pointer; border-bottom:2px solid transparent; transition:all .15s; color:#4B5563; }
.dev-type-tab.sel { color:#4A90E2; border-bottom-color:#4A90E2; font-weight:600; }
.btn { display:inline-flex; align-items:center; justify-content:center; padding:10px 24px; border-radius:8px; font-size:14px; cursor:pointer; border:none; min-height:44px; }
.btn-primary { background:#4A90E2; color:#fff; } .btn-primary:hover { background:#3A7BC8; }

/* Portrait mode */
.portrait .device-table { font-size: 10px; }
.portrait .device-table th { padding: 4px 4px; white-space: normal; }
.portrait .device-table td { padding: 4px 4px; }
.portrait .dev-type-tab { padding: 4px 10px; font-size: 10px; }
.portrait .spec-cell { font-size: 10px; }
/* 考生表竖屏：专业/时长/选择 固定，其余自适应 */
.portrait .candidate-wrap .device-table thead th:nth-child(1) { width: 44px !important; }
.portrait .candidate-wrap .device-table thead th:nth-child(2) { width: auto !important; }
.portrait .candidate-wrap .device-table thead th:nth-child(3) { width: auto !important; }
.portrait .candidate-wrap .device-table thead th:nth-child(4) { width: 32px !important; }
.portrait .candidate-wrap .device-table thead th:nth-child(5) { width: auto !important; }
.portrait .candidate-wrap .device-table thead th:nth-child(6) { width: 36px !important; }
/* 考官表竖屏：专业/绑定 固定，其余自适应 */
.portrait .examiner-wrap .device-table thead th:nth-child(1) { width: 44px !important; }
.portrait .examiner-wrap .device-table thead th:nth-child(2) { width: auto !important; }
.portrait .examiner-wrap .device-table thead th:nth-child(3) { width: auto !important; }
.portrait .examiner-wrap .device-table thead th:nth-child(4) { width: auto !important; }
.portrait .examiner-wrap .device-table thead th:nth-child(5) { width: 36px !important; }
</style>
