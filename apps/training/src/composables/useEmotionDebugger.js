// ═══════════════════════════════════════════════════════════════
// 情绪调试面板 V2 — 双脑视图 + 档位追踪 + 会话信息
// 用法：import { emotionDebugger } from './useEmotionDebugger'
//       emotionDebugger.bind(aisp)
//       Ctrl+Shift+E 切换
// ═══════════════════════════════════════════════════════════════

import { watch } from 'vue'

let _el = null
let _aispRef = null
let _visible = false
let _dragState = null
let _unwatch = null

const EMOTION_DIMS = ['anger', 'fear', 'sadness', 'joy']
const DIM_LABELS = { anger: '怒', fear: '惧', sadness: '悲', joy: '悦' }
const DIM_COLORS = { anger: '#ef4444', fear: '#8b5cf6', sadness: '#3b82f6', joy: '#10b981' }
const DIM_MAX = { anger: 10, fear: 10, sadness: 10, joy: 10 }
const INTENT_COLORS = { friendly: '#10b981', neutral: '#6b7280', noise: '#9ca3af', offensive: '#f59e0b', attack: '#ef4444', medical_jargon: '#8b5cf6', vague_prompt: '#f97316', multi_ask: '#06b6d4' }
const GEAR_COLORS = {
  '暴怒': '#ef4444', '愤怒': '#f97316', '不满': '#fbbf24',
  '焦虑': '#a855f7', '不安': '#c084fc',
  '退缩': '#9ca3af', '消沉': '#64748b',
  '防御': '#38bdf8', '失望': '#60a5fa',
  '配合': '#10b981', '中立': '#6b7280'
}
const VS_COLORS = {
  normal: '#6b7280', slightly_tense: '#fbbf24', loud_fast: '#f97316', very_loud_fast: '#ef4444',
  cold: '#38bdf8', shaky: '#c084fc', very_shaky: '#a855f7', soft_slow: '#34d399',
  defensive: '#fb923c', vulnerable: '#f472b6', broken: '#ef4444', warm: '#10b981', flat: '#6b7280'
}
const VA_COLORS = {
  calm: '#6b7280', angry_mild: '#fbbf24', angry: '#f97316', angry_intense: '#ef4444',
  fearful_mild: '#c084fc', fearful: '#a855f7', fearful_intense: '#8b5cf6',
  sad_soft: '#38bdf8', broken: '#ef4444', warm: '#10b981', neutral: '#6b7280',
  anxious: '#c084fc', sad: '#38bdf8', defensive: '#fb923c'
}

