<template>
  <div class="asset-config-page">
    <div class="page-header">
      <h2>病人素材配置</h2>
      <span class="page-desc">管理41类病人模型的图形化素材与TTS音色映射 — 点击行进入编辑</span>
    </div>

    <!-- TTS模型切换 -->
    <div class="toolbar-card" style="margin-bottom: 12px;">
      <div style="display:flex; align-items:center; gap: 12px;">
        <span style="font-size:13px; font-weight:600; color:var(--text-secondary);">TTS模型：</span>
        <div class="model-tabs">
          <button
            :class="['model-tab', { active: activeTtsModel === 'qwen3-tts-instruct-flash-realtime' }]"
            @click="switchTtsModel('qwen3-tts-instruct-flash-realtime')"
          >Qwen3-TTS Flash</button>
          <button
            :class="['model-tab', { active: activeTtsModel === 'cosyvoice-v3-flash' }]"
            @click="switchTtsModel('cosyvoice-v3-flash')"
          >CosyVoice V3 Flash</button>
        </div>
        <span style="font-size:11px; color:var(--text-tertiary); margin-left:8px;">
          当前编辑 <b>{{ activeTtsModel === 'cosyvoice-v3-flash' ? 'CosyVoice' : 'Qwen-TTS' }}</b> 的音色配置
        </span>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="toolbar-card">
      <div class="filter-row">
        <div class="filter-item">
          <label>性别</label>
          <select v-model="filterGender" class="select">
            <option value="">全部</option>
            <option value="male">男</option>
            <option value="female">女</option>
            <option value="pregnant">孕妇</option>
          </select>
        </div>
        <div class="filter-item">
          <label>陈述人</label>
          <select v-model="filterRespond" class="select">
            <option value="">全部</option>
            <option value="本人回答">本人</option>
            <option value="家长代答">家长代答</option>
          </select>
        </div>
        <button class="btn btn-default btn-sm" @click="filterGender=''; filterRespond=''">
          <i class="fa-solid fa-rotate-left"></i> 重置筛选
        </button>
        <span class="filter-divider"></span>
        <button class="btn btn-default btn-sm" @click="openBatchModal">
          <i class="fa-solid fa-layer-group"></i> 批量设置音色
        </button>
        <span class="toolbar-spacer"></span>
        <span class="stat-chip">共 <b>{{ filteredModels.length }}</b> 个模型</span>
      </div>
    </div>

    <!-- 模型列表 -->
    <div class="table-card">
      <div class="table-wrapper">
        <table class="table data-table" style="margin-bottom:0;">
        <thead>
          <tr>
            <th class="cb-col"><input type="checkbox" :checked="allSelected" @change="toggleSelectAll" /></th>
            <th>模型</th>
            <th style="width:52px;">性别</th>
            <th style="width:90px;">年龄段</th>
            <th style="width:72px;">孕期</th>
            <th style="width:82px;">陈述人</th>
            <th style="width:52px;">头像</th>
            <th>TTS音色</th>
            <th class="col-action">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in filteredModels" :key="m.key">
            <td class="cb-col" @click.stop><input type="checkbox" :checked="selectedIds.has(m.id)" @change="toggleSelect(m.id)" /></td>
            <td @click="openEditor(m)"><span class="model-id-badge">{{ m.id }}</span></td>
            <td @click="openEditor(m)">{{ m.genderLabel }}</td>
            <td @click="openEditor(m)">{{ m.ageLabel }}</td>
            <td @click="openEditor(m)">
              <span v-if="m.isPregnant" class="badge badge-warning">{{ m.trimester }}</span>
              <span v-else class="text-muted">—</span>
            </td>
            <td @click="openEditor(m)">
              <span v-if="m.respond === '家长代答'" class="respond-badge respond-parent">家长代答</span>
              <span v-else class="respond-badge respond-self">本人</span>
            </td>
            <td @click="openEditor(m)">
              <img :src="m.avatarPath" class="row-thumb" @error="onThumbError($event)" />
            </td>
            <td @click="openEditor(m)">
              <span class="voice-tag voice-tag-clickable"
                :class="{ 'voice-playing': playingVoice === getVoiceForModel(m) }"
                @click.stop="previewVoice(getVoiceForModel(m), getSpeedForModel(m))"
                :title="'试听 ' + getVoiceForModel(m) + (getSpeedForModel(m) !== 1.0 ? ' ×' + getSpeedForModel(m).toFixed(1) : '')">
                <i v-if="playingVoice === getVoiceForModel(m)" class="fa-solid fa-volume-high fa-beat"></i>
                <i v-else class="fa-solid fa-play" style="font-size:9px;"></i>
                {{ getVoiceForModel(m) }}
                <span v-if="getSpeedForModel(m) !== 1.0" class="speed-dot">×{{ getSpeedForModel(m).toFixed(1) }}</span>
              </span>
            </td>
            <td class="col-action">
              <button class="btn btn-sm btn-primary" @click.stop="openEditor(m)">编辑</button>
            </td>
          </tr>
        </tbody>
      </table>
      </div>
      <div v-if="ttsError" class="tts-error-bar"><i class="fa-solid fa-triangle-exclamation"></i> TTS试听失败 — 请确认sp-api已启动，且当前音色与TTS模型兼容（当前sp-api模型: {{ spApiTtsModel }}）</div>
    </div>

    <!-- ===== 编辑弹窗 ===== -->
    <div v-if="editing" class="modal-overlay" @click.self="closeEditor">
      <div class="modal-container" style="max-width:780px; width:95vw;">
        <div class="modal-header">
          <span>{{ editing.id }} — {{ editing.genderLabel }} / {{ editing.ageLabel }}
            <span v-if="editing.isPregnant" class="badge badge-warning">{{ editing.trimester }}</span>
            <span class="text-muted" style="font-weight:400; margin-left:8px;">陈述人: {{ editing.respond }}</span>
          </span>
          <i class="fa-solid fa-xmark" style="cursor:pointer" @click="closeEditor"></i>
        </div>
        <div class="modal-body">

          <!-- 素材预览区 -->
          <div class="editor-section">
            <div class="editor-section-title"><i class="fa-solid fa-image"></i> 图形化素材（成套）</div>
            <div class="asset-set-grid">
              <div class="asset-preview-card" :class="{ active: assetLightbox?.type === 'avatar' }" @click="assetLightbox = { src: editing.avatarPath, type: 'avatar', label: '头像' }">
                <div class="asset-preview-img">
                  <img :src="editing.avatarPath" @error="$event.target.style.display='none'" />
                </div>
                <div class="asset-preview-label">头像</div>
                <div class="asset-preview-file">{{ editing.avatarFile }}</div>
              </div>
              <div class="asset-preview-card" :class="{ active: assetLightbox?.type === 'full' }" @click="assetLightbox = { src: editing.fullPath, type: 'full', label: '半身像' }">
                <div class="asset-preview-img">
                  <img :src="editing.fullPath" @error="$event.target.style.display='none'" />
                </div>
                <div class="asset-preview-label">半身像</div>
                <div class="asset-preview-file">{{ editing.fullFile }}</div>
              </div>
              <div class="asset-preview-card" :class="{ active: assetLightbox?.type === 'idle' }" @click="assetLightbox = { src: editing.idleVideoPath, type: 'idle', label: '待机视频' }">
                <div class="asset-preview-img">
                  <video :src="editing.idleVideoPath" muted loop preload="metadata"></video>
                </div>
                <div class="asset-preview-label">待机视频</div>
                <div class="asset-preview-file">{{ editing.idleVideoFile }}</div>
              </div>
              <div class="asset-preview-card" :class="{ active: assetLightbox?.type === 'speaking' }" @click="assetLightbox = { src: editing.speakingVideoPath, type: 'speaking', label: '说话视频' }">
                <div class="asset-preview-img">
                  <video :src="editing.speakingVideoPath" muted loop preload="metadata"></video>
                </div>
                <div class="asset-preview-label">说话视频</div>
                <div class="asset-preview-file">{{ editing.speakingVideoFile }}</div>
              </div>
            </div>
          </div>

          <!-- TTS音色配置 -->
          <div class="editor-section" style="margin-top:20px;">
            <div class="editor-section-title"><i class="fa-solid fa-volume-high"></i> TTS音色</div>
            <div v-if="voiceDirty" class="editor-hint" style="margin-bottom:8px; background:#e0f2fe; color:#0369a1;">
              <i class="fa-solid fa-pen"></i> 配置已修改，请点击下方"保存音色配置"按钮生效
            </div>
            <div v-if="editing.respond === '家长代答'" class="editor-hint" style="margin-bottom:8px;">
              <i class="fa-solid fa-info-circle"></i> 该模型为"家长代答"，SP实际为妈妈，建议使用成年女声。
            </div>
            <div class="voice-editor-row">
              <select class="select" :value="getVoiceForModel(editing)" @change="setVoiceForModel(editing, $event.target.value)" style="flex:1; max-width:240px;">
                <option v-for="v in groupedVoices" :key="v.id" :value="v.id">{{ v.id }} — {{ v.name }} ({{ v.desc }})</option>
              </select>
              <button class="btn btn-sm" :class="{ 'btn-playing': playingVoice === getVoiceForModel(editing) }" :disabled="ttsBusy" @click="previewVoice(getVoiceForModel(editing), getSpeedForModel(editing))">
                <i v-if="playingVoice === getVoiceForModel(editing)" class="fa-solid fa-volume-high fa-beat"></i>
                <i v-else class="fa-solid fa-play"></i>
                {{ playingVoice === getVoiceForModel(editing) ? '播放中...' : '试听' }}
              </button>
            </div>

            <!-- 试听情绪状态选择 -->
            <div class="state-preview-row">
              <label class="speed-label">试听情绪</label>
              <button v-for="st in PREVIEW_STATES" :key="st.key" class="btn btn-xs state-btn"
                :class="['state-' + st.group, { 'state-active': previewState === st.key }]"
                :disabled="ttsBusy"
                @click="previewWithState(st.key)">
                {{ st.label }}
              </button>
            </div>

            <!-- 情绪参数编辑器 -->
            <div class="emotion-params-editor">
              <div class="ep-toggle-row">
                <label class="speed-label">情绪参数</label>
                <button class="btn btn-xs" style="font-size:10px;" @click="showEmotionEditor = !showEmotionEditor">
                  <i :class="showEmotionEditor ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'"></i>
                  {{ showEmotionEditor ? '收起' : '展开' }}
                </button>
                <span style="font-size:10px;color:var(--text-tertiary);">拖拽滑块调参后用上方情绪按钮试听</span>
              </div>

              <!-- CosyVoice 模式 -->
              <div v-if="showEmotionEditor && isCosyVoiceActive()" class="ep-grid cosy">
                <div class="ep-hdr">
                  <span class="ep-hdr-label">状态</span>
                  <span class="ep-hdr-slider">语速</span>
                  <span class="ep-hdr-slider">音高</span>
                  <span class="ep-hdr-slider">音量</span>
                  <span class="ep-hdr-text">试听文本</span>
                </div>
                <div v-for="st in PREVIEW_STATES" :key="st.key" class="ep-row" :class="'ep-row-' + st.group">
                  <span class="ep-label" :class="'ep-dot-' + st.group">{{ st.label }}</span>
                  <div class="ep-slider-wrap">
                    <input type="range" min="0.5" max="2.0" step="0.05"
                      :value="getEmotionParam(st.key, 'rate')"
                      @input="setEmotionParam(st.key, 'rate', parseFloat($event.target.value))" />
                    <span class="ep-num">{{ getEmotionParam(st.key, 'rate').toFixed(2) }}</span>
                  </div>
                  <div class="ep-slider-wrap">
                    <input type="range" min="0.5" max="2.0" step="0.05"
                      :value="getEmotionParam(st.key, 'pitch')"
                      @input="setEmotionParam(st.key, 'pitch', parseFloat($event.target.value))" />
                    <span class="ep-num">{{ getEmotionParam(st.key, 'pitch').toFixed(2) }}</span>
                  </div>
                  <div class="ep-slider-wrap">
                    <input type="range" min="0" max="100" step="1"
                      :value="getEmotionParam(st.key, 'volume')"
                      @input="setEmotionParam(st.key, 'volume', parseInt($event.target.value))" />
                    <span class="ep-num">{{ getEmotionParam(st.key, 'volume') }}</span>
                  </div>
                  <input type="text" class="ep-text"
                    :value="getEmotionParam(st.key, 'text')"
                    @input="setEmotionParam(st.key, 'text', $event.target.value)" />
                </div>
              </div>

              <!-- Qwen 模式 -->
              <div v-if="showEmotionEditor && !isCosyVoiceActive()" class="ep-grid qwen">
                <div class="ep-hdr">
                  <span class="ep-hdr-label">状态</span>
                  <span class="ep-hdr-instr">Instructions（英文指令）</span>
                  <span class="ep-hdr-text">试听文本</span>
                </div>
                <div v-for="st in PREVIEW_STATES" :key="st.key" class="ep-row" :class="'ep-row-' + st.group">
                  <span class="ep-label" :class="'ep-dot-' + st.group">{{ st.label }}</span>
                  <textarea class="ep-instr" rows="2"
                    :value="getEmotionParam(st.key, 'instructions')"
                    @input="setEmotionParam(st.key, 'instructions', $event.target.value)"></textarea>
                  <input type="text" class="ep-text"
                    :value="getEmotionParam(st.key, 'text')"
                    @input="setEmotionParam(st.key, 'text', $event.target.value)" />
                </div>
              </div>
            </div>

            <!-- 倍速设置 -->
            <div class="speed-row">
              <label class="speed-label">播放倍速</label>
              <button class="btn btn-xs speed-adj" @click="adjustSpeed(editing, -0.1)">−</button>
              <input type="range" class="speed-slider" min="0.5" max="1.5" step="0.1"
                :value="getSpeedForModel(editing)"
                @input="setSpeedForModel(editing, parseFloat($event.target.value))" />
              <button class="btn btn-xs speed-adj" @click="adjustSpeed(editing, +0.1)">+</button>
              <span class="speed-value">×{{ getSpeedForModel(editing).toFixed(1) }}</span>
              <button v-if="getSpeedForModel(editing) !== 1.0" class="btn btn-xs btn-default" @click="setSpeedForModel(editing, 1.0)">重置</button>
            </div>
          </div>

        </div>
        <div class="modal-footer">
          <div style="font-size:12px; color:var(--text-tertiary); flex:1;">
            deployAge: {{ editing.deployAge }} | {{ editing.respond }}
          </div>
          <button class="btn btn-primary btn-sm" :disabled="!voiceDirty || voiceSaving" @click="saveVoiceConfig">
            <i class="fa-solid fa-floppy-disk"></i> {{ voiceSaving ? '保存中...' : '保存音色配置' }}
          </button>
          <button v-if="voiceSaved" class="btn btn-sm" style="color:var(--success);" disabled>
            <i class="fa-solid fa-check"></i> 已保存
          </button>
          <button class="btn btn-sm" @click="closeEditor">关闭</button>
        </div>
      </div>
    </div>

    <!-- ===== 批量设置弹窗 ===== -->
    <div v-if="showBatchModal" class="modal-overlay" @click.self="closeBatchModal">
      <div class="modal-container" style="max-width:560px; width:95vw;">
        <div class="modal-header">
          <span>批量设置音色 — 已选 {{ selectedIds.size }} 个模型</span>
          <i class="fa-solid fa-xmark" style="cursor:pointer" @click="closeBatchModal"></i>
        </div>
        <div class="modal-body">
          <div class="editor-section">
            <div class="editor-section-title"><i class="fa-solid fa-volume-high"></i> TTS音色</div>
            <div class="voice-editor-row">
              <select v-model="batchVoiceSel" class="select" style="flex:1; max-width:240px;">
                <option value="">— 不修改 —</option>
                <option v-for="v in ALL_VOICES" :key="v.id" :value="v.id">{{ v.id }} — {{ v.name }} ({{ v.desc }})</option>
              </select>
              <button class="btn btn-sm" :class="{ 'btn-playing': playingVoice === batchVoiceSel }" :disabled="ttsBusy || !batchVoiceSel" @click="previewVoice(batchVoiceSel, batchSpeedSel)">
                <i v-if="playingVoice === batchVoiceSel" class="fa-solid fa-volume-high fa-beat"></i>
                <i v-else class="fa-solid fa-play"></i>
                {{ playingVoice === batchVoiceSel ? '播放中...' : '试听' }}
              </button>
            </div>

            <div class="state-preview-row">
              <label class="speed-label">试听情绪</label>
              <button v-for="st in PREVIEW_STATES" :key="st.key" class="btn btn-xs state-btn"
                :class="['state-' + st.group, { 'state-active': previewState === st.key }]"
                :disabled="ttsBusy || !batchVoiceSel"
                @click="batchPreviewWithState(st.key)">
                {{ st.label }}
              </button>
            </div>

            <div class="speed-row">
              <label class="speed-label">播放倍速</label>
              <button class="btn btn-xs speed-adj" @click="batchSpeedSel = Math.max(0.5, Math.round((batchSpeedSel - 0.1) * 10) / 10)">−</button>
              <input type="range" class="speed-slider" min="0.5" max="1.5" step="0.1" v-model.number="batchSpeedSel" />
              <button class="btn btn-xs speed-adj" @click="batchSpeedSel = Math.min(1.5, Math.round((batchSpeedSel + 0.1) * 10) / 10)">+</button>
              <span class="speed-value">×{{ batchSpeedSel.toFixed(1) }}</span>
              <button v-if="batchSpeedSel !== 1.0" class="btn btn-xs btn-default" @click="batchSpeedSel = 1.0">重置</button>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <span v-if="batchApplied" class="voice-saved-hint"><i class="fa-solid fa-check"></i> 已应用</span>
          <button class="btn btn-primary btn-sm" @click="applyBatchSettings">
            <i class="fa-solid fa-check"></i> 应用到 {{ selectedIds.size }} 个模型
          </button>
          <button class="btn btn-sm" @click="closeBatchModal">关闭</button>
        </div>
      </div>
    </div>

    <!-- ===== 素材大图灯箱 ===== -->
    <div v-if="assetLightbox" class="lightbox-overlay" @click.self="assetLightbox = null">
      <button class="lightbox-close" @click="assetLightbox = null"><i class="fa-solid fa-xmark"></i></button>
      <div class="lightbox-label">{{ assetLightbox.label }}</div>
      <img v-if="assetLightbox.type === 'avatar' || assetLightbox.type === 'full'" :src="assetLightbox.src" class="lightbox-img" />
      <video v-else :src="assetLightbox.src" controls autoplay loop class="lightbox-video"></video>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

