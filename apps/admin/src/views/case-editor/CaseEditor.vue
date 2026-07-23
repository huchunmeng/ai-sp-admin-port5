<template>
  <div class="case-editor">
    <div v-if="loading" class="card" style="text-align:center;padding:60px 20px;color:var(--text-secondary)">
      <div class="spinner"></div>
      <p style="margin-top:16px">加载病例数据中...</p>
    </div>

    <template v-else>
      <div class="editor-header">
        <div class="header-left">
          <h2 class="editor-title">病例编辑器</h2>
          <span v-if="formData.case_id" class="case-id-badge">ID: {{ formData.case_id }}</span>
          <span v-if="formData.version" class="version-badge">{{ formData.version }}</span>
        </div>
        <div class="header-right">
          <button class="btn btn-outline" @click="handleGoBack">返回</button>
          <button class="btn btn-outline" @click="optimizeCurrentTab" :disabled="optimizing || generating || isCurrentCaseGenerating">
            {{ optimizing ? '优化中...' : '优化当前模块' }}
          </button>
          <button class="btn btn-primary" @click="saveDraft">保存草稿</button>
        </div>
      </div>

      <div class="common-info-card card" :class="{ collapsed: infoCollapsed }">
        <div class="common-info-grid">
          <div class="filter-item" style="grid-column:span 2">
            <label>标题</label>
            <input class="input" v-model="formData.title" placeholder="输入病例标题" style="width:100%">
          </div>
          <div class="filter-item">
            <label>教学阶段</label>
            <select class="select" v-model="formData.teaching_phase">
              <option value="">请选择</option>
              <optgroup label="院校教育">
                <option value="U1">U1 - 见习</option>
                <option value="U2">U2 - 实习</option>
              </optgroup>
              <optgroup label="住培阶段">
                <option value="R1">R1 - 住培一年级</option>
                <option value="R2">R2 - 住培二年级</option>
                <option value="R3">R3 - 住培三年级</option>
              </optgroup>
              <optgroup label="专培阶段">
                <option value="F1">F1 - 专科进阶</option>
                <option value="F2">F2 - 独立专家</option>
              </optgroup>
            </select>
          </div>
          <div class="filter-item">
            <label>{{ isSimpleLevel ? '科室' : '专业' }}</label>
            <SearchSelect :options="availableSpecialties" :modelValue="formData.specialty" @update:modelValue="onSpecialtyChange" :placeholder="isSimpleLevel ? '选择科室' : '选择专业'" />
          </div>
          <div class="filter-item" v-if="!isSimpleLevel">
            <label>亚专业</label>
            <SearchSelect :options="availableCategories" :modelValue="formData.category" @update:modelValue="onCategoryChange" placeholder="选择亚专业" />
          </div>
          <div class="filter-item" v-if="isSimpleLevel">
            <label>症状分类</label>
            <SearchSelect :options="availableSymptoms" :modelValue="formData.symptom" @update:modelValue="onSymptomChange" placeholder="选择症状分类" />
          </div>
          <div class="filter-item">
            <label>病种</label>
            <SearchSelect :options="availableDiseases" :modelValue="formData.disease" @update:modelValue="v => formData.disease = v" placeholder="选择病种" />
          </div>
          <div class="filter-item">
            <label>评分表模板</label>
            <SearchSelect :options="availableTemplates" :modelValue="formData.score_sheet_template" @update:modelValue="v => { formData.score_sheet_template = v; saveTemplateChoice(v) }" placeholder="选择评分表模板" />
          </div>
        </div>
        <div v-if="isCurrentCaseGenerating" class="modal-overlay">
          <div class="modal-card" style="width:420px">
            <div class="modal-header">
              <h3>后台正在生成中</h3>
            </div>
            <div class="modal-body" style="text-align:center;padding:24px 20px">
              <div class="spinner" style="margin:0 auto 16px"></div>
              <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-bottom:8px">
                <span v-for="s in bgGeneratingSteps" :key="s" class="gen-existing-tag">{{ stepLabelMap[s] || s }}</span>
              </div>
              <p style="color:var(--text-tertiary);font-size:12px;margin:0">
                页面刷新不会中断生成，完成后将自动加载结果
              </p>
            </div>
          </div>
        </div>
        <div class="ai-gen-row">
          <button class="btn btn-primary btn-ai-gen" @click="openGenConfig" :disabled="generating || isCurrentCaseGenerating">🤖 AI 生成</button>
          <div v-if="isMockMode" class="mock-warning">
            ⚠ 当前为离线演示模式（Mock），生成数据仅供体验。<a href="#" @click.prevent="showMockHelp = !showMockHelp">如何配置真实API？</a>
            <div v-if="showMockHelp" class="mock-help-box">
              在 <code>apps/admin/.env.local</code> 中配置：<br>
              <code>VITE_ENABLE_AI_GENERATE=true</code><br>
              <code>AI_GENERATE_API_KEY=你的密钥</code><br>
              <code>AI_GENERATE_MODEL=deepseek-v4-pro</code>
            </div>
          </div>
        </div>
      </div>
      <div ref="sentinelRef" class="collapse-sentinel"></div>

      <div class="tab-bar">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          :class="['tab-btn', { active: activeTab === tab.key }]"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="tab-content">
        <div v-show="activeTab === 'basic'" class="tab-panel" key="basic">
          <BasicInfoEditor
            :formData="formData"
            @update:formData="v => formData = v"
            :dict="dict"
            :availableSpecialties="availableSpecialties"
            :availableCategories="availableCategories"
            :availableDiseases="availableDiseases"
          />
        </div>
        <div v-show="activeTab === 'scoreSheet'" class="tab-panel" key="scoreSheet">
          <ScoreSheetEditor v-model="formData.score_sheet" :station-scores="formData.station_scores" :template-code="formData.score_sheet_template" />
        </div>
        <div v-show="activeTab === 'reception'" class="tab-panel" key="reception">
          <ReceptionEditor :formData="formData" />
        </div>
        <div v-show="activeTab === 'analysis'" class="tab-panel" key="analysis">
          <AnalysisEditor :formData="formData" />
        </div>
        <div v-show="activeTab === 'humanity'" class="tab-panel" key="humanity">
          <HumanityEditor :formData="formData" />
        </div>
        <div v-show="activeTab === 'mentalExam'" class="tab-panel" key="mentalExam">
          <MentalExamEditor v-model="formData.atypical_dialogue" />
        </div>
        <div v-show="activeTab === 'materials'" class="tab-panel" key="materials">
          <MaterialsEditor v-model="formData.examination_materials" :case-id="formData.case_id" />
        </div>
        <div v-show="activeTab === 'meta'" class="tab-panel" key="meta">
          <MetaInfoView :meta="formData.meta" @update:meta="v => formData.meta = v" />
        </div>
      </div>

      <div v-if="showGenConfig" class="modal-overlay" @click.self="showGenConfig = false">
        <div class="modal-card modal-card-gen">
          <div class="modal-header">
            <h3>AI 生成配置</h3>
            <button class="btn-icon" @click="showGenConfig = false">✕</button>
          </div>
          <div class="modal-body gen-config-body">
            <div class="gen-stepper">
              <div class="stepper-track">
                <div
                  v-for="(step, idx) in genSteps"
                  :key="step.key"
                  :class="['stepper-node', {
                    active: idx <= genStepEnd,
                    current: idx === genStepEnd,
                    done: genProgress[step.key] === 100
                  }]"
                  @click="genStepEnd = idx"
                >
                  <div class="stepper-bullet">
                    <i v-if="genProgress[step.key] === 100" class="fas fa-check"></i>
                    <span v-else>{{ idx + 1 }}</span>
                  </div>
                  <span class="stepper-label">{{ step.label }}</span>
                </div>
              </div>
            </div>
            <div class="gen-summary">
              <span class="gen-summary-prefix">生成范围</span>
              <span class="gen-summary-path">
                {{ genSteps.slice(0, genStepEnd + 1).map(s => s.label).join('  →  ') }}
              </span>
              <span class="gen-summary-count">共 {{ genStepEnd + 1 }}/{{ genSteps.length }} 个模块</span>
            </div>
            <div v-if="hasExistingData" class="gen-existing">
              <span class="gen-existing-label"><i class="fas fa-check-circle"></i> 已完成</span>
              <span v-for="l in completedStepLabels" :key="l" class="gen-existing-tag">{{ l }}</span>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" @click="showGenConfig = false">取消</button>
            <button v-if="hasExistingData" class="btn btn-outline" @click="startGeneration(false)">重新生成全部</button>
            <button class="btn btn-primary" @click="startGeneration(hasExistingData)">
              {{ hasExistingData ? '继续生成' : '开始生成' }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="optimizing" class="modal-overlay">
        <div class="modal-card" style="width:420px">
          <div class="modal-header">
            <h3>单页优化</h3>
          </div>
          <div class="modal-body" style="text-align:center;padding:32px 20px">
            <div class="spinner" style="margin:0 auto 16px"></div>
            <p style="color:var(--text-main);font-size:14px;margin:0 0 4px">
              正在优化【{{ tabs.find(t => t.key === activeTab)?.label || activeTab }}】
            </p>
            <p style="color:var(--text-tertiary);font-size:12px;margin:0">
              AI 将尽量保留您已修改的内容，修正结构和规范问题
            </p>
          </div>
        </div>
      </div>

      <div v-if="showGenProgress" class="modal-overlay">
        <div class="modal-card">
          <div class="modal-header">
            <h3>AI 生成进度</h3>
            <button class="btn btn-sm btn-outline" @click="cancelGeneration">取消</button>
          </div>
          <div class="modal-body">
            <div class="progress-list">
              <div
                v-for="(step, stepIdx) in genSteps"
                :key="step.key"
                v-show="genStepSelection[stepIdx]"
                class="progress-item"
              >
                <div class="progress-label">
                  <span>{{ step.label }}</span>
                  <span :class="['progress-status', { 'status-failed': genProgress[step.key] === -1 }]">
                    <template v-if="genProgress[step.key] === 100">✓ 完成</template>
                    <template v-else-if="genProgress[step.key] === -1">✗ 失败</template>
                    <template v-else-if="generatingSteps.has(step.key)">{{ genProgress[step.key] }}%</template>
                    <template v-else>等待中</template>
                  </span>
                </div>
                <div class="progress-bar-track">
                  <div
                    :class="['progress-bar-fill', {
                      done: genProgress[step.key] === 100,
                      failed: genProgress[step.key] === -1,
                      animating: genProgress[step.key] > 0 && genProgress[step.key] < 100
                    }]"
                    :style="{ width: genProgress[step.key] === -1 ? '100%' : (genProgress[step.key] || 0) + '%' }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer" v-if="!generating && hasIncompleteSteps">
            <span class="retry-hint">{{ completedStepCount }}/{{ selectedStepCount }} 完成</span>
            <div class="flex gap-2">
              <button class="btn btn-outline" @click="cancelGeneration">关闭</button>
              <button class="btn btn-primary" @click="startGeneration(true)">继续生成</button>
            </div>
          </div>
          <div class="modal-footer" v-else-if="!generating && !hasIncompleteSteps">
            <span style="color:var(--success);font-size:13px">全部完成</span>
            <button class="btn btn-primary" @click="finishAndPreview">查看预览</button>
          </div>
        </div>
      </div>

      <div v-if="showGenPreview" class="modal-overlay" @click.self="showGenPreview = false">
        <div class="modal-card modal-card-preview">
          <div class="modal-header">
            <h3>生成预览</h3>
            <button class="btn-icon" @click="showGenPreview = false">✕</button>
          </div>
          <div class="modal-body">
            <div class="preview-tabs">
              <button
                v-for="tab in genPreviewTabs"
                :key="tab.key"
                :class="['preview-tab-btn', { active: previewActiveTab === tab.key }]"
                @click="previewActiveTab = tab.key"
                v-show="hasPreviewData(tab.key)"
              >
                {{ tab.label }}
              </button>
            </div>
            <div class="preview-content">

              <!-- === 基础信息 === -->
              <div v-show="previewActiveTab === 'basic' && previewData.basic" class="pv-layout">
                <template v-if="Object.keys(previewData.basic).length">
                  <div class="pv-card">
                    <div class="pv-card-title">患者信息</div>
                    <div class="pv-grid">
                      <div class="pv-item"><span class="pv-label">姓名</span><span class="pv-value">{{ previewData.basic.patient_info?.name }}</span></div>
                      <div class="pv-item"><span class="pv-label">性别</span><span class="pv-value">{{ genderLabel(previewData.basic.patient_info?.sex) }}</span></div>
                      <div class="pv-item"><span class="pv-label">年龄</span><span class="pv-value">{{ previewData.basic.patient_info?.age }}</span></div>
                      <div class="pv-item"><span class="pv-label">职业</span><span class="pv-value">{{ previewData.basic.patient_info?.occupation }}</span></div>
                      <div class="pv-item"><span class="pv-label">学历</span><span class="pv-value">{{ previewData.basic.patient_info?.education }}</span></div>
                      <div class="pv-item"><span class="pv-label">婚姻</span><span class="pv-value">{{ previewData.basic.patient_info?.marital }}</span></div>
                      <div class="pv-item"><span class="pv-label">孕期</span><span class="pv-value">{{ previewData.basic.patient_info?.pregnancy || '未怀孕' }}</span></div>
                      <div class="pv-item pv-full"><span class="pv-label">地址</span><span class="pv-value">{{ previewData.basic.patient_info?.address }}</span></div>
                    </div>
                  </div>


                  <div class="pv-card" v-if="previewData.basic.title || previewData.basic.specialty || previewData.basic.disease">
                    <div class="pv-card-title">病例概要</div>
                    <div class="pv-grid">
                      <div class="pv-item"><span class="pv-label">标题</span><span class="pv-value">{{ previewData.basic.title }}</span></div>
                      <div class="pv-item"><span class="pv-label">专业</span><span class="pv-value">{{ previewData.basic.specialty }}</span></div>
                      <div class="pv-item"><span class="pv-label">分类</span><span class="pv-value">{{ previewData.basic.category }}</span></div>
                      <div class="pv-item"><span class="pv-label">病种</span><span class="pv-value">{{ previewData.basic.disease }}</span></div>
                      <div class="pv-item"><span class="pv-label">难度</span><span class="pv-value">{{ previewData.basic.difficulty ? getDifficultyLabel(previewData.basic.difficulty) + ' · ' + getCaseLevelLabel(previewData.basic.difficulty) : '—' }}</span></div>
                      <div class="pv-item"><span class="pv-label">阶段</span><span class="pv-value">{{ previewData.basic.training_phase }}</span></div>
                    </div>
                  </div>

                  <div class="pv-card" v-if="previewData.basic.symptoms?.length">
                    <div class="pv-card-title">症状</div>
                    <div class="pv-tags">
                      <span v-for="s in previewData.basic.symptoms" :key="s" class="pv-tag">{{ s }}</span>
                    </div>
                  </div>

                  <div class="pv-card" v-if="previewData.basic.chief_complaint">
                    <div class="pv-card-title">主诉</div>
                    <div class="pv-text">{{ previewData.basic.chief_complaint }}</div>
                  </div>

                  <div class="pv-card" v-if="previewData.basic.present_illness">
                    <div class="pv-card-title">现病史</div>
                    <div class="pv-text">{{ previewData.basic.present_illness }}</div>
                  </div>

                  <div class="pv-card" v-if="previewData.basic.past_history">
                    <div class="pv-card-title">既往史</div>
                    <div class="pv-text">{{ previewData.basic.past_history }}</div>
                  </div>

                  <div class="pv-card" v-if="previewData.basic.physical_exam">
                    <div class="pv-card-title">体格检查</div>
                    <div class="pv-text" v-if="previewData.basic.physical_exam.vital_signs"><strong>生命体征：</strong>{{ previewData.basic.physical_exam.vital_signs }}</div>
                    <div class="pv-text" v-if="previewData.basic.physical_exam.general"><strong>一般情况：</strong>{{ previewData.basic.physical_exam.general }}</div>
                    <div class="pv-text" v-if="previewData.basic.physical_exam.systemic"><strong>系统检查：</strong>{{ previewData.basic.physical_exam.systemic }}</div>
                  </div>

                  <div class="pv-card" v-if="previewData.basic.diagnosis">
                    <div class="pv-card-title">诊断</div>
                    <div class="pv-text"><strong>初步诊断：</strong>{{ previewData.basic.diagnosis.preliminary }}</div>
                    <div class="pv-text" v-if="previewData.basic.diagnosis.differential?.length"><strong>鉴别诊断：</strong>{{ previewData.basic.diagnosis.differential.join('、') }}</div>
                    <div class="pv-text" v-if="previewData.basic.diagnosis.basis?.length"><strong>诊断依据：</strong></div>
                    <ul class="pv-list" v-if="previewData.basic.diagnosis.basis?.length">
                      <li v-for="(b, i) in previewData.basic.diagnosis.basis" :key="i">{{ typeof b === 'string' ? b : b.point || b }}</li>
                    </ul>
                  </div>

                  <div class="pv-card" v-if="previewData.basic.treatment_plan">
                    <div class="pv-card-title">治疗计划</div>
                    <div class="pv-text">{{ previewData.basic.treatment_plan }}</div>
                  </div>

                  <div class="pv-card" v-if="previewData.basic.teaching_points?.length">
                    <div class="pv-card-title">教学要点</div>
                    <ul class="pv-list">
                      <li v-for="(tp, i) in previewData.basic.teaching_points" :key="i">{{ tp }}</li>
                    </ul>
                  </div>

                  <details class="pv-raw-toggle" v-if="Object.keys(previewData.basic).length">
                    <summary>查看原始 JSON</summary>
                    <pre class="preview-json">{{ JSON.stringify(previewData.basic, null, 2) }}</pre>
                  </details>
                </template>
              </div>

              <!-- === v1.0 评分 === -->
              <div v-show="previewActiveTab === 'scoreSheet' && previewData.scoreSheet" class="pv-layout">
                <template v-if="processedScoreSheet.length">
                  <div class="pv-card">
                    <div class="pv-card-title">评分表（{{ processedScoreSheet.length }} 项）</div>
                    <div class="pv-table-wrap">
                      <table class="pv-table">
                        <thead>
                          <tr><th>#</th><th>类别</th><th>评分项</th><th>评分项分值（{{ scoreSheetTotalGroup }}）</th><th>评分要点</th><th>要点分值（{{ scoreSheetTotalScore }}）</th><th>评分规则</th></tr>
                        </thead>
                        <tbody>
                          <tr v-for="item in processedScoreSheet" :key="item.id">
                            <td class="pv-td-num">{{ item.id }}</td>
                            <td v-if="item._catRowspan > 0" :rowspan="item._catRowspan" class="pv-td-cat">{{ item.category }}</td>
                            <td v-if="item._itemRowspan > 0" :rowspan="item._itemRowspan" class="pv-td-item">{{ item.item }}</td>
                            <td class="pv-td-num">{{ item.score }}</td>
                            <td>{{ item.key_point }}</td>
                            <td class="pv-td-num">{{ item.score }}</td>
                            <td class="pv-td-sm">{{ item.rules }}</td>
                          </tr>
                        </tbody>
                        <tfoot>
                          <tr style="background:#f0f4ff;font-weight:600;">
                            <td class="pv-td-num" colspan="3" style="text-align:right;font-size:12px;">合计</td>
                            <td class="pv-td-num">{{ scoreSheetTotalGroup }}</td>
                            <td></td>
                            <td class="pv-td-num">{{ scoreSheetTotalScore }}</td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </template>
                <div v-else class="preview-empty">暂无数据</div>
              </div>

              <!-- === 接诊病人 === -->
              <div v-show="previewActiveTab === 'reception' && previewData.reception" class="pv-layout">
                <template v-if="Object.keys(previewData.reception).length">
                  <!-- SP角色 -->
                  <div class="pv-card" v-if="previewData.reception.sp_materials?.role_info">
                    <div class="pv-card-title">SP 角色信息</div>
                    <div class="pv-grid">
                      <div class="pv-item"><span class="pv-label">姓名</span><span class="pv-value">{{ previewData.reception.sp_materials.role_info.name }}</span></div>
                      <div class="pv-item"><span class="pv-label">性别</span><span class="pv-value">{{ previewData.reception.sp_materials.role_info.gender }}</span></div>
                      <div class="pv-item"><span class="pv-label">年龄</span><span class="pv-value">{{ previewData.reception.sp_materials.role_info.age }}</span></div>
                      <div class="pv-item" v-if="previewData.reception.sp_materials.role_info.relation"><span class="pv-label">患者关系</span><span class="pv-value">{{ previewData.reception.sp_materials.role_info.relation }}</span></div>
                      <div class="pv-item"><span class="pv-label">沟通对象</span><span class="pv-value">{{ previewData.reception.sp_materials.role === 'family' ? '家属' : previewData.reception.sp_materials.role === 'patient' ? '患者本人' : (previewData.reception.sp_materials.role || previewData.reception.communication_target) }}</span></div>
                      <div class="pv-item pv-full"><span class="pv-label">情绪基调</span><span class="pv-value">{{ previewData.reception.sp_materials.role_info.emotion }}</span></div>
                    </div>
                  </div>

                  <!-- SP自述 -->
                  <div class="pv-card" v-if="previewData.reception.sp_materials?.self_narration">
                    <div class="pv-card-title">{{ previewData.reception.sp_materials.role === 'family' ? '家属叙述（生活化口语）' : '患者自述（生活化口语）' }}</div>
                    <div class="pv-quote">{{ previewData.reception.sp_materials.self_narration }}</div>
                  </div>

                  <!-- 问诊对话 -->
                  <div class="pv-card" v-if="previewData.reception.sp_materials?.qa_script?.length">
                    <div class="pv-card-title">问诊对话参考（{{ previewData.reception.sp_materials.qa_script.length }} 组）</div>
                    <div class="pv-dialog">
                      <div v-for="(qa, i) in previewData.reception.sp_materials.qa_script" :key="i" class="pv-dialog-group">
                        <div class="pv-dialog-doctor"><span class="pv-dialog-role">医生</span>{{ qa.doctor || qa.examiner || qa.question }}</div>
                        <div class="pv-dialog-patient"><span class="pv-dialog-role">SP</span>{{ qa.patient || qa.sp || qa.answer }}</div>
                        <div v-if="qa.note" class="pv-dialog-note">{{ qa.note }}</div>
                      </div>
                    </div>
                  </div>

                  <!-- 临床摘要 -->
                  <div class="pv-card" v-if="previewData.reception.examiner_materials?.summary">
                    <div class="pv-card-title">临床摘要</div>
                    <div class="pv-text">{{ previewData.reception.examiner_materials.summary }}</div>
                  </div>

                  <!-- 诊断答案 -->
                  <div class="pv-card" v-if="previewData.reception.examiner_materials?.diagnosis_answer">
                    <div class="pv-card-title">诊断答案</div>
                    <div class="pv-text"><strong>初步诊断：</strong>{{ previewData.reception.examiner_materials.diagnosis_answer.primary }}</div>
                    <div class="pv-text" v-if="previewData.reception.examiner_materials.diagnosis_answer.differential?.length">
                      <strong>鉴别诊断：</strong>{{ previewData.reception.examiner_materials.diagnosis_answer.differential.join('、') }}
                    </div>
                  </div>

                  <details class="pv-raw-toggle" v-if="Object.keys(previewData.reception).length">
                    <summary>查看原始 JSON</summary>
                    <pre class="preview-json">{{ JSON.stringify(previewData.reception, null, 2) }}</pre>
                  </details>
                </template>
              </div>

              <!-- === 病例分析 === -->
              <div v-show="previewActiveTab === 'analysis' && previewData.analysis" class="pv-layout">
                <template v-if="Object.keys(previewData.analysis).length">
                  <!-- 考官版概要卡片 -->
                  <div class="pv-card" v-if="previewData.analysis.examiner_version">
                    <div class="pv-card-title">考官概要</div>
                    <div class="pv-text">{{ previewData.analysis.examiner_version.case_summary_for_examiner }}</div>
                    <div v-if="previewData.analysis.examiner_version.key_teaching_points?.length" class="pv-tags" style="margin-top:8px">
                      <span v-for="(tp, i) in previewData.analysis.examiner_version.key_teaching_points" :key="i" class="pv-tag pv-tag-outline">{{ tp }}</span>
                    </div>
                  </div>

                  <!-- 每个步骤一张独立卡片 -->
                  <div v-for="step in previewData.analysis.examiner_version.steps" :key="step.step" class="pv-card">
                    <div class="pv-card-title">第 {{ step.step }} 步</div>
                    <div class="pv-step-info"><strong>呈现信息：</strong>{{ step.presented_info }}</div>

                    <!-- 新版 questions[] 数组格式：每个题目独立 Q-A-Scoring 三元组 -->
                    <template v-if="step.questions?.length">
                      <div v-for="(q, qi) in step.questions" :key="qi" class="pv-step">
                        <div class="pv-step-header">{{ step.questions.length > 1 ? '题目 ' + (qi + 1) : '题目' }}</div>
                        <div class="pv-step-body">
                          <div class="pv-step-q"><strong>问题：</strong>{{ q.text || q }}</div>
                          <div class="pv-step-a" v-if="q.reference_answer">
                            <strong>参考答案：</strong>
                            <div v-if="q.reference_answer.main_points?.length">
                              <ul class="pv-list">
                                <li v-for="(mp, i) in q.reference_answer.main_points" :key="i">{{ mp }}</li>
                              </ul>
                            </div>
                            <div v-else-if="q.reference_answer.detailed_answer" class="pv-text">{{ q.reference_answer.detailed_answer }}</div>
                            <div v-else-if="typeof q.reference_answer === 'string'" class="pv-text">{{ q.reference_answer }}</div>
                          </div>
                          <div class="pv-step-score" v-if="q.scoring_guide">
                            <template v-if="q.scoring_guide.total_score !== undefined && q.scoring_guide.criteria?.length">
                              <strong>评分（{{ q.scoring_guide.total_score }}分）：</strong>
                              <span v-for="(c, i) in q.scoring_guide.criteria" :key="i" class="pv-criteria">{{ c.item }}({{ c.score }}分){{ i < q.scoring_guide.criteria.length - 1 ? ' | ' : '' }}</span>
                            </template>
                            <template v-else-if="typeof q.scoring_guide === 'string'">
                              <strong>评分：</strong><span class="pv-criteria">{{ q.scoring_guide }}</span>
                            </template>
                          </div>
                        </div>
                      </div>
                    </template>

                    <!-- 旧版单题目格式兼容 -->
                    <template v-else>
                      <div class="pv-step">
                        <div class="pv-step-body">
                          <div class="pv-step-q" v-if="step.question"><strong>问题：</strong>{{ step.question.text || step.question }}</div>
                          <div class="pv-step-a" v-if="step.reference_answer">
                            <strong>参考答案：</strong>
                            <div v-if="step.reference_answer.main_points?.length">
                              <ul class="pv-list">
                                <li v-for="(mp, i) in step.reference_answer.main_points" :key="i">{{ mp }}</li>
                              </ul>
                            </div>
                            <div v-else-if="step.reference_answer.detailed_answer" class="pv-text">{{ step.reference_answer.detailed_answer }}</div>
                            <div v-else-if="typeof step.reference_answer === 'string'" class="pv-text">{{ step.reference_answer }}</div>
                          </div>
                          <div class="pv-step-score" v-if="step.scoring_guide">
                            <template v-if="step.scoring_guide.total_score !== undefined && step.scoring_guide.criteria?.length">
                              <strong>评分（{{ step.scoring_guide.total_score }}分）：</strong>
                              <span v-for="(c, i) in step.scoring_guide.criteria" :key="i" class="pv-criteria">{{ c.item }}({{ c.score }}分){{ i < step.scoring_guide.criteria.length - 1 ? ' | ' : '' }}</span>
                            </template>
                            <template v-else-if="typeof step.scoring_guide === 'string'">
                              <strong>评分：</strong><span class="pv-criteria">{{ step.scoring_guide }}</span>
                            </template>
                          </div>
                        </div>
                      </div>
                    </template>
                  </div>

                  <details class="pv-raw-toggle" v-if="Object.keys(previewData.analysis).length">
                    <summary>查看原始 JSON</summary>
                    <pre class="preview-json">{{ JSON.stringify(previewData.analysis, null, 2) }}</pre>
                  </details>
                </template>
              </div>

              <!-- === 人文沟通 === -->
              <div v-show="previewActiveTab === 'humanity' && previewData.humanity" class="pv-layout">
                <template v-if="previewData.humanity.scenarios?.length">
                  <div v-for="(sc, si) in previewData.humanity.scenarios" :key="si" class="pv-card">
                    <div class="pv-card-title">
                      {{ sc.scenario_name || '场景 ' + (si + 1) }}
                      <span class="pv-badge" :class="'pv-badge-' + sc.priority">{{ sc.priority }}</span>
                      <span class="pv-badge pv-badge-layer">{{ sc.layer }}</span>
                    </div>
                    <div class="pv-text pv-text-sm" v-if="sc.selection_reason">{{ sc.selection_reason }}</div>

                    <!-- 场景基本信息 -->
                    <div class="pv-grid" v-if="sc.communication_target">
                      <div class="pv-item"><span class="pv-label">沟通对象</span><span class="pv-value">{{ sc.communication_target }}</span></div>
                      <div class="pv-item" v-if="sc.candidate_materials?.time_limit"><span class="pv-label">时间限制</span><span class="pv-value">{{ sc.candidate_materials.time_limit }} 分钟</span></div>
                    </div>

                    <!-- SP 角色 + 心理阶段 -->
                    <div v-if="sc.sp_materials">
                      <div class="pv-subtitle">SP 角色</div>
                      <div class="pv-text">{{ sc.sp_materials.role_description }}</div>
                      <div v-if="sc.sp_materials.opening_line" class="pv-quote" style="margin-top:8px"><strong>开场：</strong>{{ sc.sp_materials.opening_line }}</div>
                      <div v-if="sc.sp_materials.psychological_stages?.length" style="margin-top:10px">
                        <div class="pv-subtitle">心理递进</div>
                        <div class="pv-stages">
                          <div v-for="ps in sc.sp_materials.psychological_stages" :key="ps.stage" class="pv-stage-item">
                            <span class="pv-stage-num">{{ ps.stage }}</span>
                            <span class="pv-stage-emotion">{{ ps.emotion }}</span>
                            <span class="pv-stage-cog">{{ ps.cognition }}</span>
                            <span v-if="ps.trigger" class="pv-stage-trigger">触发：{{ ps.trigger }}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- 对话参考 -->
                    <div v-if="sc.sp_materials?.script?.length" style="margin-top:10px">
                      <div class="pv-subtitle">对话参考（{{ sc.sp_materials.script.length }} 轮）</div>
                      <div class="pv-dialog">
                        <div v-for="(line, li) in sc.sp_materials.script" :key="li" class="pv-dialog-group">
                          <div :class="['pv-dialog-sp', { 'pv-dialog-sp-family': (line.speaker || 'patient') === 'family' }]">
                            <span class="pv-dialog-role">{{ line.speaker === 'family' ? '家属' : 'SP' }}</span>
                            <span v-if="line.emotion" class="pv-dialog-emotion">{{ line.emotion }}</span>
                            {{ line.line }}
                          </div>
                          <div v-if="line.note" class="pv-dialog-note">{{ line.note }}</div>
                        </div>
                      </div>
                    </div>

                    <!-- 考生材料 -->
                    <div v-if="sc.candidate_materials" style="margin-top:10px">
                      <div class="pv-subtitle">考生材料</div>
                      <div class="pv-text"><strong>任务：</strong>{{ sc.candidate_materials.task }}</div>
                      <div v-if="sc.candidate_materials.reference_data?.length" style="margin-top:6px">
                        <div class="pv-text"><strong>参考资料：</strong></div>
                        <div v-for="(rd, rdi) in sc.candidate_materials.reference_data" :key="rdi" class="pv-ref-item">
                          <span class="pv-ref-label">{{ rd.label }}</span>：{{ rd.value }}<span v-if="rd.note" class="pv-ref-note">（{{ rd.note }}）</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <details class="pv-raw-toggle" v-if="previewData.humanity.scenarios?.length">
                    <summary>查看原始 JSON</summary>
                    <pre class="preview-json">{{ JSON.stringify(previewData.humanity, null, 2) }}</pre>
                  </details>
                </template>
                <div v-else class="preview-empty">暂无数据</div>
              </div>

              <!-- === 精神检查 === -->
              <div v-show="previewActiveTab === 'mentalExam' && previewData.mentalExam" class="pv-layout">
                <template v-if="Object.keys(previewData.mentalExam).length">
                  <div class="pv-card">
                    <div class="pv-card-title">疾病类型</div>
                    <div class="pv-text">{{ previewData.mentalExam.disease_type || '—' }}</div>
                  </div>
                  <div class="pv-card" v-if="previewData.mentalExam.mental_status">
                    <div class="pv-card-title">精神状态检查 (MSE)</div>
                    <div class="pv-grid">
                      <div v-for="(desc, dim) in previewData.mentalExam.mental_status" :key="dim" class="pv-item">
                        <span class="pv-label">{{ dim }}</span>
                        <span class="pv-value">{{ desc || '—' }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="pv-card" v-if="previewData.mentalExam.behavior_params">
                    <div class="pv-card-title">B类行为参数</div>
                    <div class="pv-grid">
                      <div class="pv-item"><span class="pv-label">离题倾向</span><span class="pv-value">{{ (previewData.mentalExam.behavior_params.tangentiality * 100).toFixed(0) }}%</span></div>
                      <div class="pv-item"><span class="pv-label">语量系数</span><span class="pv-value">{{ previewData.mentalExam.behavior_params.verbosity }}×</span></div>
                      <div class="pv-item"><span class="pv-label">情感平淡</span><span class="pv-value">{{ (previewData.mentalExam.behavior_params.affective_blunting * 100).toFixed(0) }}%</span></div>
                      <div class="pv-item"><span class="pv-label">易激惹性</span><span class="pv-value">{{ (previewData.mentalExam.behavior_params.irritability * 100).toFixed(0) }}%</span></div>
                      <div class="pv-item"><span class="pv-label">幻觉干扰度</span><span class="pv-value">{{ (previewData.mentalExam.behavior_params.hallucination_interference * 100).toFixed(0) }}%</span></div>
                      <div class="pv-item"><span class="pv-label">自知力水平</span><span class="pv-value">{{ previewData.mentalExam.behavior_params.insight_level }}</span></div>
                    </div>
                  </div>
                  <div class="pv-card" v-if="previewData.mentalExam.delusional_system?.core_belief">
                    <div class="pv-card-title">妄想系统</div>
                    <div class="pv-text"><strong>核心信念：</strong>{{ previewData.mentalExam.delusional_system.core_belief }}</div>
                    <div class="pv-tags" v-if="previewData.mentalExam.delusional_system.triggers?.length">
                      <span v-for="t in previewData.mentalExam.delusional_system.triggers" :key="t" class="pv-tag">{{ t }}</span>
                    </div>
                  </div>
                  <div class="pv-card" v-if="previewData.mentalExam.hallucination_profile?.type !== '无'">
                    <div class="pv-card-title">幻觉特征</div>
                    <div class="pv-grid">
                      <div class="pv-item"><span class="pv-label">类型</span><span class="pv-value">{{ previewData.mentalExam.hallucination_profile.type }}</span></div>
                      <div class="pv-item"><span class="pv-label">频率</span><span class="pv-value">{{ previewData.mentalExam.hallucination_profile.frequency || '—' }}</span></div>
                    </div>
                  </div>
                  <details class="pv-raw-toggle">
                    <summary>查看原始 JSON</summary>
                    <pre class="preview-json">{{ JSON.stringify(previewData.mentalExam, null, 2) }}</pre>
                  </details>
                </template>
                <div v-else class="preview-empty">暂无数据</div>
              </div>

              <!-- === 元信息 === -->
              <div v-show="previewActiveTab === 'meta' && previewData.meta" class="pv-layout">
                <template v-if="Object.keys(previewData.meta).length">
                  <div class="pv-card" v-if="previewData.meta.personality">
                    <div class="pv-card-title">患者性格特征</div>
                    <div class="pv-grid">
                      <div class="pv-item"><span class="pv-label">情绪外显</span><span class="pv-value">{{ previewData.meta.personality.expressiveness || '普通型' }}</span></div>
                      <div class="pv-item"><span class="pv-label">敏感度</span><span class="pv-value">{{ previewData.meta.personality.sensitivity || '普通敏感度' }}</span></div>
                      <div class="pv-item"><span class="pv-label">恢复力</span><span class="pv-value">{{ previewData.meta.personality.resilience || '普通恢复力' }}</span></div>
                    </div>
                  </div>
                  <div class="pv-card" v-if="previewData.meta.pre_generation">
                    <div class="pv-card-title">生成参数</div>
                    <div class="pv-grid">
                      <div class="pv-item"><span class="pv-label">专业</span><span class="pv-value">{{ previewData.meta.pre_generation.specialty }}</span></div>
                      <div class="pv-item"><span class="pv-label">病种</span><span class="pv-value">{{ previewData.meta.pre_generation.disease }}</span></div>
                      <div class="pv-item"><span class="pv-label">难度</span><span class="pv-value">{{ previewData.meta.pre_generation.difficulty ? getDifficultyLabel(previewData.meta.pre_generation.difficulty) + ' · ' + getCaseLevelLabel(previewData.meta.pre_generation.difficulty) : '—' }}</span></div>
                      <div class="pv-item"><span class="pv-label">阶段</span><span class="pv-value">{{ previewData.meta.pre_generation.training_phase }}</span></div>
                      <div class="pv-item"><span class="pv-label">输入模式</span><span class="pv-value">{{ previewData.meta.pre_generation.input_mode || '参数生成' }}</span></div>
                      <div class="pv-item"><span class="pv-label">病例ID</span><span class="pv-value">{{ previewData.meta.case_id || '—' }}</span></div>
                    </div>
                  </div>
                  <div class="pv-card" v-if="previewData.meta.generation_trace">
                    <div class="pv-card-title">生成溯源</div>
                    <div class="pv-grid">
                      <div v-for="(trace, key) in previewData.meta.generation_trace" :key="key" class="pv-item">
                        <span class="pv-label">{{ key }}</span>
                        <span class="pv-value">{{ trace.model || '—' }} / {{ trace.prompt_version || '—' }}</span>
                      </div>
                    </div>
                  </div>
                  <details class="pv-raw-toggle">
                    <summary>查看原始 JSON</summary>
                    <pre class="preview-json">{{ JSON.stringify(previewData.meta, null, 2) }}</pre>
                  </details>
                </template>
                <div v-else class="preview-empty">暂无数据</div>
              </div>

            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" @click="showGenPreview = false">取消</button>
            <button class="btn btn-primary" @click="acceptGenerated">确认采用</button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { toast, confirm, isStaticProduction, getDifficultyLabel, getCaseLevelLabel } from '@ai-sp/shared'
import { dict, createEmptyFormData, loadCaseDataFromFiles, getDiseaseNames, getSpecialtySymptomList, getSymptomDiseaseNames, getUndergradSymptoms, getUndergradDiseases, formatScoringGuide, splitMergedText, sanitizeAddress } from './shared.js'
import BasicInfoEditor from './BasicInfo.vue'
import ReceptionEditor from './Reception.vue'
import AnalysisEditor from './Analysis.vue'
import HumanityEditor from './Humanity.vue'
import ScoreSheetEditor from './ScoreSheet.vue'
import { buildMetaInfo } from './score-sheet-generator.js'
import MetaInfoView from './MetaInfo.vue'
import MaterialsEditor from './MaterialsEditor.vue'
import MentalExamEditor from './MentalExamEditor.vue'
import SearchSelect from '@/components/SearchSelect.vue'
import { SCORE_SHEET_TEMPLATES } from '@/data/templates/index.js'

const props = defineProps({
  caseId: { type: String, default: null }
})

let isLoadingData = false

const loading = ref(true)
const formData = ref(createEmptyFormData())
const infoCollapsed = ref(false)
const sentinelRef = ref(null)
let observer = null

const isPsych = computed(() => formData.value.specialty === '精神科')

const tabs = computed(() => {
  const base = [
    { key: 'basic', label: '基础信息' },
    { key: 'scoreSheet', label: 'v1.0 评分' },
    { key: 'reception', label: '接诊病人' },
    { key: 'analysis', label: '病例分析' },
    { key: 'humanity', label: '人文沟通' },
  ]
  if (isPsych.value) base.push({ key: 'mentalExam', label: '精神检查' })
  base.push({ key: 'materials', label: '检查素材' }, { key: 'meta', label: '元信息' })
  return base
})
const activeTab = ref('basic')

const isSimpleLevel = computed(() => ['U1', 'U2'].includes(formData.value.teaching_phase))

const availableSpecialties = computed(() => {
  if (isSimpleLevel.value) return dict.undergrad_specialties
  return dict.specialties
})

const availableCategories = computed(() => {
  if (isSimpleLevel.value || !formData.value.specialty) return []
  return dict.categoriesMap[formData.value.specialty] || []
})

const availableSymptoms = computed(() => {
  if (!isSimpleLevel.value || !formData.value.specialty) return []
  return getUndergradSymptoms(formData.value.specialty)
})

const availableDiseases = computed(() => {
  if (isSimpleLevel.value && formData.value.specialty && formData.value.symptom) {
    return getUndergradDiseases(formData.value.specialty, formData.value.symptom)
  }
  if (isSimpleLevel.value) return []
  if (!formData.value.category) return []
  return getDiseaseNames(formData.value.category, formData.value.teaching_phase)
})

const availableTemplates = computed(() => {
  return SCORE_SHEET_TEMPLATES.map(t => ({
    value: t.code,
    label: `${t.code} — ${t.name}`
  }))
})

function onSpecialtyChange(val) {
  formData.value.specialty = val
  formData.value.category = ''
  formData.value.symptom = ''
  formData.value.disease = ''
}

function onCategoryChange(val) {
  formData.value.category = val
  formData.value.disease = ''
}

function onSymptomChange(val) {
  formData.value.symptom = val
  formData.value.disease = ''
}

watch(() => props.caseId, (newVal) => {
  loadData(newVal)
}, { immediate: true })

watch(() => formData.value.teaching_phase, () => {
  if (isLoadingData) return
  formData.value.specialty = ''
  formData.value.category = ''
  formData.value.symptom = ''
  formData.value.disease = ''
}, { flush: 'sync' })

watch(isPsych, (val) => {
  if (!val && activeTab.value === 'mentalExam') activeTab.value = 'basic'
})

// 用户选择的元数据字段变更时自动持久化到 basic.json
let autoSaveTimer = null
function persistMeta(extraFields = {}) {
  if (isStaticProduction()) return Promise.resolve()
  const caseId = formData.value.case_id
  if (!caseId) return Promise.resolve()
  const meta = {
    specialty: formData.value.specialty,
    category: formData.value.category,
    disease: formData.value.disease,
    symptom: formData.value.symptom,
    score_sheet_template: formData.value.score_sheet_template,
    title: formData.value.title,
    teaching_phase: formData.value.teaching_phase,
    communication_target: formData.value.communication_target,
    ...extraFields
  }
  return fetch('/api/case/save-fields', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ caseId, fields: meta })
  }).catch(() => {})
}

