<template>
  <div class="materials-editor">
    <div v-if="!items.length" class="empty-state">
      <i class="fa-solid fa-images"></i>
      <p>此病例尚未配置检查素材</p>
      <p class="hint">精品病例可在此添加多媒体检查结果（图片/视频/音频/表单），让SP在问诊和查体时出示</p>
    </div>

    <template v-else>
      <!-- 既往检查（外院） -->
      <div class="material-group">
        <div class="group-header">
          <h3>既往检查（外院）</h3>
          <span class="group-desc">问诊时考生追问后出示</span>
        </div>
        <div class="material-grid">
          <div v-for="m in prevMaterials" :key="m.id" class="material-card" @click="editMaterial(m)">
            <div class="card-thumb">
              <img v-if="m.type === 'image' && (m._preview || m.filePath)" :src="m._preview || m.filePath" />
              <i v-else :class="typeIcon(m.type)"></i>
            </div>
            <div class="card-body">
              <span class="card-type-badge" :class="'badge-' + m.type">{{ typeLabel(m.type) }}</span>
              <span class="card-date" v-if="m.examDate">{{ m.examDate }}</span>
            </div>
            <div class="card-footer">
              <span class="card-name">{{ m.itemName || m.filename || '未命名' }}</span>
            </div>
          </div>
          <div class="material-card add-card" @click="addMaterial('previous')">
            <i class="fa-solid fa-plus"></i>
            <span>添加素材</span>
          </div>
        </div>
      </div>

      <!-- 本次检查（体格+辅助） -->
      <div class="material-group">
        <div class="group-header">
          <h3>本次检查（体格检查 + 辅助检查）</h3>
          <span class="group-desc">查体/开检查时出示</span>
        </div>
        <div class="material-grid">
          <div v-for="m in currMaterials" :key="m.id" class="material-card" @click="editMaterial(m)">
            <div class="card-thumb">
              <img v-if="m.type === 'image' && (m._preview || m.filePath)" :src="m._preview || m.filePath" />
              <i v-else :class="typeIcon(m.type)"></i>
            </div>
            <div class="card-body">
              <span class="card-type-badge" :class="'badge-' + m.type">{{ typeLabel(m.type) }}</span>
              <span class="card-date" v-if="m.examDate">{{ m.examDate }}</span>
            </div>
            <div class="card-footer">
              <span class="card-name">{{ m.itemName || m.filename || '未命名' }}</span>
            </div>
          </div>
          <div class="material-card add-card" @click="addMaterial('current')">
            <i class="fa-solid fa-plus"></i>
            <span>添加素材</span>
          </div>
        </div>
      </div>
    </template>

    <div v-if="!items.length" class="add-first">
      <button class="btn btn-outline" @click="addMaterial('previous')"><i class="fa-solid fa-plus"></i> 添加既往检查素材</button>
      <button class="btn btn-outline" @click="addMaterial('current')"><i class="fa-solid fa-plus"></i> 添加本次检查素材</button>
    </div>

    <!-- 编辑弹窗 -->
    <div v-if="showModal" class="modal-overlay" @click.self="cancelEdit">
      <div class="material-modal">
        <div class="modal-header">
          <h3>{{ editingId ? '编辑检查素材' : '添加检查素材' }}</h3>
          <button class="modal-close" @click="cancelEdit"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body">
          <!-- 文件区 -->
          <div class="form-section">
            <label class="section-label">文件</label>
            <div class="file-upload-area" @click="fileInput?.click()" @dragover.prevent @drop.prevent="handleDrop">
              <template v-if="form.type === 'image' && (form._preview || form.filePath)">
                <img :src="form._preview || form.filePath" class="upload-preview" />
              </template>
              <template v-else-if="form.filename">
                <i :class="typeIcon(form.type)" style="font-size:32px;color:#909399;"></i>
                <span>{{ form.filename }}</span>
              </template>
              <template v-else>
                <i class="fa-solid fa-cloud-arrow-up" style="font-size:28px;color:#C0C4CC;"></i>
                <span>点击或拖拽上传</span>
                <span class="upload-hint">支持 jpg/png/mp4/mp3/pdf</span>
              </template>
              <input ref="fileInput" type="file" accept="image/*,video/*,audio/*,.pdf,.dcm" hidden @change="handleFile" />
            </div>
          </div>

          <!-- 基本信息 -->
          <div class="form-section">
            <label class="section-label">基本信息</label>
            <div class="form-row">
              <div class="form-item">
                <label>分类</label>
                <select v-model="form.category">
                  <option value="previous">既往检查（外院）</option>
                  <option value="current">本次检查（本院）</option>
                </select>
              </div>
              <div class="form-item">
                <label>子类别</label>
                <select v-model="form.subcategory">
                  <option value="physical">体格检查</option>
                  <option value="lab">检验报告</option>
                  <option value="imaging">影像学</option>
                  <option value="special">特殊检查</option>
                  <option value="other">其他</option>
                </select>
              </div>
            </div>
            <div class="form-item">
              <label>检查项目名称</label>
              <input v-model="form.itemName" placeholder="如：胸部CT平扫、血常规化验单" />
            </div>
            <div class="form-row">
              <div class="form-item">
                <label>来源医院（选填）</label>
                <input v-model="form.sourceHospital" placeholder="如：XX市人民医院" />
              </div>
              <div class="form-item">
                <label>检查日期（选填）</label>
                <input type="date" v-model="form.examDate" />
              </div>
            </div>
            <div class="form-item">
              <label>结果描述</label>
              <textarea v-model="form.description" rows="2" placeholder="描述检查结果的内容"></textarea>
            </div>
          </div>

          <!-- 触发条件 -->
          <div class="form-section">
            <label class="section-label">触发条件 — SP在考生问到相关问题时出示素材</label>
            <div class="form-item">
              <label>所属阶段</label>
              <select v-model="form.phase">
                <option value="history_taking">问诊</option>
                <option value="physical_exam">体格检查</option>
                <option value="auxiliary_exam">辅助检查</option>
              </select>
            </div>
            <div class="form-item">
              <label>触发关键词（回车添加）</label>
              <div class="tag-input">
                <span v-for="(kw, i) in form.keywords" :key="i" class="tag">
                  {{ kw }}
                  <i class="fa-solid fa-xmark" @click="form.keywords.splice(i, 1)"></i>
                </span>
                <input v-model="kwInput" placeholder="输入关键词后回车" @keydown.enter.prevent="addKeyword" />
              </div>
            </div>
            <div class="form-item">
              <label>引导话术（回车添加）</label>
              <div class="tag-input">
                <span v-for="(h, i) in form.semantic_hints" :key="i" class="tag hint-tag">
                  {{ h }}
                  <i class="fa-solid fa-xmark" @click="form.semantic_hints.splice(i, 1)"></i>
                </span>
                <input v-model="hintInput" placeholder="SP主动提示的话术" @keydown.enter.prevent="addHint" />
              </div>
            </div>
            <div class="form-item">
              <label>SP出示时的口头描述</label>
              <textarea v-model="form.spVerbal" rows="2" placeholder="如：这是上个月在人民医院做的胸部CT，您看看。"></textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button v-if="editingId" class="btn btn-danger" @click="deleteMaterial">删除素材</button>
          <div class="spacer"></div>
          <button class="btn btn-outline" @click="cancelEdit">取消</button>
          <button class="btn btn-primary" @click="saveMaterial">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { toast } from '@ai-sp/shared'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  caseId: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue'])

