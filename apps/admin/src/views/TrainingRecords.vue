<template>
  <div class="content-container">
    <!-- ═══ 统计卡片 ═══ -->
    <div class="stat-cards-row mb-4">
      <div class="stat-card">
        <div class="stat-card-icon stat-blue">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4"/><path d="M9 5H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2h-4M9 5a2 2 0 012-2h2a2 2 0 012 2v2H9V5z"/></svg>
        </div>
        <div class="stat-card-body">
          <div class="stat-card-value">{{ stats.totalRecords }}</div>
          <div class="stat-card-label">训练记录总数</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon stat-green">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        </div>
        <div class="stat-card-body">
          <div class="stat-card-value">{{ stats.avgScore }}</div>
          <div class="stat-card-label">平均得分</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon stat-purple">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </div>
        <div class="stat-card-body">
          <div class="stat-card-value">{{ stats.passRate }}%</div>
          <div class="stat-card-label">达标率</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon stat-red">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
        <div class="stat-card-body">
          <div class="stat-card-value">{{ stats.avgDuration }}</div>
          <div class="stat-card-label">平均用时 (分钟)</div>
        </div>
      </div>
    </div>

    <!-- ═══ 筛选栏 ═══ -->
    <div class="card mb-4" style="padding: 20px;">
      <div class="filter-row">
        <div class="filter-item" style="min-width: 180px;">
          <label>病例关键词</label>
          <input class="input" placeholder="病例标题/疾病/编号" v-model="filters.caseKeyword" @keyup.enter="handleSearch">
        </div>
        <div class="filter-item">
          <label>考站类型</label>
          <select class="select" v-model="filters.stationType">
            <option value="">全部</option>
            <option value="1.0版">1.0版</option>
            <option value="全流程版">全流程版</option>
            <option value="接诊病人站">接诊病人站</option>
            <option value="体格检查站">体格检查站</option>
            <option value="交流沟通站">交流沟通站</option>
            <option value="初步诊断站">初步诊断站</option>
            <option value="临床思维站">临床思维站</option>
            <option value="病历书写站">病历书写站</option>
            <option value="治疗计划站">治疗计划站</option>
            <option value="精神检查站">精神检查站</option>
          </select>
        </div>
        <div class="filter-item" style="min-width: 150px;">
          <label>训练日期从</label>
          <input type="date" class="input" v-model="filters.dateFrom">
        </div>
        <div class="filter-item" style="min-width: 150px;">
          <label>训练日期至</label>
          <input type="date" class="input" v-model="filters.dateTo">
        </div>
        <div class="filter-item">
          <label>&nbsp;</label>
          <div class="flex gap-2">
            <button class="btn-primary" @click="handleSearch">搜索</button>
            <button class="btn" @click="handleReset">重置</button>
          </div>
        </div>
      </div>
    </div>

    <div class="mb-4">
      <div class="flex gap-2">
        <button class="btn flex items-center gap-1" @click="handleExport">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17h16"/></svg>
          导出记录
        </button>
        <span v-if="loading" style="font-size:13px;color:var(--text-secondary);">加载中...</span>
      </div>
    </div>

    <!-- ═══ 记录列表 ═══ -->
    <div class="card" style="padding: 0;">
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th style="min-width:200px">病例 / 考站</th>
              <th style="min-width:160px">病例标题</th>
              <th>考站类型</th>
              <th>AI评分</th>
              <th>训练用时</th>
              <th>训练时间</th>
              <th class="sticky-right" style="right:0; min-width:160px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in tableData" :key="item.key">
              <td style="font-weight:600">
                <span>{{ item.caseId }}</span>
                <div style="font-size:12px;color:var(--text-secondary);margin-top:2px">
                  <span v-if="item.trainingVersion === '1.0'" class="badge badge-warning" style="margin-right:4px;">1.0版</span>
                  <span v-else-if="item.trainingVersion === 'full-flow'" class="badge badge-success" style="margin-right:4px;">全流程版</span>
                  {{ item.stationLabel }}
                </div>
              </td>
              <td>
                <div>{{ item.caseTitle || item.disease || item.caseId }}</div>
                <div style="font-size:12px;color:var(--text-secondary);margin-top:2px">{{ item.specialty }}</div>
              </td>
              <td>
                <span v-if="item.trainingVersion === '1.0'" class="badge badge-warning">1.0版</span>
                <span v-else-if="item.trainingVersion === 'full-flow'" class="badge badge-success">全流程版</span>
                <span v-else class="badge badge-info">{{ item.stationLabel }}</span>
              </td>
              <td>{{ item.score }}</td>
              <td>{{ item.duration }}分钟</td>
              <td>{{ formatTime(item.recordedAt) }}</td>
              <td class="sticky-right whitespace-nowrap" style="right:0">
                <a class="action-link" :class="{ 'disabled-link': !item.hasReport }" @click="item.hasReport ? openReport(item) : null">成绩报告</a>
                <a class="action-link" @click="regenerateReport(item)" :style="regenerating === item.key ? 'opacity:0.5' : ''">{{ regenerating === item.key ? '生成中...' : '重新生成' }}</a>
              </td>
            </tr>
            <tr v-if="tableData.length === 0 && !loading">
              <td :colspan="7" class="text-center py-8 text-secondary">暂无训练记录</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="flex items-center justify-between mt-4">
      <div class="text-secondary">共 {{ total }} 条记录</div>
      <div class="flex gap-2 items-center">
        <button class="btn btn-sm" :disabled="currentPage <= 1" @click="currentPage--">上一页</button>
        <span class="px-3">{{ currentPage }} / {{ totalPages }}</span>
        <button class="btn btn-sm" :disabled="currentPage >= totalPages" @click="currentPage++">下一页</button>
        <select class="select" style="width: auto;" v-model="pageSize" @change="onPageSizeChange">
          <option :value="10">10条/页</option>
          <option :value="20">20条/页</option>
          <option :value="50">50条/页</option>
        </select>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════
      成绩报告抽屉 — 与训练端 ScoreReport.vue 结构完全一致
      ═══════════════════════════════════════════════════════════════ -->
    <div v-if="reportVisible" class="report-overlay" @click.self="closeReport">
      <div class="report-drawer">
        <div class="report-drawer-header">
          <div class="report-drawer-title">
            <i class="fa-solid fa-file-lines"></i>
            <span>成绩报告 — {{ reportItem ? reportItem.stationLabel : '' }}</span>
          </div>
          <button class="report-close-btn" @click="closeReport">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div ref="reportBodyRef" class="report-drawer-body" v-if="reportAssessmentData">
          <div ref="reportContentRef" class="report-print-area">

            <!-- ── 顶部三栏：分数 / 病例 / 患者 ── -->
            <div class="report-top-row">
              <div class="report-score-card">
                <div class="score-big">{{ reportScoringCalcTotal }}<span class="score-unit">分</span></div>
                <span class="score-badge" :class="scoringRatio >= 0.85 ? 'score-pass-high' : scoringRatio >= 0.6 ? 'score-pass' : 'score-fail'">
                  {{ scoringRatio >= 0.85 ? '优秀' : scoringRatio >= 0.6 ? '达标' : '未达标' }}
                </span>
                <p class="score-praise">{{ aiPraise }}</p>
              </div>

              <div class="report-info-card">
                <div class="info-avatar info-avatar-student">
                  <i class="fa-solid fa-user-graduate"></i>
                </div>
                <div class="info-body">
                  <div class="info-row"><span class="info-label">考站</span><span>{{ reportItem.stationLabel }}</span></div>
                  <div class="info-row"><span class="info-label">病例</span><span>{{ reportData.caseInfo?.case_id || reportItem.caseId }}</span></div>
                  <div class="info-row"><span class="info-label">专业</span><span>{{ reportData.caseInfo?.specialty || '' }}</span></div>
                </div>
              </div>

              <div class="report-info-card" v-if="reportData.caseInfo">
                <div class="info-avatar info-avatar-patient" :class="{ 'has-img': patientAvatar }" :style="patientAvatar ? { backgroundImage: 'url(' + patientAvatar + ')', backgroundSize: 'cover', backgroundPosition: 'center' } : {}">
                  <span v-if="!patientAvatar">{{ patientInfoName?.charAt(0) || '?' }}</span>
                </div>
                <div class="info-body">
                  <div class="info-row">
                    <span class="info-label">患者</span>
                    <strong>{{ patientInfoName || '' }}</strong>
                    <span class="info-meta" v-if="patientInfoAge">{{ patientInfoAge }}岁</span>
                  </div>
                  <div class="info-row info-row-sm">病例：{{ reportData.caseInfo?.case_id }} {{ reportData.caseInfo?.title || '' }}</div>
                  <div class="info-row info-row-sm">性别：{{ patientInfoSex || '' }} | 主诉：{{ reportData.caseInfo?.chief_complaint || '' }}</div>
                </div>
              </div>
            </div>

            <!-- ── Tab 导航 ── -->
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
              <div class="report-section" v-if="compEval.overall_performance">
                <div v-if="compEval.overall_performance.strengths && compEval.overall_performance.strengths.length" class="eval-block">
                  <h4 class="eval-title"><i class="fa-solid fa-star"></i>核心亮点</h4>
                  <div class="eval-tags">
                    <span v-for="s in compEval.overall_performance.strengths" :key="s" class="eval-tag eval-tag-good">{{ s }}</span>
                  </div>
                </div>
                <div v-if="compEval.overall_performance.weaknesses && compEval.overall_performance.weaknesses.length" class="eval-block">
                  <h4 class="eval-title"><i class="fa-solid fa-triangle-exclamation"></i>关键失分点</h4>
                  <div class="eval-tags">
                    <span v-for="w in compEval.overall_performance.weaknesses" :key="w" class="eval-tag eval-tag-bad">{{ w }}</span>
                  </div>
                </div>
              </div>

              <div class="report-section" v-if="compEval.radar_chart">
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

              <div class="report-section" v-if="compEval.overall_conclusion">
                <h4 class="eval-title">总结评语</h4>
                <div class="conclusion-card">{{ compEval.overall_conclusion }}</div>
              </div>

              <div class="report-section" v-if="compEval.improvement_plan">
                <h4 class="eval-title">个性化改进计划</h4>
                <div v-if="compEval.improvement_plan.immediate_actions && compEval.improvement_plan.immediate_actions.length" class="plan-group">
                  <h5 class="plan-subtitle">立即行动项</h5>
                  <div v-for="a in compEval.improvement_plan.immediate_actions" :key="a" class="plan-item plan-item-action">{{ a }}</div>
                </div>
                <div v-if="compEval.improvement_plan.targeted_training && compEval.improvement_plan.targeted_training.length" class="plan-group">
                  <h5 class="plan-subtitle">针对性训练</h5>
                  <div v-for="t in compEval.improvement_plan.targeted_training" :key="t" class="plan-item plan-item-training">{{ t }}</div>
                </div>
                <div v-if="compEval.improvement_plan.recommended_resources && compEval.improvement_plan.recommended_resources.length" class="plan-group">
                  <h5 class="plan-subtitle">推荐资源</h5>
                  <div v-for="r in compEval.improvement_plan.recommended_resources" :key="r.type" class="plan-item plan-item-resource">
                    <strong>{{ r.type }}</strong> — {{ r.focus }}
                    <p class="resource-why">{{ r.why }}</p>
                  </div>
                </div>
              </div>

              <!-- ═══ Part A: 能力阶段定位 ═══ -->
              <div class="report-section" v-if="compEval.stage">
                <h4 class="eval-title"><i class="fa-solid fa-signal"></i>能力发展阶段定位</h4>
                <div v-if="compEval.portrait" class="stage-portrait">
                  <i class="fa-solid fa-quote-left"></i>
                  {{ compEval.portrait }}
                </div>
                <div v-if="compEval.ability_tags && compEval.ability_tags.length" class="stage-tags">
                  <span v-for="tag in compEval.ability_tags" :key="tag" class="stage-tag">{{ tag }}</span>
                </div>
                <div v-if="compEval.stage" class="stage-grid">
                  <div v-for="(sd, dimName) in compEval.stage" :key="dimName" class="stage-dim-card">
                    <div class="stage-dim-label">{{ { safety_literacy: '安全素养', clinical_reasoning: '临床推理', clinical_skill: '临床技能', communication: '沟通关系', professionalism: '专业素养' }[dimName] || dimName }}</div>
                    <div class="stage-badge" :class="'stage-' + (sd.stage || 'S2').toLowerCase()">{{ sd.stage_label || sd.stage || '未知' }}</div>
                    <div class="stage-confidence" v-if="sd.confidence">置信度: {{ sd.confidence }}</div>
                  </div>
                </div>
                <div v-if="compEval.imbalance?.has_imbalance" class="stage-imbalance">
                  <i class="fa-solid fa-scale-unbalanced"></i>
                  维度不均衡：{{ compEval.imbalance.gap_description || (compEval.imbalance.leading_dimension + '领先，' + compEval.imbalance.lagging_dimension + '滞后') }}
                </div>
                <div v-if="compEval.assessability_note" class="stage-assessability text-muted">
                  <i class="fa-solid fa-info-circle"></i> {{ compEval.assessability_note }}
                </div>
              </div>

              <!-- ═══ Part C: 根因分析 ═══ -->
              <div class="report-section" v-if="compEval.integration?.root_cause_analysis || compEval.integration?.dimension_assessment">
                <h4 class="eval-title"><i class="fa-solid fa-magnifying-glass-chart"></i>跨剖面整合分析</h4>

                <!-- 维度综合判定 -->
                <div v-if="compEval.integration?.dimension_assessment" class="dim-assessment-grid">
                  <div v-for="(da, dimName) in compEval.integration.dimension_assessment" :key="dimName" class="dim-assess-card" :class="'assess-' + (da.convergence === '收敛' ? 'converge' : da.convergence === '发散' ? 'diverge' : 'single')">
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
                <div v-if="compEval.integration?.root_cause_analysis?.primary_root_cause" class="root-cause-card">
                  <div class="root-cause-label">主要根因</div>
                  <div class="root-cause-hypothesis">{{ compEval.integration.root_cause_analysis.primary_root_cause.hypothesis }}</div>
                  <div class="root-cause-reasoning">{{ compEval.integration.root_cause_analysis.primary_root_cause.reasoning }}</div>
                  <div v-if="compEval.integration.root_cause_analysis.primary_root_cause.alternative_explanation" class="root-cause-alt">
                    <strong>排除的替代解释：</strong>{{ compEval.integration.root_cause_analysis.primary_root_cause.alternative_explanation }}
                    <span v-if="compEval.integration.root_cause_analysis.primary_root_cause.why_ruled_out"> — {{ compEval.integration.root_cause_analysis.primary_root_cause.why_ruled_out }}</span>
                  </div>
                </div>

                <!-- 跨维度关联模式 -->
                <div v-if="compEval.integration?.root_cause_analysis?.cross_dimension_patterns?.length" class="cross-patterns">
                  <h5 class="plan-subtitle">跨维度关联模式</h5>
                  <div v-for="pt in compEval.integration.root_cause_analysis.cross_dimension_patterns" :key="pt.pattern_name" class="pattern-card">
                    <strong>{{ pt.pattern_name }}</strong>
                    <span class="pattern-dims">影响维度: {{ (pt.affected_dimensions || []).join('、') }}</span>
                    <p>{{ pt.evidence }}</p>
                  </div>
                </div>

                <!-- Part C 整体叙述 -->
                <div v-if="compEval.integration?.narrative" class="integration-narrative">
                  <i class="fa-solid fa-align-left"></i>
                  {{ compEval.integration.narrative }}
                </div>
              </div>

              <!-- ═══ Part D: 发展导航 ═══ -->
              <div class="report-section" v-if="compEval.core_prescription || compEval.priority">
                <h4 class="eval-title"><i class="fa-solid fa-compass"></i>发展导航</h4>

                <!-- 优先级排序 -->
                <div v-if="compEval.priority?.ranked_issues?.length" class="priority-section">
                  <h5 class="plan-subtitle">问题优先级</h5>
                  <p v-if="compEval.priority.primary_focus" class="priority-focus">
                    <strong>重点聚焦：</strong>{{ compEval.priority.primary_focus }}
                  </p>
                  <div v-for="item in compEval.priority.ranked_issues" :key="item.rank" class="priority-item" :class="{ 'priority-top': item.rank === 1 }">
                    <span class="priority-rank" :class="'rank-' + item.rank">#{{ item.rank }}</span>
                    <div class="priority-body">
                      <div class="priority-issue">{{ item.issue }}</div>
                      <div class="priority-rationale">{{ item.priority_rationale }}</div>
                    </div>
                  </div>
                  <p v-if="compEval.priority.priority_narrative" class="priority-narrative text-muted">
                    {{ compEval.priority.priority_narrative }}
                  </p>
                </div>

                <!-- 核心处方 -->
                <div v-if="compEval.core_prescription" class="prescription-card">
                  <div class="presc-item">
                    <span class="presc-label">针对根因</span>
                    <span>{{ compEval.core_prescription.target_root_cause || '—' }}</span>
                  </div>
                  <div class="presc-item">
                    <span class="presc-label">当前状态</span>
                    <span>{{ compEval.core_prescription.current_state }}</span>
                  </div>
                  <div class="presc-item">
                    <span class="presc-label">目标状态</span>
                    <span>{{ compEval.core_prescription.target_state }}</span>
                  </div>
                  <div class="presc-item">
                    <span class="presc-label">干预方法</span>
                    <span>{{ compEval.core_prescription.method }}</span>
                  </div>
                  <div class="presc-item">
                    <span class="presc-label">检验标准</span>
                    <span>{{ compEval.core_prescription.verification }}</span>
                  </div>
                </div>

                <!-- 发展叙述 -->
                <div v-if="compEval.navigation_narrative" class="nav-narrative">
                  <i class="fa-solid fa-feather"></i>
                  {{ compEval.navigation_narrative }}
                </div>
              </div>

              <!-- ═══ 数据局限性 ═══ -->
              <div class="report-section" v-if="compEval.integration?.data_limitations">
                <h4 class="eval-title"><i class="fa-solid fa-triangle-exclamation"></i>数据局限性声明</h4>
                <div class="limitations-card">
                  <p v-if="compEval.integration.data_limitations.assessable_dimensions?.length">
                    <strong>可充分评估：</strong>{{ compEval.integration.data_limitations.assessable_dimensions.join('、') }}
                  </p>
                  <p v-if="compEval.integration.data_limitations.limited_dimensions?.length">
                    <strong>证据有限：</strong>{{ compEval.integration.data_limitations.limited_dimensions.join('、') }}
                  </p>
                  <p class="text-muted">{{ compEval.integration.data_limitations.narrative }}</p>
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
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in scoringItemsWithSpan" :key="item.item_id" :class="{ 'row-low': item.awarded_score < item.max_score * 0.6 && item.max_score > 0 }">
                      <td class="td-center">{{ item.item_id }}</td>
                      <td v-if="item._showCategory" :rowspan="item._categorySpan">{{ item.category || '-' }}</td>
                      <td v-if="item._showSubcategory" :rowspan="item._subcategorySpan">{{ item.subcategory || '-' }}</td>
                      <td>{{ item.name || '-' }}</td>
                      <td class="td-center">{{ item.max_score }}</td>
                      <td class="td-center" :class="{ 'sc-danger': item.awarded_score < item.max_score * 0.6 && item.max_score > 0, 'sc-full': item.awarded_score === item.max_score, 'sc-mid': item.awarded_score >= item.max_score * 0.6 && item.awarded_score < item.max_score }">{{ item.awarded_score }}</td>
                      <td class="td-evidence">{{ item.evidence || '-' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </template>

            <!-- ═══ 操作记录 ═══ -->
            <template v-if="reportTab === 'operations'">
              <div class="op-sub-bar">
                <button class="op-sub-btn" :class="{ active: opSubTab === 'history' }" @click="switchOpSubTab('history')">病史采集</button>
                <button class="op-sub-btn" :class="{ active: opSubTab === 'exam' }" @click="switchOpSubTab('exam')">体格检查</button>
              </div>

              <template v-if="opSubTab === 'history' || opSubTab === 'exam'">
                <div v-if="opSubTabRows.length" class="table-wrap">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th class="col-num">序号</th>
                        <th class="col-time">轮次</th>
                        <th>{{ opSubTab === 'history' ? '学员提问' : '检查项目' }}</th>
                        <th>{{ opSubTab === 'history' ? '患者回答' : '检查结果' }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(row, idx) in opSubTabRows" :key="idx">
                        <td class="td-center">{{ idx + 1 }}</td>
                        <td class="td-nowrap">{{ row.round }}</td>
                        <td>{{ row.item }}</td>
                        <td>{{ row.answer }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div v-else class="empty-state">暂无记录（成绩报告未保存原始对话数据）</div>
              </template>
            </template>

            <!-- ═══ 剖面分析 ═══ -->
            <template v-if="reportTab === 'profile' && profileAnalysis">
              <!-- L1 信息覆盖 -->
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
                <p class="profile-narrative">{{ profileAnalysis.coverage.narrative }}</p>
              </div>

              <!-- L2 行为策略 -->
              <div class="report-section" v-if="profileAnalysis.strategy">
                <h4 class="eval-title"><i class="fa-solid fa-chess"></i> L2 行为策略分析</h4>
                <div class="strategy-badge-wrap">
                  <span class="strategy-type-badge" :class="'strat-' + profileAnalysis.strategy.type">
                    {{ profileAnalysis.strategy.type === 'hypothesis_driven' ? '假设驱动型' : profileAnalysis.strategy.type === 'template_driven' ? '模板覆盖型' : '随机跳跃型' }}
                  </span>
                </div>
                <div class="strategy-chars" v-if="profileAnalysis.strategy.characteristics">
                  <div class="char-row"><span>开放性问题占比</span><span>{{ profileAnalysis.strategy.characteristics.open_ended_ratio }}</span></div>
                  <div class="char-row"><span>追问深度</span><span>{{ profileAnalysis.strategy.characteristics.follow_up_depth === 'deep' ? '深层追问' : profileAnalysis.strategy.characteristics.follow_up_depth === 'moderate' ? '中等' : '浅层' }}</span></div>
                  <div class="char-row"><span>序列逻辑</span><span>{{ profileAnalysis.strategy.characteristics.sequence_logic === 'coherent' ? '连贯有序' : profileAnalysis.strategy.characteristics.sequence_logic === 'loose' ? '大体有序' : '松散跳跃' }}</span></div>
                </div>
                <p class="profile-narrative">{{ profileAnalysis.strategy.narrative }}</p>
              </div>

              <!-- L3 认知过程 -->
              <div class="report-section" v-if="profileAnalysis.hypothesis_activity">
                <h4 class="eval-title"><i class="fa-solid fa-lightbulb"></i> L3 认知过程还原</h4>
                <div v-if="profileAnalysis.hypothesis_activity.initial_hypotheses?.length" class="initial-hypotheses">
                  <span class="ih-label">初始诊断假设：</span>
                  <span v-for="h in profileAnalysis.hypothesis_activity.initial_hypotheses" :key="h" class="ih-tag">{{ h }}</span>
                </div>
                <p class="profile-narrative">{{ profileAnalysis.hypothesis_activity.narrative }}</p>
              </div>

              <!-- L4 安全行为 -->
              <div class="report-section" v-if="profileAnalysis.safety">
                <h4 class="eval-title"><i class="fa-solid fa-shield-halved"></i> L4 安全行为分析</h4>
                <div class="strategy-badge-wrap">
                  <span class="strategy-type-badge" :class="'safety-' + profileAnalysis.safety.safety_pattern">
                    {{ profileAnalysis.safety.safety_pattern === 'active_screening' ? '主动筛查' : profileAnalysis.safety.safety_pattern === 'triggered_reactive' ? '被动反应' : '安全忽视' }}
                  </span>
                  <span class="strategy-confidence">红旗征象 {{ profileAnalysis.safety.red_flags_screened }}/{{ profileAnalysis.safety.red_flags_total }} 已筛查</span>
                </div>
                <p class="profile-narrative">{{ profileAnalysis.safety.narrative }}</p>
              </div>

              <!-- L5 关系质量 -->
              <div class="report-section" v-if="profileAnalysis.relationship">
                <h4 class="eval-title"><i class="fa-solid fa-hand-holding-heart"></i> L5 关系质量分析</h4>
                <div class="strategy-badge-wrap">
                  <span class="strategy-type-badge" :class="'empathy-' + profileAnalysis.relationship.empathy_quality">
                    {{ profileAnalysis.relationship.empathy_quality === 'substantive' ? '实质性共情' : profileAnalysis.relationship.empathy_quality === 'superficial' ? '表面共情' : '无共情' }}
                  </span>
                </div>
                <p class="profile-narrative">{{ profileAnalysis.relationship.narrative }}</p>
              </div>
            </template>

          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { toast } from '@ai-sp/shared'

// ── 列表状态 ──
const filters = ref({ caseKeyword: '', stationType: '', dateFrom: '', dateTo: '' })
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const tableData = ref([])
const loading = ref(false)
const regenerating = ref(null)
const allRecords = ref([])
const stats = ref({ totalRecords: 0, avgScore: 0, passRate: 0, avgDuration: 0 })

// ── 报告状态 ──
const reportVisible = ref(false)
const reportItem = ref(null)
const reportData = ref(null)
const reportTab = ref('comprehensive')
const reportBodyRef = ref(null)
const reportContentRef = ref(null)
const reportAssessmentData = ref(null)
const profileAnalysis = ref(null)
const radarCanvas = ref(null)
const activeSheetIdx = ref(0)
const opSubTab = ref('history')

// ═══════════════════════════════════════════════════════
// API 调用
// ═══════════════════════════════════════════════════════

async function fetchRecords() {
  loading.value = true
  try {
    const res = await fetch('/api/training/enriched-records')
    const json = await res.json()
    if (json.ok) {
      allRecords.value = json.data || []
      stats.value = json.stats || { totalRecords: 0, avgScore: 0, passRate: 0, avgDuration: 0 }
    } else {
      toast.show('加载训练记录失败: ' + (json.error || '未知错误'))
    }
  } catch (e) {
    console.error('[TrainingRecords] fetchRecords:', e)
    toast.show('无法连接训练记录服务，请确认 SP-API 已启动')
  } finally {
    loading.value = false
    fetchPage()
  }
}

async function fetchReport(caseId, stationType, timestamp) {
  const params = new URLSearchParams({ caseId, stationType })
  if (timestamp) params.set('timestamp', timestamp)
  try {
    const res = await fetch(`/api/training/report?${params}`)
    const json = await res.json()
    if (json.ok) return json.data
    return null
  } catch (e) { return null }
}

async function regenerateReport(item) {
  if (regenerating.value) return
  regenerating.value = item.key
  try {
    const res = await fetch('/api/training/regenerate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId: item.caseId, stationId: item.stationId, recordedAt: item.recordedAt })
    })
    const json = await res.json()
    if (json.ok) {
      toast.show('成绩报告已重新生成')
      const idx = allRecords.value.findIndex(r => r.key === item.key)
      if (idx >= 0) {
        allRecords.value[idx].hasReport = true
        allRecords.value[idx].score = json.data.scoring?.total_score || 0
        allRecords.value[idx].reportTimestamp = json.data.timestamp
      }
      fetchPage()
      reportItem.value = item
      displayReport(json.data)
      reportVisible.value = true
    } else {
      toast.show('重新生成失败: ' + (json.error || '未知错误'))
    }
  } catch (e) {
    toast.show('重新生成失败，请确认 SP-API 已启动')
  } finally {
    regenerating.value = null
  }
}

// ═══════════════════════════════════════════════════════
// 数据转换 — 原始报告 JSON → ScoreReport 统一格式
// ═══════════════════════════════════════════════════════

function transformReportData(raw) {
  const scoredItems = raw.scoring?.scored_items || []
  const items = []
  let itemIdx = 1

  for (const entry of scoredItems) {
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

  const totalScore = raw.scoring?.total_score ?? items.reduce((s, it) => s + (it.awarded_score || 0), 0)
  const totalMax = raw.scoring?.total_max ?? items.reduce((s, it) => s + (it.max_score || 0), 0)

  // 基于评分推算雷达图基础值（后续会被 Part C 覆盖）
  const scoreRate = totalMax > 0 ? totalScore / totalMax : 0
  const dimScores = scoredItems.slice(0, 4).map((entry) => {
    const catTotal = (entry.sub_items || []).reduce((s, si) => s + (si.awarded_score || 0), 0)
    const catMax = (entry.sub_items || []).reduce((s, si) => s + (si.max_score || 0), 0)
    return catMax > 0 ? Math.round(catTotal / catMax * 10) : Math.round(scoreRate * 8)
  })

  const ev = {
    overall_performance: { strengths: [], weaknesses: [] },
    radar_chart: {
      clinical_reasoning: { score: dimScores[0] || Math.round(scoreRate * 8) || 5, comment: '基于评分推算' },
      organizational_proficiency: { score: dimScores[1] || 5, comment: '' },
      communication_skills: { score: dimScores[2] || 5, comment: '' },
      medical_knowledge: { score: dimScores[3] || 5, comment: '' }
    },
    overall_conclusion: raw.scoring?.scoring_narrative || '',
    improvement_plan: { immediate_actions: [], targeted_training: [] }
  }

  // 合并 Part B/C/D/A（settle 格式）
  const enriched = buildComprehensiveEvaluationForAdmin(ev, raw)
  enriched._raw = raw

  return {
    meta: { strictness: 'normal', ability_mode: 'normal' },
    scoring: {
      items,
      sheetGroups: [{ name: '评分表', items, maxTotal: totalMax, calcTotal: totalScore }],
      total_score: totalScore,
      total_max: totalMax,
      pass_fail: totalMax > 0 ? (totalScore >= totalMax * 0.6 ? '通过' : '未通过') : '未评分'
    },
    comprehensive_evaluation: enriched
  }
}

function buildComprehensiveEvaluationForAdmin(ev, raw) {
  // ── Part B: 剖面分析 → 雷达图 + strengths/weaknesses ──
  const p = raw.profile || Object.values(raw.profileReports || {}).filter(Boolean)[0]
  if (p) {
    // 雷达图更新（与训练端 buildComprehensiveEvaluation 对齐）
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

    const strengths = []
    const weaknesses = []
    if (p.coverage?.missed_high_importance?.length) {
      weaknesses.push('高风险遗漏: ' + p.coverage.missed_high_importance.slice(0, 3).join('、'))
    }
    if (p.coverage?.coverage_rate >= 0.8) {
      strengths.push('信息覆盖全面（' + Math.round(p.coverage.coverage_rate * 100) + '%）')
    } else if (p.coverage?.coverage_rate < 0.5) {
      weaknesses.push('信息覆盖率偏低（' + Math.round(p.coverage.coverage_rate * 100) + '%）')
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
      weaknesses.push('存在认知偏误: ' + p.hypothesis_activity.cognitive_biases.map(b => b.type).join('、'))
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
  if (raw.stage) {
    ev.stage = raw.stage.stage_assessment || raw.stage
    ev.portrait = raw.stage.portrait || ''
    ev.ability_tags = raw.stage.ability_tags || []
    ev.imbalance = raw.stage.imbalance || null
    ev.assessability_note = raw.stage.assessability_note || ''
    if (raw.stage.narrative && !ev.overall_conclusion) {
      ev.overall_conclusion = raw.stage.narrative
    }
  }

  // ── Part C: 根因分析 ──
  if (raw.integration) {
    ev.integration = {
      dimension_assessment: raw.integration.dimension_assessment,
      root_cause_analysis: raw.integration.root_cause_analysis,
      data_limitations: raw.integration.data_limitations,
      narrative: raw.integration.narrative
    }
    // 五维 → 四轴雷达图映射
    const dimMap = {
      safety_literacy: 'clinical_reasoning',
      clinical_reasoning: 'clinical_reasoning',
      clinical_skill: 'medical_knowledge',
      communication: 'communication_skills',
      professionalism: 'organizational_proficiency'
    }
    const ratingToScore = { '强': 8, '中': 5, '弱': 2, '无法评估': 3 }
    const dimLabelMap = { safety_literacy: '安全', clinical_reasoning: '推理', clinical_skill: '技能', communication: '沟通', professionalism: '专业' }
    const da = raw.integration.dimension_assessment || {}
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
        const minScore = Math.min(...scores.map(s => s.score))
        const labels = scores.map(s => `${dimLabelMap[s.dimLabel] || s.dimLabel}:${s.label}`).join(' ')
        ev.radar_chart[radarKey] = { score: minScore, comment: labels.substring(0, 30) }
      }
    }
  }

  // ── Part D: 发展导航 ──
  if (raw.navigation) {
    const nd = raw.navigation
    ev.improvement_plan = {
      immediate_actions: nd.core_prescription
        ? ['核心处方: ' + (nd.core_prescription.method || ''), ...(nd.priority?.ranked_issues?.slice(0, 2).map(i => i.issue) || [])]
        : (ev.improvement_plan?.immediate_actions || []),
      targeted_training: nd.secondary_suggestions?.map(s => s.issue + ': ' + s.suggestion) || [],
      recommended_resources: nd.recommended_resources || []
    }
    ev.navigation_narrative = nd.narrative || ''
    ev.core_prescription = nd.core_prescription || null
    ev.priority = nd.priority || null
  }

  return ev
}

function displayReport(report) {
  reportData.value = report
  reportAssessmentData.value = transformReportData(report)
  // 优先使用当前考站的剖面 (report.profile)，兜底取 profileReports 中第一个
  profileAnalysis.value = report.profile || Object.values(report.profileReports || {}).filter(Boolean)[0] || null
}

// ═══════════════════════════════════════════════════════
// 报告派生数据
// ═══════════════════════════════════════════════════════

const compEval = computed(() => reportAssessmentData.value?.comprehensive_evaluation || {})

const scoringRatio = computed(() => {
  const s = reportScoringCalcTotal.value
  const m = reportScoringMaxTotal.value
  return m > 0 ? s / m : 0
})

const aiPraise = computed(() => {
  const rate = scoringRatio.value
  if (rate >= 0.9) return '表现优秀！你是团队的重要资产，继续发光发热！'
  if (rate >= 0.85) return '非常出色！你的专业能力令人印象深刻，继续保持！'
  if (rate >= 0.8) return '表现良好！稳扎稳打，持续精进，未来可期！'
  if (rate >= 0.7) return '不错的表现！再接再厉，你会越来越优秀！'
  if (rate >= 0.6) return '还有提升空间，建议针对薄弱环节加强练习。'
  return '需要加强训练，扎实的基础是成为优秀医生的关键。'
})

const patientInfoName = computed(() => {
  const pi = reportData.value?.caseInfo?.patient_info
  return pi?.name || ''
})
const patientInfoAge = computed(() => {
  const pi = reportData.value?.caseInfo?.patient_info
  return pi?.age || ''
})
const patientInfoSex = computed(() => {
  const pi = reportData.value?.caseInfo?.patient_info
  if (pi?.sex !== undefined) return pi.sex === 0 ? '女' : '男'
  return pi?.gender || ''
})
const patientAvatar = computed(() => {
  const pi = reportData.value?.caseInfo?.patient_info
  return pi?.avatar || ''
})

const activeSheetGroups = computed(() => {
  if (!reportAssessmentData.value?.scoring) return []
  return reportAssessmentData.value.scoring.sheetGroups || []
})
const currentSheetGroup = computed(() => {
  const gs = activeSheetGroups.value
  return gs.length ? gs[Math.min(activeSheetIdx.value, gs.length - 1)] : null
})
const currentMaxTotal = computed(() => currentSheetGroup.value?.maxTotal ?? reportScoringMaxTotal.value)
const currentCalcTotal = computed(() => currentSheetGroup.value?.calcTotal ?? reportScoringCalcTotal.value)

const reportScoringCalcTotal = computed(() => {
  if (!reportAssessmentData.value?.scoring) return 0
  return Math.round(reportAssessmentData.value.scoring.items.reduce((s, it) => s + (it.awarded_score || 0), 0) * 10) / 10
})
const reportScoringMaxTotal = computed(() => {
  if (!reportAssessmentData.value?.scoring) return 0
  return Math.round(reportAssessmentData.value.scoring.items.reduce((s, it) => s + (it.max_score || 0), 0) * 10) / 10
})

const scoringItemsWithSpan = computed(() => {
  const items = currentSheetGroup.value?.items || []
  if (!items.length) return []
  return items.map((item, idx, arr) => {
    const result = { ...item }
    if (idx === 0 || arr[idx - 1].category !== item.category) {
      result._showCategory = true
      let span = 1
      for (let j = idx + 1; j < arr.length && arr[j].category === item.category; j++) span++
      result._categorySpan = span
    } else {
      result._showCategory = false; result._categorySpan = 0
    }
    if (idx === 0 || arr[idx - 1].subcategory !== item.subcategory) {
      result._showSubcategory = true
      let span = 1
      for (let j = idx + 1; j < arr.length && arr[j].subcategory === item.subcategory; j++) span++
      result._subcategorySpan = span
    } else {
      result._showSubcategory = false; result._subcategorySpan = 0
    }
    return result
  })
})

const radarLabels = computed(() => {
  if (!compEval.value.radar_chart) return []
  const m = {
    clinical_reasoning: '临床思维逻辑推理',
    organizational_proficiency: '组织效能与专业性',
    communication_skills: '沟通与人际技巧',
    medical_knowledge: '医学知识应用'
  }
  return Object.entries(m).map(([k, n]) => ({
    key: k, name: n,
    score: compEval.value.radar_chart[k]?.score ?? compEval.value.radar_chart[k] ?? 0
  }))
})

// 操作记录 — 从 inputData 提取对话
const opSubTabRows = computed(() => {
  const raw = reportAssessmentData.value?._raw
  if (!raw?.inputData) return []
  const dialog = raw.inputData.allRecords?.dialog || (Array.isArray(raw.inputData.records) ? raw.inputData.records : raw.inputData.records?.dialog) || []
  const exam = raw.inputData.allRecords?.exam || raw.inputData.records?.exam || []
  if (opSubTab.value === 'history') {
    return dialog.filter(d => d.speaker === 'student').map((d, i) => {
      const next = dialog.slice(i * 2 + 1)[0]
      return { round: d.round || (i + 1), item: d.content || '', answer: next?.content || '' }
    })
  }
  if (opSubTab.value === 'exam') {
    return exam.filter(e => e.speaker === 'student' || e.role === 'user').map((e, i) => {
      const next = exam.slice(i * 2 + 1)[0]
      return { round: e.round || (i + 1), item: e.content || '', answer: next?.content || '' }
    })
  }
  return []
})

// ═══════════════════════════════════════════════════════
// 雷达图绘制
// ═══════════════════════════════════════════════════════

function drawRadarCanvas(canvas, data) {
  const ctx = canvas.getContext('2d')
  const s = canvas.width; const c = s / 2; const r = s * 0.33
  const labels = ['临床思维\n逻辑推理', '组织效能\n与专业性', '沟通与人\n际技巧', '医学知识\n应用']
  const keys = ['clinical_reasoning', 'organizational_proficiency', 'communication_skills', 'medical_knowledge']
  const scores = keys.map(k => {
    const v = data[k] && typeof data[k] === 'object' ? data[k].score : data[k]
    return v || 0
  })
  ctx.clearRect(0, 0, s, s)
  for (let i = 1; i <= 5; i++) {
    const st = r * (i / 5)
    ctx.beginPath()
    for (let j = 0; j < keys.length; j++) {
      const a = (Math.PI * 2 * j / keys.length) - Math.PI / 2
      const x = c + st * Math.cos(a); const y = c + st * Math.sin(a)
      if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
    }
    ctx.closePath(); ctx.strokeStyle = '#e0dcd3'; ctx.lineWidth = 0.8; ctx.stroke()
  }
  for (let j = 0; j < keys.length; j++) {
    const a = (Math.PI * 2 * j / keys.length) - Math.PI / 2
    ctx.beginPath(); ctx.moveTo(c, c); ctx.lineTo(c + r * Math.cos(a), c + r * Math.sin(a))
    ctx.strokeStyle = '#ccc'; ctx.stroke()
    const lx = c + (r + 22) * Math.cos(a); const ly = c + (r + 22) * Math.sin(a)
    ctx.fillStyle = '#333'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    labels[j].split('\n').forEach((l, idx) => ctx.fillText(l, lx, ly - 5 + idx * 13))
  }
  ctx.beginPath()
  for (let j = 0; j < keys.length; j++) {
    const a = (Math.PI * 2 * j / keys.length) - Math.PI / 2
    const v = Math.min(1, scores[j] / 10)
    const x = c + r * v * Math.cos(a); const y = c + r * v * Math.sin(a)
    if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  }
  ctx.closePath(); ctx.fillStyle = 'rgba(37,99,235,0.2)'; ctx.fill()
  ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 2; ctx.stroke()
  for (let j = 0; j < keys.length; j++) {
    const a = (Math.PI * 2 * j / keys.length) - Math.PI / 2
    const v = Math.min(1, scores[j] / 10)
    const x = c + r * v * Math.cos(a); const y = c + r * v * Math.sin(a)
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fillStyle = '#2563eb'; ctx.fill()
  }
}

// ═══════════════════════════════════════════════════════
// 列表操作
// ═══════════════════════════════════════════════════════

function fetchPage() {
  let filtered = [...allRecords.value]
  const f = filters.value
  if (f.caseKeyword) {
    const kw = f.caseKeyword.toLowerCase()
    filtered = filtered.filter(r =>
      (r.caseId || '').toLowerCase().includes(kw) ||
      (r.caseTitle || '').toLowerCase().includes(kw) ||
      (r.disease || '').toLowerCase().includes(kw) ||
      (r.specialty || '').toLowerCase().includes(kw)
    )
  }
  if (f.stationType) {
    if (f.stationType === '1.0版') filtered = filtered.filter(r => r.trainingVersion === '1.0')
    else if (f.stationType === '全流程版') filtered = filtered.filter(r => r.trainingVersion === 'full-flow')
    else filtered = filtered.filter(r => r.stationLabel === f.stationType)
  }
  if (f.dateFrom) filtered = filtered.filter(r => formatDate(r.recordedAt) >= f.dateFrom)
  if (f.dateTo) filtered = filtered.filter(r => formatDate(r.recordedAt) <= f.dateTo)
  total.value = filtered.length
  tableData.value = filtered.slice((currentPage.value - 1) * pageSize.value, (currentPage.value - 1) * pageSize.value + pageSize.value)
}

function formatTime(t) {
  if (!t) return ''
  try { const d = new Date(t); if (isNaN(d.getTime())) return String(t).slice(0, 16); return d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) } catch { return t }
}
function formatDate(t) {
  if (!t) return ''
  try { const d = new Date(t); if (isNaN(d.getTime())) return String(t).slice(0, 10); return d.toISOString().slice(0, 10) } catch { return String(t).slice(0, 10) }
}

const totalPages = computed(() => Math.ceil(total.value / pageSize.value) || 1)
const handleSearch = () => { currentPage.value = 1; fetchPage() }
const handleReset = () => { filters.value = { caseKeyword: '', stationType: '', dateFrom: '', dateTo: '', trainingVersion: '' }; handleSearch() }
const handleExport = () => toast.show(`导出当前筛选结果共 ${total.value} 条训练记录`)
const onPageSizeChange = () => { currentPage.value = 1; fetchPage() }

// ── 报告操作 ──
const openReport = async (item) => {
  reportItem.value = item
  reportTab.value = 'comprehensive'
  activeSheetIdx.value = 0
  opSubTab.value = 'history'
  reportData.value = null
  reportAssessmentData.value = null
  profileAnalysis.value = null
  const data = await fetchReport(item.caseId, item.stationId, item.reportTimestamp)
  if (data) {
    displayReport(data)
  } else {
    toast.show('该记录暂无成绩报告')
  }
  reportVisible.value = true
  nextTick(() => { if (reportAssessmentData.value) drawAllCanvases() })
}

const closeReport = () => { reportVisible.value = false }
const switchReportTab = (tab) => { reportTab.value = tab; if (reportBodyRef.value) reportBodyRef.value.scrollTop = 0; if (tab === 'comprehensive') nextTick(() => drawAllCanvases()) }
const switchOpSubTab = (tab) => { opSubTab.value = tab; if (reportBodyRef.value) reportBodyRef.value.scrollTop = 0 }

function drawAllCanvases() {
  nextTick(() => {
    const rC = radarCanvas.value
    if (rC && compEval.value.radar_chart) drawRadarCanvas(rC, compEval.value.radar_chart)
  })
}

// ── 生命周期 ──
watch(currentPage, () => fetchPage())
watch(pageSize, () => { currentPage.value = 1 })
onMounted(() => { fetchRecords() })
</script>

<style scoped>
/* ═══ 报告遮罩 ═══ */
.report-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.45);
  display: flex; align-items: center; justify-content: center;
  z-index: 900;
}
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
  flex-shrink: 0; background: var(--background);
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
.report-drawer-body { flex: 1; overflow-y: auto; padding: 24px; }

/* ═══ 顶部三栏 ═══ */
.report-top-row {
  display: grid; grid-template-columns: 220px 1fr 1fr;
  gap: 20px; align-items: start;
  margin-bottom: 20px; padding-bottom: 20px;
  border-bottom: 1px solid var(--border);
}
.report-score-card { display: flex; flex-direction: column; align-items: center; padding: 12px 8px; }
.score-big { font-size: 52px; font-weight: 800; color: var(--primary); line-height: 1.1; letter-spacing: -1px; }
.score-unit { font-size: 20px; font-weight: 500; margin-left: 2px; }
.score-badge { display: inline-block; padding: 3px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; color: #fff; margin-top: 6px; }
.score-pass-high { background: var(--success); }
.score-pass { background: var(--primary); }
.score-fail { background: var(--error); }
.score-praise { font-size: 12px; color: var(--text-secondary); text-align: center; line-height: 1.5; margin-top: 8px; }
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
.info-avatar-student { background: #e5e7eb; color: var(--text-tertiary); }
.info-avatar-patient { background: var(--primary); color: #fff; font-weight: 700; }
.info-body { flex: 1; min-width: 0; }
.info-row { font-size: 13px; margin-bottom: 3px; display: flex; align-items: center; gap: 4px; }
.info-row-sm { font-size: 12px; color: var(--text-secondary); margin-top: 1px; }
.info-label { color: var(--text-tertiary); font-size: 12px; margin-right: 4px; }
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
.eval-title { font-size: 14px; font-weight: 700; color: var(--text-main); margin: 0 0 10px; display: flex; align-items: center; gap: 6px; }
.eval-title i { color: var(--primary); font-size: 13px; }
.eval-block { margin-bottom: 14px; }
.eval-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.eval-tag { display: inline-block; padding: 5px 12px; border-radius: 8px; font-size: 12px; font-weight: 500; line-height: 1.4; }
.eval-tag-good { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
.eval-tag-bad { background: #fefafa; color: #b91c1c; border: 1px solid #fecaca; }

.radar-wrap { display: flex; gap: 32px; flex-wrap: wrap; align-items: center; justify-content: center; margin-top: 8px; }
.radar-legend { font-size: 13px; min-width: 160px; }
.radar-legend-item { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; padding: 6px 10px; background: var(--background); border-radius: 6px; }
.radar-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--primary); flex-shrink: 0; }
.radar-score { margin-left: auto; color: var(--primary); font-weight: 700; }

.conclusion-card { padding: 16px 20px; border-radius: 10px; font-size: 13px; line-height: 1.9; color: var(--text-secondary); background: #fffbeb; border: 1px solid #fde68a; }
.plan-group { margin-bottom: 12px; }
.plan-subtitle { font-size: 13px; font-weight: 600; color: var(--text-main); margin: 0 0 6px; }
.plan-item { padding: 10px 16px; margin: 6px 0; border-radius: 8px; font-size: 13px; line-height: 1.6; background: var(--card-bg); border: 1px solid var(--border-light); }
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
.sheet-tab { padding: 7px 18px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500; border: 1px solid var(--border); background: var(--card-bg); color: var(--text-secondary); transition: all .15s; }
.sheet-tab:hover { border-color: var(--primary); color: var(--primary); }
.sheet-tab.active { background: var(--primary); color: #fff; border-color: var(--primary); }

.table-wrap { overflow-x: auto; border-radius: 10px; border: 1px solid var(--border); }
.data-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.data-table th { background: #f8fafc; padding: 10px 12px; text-align: left; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: .3px; color: var(--text-secondary); border-bottom: 1px solid var(--border); white-space: nowrap; }
.data-table td { padding: 9px 12px; border-bottom: 1px solid var(--border-light); font-size: 12px; vertical-align: middle; }
.data-table tbody tr:hover { background: #fafcff; }
.data-table tbody tr:last-child td { border-bottom: none; }

.col-num { width: 50px; text-align: center; }
.col-time { width: 160px; }
.col-score { width: 90px; text-align: center; }
.col-evidence { min-width: 220px; }
.td-center { text-align: center; }
.td-nowrap { white-space: nowrap; }
.td-evidence { max-width: 240px; }

.sc-danger { color: var(--error); font-weight: 700; }
.sc-full { color: var(--success); font-weight: 700; }
.sc-mid { color: var(--warning); font-weight: 700; }
.row-low { background: #fef2f2; }

/* ═══ 操作记录 ═══ */
.op-sub-bar { display: flex; gap: 4px; margin-bottom: 16px; flex-wrap: wrap; }
.op-sub-btn { padding: 7px 16px; border-radius: 8px; cursor: pointer; font-size: 13px; border: 1px solid var(--border); background: var(--card-bg); color: var(--text-secondary); transition: all .15s; }
.op-sub-btn:hover { border-color: var(--primary); color: var(--primary); }
.op-sub-btn.active { background: var(--primary); color: #fff; border-color: var(--primary); }

.empty-state { text-align: center; padding: 48px 20px; color: var(--text-tertiary); font-size: 14px; }

/* ═══ 剖面分析 ═══ */
.profile-coverage-bar { margin-bottom: 12px; }
.coverage-stats { display: flex; gap: 12px; align-items: center; margin-bottom: 6px; flex-wrap: wrap; }
.cov-stat { font-size: 13px; padding: 2px 8px; border-radius: 4px; }
.cov-covered { background: #d1fae5; color: #065f46; }
.cov-partial { background: #fef3c7; color: #92400e; }
.cov-missed { background: #fee2e2; color: #991b1b; }
.cov-rate { font-size: 20px; font-weight: 700; color: var(--primary); margin-left: auto; }
.coverage-bar-track { height: 8px; border-radius: 4px; background: #e5e7eb; overflow: hidden; }
.coverage-bar-fill { height: 100%; border-radius: 4px; background: linear-gradient(90deg, #ef4444, #f59e0b, #10b981); transition: width 0.6s ease; }
.profile-narrative { font-size: 13px; color: var(--text-secondary); line-height: 1.6; margin: 8px 0; }
.strategy-badge-wrap { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.strategy-type-badge { font-size: 15px; font-weight: 700; padding: 4px 14px; border-radius: 20px; }
.strategy-confidence { font-size: 12px; color: var(--text-tertiary); }
.strategy-chars { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 12px; }
.char-row { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 8px; background: var(--bg-secondary); border-radius: 4px; }
.char-row span:first-child { color: var(--text-secondary); }
.char-row span:last-child { font-weight: 600; }
.initial-hypotheses { margin-bottom: 12px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.ih-label { font-size: 13px; color: var(--text-secondary); }
.ih-tag { font-size: 13px; background: #ede9fe; color: #6b21a8; padding: 2px 10px; border-radius: 12px; font-weight: 500; }

.strat-hypothesis_driven { background: #dbeafe; color: #1e40af; }
.strat-template_driven { background: #fef3c7; color: #92400e; }
.strat-random_jumping { background: #fee2e2; color: #991b1b; }
.safety-active_screening { background: #d1fae5; color: #065f46; }
.safety-triggered_reactive { background: #fef3c7; color: #92400e; }
.safety-safety_neglect { background: #fee2e2; color: #991b1b; }
.empathy-substantive { background: #d1fae5; color: #065f46; }
.empathy-superficial { background: #fef3c7; color: #92400e; }
.empathy-absent { background: #fee2e2; color: #991b1b; }

.disabled-link { color: #ccc !important; cursor: default; pointer-events: none; }
</style>