function autoSaveMeta() {
  if (isLoadingData || loading.value) return
  const caseId = formData.value.case_id
  if (!caseId) return
  clearTimeout(autoSaveTimer)
  autoSaveTimer = setTimeout(() => persistMeta(), 500)
}
watch(() => [formData.value.specialty, formData.value.category, formData.value.disease, formData.value.symptom, formData.value.score_sheet_template, formData.value.title, formData.value.teaching_phase], autoSaveMeta, { deep: false })

const bgGenerating = ref(false)
const bgCaseId = ref(null)
const bgGeneratingSteps = ref([])
let bgPollTimer = null

const stepLabelMap = {
  basic: '基础信息', scoreSheet: '评分表', reception: '接诊病人',
  analysis: '病例分析', humanity: '人文沟通', mentalExam: '精神检查', meta: '元信息'
}

// 当前案例是否正在后台生成
const isCurrentCaseGenerating = computed(() =>
  bgGenerating.value && bgCaseId.value === props.caseId
)

async function checkGenerationStatus() {
  if (isStaticProduction()) return
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const res = await fetch('/api/ai-generate/status', { signal: controller.signal })
    clearTimeout(timeout)
    if (res.ok) {
      const status = await res.json()
      bgGenerating.value = status.active
      bgCaseId.value = status.caseId || null
      bgGeneratingSteps.value = status.steps || []

      if (status.active && status.caseId === props.caseId) {
        toast.show(`后台正在生成: ${(status.steps || []).map(s => stepLabelMap[s] || s).join(', ')}...`, 'info')
        startBgPolling()
      } else if (!status.active) {
        stopBgPolling()
      }
    }
  } catch (e) { /* 网络不可达时静默跳过状态检查 */ }
}