// ===== 病人模型数据 =====
const RANGES = {
  male: [
    { id: '男01', ageMin: 0,    ageMax: 0.17,  ageLabel: '0-1个月',   deployAge: 0,   respond: '家长代答' },
    { id: '男02', ageMin: 0.17,  ageMax: 0.42,  ageLabel: '2-4个月',   deployAge: 0.3, respond: '家长代答' },
    { id: '男03', ageMin: 0.42,  ageMax: 0.83,  ageLabel: '5-9个月',   deployAge: 0.6, respond: '家长代答' },
    { id: '男04', ageMin: 0.83,  ageMax: 2,     ageLabel: '10-23个月', deployAge: 1,   respond: '家长代答' },
    { id: '男05', ageMin: 2,     ageMax: 6,     ageLabel: '2-5岁',     deployAge: 4,   respond: '家长代答' },
    { id: '男06', ageMin: 6,     ageMax: 11,    ageLabel: '6-10岁',    deployAge: 8,   respond: '家长代答' },
    { id: '男07', ageMin: 11,    ageMax: 15,    ageLabel: '11-14岁',   deployAge: 13,  respond: '本人回答' },
    { id: '男08', ageMin: 15,    ageMax: 19,    ageLabel: '15-18岁',   deployAge: 17,  respond: '本人回答' },
    { id: '男09', ageMin: 19,    ageMax: 29,    ageLabel: '19-28岁',   deployAge: 24,  respond: '本人回答' },
    { id: '男10', ageMin: 29,    ageMax: 40,    ageLabel: '29-39岁',   deployAge: 34,  respond: '本人回答' },
    { id: '男11', ageMin: 40,    ageMax: 50,    ageLabel: '40-49岁',   deployAge: 45,  respond: '本人回答' },
    { id: '男12', ageMin: 50,    ageMax: 60,    ageLabel: '50-59岁',   deployAge: 55,  respond: '本人回答' },
    { id: '男13', ageMin: 60,    ageMax: 70,    ageLabel: '60-69岁',   deployAge: 65,  respond: '本人回答' },
    { id: '男14', ageMin: 70,    ageMax: 86,    ageLabel: '70-85岁',   deployAge: 78,  respond: '本人回答' },
    { id: '男15', ageMin: 86,    ageMax: 100,   ageLabel: '86-99岁',   deployAge: 93,  respond: '本人回答' },
    { id: '男16', ageMin: 100,   ageMax: 999,   ageLabel: '100岁以上', deployAge: 100, respond: '本人回答' },
  ],
  female: [
    { id: '女01', ageMin: 0,     ageMax: 0.17,  ageLabel: '0-1个月',   deployAge: 0,   respond: '家长代答' },
    { id: '女02', ageMin: 0.17,  ageMax: 0.42,  ageLabel: '2-4个月',   deployAge: 0.3, respond: '家长代答' },
    { id: '女03', ageMin: 0.42,  ageMax: 0.83,  ageLabel: '5-9个月',   deployAge: 0.6, respond: '家长代答' },
    { id: '女04', ageMin: 0.83,  ageMax: 2,     ageLabel: '10-23个月', deployAge: 1,   respond: '家长代答' },
    { id: '女05', ageMin: 2,     ageMax: 6,     ageLabel: '2-5岁',     deployAge: 4,   respond: '家长代答' },
    { id: '女06', ageMin: 6,     ageMax: 11,    ageLabel: '6-10岁',    deployAge: 8,   respond: '家长代答' },
    { id: '女07', ageMin: 11,    ageMax: 15,    ageLabel: '11-14岁',   deployAge: 13,  respond: '本人回答' },
    { id: '女08', ageMin: 15,    ageMax: 19,    ageLabel: '15-18岁',   deployAge: 17,  respond: '本人回答' },
    { id: '女09', ageMin: 19,    ageMax: 29,    ageLabel: '19-28岁',   deployAge: 24,  respond: '本人回答' },
    { id: '女10', ageMin: 29,    ageMax: 40,    ageLabel: '29-39岁',   deployAge: 34,  respond: '本人回答' },
    { id: '女11', ageMin: 40,    ageMax: 50,    ageLabel: '40-49岁',   deployAge: 45,  respond: '本人回答' },
    { id: '女12', ageMin: 50,    ageMax: 60,    ageLabel: '50-59岁',   deployAge: 55,  respond: '本人回答' },
    { id: '女13', ageMin: 60,    ageMax: 70,    ageLabel: '60-69岁',   deployAge: 65,  respond: '本人回答' },
    { id: '女14', ageMin: 70,    ageMax: 86,    ageLabel: '70-85岁',   deployAge: 78,  respond: '本人回答' },
    { id: '女15', ageMin: 86,    ageMax: 100,   ageLabel: '86-99岁',   deployAge: 93,  respond: '本人回答' },
    { id: '女16', ageMin: 100,   ageMax: 999,   ageLabel: '100岁以上', deployAge: 100, respond: '本人回答' },
  ],
  pregnant: [
    { id: '孕妇01', trimester: '孕早期', ageMin: 20, ageMax: 30, deployAge: 23 },
    { id: '孕妇02', trimester: '孕中期', ageMin: 20, ageMax: 30, deployAge: 25 },
    { id: '孕妇03', trimester: '孕晚期', ageMin: 20, ageMax: 30, deployAge: 27 },
    { id: '孕妇04', trimester: '孕早期', ageMin: 30, ageMax: 40, deployAge: 33 },
    { id: '孕妇05', trimester: '孕中期', ageMin: 30, ageMax: 40, deployAge: 35 },
    { id: '孕妇06', trimester: '孕晚期', ageMin: 30, ageMax: 40, deployAge: 37 },
    { id: '孕妇07', trimester: '孕早期', ageMin: 40, ageMax: 50, deployAge: 43 },
    { id: '孕妇08', trimester: '孕中期', ageMin: 40, ageMax: 50, deployAge: 45 },
    { id: '孕妇09', trimester: '孕晚期', ageMin: 40, ageMax: 50, deployAge: 47 },
  ],
}

