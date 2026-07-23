<template>
  <div class="report-overlay" @click.self="closeReport">
    <div class="report-drawer">
      <div class="report-drawer-header">
        <div class="report-drawer-title">
          <i class="fa-solid fa-file-lines"></i>
          <span>成绩报告 — {{ record.stationName || '' }}</span>
        </div>
        <button v-if="isViewMode" class="btn btn-sm" style="margin-right:12px;" @click="regenerateReport()">
          <i class="fa-solid fa-rotate"></i> {{ lang === 'zh' ? '重新生成' : 'Regenerate' }}
        </button>
        <button class="report-close-btn" @click="closeReport">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <!-- 加载中 -->
      <div ref="reportBodyRef" class="report-drawer-body" v-if="scoringState === 'loading' && !reportAssessmentData">
        <div class="report-loading">
          <div class="report-loading-icon"><i class="fa-solid fa-spinner fa-spin"></i></div>
          <div class="report-loading-title">{{ lang === 'zh' ? 'AI 正在评估您的表现...' : 'AI is evaluating your performance...' }}</div>
          <div class="report-loading-desc">{{ lang === 'zh' ? '正在逐项分析对话记录，对照评分表进行打分，生成综合评价报告。预计需要 30-60 秒。' : 'Analyzing dialogue records, scoring against rubric, and generating comprehensive evaluation. Estimated 30-60 seconds.' }}</div>
          <div class="report-loading-steps">
            <div class="loading-step" :class="{ done: true }"><i class="fa-solid fa-check"></i> {{ lang === 'zh' ? '加载病例数据' : 'Loading case data' }}</div>
            <div class="loading-step" :class="{ done: true }"><i class="fa-solid fa-check"></i> {{ lang === 'zh' ? '获取评分表' : 'Fetching score sheet' }}</div>
            <div class="loading-step active"><i class="fa-solid fa-spinner fa-spin"></i> {{ lang === 'zh' ? 'AI 逐项评分中...' : 'AI scoring items...' }}</div>
          </div>
        </div>
      </div>

      <div ref="reportBodyRef" class="report-drawer-body" v-else-if="scoringState === 'insufficient'">
        <div class="report-loading" style="text-align:center;padding:60px 20px;">
          <div class="report-loading-icon" style="color:#e6a23c;"><i class="fa-solid fa-circle-exclamation"></i></div>
          <div class="report-loading-title">{{ lang === 'zh' ? '数据不足，无法评分' : 'Insufficient Data for Scoring' }}</div>
          <div class="report-loading-desc">{{ scoringError || (lang === 'zh' ? '学员操作记录内容过少，不足以支撑有效评分。请完成更多考核操作后再查看报告。' : 'The training records contain too little content for meaningful scoring. Please complete more operations before viewing the report.') }}</div>
        </div>
      </div>

      <div ref="reportBodyRef" class="report-drawer-body" v-else-if="reportAssessmentData">
        <!-- 降级模式警告 -->
        <div v-if="scoringState === 'fallback'" class="fallback-banner">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <span v-if="scoringError">{{ scoringError }}</span>
          <span v-else>{{ lang === 'zh' ? 'AI 评分服务暂不可用，当前显示为演示数据，不代表真实评分结果。' : 'AI scoring unavailable. Displaying demo data — not actual scores.' }}</span>
        </div>
        <div ref="reportContentRef" class="report-print-area">

          <!-- ═══ 顶部三栏：分数 / 考生 / 病例 ═══ -->
          <div class="report-top-row">
            <div class="report-score-card">
              <div class="score-big">{{ reportScoringCalcTotal }}<span class="score-unit">分</span></div>
              <span class="score-badge" :class="scoreRatio >= 0.85 ? 'score-pass-high' : scoreRatio >= 0.6 ? 'score-pass' : 'score-fail'">
                {{ scoreRatio >= 0.85 ? (lang === 'zh' ? '优秀' : 'Excellent') : scoreRatio >= 0.6 ? (lang === 'zh' ? '达标' : 'Pass') : (lang === 'zh' ? '未达标' : 'Fail') }}
              </span>
              <p class="score-praise">{{ aiPraise }}</p>
            </div>

            <div class="report-info-card">
              <div class="info-avatar info-avatar-student">
                <i class="fa-solid fa-user-graduate"></i>
              </div>
              <div class="info-body">
                <div class="info-row"><span class="info-label">姓名</span><span>李医生</span></div><!-- TODO: 接入用户系统后替换为真实姓名 -->
                <div class="info-row"><span class="info-label">专业</span><span>{{ lang === 'zh' ? '内科专业' : 'Internal Medicine' }}</span></div>
                <div class="info-row"><span class="info-label">年级</span><span>{{ lang === 'zh' ? '2024级' : '2024' }}</span></div>
              </div>
            </div>

            <div class="report-info-card">
              <div class="info-avatar info-avatar-patient" :class="{ 'has-img': patientInfo.avatar && patientInfo.avatar.indexOf('images/') === 0 }" :style="patientInfo.avatar && patientInfo.avatar.indexOf('images/') === 0 ? { backgroundImage: 'url(' + patientInfo.avatar + ')', backgroundSize: 'cover', backgroundPosition: 'center' } : {}">
                <span v-if="!(patientInfo.avatar && patientInfo.avatar.indexOf('images/') === 0)">{{ patientInfo.name ? patientInfo.name.charAt(0) : '?' }}</span>
              </div>
              <div class="info-body">
                <div class="info-row"><span class="info-label">患者</span><strong>{{ patientInfo.name || '' }}</strong><span class="info-meta">{{ patientInfo.age || '' }}{{ lang === 'zh' ? '岁' : 'y' }}</span></div>
                <div class="info-row info-row-sm">病例：{{ c.case_id || c.id }} {{ c.title }}</div>
                <div class="info-row info-row-sm">性别：{{ patientInfo.sex || patientInfo.gender || '' }} | 职业：{{ patientInfo.occupation || '' }}</div>
                <div class="info-row info-row-sm">主诉：{{ c.chief_complaint || c.chiefComplaint }}</div>
              </div>
            </div>
          </div>

          <!-- ═══ Tab 导航 ═══ -->
          <div class="report-tab-bar">
            <button class="report-tab" :class="{ active: reportTab === 'comprehensive' }" @click="switchReportTab('comprehensive')">
              <i class="fa-solid fa-file-lines"></i>综合评价
            </button>
            <button class="report-tab" :class="{ active: reportTab === 'scoring' }" @click="switchReportTab('scoring')">
              <i class="fa-solid fa-table-list"></i>得分详情
            </button>
            <button class="report-tab" :class="{ active: reportTab === 'operations' }" @click="switchReportTab('operations')">
              <i class="fa-solid fa-list-check"></i>操作记录
            </button>
            <button v-if="profileAnalysis" class="report-tab" :class="{ active: reportTab === 'profile' }" @click="switchReportTab('profile')">
              <i class="fa-solid fa-brain"></i>剖面分析
            </button>
          </div>

          <!-- ═══ 综合评价 ═══ -->
          <template v-if="reportTab === 'comprehensive'">
            <div class="report-section" v-if="reportAssessmentData.comprehensive_evaluation.overall_performance">
              <div v-if="reportAssessmentData.comprehensive_evaluation.overall_performance.strengths && reportAssessmentData.comprehensive_evaluation.overall_performance.strengths.length" class="eval-block">
                <h4 class="eval-title"><i class="fa-solid fa-star"></i>核心亮点</h4>
                <div class="eval-tags">
                  <span v-for="s in reportAssessmentData.comprehensive_evaluation.overall_performance.strengths" :key="s" class="eval-tag eval-tag-good">{{ s }}</span>
                </div>
              </div>
              <div v-if="reportAssessmentData.comprehensive_evaluation.overall_performance.weaknesses && reportAssessmentData.comprehensive_evaluation.overall_performance.weaknesses.length" class="eval-block">
                <h4 class="eval-title"><i class="fa-solid fa-triangle-exclamation"></i>关键失分点</h4>
                <div class="eval-tags">
                  <span v-for="w in reportAssessmentData.comprehensive_evaluation.overall_performance.weaknesses" :key="w" class="eval-tag eval-tag-bad">{{ w }}</span>
                </div>
              </div>
            </div>

            <div class="report-section" v-if="reportAssessmentData.comprehensive_evaluation.radar_chart">
              <h4 class="eval-title">临床胜任力雷达图</h4>
              <div class="radar-wrap">
                <canvas ref="radarCanvas" width="280" height="280"></canvas>
                <div class="radar-legend">
                  <div v-for="label in radarLabels" :key="label.key" class="radar-legend-item">
                    <span class="radar-dot"></span>
                    <strong>{{ label.name }}</strong>
                    <span class="radar-score">{{ label.score }}/10</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="report-section" v-if="reportAssessmentData.comprehensive_evaluation.overall_conclusion">
              <h4 class="eval-title">总结评语</h4>
              <div class="conclusion-card">
                {{ reportAssessmentData.comprehensive_evaluation.overall_conclusion }}
              </div>
            </div>

            <div class="report-section" v-if="reportAssessmentData.comprehensive_evaluation.improvement_plan">
              <h4 class="eval-title">个性化改进计划</h4>
              <div v-if="reportAssessmentData.comprehensive_evaluation.improvement_plan.immediate_actions && reportAssessmentData.comprehensive_evaluation.improvement_plan.immediate_actions.length" class="plan-group">
                <h5 class="plan-subtitle">立即行动项</h5>
                <div v-for="a in reportAssessmentData.comprehensive_evaluation.improvement_plan.immediate_actions" :key="a" class="plan-item plan-item-action">{{ a }}</div>
              </div>
              <div v-if="reportAssessmentData.comprehensive_evaluation.improvement_plan.targeted_training && reportAssessmentData.comprehensive_evaluation.improvement_plan.targeted_training.length" class="plan-group">
                <h5 class="plan-subtitle">针对性训练</h5>
                <div v-for="t in reportAssessmentData.comprehensive_evaluation.improvement_plan.targeted_training" :key="t" class="plan-item plan-item-training">{{ t }}</div>
              </div>
              <div v-if="reportAssessmentData.comprehensive_evaluation.improvement_plan.recommended_resources && reportAssessmentData.comprehensive_evaluation.improvement_plan.recommended_resources.length" class="plan-group">
                <h5 class="plan-subtitle">推荐资源</h5>
                <div v-for="r in reportAssessmentData.comprehensive_evaluation.improvement_plan.recommended_resources" :key="r.type" class="plan-item plan-item-resource">
                  <strong>{{ r.type }}</strong> — {{ r.focus }}
                  <p class="resource-why">{{ r.why }}</p>
                </div>
              </div>
            </div>

            <!-- 综合分析未生成提示 -->
            <div class="report-section integration-unavailable" v-if="showIntegrationUnavailable">
              <div class="integration-unavailable-card">
                <i class="fa-solid fa-circle-info"></i>
                <div>
                  <strong>{{ lang === 'zh' ? '跨考站综合分析未生成' : 'Cross-Station Analysis Unavailable' }}</strong>
                  <p>{{ lang === 'zh' ? '综合分析（能力阶段定位、跨剖面整合、发展导航）需要至少完成 2 个不同类型的考站才能生成。当前仅完成 1 个考站，数据不足以进行跨剖面对比分析。请继续完成更多考站训练后查看完整报告。' : 'Comprehensive analysis (stage assessment, cross-profile integration, development navigation) requires data from at least 2 different station types. Only 1 station was completed — insufficient data for cross-profile comparison. Complete more stations to unlock the full report.' }}</p>
                </div>
              </div>
            </div>

            <!-- ═══ Part A: 能力阶段定位 ═══ -->
            <div class="report-section" v-if="reportAssessmentData.comprehensive_evaluation.stage">
              <h4 class="eval-title"><i class="fa-solid fa-signal"></i>能力发展阶段定位</h4>
              <div v-if="reportAssessmentData.comprehensive_evaluation.portrait" class="stage-portrait">
                <i class="fa-solid fa-quote-left"></i>
                {{ reportAssessmentData.comprehensive_evaluation.portrait }}
              </div>
              <div v-if="reportAssessmentData.comprehensive_evaluation.ability_tags && reportAssessmentData.comprehensive_evaluation.ability_tags.length" class="stage-tags">
                <span v-for="tag in reportAssessmentData.comprehensive_evaluation.ability_tags" :key="tag" class="stage-tag">{{ tag }}</span>
              </div>
              <div v-if="reportAssessmentData.comprehensive_evaluation.stage" class="stage-grid">
                <div v-for="(sd, dimName) in reportAssessmentData.comprehensive_evaluation.stage" :key="dimName" class="stage-dim-card">
                  <div class="stage-dim-label">{{ { safety_literacy: '安全素养', clinical_reasoning: '临床推理', clinical_skill: '临床技能', communication: '沟通关系', professionalism: '专业素养' }[dimName] || dimName }}</div>
                  <div class="stage-badge" :class="'stage-' + (sd.stage || 'S2').toLowerCase()">{{ sd.stage_label || sd.stage || '未知' }}</div>
                  <div class="stage-confidence" v-if="sd.confidence">置信度: {{ sd.confidence }}</div>
                </div>
              </div>
              <div v-if="reportAssessmentData.comprehensive_evaluation.imbalance?.has_imbalance" class="stage-imbalance">
                <i class="fa-solid fa-scale-unbalanced"></i>
                维度不均衡：{{ reportAssessmentData.comprehensive_evaluation.imbalance.gap_description || (reportAssessmentData.comprehensive_evaluation.imbalance.leading_dimension + '领先，' + reportAssessmentData.comprehensive_evaluation.imbalance.lagging_dimension + '滞后') }}
              </div>
              <div v-if="reportAssessmentData.comprehensive_evaluation.assessability_note" class="stage-assessability text-muted">
                <i class="fa-solid fa-info-circle"></i> {{ reportAssessmentData.comprehensive_evaluation.assessability_note }}
              </div>
            </div>

            <!-- ═══ Part C: 根因分析 ═══ -->
            <div class="report-section" v-if="reportAssessmentData.comprehensive_evaluation.integration?.root_cause_analysis || reportAssessmentData.comprehensive_evaluation.integration?.dimension_assessment">
              <h4 class="eval-title"><i class="fa-solid fa-magnifying-glass-chart"></i>跨剖面整合分析</h4>

              <!-- 维度综合判定 -->
              <div v-if="reportAssessmentData.comprehensive_evaluation.integration?.dimension_assessment" class="dim-assessment-grid">
                <div v-for="(da, dimName) in reportAssessmentData.comprehensive_evaluation.integration.dimension_assessment" :key="dimName" class="dim-assess-card" :class="'assess-' + (da.convergence === '收敛' ? 'converge' : da.convergence === '发散' ? 'diverge' : 'single')">
                  <div class="dim-assess-header">
                    <span class="dim-assess-label">{{ { safety_literacy: '安全素养', clinical_reasoning: '临床推理', clinical_skill: '临床技能', communication: '沟通关系', professionalism: '专业素养' }[dimName] || dimName }}</span>
                    <span class="dim-assess-rating" :class="'rating-' + (da.rating || 'unknown').replace('无法评估', 'unknown')">{{ da.rating }}</span>
                    <span class="dim-assess-conf">置信{{ da.confidence || '–' }}</span>
                  </div>
                  <div class="dim-assess-evidence">{{ da.evidence_summary }}</div>
                  <div v-if="da.key_findings?.length" class="dim-assess-findings">
                    <span v-for="f in da.key_findings" :key="f" class="finding-tag">{{ f }}</span>
                  </div>
                </div>
              </div>

              <!-- 主要根因 -->
              <div v-if="reportAssessmentData.comprehensive_evaluation.integration?.root_cause_analysis?.primary_root_cause" class="root-cause-card">
                <div class="root-cause-label">主要根因</div>
                <div class="root-cause-hypothesis">{{ reportAssessmentData.comprehensive_evaluation.integration.root_cause_analysis.primary_root_cause.hypothesis }}</div>
                <div class="root-cause-reasoning">{{ reportAssessmentData.comprehensive_evaluation.integration.root_cause_analysis.primary_root_cause.reasoning }}</div>
                <div v-if="reportAssessmentData.comprehensive_evaluation.integration.root_cause_analysis.primary_root_cause.alternative_explanation" class="root-cause-alt">
                  <strong>排除的替代解释：</strong>{{ reportAssessmentData.comprehensive_evaluation.integration.root_cause_analysis.primary_root_cause.alternative_explanation }}
                  <span v-if="reportAssessmentData.comprehensive_evaluation.integration.root_cause_analysis.primary_root_cause.why_ruled_out"> — {{ reportAssessmentData.comprehensive_evaluation.integration.root_cause_analysis.primary_root_cause.why_ruled_out }}</span>
                </div>
              </div>

              <!-- 跨维度关联模式 -->
              <div v-if="reportAssessmentData.comprehensive_evaluation.integration?.root_cause_analysis?.cross_dimension_patterns?.length" class="cross-patterns">
                <h5 class="plan-subtitle">跨维度关联模式</h5>
                <div v-for="pt in reportAssessmentData.comprehensive_evaluation.integration.root_cause_analysis.cross_dimension_patterns" :key="pt.pattern_name" class="pattern-card">
                  <strong>{{ pt.pattern_name }}</strong>
                  <span class="pattern-dims">影响维度: {{ (pt.affected_dimensions || []).join('、') }}</span>
                  <p>{{ pt.evidence }}</p>
                </div>
              </div>

              <!-- Part C 整体叙述 -->
              <div v-if="reportAssessmentData.comprehensive_evaluation.integration?.narrative" class="integration-narrative">
                <i class="fa-solid fa-align-left"></i>
                {{ reportAssessmentData.comprehensive_evaluation.integration.narrative }}
              </div>
            </div>

            <!-- ═══ Part D: 发展导航 ═══ -->
            <div class="report-section" v-if="reportAssessmentData.comprehensive_evaluation.core_prescription || reportAssessmentData.comprehensive_evaluation.priority">
              <h4 class="eval-title"><i class="fa-solid fa-compass"></i>发展导航</h4>

              <!-- 优先级排序 -->
              <div v-if="reportAssessmentData.comprehensive_evaluation.priority?.ranked_issues?.length" class="priority-section">
                <h5 class="plan-subtitle">问题优先级</h5>
                <p v-if="reportAssessmentData.comprehensive_evaluation.priority.primary_focus" class="priority-focus">
                  <strong>重点聚焦：</strong>{{ reportAssessmentData.comprehensive_evaluation.priority.primary_focus }}
                </p>
                <div v-for="item in reportAssessmentData.comprehensive_evaluation.priority.ranked_issues" :key="item.rank" class="priority-item" :class="{ 'priority-top': item.rank === 1 }">
                  <span class="priority-rank" :class="'rank-' + item.rank">#{{ item.rank }}</span>
                  <div class="priority-body">
                    <div class="priority-issue">{{ item.issue }}</div>
                    <div class="priority-rationale">{{ item.priority_rationale }}</div>
                  </div>
                </div>
                <p v-if="reportAssessmentData.comprehensive_evaluation.priority.priority_narrative" class="priority-narrative text-muted">
                  {{ reportAssessmentData.comprehensive_evaluation.priority.priority_narrative }}
                </p>
              </div>

              <!-- 核心处方 -->
              <div v-if="reportAssessmentData.comprehensive_evaluation.core_prescription" class="prescription-card">
                <div class="presc-item">
                  <span class="presc-label">针对根因</span>
                  <span>{{ reportAssessmentData.comprehensive_evaluation.core_prescription.target_root_cause || '—' }}</span>
                </div>
                <div class="presc-item">
                  <span class="presc-label">当前状态</span>
                  <span>{{ reportAssessmentData.comprehensive_evaluation.core_prescription.current_state }}</span>
                </div>
                <div class="presc-item">
                  <span class="presc-label">目标状态</span>
                  <span>{{ reportAssessmentData.comprehensive_evaluation.core_prescription.target_state }}</span>
                </div>
                <div class="presc-item">
                  <span class="presc-label">干预方法</span>
                  <span>{{ reportAssessmentData.comprehensive_evaluation.core_prescription.method }}</span>
                </div>
                <div class="presc-item">
                  <span class="presc-label">检验标准</span>
                  <span>{{ reportAssessmentData.comprehensive_evaluation.core_prescription.verification }}</span>
                </div>
              </div>

              <!-- 发展叙述 -->
              <div v-if="reportAssessmentData.comprehensive_evaluation.navigation_narrative" class="nav-narrative">
                <i class="fa-solid fa-feather"></i>
                {{ reportAssessmentData.comprehensive_evaluation.navigation_narrative }}
              </div>
            </div>

            <!-- ═══ 数据局限性 ═══ -->
            <div class="report-section" v-if="reportAssessmentData.comprehensive_evaluation.integration?.data_limitations">
              <h4 class="eval-title"><i class="fa-solid fa-triangle-exclamation"></i>数据局限性声明</h4>
              <div class="limitations-card">
                <p v-if="reportAssessmentData.comprehensive_evaluation.integration.data_limitations.assessable_dimensions?.length">
                  <strong>可充分评估：</strong>{{ reportAssessmentData.comprehensive_evaluation.integration.data_limitations.assessable_dimensions.join('、') }}
                </p>
                <p v-if="reportAssessmentData.comprehensive_evaluation.integration.data_limitations.limited_dimensions?.length">
                  <strong>证据有限：</strong>{{ reportAssessmentData.comprehensive_evaluation.integration.data_limitations.limited_dimensions.join('、') }}
                </p>
                <p class="text-muted">{{ reportAssessmentData.comprehensive_evaluation.integration.data_limitations.narrative }}</p>
              </div>
            </div>
          </template>


          <!-- ═══ 得分详情 ═══ -->
          <template v-if="reportTab === 'scoring'">
            <div v-if="activeSheetGroups && activeSheetGroups.length > 1" class="sheet-tabs">
              <button v-for="(sg, i) in activeSheetGroups" :key="i" class="sheet-tab" :class="{ active: activeSheetIdx === i }" @click="activeSheetIdx = i">{{ sg.name }}</button>
            </div>
            <div class="table-wrap">
              <table class="data-table scoring-table">
                <thead>
                  <tr>
                    <th class="col-num">序号</th>
                    <th>考核项目</th>
                    <th>评分项</th>
                    <th>评分要点</th>
                    <th class="col-score">分值 ({{ currentMaxTotal }})</th>
                    <th class="col-score">得分 ({{ currentCalcTotal }})</th>
                    <th class="col-evidence">评分依据</th>
                    <th class="col-link">关联对话</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in scoringItemsWithSpan" :key="item.item_id" :class="{ 'row-low': item.awarded_score < item.max_score * 0.6 && item.max_score > 0 }">
                    <td class="td-center">{{ item.item_id }}</td>
                    <td v-if="item._showCategory" :rowspan="item._categorySpan">{{ item.category || '-' }}</td>
                    <td v-if="item._showSubcategory" :rowspan="item._subcategorySpan">{{ item.subcategory || '-' }}</td>
                    <td>{{ item.name || '-' }}</td>
                    <td class="td-center">{{ item.max_score ?? '-' }}</td>
                    <td class="td-center" :class="{ 'sc-danger': item.awarded_score < item.max_score * 0.6 && item.max_score > 0, 'sc-full': item.awarded_score === item.max_score, 'sc-mid': item.awarded_score >= item.max_score * 0.6 && item.awarded_score < item.max_score }">{{ item.awarded_score ?? '-' }}</td>
                    <td class="td-evidence">{{ item.evidence || '-' }}</td>
                    <td class="td-center">
                      <a v-if="item.related_dialogue_ids && item.related_dialogue_ids.length" class="link" @click.stop="openDialogueDialog(item)"><i class="fa-solid fa-message"></i> 查看 ({{ item.related_dialogue_ids.length }})</a>
                      <span v-else class="text-muted">—</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>

          <!-- ═══ 操作记录 ═══ -->
          <template v-if="reportTab === 'operations'">
            <div class="op-sub-bar" v-if="opTabs.length > 1">
              <button v-for="tab in opTabs" :key="tab.key"
                class="op-sub-btn" :class="{ active: opSubTab === tab.key }"
                @click="switchOpSubTab(tab.key)">{{ tab.label }}</button>
            </div>

            <template v-if="activeOpTab">
              <!-- 人文沟通：学员/患者角色分列 -->
              <template v-if="activeOpTab.type === 'humanity'">
                <div v-if="realHumanityMessages.length" class="table-wrap">
                  <table class="data-table">
                    <thead>
                      <tr><th class="col-num">{{ lang === 'zh' ? '序号' : '#' }}</th><th class="col-time">{{ lang === 'zh' ? '时间' : 'Time' }}</th><th>{{ lang === 'zh' ? '学员' : 'Doctor' }}</th><th>{{ lang === 'zh' ? '患者' : 'Patient' }}</th></tr>
                    </thead>
                    <tbody>
                      <tr v-for="(m, idx) in realHumanityMessages" :key="idx">
                        <td class="td-center">{{ idx + 1 }}</td>
                        <td class="td-nowrap">{{ m.time || '-' }}</td>
                        <td>{{ m.role === 'user' ? m.content : '' }}</td>
                        <td>{{ m.role === 'sp' || m.role === 'system' ? m.content : '' }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div v-else class="empty-state">{{ lang === 'zh' ? '暂无记录' : 'No records' }}</div>
              </template>

              <!-- 病史采集对话：学员提问/患者回答 -->
              <template v-else-if="activeOpTab.type === 'dialog'">
                <div v-if="opSubTabRows.length" class="table-wrap">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th class="col-num">{{ lang === 'zh' ? '序号' : '#' }}</th>
                        <th class="col-time">{{ lang === 'zh' ? '时间' : 'Time' }}</th>
                        <th>{{ lang === 'zh' ? '学员提问' : 'Doctor' }}</th>
                        <th>{{ lang === 'zh' ? '患者回答' : 'Patient' }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(row, idx) in opSubTabRows" :key="idx">
                        <td class="td-center">{{ idx + 1 }}</td>
                        <td class="td-nowrap">{{ row.time }}</td>
                        <td>{{ row.item }}</td>
                        <td>{{ row.answer }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div v-else class="empty-state">{{ lang === 'zh' ? '暂无对话记录' : 'No dialogue records' }}</div>
              </template>

              <!-- 体格检查：检查项目/结果 -->
              <template v-else-if="activeOpTab.type === 'exam'">
                <div v-if="opSubTabRows.length" class="table-wrap">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th class="col-num">{{ lang === 'zh' ? '序号' : '#' }}</th>
                        <th class="col-time">{{ lang === 'zh' ? '时间' : 'Time' }}</th>
                        <th>{{ lang === 'zh' ? '检查项目' : 'Exam Item' }}</th>
                        <th>{{ lang === 'zh' ? '检查结果' : 'Result' }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(row, idx) in opSubTabRows" :key="idx">
                        <td class="td-center">{{ idx + 1 }}</td>
                        <td class="td-nowrap">{{ row.time }}</td>
                        <td>{{ row.item }}</td>
                        <td>{{ row.answer }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div v-else class="empty-state">{{ lang === 'zh' ? '暂无记录' : 'No records' }}</div>
              </template>

              <!-- 初步诊断 -->
              <template v-else-if="activeOpTab.type === 'diagnosis'">
                <div v-if="realDiagnosis" class="op-card">
                  <div class="op-field"><span class="op-field-label">{{ lang === 'zh' ? '初步诊断：' : 'Preliminary Diagnosis: ' }}</span>{{ realDiagnosis.preliminary || (lang === 'zh' ? '未填写' : 'Not filled') }}</div>
                  <div class="op-field" v-if="realDiagnosis.basis">
                    <span class="op-field-label">{{ lang === 'zh' ? '诊断依据：' : 'Diagnostic Basis: ' }}</span>
                    <div class="op-field-text">{{ realDiagnosis.basis }}</div>
                  </div>
                  <div class="op-field"><span class="op-field-label">{{ lang === 'zh' ? '鉴别诊断：' : 'Differential Diagnosis: ' }}</span>{{ realDiagnosis.differential || (lang === 'zh' ? '未填写' : 'Not filled') }}</div>
                </div>
                <div v-else class="empty-state">{{ lang === 'zh' ? '暂无诊断记录' : 'No diagnosis records' }}</div>
              </template>

              <!-- 治疗计划 -->
              <template v-else-if="activeOpTab.type === 'treatment'">
                <div v-if="realTreatment?.content" class="op-card">
                  <div class="op-field-text">{{ realTreatment.content }}</div>
                </div>
                <div v-else class="empty-state">{{ lang === 'zh' ? '暂无治疗计划' : 'No treatment plan' }}</div>
              </template>

              <!-- 病历书写 -->
              <template v-else-if="activeOpTab.type === 'record'">
                <div v-if="realMedicalRecord" class="op-card">
                  <div class="op-field-text" style="white-space: pre-wrap;">{{ realMedicalRecord }}</div>
                </div>
                <div v-else class="empty-state">{{ lang === 'zh' ? '暂无病历记录' : 'No medical record' }}</div>
              </template>

              <!-- 病例分析 QA -->
              <template v-else-if="activeOpTab.type === 'analysis'">
                <div v-if="analysisQARecords.length">
                  <div v-for="(qa, idx) in analysisQARecords" :key="idx" class="op-card">
                    <div class="op-field"><span class="op-field-label">{{ lang === 'zh' ? '第'+(idx+1)+'题：' : 'Q'+(idx+1)+': ' }}</span>{{ qa.q }}</div>
                    <div class="op-field"><span class="op-field-label">{{ lang === 'zh' ? '回答：' : 'Answer: ' }}</span><div class="op-field-text">{{ qa.a }}</div></div>
                  </div>
                </div>
                <div v-else class="empty-state">{{ lang === 'zh' ? '暂无病例分析记录' : 'No case analysis records' }}</div>
              </template>
            </template>
          </template>

          <!-- ═══ Part B 剖面分析 ═══ -->
          <template v-if="reportTab === 'profile' && profileAnalysis">
            <div class="report-section" v-if="profileAnalysis.coverage">
              <h4 class="eval-title"><i class="fa-solid fa-bullseye"></i> L1 信息覆盖分析</h4>
              <div class="profile-coverage-bar">
                <div class="coverage-stats">
                  <span class="cov-stat cov-covered">{{ profileAnalysis.coverage.covered || 0 }} 已覆盖</span>
                  <span class="cov-stat cov-partial">{{ profileAnalysis.coverage.partial || 0 }} 部分覆盖</span>
                  <span class="cov-stat cov-missed">{{ profileAnalysis.coverage.missed || 0 }} 遗漏</span>
                  <span class="cov-rate">{{ Math.round((profileAnalysis.coverage.coverage_rate || 0) * 100) }}%</span>
                </div>
                <div class="coverage-bar-track">
                  <div class="coverage-bar-fill" :style="{ width: Math.round((profileAnalysis.coverage.coverage_rate || 0) * 100) + '%' }"></div>
                </div>
              </div>
              <div v-if="profileAnalysis.coverage.missed_high_importance?.length" class="missed-high">
                <span class="missed-label"><i class="fa-solid fa-triangle-exclamation"></i> 高重要性遗漏：</span>
                <span v-for="m in profileAnalysis.coverage.missed_high_importance" :key="m" class="missed-tag">{{ m }}</span>
              </div>
              <p class="profile-narrative">{{ profileAnalysis.coverage.narrative }}</p>
              <details class="profile-details">
                <summary>查看完整信息点清单 ({{ profileAnalysis.coverage.key_points?.length || 0 }})</summary>
                <table class="data-table" style="width:100%;margin-top:8px;">
                  <thead><tr><th>信息点</th><th>分类</th><th>状态</th><th>重要性</th><th>证据</th></tr></thead>
                  <tbody>
                    <tr v-for="(kp, i) in (profileAnalysis.coverage.key_points || [])" :key="i" :class="'row-' + kp.status">
                      <td>{{ kp.point }}</td>
                      <td>{{ kp.category }}</td>
                      <td><span :class="'badge-' + kp.status">{{ kp.status === 'covered' ? '已覆盖' : kp.status === 'partial' ? '部分' : '遗漏' }}</span></td>
                      <td><span :class="'badge-' + kp.clinical_importance">{{ kp.clinical_importance === 'high' ? '高' : kp.clinical_importance === 'medium' ? '中' : '低' }}</span></td>
                      <td class="td-wrap">{{ kp.evidence }}</td>
                    </tr>
                  </tbody>
                </table>
              </details>
            </div>

            <div class="report-section" v-if="profileAnalysis.strategy">
              <h4 class="eval-title"><i class="fa-solid fa-chess"></i> L2 行为策略分析</h4>
              <div class="strategy-badge-wrap">
                <span class="strategy-type-badge" :class="'strat-' + profileAnalysis.strategy.type">
                  {{ profileAnalysis.strategy.type === 'hypothesis_driven' ? '假设驱动型' : profileAnalysis.strategy.type === 'template_driven' ? '模板覆盖型' : '随机跳跃型' }}
                </span>
                <span class="strategy-confidence">置信度：{{ profileAnalysis.strategy.confidence === 'high' ? '高' : profileAnalysis.strategy.confidence === 'medium' ? '中' : '低' }}</span>
              </div>
              <div class="strategy-chars" v-if="profileAnalysis.strategy.characteristics">
                <div class="char-row"><span>开放性问题占比</span><span>{{ profileAnalysis.strategy.characteristics.open_ended_ratio }}</span></div>
                <div class="char-row"><span>追问深度</span><span>{{ profileAnalysis.strategy.characteristics.follow_up_depth === 'deep' ? '深层追问' : profileAnalysis.strategy.characteristics.follow_up_depth === 'moderate' ? '中等' : '浅层' }}</span></div>
                <div class="char-row"><span>序列逻辑</span><span>{{ profileAnalysis.strategy.characteristics.sequence_logic === 'coherent' ? '连贯有序' : profileAnalysis.strategy.characteristics.sequence_logic === 'loose' ? '大体有序' : '松散跳跃' }}</span></div>
                <div class="char-row"><span>时间分配</span><span>{{ profileAnalysis.strategy.characteristics.time_allocation === 'balanced' ? '均衡' : profileAnalysis.strategy.characteristics.time_allocation === 'front_heavy' ? '前期偏重' : profileAnalysis.strategy.characteristics.time_allocation === 'back_heavy' ? '后期匆忙' : '仓促' }}</span></div>
              </div>
              <div v-if="profileAnalysis.strategy.behavioral_features?.length" class="eval-block">
                <h5>行为特征</h5>
                <div class="eval-tags">
                  <span v-for="bf in profileAnalysis.strategy.behavioral_features" :key="bf" class="eval-tag">{{ bf }}</span>
                </div>
              </div>
              <p class="profile-narrative">{{ profileAnalysis.strategy.narrative }}</p>
            </div>

            <div class="report-section" v-if="profileAnalysis.hypothesis_activity">
              <h4 class="eval-title"><i class="fa-solid fa-lightbulb"></i> L3 认知过程还原</h4>
              <div v-if="profileAnalysis.hypothesis_activity.initial_hypotheses?.length" class="initial-hypotheses">
                <span class="ih-label">初始诊断假设：</span>
                <span v-for="h in profileAnalysis.hypothesis_activity.initial_hypotheses" :key="h" class="ih-tag">{{ h }}</span>
              </div>
              <div v-if="profileAnalysis.hypothesis_activity.reasoning_mode" class="reasoning-mode">
                推理模式：<strong>{{ profileAnalysis.hypothesis_activity.reasoning_mode === 'intuitive' ? '直觉型' : profileAnalysis.hypothesis_activity.reasoning_mode === 'analytical' ? '分析型' : '混合型' }}</strong>
                <span v-if="profileAnalysis.hypothesis_activity.premature_closure" class="warning-tag"><i class="fa-solid fa-triangle-exclamation"></i> 过早关闭</span>
              </div>
              <div v-if="profileAnalysis.hypothesis_activity.narrowing_point?.description" class="narrowing-point">
                <strong>假设收窄：</strong>{{ profileAnalysis.hypothesis_activity.narrowing_point.description }}
              </div>
              <div v-if="profileAnalysis.hypothesis_activity.cognitive_biases?.length" class="bias-warnings">
                <div v-for="(bias, i) in profileAnalysis.hypothesis_activity.cognitive_biases" :key="i" class="bias-item" :class="'bias-' + bias.severity">
                  <span class="bias-type">{{ bias.type === 'confirmation_bias' ? '确认偏误' : bias.type === 'anchoring' ? '锚定效应' : bias.type === 'premature_closure' ? '过早关闭' : bias.type === 'availability' ? '可得性偏误' : bias.type === 'framing' ? '框架效应' : bias.type }}</span>
                  <span class="bias-severity">{{ bias.severity === 'high' ? '严重' : bias.severity === 'medium' ? '中等' : '轻微' }}</span>
                  <p class="bias-evidence">{{ bias.evidence }}</p>
                </div>
              </div>
              <details class="profile-details" v-if="profileAnalysis.hypothesis_activity.hypothesis_evolution?.length">
                <summary>假设演化时间线</summary>
                <div class="hypothesis-timeline">
                  <div v-for="(ev, i) in profileAnalysis.hypothesis_activity.hypothesis_evolution" :key="i" class="timeline-item" :class="'action-' + ev.action">
                    <span class="tl-turn">{{ ev.turn_range }}</span>
                    <span class="tl-action">{{ ev.action === 'generate' || ev.action === '生成' ? '💡' : ev.action === 'reinforce' || ev.action === '强化' ? '🔍' : '❌' }}</span>
                    <span class="tl-hypothesis">{{ ev.hypothesis }}</span>
                    <span class="tl-evidence">{{ ev.evidence }}</span>
                  </div>
                </div>
              </details>
              <p class="profile-narrative">{{ profileAnalysis.hypothesis_activity.narrative }}</p>
            </div>

            <div class="report-section" v-if="profileAnalysis.safety">
              <h4 class="eval-title"><i class="fa-solid fa-shield-halved"></i> L4 安全行为分析</h4>
              <div class="strategy-badge-wrap">
                <span class="strategy-type-badge" :class="'safety-' + profileAnalysis.safety.safety_pattern">
                  {{ profileAnalysis.safety.safety_pattern === 'active_screening' ? '主动筛查' : profileAnalysis.safety.safety_pattern === 'triggered_reactive' ? '被动反应' : '安全忽视' }}
                </span>
                <span class="strategy-confidence">红旗征象 {{ profileAnalysis.safety.red_flags_screened }}/{{ profileAnalysis.safety.red_flags_total }} 已筛查</span>
              </div>
              <div class="profile-coverage-bar">
                <div class="coverage-bar-track">
                  <div class="coverage-bar-fill" :style="{ width: Math.round((profileAnalysis.safety.screening_rate || 0) * 100) + '%', background: profileAnalysis.safety.screening_rate > 0.6 ? 'var(--primary)' : profileAnalysis.safety.screening_rate > 0.3 ? '#f59e0b' : '#ef4444' }"></div>
                </div>
              </div>
              <p class="profile-narrative">{{ profileAnalysis.safety.narrative }}</p>
              <details class="profile-details" v-if="profileAnalysis.safety.red_flags?.length">
                <summary>红旗征象清单 ({{ profileAnalysis.safety.red_flags.length }})</summary>
                <table class="data-table" style="width:100%;margin-top:8px;">
                  <thead><tr><th>红旗征象</th><th>状态</th><th>轮次</th><th>筛查方式</th></tr></thead>
                  <tbody>
                    <tr v-for="(rf, i) in profileAnalysis.safety.red_flags" :key="i" :class="rf.screened ? 'row-covered' : 'row-missed'">
                      <td>{{ rf.sign }}</td>
                      <td><span :class="rf.screened ? 'badge-covered' : 'badge-missed'">{{ rf.screened ? '已筛查' : '未筛查' }}</span></td>
                      <td>{{ rf.turn || '—' }}</td>
                      <td class="td-wrap">{{ rf.how_asked }}</td>
                    </tr>
                  </tbody>
                </table>
              </details>
            </div>

            <div class="report-section" v-if="profileAnalysis.relationship">
              <h4 class="eval-title"><i class="fa-solid fa-hand-holding-heart"></i> L5 关系质量分析</h4>
              <div class="strategy-badge-wrap">
                <span class="strategy-type-badge" :class="'empathy-' + profileAnalysis.relationship.empathy_quality">
                  {{ profileAnalysis.relationship.empathy_quality === 'substantive' ? '实质性共情' : profileAnalysis.relationship.empathy_quality === 'superficial' ? '表面共情' : '无共情' }}
                </span>
                <span class="strategy-type-badge" :class="'arc-' + profileAnalysis.relationship.relationship_arc">
                  {{ profileAnalysis.relationship.relationship_arc === 'building' ? '关系建立中' : profileAnalysis.relationship.relationship_arc === 'maintained' ? '关系维持' : profileAnalysis.relationship.relationship_arc === 'distancing' ? '关系疏远' : '中性' }}
                </span>
                <span class="strategy-confidence">情感线索 {{ profileAnalysis.relationship.emotional_cues_responded }}/{{ profileAnalysis.relationship.emotional_cues_total }} 已回应</span>
              </div>
              <div class="profile-coverage-bar">
                <div class="coverage-bar-track">
                  <div class="coverage-bar-fill" :style="{ width: Math.round((profileAnalysis.relationship.response_rate || 0) * 100) + '%', background: profileAnalysis.relationship.response_rate > 0.6 ? 'var(--primary)' : profileAnalysis.relationship.response_rate > 0.3 ? '#f59e0b' : '#ef4444' }"></div>
                </div>
              </div>
              <p class="profile-narrative">{{ profileAnalysis.relationship.narrative }}</p>
              <details class="profile-details" v-if="profileAnalysis.relationship.emotional_cues?.length">
                <summary>情感线索清单 ({{ profileAnalysis.relationship.emotional_cues.length }})</summary>
                <table class="data-table" style="width:100%;margin-top:8px;">
                  <thead><tr><th>轮次</th><th>患者表达</th><th>学员回应</th><th>回应质量</th></tr></thead>
                  <tbody>
                    <tr v-for="(cue, i) in profileAnalysis.relationship.emotional_cues" :key="i" :class="cue.response_quality === 'missed' ? 'row-missed' : cue.response_quality === 'superficial' ? 'row-partial' : 'row-covered'">
                      <td>{{ cue.turn }}</td>
                      <td>{{ cue.patient_expression }}</td>
                      <td>{{ cue.student_response }}</td>
                      <td><span :class="cue.response_quality === 'substantive' ? 'badge-covered' : cue.response_quality === 'superficial' ? 'badge-partial' : 'badge-missed'">{{ cue.response_quality === 'substantive' ? '实质性' : cue.response_quality === 'superficial' ? '表面' : '遗漏' }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </details>
            </div>
          </template>

        </div>
      </div>
    </div>

    <!-- 关联对话弹窗 -->
    <div v-if="showDialogueDialog" class="dialogue-overlay" @click.self="showDialogueDialog = false">
      <div class="dialogue-dialog">
        <div class="dialogue-dialog-header">
          <span><i class="fa-solid fa-message"></i> {{ lang === 'zh' ? '关联对话记录' : 'Related Dialogues' }} ({{ currentDialogueEntries.length }})</span>
          <button class="report-close-btn" @click="showDialogueDialog = false"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="dialogue-dialog-body">
          <table class="data-table" style="table-layout:fixed;width:100%;">
            <thead><tr><th class="col-num">{{ lang === 'zh' ? '序号' : '#' }}</th><th class="col-time">{{ lang === 'zh' ? '时间' : 'Time' }}</th><th>{{ dialogueStationId === 'humanity' ? (lang === 'zh' ? '患者' : 'Patient') : (lang === 'zh' ? '学员' : 'Doctor') }}</th><th>{{ dialogueStationId === 'humanity' ? (lang === 'zh' ? '学员' : 'Doctor') : (lang === 'zh' ? '患者/结果' : 'Patient/Result') }}</th></tr></thead>
            <tbody>
              <tr v-for="(d, idx) in currentDialogueEntries" :key="idx">
                <td class="td-center">{{ idx + 1 }}</td>
                <td class="td-nowrap">{{ d.time }}</td>
                <td class="td-wrap">{{ d.item }}</td>
                <td class="td-wrap">{{ d.answer }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useTrainingStore } from '@/stores/training'
import { PROJECT_TO_STATION_TARGET } from '@/composables/useStationFlow'
import { STATION_TO_SESSION_KEY, PROJECT_TAB_CONFIG } from '@ai-sp/shared'
const router = useRouter()
const route = useRoute()
const store = useTrainingStore()

const lang = ref(store.lang || 'zh')
const reportTab = ref('comprehensive')
const reportAssessmentData = ref(null)
const radarCanvas = ref(null)

const reportContentRef = ref(null)
const activeSheetIdx = ref(0)
const opSubTab = ref('history')
const reportBodyRef = ref(null)
const showDialogueDialog = ref(false)

const isViewMode = computed(() => route.query.source === 'records')
const currentDialogueEntries = ref([])
const dialogueStationId = ref('')
const scoringState = ref('idle') // 'idle' | 'loading' | 'scored' | 'fallback'
const scoringError = ref('')
const profileAnalysis = ref(null) // Part B 剖面分析结果 { coverage, strategy, hypothesis_activity }
const profileTab = ref('coverage') // 'coverage' | 'strategy' | 'cognition'

const record = computed(() => store.currentRecord || { score: 0, stationName: '', stationId: '', duration: 0, time: '' })

/** 将评分结果回写到 localStorage 训练记录，确保 TrainingRecords 弹窗展示最新分数 */
function syncRecordScoreToLocal(score) {
  const sid = record.value?.stationId
  const se = route.query.sessionEpoch || store.sessionEpoch
  if (sid) syncRecordsToLocal({ [sid]: score }, se)
}

/** 批量回写多考站评分到 localStorage（仅匹配当前 sessionEpoch 的记录） */
function syncRecordsToLocal(stationScores, sessionEpoch) {
  if (!stationScores || !Object.keys(stationScores).length) return
  try {
    const RECORDS_KEY = 'training_records'
    const records = JSON.parse(localStorage.getItem(RECORDS_KEY) || '{}')
    const caseId = cid.value
    const se = sessionEpoch || route.query.sessionEpoch || store.sessionEpoch
    let updated = false
    for (const [key, r] of Object.entries(records)) {
      if (r.caseId !== caseId) continue
      if (se && r.sessionEpoch !== se) continue
      const recStationId = r.stationId
      const newScore = stationScores[recStationId]
      if (newScore != null) {
        r.score = newScore
        r.hasReport = true
        r.reportTimestamp = new Date().toISOString()
        updated = true
      }
    }
    if (updated) localStorage.setItem(RECORDS_KEY, JSON.stringify(records))
  } catch (e) { /* ignore */ }
}

const cid = computed(() => route.query.caseId || (store.currentCase ? (store.currentCase.case_id || store.currentCase.id) : ''))
const c = computed(() => store.currentCase || {})

// 患者信息：兼容 patient_info（basic.json）和 patient 两种字段名
const patientInfo = computed(() => {
  const cs = c.value
  return cs.patient_info || cs.patient || {}
})

/**
 * target → stationName 映射（用于确定评分来源站）
 */
const STATION_ID_TO_TARGET = {
  reception: 'historyTaking', historyTaking: 'historyTaking',
  physicalExam: 'physicalExam',
  humanity: 'humanisticComm',
  analysis: 'caseAnalysis',
  preliminaryDiag: 'preliminaryDiag',
  treatmentPlan: 'treatmentPlan',
  medicalRecord: 'medicalRecord',
  mentalExam: 'mentalExam'
}

// 当前考站的考核项目列表（用于操作记录 tab 按钮过滤）
const stationProjects = computed(() => {
  const stations = store.stationScheme || store.stationFlow?.stations || []
  const stId = record.value.stationId
  if (!stId || !stations.length) return null
  const target = STATION_ID_TO_TARGET[stId] || stId
  for (const st of stations) {
    if (st.projects?.length) {
      const hasTarget = st.projects.some(p => {
        const name = typeof p === 'object' ? p.name : p
        return PROJECT_TO_STATION_TARGET[name] === target
      })
      if (hasTarget) return st.projects
    }
  }
  return null // null = 未知考站结构，显示全部按钮（向后兼容）
})

const opTabs = computed(() => {
  const projects = stationProjects.value
  if (!projects || !projects.length) {
    // 回退：显示全部按钮（兼容未知考站结构）
    return [
      { key: 'history', label: '病史采集', type: 'dialog' },
      { key: 'exam', label: '体格检查', type: 'exam' },
      { key: 'diagnosis', label: '初步诊断', type: 'diagnosis' },
      { key: 'treatment', label: '治疗计划', type: 'treatment' },
      { key: 'record', label: '病历书写', type: 'record' },
    ]
  }
  const tabs = []
  for (const p of projects) {
    const name = typeof p === 'object' ? p.name : p
    const cfg = PROJECT_TAB_CONFIG[name]
    if (cfg) tabs.push({ key: cfg.key, label: name, type: cfg.type })
  }
  return tabs
})

// 确保 opSubTab 始终指向一个有效 tab
watch(opTabs, (tabs) => {
  if (!tabs.length) return
  if (!tabs.find(t => t.key === opSubTab.value)) {
    opSubTab.value = tabs[0].key
  }
}, { immediate: true })

const activeOpTab = computed(() => {
  if (!opTabs.value.length) return null
  return opTabs.value.find(t => t.key === opSubTab.value) || opTabs.value[0]
})

const scoreRatio = computed(() => {
  const totalScore = reportAssessmentData.value?.scoring?.total_score
  const totalMax = reportAssessmentData.value?.scoring?.total_max
  if (totalMax && totalMax > 0) return totalScore / totalMax
  return 0
})

const showIntegrationUnavailable = computed(() => {
  const ev = reportAssessmentData.value?.comprehensive_evaluation
  if (!ev) return false
  const hasScoring = reportAssessmentData.value?.scoring?.total_max > 0
  const noStage = !ev.stage
  const noIntegration = !ev.integration?.root_cause_analysis && !ev.integration?.dimension_assessment
  const noNavigation = !ev.core_prescription && !ev.priority
  return hasScoring && noStage && noIntegration && noNavigation
})

const aiPraise = computed(() => {
  const rate = scoreRatio.value
  const zh = lang.value === 'zh'
  if (rate >= 0.9) return zh ? '表现优秀！你是团队的重要资产，继续发光发热！' : 'Outstanding! A vital asset to any team — keep shining!'
  if (rate >= 0.85) return zh ? '非常出色！你的专业能力令人印象深刻，继续保持！' : 'Excellent! Your clinical competence is truly impressive!'
  if (rate >= 0.8) return zh ? '表现良好！稳扎稳打，持续精进，未来可期！' : 'Great job! Keep building on this solid foundation!'
  if (rate >= 0.7) return zh ? '不错的表现！再接再厉，你会越来越优秀！' : 'Good effort! With practice, you will continue to improve.'
  if (rate >= 0.6) return zh ? '还有提升空间，建议针对薄弱环节加强练习。' : 'Room to grow — focus on areas of weakness and practice more.'
  return zh ? '需要加强训练，扎实的基础是成为优秀医生的关键。' : 'Needs more practice. A strong foundation is essential for a great physician.'
})

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return '-'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins > 0) return mins + 'min ' + secs + 's'
  return secs + 's'
}

const analysisQARecords = computed(() => {
  const session = store.trainingSession || {}
  const qs = session.caseAnalysis?.questions || []
  const as = session.caseAnalysis?.answers || []
  if (qs.length) {
    return qs.map((q, i) => ({ q, a: as[i] || (lang.value === 'zh' ? '未作答' : 'Not answered') }))
  }
  return []
})

// 操作记录 Tab — 从 trainingSession 读取真实学员提交数据
const realDiagnosis = computed(() => {
  const session = store.trainingSession || {}
  return session.preliminaryDiag || null
})
const realTreatment = computed(() => {
  const session = store.trainingSession || {}
  return session.treatmentPlan || null
})
const realMedicalRecord = computed(() => {
  const session = store.trainingSession || {}
  return typeof session.medicalRecord === 'string' ? session.medicalRecord : ''
})
const realHumanityMessages = computed(() => {
  const session = store.trainingSession || {}
  return session.humanisticComm?.messages || []
})

// ═══ 真实评分：从 sessionStorage + trainingSession 获取数据，调用 AI 评分 API ═══

/**
 * 收集病例下所有类型的学员记录（支持自由组合）
 * @returns {{ dialog: Array, exam: Array, qa: Array, freeText: Array }}
 */
function collectAllCaseRecords() {
  const session = store.trainingSession || {}
  const result = { dialog: [], exam: [], qa: [], freeText: [] }

  // 病史采集对话
  if (session.historyTaking?.messages?.length) {
    result.dialog = session.historyTaking.messages.map((m, i) => ({ ...m, sequence: m.sequence ?? i + 1 }))
  }

  // 体格检查操作
  if (session.physicalExam?.messages?.length) {
    result.exam = session.physicalExam.messages.map((m, i) => ({ ...m, sequence: m.sequence ?? i + 1 }))
  }

  // 人文沟通对话（追加到 dialog）
  if (session.humanisticComm?.messages?.length) {
    const baseSeq = result.dialog.length
    result.dialog.push(...session.humanisticComm.messages.map((m, i) => ({ ...m, sequence: m.sequence ?? baseSeq + i + 1 })))
  }

  // 病例分析问答
  if (session.caseAnalysis?.answers?.length) {
    const qs = session.caseAnalysis.questions || []
    const as = session.caseAnalysis.answers || []
    result.qa = qs.map((q, i) => ({ question: q, answer: as[i] || '' }))
  }

  // 初步诊断
  if (session.preliminaryDiag) {
    const pd = session.preliminaryDiag
    const parts = []
    if (pd.preliminary) parts.push(`初步诊断: ${pd.preliminary}`)
    if (pd.differential) parts.push(`鉴别诊断: ${pd.differential}`)
    if (pd.basis) parts.push(`诊断依据: ${pd.basis}`)
    if (parts.length) result.freeText.push({ label: '初步诊断与鉴别诊断', content: parts.join('\n') })
  }

  // 治疗计划
  if (session.treatmentPlan?.content) {
    result.freeText.push({ label: '治疗计划', content: session.treatmentPlan.content })
  }

  // 病历书写
  if (typeof session.medicalRecord === 'string' && session.medicalRecord.trim()) {
    result.freeText.push({ label: '病历书写', content: session.medicalRecord })
  }

  return result
}

function prepareCaseInfo() {
  const cs = c.value
  const pi = cs.patient_info || cs.patient || {}
  const caseId = cs.id || cs.case_id || cid.value || ''
  const result = {
    case_id: caseId,
    id: caseId,
    title: cs.title || cs.disease || '',
    disease: cs.disease || '',
    specialty: cs.specialty || '',
    chief_complaint: cs.chief_complaint || '',
    // Part B 剖面分析所需的完整病例文本
    full_text: cs.full_text || [
      cs.chief_complaint,
      cs.present_illness || cs.history_of_present_illness,
      cs.past_history,
      cs.personal_history,
      cs.family_history,
      cs.physical_examination
    ].filter(Boolean).join('\n'),
    present_illness: cs.present_illness || cs.history_of_present_illness || '',
    past_history: cs.past_history || '',
    personal_history: cs.personal_history || '',
    family_history: cs.family_history || '',
    diagnosis: cs.diagnosis || {},
    symptoms: cs.symptoms || [],
    patient_info: {
      name: pi.name || '',
      age: pi.age || '',
      sex: pi.sex || pi.gender || ''
    }
  }
  if (cs.difficulty) result.difficulty = cs.difficulty
  return result
}

/**
 * 构建综合评价 — 从 Part B 剖面 + Part C 整合 + Part A 阶段 + Part D 导航
 */
function buildComprehensiveEvaluation(baseEval, profileData, integrationData, stageData, navigationData) {
  const ev = { ...baseEval }

  // ── 雷达图 ──
  if (profileData) {
    const p = profileData
    if (p.coverage) {
      ev.radar_chart.organizational_proficiency = {
        score: Math.round(p.coverage.coverage_rate * 10) || 5,
        comment: `信息覆盖率 ${Math.round((p.coverage.coverage_rate || 0) * 100)}%`
      }
    }
    if (p.safety) {
      ev.radar_chart.clinical_reasoning = {
        score: Math.round(p.safety.screening_rate * 10) || 5,
        comment: `安全筛查率 ${Math.round((p.safety.screening_rate || 0) * 100)}%`
      }
    }
    if (p.relationship) {
      ev.radar_chart.communication_skills = {
        score: Math.round((p.relationship.response_rate || 0) * 10) || 5,
        comment: `情感回应率 ${Math.round((p.relationship.response_rate || 0) * 100)}%`
      }
    }
    if (p.strategy) {
      const strategyScore = { hypothesis_driven: 8, template_driven: 5, random_jumping: 3 }
      ev.radar_chart.medical_knowledge = {
        score: strategyScore[p.strategy.type] || 5,
        comment: p.strategy.narrative ? p.strategy.narrative.substring(0, 30) : ''
      }
    }

    // 亮点/失分点
    const strengths = []
    const weaknesses = []
    if (p.coverage?.missed_high_importance?.length) {
      weaknesses.push(`高风险遗漏: ${p.coverage.missed_high_importance.slice(0, 3).join('、')}`)
    }
    if (p.coverage?.coverage_rate >= 0.8) {
      strengths.push(`信息覆盖全面（${Math.round(p.coverage.coverage_rate * 100)}%）`)
    } else if (p.coverage?.coverage_rate < 0.5) {
      weaknesses.push(`信息覆盖率偏低（${Math.round(p.coverage.coverage_rate * 100)}%）`)
    }
    if (p.strategy?.type === 'hypothesis_driven') {
      strengths.push('采用假设驱动型策略，临床思维清晰')
    } else if (p.strategy?.type === 'random_jumping') {
      weaknesses.push('执行逻辑跳跃，缺乏系统性')
    }
    if (p.safety?.safety_pattern === 'active_screening') {
      strengths.push('主动进行安全筛查，风险意识良好')
    } else if (p.safety?.safety_pattern === 'safety_neglect') {
      weaknesses.push('安全筛查意识薄弱，遗漏关键红旗征象')
    }
    if (p.relationship?.empathy_quality === 'substantive') {
      strengths.push('共情回应到位，医患关系建立良好')
    }
    if (p.hypothesis_activity?.cognitive_biases?.length) {
      weaknesses.push(`存在认知偏误: ${p.hypothesis_activity.cognitive_biases.map(b => b.type).join('、')}`)
    }
    if (p.hypothesis_activity?.premature_closure) {
      weaknesses.push('诊断过早关闭，需加强鉴别诊断意识')
    }
    ev.overall_performance = {
      strengths: strengths.length ? strengths : (ev.overall_performance?.strengths || []),
      weaknesses: weaknesses.length ? weaknesses : (ev.overall_performance?.weaknesses || [])
    }
    ev._profile = p
  }

  // ── Part A: 阶段定位 ──
  if (stageData) {
    ev.stage = stageData.stage_assessment || stageData
    ev.portrait = stageData.portrait || ''
    ev.ability_tags = stageData.ability_tags || []
    ev.imbalance = stageData.imbalance || null
    ev.assessability_note = stageData.assessability_note || ''
    if (stageData.narrative && !ev.overall_conclusion) {
      ev.overall_conclusion = stageData.narrative
    }
  }

  // ── Part C: 根因分析 ──
  if (integrationData) {
    ev.integration = {
      dimension_assessment: integrationData.dimension_assessment,
      root_cause_analysis: integrationData.root_cause_analysis,
      data_limitations: integrationData.data_limitations,
      narrative: integrationData.narrative
    }
    // Part C 的维度评估 → 更新雷达图
    // 五维 → 四轴映射：安全性合并到临床推理轴（安全是推理的底层支撑）
    const dimMap = {
      safety_literacy: 'clinical_reasoning',
      clinical_reasoning: 'clinical_reasoning',
      clinical_skill: 'medical_knowledge',
      communication: 'communication_skills',
      professionalism: 'organizational_proficiency'
    }
    const ratingToScore = { '强': 8, '中': 5, '弱': 2, '无法评估': 3 }
    const dimLabelMap = { safety_literacy: '安全', clinical_reasoning: '推理', clinical_skill: '技能', communication: '沟通', professionalism: '专业' }
    const da = integrationData.dimension_assessment || {}
    // 收集每个雷达轴的评分（支持多维合并到同一轴）
    const axisScores = {}
    for (const [dim, radarKey] of Object.entries(dimMap)) {
      const d = da[dim]
      if (d?.rating) {
        if (!axisScores[radarKey]) axisScores[radarKey] = []
        axisScores[radarKey].push({ score: ratingToScore[d.rating] || 5, label: d.rating, dimLabel: dim })
      }
    }
    for (const [radarKey, scores] of Object.entries(axisScores)) {
      if (ev.radar_chart[radarKey]) {
        // 合并策略：取最低分（多维度中短板决定整体表现）
        const minScore = Math.min(...scores.map(s => s.score))
        const labels = scores.map(s => `${dimLabelMap[s.dimLabel] || s.dimLabel}:${s.label}`).join(' ')
        ev.radar_chart[radarKey] = {
          score: minScore,
          comment: labels.substring(0, 30)
        }
      }
    }
  }

  // ── Part D: 发展导航 ──
  if (navigationData) {
    const nd = navigationData
    ev.improvement_plan = {
      immediate_actions: nd.core_prescription
        ? [`核心处方: ${nd.core_prescription.method || ''}`, ...(nd.priority?.ranked_issues?.slice(0, 2).map(i => i.issue) || [])]
        : (ev.improvement_plan?.immediate_actions || []),
      targeted_training: nd.secondary_suggestions?.map(s => `${s.issue}: ${s.suggestion}`) || [],
      recommended_resources: nd.recommended_resources || []
    }
    ev.navigation_narrative = nd.narrative || ''
    ev.core_prescription = nd.core_prescription || null
    ev.priority = nd.priority || null
  }

  return ev
}

function transformScoringResult(llmResult, parsedSheet, stationId, sheetName) {
  const { scored_items, total_score, total_max, pass_fail, scoring_narrative } = llmResult || {}

  // 构建 scoring items 列表（从 LLM 返回的 scored_items 展开）
  const items = []
  let itemIdx = 1
  for (const entry of (scored_items || [])) {
    for (const sub of (entry.sub_items || [])) {
      items.push({
        item_id: itemIdx,
        category: entry.category || '',
        subcategory: entry.item || '',
        name: sub.point || '',
        max_score: sub.max_score || 0,
        awarded_score: sub.awarded_score || 0,
        evidence: sub.evidence || '',
        related_dialogue_ids: sub.related_turns || []
      })
      itemIdx++
    }
  }

  const zh = lang.value === 'zh'
  const totalScore = total_score || items.reduce((s, it) => s + it.awarded_score, 0)
  const totalMax = total_max || items.reduce((s, it) => s + it.max_score, 0)

  // 每张评分表独立一个 sheetGroup（scoringItemsWithSpan 处理 category 行合并）
  const sheetGroups = [{
    name: sheetName || (zh ? '评分表' : 'Score Sheet'),
    items,
    maxTotal: totalMax,
    calcTotal: totalScore
  }]

  const baseEval = {
    dimension_scores: items.slice(0, 5).map(it => ({
      name: it.subcategory || it.category,
      max: it.max_score,
      score: it.awarded_score
    })),
    overall_performance: {
      strengths: [],
      weaknesses: []
    },
    radar_chart: {
      clinical_reasoning: { score: Math.round(totalScore / totalMax * 8) || 5, comment: '基于评分结果推算' },
      organizational_proficiency: { score: 5, comment: '' },
      communication_skills: { score: 5, comment: '' },
      medical_knowledge: { score: 5, comment: '' }
    },
    overall_conclusion: scoring_narrative || (zh ? '评分完成。' : 'Scoring completed.'),
    improvement_plan: { immediate_actions: [], targeted_training: [] }
  }

  const comprehensive_evaluation = baseEval

  return {
    meta: { strictness: 'normal', ability_mode: 'normal', ability_mode_reason: '' },
    scoring: {
      items,
      sheetGroups,
      total_score: totalScore,
      total_max: totalMax,
      pass_fail: pass_fail || (totalScore >= totalMax * 0.6 ? '通过' : '未通过')
    },
    comprehensive_evaluation
  }
}

// callScoringAPI / fetchProfileAnalysis / fetchIntegrationIfAvailable 已废弃
// 报告生成统一走 POST /api/training/settle（服务端全流程 + 落盘）
// 训练端和管理端读取同一份磁盘文件

async function tryRealScoring() {
  const caseId = cid.value
  if (!caseId) return false

  // ── 收集所有考站数据，构建 settle 请求 ──
  // 按考站（非考核项目）分组：一个考站可包含多个考核项目
  const session = store.trainingSession || {}
  const caseInfo = prepareCaseInfo()

  // 构建 target → 考站名称映射（如 historyTaking → "接诊病人站"）
  const scheme = store.stationScheme || store.stationFlow?.stations || []
  const targetToStation = {}
  for (const st of scheme) {
    for (const p of (st.projects || [])) {
      const target = PROJECT_TO_STATION_TARGET[p]
      if (target) targetToStation[target] = st.name
    }
  }

  // 兼容旧记录中使用的 legacy station ID（analysis → caseAnalysis, humanity → humanisticComm）
  const LEGACY_STATION_ID_MAP = { analysis: 'caseAnalysis', humanity: 'humanisticComm' }
  const normalizedStationId = LEGACY_STATION_ID_MAP[record.value.stationId] || record.value.stationId
  const primaryStationId = targetToStation[normalizedStationId] || normalizedStationId

  // 从考站配置动态构建项目定义（仅包含考站配置中的项目）
  const seenIds = new Set()
  const projectDefs = []
  for (const st of scheme) {
    for (const p of (st.projects || [])) {
      const id = PROJECT_TO_STATION_TARGET[p]
      if (id && !seenIds.has(id)) {
        seenIds.add(id)
        projectDefs.push({ id, key: STATION_TO_SESSION_KEY[id] || id })
      }
    }
  }

  // 按考站合并项目数据
  const stationMap = {}
  for (const def of projectDefs) {
    const data = session[def.key]
    const hasData = !!(data && (
      (data.messages && data.messages.length > 0) ||
      (data.answers && data.answers.length > 0) ||
      (typeof data === 'string' && data.trim()) ||
      (data.content)
    ))
    if (!hasData) continue

    const stationName = targetToStation[def.id] || def.id

    if (!stationMap[stationName]) {
      stationMap[stationName] = {
        stationId: stationName,
        stationName,
        hasData: false,
        parsedSheet: [],
        projects: [],
        records: { dialog: [], exam: [], qa: [], freeText: [] }
      }
    }
    const st = stationMap[stationName]
    st.hasData = true
    st.projects.push(def.id)

    // 合并评分表（按 key_point 去重，避免同一考站多项目共用模板导致重复）
    try {
      const raw = sessionStorage.getItem(`aisp_parsed_scoresheet_${caseId}_${def.id}`)
      if (raw) {
        const p = JSON.parse(raw)
        const sheet = Array.isArray(p) ? p : (p.items || [])
        const seenKeys = new Set(st.parsedSheet.map(s => s.key_point || s.point || ''))
        for (const item of sheet) {
          const k = item.key_point || item.point || ''
          if (k && !seenKeys.has(k)) {
            seenKeys.add(k)
            st.parsedSheet.push(item)
          }
        }
      }
    } catch { /* ignore */ }

    // 合并操作记录
    if (def.id === 'historyTaking' || def.id === 'humanity' || def.id === 'humanisticComm' || def.id === 'mentalExam') {
      st.records.dialog.push(...(data?.messages || []))
    } else if (def.id === 'physicalExam') {
      st.records.exam.push(...(data?.messages || []))
    } else if (def.id === 'analysis' || def.id === 'caseAnalysis') {
      const qs = data?.questions || []
      const as = data?.answers || []
      st.records.qa.push(...qs.map((q, i) => ({ question: q, answer: as[i] || '' })))
    } else if (def.id === 'preliminaryDiag') {
      // 初步诊断站数据是结构化对象 { preliminary, differential, basis, notes }
      if (data && typeof data === 'object' && (data.preliminary || data.differential || data.basis)) {
        st.records.freeText.push({ label: def.key, content: data })
      }
    } else if (def.id === 'treatmentPlan' || def.id === 'medicalRecord') {
      const text = typeof data === 'string' ? data : (data?.content || '')
      if (text) st.records.freeText.push({ label: def.key, content: text })
    }
  }

  const stations = Object.values(stationMap)

  // 校验：至少一个考站有实际记录内容（非空壳）
  const hasAnyData = stations.some(s => {
    if (!s.hasData) return false
    const r = s.records
    return (r.dialog?.length > 0 || r.exam?.length > 0 || r.qa?.length > 0 || r.freeText?.length > 0)
  })
  if (!hasAnyData) {
    scoringError.value = lang.value === 'zh'
      ? '未找到训练记录数据，请至少完成一个考站的训练后再查看报告。'
      : 'No training records found. Please complete at least one station before viewing the report.'
    return false
  }

  // ── 调用统一 settle 端点（生成 + 落盘）──
  const se = store.sessionEpoch || route.query.sessionEpoch || Date.now().toString()
  scoringState.value = 'loading'
  try {
    const resp = await fetch('/api/training/settle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId, caseInfo, stations, sessionEpoch: se })
    })
    const json = await resp.json()
    if (!json.ok) {
      scoringError.value = json.error || (lang.value === 'zh' ? '结算失败' : 'Settlement failed')
      scoringState.value = 'fallback'
      reportAssessmentData.value = generateAssessmentData()
      return false
    }

    const settleReport = json.data

    // 如果 settle 无评分结果（如 sessionStorage 丢失评分表），自动调用 regenerate 补救
    if (settleReport.totalMax === 0 && settleReport.stations?.every(s => !s.scored)) {
      console.log('[ScoreReport] settle 无评分结果，自动回退到 regenerate')
      await regenerateReport()
      return true
    }

    // 优先用 primaryStationId 查找，回退到第一个有 scoring 数据的 stationDetail
    let detail = settleReport.stationDetails?.[primaryStationId]
    let resolvedStationId = primaryStationId
    if (!detail?.scoring && settleReport.stationDetails) {
      const entries = Object.entries(settleReport.stationDetails)
      const firstScored = entries.find(([, d]) => d?.scoring)
      if (firstScored) {
        resolvedStationId = firstScored[0]
        detail = firstScored[1]
      }
    }

    // ── 转换为 ScoreReport 显示格式 ──
    applySettleToDisplay(detail, settleReport, resolvedStationId)

    // ── 回写所有考站分数到 localStorage ──
    const stationScores = {}
    const settledStations = settleReport.stations || []
    for (const ss of settledStations) {
      const stInfo = stationMap[ss.stationId]
      const projectIds = stInfo?.projects || []
      for (const pid of projectIds) {
        if (ss.score != null && !stationScores[pid]) stationScores[pid] = ss.score
      }
    }
    // 兜底：至少更新当前记录
    if (!Object.keys(stationScores).length && (settleReport.totalScore || detail?.scoring?.total_score)) {
      stationScores[record.value?.stationId] = settleReport.totalScore || detail?.scoring?.total_score || 0
    }
    syncRecordsToLocal(stationScores)

    return true
  } catch (e) {
    console.warn('[ScoreReport] settle failed:', e.message)
    scoringError.value = (lang.value === 'zh' ? '评分过程发生异常：' : 'Scoring error: ') + e.message
    scoringState.value = 'fallback'
    reportAssessmentData.value = generateAssessmentData()
    return false
  }
}

async function regenerateReport() {
  const caseId = cid.value
  const stationId = record.value.stationId || route.query.stationId
  const recordedAt = record.value.recordedAt || route.query.recordedAt
  if (!caseId || !stationId) {
    scoringError.value = lang.value === 'zh' ? '缺少病例或考站信息' : 'Missing case or station info'
    return
  }
  scoringState.value = 'loading'
  scoringError.value = ''
  const se = store.sessionEpoch || route.query.sessionEpoch || Date.now().toString()
  // 优先从服务端实时落盘数据加载操作记录（按 sessionEpoch 精确匹配）
  await store.loadSessionDataFromServer(caseId, se)
  try {
    const resp = await fetch('/api/training/regenerate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId, stationId, recordedAt, sessionEpoch: se })
    })
    const json = await resp.json()
    if (!json.ok) {
      scoringError.value = json.error || (lang.value === 'zh' ? '重新生成失败' : 'Regeneration failed')
      scoringState.value = 'fallback'
      reportAssessmentData.value = generateAssessmentData()
      return
    }

    const reportData = json.data

    const primaryStationId = reportData.stationType || stationId
    const settleLike = {
      caseId,
      totalScore: reportData.scoring?.total_score || 0,
      totalMax: reportData.scoring?.total_max || 0,
      passFail: (reportData.scoring?.total_score || 0) >= (reportData.scoring?.total_max || 0) * 0.6 ? 'pass' : 'fail',
      stations: [{ stationId: primaryStationId, stationName: primaryStationId, score: reportData.scoring?.total_score || 0, maxScore: reportData.scoring?.total_max || 0, scored: true }],
      stationDetails: { [primaryStationId]: { scoring: reportData.scoring, profile: reportData.profile, profiles: reportData.profiles, parsedSheet: reportData.templateSheet || [] } },
      profileReports: reportData.profileReports || {},
      integration: reportData.integration,
      stage: reportData.stage,
      navigation: reportData.navigation
    }
    const detail = settleLike.stationDetails[primaryStationId]
    applySettleToDisplay(detail, settleLike, primaryStationId)
    syncRecordScoreToLocal(reportData.scoring?.total_score || 0)
  } catch (e) {
    console.warn('[ScoreReport] regenerateReport failed:', e.message)
    scoringError.value = (lang.value === 'zh' ? '重新生成失败：' : 'Regeneration failed: ') + e.message
    scoringState.value = 'fallback'
    reportAssessmentData.value = generateAssessmentData()
  }
}

function buildFallbackFromSettle(settleReport) {
  const zh = lang.value === 'zh'
  return {
    meta: { strictness: 'normal', ability_mode: 'normal' },
    scoring: {
      items: [],
      sheetGroups: [{ name: zh ? '评分汇总' : 'Summary', items: [], maxTotal: settleReport.totalMax, calcTotal: settleReport.totalScore }],
      total_score: settleReport.totalScore,
      total_max: settleReport.totalMax,
      pass_fail: settleReport.totalMax > 0 ? (settleReport.totalScore >= settleReport.totalMax * 0.6 ? (zh ? '通过' : 'Pass') : (zh ? '未通过' : 'Fail')) : (zh ? '未评分' : 'Not scored')
    },
    comprehensive_evaluation: {
      overall_performance: { strengths: [], weaknesses: [] },
      radar_chart: { clinical_reasoning: { score: 5 }, organizational_proficiency: { score: 5 }, communication_skills: { score: 5 }, medical_knowledge: { score: 5 } },
      overall_conclusion: '',
      improvement_plan: { immediate_actions: [], targeted_training: [] },
      integration: settleReport.integration || null,
      stage: settleReport.stage?.stage_assessment || null,
      portrait: settleReport.stage?.portrait || '',
      ability_tags: settleReport.stage?.ability_tags || [],
      imbalance: settleReport.stage?.imbalance || null,
      core_prescription: settleReport.navigation?.core_prescription || null,
      priority: settleReport.navigation?.priority || null,
      navigation_narrative: settleReport.navigation?.narrative || ''
    }
  }
}

/** 默认综合评价骨架（用于 buildComprehensiveEvaluation 回退） */
function defaultEvaluation() {
  return {
    overall_performance: { strengths: [], weaknesses: [] },
    radar_chart: { clinical_reasoning: { score: 5 }, organizational_proficiency: { score: 5 }, communication_skills: { score: 5 }, medical_knowledge: { score: 5 } },
    overall_conclusion: '',
    improvement_plan: { immediate_actions: [], targeted_training: [] }
  }
}

/** 将 settle/regenerate/load 返回的统一报告结构应用到 ScoreReport 展示状态 */
function applySettleToDisplay(detail, settleReport, resolvedStationId) {
  if (detail?.scoring) {
    const transformed = transformScoringResult(detail.scoring, detail.parsedSheet || [], resolvedStationId)
    const data = {
      ...transformed,
      comprehensive_evaluation: buildComprehensiveEvaluation(
        transformed.comprehensive_evaluation || defaultEvaluation(),
        detail.profile,
        settleReport.integration,
        settleReport.stage,
        settleReport.navigation
      )
    }
    data._settle = settleReport

    // 数据局限性声明：两种来源（settle stations 列表 或 scoring 内嵌）
    const stationResult = settleReport.stations?.find(s => s.stationId === resolvedStationId)
    const limitations = stationResult?.dataLimitations || detail.scoring.data_limitations
    if (limitations?.narrative) {
      const ce = data.comprehensive_evaluation || {}
      ce.integration = { ...(ce.integration || {}), data_limitations: limitations }
      data.comprehensive_evaluation = ce
    }

    reportAssessmentData.value = data
    profileAnalysis.value = detail?.profile || null
  } else {
    reportAssessmentData.value = buildFallbackFromSettle(settleReport)
  }
  scoringState.value = 'scored'
}

function closeReport() {
  const caseId = c.value.id
  if (caseId) {
    router.push({ name: 'caseDetail', params: { caseId } })
  } else {
    router.push({ name: 'caseList' })
  }
}

function switchReportTab(tab) {
  reportTab.value = tab
  if (reportBodyRef.value) reportBodyRef.value.scrollTop = 0
}

function switchOpSubTab(tab) {
  opSubTab.value = tab
  if (reportBodyRef.value) reportBodyRef.value.scrollTop = 0
}

const dialogueLookup = computed(() => {
  const map = {}
  const session = store.trainingSession || {}

  // 病史采集对话
  const htMsgs = session.historyTaking?.messages || []
  htMsgs.forEach((m, i) => {
    if (m.role === 'user' || m.role === 'doctor') {
      const next = htMsgs[i + 1]
      map[m.sequence ?? i + 1] = {
        time: m.time || '-',
        item: m.content || '',
        answer: (next && (next.role === 'sp' || next.role === 'patient')) ? next.content : '-'
      }
    }
  })

  // 体格检查操作
  const peMsgs = session.physicalExam?.messages || []
  peMsgs.forEach((m, i) => {
    if (m.role === 'user' || m.role === 'doctor') {
      const next = peMsgs[i + 1]
      map[m.sequence ?? htMsgs.length + i + 1] = {
        time: m.time || '-',
        item: m.content || '',
        answer: (next && next.role === 'system') ? next.content : '-'
      }
    }
  })

  // 人文沟通对话 — 病人发言在前，学员回答在后
  let hcOffset = htMsgs.length + peMsgs.length
  const hcMsgs = session.humanisticComm?.messages || []
  hcMsgs.forEach((m, i) => {
    if (m.role === 'sp' || m.role === 'patient') {
      const next = hcMsgs[i + 1]
      map[m.sequence ?? hcOffset + i + 1] = {
        time: m.time || '-',
        item: m.content || '',
        answer: (next && (next.role === 'user' || next.role === 'doctor')) ? next.content : '-'
      }
    }
  })

  return map
})

function openDialogueDialog(item) {
  if (!item.related_dialogue_ids || !item.related_dialogue_ids.length) return
  const lookup = dialogueLookup.value
  currentDialogueEntries.value = item.related_dialogue_ids.map(function(id) {
    return lookup[id] || { time: '-', item: `(${lang.value === 'zh' ? '对话记录 #' : 'Dialogue #'}${id})`, answer: '' }
  })
  showDialogueDialog.value = true
  dialogueStationId.value = record.value.stationId || ''
}

const radarLabels = computed(() => {
  if (!reportAssessmentData.value) return []
  const radar = reportAssessmentData.value.comprehensive_evaluation.radar_chart || {}
  const m = { clinical_reasoning: '临床思维逻辑推理', organizational_proficiency: '组织效能与专业性', communication_skills: '沟通与人际技巧', medical_knowledge: '医学知识应用' }
  return Object.entries(m).map(([k, n]) => {
    const v = radar[k] && typeof radar[k] === 'object' ? radar[k].score : (radar[k] || 0)
    return { key: k, name: n, score: v }
  })
})

const activeSheetGroups = computed(() => {
  if (!reportAssessmentData.value || !reportAssessmentData.value.scoring) return []
  return reportAssessmentData.value.scoring.sheetGroups || [{ name: '评分表', items: reportAssessmentData.value.scoring.items || [], maxTotal: reportScoringMaxTotal.value, calcTotal: reportScoringCalcTotal.value }]
})

const currentSheetGroup = computed(() => {
  const gs = activeSheetGroups.value
  return gs.length ? gs[Math.min(activeSheetIdx.value, gs.length - 1)] : null
})

const reportScoringCalcTotal = computed(() => {
  if (!reportAssessmentData.value || !reportAssessmentData.value.scoring) return 0
  // 优先使用 LLM 返回的 total_score，回退到 items 求和
  const ts = reportAssessmentData.value.scoring.total_score
  if (typeof ts === 'number') return Math.round(ts * 10) / 10
  return Math.round(reportAssessmentData.value.scoring.items.reduce((s, it) => s + (it.awarded_score || 0), 0) * 10) / 10
})

const reportScoringMaxTotal = computed(() => {
  if (!reportAssessmentData.value || !reportAssessmentData.value.scoring) return 0
  return Math.round(reportAssessmentData.value.scoring.items.reduce((s, it) => s + (it.max_score || 0), 0) * 10) / 10
})

const currentMaxTotal = computed(() => {
  return currentSheetGroup.value ? currentSheetGroup.value.maxTotal : reportScoringMaxTotal.value
})

const currentCalcTotal = computed(() => {
  return currentSheetGroup.value ? currentSheetGroup.value.calcTotal : reportScoringCalcTotal.value
})

const scoringItemsWithSpan = computed(() => {
  const items = currentSheetGroup.value ? currentSheetGroup.value.items : []
  if (!items.length) return []
  return items.map((item, idx, arr) => {
    const result = { ...item }
    if (idx === 0 || arr[idx - 1].category !== item.category) {
      result._showCategory = true
      let span = 1
      for (let j = idx + 1; j < arr.length && arr[j].category === item.category; j++) span++
      result._categorySpan = span
    } else {
      result._showCategory = false
      result._categorySpan = 0
    }
    if (idx === 0 || arr[idx - 1].subcategory !== item.subcategory) {
      result._showSubcategory = true
      let span = 1
      for (let j = idx + 1; j < arr.length && arr[j].subcategory === item.subcategory; j++) span++
      result._subcategorySpan = span
    } else {
      result._showSubcategory = false
      result._subcategorySpan = 0
    }
    return result
  })
})

const opSubTabRows = computed(() => {
  const session = store.trainingSession || {}
  const rows = []

  if (opSubTab.value === 'history') {
    // 病史采集：合并 historyTaking + humanisticComm 对话
    const allMsgs = []
    if (session.historyTaking?.messages) allMsgs.push(...session.historyTaking.messages)
    if (session.humanisticComm?.messages) allMsgs.push(...session.humanisticComm.messages)
    if (!allMsgs.length) return []
    for (let i = 0; i < allMsgs.length; i++) {
      const m = allMsgs[i]
      if (m.role === 'user' || m.role === 'doctor') {
        const next = allMsgs[i + 1]
        rows.push({
          time: m.time || '-',
          item: m.content || '',
          answer: (next && (next.role === 'sp' || next.role === 'patient' || next.role === 'system')) ? next.content : '-'
        })
      }
    }
  } else if (opSubTab.value === 'exam') {
    const msgs = session.physicalExam?.messages || []
    if (!msgs.length) return []
    for (let i = 0; i < msgs.length; i++) {
      const m = msgs[i]
      if (m.role === 'user' || m.role === 'doctor') {
        const next = msgs[i + 1]
        rows.push({
          time: m.time || '-',
          item: m.content || '',
          answer: (next && (next.role === 'system' || next.role === 'sp')) ? next.content : '-'
        })
      }
    }
  } else if (opSubTab.value === 'mental') {
    const msgs = session.mentalExam?.messages || []
    if (!msgs.length) return []
    for (let i = 0; i < msgs.length; i++) {
      const m = msgs[i]
      if (m.role === 'user' || m.role === 'doctor') {
        const next = msgs[i + 1]
        rows.push({
          time: m.time || '-',
          item: m.content || '',
          answer: (next && (next.role === 'sp' || next.role === 'patient' || next.role === 'system')) ? next.content : '-'
        })
      }
    }
  }

  return rows
})

function generateAssessmentData() {
  const zh = lang.value === 'zh'
  const unavailableMsg = zh ? 'AI评分服务当前不可用，请稍后重试。' : 'AI scoring service is currently unavailable. Please try again later.'

  return {
    meta: { strictness: 'normal', ability_mode: 'normal', ability_mode_reason: '' },
    scoring: {
      items: [],
      sheetGroups: [{ name: zh ? '评分表' : 'Score Sheet', items: [], maxTotal: 0, calcTotal: 0 }],
      total_score: 0,
      pass_fail: zh ? '服务不可用' : 'Unavailable'
    },
    comprehensive_evaluation: {
      dimension_scores: [],
      overall_performance: {
        strengths: [],
        weaknesses: [unavailableMsg]
      },
      radar_chart: {
        clinical_reasoning: { score: 0, comment: '' },
        organizational_proficiency: { score: 0, comment: '' },
        communication_skills: { score: 0, comment: '' },
        medical_knowledge: { score: 0, comment: '' }
      },
      overall_conclusion: unavailableMsg,
      improvement_plan: {
        immediate_actions: [],
        targeted_training: []
      }
    }
  }
}

function drawRadarCanvas(canvas, data) {
  const ctx = canvas.getContext('2d')
  const s = canvas.width, c = s / 2, r = s * 0.33
  const labels = ['临床思维\n逻辑推理', '组织效能\n与专业性', '沟通与人\n际技巧', '医学知识\n应用']
  const keys = ['clinical_reasoning', 'organizational_proficiency', 'communication_skills', 'medical_knowledge']
  const scores = keys.map(k => {
    let v = data[k] && typeof data[k] === 'object' ? data[k].score : data[k]
    return v || 0
  })
  ctx.clearRect(0, 0, s, s)
  for (let i = 1; i <= 5; i++) {
    const st = r * (i / 5)
    ctx.beginPath()
    for (let j = 0; j < keys.length; j++) {
      const a = (Math.PI * 2 * j / keys.length) - Math.PI / 2
      const x = c + st * Math.cos(a), y = c + st * Math.sin(a)
      if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
    }
    ctx.closePath(); ctx.strokeStyle = '#e0dcd3'; ctx.lineWidth = 0.8; ctx.stroke()
  }
  for (let j = 0; j < keys.length; j++) {
    const a = (Math.PI * 2 * j / keys.length) - Math.PI / 2
    ctx.beginPath(); ctx.moveTo(c, c); ctx.lineTo(c + r * Math.cos(a), c + r * Math.sin(a))
    ctx.strokeStyle = '#ccc'; ctx.stroke()
    const lx = c + (r + 22) * Math.cos(a), ly = c + (r + 22) * Math.sin(a)
    ctx.fillStyle = '#333'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    const ls = labels[j].split('\n')
    ls.forEach((l, idx) => ctx.fillText(l, lx, ly - 5 + idx * 13))
  }
  ctx.beginPath()
  for (let j = 0; j < keys.length; j++) {
    const a = (Math.PI * 2 * j / keys.length) - Math.PI / 2
    const v = Math.min(1, scores[j] / 10)
    const x = c + r * v * Math.cos(a), y = c + r * v * Math.sin(a)
    if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  }
  ctx.closePath(); ctx.fillStyle = 'rgba(37,99,235,0.2)'; ctx.fill()
  ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 2; ctx.stroke()
  for (let j = 0; j < keys.length; j++) {
    const a = (Math.PI * 2 * j / keys.length) - Math.PI / 2
    const v = Math.min(1, scores[j] / 10)
    const x = c + r * v * Math.cos(a), y = c + r * v * Math.sin(a)
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fillStyle = '#2563eb'; ctx.fill()
  }
}

function drawAllCanvases() {
  nextTick(() => {
    const rC = radarCanvas.value
    if (rC && reportAssessmentData.value && reportAssessmentData.value.comprehensive_evaluation.radar_chart) {
      drawRadarCanvas(rC, reportAssessmentData.value.comprehensive_evaluation.radar_chart)
    }
  })
}

watch(reportTab, () => {
  if (reportTab.value === 'comprehensive') nextTick(() => { drawAllCanvases() })
})

async function loadExistingReport() {
  const caseId = cid.value
  const stationId = record.value.stationId || route.query.stationId
  if (!caseId || !stationId) {
    scoringError.value = lang.value === 'zh' ? '缺少病例或考站信息' : 'Missing case or station info'
    scoringState.value = 'fallback'
    reportAssessmentData.value = generateAssessmentData()
    return
  }
  scoringState.value = 'loading'
  try {
    const se = route.query.sessionEpoch || store.sessionEpoch

    // 从服务端加载该次训练的操作记录（按 sessionEpoch 精确匹配）
    await store.loadSessionDataFromServer(caseId, se)

    let reportUrl = '/api/training/report?caseId=' + encodeURIComponent(caseId) + '&stationType=' + encodeURIComponent(stationId)
    if (se) reportUrl += '&sessionEpoch=' + encodeURIComponent(se)
    const resp = await fetch(reportUrl)
    const json = await resp.json()
    if (json.ok && json.data) {
      const reportData = json.data
      // 构建类 settle 格式以复用现有转换逻辑
      const primaryStationId = reportData.stationType || stationId
      const settleLike = {
        caseId,
        totalScore: reportData.scoring?.total_score || 0,
        totalMax: reportData.scoring?.total_max || 0,
        passFail: (reportData.scoring?.total_score || 0) >= (reportData.scoring?.total_max || 0) * 0.6 ? 'pass' : 'fail',
        stations: [{ stationId: primaryStationId, stationName: primaryStationId, score: reportData.scoring?.total_score || 0, maxScore: reportData.scoring?.total_max || 0, scored: true }],
        stationDetails: { [primaryStationId]: { scoring: reportData.scoring, profile: reportData.profile, profiles: reportData.profiles, parsedSheet: reportData.parsedSheet || reportData.templateSheet || [] } },
        profileReports: reportData.profileReports || {},
        integration: reportData.integration,
        stage: reportData.stage,
        navigation: reportData.navigation
      }
      const detail = settleLike.stationDetails[primaryStationId]
      applySettleToDisplay(detail, settleLike, primaryStationId)
      syncRecordScoreToLocal(reportData.scoring?.total_score || 0)
    } else {
      // 报告未生成，自动尝试重新生成
      console.log('[ScoreReport] 报告文件不存在，自动触发 regenerate')
      await regenerateReport()
      return
    }
  } catch (e) {
    console.warn('[ScoreReport] loadExistingReport failed:', e.message)
    // 网络错误等异常，尝试自动重新生成
    await regenerateReport()
    return
  }
}

onMounted(async () => {
  if (isViewMode.value) {
    await loadExistingReport()
  } else {
    // 正常完成训练，清除活跃训练流程（防止回到列表页弹出"检测到未完成的训练"）
    store.clearActiveFlow()
    try {
      const ok = await tryRealScoring()
      if (!ok) {
        if (!scoringError.value) {
          scoringError.value = lang.value === 'zh'
            ? 'AI评分服务暂时不可用，请稍后重试。如持续失败请检查SP-API服务是否启动。'
            : 'AI scoring is temporarily unavailable. If this persists, check that the SP-API service is running.'
        }
        reportAssessmentData.value = generateAssessmentData()
        scoringState.value = 'fallback'
      }
    } catch (e) {
      console.warn('[ScoreReport] tryRealScoring threw:', e.message)
      scoringError.value = lang.value === 'zh'
        ? '评分过程发生异常：' + e.message
        : 'Scoring error: ' + e.message
      reportAssessmentData.value = generateAssessmentData()
      scoringState.value = 'fallback'
    }
  }
  nextTick(() => { drawAllCanvases() })
})
</script>

<style scoped>
/* ═══ 遮罩 ═══ */
.report-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.45);
  display: flex; align-items: center; justify-content: center;
  z-index: 900;
}