function startBgPolling() {
  stopBgPolling()
  const poll = async () => {
    if (!bgPollTimer) return
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)
      const res = await fetch('/api/ai-generate/status', { signal: controller.signal })
      clearTimeout(timeout)
      if (res.ok) {
        const status = await res.json()
        if (!status.active || status.caseId !== props.caseId) {
          bgGenerating.value = false
          bgGeneratingSteps.value = []
          stopBgPolling()
          if (!status.active && status.caseId === props.caseId) {
            toast.show('后台生成已完成，正在刷新数据...', 'success')
            await loadData(props.caseId)
          }
          return
        }
        bgGeneratingSteps.value = status.steps || []
        bgCaseId.value = status.caseId || null
      }
    } catch (e) { /* 网络异常或超时，静默继续轮询 */ }
    if (bgPollTimer) bgPollTimer = setTimeout(poll, 3000)
  }
  bgPollTimer = setTimeout(poll, 3000)
}

function stopBgPolling() {
  if (bgPollTimer) { clearTimeout(bgPollTimer); bgPollTimer = null }
}

async function loadData(id) {
  if (isLoadingData) return
  loading.value = true
  isLoadingData = true
  let timeoutId
  try {
    const result = await Promise.race([
      (async () => {
        const r = await loadCaseDataFromFiles(id)
        detectExistingModules(r.raw)
        return r
      })(),
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('加载超时，请检查网络后刷新重试')), 15000)
      })
    ])
    formData.value = result.formData
    if (result.raw?.metaData) {
      formData.value.meta = result.raw.metaData
    }
  } catch (e) {
    toast.show('加载病例数据失败: ' + e.message, 'error')
  } finally {
    clearTimeout(timeoutId)
    loading.value = false
    isLoadingData = false
  }
  checkGenerationStatus().catch(() => {})
}

