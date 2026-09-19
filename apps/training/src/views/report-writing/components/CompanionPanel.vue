<template>
  <aside class="rwb-aside">
    <div class="card rwb-side">
      <div class="rwb-side-head">
        <i class="fa-solid fa-comments"></i> AI伴学
        <span class="rwb-side-sub">{{ askedCount }} 问</span>
      </div>

      <div ref="listEl" class="rwb-chat">
        <div class="rwb-msg is-ai">
          <div class="rwb-msg-text">{{ opening }}</div>
        </div>
        <div v-for="(m, i) in messages" :key="i" class="rwb-msg" :class="m.role === 'user' ? 'is-user' : 'is-ai'">
          <div class="rwb-msg-text">{{ m.text }}</div>
          <span v-if="m.blocked" class="rwb-msg-flag">已按引导原则改写</span>
        </div>
        <div v-if="loading" class="rwb-msg is-ai">
          <div class="rwb-msg-text is-typing"><span></span><span></span><span></span></div>
        </div>
      </div>

      <div v-if="!messages.length" class="rwb-chat-quick">
        <button v-for="q in QUICK" :key="q" class="rwb-quick-btn" @click="$emit('ask', q)">{{ q }}</button>
      </div>

      <div class="rwb-chat-bar">
        <textarea v-model="draft" class="rwb-chat-input" rows="2" maxlength="200"
                  placeholder="问点什么…（Enter 发送，Shift+Enter 换行）"
                  @keydown.enter.exact.prevent="submit"></textarea>
        <button class="btn btn-primary btn-sm" :disabled="loading || !draft.trim()" @click="submit">
          <i class="fa-solid fa-paper-plane"></i>
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue'
import { SEGMENT_GUIDE } from '@ai-sp/shared/imaging'

const QUICK = [
  '这一段该写哪几类内容？',
  '我是不是漏了什么？',
  '描述顺序怎么组织？'
]

const props = defineProps({
  /** 对话流水 `[{ role:'user'|'ai', text, blocked? }]` */
  messages: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false }
})
const emit = defineEmits(['ask'])

const draft = ref('')
const listEl = ref(null)
const askedCount = ref(0)

const opening = ref(SEGMENT_GUIDE.findings)

watch(() => props.messages.length, async () => {
  await nextTick()
  if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight
})

function submit() {
  const q = draft.value.trim()
  if (!q || props.loading) return
  draft.value = ''
  askedCount.value += 1
  emit('ask', q)
}
</script>

<style scoped>
.rwb-aside { width: 340px; flex-shrink: 0; display: flex; flex-direction: column; gap: 14px; }
.rwb-side { overflow: hidden; display: flex; flex-direction: column; }
.rwb-side-head {
  display: flex; align-items: center; gap: 8px;
  font-size: 13.5px; font-weight: 700; color: #1f2937;
  padding: 11px 16px; background: #eef2ff; border-bottom: 1px solid #e0e7ff;
}
.rwb-side-head i { color: #4f46e5; }
.rwb-side-sub { margin-left: auto; font-size: 11px; font-weight: 400; color: #9ca3af; }

.rwb-chat { flex: 1; min-height: 240px; max-height: 420px; overflow-y: auto; padding: 12px 14px 4px; display: flex; flex-direction: column; gap: 10px; }
.rwb-msg { display: flex; flex-direction: column; max-width: 92%; }
.rwb-msg.is-ai { align-self: flex-start; }
.rwb-msg.is-user { align-self: flex-end; align-items: flex-end; }
.rwb-msg-text {
  font-size: 12.5px; line-height: 1.8; padding: 8px 11px; border-radius: 10px;
  background: #f5f7fa; color: #374151; white-space: pre-wrap;
}
.rwb-msg.is-user .rwb-msg-text { background: var(--primary); color: #fff; }
.rwb-msg-flag { font-size: 10px; color: #b45309; margin-top: 3px; }
.rwb-msg-text.is-typing { display: flex; gap: 4px; align-items: center; padding: 11px; }
.rwb-msg-text.is-typing span {
  width: 5px; height: 5px; border-radius: 50%; background: #9ca3af;
  animation: rwb-blink 1.2s infinite;
}
.rwb-msg-text.is-typing span:nth-child(2) { animation-delay: .2s; }
.rwb-msg-text.is-typing span:nth-child(3) { animation-delay: .4s; }
@keyframes rwb-blink { 0%, 60%, 100% { opacity: .25 } 30% { opacity: 1 } }

.rwb-chat-quick { display: flex; flex-direction: column; gap: 6px; padding: 6px 14px 0; }
.rwb-quick-btn {
  font-family: inherit; font-size: 12px; text-align: left; padding: 7px 11px;
  border-radius: 8px; cursor: pointer; border: 1px dashed #c7d2fe;
  background: #fff; color: #4338ca;
}
.rwb-quick-btn:hover { background: #eef2ff; border-style: solid; }

.rwb-chat-bar { display: flex; gap: 6px; align-items: flex-end; padding: 10px 14px 10px; border-top: 1px solid #f3f4f6; margin-top: 8px; }
.rwb-chat-input {
  flex: 1; min-width: 0; resize: none; outline: none; font-family: inherit;
  font-size: 12.5px; line-height: 1.7; color: #1f2937;
  padding: 7px 10px; border: 1px solid #e5e7eb; border-radius: 8px;
}
.rwb-chat-input:focus { border-color: var(--primary); }
.rwb-chat-bar .btn { flex-shrink: 0; height: 32px; }

@media (max-width: 1100px) { .rwb-aside { width: 100%; } .rwb-chat { max-height: 300px; } }
</style>
