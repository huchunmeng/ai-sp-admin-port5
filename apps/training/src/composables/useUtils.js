import { ref, reactive } from 'vue'

const toastMsg = ref('')
const toastType = ref('info')
let toastTimer = null

export function showToast(msg, type = 'info', duration = 2000) {
  toastMsg.value = msg
  toastType.value = type
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastMsg.value = '' }, duration)
}

export function useToast() {
  return { toastMsg, toastType }
}

const confirmState = reactive({
  show: false, message: '', title: '', icon: '', iconClass: '', resolve: null
})

export function confirmDialog(message, options = {}) {
  return new Promise(resolve => {
    confirmState.show = true
    confirmState.message = message
    confirmState.title = options.title || ''
    confirmState.icon = options.icon || ''
    confirmState.iconClass = options.iconClass || ''
    confirmState.resolve = resolve
  })
}

export function useConfirm() {
  return { confirmState }
}

export function formatNow() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}

export function formatTimeNow() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}

export function parseVitals(vitalSignsStr) {
  if (!vitalSignsStr) return null
  const result = {}
  const mT = vitalSignsStr.match(/T[：:\s]+([\d.]+[℃C]?)/)
  if (mT) result.temp = mT[1]
  const mP = vitalSignsStr.match(/P[：:\s]+(\d+)/)
  if (mP) result.pulse = mP[1] + '次/分'
  const mR = vitalSignsStr.match(/R[：:\s]+(\d+)/)
  if (mR) result.rr = mR[1] + '次/分'
  const mBP = vitalSignsStr.match(/BP[：:\s]+([\d/]+)\s*mmHg/)
  if (mBP) result.bp = mBP[1] + 'mmHg'
  const mSpO2 = vitalSignsStr.match(/SpO[₂2][：:\s]+([\d.]+)%/)
  if (mSpO2) result.spo2 = mSpO2[1] + '%'
  return Object.keys(result).length > 0 ? result : null
}

export function truncateText(text, maxLen) {
  if (!text) return ''
  return text.length > maxLen ? text.substring(0, maxLen) + '...' : text
}