function detectExistingModules(raw) {
  // Reset progress
  for (const key in genProgress) genProgress[key] = 0
  previewData.value = { basic: {}, scoreSheet: {}, reception: {}, analysis: {}, humanity: {}, mentalExam: {}, meta: null }

  if (!raw) return
  const basicRaw = raw?.basicData || null
  const receptionRaw = raw?.receptionData || null
  const analysisRaw = raw?.analysisData || null
  const humanityRaw = raw?.humanityData || null
  const mentalExamRaw = raw?.mentalExamData || null
  const metaRaw = raw?.metaData || null

  if (basicRaw) {
    genProgress.basic = 100; if (basicRaw?.patient_info?.address) basicRaw.patient_info.address = sanitizeAddress(basicRaw.patient_info.address); previewData.value.basic = basicRaw
  }
  // 评分表数据来源：basic 内联 或 独立文件
  const ssData = raw?.scoreSheetData
  const ssArray = (basicRaw?.score_sheet && basicRaw.score_sheet.length > 0) ? basicRaw.score_sheet
    : (ssData && Array.isArray(ssData)) ? ssData
    : (ssData?.score_sheet && Array.isArray(ssData.score_sheet)) ? ssData.score_sheet
    : null
  if (ssArray) {
    genProgress.scoreSheet = 100
    previewData.value.scoreSheet = ssArray
  }
  if (receptionRaw) { genProgress.reception = 100; previewData.value.reception = receptionRaw }
  if (analysisRaw) { genProgress.analysis = 100; previewData.value.analysis = normalizeAnalysisForPreview(analysisRaw) }
  if (humanityRaw) { genProgress.humanity = 100; previewData.value.humanity = humanityRaw }
  if (mentalExamRaw) { genProgress.mentalExam = 100; previewData.value.mentalExam = mentalExamRaw }
  if (metaRaw) { genProgress.meta = 100; previewData.value.meta = metaRaw }
}

function handleGoBack() {
  toast.show('已返回上一页')
}

function openGenConfig() {
  if (!formData.value.teaching_phase) { toast.show('请先选择教学阶段', 'warning'); return }
  if (!isSimpleLevel.value) {
    if (!formData.value.specialty) { toast.show('请先选择专科', 'warning'); return }
    if (!formData.value.category) { toast.show('请先选择亚专业', 'warning'); return }
  }
  if (!formData.value.disease) { toast.show('请先选择病种', 'warning'); return }
  // If previous generation has partial data, pre-select all steps (user can adjust)
  // but mark completed ones visually
  genStepEnd.value = genSteps.value.length - 1
  showGenConfig.value = true
}

