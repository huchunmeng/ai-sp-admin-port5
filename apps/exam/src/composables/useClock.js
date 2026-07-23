import { ref, onUnmounted } from 'vue'

export function useClock() {
  const time = ref('')

  function update() {
    const d = new Date()
    const h = String(d.getHours()).padStart(2, '0')
    const m = String(d.getMinutes()).padStart(2, '0')
    time.value = h + ':' + m
  }
  update()
  const timer = setInterval(update, 1000)

  onUnmounted(() => clearInterval(timer))

  return { time }
}
