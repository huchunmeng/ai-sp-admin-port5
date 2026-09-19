<template>
  <div class="rwb-stepbar">
    <div class="rwb-steps">
      <template v-for="(s, i) in stages" :key="s.key">
        <div class="rwb-step" :class="stepClass(i)" @click="$emit('go', i)">
          <span class="rwb-dot">
            <i v-if="i < current" class="fa-solid fa-check"></i>
            <span v-else>{{ i }}</span>
          </span>
          <span class="rwb-label">{{ s.name }}</span>
        </div>
        <div v-if="i < stages.length - 1" class="rwb-line" :class="{ done: i < current }"></div>
      </template>
    </div>
    <div class="rwb-meta">
      <span class="badge badge-info">第 {{ roundIndex }} 回合</span>
      <span v-if="roundIndex > 1" class="text-secondary" style="font-size:12px">重练新回合 · 提示配额已重置</span>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  stages: { type: Array, required: true },
  current: { type: Number, required: true },
  roundIndex: { type: Number, default: 1 },
  /** 返回本阶段已达成的阶段号数组（用于判断能否回退） */
  reachable: { type: Array, default: null }
})
defineEmits(['go'])

function stepClass(i) {
  return {
    active: i === props.current,
    done: i < props.current,
    clickable: i !== props.current && (!props.reachable || props.reachable.includes(i))
  }
}
</script>

<style scoped>
.rwb-stepbar {
  display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
  background: #fff; border: 1px solid #f0f2f5; border-radius: 12px;
  padding: 10px 18px; box-shadow: 0 1px 3px rgba(0,0,0,.04);
}
.rwb-steps { display: flex; align-items: center; flex: 1; min-width: 0; overflow-x: auto; scrollbar-width: none; }
.rwb-steps::-webkit-scrollbar { display: none; }
.rwb-step { display: flex; align-items: center; gap: 7px; cursor: default; flex-shrink: 0; }
.rwb-step.clickable { cursor: pointer; }
.rwb-dot {
  width: 24px; height: 24px; border-radius: 50%; flex-shrink: 0;
  background: #dcdfe6; color: #fff; font-size: 12px; font-weight: 600;
  display: flex; align-items: center; justify-content: center; transition: all .2s;
}
.rwb-step.active .rwb-dot { background: var(--primary); box-shadow: 0 2px 8px rgba(37,99,235,.32); }
.rwb-step.done .rwb-dot { background: var(--success); }
.rwb-step.clickable:hover .rwb-dot { box-shadow: 0 0 0 4px rgba(37,99,235,.16); }
.rwb-label { font-size: 13px; color: #909399; font-weight: 500; white-space: nowrap; }
.rwb-step.active .rwb-label { color: var(--primary); font-weight: 700; }
.rwb-step.done .rwb-label { color: var(--success); }
.rwb-step.clickable:hover .rwb-label { color: var(--primary); }
.rwb-line { width: 20px; height: 2px; background: #e0e3e8; margin: 0 6px; flex-shrink: 0; }
.rwb-line.done { background: var(--success); }
.rwb-meta { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
</style>