/* ═══ 抽屉容器 ═══ */
.report-drawer {
  width: 1100px; max-width: 95vw; max-height: 92vh;
  background: var(--card-bg); border-radius: 14px;
  display: flex; flex-direction: column;
  box-shadow: 0 16px 64px rgba(0,0,0,0.18);
  overflow: hidden;
}

.report-drawer-header {
  padding: 18px 24px;
  border-bottom: 1px solid var(--border);
  display: flex; justify-content: space-between; align-items: center;
  flex-shrink: 0;
  background: var(--background);
}
.report-drawer-title {
  display: flex; align-items: center; gap: 10px;
  font-size: 16px; font-weight: 700; color: var(--text-main);
}
.report-drawer-title i { color: var(--primary); font-size: 18px; }
.report-close-btn {
  width: 36px; height: 36px; border-radius: 50%;
  border: 1px solid var(--border); background: var(--card-bg);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  color: var(--text-secondary); font-size: 15px; transition: all .15s;
}
.report-close-btn:hover { background: var(--border-light); color: var(--text-main); }

.report-drawer-body {
  flex: 1; overflow-y: auto; padding: 24px;
}
.report-print-area {
  /* print-specific overrides can go here */
}

/* ═══ 顶部信息栏 ═══ */
.report-top-row {
  display: grid; grid-template-columns: 220px 1fr 1fr;
  gap: 20px; align-items: start;
  margin-bottom: 20px; padding-bottom: 20px;
  border-bottom: 1px solid var(--border);
}