function createPanel() {
  if (_el) return

  _el = document.createElement('div')
  _el.id = 'emotion-debugger'
  Object.assign(_el.style, {
    position: 'fixed', top: '60px', right: '16px', width: '520px', maxHeight: '80vh',
    background: 'rgba(17,24,39,0.96)', color: '#e5e7eb', borderRadius: '12px',
    zIndex: '9998', display: 'none', flexDirection: 'column',
    fontFamily: 'ui-monospace, SFMono-Regular, "Cascadia Code", Consolas, monospace', fontSize: '12px',
    boxShadow: '0 8px 40px rgba(0,0,0,0.5)', border: '1px solid #374151',
    userSelect: 'none', overflow: 'hidden'
  })

  // ═══ 标题栏 ═══
  const header = document.createElement('div')
  Object.assign(header.style, {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 14px', borderBottom: '1px solid #374151', cursor: 'grab',
    background: 'rgba(31,41,55,0.9)', borderRadius: '12px 12px 0 0', flexShrink: '0', gap: '8px'
  })
  header.innerHTML = `
    <span style="font-weight:700;font-size:14px;color:#f9fafb;white-space:nowrap;">🔬 Debug V2</span>
    <span style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:flex-end;">
      <span id="ed-model-badge" style="background:#1e3a5f;color:#93c5fd;font-size:10px;padding:2px 6px;border-radius:3px;font-weight:600;display:none;"></span>
      <span id="ed-strike-indicator" style="color:#f87171;font-size:11px;font-weight:700;display:none;"></span>
      <span id="ed-round-count" style="color:#9ca3af;font-size:11px;white-space:nowrap;">0 轮</span>
      <button id="ed-btn-info" style="background:#374151;border:1px solid #4b5563;color:#e5e7eb;cursor:pointer;font-size:11px;padding:3px 8px;border-radius:4px;" title="会话信息">📋</button>
      <select id="ed-hist-select" style="background:#374151;border:1px solid #4b5563;color:#e5e7eb;font-size:11px;padding:3px 6px;border-radius:4px;max-width:140px;display:none;"><option value="">当前</option></select>
      <button id="ed-btn-hist" style="background:#374151;border:1px solid #4b5563;color:#e5e7eb;cursor:pointer;font-size:11px;padding:3px 8px;border-radius:4px;" title="查看历史记录">历史</button>
      <button id="ed-btn-copy" style="background:#065f46;border:1px solid #059669;color:#e5e7eb;cursor:pointer;font-size:11px;padding:3px 8px;border-radius:4px;font-weight:600;" title="复制完整报告">复制报告</button>
      <button id="ed-btn-min" style="background:none;border:none;color:#9ca3af;cursor:pointer;font-size:16px;padding:0 2px;">−</button>
      <button id="ed-btn-close" style="background:none;border:none;color:#9ca3af;cursor:pointer;font-size:16px;padding:0 2px;">×</button>
    </span>
  `
  _el.appendChild(header)

  // ═══ 会话信息区（默认折叠） ═══
  const infoWrap = document.createElement('div')
  infoWrap.id = 'ed-info-wrap'
  Object.assign(infoWrap.style, {
    display: 'none', padding: '10px 14px', borderBottom: '1px solid #1f2937',
    flexShrink: '0', background: 'rgba(30,41,59,0.5)', fontSize: '12px', lineHeight: '1.6'
  })
  infoWrap.innerHTML = `
    <div id="ed-info-content" style="color:#cbd5e1;"></div>
    <button id="ed-btn-copy-info" style="margin-top:6px;background:#1e3a5f;border:1px solid #3b82f6;color:#93c5fd;cursor:pointer;font-size:11px;padding:3px 10px;border-radius:4px;">复制会话信息</button>
  `
  _el.appendChild(infoWrap)

  // ═══ 双脑面板 ═══
  const brainWrap = document.createElement('div')
  brainWrap.id = 'ed-brain-wrap'
  Object.assign(brainWrap.style, {
    display: 'flex', gap: '8px', padding: '10px 14px', borderBottom: '1px solid #1f2937',
    flexShrink: '0', background: 'rgba(0,0,0,0.15)', fontSize: '11px'
  })
  brainWrap.innerHTML = `
    <div id="ed-damper-panel" style="flex:1;background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);border-radius:8px;padding:10px 12px;min-width:0;">
      <div style="color:#f87171;font-weight:700;font-size:12px;margin-bottom:6px;">⚡ 阻尼器 (ABS)</div>
      <div style="display:flex;align-items:center;gap:4px;margin-bottom:4px;">
        <span style="color:#9ca3af;">怒(决策前):</span>
        <span id="ed-damper-pre" style="color:#f9fafb;font-weight:700;min-width:22px;">0</span>
        <span style="color:#4b5563;">→</span>
        <span id="ed-damper-post" style="color:#f9fafb;font-weight:700;">0</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px;">
        <span style="color:#9ca3af;">蓄积:</span>
        <div id="ed-damper-bar-bg" style="flex:1;height:8px;background:#1f2937;border-radius:4px;overflow:hidden;">
          <div id="ed-damper-bar-fill" style="height:100%;width:0%;background:#6b7280;border-radius:4px;transition:width 0.3s;"></div>
        </div>
        <span id="ed-damper-val" style="color:#f9fafb;font-weight:700;min-width:28px;text-align:right;">0</span>
      </div>
      <div id="ed-damper-gear" style="color:#9ca3af;margin-top:2px;">阻尼档: —</div>
    </div>
    <div id="ed-reflection-panel" style="flex:1.2;background:rgba(59,130,246,0.06);border:1px solid rgba(59,130,246,0.2);border-radius:8px;padding:10px 12px;min-width:0;">
      <div style="color:#60a5fa;font-weight:700;font-size:12px;margin-bottom:6px;">🧠 反思脑 (车长)</div>
      <div id="ed-cm-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:2px 12px;color:#cbd5e1;">
        <div>trust: <b id="ed-cm-trust" style="color:#10b981;">5</b></div>
        <div>peak: <b id="ed-cm-peak" style="color:#6b7280;">5</b></div>
        <div>concern: <b id="ed-cm-concern" style="color:#fbbf24;">5</b></div>
        <div>stuck: <b id="ed-cm-stuck" style="color:#6b7280;">0</b></div>
        <div>avoid: <b id="ed-cm-avoid" style="color:#6b7280;">0</b></div>
        <div>loss: <b id="ed-cm-loss" style="color:#6b7280;">0</b></div>
        <div>badNews: <b id="ed-cm-badnews" style="color:#6b7280;">否</b></div>
        <div>unresolved: <b id="ed-cm-unresolved" style="color:#6b7280;">0</b></div>
      </div>
      <div style="margin-top:8px;padding-top:6px;border-top:1px solid rgba(59,130,246,0.15);">
        <span style="color:#9ca3af;">★ 综合档位: </span>
        <b id="ed-cm-gear" style="font-size:15px;color:#6b7280;">中立</b>
      </div>
    </div>
  `
  _el.appendChild(brainWrap)

  // ═══ 雷达图 + 信任轴（同行） ═══
  const radarRow = document.createElement('div')
  radarRow.id = 'ed-radar-row'
  Object.assign(radarRow.style, {
    display: 'flex', gap: '8px', padding: '6px 14px',
    borderBottom: '1px solid #1f2937', flexShrink: '0', background: 'rgba(0,0,0,0.1)',
    alignItems: 'center'
  })
  const radarWrap = document.createElement('div')
  radarWrap.id = 'ed-radar-wrap'
  Object.assign(radarWrap.style, { flex: '0 0 auto' })
  const canvas = document.createElement('canvas')
  canvas.id = 'ed-radar'
  canvas.width = 240; canvas.height = 160
  Object.assign(canvas.style, { maxWidth: '100%' })
  radarWrap.appendChild(canvas)
  radarRow.appendChild(radarWrap)

  // 信任 + 档位摘要（雷达右侧）
  const trustCol = document.createElement('div')
  trustCol.id = 'ed-trust-col'
  Object.assign(trustCol.style, {
    flex: '1', fontSize: '11px', lineHeight: '1.6',
    display: 'flex', flexDirection: 'column', gap: '4px',
    padding: '4px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px'
  })
  trustCol.innerHTML = `
    <div id="ed-trust-bar" style="display:flex;align-items:center;gap:6px;">
      <span style="color:#9ca3af;">信任:</span>
      <div style="flex:1;height:6px;background:#1f2937;border-radius:3px;overflow:hidden;">
        <div id="ed-trust-fill" style="height:100%;width:50%;background:#10b981;border-radius:3px;"></div>
      </div>
      <span id="ed-trust-val" style="color:#10b981;font-weight:700;">5</span>
    </div>
    <div id="ed-quick-stats" style="color:#9ca3af;font-size:10px;">
      concern: <b style="color:#fbbf24;">5</b>
      stuck: <b style="color:#6b7280;">0</b>
      avoid: <b style="color:#6b7280;">0</b>
    </div>
  `
  radarRow.appendChild(trustCol)
  _el.appendChild(radarRow)

  // ═══ 日志列表 ═══
  const list = document.createElement('div')
  list.id = 'ed-log-list'
  Object.assign(list.style, {
    overflowY: 'auto', flex: '1', padding: '8px'
  })
  _el.appendChild(list)

  document.body.appendChild(_el)

  // 事件绑定
  header.addEventListener('mousedown', onDragStart)
  _el.querySelector('#ed-btn-close').addEventListener('click', hide)
  _el.querySelector('#ed-btn-min').addEventListener('click', toggleCollapse)
  _el.querySelector('#ed-btn-copy').addEventListener('click', copyReport)
  _el.querySelector('#ed-btn-info').addEventListener('click', toggleInfo)
  _el.querySelector('#ed-btn-copy-info').addEventListener('click', copySessionInfo)
  _el.querySelector('#ed-btn-hist').addEventListener('click', toggleHistMenu)
  _el.querySelector('#ed-hist-select').addEventListener('change', onHistSelect)
  document.addEventListener('mousemove', onDragMove)
  document.addEventListener('mouseup', onDragEnd)
  document.addEventListener('keydown', onKeydown)

  _el._collapsed = false
  _el._infoVisible = false
}