const items = computed(() => props.modelValue || [])

const prevMaterials = computed(() => items.value.filter(m => m.category === 'previous'))
const currMaterials = computed(() => items.value.filter(m => m.category === 'current'))

const fileInput = ref(null)
const showModal = ref(false)
const editingId = ref(null)
const kwInput = ref('')
const hintInput = ref('')

const emptyForm = () => ({
  id: '', type: 'image', filename: '', itemName: '',
  category: 'previous', subcategory: 'imaging',
  sourceHospital: '', examDate: '', description: '',
  phase: 'history_taking',
  keywords: [], semantic_hints: [], spVerbal: '',
  _preview: '', _file: null
})
const form = ref(emptyForm())

const typeMap = { image: '图片', video: '视频', audio: '音频', pdf: 'PDF', form: '表单' }
const iconMap = {
  image: 'fa-solid fa-image', video: 'fa-solid fa-video',
  audio: 'fa-solid fa-music', pdf: 'fa-solid fa-file-pdf', form: 'fa-solid fa-file-lines'
}
function typeLabel(t) { return typeMap[t] || t }
function typeIcon(t) { return iconMap[t] || 'fa-solid fa-file' }

function uid() { return 'mat_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }

function addMaterial(category) {
  editingId.value = null
  form.value = { ...emptyForm(), category }
  showModal.value = true
}

function editMaterial(m) {
  editingId.value = m.id
  form.value = { ...m, _preview: m._preview || '', _file: null }
  showModal.value = true
}

function handleFile(e) {
  const file = e.target.files?.[0]
  if (!file) return
  processFile(file)
}

function handleDrop(e) {
  const file = e.dataTransfer?.files?.[0]
  if (!file) return
  processFile(file)
}

function processFile(file) {
  form.value.filename = file.name
  form.value._file = file
  const ext = file.name.split('.').pop().toLowerCase()
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) form.value.type = 'image'
  else if (['mp4', 'webm', 'mov'].includes(ext)) form.value.type = 'video'
  else if (['mp3', 'wav', 'ogg'].includes(ext)) form.value.type = 'audio'
  else if (ext === 'pdf') form.value.type = 'pdf'
  else form.value.type = 'form'

  if (form.value.type === 'image') {
    const reader = new FileReader()
    reader.onload = () => { form.value._preview = reader.result }
    reader.readAsDataURL(file)
  }
}