const IMG_BASE = '/images/patients/'
const VID_BASE = '/videos/'

// ===== 年龄-音色默认映射 =====
const AGE_VOICE_DEFAULTS_QWEN = {
  male: [
    { ageMin: 0, ageMax: 12, voice: 'Maia' },
    { ageMin: 12, ageMax: 30, voice: 'Moon' },
    { ageMin: 30, ageMax: 55, voice: 'Kai' },
    { ageMin: 55, ageMax: 70, voice: 'Vincent' },
    { ageMin: 70, ageMax: 999, voice: 'Arthur' },
  ],
  female: [
    { ageMin: 0, ageMax: 12, voice: 'Maia' },
    { ageMin: 12, ageMax: 30, voice: 'Serena' },
    { ageMin: 30, ageMax: 55, voice: 'Maia' },
    { ageMin: 55, ageMax: 70, voice: 'Maia' },
    { ageMin: 70, ageMax: 999, voice: 'Maia' },
  ],
}

const AGE_VOICE_DEFAULTS_COSY = {
  male: [
    { ageMin: 0, ageMax: 12, voice: 'longhuhu_v3' },
    { ageMin: 12, ageMax: 30, voice: 'longanyang' },
    { ageMin: 30, ageMax: 55, voice: 'longshuo_v3' },
    { ageMin: 55, ageMax: 70, voice: 'longsanshu_v3' },
    { ageMin: 70, ageMax: 999, voice: 'longlaobo_v3' },
  ],
  female: [
    { ageMin: 0, ageMax: 12, voice: 'longhuhu_v3' },
    { ageMin: 12, ageMax: 30, voice: 'longxing_v3' },
    { ageMin: 30, ageMax: 55, voice: 'longxiaochun_v3' },
    { ageMin: 55, ageMax: 70, voice: 'longyingjing_v3' },
    { ageMin: 70, ageMax: 999, voice: 'longlaoyi_v3' },
  ],
}