// ═══ 事件处理 ═══

function onKeydown(e) {
  if (e.ctrlKey && e.shiftKey && e.key === 'E') {
    e.preventDefault()
    toggle()
  }
}

function onDragStart(e) {
  if (e.target.tagName === 'BUTTON' || e.target.tagName === 'SELECT') return
  _dragState = { ox: e.clientX - _el.offsetLeft, oy: e.clientY - _el.offsetTop }
}

function onDragMove(e) {
  if (!_dragState) return
  const x = Math.max(0, Math.min(window.innerWidth - _el.offsetWidth, e.clientX - _dragState.ox))
  const y = Math.max(0, Math.min(window.innerHeight - 40, e.clientY - _dragState.oy))
  _el.style.left = x + 'px'
  _el.style.top = y + 'px'
  _el.style.right = 'auto'
}

function onDragEnd() { _dragState = null }

function toggleInfo() {
  const wrap = _el?.querySelector('#ed-info-wrap')
  if (!wrap) return
  _el._infoVisible = !_el._infoVisible
  wrap.style.display = _el._infoVisible ? 'block' : 'none'
  if (_el._infoVisible) renderSessionInfo()
}

function renderSessionInfo() {
  const content = _el?.querySelector('#ed-info-content')
  if (!content || !_aispRef?.caseMeta?.value) {
    if (content) content.innerHTML = '<span style="color:#6b7280;">无会话信息</span>'
    return
  }
  const m = _aispRef.caseMeta.value
  const modeLabel = m.mode === 'humanistic-comm' ? '人文沟通' : m.mode === 'mental-exam' ? '精神检查' : '病史采集'
  content.innerHTML = `
    <div><span style="color:#6b7280;">病例:</span> <b style="color:#f9fafb;">${esc(m.caseId)}</b> <span style="color:#6b7280;">模式:</span> <b style="color:#60a5fa;">${modeLabel}</b></div>
    ${m.scenarioName ? `<div><span style="color:#6b7280;">场景:</span> <b style="color:#c084fc;">${esc(m.scenarioName)}</b></div>` : ''}
    ${m.personality ? `<div><span style="color:#6b7280;">性格:</span> <b style="color:#fbbf24;">${esc(m.personality)}</b></div>` : ''}
    ${m.openingMessage ? `<div style="margin-top:4px;color:#6b7280;">开场白: <span style="color:#e5e7eb;">${esc(m.openingMessage)}</span></div>` : ''}
  `
}

function copySessionInfo() {
  if (!_aispRef?.caseMeta?.value) return
  const m = _aispRef.caseMeta.value
  const modeLabel = m.mode === 'humanistic-comm' ? '人文沟通' : m.mode === 'mental-exam' ? '精神检查' : '病史采集'
  let text = `病例: ${m.caseId} | 模式: ${modeLabel}`
  if (m.scenarioName) text += ` | 场景: ${m.scenarioName}`
  if (m.personality) text += `\n性格: ${m.personality}`
  if (m.openingMessage) text += ` | 开场白: ${m.openingMessage}`
  copyToClipboard(text, _el?.querySelector('#ed-btn-copy-info'))
}