/* ── 分数卡片 ── */
.report-score-card {
  display: flex; flex-direction: column; align-items: center;
  padding: 12px 8px;
}
.score-big {
  font-size: 52px; font-weight: 800; color: var(--primary);
  line-height: 1.1; letter-spacing: -1px;
}
.score-unit { font-size: 20px; font-weight: 500; margin-left: 2px; }
.score-badge {
  display: inline-block; padding: 3px 14px; border-radius: 20px;
  font-size: 12px; font-weight: 600; color: #fff; margin-top: 6px;
}
.score-pass-high { background: var(--success); }
.score-pass { background: var(--primary); }
.score-fail { background: var(--error); }
.score-praise {
  font-size: 12px; color: var(--text-secondary);
  text-align: center; line-height: 1.5; margin-top: 8px;
}

/* ── 信息卡片（考生 / 患者） ── */
.report-info-card {
  display: flex; gap: 14px; align-items: flex-start;
  padding: 16px; background: var(--background);
  border-radius: 10px; border: 1px solid var(--border-light);
}
.info-avatar {
  width: 52px; height: 52px; border-radius: 50%;
  flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  font-size: 20px; overflow: hidden;
}
.info-avatar-student {
  background: #e5e7eb; color: var(--text-tertiary);
}
.info-avatar-patient {
  background: var(--primary); color: #fff; font-weight: 700;
}
.info-avatar-patient.has-img { background-color: transparent; }
.info-body { flex: 1; min-width: 0; }
.info-row {
  font-size: 13px; margin-bottom: 3px; display: flex; align-items: center; gap: 4px;
}
.info-row-sm { font-size: 12px; color: var(--text-secondary); margin-top: 1px; }
.info-label {
  color: var(--text-tertiary); font-size: 12px; margin-right: 4px;
}
.info-meta { color: var(--text-tertiary); font-size: 12px; margin-left: 6px; }

