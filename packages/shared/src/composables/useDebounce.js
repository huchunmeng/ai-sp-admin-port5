import { ref, onUnmounted } from 'vue'

export function useDebounce(fn, delay = 300) {
  let timer = null
  const isPending = ref(false)

  function cancel() {
    if (timer) { clearTimeout(timer); timer = null }
    isPending.value = false
  }

  function debounced(...args) {
    cancel()
    isPending.value = true
    timer = setTimeout(() => { timer = null; isPending.value = false; fn(...args) }, delay)
  }

  onUnmounted(cancel)

  return { debounced, cancel, isPending }
}

export function useDebouncedRef(initialValue, delay = 300) {
  let timer = null
  const immediate = ref(initialValue)
  const debounced = ref(initialValue)

  function set(val) {
    immediate.value = val
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => { debounced.value = val }, delay)
  }

  function cancel() { if (timer) { clearTimeout(timer); timer = null } }
  onUnmounted(cancel)

  return { immediate, debounced, set, cancel }
}