function toggleCollapse() {
  const list = _el?.querySelector('#ed-log-list')
  const radarRow = _el?.querySelector('#ed-radar-row')
  const brainWrap = _el?.querySelector('#ed-brain-wrap')
  const infoWrap = _el?.querySelector('#ed-info-wrap')
  _el._collapsed = !_el._collapsed
  const d = _el._collapsed ? 'none' : ''
  if (list) list.style.display = d
  if (radarRow) radarRow.style.display = d
  if (brainWrap) brainWrap.style.display = d
  if (infoWrap) infoWrap.style.display = _el._infoVisible ? d : 'none'
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function copyToClipboard(text, btnEl) {
  navigator.clipboard.writeText(text).then(() => {
    if (btnEl) {
      const orig = btnEl.textContent
      btnEl.textContent = '✓ 已复制'
      btnEl.style.background = '#065f46'
      btnEl.style.borderColor = '#059669'
      setTimeout(() => {
        btnEl.textContent = orig
        btnEl.style.background = ''
        btnEl.style.borderColor = ''
      }, 1500)
    }
  }).catch(() => {})
}

// ═══ 历史会话 ═══

let _pastLogs = []
let _viewingSessionKey = ''

function toggleHistMenu() {
  const select = _el.querySelector('#ed-hist-select')
  if (!select) return
  if (select.style.display === 'none' || !select.style.display) {
    if (_aispRef && _aispRef.getStoredLogs) {
      _pastLogs = _aispRef.getStoredLogs()
    } else {
      _pastLogs = []
      try {
        const raw = localStorage.getItem('aisp_log_index')
        const index = raw ? JSON.parse(raw) : []
        for (const key of index) {
          const data = localStorage.getItem(key)
          const updated = localStorage.getItem(key + '_updated')
          if (data) {
            try {
              _pastLogs.push({ key, updated: updated ? Number(updated) : 0, rounds: JSON.parse(data).length })
            } catch (e) { /* skip */ }
          }
        }
        _pastLogs.sort((a, b) => b.updated - a.updated)
      } catch (e) { _pastLogs = [] }
    }
    select.innerHTML = '<option value="">— 当前会话 —</option>'
    for (const log of _pastLogs) {
      const shortKey = log.key.replace('aisp_convlog_', '').substring(0, 30)
      const time = log.updated ? new Date(log.updated).toLocaleString('zh-CN') : '未知'
      select.innerHTML += `<option value="${log.key}">${shortKey} (${log.rounds}轮 ${time})</option>`
    }
    select.style.display = 'inline-block'
  } else {
    select.style.display = 'none'
    _viewingSessionKey = ''
  }
}

function onHistSelect(e) {
  const key = e.target.value
  if (!key) {
    _viewingSessionKey = ''
    return
  }
  _viewingSessionKey = key
  try {
    const data = localStorage.getItem(key)
    if (data) {
      renderPastLogs(JSON.parse(data))
    }
  } catch (e) { /* ignore */ }
}

function renderPastLogs(logs) {
  if (!_el) return
  const list = _el.querySelector('#ed-log-list')
  const counter = _el.querySelector('#ed-round-count')
  if (!list || !counter) return

  counter.textContent = '[历史] ' + logs.length + ' 轮'

  // 隐藏实时面板
  const brainWrap = _el.querySelector('#ed-brain-wrap')
  const infoWrap = _el.querySelector('#ed-info-wrap')
  if (brainWrap) brainWrap.style.display = 'none'
  if (infoWrap) infoWrap.style.display = 'none'

  if (logs.length === 0) {
    list.innerHTML = '<div style="color:#6b7280;text-align:center;padding:24px;">无记录</div>'
    return
  }

  let html = ''
  for (let i = 0; i < logs.length; i++) {
    const r = logs[i]
    const prevR = i > 0 ? logs[i - 1] : null
    const intentColor = INTENT_COLORS[r.intent] || '#6b7280'
    const t = r.trustLevel ?? 0
    const tColor = t >= 5 ? '#10b981' : t >= 0 ? '#fbbf24' : '#ef4444'

    let tags = ''
    if (r.state) tags += `<span style="color:#e5e7eb;font-size:10px;font-weight:500;">${r.state}</span>`
    if (r.voiceStyle && r.voiceStyle !== 'normal') tags += `<span style="color:${VS_COLORS[r.voiceStyle] || '#9ca3af'};font-size:10px;padding:0 3px;border-radius:3px;border:1px solid ${VS_COLORS[r.voiceStyle] || '#4b5563'};">${r.voiceStyle}</span>`
    if (r.videoAction && r.videoAction !== 'calm') tags += `<span style="color:${VA_COLORS[r.videoAction] || '#9ca3af'};font-size:10px;padding:0 3px;border-radius:3px;border:1px solid ${VA_COLORS[r.videoAction] || '#4b5563'};">${r.videoAction}</span>`

    // 档位过渡
    let gearLine = ''
    if (r.gear) {
      const prevGear = prevR?.gear || '—'
      const currGear = r.gear
      const pColor = GEAR_COLORS[prevGear] || '#6b7280'
      const cColor = GEAR_COLORS[currGear] || '#6b7280'
      gearLine = `<span style="color:${pColor};font-size:10px;">${prevGear}</span><span style="color:#4b5563;">→</span><span style="color:${cColor};font-size:10px;font-weight:600;">${currGear}</span>`
    }

    // 紧凑状态行：怒(前->后) + CM
    let stateLine = ''
    const stateParts = []
    if (r.damperPre != null || r.damper != null) {
      const pre = r.damperPre ?? r.damper ?? 0
      const post = r.damper ?? 0
      const diff = post - pre
      const arrow = diff > 0.05 ? '<span style="color:#ef4444;">&uarr;</span>' : diff < -0.05 ? '<span style="color:#10b981;">&darr;</span>' : ''
      stateParts.push(`<span style="color:#f87171;">怒:${Number(pre).toFixed(1)}->${Number(post).toFixed(1)}${arrow}</span>`)
    } else if (r.damper != null) {
      stateParts.push(`<span style="color:#f87171;">怒:${Number(r.damper).toFixed(1)}</span>`)
    }
    if (r.cm) {
      const cm = r.cm
      const cColor = (cm.concern?.intensity ?? 5) >= 7 ? '#ef4444' : (cm.concern?.intensity ?? 5) >= 4 ? '#fbbf24' : '#10b981'
      stateParts.push(`<span style="color:#10b981;">t:${cm.trust}</span>`)
      stateParts.push(`<span style="color:${cColor};">c:${cm.concern?.intensity ?? '?'}</span>`)
      if (cm.stuck_count > 0) stateParts.push(`<span style="color:#fbbf24;">s:${cm.stuck_count}</span>`)
      if (cm.consecutive_avoidance > 0) stateParts.push(`<span style="color:#f97316;">a:${cm.consecutive_avoidance}</span>`)
    }
    stateLine = stateParts.join(' | ')

    html += `<div style="margin-bottom:6px;padding:8px 10px;background:rgba(255,255,255,0.02);border-radius:6px;border:1px solid #1f2937;">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;padding-bottom:3px;border-bottom:1px solid #1f2937;flex-wrap:wrap;">
        <span style="color:#9ca3af;font-size:11px;font-weight:700;">#${r.round}</span>
        ${gearLine ? `<span style="margin:0 2px;">${gearLine}</span>` : ''}
        ${stateLine ? `<span style="font-size:10px;color:#6b7280;margin:0 2px;">${stateLine}</span>` : ''}
        <span style="color:${intentColor};font-size:10px;padding:1px 6px;border-radius:3px;border:1px solid ${intentColor};">${r.intent}</span>
        <span style="color:${tColor};font-size:10px;font-weight:600;">信任${t > 0 ? '+' : ''}${t}</span>
        ${tags}
        <span style="flex:1;"></span>
        <span style="color:#4b5563;font-size:10px;">${r.time ? new Date(r.time).toLocaleTimeString() : ''}</span>
      </div>
      <div style="font-size:12px;line-height:1.5;">
        <div style="color:#fca5a5;">👤 ${esc(r.student)}</div>
        <div style="color:#93c5fd;">🤖 ${esc(r.sp)}</div>
      </div>
    </div>`
  }
  list.innerHTML = html
}

// ═══ 实时渲染 ═══

function renderRadar() {
  const canvas = _el?.querySelector('#ed-radar')
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const W = canvas.width, H = canvas.height
  ctx.clearRect(0, 0, W, H)

  const logs = _aispRef?.debugLog?.value || []
  if (logs.length === 0) {
    ctx.fillStyle = '#6b7280'
    ctx.font = '12px ui-monospace'
    ctx.textAlign = 'center'
    ctx.fillText('等待对话开始...', W / 2, H / 2)
    return
  }

  const curr = logs[logs.length - 1].vector
  const prev = logs.length > 1 ? logs[logs.length - 2].vector : null

  const cx = W / 2, cy = H / 2
  const radius = Math.min(cx, cy) - 20
  const dims = EMOTION_DIMS
  const n = dims.length

  // 背景网格
  for (let level = 2; level <= 10; level += 2) {
    ctx.beginPath()
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 / n) * i - Math.PI / 2
      const r = (level / 10) * radius
      const x = cx + Math.cos(angle) * r
      const y = cy + Math.sin(angle) * r
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'
    ctx.stroke()
  }

  // 轴线
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 / n) * i - Math.PI / 2
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius)
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.stroke()
  }

  // 上一轮
  if (prev) {
    ctx.beginPath()
    for (let i = 0; i < n; i++) {
      const dim = dims[i]
      const max = DIM_MAX[dim] || 10
      const val = Math.min(prev[dim] || 0, max)
      const r = (val / max) * radius
      const angle = (Math.PI * 2 / n) * i - Math.PI / 2
      const x = cx + Math.cos(angle) * r
      const y = cy + Math.sin(angle) * r
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.fillStyle = 'rgba(156,163,175,0.12)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(156,163,175,0.35)'
    ctx.stroke()
  }

  // 当前轮
  ctx.beginPath()
  for (let i = 0; i < n; i++) {
    const dim = dims[i]
    const max = DIM_MAX[dim] || 10
    const val = Math.min(curr[dim] || 0, max)
    const r = (val / max) * radius
    const angle = (Math.PI * 2 / n) * i - Math.PI / 2
    const x = cx + Math.cos(angle) * r
    const y = cy + Math.sin(angle) * r
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fillStyle = 'rgba(59,130,246,0.18)'
  ctx.fill()
  ctx.strokeStyle = '#3b82f6'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.lineWidth = 1

  // 标签
  ctx.font = 'bold 10px ui-monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (let i = 0; i < n; i++) {
    const dim = dims[i]
    const max = DIM_MAX[dim] || 10
    const val = curr[dim] || 0
    const angle = (Math.PI * 2 / n) * i - Math.PI / 2
    const lr = radius + 12
    ctx.fillStyle = DIM_COLORS[dim]
    ctx.fillText(DIM_LABELS[dim], cx + Math.cos(angle) * lr, cy + Math.sin(angle) * lr)
    const vr = (val / max) * radius + 8
    ctx.fillStyle = '#f9fafb'
    ctx.font = '8px ui-monospace'
    ctx.fillText(val.toFixed(1), cx + Math.cos(angle) * vr, cy + Math.sin(angle) * vr)
  }
}

