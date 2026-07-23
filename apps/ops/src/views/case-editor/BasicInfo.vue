<template>
  <div>
    <h3 style="margin-bottom:16px">患者信息</h3>
    <div class="filter-row mb-4">
      <div class="filter-item" style="min-width:120px"><label>姓名</label><input class="input" :value="formData.patient_name" @input="updateField('patient_name', $event.target.value)"></div>
      <div class="filter-item" style="min-width:100px"><label>性别</label><select class="select" :value="formData.patient_gender" @change="updateField('patient_gender', $event.target.value)"><option>男</option><option>女</option></select></div>
      <div class="filter-item" style="min-width:100px"><label>年龄</label><input class="input" :value="formData.patient_age" @input="updateField('patient_age', $event.target.value)"></div>
      <div class="filter-item" style="min-width:140px"><label>职业</label><input class="input" :value="formData.patient_occupation" @input="updateField('patient_occupation', $event.target.value)"></div>
      <div class="filter-item" style="min-width:120px"><label>婚姻</label><select class="select" :value="formData.patient_marital" @change="updateField('patient_marital', $event.target.value)"><option>已婚</option><option>未婚</option></select></div>
      <div class="filter-item" style="min-width:200px"><label>地址</label><input class="input" :value="formData.patient_address" @input="updateField('patient_address', $event.target.value)"></div>
    </div>
    <div class="filter-row mb-4">
      <div class="filter-item"><label>入院日期</label><input type="date" class="input" :value="formData.admission_date" @input="updateField('admission_date', $event.target.value)"></div>
      <div class="filter-item"><label>入院科别</label><input class="input" :value="formData.admission_dept" @input="updateField('admission_dept', $event.target.value)"></div>
      <div class="filter-item"><label>记录日期</label><input type="date" class="input" :value="formData.record_date" @input="updateField('record_date', $event.target.value)"></div>
    </div>
    <div class="filter-item mb-4" style="width:100%"><label>入院诊断</label><input class="input" style="width:100%" :value="formData.admission_diagnosis" @input="updateField('admission_diagnosis', $event.target.value)" placeholder="如：腰椎间盘突出症（L3/4）？"></div>

    <h3 style="margin:24px 0 16px">病史</h3>
    <div class="filter-item mb-4">
      <label>症状</label>
      <div class="tag-chip-list">
        <span v-for="(item, idx) in formData.symptoms" :key="idx" class="tag-chip">{{ item }}<button class="tag-chip-close" @click="removeArrayTag('symptoms', idx)">×</button></span>
        <span v-if="!formData.symptoms?.length" style="color:var(--text-tertiary);font-size:13px">暂无，请添加</span>
      </div>
      <div class="tag-search-row">
        <div class="tag-search-input-wrap">
          <input class="input" v-model="newSymptoms" @input="onSymptomInput" @keyup.enter="addArrayTag('symptoms')" placeholder="搜索症状库..." style="flex:1">
          <div v-if="symptomSuggestions.length" class="tag-search-dropdown">
            <div v-for="item in symptomSuggestions" :key="item" class="tag-search-option" @mousedown.prevent="selectSuggestion('symptoms', item)">{{ item }}</div>
          </div>
        </div>
        <button class="btn btn-sm btn-primary" @click="addArrayTag('symptoms')">+</button>
      </div>
    </div>
    <div class="filter-item mb-4"><label>主诉</label><input class="input" style="width:100%" :value="formData.chief_complaint" @input="updateField('chief_complaint', $event.target.value)"></div>
    <div class="filter-item mb-4"><label>现病史</label><textarea class="input" style="width:100%" :value="formData.present_illness" @input="updateField('present_illness', $event.target.value)"></textarea></div>
    <div class="filter-item mb-4"><label>既往史</label><textarea class="input" style="width:100%" :value="formData.past_history" @input="updateField('past_history', $event.target.value)"></textarea></div>
    <div class="filter-item mb-4"><label>个人史</label><textarea class="input" style="width:100%" :value="formData.personal_history" @input="updateField('personal_history', $event.target.value)"></textarea></div>
    <div class="filter-item mb-4"><label>家族史</label><textarea class="input" style="width:100%" :value="formData.family_history" @input="updateField('family_history', $event.target.value)"></textarea></div>
    <div class="filter-item mb-4"><label>一般情况</label><textarea class="input" style="width:100%" :value="formData.general_condition" @input="updateField('general_condition', $event.target.value)" placeholder="发病以来精神、食欲、睡眠、大小便、体重变化情况..."></textarea></div>
    <div class="filter-item mb-4"><label>系统回顾</label><textarea class="input" style="width:100%" :value="formData.review_of_systems" @input="updateField('review_of_systems', $event.target.value)" placeholder="呼吸系统、循环系统、消化系统、泌尿系统等各系统回顾..."></textarea></div>

    <h3 style="margin:24px 0 16px">体格检查</h3>
    <div class="filter-item mb-4"><textarea class="input" style="width:100%" :value="formData.physical_exam" @input="updateField('physical_exam', $event.target.value)" placeholder="生命体征、一般情况、专科检查等，自由文本"></textarea></div>

    <h3 style="margin:24px 0 16px">辅助检查</h3>
    <div class="filter-item mb-4"><label>检验结果</label><textarea class="input" style="width:100%" :value="formData.lab_tests" @input="updateField('lab_tests', $event.target.value)"></textarea></div>
    <div class="filter-item mb-4"><label>影像学</label><textarea class="input" style="width:100%" :value="formData.imaging" @input="updateField('imaging', $event.target.value)"></textarea></div>
    <div class="filter-item mb-4"><label>特殊检查</label><textarea class="input" style="width:100%" :value="formData.special_exams" @input="updateField('special_exams', $event.target.value)" placeholder="心电图、肌电图、肺功能等特殊检查结果..."></textarea></div>

    <h3 style="margin:24px 0 16px">诊断与治疗</h3>
    <div class="filter-item mb-4">
      <label>初步诊断</label>
      <div class="tag-chip-list">
        <span v-for="(item, idx) in formData.primary_diagnosis" :key="idx" class="tag-chip tag-chip-primary">{{ item }}<button class="tag-chip-close" @click="removeArrayTag('primary_diagnosis', idx)">×</button></span>
        <span v-if="!formData.primary_diagnosis?.length" style="color:var(--text-tertiary);font-size:13px">暂无，请添加</span>
      </div>
      <div class="tag-search-row">
        <div class="tag-search-input-wrap">
          <input class="input" v-model="newPrimaryDiag" @input="onPrimaryDiagInput" @keyup.enter="addArrayTag('primary_diagnosis')" placeholder="搜索诊断库..." style="flex:1">
          <div v-if="diagSuggestions.length" class="tag-search-dropdown">
            <div v-for="item in diagSuggestions" :key="item" class="tag-search-option" @mousedown.prevent="selectSuggestion('primary_diagnosis', item)">{{ item }}</div>
          </div>
        </div>
        <button class="btn btn-sm btn-primary" @click="addArrayTag('primary_diagnosis')">+</button>
      </div>
    </div>
    <div class="filter-item mb-4">
      <label>鉴别诊断</label>
      <div class="tag-chip-list">
        <span v-for="(item, idx) in formData.differential_diagnosis" :key="idx" class="tag-chip tag-chip-warning">{{ item }}<button class="tag-chip-close" @click="removeArrayTag('differential_diagnosis', idx)">×</button></span>
        <span v-if="!formData.differential_diagnosis?.length" style="color:var(--text-tertiary);font-size:13px">暂无，请添加</span>
      </div>
      <div class="tag-search-row">
        <div class="tag-search-input-wrap">
          <input class="input" v-model="newDifferentialDiag" @input="onDifferentialDiagInput" @keyup.enter="addArrayTag('differential_diagnosis')" placeholder="搜索诊断库..." style="flex:1">
          <div v-if="diffDiagSuggestions.length" class="tag-search-dropdown">
            <div v-for="item in diffDiagSuggestions" :key="item" class="tag-search-option" @mousedown.prevent="selectSuggestion('differential_diagnosis', item)">{{ item }}</div>
          </div>
        </div>
        <button class="btn btn-sm btn-primary" @click="addArrayTag('differential_diagnosis')">+</button>
      </div>
    </div>
    <div class="filter-item mb-4"><label>诊断依据</label><textarea class="input" style="width:100%" :value="formData.diagnosis_basis" @input="updateField('diagnosis_basis', $event.target.value)" placeholder="列出支持诊断的临床依据..."></textarea></div>
    <div class="filter-item mb-4"><label>治疗方案</label><textarea class="input" style="width:100%" :value="formData.treatment_plan" @input="updateField('treatment_plan', $event.target.value)"></textarea></div>
    <div class="filter-item mb-4"><label>教学要点</label><textarea class="input" style="width:100%" :value="formData.teaching_points" @input="updateField('teaching_points', $event.target.value)"></textarea></div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  formData: { type: Object, required: true },
  dict: { type: Object, required: true },
  availableSpecialties: Array,
  availableCategories: Array,
  availableDiseases: Array
})

