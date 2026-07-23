import { ref, computed, onUnmounted } from 'vue'

export function useTimer() {
  const startTime = ref(Date.now())
  const elapsedSeconds = ref(0)
  let timerInterval = null

  const formattedTime = computed(() => {
    const mins = Math.floor(elapsedSeconds.value / 60)
    const secs = elapsedSeconds.value % 60
    return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0')
  })

  function startTimer() {
    timerInterval = setInterval(() => {
      elapsedSeconds.value = Math.floor((Date.now() - startTime.value) / 1000)
    }, 1000)
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
  }

  onUnmounted(stopTimer)

  return { startTime, elapsedSeconds, formattedTime, startTimer, stopTimer }
}