function renderDualBrain() {
  if (!_el || _viewingSessionKey) return
  const logs = _aispRef?.debugLog?.value || []
  const last = logs.length > 0 ? logs[logs.length - 1] : null

  // ═══ 阻尼器 ═══
  const damperPre = last?.damperPre ?? last?.damper ?? 0
  const damperPost = last?.damper ?? 0
  const damperPct = Math.min(100, (damperPost / 10) * 100)
  let damperGear = '—'
  if (damperPost >= 7) damperGear = '暴怒'
  else if (damperPost >= 4) damperGear = '愤怒'
  else if (damperPost >= 1) damperGear = '不满'
  const damperColor = damperPost >= 7 ? '#ef4444' : damperPost >= 4 ? '#f97316' : damperPost >= 1 ? '#fbbf24' : '#10b981'

  const preEl = _el.querySelector('#ed-damper-pre')
  if (preEl) { preEl.textContent = damperPre.toFixed(1); preEl.style.color = '#9ca3af' }
  const postEl = _el.querySelector('#ed-damper-post')
  if (postEl) { postEl.textContent = damperPost.toFixed(1); postEl.style.color = damperColor }

  const barFill = _el.querySelector('#ed-damper-bar-fill')
  if (barFill) {
    barFill.style.width = damperPct + '%'
    barFill.style.background = damperColor
  }
  const valEl = _el.querySelector('#ed-damper-val')
  if (valEl) { valEl.textContent = damperPost.toFixed(1); valEl.style.color = damperColor }
  const gearEl = _el.querySelector('#ed-damper-gear')
  if (gearEl) { gearEl.innerHTML = `阻尼档: <b style="color:${GEAR_COLORS[damperGear] || '#6b7280'};">${damperGear}</b>` }

  // ═══ 反思脑 CM ═══
  const cm = last?.cm
  const setCM = (id, val, color) => {
    const el = _el?.querySelector('#ed-cm-' + id)
    if (el) { el.textContent = val ?? '—'; el.style.color = color || '#6b7280' }
  }
  if (cm) {
    const tColor = cm.trust >= 7 ? '#10b981' : cm.trust >= 3 ? '#fbbf24' : '#ef4444'
    const cColor = cm.concern?.intensity >= 7 ? '#ef4444' : cm.concern?.intensity >= 4 ? '#fbbf24' : '#10b981'
    setCM('trust', cm.trust, tColor)
    setCM('peak', cm.trust_peak)
    setCM('concern', (cm.concern?.primary ? cm.concern.primary + ' ' : '') + (cm.concern?.intensity ?? '?'), cColor)
    setCM('stuck', cm.stuck_count, cm.stuck_count >= 4 ? '#fbbf24' : undefined)
    setCM('avoid', cm.consecutive_avoidance, cm.consecutive_avoidance >= 2 ? '#fbbf24' : undefined)
    setCM('loss', cm.conflict_trust_loss?.toFixed(1), cm.conflict_trust_loss > 1 ? '#ef4444' : undefined)
    setCM('badnews', cm.bad_news_triggered ? '是' : '否', cm.bad_news_triggered ? '#ef4444' : undefined)
    setCM('unresolved', cm.unresolved_count, cm.unresolved_count > 0 ? '#60a5fa' : undefined)
  } else {
    ;['trust','peak','concern','stuck','avoid','loss','badnews','unresolved'].forEach(id => setCM(id, '—'))
  }

  // 综合档位
  const gearEl2 = _el.querySelector('#ed-cm-gear')
  if (gearEl2) {
    const g = last?.gear || '中立'
    gearEl2.textContent = g
    gearEl2.style.color = GEAR_COLORS[g] || '#6b7280'
  }
}