const emit = defineEmits(['update:formData', 'specialtyChange', 'categoryChange'])

const symptomLibrary = ['发热','咳嗽','咳痰','呼吸困难','胸痛','心悸','水肿','腹痛','腹胀','恶心','呕吐','腹泻','便秘','呕血','便血','黄疸','尿频','尿急','尿痛','血尿','少尿','多尿','头痛','头晕','眩晕','抽搐','意识障碍','偏瘫','麻木','腰痛','关节痛','肌肉痛','下肢放射痛','坐骨神经痛','咽痛','鼻塞','流涕','咯血','喘息','乏力','消瘦','肥胖','纳差','多饮','多食','皮肤瘙痒','皮疹','紫癜','瘀斑','出血倾向','视力模糊','听力下降','耳鸣','泡沫尿','凹陷性水肿','晨轻暮重','间歇性跛行']
const diagnosisLibrary = ['腰椎间盘突出症','腰椎管狭窄症','梨状肌综合征','第三腰椎横突综合征','颈椎病','骨质疏松症','骨折','关节炎','肩周炎','高血压','冠心病','心力衰竭','心律失常','心肌梗死','肺炎','哮喘','COPD','肺结核','肺栓塞','胃炎','胃溃疡','肝硬化','胰腺炎','胆囊炎','阑尾炎','糖尿病','肾病综合征','急性肾小球肾炎','慢性肾功能不全','脑梗死','脑出血','癫痫','帕金森病','贫血','白血病','淋巴瘤','系统性红斑狼疮','类风湿关节炎','妊娠期高血压','妊娠期糖尿病','正常分娩']