const AGE_VOICE_DEFAULTS = computed(() => isCosyVoiceActive() ? AGE_VOICE_DEFAULTS_COSY : AGE_VOICE_DEFAULTS_QWEN)

function getAgeFallbackVoice(model) {
  const defaults = AGE_VOICE_DEFAULTS.value
  const entries = defaults[model.gender] || defaults['female']
  for (const e of entries) {
    if (model.ageMin >= e.ageMin && model.ageMin < e.ageMax) return e.voice
  }
  return entries[entries.length - 1]?.voice || (isCosyVoiceActive() ? 'longxing_v3' : 'Maia')
}

// ===== 全部音色 =====
const ALL_VOICES_QWEN = [
  { id: 'Maia', name: '四月', desc: '知性与温柔的碰撞', gender: 'female' },
  { id: 'Serena', name: '苏瑶', desc: '温柔小姐姐', gender: 'female' },
  { id: 'Cherry', name: '芊悦', desc: '阳光积极，亲切自然', gender: 'female' },
  { id: 'Stella', name: '少女阿月', desc: '甜到发腻的迷糊少女音', gender: 'female' },
  { id: 'Nini', name: '邻家妹妹', desc: '软糯嗓音', gender: 'female' },
  { id: 'Mia', name: '乖小妹', desc: '温顺如春水', gender: 'female' },
  { id: 'Vivian', name: '十三', desc: '拽拽可爱小暴躁', gender: 'female' },
  { id: 'Elias', name: '墨讲师', desc: '学科严谨，知识讲述', gender: 'female' },
  { id: 'Bunny', name: '萌小姬', desc: '萌属性爆棚的小萝莉', gender: 'female' },
  { id: 'Chelsie', name: '千雪', desc: '二次元虚拟女友', gender: 'female' },
  { id: 'Momo', name: '茉兔', desc: '撒娇搞怪', gender: 'female' },
  { id: 'Kai', name: '凯', desc: '成熟男声，耳朵的SPA', gender: 'male' },
  { id: 'Vincent', name: '田叔', desc: '沙哑烟嗓，中年沧桑', gender: 'male' },
  { id: 'Arthur', name: '徐大爷', desc: '被岁月浸泡的质朴嗓音', gender: 'male' },
  { id: 'Moon', name: '月白', desc: '率性帅气', gender: 'male' },
  { id: 'Neil', name: '阿闻', desc: '新闻主持人，字正腔圆', gender: 'male' },
  { id: 'Nofish', name: '不吃鱼', desc: '不翘舌音的设计师', gender: 'male' },
  { id: 'Mochi', name: '沙小弥', desc: '聪明伶俐的小大人', gender: 'male' },
]

const ALL_VOICES_COSY = [
  { id: 'longhuhu_v3', name: '龙呼呼', desc: '天真烂漫女童 6-10岁', gender: 'female' },
  { id: 'longniuniu_v3', name: '龙牛牛', desc: '阳光男童声 6-15岁', gender: 'male' },
  { id: 'longpaopao_v3', name: '龙泡泡', desc: '飞天泡泡音 6-15岁', gender: 'male' },
  { id: 'longxian_v3', name: '龙仙', desc: '豪放可爱女 12岁', gender: 'female' },
  { id: 'longling_v3', name: '龙铃', desc: '稚气呆板女 10岁', gender: 'female' },
  { id: 'longanyang', name: '龙安洋', desc: '阳光大男孩 20-30岁', gender: 'male' },
  { id: 'longanhuan_v3', name: '龙安欢', desc: '欢脱元气女 20-30岁', gender: 'female' },
  { id: 'longcheng_v3', name: '龙程', desc: '智慧青年男 20-25岁', gender: 'male' },
  { id: 'longze_v3', name: '龙泽', desc: '温暖元气男 25-30岁', gender: 'male' },
  { id: 'longzhe_v3', name: '龙哲', desc: '呆板大暖男 25-30岁', gender: 'male' },
  { id: 'longshuo_v3', name: '龙硕', desc: '博才干练男 25-30岁', gender: 'male' },
  { id: 'longtian_v3', name: '龙天', desc: '磁性理智男 30-35岁', gender: 'male' },
  { id: 'longsanshu_v3', name: '龙散书', desc: '沉稳质感男 25-45岁', gender: 'male' },
  { id: 'longlaobo_v3', name: '龙老伯', desc: '沧桑岁月爷 60+', gender: 'male' },
  { id: 'longxing_v3', name: '龙星', desc: '温婉邻家女 20-25岁', gender: 'female' },
  { id: 'longwan_v3', name: '龙婉', desc: '细腻柔声女 20-30岁', gender: 'female' },
  { id: 'longxiaochun_v3', name: '龙小淳', desc: '知性积极女 25-30岁', gender: 'female' },
  { id: 'longyingling_v3', name: '龙应聆', desc: '温和共情女 25-30岁', gender: 'female' },
  { id: 'longyingjing_v3', name: '龙应静', desc: '低调冷静女 25-35岁', gender: 'female' },
  { id: 'longyingtao_v3', name: '龙应桃', desc: '温柔淡定女 25-30岁', gender: 'female' },
  { id: 'longyan_v3', name: '龙言', desc: '温暖春风女 30-35岁', gender: 'female' },
  { id: 'longanya_v3', name: '龙安雅', desc: '高雅气质女 25-35岁', gender: 'female' },
  { id: 'longanrou_v3', name: '龙安柔', desc: '温柔闺蜜女 20-35岁', gender: 'female' },
  { id: 'longanling_v3', name: '龙安灵', desc: '思维灵动女 20-30岁', gender: 'female' },
  { id: 'longlaoyi_v3', name: '龙老姨', desc: '烟火从容阿姨 60+', gender: 'female' },
]

const ALL_VOICES = computed(() => activeTtsModel.value === 'cosyvoice-v3-flash' ? ALL_VOICES_COSY : ALL_VOICES_QWEN)

const groupedVoices = computed(() => ALL_VOICES.value)

// ===== TTS模型切换 =====
const activeTtsModel = ref('qwen3-tts-instruct-flash-realtime')
const spApiTtsModel = ref('qwen3-tts-instruct-flash-realtime')  // sp-api 实际运行的模型（不随标签切换改变）

function isCosyVoiceActive() {
  return activeTtsModel.value && activeTtsModel.value.startsWith('cosyvoice')
}

function isVoiceCompatibleWithModel(voiceName, model) {
  if (!voiceName || !model) return true  // 无法判断时放行
  if (model.startsWith('cosyvoice')) {
    return ALL_VOICES_COSY.some(v => v.id === voiceName)
  }
  return ALL_VOICES_QWEN.some(v => v.id === voiceName)
}

async function switchTtsModel(model) {
  if (model === activeTtsModel.value) return
  // 保存当前模型的修改
  if (voiceDirty.value) {
    await saveVoiceConfig()
  }
  activeTtsModel.value = model
  await loadVoiceConfig()
}