function renderLogs() {
  if (!_el || !_visible) return
  if (_viewingSessionKey) return
  const list = _el.querySelector('#ed-log-list')
  const counter = _el.querySelector('#ed-round-count')
  const modelBadge = _el.querySelector('#ed-model-badge')
  const strikeEl = _el.querySelector('#ed-strike-indicator')
  if (!list || !counter) return

  const logs = _aispRef?.debugLog?.value || []
  counter.textContent = logs.length + ' 轮'

  // 模型标记
  const lastLog = logs.length > 0 ? logs[logs.length - 1] : null
  if (modelBadge && lastLog?.llmModel) {
    modelBadge.textContent = lastLog.llmModel
    modelBadge.style.display = 'inline'
  } else if (modelBadge && _aispRef?.getLLMModel) {
    const info = _aispRef.getLLMModel()
    if (info.lastUsed) {
      modelBadge.textContent = info.lastUsed
      modelBadge.style.display = 'inline'
    }
  }

  // 投诉
  const sc = _aispRef?.strikeCount?.value ?? 0
  const sm = _aispRef?.strikeMax?.value ?? 3
  if (strikeEl) {
    if (sc > 0) {
      strikeEl.textContent = `投诉 ${sc}/${sm}`
      strikeEl.style.display = 'inline'
      strikeEl.style.color = sc >= 3 ? '#ef4444' : sc >= 2 ? '#f97316' : '#fbbf24'
    } else { strikeEl.style.display = 'none' }
  }

  // 恢复实时面板（从历史切回时）
  const brainWrap = _el.querySelector('#ed-brain-wrap')
  const infoWrap = _el.querySelector('#ed-info-wrap')
  if (brainWrap) brainWrap.style.display = _el._collapsed ? 'none' : 'flex'
  if (infoWrap) infoWrap.style.display = _el._infoVisible ? 'block' : 'none'

  // 雷达
  renderRadar()

  // 信任轴（雷达右侧）
  const trustFill = _el.querySelector('#ed-trust-fill')
  const trustVal = _el.querySelector('#ed-trust-val')
  const quickStats = _el.querySelector('#ed-quick-stats')
  if (logs.length > 0) {
    const last = logs[logs.length - 1]
    const t = last.trustLevel ?? 0
    const trustColor = t >= 5 ? '#10b981' : t >= 0 ? '#fbbf24' : '#ef4444'
    if (trustFill) { trustFill.style.width = ((t + 10) / 20 * 100).toFixed(0) + '%'; trustFill.style.background = trustColor }
    if (trustVal) { trustVal.textContent = t; trustVal.style.color = trustColor }
    // 快速统计（从最新CM取）
    if (quickStats && last.cm) {
      const cm = last.cm
      const cColor = (cm.concern?.intensity ?? 5) >= 7 ? '#ef4444' : (cm.concern?.intensity ?? 5) >= 4 ? '#fbbf24' : '#10b981'
      const sColor = cm.stuck_count >= 4 ? '#fbbf24' : '#6b7280'
      const aColor = cm.consecutive_avoidance >= 2 ? '#fbbf24' : '#6b7280'
      quickStats.innerHTML = `
        concern: <b style="color:${cColor};">${cm.concern?.intensity ?? '?'}</b>
        stuck: <b style="color:${sColor};">${cm.stuck_count ?? 0}</b>
        avoid: <b style="color:${aColor};">${cm.consecutive_avoidance ?? 0}</b>
      `
    } else if (quickStats) {
      quickStats.innerHTML = `concern: <b style="color:#6b7280;">—</b> stuck: <b style="color:#6b7280;">—</b> avoid: <b style="color:#6b7280;">—</b>`
    }
  }

  // 双脑面板
  renderDualBrain()

  if (logs.length === 0) {
    list.innerHTML = '<div style="color:#6b7280;text-align:center;padding:24px;font-size:13px;">等待对话开始...</div>'
    return
  }

  const MAX_VISIBLE = 25
  const startIdx = Math.max(0, logs.length - MAX_VISIBLE)

  let html = ''
  for (let i = startIdx; i < logs.length; i++) {
    const r = logs[i]
    const prevR = i > 0 ? logs[i - 1] : null
    const intentColor = INTENT_COLORS[r.intent] || '#6b7280'
    const t = r.trustLevel ?? 0
    const tColor = t >= 5 ? '#10b981' : t >= 0 ? '#fbbf24' : '#ef4444'

    let badges = ''
    if (r.state) badges += `<span style="color:#e5e7eb;font-size:11px;font-weight:500;">${r.state}</span>`
    if (r.voiceStyle && r.voiceStyle !== 'normal') badges += `<span style="color:${VS_COLORS[r.voiceStyle] || '#9ca3af'};font-size:9px;padding:0 3px;border-radius:3px;border:1px solid ${VS_COLORS[r.voiceStyle] || '#4b5563'};">${r.voiceStyle}</span>`
    if (r.videoAction && r.videoAction !== 'calm') badges += `<span style="color:${VA_COLORS[r.videoAction] || '#9ca3af'};font-size:9px;padding:0 3px;border-radius:3px;border:1px solid ${VA_COLORS[r.videoAction] || '#4b5563'};">${r.videoAction}</span>`
    if (r.fallback) badges += `<span style="color:#c084fc;font-size:10px;">[降级]</span>`
    if (r.deepReassure) badges += `<span style="color:#34d399;font-size:10px;">深度安抚</span>`

    // 档位过渡箭头
    let gearArrow = ''
    if (r.gear) {
      const prevGear = prevR?.gear || '—'
      const currGear = r.gear
      const pCol = GEAR_COLORS[prevGear] || '#6b7280'
      const cCol = GEAR_COLORS[currGear] || '#6b7280'
      gearArrow = `<span style="color:${pCol};font-size:10px;">${prevGear}</span><span style="color:#374151;margin:0 1px;">→</span><span style="color:${cCol};font-size:10px;font-weight:700;">${currGear}</span>`
    }

    // 紧凑状态行：怒(决策前→后) + CM
    const stateParts = []
    if (r.damperPre != null || r.damper != null) {
      const pre = r.damperPre ?? r.damper ?? 0
      const post = r.damper ?? 0
      const diff = post - pre
      const arrow = diff > 0.05 ? `<span style="color:#ef4444;">↑</span>` : diff < -0.05 ? `<span style="color:#10b981;">↓</span>` : ''
      stateParts.push(`<span style="color:#f87171;">怒:${Number(pre).toFixed(1)}→${Number(post).toFixed(1)}${arrow}</span>`)
    } else if (r.damper != null) {
      stateParts.push(`<span style="color:#f87171;">怒:${Number(r.damper).toFixed(1)}</span>`)
    }
    if (r.cm) {
      const cm = r.cm
      const cColor = (cm.concern?.intensity ?? 5) >= 7 ? '#ef4444' : (cm.concern?.intensity ?? 5) >= 4 ? '#fbbf24' : '#10b981'
      stateParts.push(`<span style="color:#10b981;">t:${cm.trust}</span>`)
      stateParts.push(`<span style="color:${cColor};">c:${cm.concern?.intensity ?? '?'}</span>`)
      if (cm.stuck_count > 0) stateParts.push(`<span style="color:#fbbf24;">s:${cm.stuck_count}</span>`)
      if (cm.consecutive_avoidance > 0) stateParts.push(`<span style="color:#f97316;">a:${cm.consecutive_avoidance}</span>`)
    }
    const stateLine = stateParts.join(' | ')

    html += `
      <div style="margin-bottom:8px;padding:10px 12px;background:${r.fallback ? 'rgba(139,92,246,0.08)' : 'rgba(255,255,255,0.02)'};border-radius:8px;border:1px solid #1f2937;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px;padding-bottom:4px;border-bottom:1px solid #1f2937;flex-wrap:wrap;">
          <span style="color:#9ca3af;font-size:12px;font-weight:700;">#${r.round}</span>
          ${gearArrow ? `<span style="margin:0 2px;">${gearArrow}</span>` : ''}
          ${stateLine ? `<span style="font-size:10px;color:#6b7280;margin:0 2px;">${stateLine}</span>` : ''}
          <span style="color:${intentColor};font-size:11px;padding:2px 6px;border-radius:4px;border:1px solid ${intentColor};font-weight:500;">${r.intent}</span>
          <span style="color:${tColor};font-size:10px;font-weight:600;">信任${t > 0 ? '+' : ''}${t}</span>
          ${badges}
          <span style="flex:1;"></span>
          <span style="color:#4b5563;font-size:9px;">${new Date(r.time).toLocaleTimeString()}</span>
        </div>
        <div style="font-size:12px;line-height:1.6;">
          <div style="color:#fca5a5;margin-bottom:2px;">👤 ${esc(r.student)}</div>
          <div style="color:#93c5fd;">🤖 ${esc(r.sp)}</div>
        </div>
      </div>`
  }

  const wasAtBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 40
  list.innerHTML = html
  if (wasAtBottom) list.scrollTop = list.scrollHeight
}

