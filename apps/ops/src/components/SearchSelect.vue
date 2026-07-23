<template>
  <div class="search-select" ref="componentRef">
    <div class="search-select-input" @click="toggleDropdown"
      :style="{ opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }">
      <span style="overflow:hidden;text-overflow:ellipsis">{{ modelValue || placeholder || '全部' }}</span>
      <span v-if="modelValue" @click.stop="clearSearch" style="margin-left:auto;padding:0 4px;cursor:pointer">✕</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </div>
    <div v-if="showDropdown && !disabled" class="search-select-dropdown" @click.stop>
      <input type="text" v-model="searchText" ref="searchInputRef" placeholder="搜索..."
        @keydown.arrow-down.prevent="moveCursor(1)"
        @keydown.arrow-up.prevent="moveCursor(-1)"
        @keydown.enter.prevent="selectHighlighted"
        @keydown.escape="showDropdown = false" />
      <div v-for="(opt, idx) in filteredOptions" :key="idx" class="search-select-option"
        :class="{ highlighted: idx === cursorIdx }"
        @click="selectOption(opt)"
        @mouseenter="cursorIdx = idx">{{ typeof opt === 'string' ? opt : (opt.label || opt.name || opt.value || String(opt)) }}</div>
      <div v-if="filteredOptions.length === 0" class="search-select-option" style="color:var(--text-secondary);cursor:default">无匹配选项</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'

const props = defineProps({
  modelValue: String,
  options: Array,
  placeholder: String,
  disabled: Boolean,
  debounceMs: { type: Number, default: 0 }
})

const emit = defineEmits(['update:modelValue', 'change'])

const showDropdown = ref(false)
const searchText = ref('')
const debouncedText = ref('')
const cursorIdx = ref(-1)
const componentRef = ref(null)
const searchInputRef = ref(null)

let debounceTimer = null
watch(searchText, (val) => {
  if (props.debounceMs > 0) {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => { debouncedText.value = val }, props.debounceMs)
  } else {
    debouncedText.value = val
  }
})

const filteredOptions = computed(() => {
  const kw = debouncedText.value.toLowerCase()
  const opts = props.options || []
  if (!kw) return opts
  return opts.filter(opt => {
    const label = (typeof opt === 'string') ? opt : (opt.label || opt.name || opt.value || String(opt))
    return String(label).toLowerCase().includes(kw)
  })
})

watch(filteredOptions, () => { cursorIdx.value = -1 })

function moveCursor(dir) {
  const len = filteredOptions.value.length
  if (len === 0) { cursorIdx.value = -1; return }
  cursorIdx.value = Math.max(0, Math.min(len - 1, cursorIdx.value + dir))
}

function selectHighlighted() {
  if (cursorIdx.value >= 0 && cursorIdx.value < filteredOptions.value.length) {
    selectOption(filteredOptions.value[cursorIdx.value])
  }
}

function selectOption(opt) {
  emit('update:modelValue', opt)
  emit('change', opt)
  showDropdown.value = false
  searchText.value = ''
  debouncedText.value = ''
  cursorIdx.value = -1
}

function toggleDropdown() {
  if (!props.disabled) {
    showDropdown.value = !showDropdown.value
    searchText.value = ''
    debouncedText.value = ''
    cursorIdx.value = -1
    if (!showDropdown.value) return
    nextTick(() => {
      if (searchInputRef.value) searchInputRef.value.focus()
    })
  }
}

function clearSearch() {
  emit('update:modelValue', '')
  emit('change', '')
}

function handleClickOutside(event) {
  if (componentRef.value && !componentRef.value.contains(event.target)) {
    showDropdown.value = false
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onBeforeUnmount(() => { document.removeEventListener('click', handleClickOutside); if (debounceTimer) clearTimeout(debounceTimer) })
</script>

<style scoped>
.search-select { position: relative; min-width: 120px; }
.search-select-input {
  display: flex; align-items: center; gap: 6px; padding: 7px 10px;
  border-radius: var(--input-radius, 8px); border: 1px solid var(--border, #d1d5db);
  background: white; cursor: pointer; font-size: 13px; user-select: none;
}
.search-select-dropdown {
  position: absolute; top: 100%; left: 0; right: 0; z-index: 100;
  background: white; border: 1px solid var(--border, #d1d5db); border-radius: 8px;
  margin-top: 4px; max-height: 220px; overflow-y: auto; box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}
.search-select-dropdown input {
  width: 100%; padding: 8px 10px; border: none; border-bottom: 1px solid #e5e7eb;
  outline: none; font-size: 13px; position: sticky; top: 0; background: #fff; z-index: 1;
}
.search-select-option {
  padding: 8px 10px; cursor: pointer; font-size: 13px; transition: background .1s;
}
.search-select-option:hover,
.search-select-option.highlighted { background: var(--primary-light, #eff6ff); }
</style>