// ===== 音色配置（每个模型独立） =====
const modelVoices = ref({})    // { '男01': 'Maia', '男08': 'Ethan', ... }
const modelSpeeds = ref({})    // { '男01': 1.2, ... }
const emotionParams = ref({})  // { calm: {rate, pitch, volume, text?, instructions?}, ... }
const voiceDirty = ref(false)
const voiceSaving = ref(false)
const voiceSaved = ref(false)
const showEmotionEditor = ref(false)

// 获取情绪参数（config 优先，空则回退硬编码）
function getEmotionParam(state, field) {
  const ep = emotionParams.value[state]
  if (ep && ep[field] != null) return ep[field]
  // 回退硬编码
  if (isCosyVoiceActive()) {
    const fb = STATE_PARAMS_COSY[state] || STATE_PARAMS_COSY['calm']
    return fb[field]
  }
  if (field === 'instructions') return STATE_INSTRUCTIONS_QWEN[state] || ''
  if (field === 'text') return STATE_TEXTS[state] || '你好，我是来就诊的病人。'
  return null
}

function setEmotionParam(state, field, value) {
  const next = { ...emotionParams.value }
  if (!next[state]) next[state] = {}
  next[state] = { ...next[state], [field]: value }
  emotionParams.value = next
  voiceDirty.value = true
  voiceSaved.value = false
}

function getVoiceForModel(model) {
  if (modelVoices.value[model.id]) return modelVoices.value[model.id]
  return getAgeFallbackVoice(model)
}

function setVoiceForModel(model, newVoice) {
  modelVoices.value = { ...modelVoices.value, [model.id]: newVoice }
  voiceDirty.value = true
  voiceSaved.value = false
}

function getSpeedForModel(model) {
  return modelSpeeds.value[model.id] ?? 1.0
}

function setSpeedForModel(model, speed) {
  modelSpeeds.value = { ...modelSpeeds.value, [model.id]: speed }
  voiceDirty.value = true
  voiceSaved.value = false
}

// ===== 批量操作 =====
const selectedIds = ref(new Set())
const showBatchModal = ref(false)
const batchVoiceSel = ref('')
const batchSpeedSel = ref(1.0)
const batchApplied = ref(false)

const allSelected = computed(() => {
  const list = filteredModels.value
  return list.length > 0 && list.every(m => selectedIds.value.has(m.id))
})

function toggleSelectAll() {
  const list = filteredModels.value
  if (allSelected.value) {
    const next = new Set(selectedIds.value)
    for (const m of list) next.delete(m.id)
    selectedIds.value = next
  } else {
    const next = new Set(selectedIds.value)
    for (const m of list) next.add(m.id)
    selectedIds.value = next
  }
}

function toggleSelect(id) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
}

function openBatchModal() {
  if (selectedIds.value.size === 0) {
    const ids = new Set()
    for (const m of filteredModels.value) ids.add(m.id)
    selectedIds.value = ids
  }
  batchVoiceSel.value = ''
  batchSpeedSel.value = 1.0
  batchApplied.value = false
  showBatchModal.value = true
}

function closeBatchModal() {
  showBatchModal.value = false
  batchApplied.value = false
}

function applyBatchSettings() {
  const updatedVoices = { ...modelVoices.value }
  const updatedSpeeds = { ...modelSpeeds.value }
  for (const id of selectedIds.value) {
    if (batchVoiceSel.value) updatedVoices[id] = batchVoiceSel.value
    updatedSpeeds[id] = batchSpeedSel.value
  }
  modelVoices.value = updatedVoices
  modelSpeeds.value = updatedSpeeds
  voiceDirty.value = true
  voiceSaved.value = false
  batchApplied.value = true
  setTimeout(() => { batchApplied.value = false }, 2000)
}

function batchPreviewWithState(state) {
  if (!batchVoiceSel.value || ttsBusy.value) return
  previewState.value = state

  let instructions = ''
  let text = getEmotionParam(state, 'text')
  let extraParams = null

  if (isCosyVoiceActive()) {
    extraParams = { rate: getEmotionParam(state, 'rate'), pitch: getEmotionParam(state, 'pitch'), volume: getEmotionParam(state, 'volume') }
  } else {
    instructions = getEmotionParam(state, 'instructions')
  }

  previewVoice(batchVoiceSel.value, batchSpeedSel.value, instructions, text, extraParams).finally(() => {
    previewState.value = null
  })
}

// ===== 持久化 =====
async function saveVoiceConfig() {
  voiceSaving.value = true
  try {
    // 先读取当前完整文件，保留其他模型的配置
    let fullConfig = {}
    try {
      const getRes = await fetch('/api/voice-config')
      if (getRes.ok) fullConfig = await getRes.json()
    } catch {}

    // 确保有模型区段
    if (!fullConfig[activeTtsModel.value]) {
      fullConfig[activeTtsModel.value] = {}
    }
    const section = fullConfig[activeTtsModel.value] || {}
    fullConfig[activeTtsModel.value] = {
      ...section,
      modelVoices: modelVoices.value,
      modelSpeeds: modelSpeeds.value,
      defaults: isCosyVoiceActive() ? AGE_VOICE_DEFAULTS_COSY : AGE_VOICE_DEFAULTS_QWEN,
      previewEmotionParams: emotionParams.value,
    }

    fullConfig.updatedAt = new Date().toISOString()

    const res = await fetch('/api/voice-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullConfig),
    })
    if (res.ok) { voiceDirty.value = false; voiceSaved.value = true; setTimeout(() => { voiceSaved.value = false }, 3000) }
  } catch {}
  finally { voiceSaving.value = false }
}

async function loadVoiceConfig() {
  try {
    const res = await fetch('/api/voice-config')
    if (res.ok) {
      const data = await res.json()
      // 读取当前模型区段
      const section = data[activeTtsModel.value]
      if (section) {
        modelVoices.value = section.modelVoices || {}
        modelSpeeds.value = section.modelSpeeds || {}
        emotionParams.value = section.previewEmotionParams || {}
      } else {
        modelVoices.value = {}
        modelSpeeds.value = {}
        emotionParams.value = {}
      }
    }
  } catch { /* keep defaults */ }
}

// ===== TTS试听 =====
const TTS_BASE_URL = 'ws://localhost:5100/api/sp/tts'
const playingVoice = ref(null)
const previewState = ref(null)
const ttsBusy = ref(false)
const ttsError = ref(false)

// Qwen-TTS 用（自由文本指令）
const STATE_INSTRUCTIONS_QWEN = {
  calm:      'Subdued patient voice. Speaking to a doctor in clinic. Slightly tired, low energy. Cooperative but not chatty. Moderate-low volume, slightly slow pace.',
  pleased:   'Light, pleasant tone. Warm and engaged. Slightly faster pace. Smiling voice. Natural upward inflection.',
  irritated: 'Cold tone. Short clipped answers. Slight edge in voice. Normal volume but sharp.',
  angry:     'LOUD. High sharp pitch. Very fast aggressive delivery. Each word spat out forcefully. Confrontational tone like an argument. Hard attack on consonants.',
  furious:   'EXTREMELY LOUD. SHOUTING. Voice hoarse and straining. Maximum speed. Words explode out like gunfire. Growling snarling tone.',
  uneasy:    'Hesitant delivery. Volume rises and falls unpredictably. Words drawn out then rushed. Uncertainty in every syllable.',
  fearful:   'Voice trembling slightly. Lowered volume. Speaking in broken phrases with pauses. Pitch unsteady.',
  terrified: 'Voice shaking violently like shivering. Very quiet, barely audible. Fragmented speech, cannot finish sentences. Barely a whisper.',
  down:      'Low pitch, very slow pace, monotone. Voice heavy and dragging. Words slurred slightly from exhaustion.',
  sad:       'Low slow delivery. Pitch drops heavily at end of each phrase. Voice thick with held-back tears. Pauses mid-sentence.',
  broken:    'CRYING HARD while speaking. Voice shattered by sobs. Heavy nasal congestion. Each word interrupted by crying. Pitch wavering wildly.',
  wariness:  'Guarded but cooperative. Cool, reserved tone. Short clipped answers. Distant and watchful. Undercurrent of suspicion.',
}