// ═══ 复制完整报告 ═══

function copyReport() {
  const logs = _aispRef?.debugLog?.value || []
  if (logs.length === 0) {
    alert('没有对话数据可复制')
    return
  }

  const meta = _aispRef?.caseMeta?.value
  const modelInfo = _aispRef?.getLLMModel ? _aispRef.getLLMModel() : null
  const sc = _aispRef?.strikeCount?.value ?? 0
  const sm = _aispRef?.strikeMax?.value ?? 3
  const term = _aispRef?.termination?.value
  const sessionStatus = term ? `已终止(${term.reason || '投诉达上限'})` : '进行中'

  let report = `══════ Emotion Debug Report V2 ══════\n`

  // 会话信息
  if (meta) {
    const modeLabel = meta.mode === 'humanistic-comm' ? '人文沟通' : meta.mode === 'mental-exam' ? '精神检查' : '病史采集'
    report += `病例: ${meta.caseId} | 模式: ${modeLabel}`
    if (meta.scenarioName) report += ` | 场景: ${meta.scenarioName}`
    if (meta.personality) report += ` | 性格: ${meta.personality}`
    report += `\n`
    if (meta.openingMessage) report += `开场白: ${meta.openingMessage}\n`
  }
  report += `共 ${logs.length} 轮 | ${new Date().toLocaleString()}\n`
  report += `模型: ${modelInfo?.lastUsed || modelInfo?.configured || '未知'} | 投诉: ${sc}/${sm} | 状态: ${sessionStatus}\n\n`

  // 终值汇总
  const last = logs[logs.length - 1]
  const first = logs[0]
  report += `── 情绪终值 ──\n`
  const vecSummary = []
  for (const dim of EMOTION_DIMS) {
    const endVal = last.vector[dim].toFixed(1)
    const startVal = first.vector[dim].toFixed(1)
    const totalDiff = last.vector[dim] - first.vector[dim]
    if (Math.abs(totalDiff) > 0.03) {
      vecSummary.push(`${DIM_LABELS[dim]}:${startVal}→${endVal}(${totalDiff > 0 ? '↑' : '↓'}${Math.abs(totalDiff).toFixed(1)})`)
    } else {
      vecSummary.push(`${DIM_LABELS[dim]}:${endVal}`)
    }
  }
  report += vecSummary.join('  ') + `\n`

  // 双脑终态
  const damperPreVal = last.damperPre ?? last.damper ?? 0
  const damperPostVal = last.damper ?? 0
  if (last.cm) {
    const cm = last.cm
    report += `信任: ${cm.trust} | peak: ${cm.trust_peak} | concern: ${cm.concern?.primary || ''}(${cm.concern?.intensity})\n`
    report += `stuck: ${cm.stuck_count} | avoid: ${cm.consecutive_avoidance} | loss: ${(cm.conflict_trust_loss || 0).toFixed(1)} | badNews: ${cm.bad_news_triggered ? '是' : '否'} | unresolved: ${cm.unresolved_count}\n`
    report += `综合档位: ${last.gear || '—'} | 怒(前->后): ${Number(damperPreVal).toFixed(1)}->${Number(damperPostVal).toFixed(1)} | voiceStyle: ${last.voiceStyle || 'N/A'} | videoAction: ${last.videoAction || 'N/A'}\n`
  } else {
    report += `信任终值: ${last.trustLevel ?? 'N/A'} | 怒(前->后): ${Number(damperPreVal).toFixed(1)}->${Number(damperPostVal).toFixed(1)} | voiceStyle: ${last.voiceStyle || 'N/A'} | videoAction: ${last.videoAction || 'N/A'}\n`
  }

  // 意图分布
  const intentTally = {}
  for (const r of logs) {
    intentTally[r.intent] = (intentTally[r.intent] || 0) + 1
  }
  report += `\n意图分布: ` + Object.entries(intentTally).map(([k, v]) => `${k}×${v}`).join('  ') + `\n\n`
  report += `──── 对话详情 ────\n\n`

  for (let i = 0; i < logs.length; i++) {
    const r = logs[i]
    const pv = i > 0 ? logs[i - 1].vector : null
    const prevR = i > 0 ? logs[i - 1] : null

    const changes = []
    for (const dim of EMOTION_DIMS) {
      const cur = r.vector[dim].toFixed(1)
      if (pv) {
        const diff = r.vector[dim] - (pv[dim] || 0)
        if (Math.abs(diff) > 0.03) {
          changes.push(`${DIM_LABELS[dim]}:${pv[dim].toFixed(1)}→${cur}(${diff > 0 ? '↑' : '↓'}${Math.abs(diff).toFixed(1)})`)
        }
      } else {
        changes.push(`${DIM_LABELS[dim]}:${cur}`)
      }
    }

    let flags = []
    if (r.fallback) flags.push('降级')
    if (r.deepReassure) flags.push('深度安抚')
    if (r.action) flags.push(r.action)

    // 档位过渡
    let gearInfo = ''
    if (r.gear) {
      const prevG = prevR?.gear || '—'
      gearInfo = ` | gear:${prevG}→${r.gear}`
    }

    report += `#${r.round} | ${new Date(r.time).toLocaleTimeString()} | intent:${r.intent}${gearInfo} | state:${r.state}`
    if (r.voiceStyle) report += ` | vs:${r.voiceStyle}`
    if (r.videoAction) report += ` | va:${r.videoAction}`
    report += ` | trust:${r.trustLevel ?? 'N/A'}`
    const rDamperPre = r.damperPre ?? r.damper ?? 0
    const rDamperPost = r.damper ?? 0
    report += ` | anger:${Number(rDamperPre).toFixed(1)}->${Number(rDamperPost).toFixed(1)}`

    // CM 快照
    if (r.cm) {
      report += ` | CM(t:${r.cm.trust} c:${r.cm.concern?.intensity} s:${r.cm.stuck_count} a:${r.cm.consecutive_avoidance})`
    }
    if (flags.length > 0) report += ` | ${flags.join(' ')}`
    report += `\n`

    if (i === 0 || changes.length > 0) {
      report += `  ${changes.join('  ')}\n`
    } else {
      report += `  (情绪无变化)\n`
    }

    report += `  👤 ${r.student}\n`
    report += `  🤖 ${r.sp}\n`

    if (i === logs.length - 1 && term) {
      report += `  ⛔ 会话终止: ${term.reason || '投诉达上限'}\n`
    }

    report += `\n`
  }

  copyToClipboard(report, _el?.querySelector('#ed-btn-copy'))
}

// ═══ 公开 API ═══

function bind(aisp) {
  _aispRef = aisp
  createPanel()
  if (!_unwatch) {
    _unwatch = watch(
      () => aisp.debugLog?.value,
      () => { if (_visible) renderLogs() },
      { deep: true }
    )
  }
}

function show() {
  if (!_el) createPanel()
  _el.style.display = 'flex'
  _visible = true
  renderLogs()
}

function hide() {
  if (!_el) return
  _el.style.display = 'none'
  _visible = false
}

function toggle() {
  _visible ? hide() : show()
}

function destroy() {
  if (_unwatch) { _unwatch(); _unwatch = null }
  if (_el) {
    document.removeEventListener('mousemove', onDragMove)
    document.removeEventListener('mouseup', onDragEnd)
    document.removeEventListener('keydown', onKeydown)
    _el.remove()
    _el = null
  }
  _aispRef = null
  _visible = false
}

export const emotionDebugger = {
  bind, show, hide, toggle, destroy,
  get visible() { return _visible }
}