async function optimizeCurrentTab() {
  const moduleType = activeTab.value
  if (!['basic', 'scoreSheet', 'reception', 'humanity', 'analysis'].includes(moduleType)) {
    toast.show('当前模块不支持单页优化', 'warning')
    return
  }
  if (generating.value) {
    toast.show('请等待当前生成任务完成', 'warning')
    return
  }

  const isEmpty = moduleType === 'basic'
    ? !formData.value.case_id
    : moduleType === 'scoreSheet'
    ? (!formData.value.score_sheet || formData.value.score_sheet.length === 0)
    : moduleType === 'reception'
    ? !formData.value.reception.sp_materials?.self_narration && (!formData.value.reception.sp_materials?.qa_script || formData.value.reception.sp_materials.qa_script.length === 0)
    : moduleType === 'humanity'
    ? (!formData.value.humanity.scenarios || formData.value.humanity.scenarios.length === 0)
    : (() => {
        const hasContent = (steps) => steps.some(s => (s.questions || []).some(q => q.text || q.reference_answer || q.scoring_guide))
        return !hasContent(formData.value.analysis.examiner_version.steps) && !hasContent(formData.value.analysis.candidate_version.steps)
      })()

  if (isEmpty) {
    toast.show('当前模块无内容可优化，请先生成', 'warning')
    return
  }

  const tabLabel = tabs.find(t => t.key === moduleType)?.label || moduleType
  const ok = await confirm(
    `即将对【${tabLabel}】模块进行AI优化。\n\n优化将尽量保留您已修改的内容，同时：\n• 修正结构和规范问题\n• 补充缺失的必要信息\n• 让内容更贴合病例实际`,
    { title: '确认优化', okText: '开始优化', cancelText: '取消' }
  )
  if (!ok) return

  doOptimize(moduleType)
}

const optimizing = ref(false)

async function doOptimize(moduleType) {
  if (isStaticProduction()) { toast.show('AI 优化需要后端服务支持，静态托管环境暂不可用', 'warning'); return }
  optimizing.value = true
  try {
    const currentData = buildOptimizeInput(moduleType)
    const res = await fetch('/api/ai-generate/optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        moduleType,
        currentData,
        caseId: formData.value.case_id,
        config: {
          specialty: formData.value.specialty,
          disease: formData.value.disease,
          teaching_phase: formData.value.teaching_phase
        }
      })
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `服务器错误 (${res.status})`)
    }

    const result = await res.json()
    if (result.mock) isMockMode.value = true
    mergeOptimizedData(moduleType, result.data)
    previewData.value[moduleType] = result.data
    toast.show(`${tabs.find(t => t.key === moduleType)?.label || moduleType} 优化完成`)
  } catch (e) {
    toast.show(`优化失败: ${e.message}`, 'error')
  } finally {
    optimizing.value = false
  }
}

function buildOptimizeInput(moduleType) {
  const fd = formData.value
  const level = fd.teaching_phase || 'R1'
  const trainingPhase = dict.LEVEL_TO_PHASE?.[level] || '住院医师'

  if (moduleType === 'basic') {
    return {
      case_id: fd.case_id,
      specialty: fd.specialty, category: fd.category, disease: fd.disease,
      teaching_phase: level, training_phase: trainingPhase,
      title: fd.title, patient_name: fd.patient_name, patient_gender: fd.patient_gender,
      patient_age: fd.patient_age, patient_occupation: fd.patient_occupation,
      patient_pregnancy: fd.patient_pregnancy,
      diagnosis: fd.diagnosis, symptoms: fd.symptoms,
      present_illness: fd.present_illness, chief_complaint: fd.chief_complaint
    }
  }

  if (moduleType === 'scoreSheet') {
    return {
      case_id: fd.case_id,
      specialty: fd.specialty, disease: fd.disease,
      teaching_phase: level, training_phase: trainingPhase,
      score_sheet: JSON.parse(JSON.stringify(fd.score_sheet || []))
    }
  }

  if (moduleType === 'reception') {
    return {
      case_id: fd.case_id,
      specialty: fd.specialty,
      difficulty: level,
      training_phase: trainingPhase,
      communication_target: fd.reception.communication_target || fd.reception.sp_materials?.role || 'patient',
      sp_materials: JSON.parse(JSON.stringify(fd.reception.sp_materials)),
      examiner_materials: JSON.parse(JSON.stringify(fd.reception.examiner_materials)),
      candidate_materials: JSON.parse(JSON.stringify(fd.reception.candidate_materials))
    }
  }

  if (moduleType === 'humanity') {
    return {
      case_id: fd.case_id,
      specialty: fd.specialty,
      disease: fd.disease,
      difficulty: level,
      training_phase: trainingPhase,
      scenarios: JSON.parse(JSON.stringify(fd.humanity.scenarios))
    }
  }

  if (moduleType === 'analysis') {
    return {
      case_id: fd.case_id,
      specialty: fd.specialty,
      disease: fd.disease,
      difficulty: level,
      training_phase: trainingPhase,
      examiner_version: {
        case_summary_for_examiner: fd.analysis.examiner_version.summary,
        key_teaching_points: fd.analysis.examiner_version.teaching_points,
        steps: fd.analysis.examiner_version.steps.map(s => ({
          title: s.title,
          presented_info: s.presented_info,
          supplementary_info_for_examiner: s.supplementary_info,
          questions: (s.questions || []).map(q => ({
            text: q.text,
            reference_answer: q.reference_answer,
            scoring_guide: q.scoring_guide
          }))
        }))
      },
      candidate_version: {
        case_title: fd.analysis.candidate_version.title,
        steps: fd.analysis.candidate_version.steps.map(s => ({
          presented_info: s.presented_info,
          questions: (s.questions || []).map(q => ({ text: q.text }))
        }))
      }
    }
  }

  return {}
}

function mergeOptimizedData(moduleType, data) {
  if (!data) return

  if (moduleType === 'basic') {
    const d = data
    if (d.title) formData.value.title = d.title
    if (d.specialty) formData.value.specialty = d.specialty
    if (d.disease) formData.value.disease = d.disease
    if (d.chief_complaint) formData.value.chief_complaint = d.chief_complaint
    if (d.present_illness) formData.value.present_illness = d.present_illness
    if (d.past_history) formData.value.past_history = d.past_history
    if (d.diagnosis) formData.value.diagnosis = d.diagnosis
    if (d.treatment_plan) formData.value.treatment_plan = d.treatment_plan
    if (d.teaching_points) formData.value.teaching_points = Array.isArray(d.teaching_points) ? d.teaching_points.join('\n') : d.teaching_points
    if (d.physical_exam) formData.value.physical_exam = d.physical_exam
    if (d.lab_tests) formData.value.lab_tests = d.lab_tests
    if (d.imaging) formData.value.imaging = d.imaging
    if (d.special_exams) formData.value.special_exams = d.special_exams
    if (d.patient_info?.pregnancy) formData.value.patient_pregnancy = d.patient_info.pregnancy
  }

  if (moduleType === 'scoreSheet') {
    if (data.score_sheet && Array.isArray(data.score_sheet)) {
      formData.value.score_sheet = data.score_sheet
    }
  }

  if (moduleType === 'reception') {
    if (data.sp_materials) formData.value.reception.sp_materials = data.sp_materials
    if (data.examiner_materials) formData.value.reception.examiner_materials = data.examiner_materials
    if (data.candidate_materials) formData.value.reception.candidate_materials = data.candidate_materials
    if (data.personality) {
      formData.value.meta = { ...(formData.value.meta || {}), personality: { ...data.personality } }
    }
  }

  if (moduleType === 'humanity') {
    if (data.scenarios) formData.value.humanity.scenarios = data.scenarios
  }

  if (moduleType === 'analysis') {
    if (data.examiner_version) {
      const ev = data.examiner_version
      formData.value.analysis.examiner_version = {
        summary: ev.case_summary_for_examiner || '',
        teaching_points: ev.key_teaching_points || [],
        steps: (ev.steps || []).map((step, idx) => {
          const hasQuestionsArr = Array.isArray(step.questions) && step.questions.length > 0
          const questions = hasQuestionsArr
            ? step.questions.map(q => ({
                text: q.text || '',
                reference_answer: q.reference_answer?.detailed_answer || (q.reference_answer?.main_points || []).join('\n') || (typeof q.reference_answer === 'string' ? q.reference_answer : ''),
                scoring_guide: q.scoring_guide || { total_score: 0, criteria: [] }
              }))
            : []
          // 旧版单题目格式兼容
          if (!hasQuestionsArr) {
            const qText = typeof step.question === 'string' ? step.question : (step.question?.text || '')
            const aText = typeof step.reference_answer === 'string' ? step.reference_answer : (step.reference_answer?.detailed_answer || '')
            const sText = typeof step.scoring_guide === 'string' ? step.scoring_guide : ''
            if (qText || aText || sText) {
              questions.push({ text: qText, reference_answer: aText, scoring_guide: sText })
            }
          }
          if (!questions.length) {
            questions.push({ text: '', reference_answer: '', scoring_guide: { total_score: 0, criteria: [] } })
          }
          return {
            title: step.title || `步骤 ${step.step || idx + 1}`,
            presented_info: step.presented_info || '',
            supplementary_info: step.supplementary_info_for_examiner || '',
            questions
          }
        })
      }
    }
    if (data.candidate_version) {
      const cv = data.candidate_version
      formData.value.analysis.candidate_version = {
        title: cv.case_title || '',
        steps: (cv.steps || []).map(step => {
          const hasQuestionsArr = Array.isArray(step.questions) && step.questions.length > 0
          const questions = hasQuestionsArr
            ? step.questions.map(q => ({ text: q.text || '' }))
            : []
          if (!hasQuestionsArr) {
            const qText = typeof step.question === 'string' ? step.question : (step.question?.text || '')
            if (qText) questions.push({ text: qText })
          }
          if (!questions.length) questions.push({ text: '' })
          return { presented_info: step.presented_info || '', questions }
        })
      }
    }
  }
}

function formAnalysisToFile(analysis) {
  const ev = analysis.examiner_version
  const cv = analysis.candidate_version
  return {
    examiner_version: {
      case_summary_for_examiner: ev.summary || '',
      key_teaching_points: ev.teaching_points || [],
      steps: (ev.steps || []).map((step, idx) => ({
        step: idx + 1,
        title: step.title || '',
        presented_info: step.presented_info || '',
        supplementary_info_for_examiner: step.supplementary_info || '',
        questions: (step.questions || []).map(q => {
          const refAnswer = typeof q.reference_answer === 'string'
            ? q.reference_answer
            : (q.reference_answer?.detailed_answer || '')
          return {
            text: q.text || '',
            type: 'short_answer',
            reference_answer: {
              detailed_answer: refAnswer,
              main_points: refAnswer ? refAnswer.split('\n').filter(Boolean) : []
            },
            scoring_guide: parseScoringGuide(q.scoring_guide)
          }
        })
      }))
    },
    candidate_version: {
      case_title: cv.title || '',
      steps: (cv.steps || []).map(step => ({
        presented_info: step.presented_info || '',
        questions: (step.questions || []).map(q => ({ text: q.text || '' }))
      }))
    }
  }
}

function parseScoringGuide(val) {
  if (typeof val === 'object' && val !== null && !Array.isArray(val)) return val
  if (typeof val !== 'string' || !val.trim()) return { total_score: 0, criteria: [] }
  const lines = val.split('\n').map(s => s.trim()).filter(Boolean)
  let total_score = 0
  const criteria = []
  for (const line of lines) {
    const scoreMatch = line.match(/满分[：:]\s*(\d+)\s*分/)
    if (scoreMatch) { total_score = parseInt(scoreMatch[1]) || 0; continue }
    const itemMatch = line.match(/^[•\-\*]\s*(.+?)[（(](\d+\.?\d*)\s*分[）)]$/)
    if (itemMatch) { criteria.push({ item: itemMatch[1].trim(), score: parseFloat(itemMatch[2]) || 0 }); continue }
    // 自由文本行作为无分值的评分项
    const plainMatch = line.match(/^[•\-\*]\s*(.+)/)
    if (plainMatch) { criteria.push({ item: plainMatch[1].trim(), score: 0 }); continue }
  }
  return { total_score, criteria }
}