// CosyVoice 用（仅 rate/pitch/volume — _v3 音色不支持 instruction 参数）
const STATE_PARAMS_COSY = {
  calm:      { rate: 1.0,  pitch: 1.0,  volume: 50, text: '嗯，医生您问吧，我尽量配合您。' },
  pleased:   { rate: 1.15, pitch: 1.05, volume: 55, text: '谢谢您啊医生，您问得真仔细，我心里踏实多了。' },
  irritated: { rate: 1.1,  pitch: 1.0,  volume: 58, text: '行吧，你问快点，我还有事呢。' },
  angry:     { rate: 1.3,  pitch: 1.1,  volume: 68, text: '你到底会不会看病？问来问去的烦不烦！' },
  furious:   { rate: 1.5,  pitch: 1.2,  volume: 80, text: '我不跟你说！换医生！把你主任叫来！！' },
  uneasy:    { rate: 1.0,  pitch: 1.0,  volume: 48, text: '医生……应该没什么大事吧？我有点害怕。' },
  fearful:   { rate: 1.1,  pitch: 1.05, volume: 52, text: '这、这到底严不严重啊？会不会出大问题？' },
  terrified: { rate: 1.2,  pitch: 1.1,  volume: 58, text: '我……我真的不行了……救救我……' },
  down:      { rate: 0.85, pitch: 0.9,  volume: 42, text: '唉……反正就这样吧，我这身体是越来越差了。' },
  sad:       { rate: 0.8,  pitch: 0.9,  volume: 42, text: '医生，我真的很难受……有时候话都不想说。' },
  broken:    { rate: 0.7,  pitch: 0.85, volume: 38, text: '呜呜……我真的撑不下去了……每天都像在熬日子……' },
  wariness:  { rate: 0.95, pitch: 0.9,  volume: 48, text: '你先说你是哪个科的？之前那个医生也是这么问的。' },
}

// 根据当前模型自动选择
const STATE_INSTRUCTIONS = computed(() => isCosyVoiceActive() ? {} : STATE_INSTRUCTIONS_QWEN)

function getStateParams(state) {
  if (isCosyVoiceActive()) return STATE_PARAMS_COSY[state] || STATE_PARAMS_COSY['calm']
  return null
}

const STATE_TEXTS = {
  calm:      '嗯，医生您问吧，我尽量配合您。',
  pleased:   '谢谢您啊医生，您问得真仔细，我心里踏实多了。',
  irritated: '行吧，你问快点，我还有事呢。',
  angry:     '你到底会不会看病？问来问去的烦不烦！',
  furious:   '我不跟你说！换医生！把你主任叫来！！',
  uneasy:    '医生……应该没什么大事吧？我有点害怕。',
  fearful:   '这、这到底严不严重啊？会不会出大问题？',
  terrified: '我……我真的不行了……救救我……',
  down:      '唉……反正就这样吧，我这身体是越来越差了。',
  sad:       '医生，我真的很难受……有时候话都不想说。',
  broken:    '呜呜……我真的撑不下去了……每天都像在熬日子……',
  wariness:  '你先说你是哪个科的？之前那个医生也是这么问的。',
}

const PREVIEW_STATES = [
  { key: 'calm', label: '平静', group: 'base' },
  { key: 'pleased', label: '愉悦', group: 'base' },
  { key: 'irritated', label: '不耐烦', group: 'anger' },
  { key: 'angry', label: '愤怒', group: 'anger' },
  { key: 'furious', label: '暴怒', group: 'anger' },
  { key: 'uneasy', label: '不安', group: 'fear' },
  { key: 'fearful', label: '恐惧', group: 'fear' },
  { key: 'terrified', label: '崩溃', group: 'fear' },
  { key: 'down', label: '低落', group: 'sadness' },
  { key: 'sad', label: '悲伤', group: 'sadness' },
  { key: 'broken', label: '泣不成声', group: 'sadness' },
  { key: 'wariness', label: '警惕', group: 'special' },
]

function previewWithState(state) {
  if (!editing.value || ttsBusy.value) return
  previewState.value = state
  const voice = getVoiceForModel(editing.value)
  const speed = getSpeedForModel(editing.value)

  let instructions = ''
  let text = getEmotionParam(state, 'text')
  let extraParams = null

  if (isCosyVoiceActive()) {
    extraParams = { rate: getEmotionParam(state, 'rate'), pitch: getEmotionParam(state, 'pitch'), volume: getEmotionParam(state, 'volume') }
  } else {
    instructions = getEmotionParam(state, 'instructions')
  }

  previewVoice(voice, speed, instructions, text, extraParams).finally(() => {
    previewState.value = null
  })
}

function adjustSpeed(model, delta) {
  const cur = getSpeedForModel(model)
  const next = Math.round((cur + delta) * 10) / 10
  if (next >= 0.5 && next <= 1.5) setSpeedForModel(model, next)
}

function b64ToBytes(b64) {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

async function previewVoice(voiceName, speed = 1.0, instructions = '', text = '你好，我是来就诊的病人，最近感觉不太舒服，想找医生看看。', extraParams = null) {
  if (!voiceName || ttsBusy.value) return

  ttsBusy.value = true; ttsError.value = false; playingVoice.value = voiceName
  let socket = null
  try {
    // 试听独立指定模型，不受全局 TTS 配置影响
    const ttsUrl = `${TTS_BASE_URL}?model=${activeTtsModel.value}`
    socket = new WebSocket(ttsUrl)
    const audioChunks = []; let resolved = false
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { if (!resolved) { resolved = true; reject(new Error('TTS 超时 (8s)')) } }, 8000)
      socket.onopen = () => {
        const session = { voice: voiceName, mode: 'server_commit', language_type: 'Chinese', response_format: 'pcm', sample_rate: 24000 }
        if (instructions) session.instructions = instructions
        if (extraParams) {
          if (extraParams.rate != null) session.rate = extraParams.rate
          if (extraParams.pitch != null) session.pitch = extraParams.pitch
          if (extraParams.volume != null) session.volume = extraParams.volume
        }
        socket.send(JSON.stringify({ type: 'session.update', session }))
        const onMsg = (event) => {
          try {
            const msg = JSON.parse(typeof event.data === 'string' ? event.data : event.data.toString())
            if (msg.type === 'session.updated') { socket.send(JSON.stringify({ type: 'input_text_buffer.append', text })); socket.send(JSON.stringify({ type: 'input_text_buffer.commit' })) }
            if (msg.type === 'response.audio.delta' && msg.delta) audioChunks.push(b64ToBytes(msg.delta))
            if (msg.type === 'response.audio.done') { clearTimeout(timeout); socket.removeEventListener('message', onMsg); if (!resolved) { resolved = true; resolve() } }
            if (msg.type === 'error') { clearTimeout(timeout); socket.removeEventListener('message', onMsg); if (!resolved) { resolved = true; reject(new Error(msg.message || 'TTS 服务端错误')) } }
          } catch (e) { console.warn('[TTS] 消息解析失败', e) }
        }
        socket.addEventListener('message', onMsg)
      }
      socket.onerror = () => { clearTimeout(timeout); if (!resolved) { resolved = true; reject(new Error('WebSocket 连接失败')) } }
    })
    if (audioChunks.length === 0) throw new Error('未收到音频数据')
    const total = audioChunks.reduce((s, a) => s + a.length, 0)
    const combined = new Uint8Array(total); let off = 0
    for (const a of audioChunks) { combined.set(a, off); off += a.length }
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') await ctx.resume()
    const view = new DataView(combined.buffer, combined.byteOffset, combined.byteLength)
    const samples = new Float32Array(combined.length / 2)
    for (let i = 0; i < samples.length; i++) samples[i] = view.getInt16(i * 2, true) / 32768
    const buf = ctx.createBuffer(1, samples.length, 24000); buf.getChannelData(0).set(samples)
    const src = ctx.createBufferSource(); src.buffer = buf; src.connect(ctx.destination)
    if (speed !== 1.0) src.playbackRate.value = speed
    await new Promise(r => { src.onended = r; src.start() }); await ctx.close()
  } catch (e) {
    console.warn('[TTS] 试听失败:', e.message)
    ttsError.value = true
    setTimeout(() => { ttsError.value = false }, 4000)
  } finally {
    ttsBusy.value = false; playingVoice.value = null
    try { socket?.close() } catch {}
  }
}