function addKeyword() {
  const v = kwInput.value.trim()
  if (v && !form.value.keywords.includes(v)) form.value.keywords.push(v)
  kwInput.value = ''
}

function addHint() {
  const v = hintInput.value.trim()
  if (v && !form.value.semantic_hints.includes(v)) form.value.semantic_hints.push(v)
  hintInput.value = ''
}

async function saveMaterial() {
  const f = form.value
  if (!f.filename) return

  let filePath = f.filePath || ''

  // 有新选文件 → 先上传
  if (f._file && props.caseId) {
    try {
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.readAsDataURL(f._file)
      })
      const res = await fetch('/api/case/upload-material', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: props.caseId, filename: f.filename, data: base64 })
      })
      if (res.ok) {
        const r = await res.json()
        filePath = r.path
      }
    } catch (e) {
      toast.show('文件上传失败: ' + e.message, 'error')
      return
    }
  }

  const material = {
    id: f.id || uid(),
    type: f.type, filename: f.filename, itemName: f.itemName,
    category: f.category, subcategory: f.subcategory,
    sourceHospital: f.sourceHospital, examDate: f.examDate, description: f.description,
    phase: f.phase, mode: 'on_ask',
    keywords: [...f.keywords], semantic_hints: [...f.semantic_hints], spVerbal: f.spVerbal
  }
  if (filePath) material.filePath = filePath

  // 暂存预览数据（当前会话用，方便回显）
  if (f._preview) material._preview = f._preview

  const list = [...items.value]
  if (editingId.value) {
    const idx = list.findIndex(m => m.id === editingId.value)
    if (idx >= 0) list.splice(idx, 1, material)
  } else {
    list.push(material)
  }

  emit('update:modelValue', list)
  showModal.value = false
}

function deleteMaterial() {
  const list = items.value.filter(m => m.id !== editingId.value)
  emit('update:modelValue', list)
  showModal.value = false
}

function cancelEdit() {
  showModal.value = false
}
</script>

<style scoped>
.materials-editor { padding: 16px; }