function hasAnalysisContent(analysis) {
  const evSteps = analysis.examiner_version?.steps || []
  const cvSteps = analysis.candidate_version?.steps || []
  return evSteps.some(s => s.title || s.presented_info || (s.questions || []).some(q => q.text || q.reference_answer)) ||
    cvSteps.some(s => s.presented_info || (s.questions || []).some(q => q.text))
}

function saveDraft() {
  const caseId = formData.value.case_id
  if (!caseId) { toast.show('请先生成病例，创建 case_id 后再保存', 'warning'); return }
  persistMeta({ savedAt: new Date().toISOString() })

  const saveFile = (fileName, data) => {
    if (!data || isStaticProduction()) return
    fetch('/api/case/save-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId, fileName, data })
    }).catch(() => {})
  }

  if (formData.value.score_sheet && formData.value.score_sheet.length > 0) {
    saveFile(caseId + '-scoreSheet.json', formData.value.score_sheet)
  }

  const reception = formData.value.reception
  if (reception?.sp_materials?.self_narration || (reception?.sp_materials?.qa_script || []).length > 0) {
    saveFile(caseId + '-reception.json', reception)
  }

  const analysis = formData.value.analysis
  if (analysis && hasAnalysisContent(analysis)) {
    saveFile(caseId + '-analysis.json', formAnalysisToFile(analysis))
  }

  const humanity = formData.value.humanity
  if (humanity?.scenarios?.length > 0) {
    saveFile(caseId + '-humanity.json', humanity)
  }

  const materials = formData.value.examination_materials
  if (materials && materials.length > 0) {
    const cleanItems = materials.map(({ _preview, _file, ...rest }) => rest)
    saveFile(caseId + '-materials.json', { case_id: caseId, items: cleanItems })
  }

  if (formData.value.meta && Object.keys(formData.value.meta).length > 0) {
    saveFile(caseId + '-meta.json', formData.value.meta)
  }

  toast.show('草稿已保存')
}

onMounted(() => {
  observer = new IntersectionObserver(
    ([entry]) => { infoCollapsed.value = !entry.isIntersecting },
    { rootMargin: '-1px 0px 0px 0px', threshold: 0 }
  )
  if (sentinelRef.value) observer.observe(sentinelRef.value)
})

onUnmounted(() => {
  if (observer) observer.disconnect()
  stopBgPolling()
})

const showGenConfig = ref(false)
const showGenProgress = ref(false)
const showGenPreview = ref(false)
const generating = ref(false)
let abortController = null
const isMockMode = ref(false)
const showMockHelp = ref(false)

const genSteps = computed(() => {
  const base = [
    { key: 'basic', label: '基础信息' },
    { key: 'scoreSheet', label: 'v1.0 评分' },
    { key: 'reception', label: '接诊病人' },
    { key: 'analysis', label: '病例分析' },
    { key: 'humanity', label: '人文沟通' },
  ]
  if (isPsych.value) base.push({ key: 'mentalExam', label: '精神检查' })
  return base
})
const genStepEnd = ref(5)

const genStepSelection = computed(() => {
  const arr = new Array(genSteps.value.length).fill(false)
  for (let i = 0; i <= genStepEnd.value; i++) arr[i] = true
  return arr
})

const genProgress = reactive({
  basic: 0,
  scoreSheet: 0,
  reception: 0,
  analysis: 0,
  humanity: 0,
  mentalExam: 0,
  meta: 0
})

const generatingSteps = ref(new Set())
const progressTimers = new Map()

function startStepProgress(stepKey) {
  genProgress[stepKey] = 0
  generatingSteps.value.add(stepKey)
  if (progressTimers.has(stepKey)) clearInterval(progressTimers.get(stepKey))
  const timer = setInterval(() => {
    const cur = genProgress[stepKey]
    if (cur < 88) {
      const inc = Math.random() * 6 + 2
      genProgress[stepKey] = Math.min(88, Math.round(cur + inc))
    }
  }, 400)
  progressTimers.set(stepKey, timer)
}

function finishStepProgress(stepKey) {
  if (progressTimers.has(stepKey)) {
    clearInterval(progressTimers.get(stepKey))
    progressTimers.delete(stepKey)
  }
  generatingSteps.value.delete(stepKey)
  genProgress[stepKey] = 100
}

function failStepProgress(stepKey) {
  if (progressTimers.has(stepKey)) {
    clearInterval(progressTimers.get(stepKey))
    progressTimers.delete(stepKey)
  }
  generatingSteps.value.delete(stepKey)
  genProgress[stepKey] = -1
}

function failAllActiveSteps() {
  for (const [key, timer] of progressTimers) {
    clearInterval(timer)
    genProgress[key] = -1
  }
  progressTimers.clear()
  generatingSteps.value.clear()
}

const previewData = ref({
  basic: {},
  scoreSheet: {},
  reception: {},
  analysis: {},
  humanity: {},
  meta: null
})

const previewActiveTab = ref('basic')

const selectedStepCount = computed(() => genStepSelection.value.filter(Boolean).length)

const completedStepCount = computed(() =>
  genSteps.value.filter((_, i) => genStepSelection.value[i] && genProgress[genSteps.value[i].key] === 100).length
)

const hasIncompleteSteps = computed(() =>
  genSteps.value.some((_, i) => genStepSelection.value[i] && genProgress[genSteps.value[i].key] < 100)
)

function finishAndPreview() {
  showGenProgress.value = false
  showGenPreview.value = true
  const firstWithData = genPreviewTabs.value.find(t => hasPreviewData(t.key))
  previewActiveTab.value = firstWithData ? firstWithData.key : 'basic'
}

const hasExistingData = computed(() =>
  genSteps.value.some(s => genProgress[s.key] === 100)
)

const completedStepLabels = computed(() =>
  genSteps.value.filter(s => genProgress[s.key] === 100).map(s => s.label)
)

const scoreSheetTotalGroup = computed(() => {
  const sheet = previewData.value.scoreSheet
  if (!Array.isArray(sheet) || sheet.length === 0) return 0
  return sheet.reduce((sum, item) => sum + (item.score || 0), 0)
})

const scoreSheetTotalScore = computed(() => {
  const sheet = previewData.value.scoreSheet
  if (!Array.isArray(sheet) || sheet.length === 0) return 0
  return sheet.reduce((sum, item) => sum + (item.score || 0), 0)
})

const processedScoreSheet = computed(() => {
  const sheet = previewData.value.scoreSheet
  if (!Array.isArray(sheet) || sheet.length === 0) return []
  const result = []
  let i = 0
  while (i < sheet.length) {
    const cat = sheet[i].category
    let j = i
    while (j < sheet.length && sheet[j].category === cat) j++
    const catCount = j - i
    // 在同类内计算评分项合并
    let m = i
    while (m < j) {
      const itemName = sheet[m].item
      let n = m
      while (n < j && sheet[n].item === itemName) n++
      const itemCount = n - m
      for (let k = m; k < n; k++) {
        result.push({
          ...sheet[k],
          _catRowspan: k === i ? catCount : 0,
          _itemRowspan: k === m ? itemCount : 0
        })
      }
      m = n
    }
    i = j
  }
  return result
})

const genPreviewTabs = computed(() => {
  const base = [
    { key: 'basic', label: '基础信息' },
    { key: 'scoreSheet', label: 'v1.0 评分' },
    { key: 'reception', label: '接诊病人' },
    { key: 'analysis', label: '病例分析' },
    { key: 'humanity', label: '人文沟通' },
  ]
  if (isPsych.value) base.push({ key: 'mentalExam', label: '精神检查' })
  return base
})

async function startGeneration(resume = false) {
  if (generating.value) return
  generating.value = true
  showGenConfig.value = false
  showGenProgress.value = true
  if (!resume) {
    for (const key in genProgress) genProgress[key] = 0
    previewData.value = {
      basic: {},
      scoreSheet: {},
      reception: {},
      analysis: {},
      humanity: {},
      mentalExam: {},
      meta: null
    }
    // 新建病例（非编辑已有病例）时清空 case_id，确保后端生成新ID而非覆盖旧文件
    if (!props.caseId) {
      formData.value.case_id = ''
    }
  }
  abortController = new AbortController()

  const selectedKeys = genSteps.value.filter((_, i) => genStepSelection.value[i]).map(s => s.key)

  // Phase 1: basic (skip if already done)
  if (selectedKeys.includes('basic') && genProgress.basic < 100) {
    genProgress.basic = 0
    startStepProgress('basic')
    try {
      const result = await simulateGenStep('basic')
      if (abortController.signal.aborted) { generating.value = false; failAllActiveSteps(); return }
      if (result?.patient_info?.address) {
        result.patient_info.address = sanitizeAddress(result.patient_info.address)
      }
      previewData.value.basic = result
      finishStepProgress('basic')
    } catch (e) {
      if (e.name === 'AbortError') { generating.value = false; failAllActiveSteps(); return }
      failStepProgress('basic')
      toast.show(`生成基础信息失败: ${e.message}`, 'error')
    }
  }

  // Phase 2: concurrent generation (reception / analysis / humanity)
  const concurrentSteps = selectedKeys.filter(k => k !== 'basic' && k !== 'meta' && k !== 'scoreSheet' && genProgress[k] < 100)
  if (concurrentSteps.length > 0 && !abortController.signal.aborted) {
    for (const key of concurrentSteps) {
      genProgress[key] = 0
      startStepProgress(key)
    }

    const results = await Promise.allSettled(
      concurrentSteps.map(key => simulateGenStep(key))
    )

    for (let i = 0; i < results.length; i++) {
      const r = results[i]
      const key = concurrentSteps[i]
      if (abortController.signal.aborted) { generating.value = false; failAllActiveSteps(); return }
      if (r.status === 'fulfilled') {
        previewData.value[key] = key === 'analysis' ? normalizeAnalysisForPreview(r.value) : r.value
        finishStepProgress(key)
      } else {
        if (r.reason.name === 'AbortError') { generating.value = false; failAllActiveSteps(); return }
        failStepProgress(key)
        toast.show(`生成 ${genSteps.value.find(s => s.key === key)?.label || key} 失败: ${r.reason.message}`, 'error')
      }
    }
  }

  if (abortController.signal.aborted) { generating.value = false; failAllActiveSteps(); return }

  // Phase 3: scoreSheet — v1.0 评分表（通过 AI API 生成，与其他模块一致）
  if (selectedKeys.includes('scoreSheet') && genProgress.scoreSheet < 100) {
    startStepProgress('scoreSheet')
    try {
      const result = await simulateGenStep('scoreSheet')
      if (abortController.signal.aborted) { generating.value = false; failAllActiveSteps(); return }
      previewData.value.scoreSheet = result?.score_sheet || result || []
      finishStepProgress('scoreSheet')
    } catch (e) {
      if (e.name === 'AbortError') { generating.value = false; failAllActiveSteps(); return }
      failStepProgress('scoreSheet')
      toast.show(`生成评分表失败: ${e.message}`, 'error')
    }
  }

  // Phase 4: meta — 前端自动组装（不占生成步骤，静默完成）
  if (genProgress.meta < 100) {
    previewData.value.meta = buildMetaInfo(previewData.value.basic, {
      reception: previewData.value.reception,
      analysis: previewData.value.analysis,
      humanity: previewData.value.humanity,
      mentalExam: previewData.value.mentalExam
    })
    genProgress.meta = 100
  }

  if (abortController.signal.aborted) { generating.value = false; failAllActiveSteps(); return }

  generating.value = false
  generatingSteps.value.clear()

  // Auto-advance to preview only if all succeeded
  const allDone = selectedKeys.every(k => genProgress[k] === 100)
  if (allDone) {
    showGenProgress.value = false
    showGenPreview.value = true
    const firstWithData = genPreviewTabs.value.find(t => hasPreviewData(t.key))
    previewActiveTab.value = firstWithData ? firstWithData.key : 'basic'
  }
}

function cleanup() {
  for (const [, timer] of progressTimers) {
    clearInterval(timer)
  }
  progressTimers.clear()
  generating.value = false
  generatingSteps.value.clear()
  showGenProgress.value = false
  abortController = null
}