// ===== 模型列表 =====
const allModels = computed(() => {
  const list = []
  for (const gender of ['male', 'female']) {
    const gl = gender === 'male' ? '男' : '女'
    for (const e of RANGES[gender]) {
      const dAge = e.deployAge
      list.push({
        key: `${gender}-${dAge}`, id: e.id, gender, genderLabel: gl,
        ageLabel: e.ageLabel, ageMin: e.ageMin, ageMax: e.ageMax,
        deployAge: dAge, respond: e.respond, isPregnant: false, trimester: '',
        avatarPath: `${IMG_BASE}patient-${gender}-${dAge}.jpg`,
        avatarFile: `patient-${gender}-${dAge}.jpg`,
        fullPath: `${IMG_BASE}full-${gender}-${dAge}.jpg`,
        fullFile: `full-${gender}-${dAge}.jpg`,
        idleVideoPath: `${VID_BASE}${gender}-${dAge}-idle.mp4`,
        idleVideoFile: `${gender}-${dAge}-idle.mp4`,
        speakingVideoPath: `${VID_BASE}${gender}-${dAge}-speaking.mp4`,
        speakingVideoFile: `${gender}-${dAge}-speaking.mp4`,
      })
    }
  }
  for (const e of RANGES.pregnant) {
    const dAge = e.deployAge
    list.push({
      key: `pregnant-${dAge}`, id: e.id, gender: 'female', genderLabel: '女',
      ageLabel: `${e.ageMin}-${e.ageMax}岁`, ageMin: e.ageMin, ageMax: e.ageMax,
      deployAge: dAge, respond: '本人回答', isPregnant: true, trimester: e.trimester,
      avatarPath: `${IMG_BASE}patient-female-pregnant-${dAge}.jpg`,
      avatarFile: `patient-female-pregnant-${dAge}.jpg`,
      fullPath: `${IMG_BASE}full-female-pregnant-${dAge}.jpg`,
      fullFile: `full-female-pregnant-${dAge}.jpg`,
      idleVideoPath: `${VID_BASE}female-pregnant-${dAge}-idle.mp4`,
      idleVideoFile: `female-pregnant-${dAge}-idle.mp4`,
      speakingVideoPath: `${VID_BASE}female-pregnant-${dAge}-speaking.mp4`,
      speakingVideoFile: `female-pregnant-${dAge}-speaking.mp4`,
    })
  }
  return list
})

const filterGender = ref('')
const filterRespond = ref('')
const filteredModels = computed(() => {
  let list = allModels.value
  if (filterGender.value === 'male') list = list.filter(m => m.gender === 'male' && !m.isPregnant)
  else if (filterGender.value === 'female') list = list.filter(m => m.gender === 'female' && !m.isPregnant)
  else if (filterGender.value === 'pregnant') list = list.filter(m => m.isPregnant)
  if (filterRespond.value) list = list.filter(m => m.respond === filterRespond.value)
  return list
})

// ===== 弹窗 =====
const editing = ref(null)
const assetLightbox = ref(null)

function openEditor(m) { editing.value = m; assetLightbox.value = null }
function closeEditor() { editing.value = null; assetLightbox.value = null }
function onThumbError(e) { e.target.style.display = 'none' }

onMounted(async () => {
  // 先同步当前 sp-api 运行的实际 TTS 模型
  try {
    const res = await fetch('http://localhost:5100/api/sp/admin/settings')
    if (res.ok) {
      const data = await res.json()
      if (data.ttsModel) {
        activeTtsModel.value = data.ttsModel
        spApiTtsModel.value = data.ttsModel
      }
    }
  } catch { /* sp-api 未运行，保持默认 */ }
  await loadVoiceConfig()
})
</script>

