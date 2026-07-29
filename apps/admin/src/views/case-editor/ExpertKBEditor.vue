<template>
  <div style="padding:10px;">
    <div class="card" style="padding:20px;">
      <h3 style="margin-bottom:16px;">专家知识库绑定</h3>
      <p style="font-size:12px;color:var(--text-tertiary);margin-bottom:20px;">
        绑定专家知识库后，训练端的"专家点评"面板将基于此内容结合学员操作生成个性化点评。
        未启用的病例在训练端显示"暂无专家点评"。
      </p>

      <div class="info-grid">
        <div class="info-item" style="grid-column:span 2">
          <label>
            <input type="checkbox" :checked="model.enabled" @change="updateField('enabled', $event.target.checked)" style="margin-right:6px;">
            启用专家点评
          </label>
        </div>

        <template v-if="model.enabled">
          <div class="info-item">
            <label>专家姓名</label>
            <input class="input" :value="model.expertName" @input="updateField('expertName', $event.target.value)" placeholder="如：滕皋军 院士">
          </div>
          <div class="info-item">
            <label>专家单位/职称</label>
            <input class="input" :value="model.expertTitle" @input="updateField('expertTitle', $event.target.value)" placeholder="如：东南大学附属中大医院 · 介入与血管外科">
          </div>
          <div class="info-item">
            <label>点评标题</label>
            <input class="input" :value="model.reviewTitle" @input="updateField('reviewTitle', $event.target.value)" placeholder="如：Graves病鉴别诊断中的关键线索">
          </div>
          <div class="info-item">
            <label>标签（逗号分隔）</label>
            <input class="input" :value="(model.expertTags || []).join('，')" @input="updateField('expertTags', $event.target.value.split(/[,，]/).map(s => s.trim()).filter(Boolean))" placeholder="如：中国科学院院士，介入放射学">
          </div>
          <div class="info-item" style="grid-column:span 2">
            <label>专家知识库内容</label>
            <textarea class="textarea" :value="model.expertKB" @input="updateField('expertKB', $event.target.value)" placeholder="输入专家对该病例的教学点评知识库内容（500-2000字），AI将基于此内容结合学员操作生成个性化点评..." rows="12" style="width:100%;font-family:inherit;"></textarea>
            <span style="font-size:11px;color:var(--text-tertiary);">已输入 {{ (model.expertKB || '').length }} 字</span>
          </div>
        </template>

        <div v-if="!model.enabled" style="grid-column:span 2;padding:40px;text-align:center;color:var(--text-tertiary);">
          <p style="font-size:14px;">专家点评功能未启用</p>
          <p style="font-size:12px;">勾选上方复选框以编辑专家知识库</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  model: { type: Object, default: () => ({ enabled: false, expertName: '', expertTitle: '', expertTags: [], expertKB: '', reviewTitle: '' }) }
})

const emit = defineEmits(['update:model'])

function updateField(key, value) {
  const updated = { ...props.model, [key]: value }
  emit('update:model', updated)
}
</script>