function normalizeScoringGuide(sg) {
  if (!sg) return { total_score: 0, criteria: [] }
  // 新格式：{ total_score, criteria: [{item, score}] }
  if (sg.total_score !== undefined && Array.isArray(sg.criteria)) return sg
  // 旧格式：数组 [{criterion, max_score, description}]
  if (Array.isArray(sg)) {
    const total = sg.reduce((s, c) => s + (c.max_score || 0), 0)
    return {
      total_score: total,
      criteria: sg.map(c => ({ item: `${c.criterion}: ${c.description || ''}`, score: c.max_score || 0 }))
    }
  }
  // 字符串格式
  return { total_score: 0, criteria: [] }
}

function genderLabel(sex) {
  if (sex === '女' || sex === '0' || sex === 0) return '女'
  if (sex === '男' || sex === '1' || sex === 1) return '男'
  return sex || '—'
}

function normalizeAnalysisForPreview(raw) {
  if (!raw || !raw.examiner_version?.steps) return raw
  const norm = JSON.parse(JSON.stringify(raw))
  norm.examiner_version.steps = norm.examiner_version.steps.map(step => {
    // 处理旧格式 question 单数字段
    if (!Array.isArray(step.questions) || step.questions.length === 0) {
      const qText = typeof step.question === 'string' ? step.question : (step.question?.text || '')
      const aRaw = typeof step.reference_answer === 'string' ? step.reference_answer : (step.reference_answer?.detailed_answer || '')
      const qs = splitMergedText(qText)
      const as = splitMergedText(aRaw)
      const maxLen = Math.max(qs.length, as.length, 1)
      step.questions = []
      for (let i = 0; i < maxLen; i++) {
        step.questions.push({
          text: qs[i] || (i === 0 ? qText : ''),
          type: 'short_answer',
          reference_answer: { detailed_answer: as[i] || '', main_points: (as[i] || '').split('\n').filter(Boolean) },
          scoring_guide: i === 0 ? normalizeScoringGuide(step.scoring_guide) : { total_score: 0, criteria: [] }
        })
      }
      return step
    }
    // 已有 questions[]，但检查是否单个问题文本包含合并的多问题
    const expanded = []
    let needExpand = false
    step.questions.forEach(q => {
      const qText = typeof q.text === 'string' ? q.text : (q.text || '')
      const parts = splitMergedText(qText)
      if (parts.length > 1) {
        needExpand = true
        const aRaw = typeof q.reference_answer === 'string' ? q.reference_answer : (q.reference_answer?.detailed_answer || '')
        const as = splitMergedText(aRaw)
        parts.forEach((t, i) => expanded.push({
          text: t,
          type: q.type || 'short_answer',
          reference_answer: { detailed_answer: as[i] || '', main_points: (as[i] || '').split('\n').filter(Boolean) },
          scoring_guide: i === 0 ? normalizeScoringGuide(q.scoring_guide) : { total_score: 0, criteria: [] }
        }))
      } else {
        // 确保 reference_answer 是对象格式
        if (typeof q.reference_answer === 'string') {
          q.reference_answer = { detailed_answer: q.reference_answer, main_points: q.reference_answer.split('\n').filter(Boolean) }
        }
        if (q.scoring_guide && !q.scoring_guide.total_score && Array.isArray(q.scoring_guide)) {
          q.scoring_guide = normalizeScoringGuide(q.scoring_guide)
        }
        expanded.push(q)
      }
    })
    if (needExpand) step.questions = expanded
    return step
  })
  if (norm.candidate_version?.steps) {
    norm.candidate_version.steps = norm.candidate_version.steps.map(step => {
      if (!Array.isArray(step.questions)) {
        const qText = typeof step.question === 'string' ? step.question : (step.question?.text || '')
        const parts = splitMergedText(qText)
        step.questions = parts.length ? parts.map(t => ({ text: t })) : [{ text: qText }]
        return step
      }
      const expanded = []
      let needExpand = false
      step.questions.forEach(q => {
        const parts = splitMergedText(q.text || '')
        if (parts.length > 1) {
          needExpand = true
          parts.forEach(t => expanded.push({ text: t }))
        } else {
          expanded.push(q)
        }
      })
      if (needExpand) step.questions = expanded
      return step
    })
  }
  return norm
}

function hasPreviewData(key) {
  const val = previewData.value[key]
  if (!val) return false
  if (typeof val === 'object' && Object.keys(val).length === 0) return false
  return true
}

function cancelGeneration() {
  const wasGenerating = generating.value
  if (abortController) {
    abortController.abort()
  }
  failAllActiveSteps()
  generating.value = false
  abortController = null
  if (wasGenerating) {
    toast.show('已取消生成，可点击"继续生成"重试')
  } else {
    showGenProgress.value = false
  }
}

async function simulateGenStep(stepKey) {
  if (isStaticProduction()) {
    throw new Error('AI 病例生成需要后端服务支持，静态托管环境暂不可用。请在本地开发环境中使用此功能。')
  }
  const body = {
    step: stepKey,
    config: {
      specialty: formData.value.specialty,
      category: formData.value.category,
      disease: formData.value.disease,
      teaching_phase: formData.value.teaching_phase
    },
    caseId: stepKey === 'basic' ? (formData.value.case_id || null) : (previewData.value.basic?.case_id || null),
    previousResults: {
      basic: previewData.value.basic || {},
      reception: previewData.value.reception || {},
      analysis: previewData.value.analysis || {},
      humanity: previewData.value.humanity || {},
      mentalExam: previewData.value.mentalExam || {}
    }
  }
  const signal = abortController?.signal
  const res = await fetch('/api/ai-generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `服务器错误 (${res.status})`)
  }
  const json = await res.json()
  if (json.mock) isMockMode.value = true
  return json.data
}

function saveTemplateChoice(templateCode) {
  if (isStaticProduction()) return
  const caseId = formData.value.case_id
  if (!caseId) return
  fetch('/api/case/save-fields', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ caseId, fields: { score_sheet_template: templateCode || '' } })
  }).catch(() => {})
}

async function acceptGenerated() {
  const caseId = previewData.value.basic?.case_id
  if (!caseId) {
    toast.show('未找到生成的病例ID，无法加载', 'error')
    return
  }
  showGenPreview.value = false
  loading.value = true
  try {
    // 先加载新病例数据更新 formData（含 case_id），再保存元数据
    const loadResult = await loadCaseDataFromFiles(caseId)
    formData.value = loadResult.formData
    await persistMeta()
    //评分表：直接从预览数据覆盖（客户端生成，不经过文件）
    if (previewData.value.scoreSheet && Array.isArray(previewData.value.scoreSheet) && previewData.value.scoreSheet.length > 0) {
      formData.value.score_sheet = JSON.parse(JSON.stringify(previewData.value.scoreSheet))
      fetch('/api/case/save-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, fileName: `${caseId}-scoreSheet.json`, data: previewData.value.scoreSheet })
      }).catch(() => {})
    }
    // 接诊信息：显式落盘
    if (previewData.value.reception && Object.keys(previewData.value.reception).length > 0) {
      fetch('/api/case/save-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, fileName: `${caseId}-reception.json`, data: previewData.value.reception })
      }).catch(() => {})
      // reception 生成结果中的 personality 合并到 meta（reception 是性格的主要来源）
      if (previewData.value.reception.personality) {
        formData.value.meta = { ...(formData.value.meta || {}), personality: { ...previewData.value.reception.personality } }
      }
    }
    // 医患沟通：显式落盘
    if (previewData.value.humanity && Object.keys(previewData.value.humanity).length > 0) {
      fetch('/api/case/save-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, fileName: `${caseId}-humanity.json`, data: previewData.value.humanity })
      }).catch(() => {})
    }
    // 病例分析：用已拆分的预览数据覆盖文件加载结果（确保问题拆分不丢失）
    if (previewData.value.analysis) {
      const analysisPreview = normalizeAnalysisForPreview(previewData.value.analysis)
      fetch('/api/case/save-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, fileName: `${caseId}-analysis.json`, data: analysisPreview })
      }).catch(() => {})
      if (analysisPreview?.examiner_version?.steps) {
        formData.value.analysis.examiner_version.steps = analysisPreview.examiner_version.steps.map((step, idx) => ({
          title: step.title || `步骤 ${idx + 1}`,
          presented_info: step.presented_info || '',
          supplementary_info: step.supplementary_info_for_examiner || step.supplementary_info || '',
          questions: (step.questions || []).map(q => ({
            text: q.text || '',
            reference_answer: typeof q.reference_answer === 'string' ? q.reference_answer : (q.reference_answer?.detailed_answer || ''),
            scoring_guide: q.scoring_guide || { total_score: 0, criteria: [] }
          }))
        }))
      }
      if (analysisPreview?.candidate_version?.steps) {
        formData.value.analysis.candidate_version.steps = analysisPreview.candidate_version.steps.map(step => ({
          presented_info: step.presented_info || '',
          questions: (step.questions || []).map(q => ({ text: q.text || '' }))
        }))
      }
    }
    // 精神检查：显式落盘 + 写入 formData
    if (previewData.value.mentalExam && Object.keys(previewData.value.mentalExam).length > 0) {
      formData.value.atypical_dialogue = JSON.parse(JSON.stringify(previewData.value.mentalExam))
      fetch('/api/case/save-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, fileName: `${caseId}-mentalExam.json`, data: previewData.value.mentalExam })
      }).catch(() => {})
    }
    // 元信息：显式落盘（含 personality 等字段）
    if (previewData.value.meta && Object.keys(previewData.value.meta).length > 0) {
      fetch('/api/case/save-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, fileName: `${caseId}-meta.json`, data: previewData.value.meta })
      }).catch(() => {})
    }
    toast.show('已采用 AI 生成内容并保存到本地')
  } catch (e) {
    toast.show('加载生成数据失败: ' + e.message, 'error')
    loading.value = false
  }
  loading.value = false
}
</script>

<style scoped>
.case-editor {
  background: var(--page-bg);
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: var(--card-bg);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 20;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.editor-title {
  margin: 0;
  font-size: 16px;
  color: var(--text-main);
}

.case-id-badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--primary-light);
  color: var(--primary);
}

.version-badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  background: #f0fdf4;
  color: #16a34a;
  font-family: monospace;
}

.header-right {
  display: flex;
  gap: 8px;
}

.common-info-card {
  margin: 0;
  padding: 16px 24px;
  border-radius: 0;
  transition: padding .2s, max-height .25s, opacity .2s;
}

.common-info-card.collapsed {
  padding: 0 24px;
  max-height: 0;
  border: none;
  margin: 0;
  overflow: hidden;
}

.common-info-card.collapsed .common-info-grid {
  opacity: 0;
  pointer-events: none;
}

.common-info-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  align-items: end;
  transition: opacity .15s;
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-item label {
  font-size: 12px;
  color: var(--text-secondary);
}

.bg-gen-banner {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding: 8px 14px; margin-bottom: 8px;
  background: #ecf5ff; border: 1px solid #b3d8ff; border-radius: 8px;
  font-size: 13px; color: #409EFF;
}
.bg-gen-hint { font-size: 11px; color: #909399; margin-left: 12px; }

.ai-gen-row {
  padding-top: 12px;
  border-top: 1px solid var(--border-light);
  display: flex;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
}

.mock-warning {
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 6px;
  padding: 8px 14px;
  font-size: 13px;
  color: #856404;
  line-height: 1.6;
}
.mock-warning a {
  color: #0d6efd;
  font-weight: 500;
}
.mock-help-box {
  margin-top: 8px;
  padding: 10px 14px;
  background: #f8f9fa;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.8;
}
.mock-help-box code {
  background: #e9ecef;
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 11px;
}

.btn-ai-gen {
  width: 6.25%;
}

.tab-bar {
  display: flex;
  gap: 0;
  padding: 0 24px;
  background: var(--card-bg);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 53px;
  z-index: 10;
}

.tab-btn {
  padding: 10px 20px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-secondary);
  transition: all .15s;
}

.tab-btn:hover {
  color: var(--primary);
}

.tab-btn.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
  font-weight: 600;
}

.tab-content {
}

.tab-panel {
  padding: 20px 24px;
}