<style scoped>
/* ═══ TTS模型切换 ═══ */
.model-tabs { display: flex; gap: 0; border-radius: 8px; overflow: hidden; border: 1px solid var(--border); }
.model-tab {
  padding: 6px 18px; font-size: 13px; font-weight: 500;
  border: none; background: #f9fafb; color: var(--text-secondary);
  cursor: pointer; transition: all 0.15s;
}
.model-tab:not(:last-child) { border-right: 1px solid var(--border); }
.model-tab:hover { background: #f3f4f6; }
.model-tab.active { background: #7c3aed; color: #fff; }

/* ═══ 页面整体 ═══ */
.asset-config-page { max-width: 1200px; margin: 0 auto; padding: 24px 28px 40px; }

/* ═══ 页头 ═══ */
.page-header { display: flex; align-items: baseline; gap: 16px; margin-bottom: 20px; }
.page-header h2 { margin: 0; font-size: 20px; font-weight: 700; color: var(--text-primary); }
.page-header .page-desc { color: var(--text-tertiary); font-size: 13px; }

/* ═══ 工具栏卡片 ═══ */
.toolbar-card {
  background: #fff; border: 1px solid var(--border); border-radius: 10px;
  padding: 14px 20px; margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

/* ═══ 筛选栏 ═══ */
.filter-row { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.filter-item { display: flex; align-items: center; gap: 8px; }
.filter-item label { font-size: 13px; font-weight: 500; color: var(--text-secondary); white-space: nowrap; }
.filter-item .select { min-width: 100px; }
.filter-divider { width: 1px; height: 24px; background: var(--border); }
.toolbar-spacer { flex: 1; }

/* ═══ 统计标签 ═══ */
.stat-chip {
  font-size: 12px; color: var(--text-secondary);
  background: #f3f4f6; padding: 5px 14px; border-radius: 20px;
  font-weight: 500; display: inline-flex; align-items: center; gap: 4px;
}
.stat-chip b { color: var(--text-primary); font-weight: 700; }

/* ═══ 表格容器 ═══ */
.table-card {
  background: #fff; border: 1px solid var(--border);
  border-radius: 10px; overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.table-card thead th {
  background: #fafbfc; font-size: 12px; font-weight: 600;
  color: var(--text-secondary); text-transform: none;
  border-bottom: 2px solid var(--border); padding: 11px 14px;
}
.table-card thead th:first-child { text-align: center; }
.table-card tbody td { padding: 10px 14px; vertical-align: middle; }
.table-card tbody tr { border-bottom: 1px solid var(--border-light); transition: background 0.12s; }
.table-card tbody tr:last-child { border-bottom: none; }
.table-card tbody tr:hover { background: #f8fafd; }
.table-card tbody td { cursor: pointer; }

/* checkbox 列 */
.cb-col { width: 44px; text-align: center; }
.cb-col input[type="checkbox"] { width: 15px; height: 15px; cursor: pointer; accent-color: var(--primary); }
.col-action { width: 64px; text-align: center; }

/* ═══ 表格内容样式 ═══ */
.row-thumb {
  width: 34px; height: 34px; border-radius: 6px; object-fit: cover;
  background: #f3f4f6; border: 1px solid var(--border-light);
}
.model-id-badge {
  font-weight: 700; font-size: 12px; background: var(--primary-light);
  padding: 3px 10px; border-radius: 5px; color: var(--primary-dark); white-space: nowrap;
}
.text-muted { color: var(--text-tertiary); font-size: 12px; }

.respond-badge { font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: 500; }
.respond-parent { background: #fef3c7; color: #92400e; }
.respond-self { background: #e0f2fe; color: #0369a1; }

/* ═══ 音色标签 ═══ */
.voice-tag {
  font-size: 11px; background: #f5f3ff; color: #7c3aed;
  padding: 4px 10px; border-radius: 5px; font-weight: 500;
  display: inline-flex; align-items: center; gap: 4px;
  white-space: nowrap; border: 1px solid #ede9fe;
}
.voice-tag-clickable { cursor: pointer; transition: all .15s; }
.voice-tag-clickable:hover { background: #ede9fe; color: #6d28d9; border-color: #c4b5fd; }
.voice-tag-clickable.voice-playing { background: var(--primary); color: #fff; border-color: var(--primary); }
.speed-dot { font-size: 10px; opacity: 0.65; margin-left: 1px; }

/* ═══ 状态提示 ═══ */
.voice-saved-hint { font-size: 12px; color: var(--success); display: flex; align-items: center; gap: 4px; white-space: nowrap; font-weight: 500; }
.tts-error-bar { margin: 0; padding: 9px 16px; background: #fef2f2; color: var(--danger); font-size: 12px; display: flex; align-items: center; gap: 8px; border-top: 1px solid #fecaca; }

/* ═══ 弹窗通用 ═══ */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(2px); }
.modal-container {
  background: #fff; border-radius: 12px; overflow: hidden;
  max-height: 90vh; display: flex; flex-direction: column;
  box-shadow: 0 16px 48px rgba(0,0,0,0.18);
}
.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; background: #fafbfc; border-bottom: 1px solid var(--border);
  font-weight: 600; font-size: 14px;
}
.modal-header .fa-xmark { cursor: pointer; color: var(--text-tertiary); font-size: 16px; transition: color .15s; }
.modal-header .fa-xmark:hover { color: var(--text-primary); }
.modal-footer {
  display: flex; align-items: center; justify-content: flex-end;
  padding: 14px 20px; border-top: 1px solid var(--border); gap: 10px;
  background: #fafbfc;
}
.modal-body { flex: 1; overflow-y: auto; padding: 20px 24px; }

/* ═══ 编辑器内分区 ═══ */
.editor-section { margin-bottom: 20px; }
.editor-section:last-child { margin-bottom: 0; }
.editor-section-title {
  font-size: 14px; font-weight: 600; color: var(--text-primary);
  margin-bottom: 14px; display: flex; align-items: center; gap: 8px;
  padding-bottom: 10px; border-bottom: 1px solid var(--border-light);
}
.editor-section-title i { color: var(--primary); font-size: 14px; }

/* ═══ 素材卡片网格 ═══ */
.asset-set-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.asset-preview-card {
  border: 2px solid var(--border); border-radius: 10px; overflow: hidden;
  cursor: pointer; transition: all .15s; background: #fff;
}
.asset-preview-card:hover { border-color: var(--primary); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(74,144,226,0.12); }
.asset-preview-card.active { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(74,144,226,0.18); }
.asset-preview-img {
  width: 100%; aspect-ratio: 3/4; overflow: hidden; background: #f3f4f6;
  display: flex; align-items: center; justify-content: center;
}
.asset-preview-img img, .asset-preview-img video { width: 100%; height: 100%; object-fit: cover; }
.asset-preview-label { font-size: 11px; font-weight: 600; padding: 6px 10px 0; color: var(--text-primary); }
.asset-preview-file { font-size: 10px; padding: 2px 10px 8px; color: var(--text-tertiary); font-family: monospace; word-break: break-all; }

/* ═══ TTS 配置区 ═══ */
.voice-editor-row { display: flex; gap: 10px; align-items: center; margin-bottom: 10px; }
.btn-playing { background: var(--primary) !important; color: #fff !important; border-color: var(--primary) !important; }
.editor-hint { font-size: 12px; padding: 7px 12px; border-radius: 6px; display: flex; align-items: center; gap: 7px; margin-bottom: 10px; }

/* ═══ 情绪试听 ═══ */
.state-preview-row { display: flex; align-items: center; gap: 5px; margin: 10px 0; flex-wrap: wrap; }
.state-btn {
  font-size: 11px; padding: 3px 10px; border-width: 1.5px; border-style: solid;
  background: #fff; border-radius: 14px; cursor: pointer; transition: all .15s;
  font-weight: 500; line-height: 1.5;
}
.state-btn:hover:not(:disabled) { opacity: .85; transform: translateY(-1px); }
.state-btn:disabled { opacity: .3; cursor: not-allowed; }

/* 愤怒系 — 红 */
.state-anger { border-color: #fca5a5; color: #dc2626; }
.state-anger:hover:not(:disabled) { background: #fef2f2; }
.state-anger.state-active { background: #dc2626; color: #fff; border-color: #dc2626; }

/* 恐惧系 — 紫 */
.state-fear { border-color: #c4b5fd; color: #7c3aed; }
.state-fear:hover:not(:disabled) { background: #f5f3ff; }
.state-fear.state-active { background: #7c3aed; color: #fff; border-color: #7c3aed; }

/* 悲伤系 — 蓝 */
.state-sadness { border-color: #93c5fd; color: #2563eb; }
.state-sadness:hover:not(:disabled) { background: #eff6ff; }
.state-sadness.state-active { background: #2563eb; color: #fff; border-color: #2563eb; }

/* 基础 — 绿 */
.state-base { border-color: #86efac; color: #16a34a; }
.state-base:hover:not(:disabled) { background: #f0fdf4; }
.state-base.state-active { background: #16a34a; color: #fff; border-color: #16a34a; }

/* 特殊 — 橙 */
.state-special { border-color: #fdba74; color: #ea580c; }
.state-special:hover:not(:disabled) { background: #fff7ed; }
.state-special.state-active { background: #ea580c; color: #fff; border-color: #ea580c; }

/* ═══ 倍速控制 ═══ */
.speed-row { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
.speed-label { font-size: 12px; color: var(--text-secondary); white-space: nowrap; font-weight: 500; }
.speed-slider { flex: 1; max-width: 140px; accent-color: var(--primary); height: 4px; }
.speed-adj {
  font-size: 14px; padding: 0 7px; min-width: 26px; height: 26px;
  text-align: center; border: 1px solid #DCDFE6; background: #fff;
  color: var(--text-secondary); border-radius: 6px; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
  transition: all .12s; line-height: 1; font-weight: 600;
}
.speed-adj:hover { border-color: var(--primary); color: var(--primary); background: #f0f7ff; }
.speed-value { font-size: 13px; font-weight: 700; color: var(--primary); min-width: 38px; text-align: center; }

/* ═══ 素材灯箱 ═══ */
.lightbox-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.88); z-index: 2000; display: flex; align-items: center; justify-content: center; flex-direction: column; }
.lightbox-close { position: absolute; top: 20px; right: 20px; width: 44px; height: 44px; border-radius: 50%; background: rgba(255,255,255,0.12); border: none; color: #fff; font-size: 22px; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 1; transition: background .15s; }
.lightbox-close:hover { background: rgba(255,255,255,0.25); }
.lightbox-label { color: rgba(255,255,255,0.65); font-size: 13px; margin-bottom: 14px; font-weight: 500; }
.lightbox-img { max-width: 90vw; max-height: 82vh; object-fit: contain; border-radius: 6px; }
.lightbox-video { max-width: 90vw; max-height: 82vh; border-radius: 6px; }

/* ═══ 情绪参数编辑器 ═══ */
.emotion-params-editor {
  margin-top: 8px; border: 1px solid #e5e7eb; border-radius: 8px;
  background: #fafbfc; overflow: hidden;
}
.ep-toggle-row {
  display: flex; align-items: center; gap: 8px; padding: 8px 10px;
}
.ep-grid { padding: 0 10px 10px; }
.ep-hdr {
  display: flex; align-items: center; gap: 6px; padding: 4px 0;
  font-size: 10px; color: var(--text-tertiary); font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.3px;
  border-bottom: 1px solid #e5e7eb; margin-bottom: 4px;
}
.ep-hdr-label { width: 52px; flex-shrink: 0; }
.ep-hdr-slider { width: 88px; flex-shrink: 0; text-align: center; }
.ep-hdr-instr { flex: 1; min-width: 0; }
.ep-hdr-text { width: 120px; flex-shrink: 0; }

.ep-row {
  display: flex; align-items: center; gap: 6px; padding: 3px 0;
  border-bottom: 1px solid #f3f4f6;
}
.ep-row:last-child { border-bottom: none; }

.ep-label {
  width: 52px; flex-shrink: 0; font-size: 11px; font-weight: 600;
  display: flex; align-items: center; gap: 5px;
}
.ep-label::before {
  content: ''; width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
}
.ep-dot-base::before       { background: #16a34a; }
.ep-dot-anger::before      { background: #ef4444; }
.ep-dot-fear::before       { background: #7c3aed; }
.ep-dot-sadness::before    { background: #2563eb; }
.ep-dot-special::before    { background: #ea580c; }

.ep-slider-wrap {
  width: 88px; flex-shrink: 0; display: flex; align-items: center; gap: 3px;
}
.ep-slider-wrap input[type=range] {
  flex: 1; min-width: 0; height: 3px; accent-color: var(--primary);
}
.ep-num {
  font-size: 10px; font-weight: 600; color: var(--text-secondary);
  width: 32px; text-align: right; font-variant-numeric: tabular-nums;
}

.ep-text {
  width: 120px; flex-shrink: 0; font-size: 11px; padding: 3px 5px;
  border: 1px solid #e5e7eb; border-radius: 4px; background: #fff;
  color: var(--text-primary);
}
.ep-text:focus { border-color: var(--primary); outline: none; }

.ep-instr {
  flex: 1; min-width: 0; font-size: 10px; padding: 3px 5px;
  border: 1px solid #e5e7eb; border-radius: 4px; background: #fff;
  color: var(--text-primary); resize: vertical; font-family: inherit;
  line-height: 1.35;
}
.ep-instr:focus { border-color: var(--primary); outline: none; }

.ep-grid.qwen .ep-hdr-text { width: 140px; }
.ep-grid.qwen .ep-text { width: 140px; }

/* ═══ 辅助 ═══ */
.btn-xs { font-size: 11px; padding: 3px 10px; border-radius: 5px; }

</style>