/* ═══ Tab 导航 ═══ */
.report-tab-bar {
  display: flex; gap: 4px; margin-bottom: 20px;
  background: var(--background); border-radius: 10px; padding: 4px;
  border: 1px solid var(--border-light);
}
.report-tab {
  flex: 1; text-align: center; padding: 10px 16px; border-radius: 8px;
  cursor: pointer; font-size: 13px; font-weight: 500;
  color: var(--text-secondary); background: transparent;
  border: none; transition: all .2s; display: flex; align-items: center;
  justify-content: center; gap: 6px;
}
.report-tab:hover { background: var(--border-light); color: var(--text-main); }
.report-tab.active { background: var(--primary); color: #fff; font-weight: 600; }

/* ═══ 综合评价 ═══ */
.report-section { margin-bottom: 24px; }
.integration-unavailable-card {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 16px 20px; background: #f0f7ff; border: 1px solid #b3d8ff;
  border-radius: 10px; font-size: 13px; color: #4a6fa5;
}
.integration-unavailable-card i { font-size: 20px; color: #79bbff; margin-top: 2px; flex-shrink: 0; }
.integration-unavailable-card strong { display: block; margin-bottom: 6px; font-size: 14px; }
.integration-unavailable-card p { margin: 0; line-height: 1.6; }
.eval-title {
  font-size: 14px; font-weight: 700; color: var(--text-main);
  margin: 0 0 10px; display: flex; align-items: center; gap: 6px;
}
.eval-title i { color: var(--primary); font-size: 13px; }
.eval-block { margin-bottom: 14px; }
.eval-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.eval-tag {
  display: inline-block; padding: 5px 12px; border-radius: 8px;
  font-size: 12px; font-weight: 500; line-height: 1.4;
}
.eval-tag-good { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
.eval-tag-bad { background: #fefafa; color: #b91c1c; border: 1px solid #fecaca; }

/* ── 雷达图 ── */
.radar-wrap {
  display: flex; gap: 32px; flex-wrap: wrap; align-items: center;
  justify-content: center; margin-top: 8px;
}
.radar-legend { font-size: 13px; min-width: 160px; }
.radar-legend-item {
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 8px; padding: 6px 10px;
  background: var(--background); border-radius: 6px;
}
.radar-dot {
  width: 10px; height: 10px; border-radius: 50%;
  background: var(--primary); flex-shrink: 0;
}
.radar-score { margin-left: auto; color: var(--primary); font-weight: 700; }

/* ── 总结评语 ── */
.conclusion-card {
  padding: 16px 20px; border-radius: 10px;
  font-size: 13px; line-height: 1.9; color: var(--text-secondary);
  background: #fffbeb; border: 1px solid #fde68a;
}

/* ── 改进计划 ── */
.plan-group { margin-bottom: 12px; }
.plan-subtitle { font-size: 13px; font-weight: 600; color: var(--text-main); margin: 0 0 6px; }
.plan-item {
  padding: 10px 16px; margin: 6px 0; border-radius: 8px;
  font-size: 13px; line-height: 1.6; background: var(--card-bg);
  border: 1px solid var(--border-light);
}
.plan-item-action { border-left: 3px solid var(--primary); }
.plan-item-training { border-left: 3px solid var(--success); }
.plan-item-resource strong { display: block; margin-bottom: 2px; font-size: 13px; }
.resource-why { margin: 4px 0 0; font-size: 12px; color: var(--text-tertiary); }

/* ── Part A: 阶段定位 ── */
.stage-portrait {
  padding: 14px 18px; border-radius: 10px;
  font-size: 14px; font-weight: 500; color: var(--text-main); line-height: 1.7;
  background: #f0f4ff; border: 1px solid #c7d2fe; font-style: italic;
}
.stage-portrait i { color: var(--primary); margin-right: 4px; font-size: 12px; }
.stage-tags { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
.stage-tag {
  display: inline-block; padding: 4px 14px; border-radius: 16px;
  font-size: 12px; font-weight: 600; background: var(--primary); color: #fff;
}
.stage-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; margin-top: 12px; }
.stage-dim-card {
  padding: 12px; border-radius: 8px; text-align: center;
  background: var(--card-bg); border: 1px solid var(--border-light);
}
.stage-dim-label { font-size: 11px; color: var(--text-tertiary); margin-bottom: 6px; }
.stage-badge {
  display: inline-block; padding: 3px 12px; border-radius: 12px;
  font-size: 12px; font-weight: 700;
}
.stage-s1 { background: #fef3c7; color: #92400e; }
.stage-s2 { background: #dbeafe; color: #1e40af; }
.stage-s3 { background: #d1fae5; color: #065f46; }
.stage-s4 { background: #ede9fe; color: #5b21b6; }
.stage-s5 { background: #fee2e2; color: #991b1b; }
.stage-confidence { font-size: 11px; color: var(--text-tertiary); margin-top: 4px; }
.stage-imbalance {
  margin-top: 12px; padding: 10px 14px; border-radius: 8px;
  font-size: 13px; color: #92400e; background: #fffbeb; border: 1px solid #fde68a;
  display: flex; align-items: center; gap: 8px;
}
.stage-assessability { margin-top: 8px; font-size: 12px; }

/* ── Part C: 根因分析 ── */
.root-cause-card {
  padding: 16px; border-radius: 10px; margin-bottom: 14px;
  background: #fef2f2; border: 1px solid #fecaca;
}
.root-cause-label { font-size: 12px; font-weight: 600; color: #dc2626; margin-bottom: 6px; text-transform: uppercase; }
.root-cause-hypothesis { font-size: 15px; font-weight: 700; color: var(--text-main); margin-bottom: 8px; }
.root-cause-reasoning { font-size: 13px; color: var(--text-secondary); line-height: 1.7; margin-bottom: 8px; }
.root-cause-alt { font-size: 12px; color: var(--text-tertiary); line-height: 1.6; }
.pattern-card {
  padding: 12px 14px; margin: 8px 0; border-radius: 8px;
  background: var(--card-bg); border: 1px solid var(--border-light);
}
.pattern-card strong { font-size: 13px; }
.pattern-dims { font-size: 11px; color: var(--text-tertiary); margin-left: 8px; }
.pattern-card p { margin: 4px 0 0; font-size: 12px; color: var(--text-secondary); line-height: 1.6; }
.integration-narrative {
  margin-top: 14px; padding: 12px 16px; border-radius: 8px;
  font-size: 13px; color: var(--text-secondary); line-height: 1.7;
  background: #f8fafc; border: 1px solid #e2e8f0;
  display: flex; gap: 8px; align-items: flex-start;
}
.integration-narrative i { color: var(--primary); margin-top: 2px; font-size: 11px; }

/* ── 维度综合判定 ── */
.dim-assessment-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; margin-bottom: 16px; }
.dim-assess-card {
  padding: 12px; border-radius: 8px;
  background: var(--card-bg); border: 1px solid var(--border-light);
}
.dim-assess-card.assess-converge { border-left: 3px solid var(--success); }
.dim-assess-card.assess-diverge { border-left: 3px solid #f59e0b; }
.dim-assess-card.assess-single { border-left: 3px solid var(--border-light); }
.dim-assess-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.dim-assess-label { font-size: 13px; font-weight: 600; color: var(--text-main); }
.dim-assess-rating {
  font-size: 11px; padding: 2px 8px; border-radius: 10px; font-weight: 600;
}
.rating-强 { background: #d1fae5; color: #065f46; }
.rating-中 { background: #dbeafe; color: #1e40af; }
.rating-弱 { background: #fee2e2; color: #991b1b; }
.rating-unknown { background: #f3f4f6; color: #6b7280; }
.dim-assess-conf { font-size: 10px; color: var(--text-tertiary); margin-left: auto; }
.dim-assess-evidence { font-size: 12px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 6px; }
.dim-assess-findings { display: flex; flex-wrap: wrap; gap: 4px; }
.finding-tag {
  font-size: 10px; padding: 2px 8px; border-radius: 10px;
  background: #f3f4f6; color: var(--text-tertiary);
}

/* ── Part D: 发展导航 ── */
.priority-section { margin-bottom: 16px; }
.priority-focus { font-size: 13px; color: var(--text-secondary); margin-bottom: 10px; }
.priority-item {
  display: flex; gap: 10px; padding: 10px 12px; margin-bottom: 8px;
  border-radius: 8px; background: var(--card-bg); border: 1px solid var(--border-light);
}
.priority-top { background: #fef2f2; border-color: #fecaca; }
.priority-rank {
  font-weight: 700; font-size: 12px; min-width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 14px; background: var(--border-light); color: var(--text-tertiary);
}
.rank-1 { background: #dc2626; color: #fff; }
.priority-body { flex: 1; }
.priority-issue { font-size: 13px; font-weight: 600; color: var(--text-main); margin-bottom: 3px; }
.priority-rationale { font-size: 11px; color: var(--text-tertiary); line-height: 1.5; }
.priority-narrative { margin-top: 8px; font-size: 12px; line-height: 1.6; }
.nav-narrative {
  margin-top: 14px; padding: 12px 16px; border-radius: 8px;
  font-size: 13px; color: var(--text-secondary); line-height: 1.7;
  background: #f8fafc; border: 1px solid #e2e8f0; font-style: italic;
  display: flex; gap: 8px; align-items: flex-start;
}
.nav-narrative i { color: var(--primary); margin-top: 2px; font-size: 11px; }

.prescription-card {
  padding: 16px; border-radius: 10px;
  background: #f0fdf4; border: 1px solid #bbf7d0;
}
.presc-item {
  display: flex; gap: 12px; margin-bottom: 10px; font-size: 13px; line-height: 1.6;
}
.presc-label {
  font-weight: 600; font-size: 11px; color: var(--success);
  min-width: 64px; text-transform: uppercase; flex-shrink: 0;
}

/* ── 数据局限性 ── */
.limitations-card {
  padding: 12px 16px; border-radius: 8px;
  font-size: 12px; line-height: 1.7; color: var(--text-secondary);
  background: var(--background); border: 1px solid var(--border-light);
}
.limitations-card p { margin: 4px 0; }

/* ═══ 得分详情 ═══ */
.sheet-tabs { display: flex; gap: 6px; margin-bottom: 14px; }
.sheet-tab {
  padding: 7px 18px; border-radius: 8px; cursor: pointer;
  font-size: 13px; font-weight: 500; border: 1px solid var(--border);
  background: var(--card-bg); color: var(--text-secondary); transition: all .15s;
}
.sheet-tab:hover { border-color: var(--primary); color: var(--primary); }
.sheet-tab.active { background: var(--primary); color: #fff; border-color: var(--primary); }

/* ── 通用 data-table ── */
.table-wrap {
  overflow-x: auto; border-radius: 10px;
  border: 1px solid var(--border);
}
.data-table {
  width: 100%; border-collapse: collapse; font-size: 12px;
}
.data-table th {
  background: #f8fafc; padding: 10px 12px; text-align: left;
  font-weight: 600; font-size: 11px; text-transform: uppercase;
  letter-spacing: .3px; color: var(--text-secondary);
  border-bottom: 1px solid var(--border); white-space: nowrap;
}
.data-table td {
  padding: 9px 12px; border-bottom: 1px solid var(--border-light);
  font-size: 12px; vertical-align: middle;
}
.data-table tbody tr:hover { background: #fafcff; }
.data-table tbody tr:last-child td { border-bottom: none; }

.col-num { width: 50px; text-align: center; }
.col-time { width: 160px; }
.col-score { width: 90px; text-align: center; }
.col-evidence { min-width: 220px; }
.col-link { width: 110px; text-align: center; }

.td-center { text-align: center; }
.td-nowrap { white-space: nowrap; }
.td-wrap { white-space: normal; word-break: break-word; }
.td-muted { color: var(--text-secondary); }
.td-evidence { max-width: 240px; }

.sc-danger { color: var(--error); font-weight: 700; }
.sc-full { color: var(--success); font-weight: 700; }
.sc-mid { color: var(--warning); font-weight: 700; }
.row-low { background: #fef2f2; }

.link { color: var(--primary); cursor: pointer; font-size: 11px; white-space: nowrap; }
.link:hover { text-decoration: underline; }
.text-muted { color: var(--text-tertiary); }

/* ═══ 操作记录 ═══ */
.op-sub-bar { display: flex; gap: 4px; margin-bottom: 16px; flex-wrap: wrap; }
.op-sub-btn {
  padding: 7px 16px; border-radius: 8px; cursor: pointer;
  font-size: 13px; border: 1px solid var(--border);
  background: var(--card-bg); color: var(--text-secondary); transition: all .15s;
}
.op-sub-btn:hover { border-color: var(--primary); color: var(--primary); }
.op-sub-btn.active { background: var(--primary); color: #fff; border-color: var(--primary); }

.op-card {
  background: var(--card-bg); border-radius: 10px; padding: 20px;
  border: 1px solid var(--border); font-size: 13px; line-height: 1.8;
  margin-bottom: 16px;
}
.op-field { margin-bottom: 12px; }
.op-field:last-child { margin-bottom: 0; }
.op-field-label { font-weight: 600; color: var(--text-main); }
.op-field-text { margin-top: 4px; color: var(--text-secondary); line-height: 1.8; }

/* ═══ 关联对话弹窗 ═══ */
.dialogue-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.45);
  display: flex; align-items: center; justify-content: center; z-index: 1050;
}
.dialogue-dialog {
  width: 900px; max-width: 95vw; max-height: 85vh;
  background: var(--card-bg); border-radius: 14px;
  display: flex; flex-direction: column;
  box-shadow: 0 16px 64px rgba(0,0,0,0.18); overflow: hidden;
}
.dialogue-dialog-header {
  padding: 16px 24px; border-bottom: 1px solid var(--border);
  display: flex; justify-content: space-between; align-items: center;
  font-weight: 600; font-size: 15px; flex-shrink: 0;
  background: var(--background);
}
.dialogue-dialog-body { padding: 20px; overflow-y: auto; flex: 1; }

/* ═══ 降级警告横幅 ═══ */
.fallback-banner {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 20px; margin: 0 0 16px;
  background: #fef3c7; border: 1px solid #f59e0b;
  border-radius: 10px; font-size: 13px; color: #92400e;
}
.fallback-banner i { font-size: 16px; color: #f59e0b; flex-shrink: 0; }

/* ═══ 加载状态 ═══ */
.report-loading {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 60px 40px; text-align: center;
  min-height: 400px;
}
.report-loading-icon {
  font-size: 40px; color: var(--primary); margin-bottom: 20px;
  animation: spin 1s linear infinite;
}
.report-loading-title {
  font-size: 17px; font-weight: 700; color: var(--text-main);
  margin-bottom: 10px;
}
.report-loading-desc {
  font-size: 13px; color: var(--text-secondary);
  max-width: 420px; line-height: 1.7; margin-bottom: 30px;
}
.report-loading-steps {
  display: flex; flex-direction: column; gap: 10px; align-items: flex-start;
}
.loading-step {
  font-size: 13px; color: var(--text-tertiary);
  display: flex; align-items: center; gap: 8px;
}
.loading-step.done { color: var(--success); }
.loading-step.done i { color: var(--success); }
.loading-step.active { color: var(--primary); font-weight: 600; }
.loading-step.active i { color: var(--primary); }
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ═══ Part B 剖面分析样式 ═══ */
.profile-coverage-bar { margin-bottom: 12px; }
.coverage-stats { display: flex; gap: 12px; align-items: center; margin-bottom: 6px; flex-wrap: wrap; }
.cov-stat { font-size: 13px; padding: 2px 8px; border-radius: 4px; }
.cov-covered { background: #d1fae5; color: #065f46; }
.cov-partial { background: #fef3c7; color: #92400e; }
.cov-missed { background: #fee2e2; color: #991b1b; }
.cov-rate { font-size: 20px; font-weight: 700; color: var(--primary); margin-left: auto; }
.coverage-bar-track { height: 8px; border-radius: 4px; background: #e5e7eb; overflow: hidden; }
.coverage-bar-fill { height: 100%; border-radius: 4px; background: linear-gradient(90deg, #ef4444, #f59e0b, #10b981); transition: width 0.6s ease; }
.missed-high { background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 8px 12px; margin-bottom: 12px; display: flex; align-items: flex-start; gap: 8px; flex-wrap: wrap; }
.missed-label { font-size: 13px; color: #991b1b; font-weight: 600; white-space: nowrap; }
.missed-tag { font-size: 12px; background: #fee2e2; color: #991b1b; padding: 1px 8px; border-radius: 12px; }
.profile-narrative { font-size: 13px; color: var(--text-secondary); line-height: 1.6; margin: 8px 0; }
.profile-details { margin-top: 8px; }
.profile-details summary { font-size: 13px; color: var(--primary); cursor: pointer; }
.row-covered { background: #f0fdf4; }
.row-partial { background: #fffbeb; }
.row-missed { background: #fef2f2; }
.badge-covered { font-size: 11px; padding: 1px 6px; border-radius: 3px; background: #d1fae5; color: #065f46; }
.badge-partial { font-size: 11px; padding: 1px 6px; border-radius: 3px; background: #fef3c7; color: #92400e; }
.badge-missed { font-size: 11px; padding: 1px 6px; border-radius: 3px; background: #fee2e2; color: #991b1b; }
.badge-high { font-size: 11px; padding: 1px 6px; border-radius: 3px; background: #fee2e2; color: #991b1b; font-weight: 600; }
.badge-medium { font-size: 11px; padding: 1px 6px; border-radius: 3px; background: #fef3c7; color: #92400e; }
.badge-low { font-size: 11px; padding: 1px 6px; border-radius: 3px; background: #e5e7eb; color: #6b7280; }
.strategy-badge-wrap { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.strategy-type-badge { font-size: 15px; font-weight: 700; padding: 4px 14px; border-radius: 20px; }
.strat-hypothesis_driven { background: #dbeafe; color: #1e40af; }
.strat-template_driven { background: #fef3c7; color: #92400e; }
.strat-random_jumping { background: #fee2e2; color: #991b1b; }
.strategy-confidence { font-size: 12px; color: var(--text-tertiary); }
.strategy-chars { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 12px; }
.char-row { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 8px; background: var(--bg-secondary); border-radius: 4px; }
.char-row span:first-child { color: var(--text-secondary); }
.char-row span:last-child { font-weight: 600; }
.initial-hypotheses { margin-bottom: 12px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.ih-label { font-size: 13px; color: var(--text-secondary); }
.ih-tag { font-size: 13px; background: #ede9fe; color: #6b21a8; padding: 2px 10px; border-radius: 12px; font-weight: 500; }
.reasoning-mode { font-size: 14px; margin-bottom: 8px; display: flex; align-items: center; gap: 10px; }
.warning-tag { font-size: 12px; background: #fee2e2; color: #dc2626; padding: 2px 8px; border-radius: 4px; }
.narrowing-point { font-size: 13px; color: var(--text-secondary); margin-bottom: 8px; line-height: 1.5; }
.bias-warnings { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
.bias-item { padding: 8px 12px; border-radius: 6px; border: 1px solid; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.bias-high { background: #fef2f2; border-color: #fecaca; }
.bias-medium { background: #fffbeb; border-color: #fde68a; }
.bias-low { background: #f0fdf4; border-color: #bbf7d0; }
.bias-type { font-size: 13px; font-weight: 600; }
.bias-severity { font-size: 11px; padding: 1px 6px; border-radius: 3px; background: #f3f4f6; }
.bias-evidence { font-size: 12px; color: var(--text-secondary); width: 100%; margin: 0; line-height: 1.4; }
.hypothesis-timeline { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
.timeline-item { display: grid; grid-template-columns: 60px 28px 1fr; gap: 8px; align-items: center; font-size: 13px; padding: 6px 8px; border-radius: 4px; }
.timeline-item.action-generate, .timeline-item.action-生成 { background: #f0fdf4; }
.timeline-item.action-reinforce, .timeline-item.action-强化 { background: #eff6ff; }
.timeline-item.action-abandon, .timeline-item.action-放弃 { background: #f9fafb; }
.tl-turn { font-size: 11px; color: var(--text-tertiary); }
.tl-hypothesis { font-weight: 600; }
.tl-evidence { font-size: 12px; color: var(--text-secondary); grid-column: 1 / -1; }

/* L4 安全行为 */
.safety-active_screening { background: #d1fae5; color: #065f46; }
.safety-triggered_reactive { background: #fef3c7; color: #92400e; }
.safety-safety_neglect { background: #fee2e2; color: #991b1b; }

/* L5 关系质量 */
.empathy-substantive { background: #d1fae5; color: #065f46; }
.empathy-superficial { background: #fef3c7; color: #92400e; }
.empathy-absent { background: #fee2e2; color: #991b1b; }
.arc-building { background: #dbeafe; color: #1e40af; }
.arc-maintained { background: #e5e7eb; color: #4b5563; }
.arc-distancing { background: #fee2e2; color: #991b1b; }
.arc-neutral { background: #f3f4f6; color: #6b7280; }
</style>