.spinner {
  width: 36px;
  height: 36px;
  margin: 0 auto;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin .8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-card {
  background: var(--card-bg);
  border-radius: 12px;
  width: 520px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

.modal-card-lg {
  width: 720px;
  max-height: 85vh;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-light);
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
  color: var(--text-main);
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
  color: var(--text-tertiary);
  padding: 4px 8px;
  border-radius: 4px;
  transition: background .15s;
}

.btn-icon:hover {
  background: var(--border-light);
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.modal-card-gen {
  width: 600px;
}

.gen-config-body {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid var(--border-light);
}

/* ── Stepper ── */
.gen-stepper {
  padding: 8px 12px;
}

.stepper-track {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  position: relative;
  padding: 0 8px;
}

.stepper-track::before {
  content: '';
  position: absolute;
  top: 19px;
  left: 9%;
  right: 9%;
  height: 2px;
  background: #e5e7eb;
  transition: background .3s;
}

.stepper-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  flex: 1;
  max-width: 90px;
  cursor: pointer;
  position: relative;
  z-index: 1;
}

.stepper-bullet {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 2px solid #d1d5db;
  font-size: 13px;
  font-weight: 700;
  color: #9ca3af;
  transition: all .2s ease;
  flex-shrink: 0;
}

.stepper-node:hover .stepper-bullet {
  border-color: var(--primary);
  color: var(--primary);
}

.stepper-node.active .stepper-bullet {
  border-color: var(--primary);
  background: var(--primary);
  color: #fff;
  box-shadow: 0 2px 8px rgba(64,158,255,0.25);
}

.stepper-node.current .stepper-bullet {
  box-shadow: 0 0 0 4px rgba(64,158,255,0.15), 0 2px 8px rgba(64,158,255,0.3);
}

.stepper-node.done .stepper-bullet {
  border-color: var(--success);
  background: var(--success);
  color: #fff;
  box-shadow: 0 2px 8px rgba(34,197,94,0.2);
}

.stepper-label {
  font-size: 12px;
  color: #9ca3af;
  text-align: center;
  white-space: nowrap;
  transition: color .2s;
  font-weight: 500;
}

.stepper-node.active .stepper-label {
  color: var(--text-main);
}

.stepper-node.done .stepper-label {
  color: var(--success);
}

/* ── Summary ── */
.gen-summary {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background: var(--primary-light, #eff6ff);
  border-radius: 8px;
  font-size: 13px;
  flex-wrap: wrap;
}

.gen-summary-prefix {
  color: var(--text-tertiary);
  font-size: 12px;
}

.gen-summary-path {
  color: var(--primary);
  font-weight: 600;
  letter-spacing: .2px;
}

.gen-summary-count {
  margin-left: auto;
  color: var(--text-tertiary);
  font-size: 12px;
  background: #fff;
  padding: 2px 10px;
  border-radius: 10px;
}

/* ── Existing modules ── */
.gen-existing {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.gen-existing-label {
  font-size: 12px;
  color: var(--success);
  font-weight: 500;
}

.gen-existing-label i {
  margin-right: 2px;
}

.gen-existing-tag {
  display: inline-block;
  padding: 2px 10px;
  font-size: 11px;
  background: #f0fdf4;
  color: #15803d;
  border: 1px solid #bbf7d0;
  border-radius: 10px;
}

.step-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-main);
  cursor: pointer;
}

.progress-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.progress-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.progress-label {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text-main);
}

.progress-status {
  font-size: 12px;
  color: var(--text-tertiary);
}

.status-failed {
  color: var(--danger, #ef4444);
  font-weight: 500;
}

.progress-bar-track {
  height: 8px;
  background: var(--border-light);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: var(--primary);
  border-radius: 4px;
  transition: width .3s ease;
}

.progress-bar-fill.animating {
  background: linear-gradient(90deg, var(--primary), #93c5fd, var(--primary));
  background-size: 200% 100%;
  animation: progress-shimmer 1.5s ease-in-out infinite;
}

.progress-bar-fill.done {
  background: var(--success);
  transition: width .4s ease-out;
}

.progress-bar-fill.failed {
  background: var(--danger, #ef4444);
  transition: width .3s ease;
}

.retry-hint {
  font-size: 13px;
  color: var(--text-secondary);
}

@keyframes progress-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.preview-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--border-light);
  margin-bottom: 16px;
  overflow-x: auto;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--card-bg, #fff);
  padding-top: 4px;
}

.preview-tab-btn {
  padding: 8px 14px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: 12px;
  color: var(--text-secondary);
  transition: all .15s;
  white-space: nowrap;
  flex-shrink: 0;
}

.preview-tab-btn:hover {
  color: var(--primary);
}

.preview-tab-btn.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
  font-weight: 600;
}

.preview-section h4 {
  margin: 0 0 12px;
  font-size: 14px;
  color: var(--text-main);
}

.preview-json {
  background: #f9fafb;
  padding: 16px;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-main);
  overflow-x: auto;
  max-height: 400px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.preview-empty {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-tertiary);
  font-size: 13px;
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  border: none;
  transition: all .15s;
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-primary:hover {
  background: var(--primary-dark);
}

.btn-outline {
  background: white;
  border: 1px solid var(--border);
  color: var(--text-main);
}

.btn-outline:hover {
  background: var(--primary-light);
  border-color: var(--primary);
  color: var(--primary);
}

.btn-sm {
  padding: 4px 10px;
  font-size: 12px;
}

.input, .select {
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 13px;
  color: var(--text-main);
  background: white;
  transition: border-color .15s;
}

.input:focus, .select:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 2px var(--primary-light);
}

.input:disabled {
  cursor: not-allowed;
}

/* ── Preview Modal ── */
.modal-card-preview {
  width: 1080px;
  max-height: 90vh;
}

.pv-layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.pv-card {
  background: #fff;
  border: 1px solid var(--border-light, #e5e7eb);
  border-radius: 8px;
  padding: 16px;
}

.pv-card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-light, #f3f4f6);
  display: flex;
  align-items: center;
  gap: 8px;
}

.pv-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 16px;
}

.pv-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pv-item.pv-full {
  grid-column: 1 / -1;
}

.pv-label {
  font-size: 11px;
  color: var(--text-tertiary, #9ca3af);
  text-transform: uppercase;
  letter-spacing: .3px;
}

.pv-value {
  font-size: 13px;
  color: var(--text-main);
  font-weight: 500;
}

.pv-text {
  font-size: 13px;
  color: var(--text-main);
  line-height: 1.7;
  margin: 4px 0;
}

.pv-text-sm {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.pv-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pv-tag {
  display: inline-block;
  padding: 2px 10px;
  font-size: 12px;
  background: var(--primary-light, #eff6ff);
  color: var(--primary);
  border-radius: 12px;
}

.pv-tag-outline {
  background: #fff;
  border: 1px solid var(--border, #d1d5db);
  color: var(--text-secondary);
}

.pv-quote {
  background: #f9fafb;
  border-left: 3px solid var(--primary-light, #93c5fd);
  padding: 12px 16px;
  border-radius: 0 6px 6px 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-secondary);
  font-style: italic;
}

.pv-dialog {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pv-dialog-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pv-dialog-doctor,
.pv-dialog-patient,
.pv-dialog-sp {
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.6;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.pv-dialog-doctor {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  align-self: flex-start;
  margin-right: 40px;
}

.pv-dialog-patient,
.pv-dialog-sp {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  align-self: flex-end;
  margin-left: 40px;
}

.pv-dialog-sp-family {
  background: #fef3c7;
  border: 1px solid #fde68a;
}

.pv-dialog-role {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 1px 6px;
  border-radius: 3px;
  flex-shrink: 0;
  margin-top: 1px;
}

.pv-dialog-doctor .pv-dialog-role {
  background: #dbeafe;
  color: #1d4ed8;
}

.pv-dialog-patient .pv-dialog-role,
.pv-dialog-sp .pv-dialog-role {
  background: #dcfce7;
  color: #15803d;
}

.pv-dialog-sp-family .pv-dialog-role {
  background: #fef9c3;
  color: #a16207;
}

.pv-dialog-emotion {
  font-size: 11px;
  padding: 0 6px;
  border-radius: 3px;
  background: #f3f4f6;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.pv-dialog-note {
  font-size: 11px;
  color: var(--text-tertiary);
  padding: 2px 12px;
  font-style: italic;
}

.pv-step {
  border: 1px solid var(--border-light, #e5e7eb);
  border-radius: 8px;
  margin-top: 12px;
  overflow: hidden;
}

.pv-step-header {
  background: var(--primary-light, #eff6ff);
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  color: var(--primary);
}

.pv-step-body {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pv-step-info {
  font-size: 13px;
  color: var(--text-main);
  line-height: 1.6;
}

.pv-step-q {
  font-size: 13px;
  color: var(--primary);
  background: var(--primary-light, #eff6ff);
  padding: 8px 12px;
  border-radius: 6px;
  line-height: 1.6;
}

.pv-step-a {
  font-size: 13px;
  color: var(--text-main);
  line-height: 1.6;
}

.pv-step-score {
  font-size: 12px;
  color: var(--text-secondary);
  padding-top: 6px;
  border-top: 1px dashed var(--border-light, #e5e7eb);
}

.pv-criteria {
  font-size: 12px;
  color: var(--text-secondary);
}

.pv-table-wrap {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.pv-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  table-layout: fixed;
}

.pv-table thead {
  position: sticky;
  top: 0;
  z-index: 2;
}

.pv-table th {
  background: #f1f5f9;
  padding: 10px 10px;
  text-align: left;
  font-weight: 600;
  color: var(--text-secondary);
  border-bottom: 2px solid var(--border, #e5e7eb);
  white-space: nowrap;
  font-size: 12px;
}

.pv-table th:nth-child(1) { width: 36px; }
.pv-table th:nth-child(2) { width: 68px; }
.pv-table th:nth-child(3) { width: 14%; }
.pv-table th:nth-child(4) { width: 90px; }
.pv-table th:nth-child(5) { width: 22%; }
.pv-table th:nth-child(6) { width: 80px; }
.pv-table th:nth-child(7) { width: 36%; }

.pv-table td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--border-light, #f3f4f6);
  color: var(--text-main);
  vertical-align: top;
  line-height: 1.45;
  font-size: 12px;
}

.pv-table tbody tr:nth-child(even) {
  background: #fafbfc;
}

.pv-table tbody tr:hover {
  background: #f0f4ff;
}

.pv-td-num {
  text-align: center;
  font-family: monospace;
  font-size: 11px;
  width: 40px;
}

.pv-td-cat {
  font-weight: 600;
  background: #f1f5f9;
  text-align: center;
  font-size: 12px;
  vertical-align: middle !important;
}

.pv-td-item {
  font-weight: 500;
  vertical-align: middle !important;
}

.pv-td-sm {
  font-size: 11px;
  color: var(--text-tertiary);
  max-width: 160px;
}

.pv-badge {
  display: inline-block;
  padding: 1px 8px;
  font-size: 10px;
  font-weight: 600;
  border-radius: 8px;
  text-transform: uppercase;
  letter-spacing: .3px;
}

.pv-badge-core {
  background: #fee2e2;
  color: #dc2626;
}

.pv-badge-recommended {
  background: #ffedd5;
  color: #ea580c;
}

.pv-badge-optional {
  background: #f3f4f6;
  color: #6b7280;
}

.pv-badge-layer {
  background: #ede9fe;
  color: #7c3aed;
}

.pv-stages {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pv-stage-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  background: #f9fafb;
  border-radius: 8px;
  font-size: 12px;
  flex-wrap: wrap;
  line-height: 1.6;
  border: 1px solid #f3f4f6;
}

.pv-stage-num {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}

.pv-stage-emotion {
  font-weight: 600;
  color: var(--text-main);
  min-width: 60px;
}

.pv-stage-cog {
  color: var(--text-secondary);
  flex: 1;
}

.pv-stage-trigger {
  color: var(--text-tertiary);
  font-size: 11px;
  font-style: italic;
}

.pv-subtitle {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  margin: 8px 0 4px;
  text-transform: uppercase;
  letter-spacing: .4px;
}

.pv-ref-item {
  font-size: 12px;
  color: var(--text-main);
  padding: 3px 0;
  line-height: 1.6;
}

.pv-ref-label {
  font-weight: 600;
  color: var(--text-secondary);
}

.pv-ref-note {
  font-size: 11px;
  color: var(--text-tertiary);
}

.pv-raw-toggle {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-tertiary);
}

.pv-raw-toggle summary {
  cursor: pointer;
  user-select: none;
  padding: 4px 0;
}

.pv-raw-toggle summary:hover {
  color: var(--primary);
}

.pv-raw-toggle .preview-json {
  margin-top: 8px;
}

.pv-list {
  margin: 4px 0;
  padding-left: 20px;
  font-size: 13px;
  color: var(--text-main);
  line-height: 1.7;
}

.pv-list li {
  margin-bottom: 2px;
}
</style>