const newSymptoms = ref(''), newPrimaryDiag = ref(''), newDifferentialDiag = ref('')
const symptomSuggestions = ref([]), diagSuggestions = ref([]), diffDiagSuggestions = ref([])

const clone = obj => ({ ...obj })

function updateField(key, value) { emit('update:formData', { ...props.formData, [key]: value }) }

function filterLib(lib, text) { return text.trim() ? lib.filter(i => i.toLowerCase().includes(text.trim().toLowerCase())) : [] }
function onSymptomInput() { symptomSuggestions.value = filterLib(symptomLibrary, newSymptoms.value) }
function onPrimaryDiagInput() { diagSuggestions.value = filterLib(diagnosisLibrary, newPrimaryDiag.value) }
function onDifferentialDiagInput() { diffDiagSuggestions.value = filterLib(diagnosisLibrary, newDifferentialDiag.value) }

function addArrayTag(key) {
  const map = { symptoms: newSymptoms, primary_diagnosis: newPrimaryDiag, differential_diagnosis: newDifferentialDiag }
  const suggMap = { symptoms: symptomSuggestions, primary_diagnosis: diagSuggestions, differential_diagnosis: diffDiagSuggestions }
  const val = map[key].value.trim()
  if (!val) return
  const arr = [...(props.formData[key] || [])]
  if (arr.includes(val)) { map[key].value = ''; suggMap[key].value = []; return }
  arr.push(val)
  emit('update:formData', { ...props.formData, [key]: arr })
  map[key].value = ''
  suggMap[key].value = []
}

function selectSuggestion(key, item) {
  const map = { symptoms: newSymptoms, primary_diagnosis: newPrimaryDiag, differential_diagnosis: newDifferentialDiag }
  const suggMap = { symptoms: symptomSuggestions, primary_diagnosis: diagSuggestions, differential_diagnosis: diffDiagSuggestions }
  map[key].value = item; suggMap[key].value = []
  addArrayTag(key)
}

function removeArrayTag(key, idx) {
  const arr = [...(props.formData[key] || [])]
  arr.splice(idx, 1)
  emit('update:formData', { ...props.formData, [key]: arr })
}

function onSpecialtyChange(val) {
  emit('update:formData', { ...props.formData, specialty: val, category: '', disease: '' })
  emit('specialtyChange')
}

function onCategoryChange(val) {
  emit('update:formData', { ...props.formData, category: val, disease: '' })
  emit('categoryChange')
}
</script>

<style scoped>
.filter-row { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 16px; margin-bottom: 20px; }
.filter-item { display: flex; flex-direction: column; gap: 4px; min-width: 140px; flex: 1 0 auto; }
.filter-item label { font-size: 12px; color: var(--text-secondary); }
.tag-chip-list { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.tag-chip { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 6px; background: var(--primary-light); font-size: 13px; }
.tag-chip-primary { background: #dbeafe; color: #1e40af; }
.tag-chip-warning { background: #fef3c7; color: #92400e; }
.tag-chip-close { background: none; border: none; cursor: pointer; font-size: 14px; color: var(--text-tertiary); }
.tag-search-row { display: flex; gap: 8px; }
.tag-search-input-wrap { position: relative; flex: 1; }
.tag-search-dropdown { position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid var(--border); border-radius: 8px; max-height: 160px; overflow-y: auto; z-index: 50; }
.tag-search-option { padding: 6px 10px; cursor: pointer; font-size: 13px; }
.tag-search-option:hover { background: var(--primary-light); }
</style>