.empty-state { text-align: center; padding: 60px 20px; color: #909399; }
.empty-state i { font-size: 48px; margin-bottom: 16px; display: block; color: #DCDFE6; }
.empty-state p { font-size: 14px; margin-bottom: 4px; }
.empty-state .hint { font-size: 12px; color: #C0C4CC; max-width: 400px; margin: 0 auto; }

.add-first { display: flex; gap: 12px; justify-content: center; padding: 20px; }

.material-group { margin-bottom: 24px; }
.group-header { margin-bottom: 12px; display: flex; align-items: baseline; gap: 10px; }
.group-header h3 { margin: 0; font-size: 15px; font-weight: 600; }
.group-desc { font-size: 12px; color: #909399; }

.material-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
.material-card { background: #fff; border: 1px solid #EBEEF5; border-radius: 8px; overflow: hidden; cursor: pointer; transition: box-shadow .15s; }
.material-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.08); }

.card-thumb { height: 100px; display: flex; align-items: center; justify-content: center; background: #f5f7fa; }
.card-thumb img { width: 100%; height: 100%; object-fit: cover; }
.card-thumb i { font-size: 28px; color: #C0C4CC; }

.card-body { padding: 6px 8px; display: flex; flex-wrap: wrap; gap: 4px; }
.card-type-badge { font-size: 10px; padding: 1px 6px; border-radius: 3px; background: #ecf5ff; color: #409EFF; }
.card-type-badge.badge-video { background: #fef0f0; color: #F56C6C; }
.card-type-badge.badge-audio { background: #fdf6ec; color: #E6A23C; }
.card-date { font-size: 10px; color: #C0C4CC; margin-left: auto; }

.card-footer { padding: 4px 8px 8px; }
.card-name { font-size: 12px; color: #606266; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }

.add-card { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; min-height: 156px; border: 2px dashed #DCDFE6; color: #909399; background: transparent; }
.add-card:hover { border-color: #409EFF; color: #409EFF; }
.add-card i { font-size: 20px; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 500; display: flex; align-items: center; justify-content: center; }
.material-modal { background: #fff; border-radius: 12px; width: 560px; max-height: 85vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.15); }
.modal-header { padding: 16px 20px; border-bottom: 1px solid #EBEEF5; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
.modal-header h3 { margin: 0; font-size: 16px; }
.modal-close { background: none; border: none; font-size: 18px; cursor: pointer; color: #909399; }
.modal-body { flex: 1; overflow-y: auto; padding: 20px; }
.modal-footer { padding: 12px 20px; border-top: 1px solid #EBEEF5; display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.modal-footer .spacer { flex: 1; }

.form-section { margin-bottom: 20px; }
.section-label { display: block; font-size: 13px; font-weight: 600; color: #303133; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #f0f0f0; }

.file-upload-area { border: 2px dashed #DCDFE6; border-radius: 8px; padding: 20px; text-align: center; cursor: pointer; transition: border-color .15s; min-height: 100px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; font-size: 13px; color: #909399; }
.file-upload-area:hover { border-color: #409EFF; }
.upload-preview { max-width: 100%; max-height: 200px; object-fit: contain; }
.upload-hint { font-size: 11px; color: #C0C4CC; }

.form-row { display: flex; gap: 12px; margin-bottom: 10px; }
.form-item { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.form-item label { font-size: 12px; color: #909399; }
.form-item input, .form-item select, .form-item textarea { padding: 8px 10px; border: 1px solid #DCDFE6; border-radius: 6px; font-size: 13px; outline: none; color: #303133; }
.form-item input:focus, .form-item select:focus, .form-item textarea:focus { border-color: #409EFF; }
.form-item textarea { resize: vertical; font-family: inherit; }

.tag-input { display: flex; flex-wrap: wrap; gap: 4px; padding: 4px 8px; border: 1px solid #DCDFE6; border-radius: 6px; min-height: 34px; align-items: center; }
.tag-input:focus-within { border-color: #409EFF; }
.tag { display: inline-flex; align-items: center; gap: 3px; font-size: 11px; padding: 2px 8px; background: #ecf5ff; color: #409EFF; border-radius: 3px; }
.tag i { cursor: pointer; font-size: 10px; }
.tag i:hover { color: #F56C6C; }
.hint-tag { background: #f0f9ff; color: #0ea5e9; }
.tag-input input { border: none; outline: none; flex: 1; min-width: 80px; font-size: 13px; padding: 4px 0; }

.btn { padding: 8px 16px; border: 1px solid #DCDFE6; border-radius: 6px; font-size: 13px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; background: #fff; color: #606266; }
.btn-primary { background: #409EFF; color: #fff; border-color: #409EFF; }
.btn-outline { background: #fff; color: #606266; }
.btn-danger { background: #fff; color: #F56C6C; border-color: #F56C6C; }
.btn:hover { opacity: 0.85; }
</style>
