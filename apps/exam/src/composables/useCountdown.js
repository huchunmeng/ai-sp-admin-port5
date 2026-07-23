import { ref, onUnmounted } from 'vue'

const DANGER_THRESHOLD = 60
const WARNING_THRESHOLD = 300

export function useCountdown(initialSeconds) {
  const remaining = ref(initialSeconds)
  const display = ref('')
  const status = ref('normal')
  let timer = null

  function format(secs) {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  function updateStatus() {
    if (remaining.value <= DANGER_THRESHOLD) status.value = 'danger'
    else if (remaining.value <= WARNING_THRESHOLD) status.value = 'warning'
    else status.value = 'normal'
  }

  function start() {
    stop()
    remaining.value = initialSeconds
    display.value = format(initialSeconds)
    updateStatus()
    timer = setInterval(() => {
      remaining.value--
      if (remaining.value <= 0) {
        remaining.value = 0
        stop()
      }
      display.value = format(remaining.value)
      updateStatus()
    }, 1000)
  }

  function stop() {
    if (timer) { clearInterval(timer); timer = null }
  }

  onUnmounted(stop)

  return { remaining, display, status, start, stop }
}
