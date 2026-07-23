<template>
  <div class="content-container">
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

    <div class="card mb-4" style="padding: 20px;">
      <div class="filter-row">
        <div class="filter-item" style="min-width: 180px;">
          <label>学员姓名/手机号</label>
          <input class="input" placeholder="输入姓名或手机号搜索" v-model="filters.keyword" @keyup.enter="handleSearch">
        </div>
        <div class="filter-item" style="min-width: 200px;">
          <label>案例编码/名称</label>
          <input class="input" placeholder="案例编码或名称" v-model="filters.caseKeyword" @keyup.enter="handleSearch">
        </div>
        <div class="filter-item">
          <label>考站类型</label>
          <select class="select" v-model="filters.stationType">
            <option value="">全部</option>
            <option value="接诊站">接诊站</option>
            <option value="分析站">分析站</option>
            <option value="沟通站">沟通站</option>
            <option value="书写站">书写站</option>
            <option value="综合站">综合站</option>
          </select>
        </div>
        <div class="filter-item">
          <label>来源机构</label>
          <select class="select" v-model="filters.institution">
            <option value="">全部</option>
            <option v-for="inst in allInstitutions" :key="inst" :value="inst">{{ inst }}</option>
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
      </div>
    </div>

    <div class="card" style="padding: 0;">
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th class="sticky-left" style="left:0; min-width:120px">学员姓名</th>
              <th>手机号</th>
              <th>来源机构</th>
              <th style="min-width:180px">案例</th>
              <th>考站类型</th>
              <th>AI评分</th>
              <th>训练用时</th>
              <th>训练时间</th>
              <th class="sticky-right" style="right:0; min-width:140px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in tableData" :key="item.id">
              <td class="sticky-left" style="left:0; font-weight:600">{{ item.studentName }}</td>
              <td>{{ item.phone }}</td>
              <td>{{ item.institution }}</td>
              <td>
                <a href="#" @click.prevent="viewDetail(item)" style="color:var(--primary);text-decoration:none;font-weight:500">{{ item.caseCode }}</a>
                <div style="font-size:12px;color:var(--text-secondary);margin-top:2px">{{ item.caseName }}</div>
              </td>
              <td><span class="badge badge-info">{{ item.stationType }}</span></td>
              <td>{{ item.aiScore }}</td>
              <td>{{ item.duration }}分钟</td>
              <td>{{ item.trainTime }}</td>
              <td class="sticky-right whitespace-nowrap" style="right:0">
                <a class="action-link" @click="openReport(item)">成绩报告</a>
                <a class="action-link" @click="regenerateReport(item)">重新生成</a>
              </td>
            </tr>
            <tr v-if="tableData.length === 0">
              <td :colspan="9" class="text-center py-8 text-secondary">暂无数据</td>
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

    <div v-if="detailVisible" class="modal-overlay" @click.self="detailVisible = false">
      <div class="drawer-container" style="width: 780px; max-height: 90vh;">
        <div class="drawer-header">
          <span>训练详情</span>
          <button class="btn-default btn-sm" @click="detailVisible = false">✕</button>
        </div>
        <div class="drawer-body" v-if="detailItem">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px 24px; margin-bottom:16px; padding-bottom:12px; border-bottom:1px solid var(--border);">
            <div><span class="text-secondary">学员姓名：</span><strong>{{ detailItem.studentName }}</strong></div>
            <div><span class="text-secondary">手机号：</span><strong>{{ detailItem.phone }}</strong></div>
            <div><span class="text-secondary">案例编码：</span><strong>{{ detailItem.caseCode }}</strong></div>
            <div><span class="text-secondary">案例名称：</span><strong>{{ detailItem.caseName }}</strong></div>
            <div><span class="text-secondary">来源机构：</span><strong>{{ detailItem.institution }}</strong></div>
            <div><span class="text-secondary">考站类型：</span><span class="badge badge-info">{{ detailItem.stationType }}</span></div>
            <div><span class="text-secondary">训练时间：</span><strong>{{ detailItem.trainTime }}</strong></div>
          </div>

          <h4 style="margin-bottom:12px;font-size:15px">各模块训练明细</h4>
          <div class="card mb-4" style="padding:0; background: var(--background);">
            <div class="table-wrapper" style="max-height:260px;">
              <table class="table" style="min-width:700px">
                <thead><tr><th>训练模块</th><th>满分</th><th>得分</th><th>得分率</th><th>AI评分</th><th>用时</th><th>AI反馈</th></tr></thead>
                <tbody>
                  <tr v-for="md in detailItem.moduleDetails" :key="md.name">
                    <td style="font-weight:600">{{ md.name }}</td><td>{{ md.maxScore }}</td>
                    <td :class="getScoreClass(md.score, md.maxScore)">{{ md.score }}</td>
                    <td><div style="display:flex;align-items:center;gap:6px"><div style="flex:1;height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden"><div :style="{width: md.rate + '%', background: getRateColor(md.rate), height:'100%', borderRadius:'3px'}"></div></div><span style="font-size:13px">{{ md.rate }}%</span></div></td>
                    <td>{{ md.aiScore }}</td><td>{{ md.duration }}min</td>
                    <td style="max-width:200px;font-size:13px;color:var(--text-secondary)">{{ md.feedback }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
            <div><h4 style="margin-bottom:8px;font-size:15px">成绩汇总</h4><div class="card" style="padding:16px; background: var(--background);"><div style="display:flex;justify-content:space-between;padding:6px 0"><span>综合得分：</span><strong style="font-size:18px" :class="getTotalClass(detailItem.totalScore)">{{ detailItem.totalScore }}</strong></div><div style="display:flex;justify-content:space-between;padding:6px 0"><span>AI综合评分：</span>{{ detailItem.aiScore }}</div><div style="display:flex;justify-content:space-between;padding:6px 0"><span>训练用时：</span>{{ detailItem.duration }} 分钟</div></div></div>
            <div><h4 style="margin-bottom:8px;font-size:15px">AI综合评估与建议</h4><div class="card" style="padding:16px; background: var(--background);"><p style="font-size:14px;line-height:1.6;color:var(--text-secondary)">{{ detailItem.aiFeedback || '暂无AI评估反馈' }}</p></div></div>
          </div>
        </div>
        <div class="drawer-footer" style="justify-content: flex-end; gap: 8px;">
          <button class="btn" @click="openReport(detailItem)">成绩报告</button>
          <button class="btn-primary" @click="detailVisible = false">关闭</button>
        </div>
      </div>
    </div>

    <div v-if="reportVisible" class="modal-overlay" @click.self="closeReport">
      <div class="drawer-container report-drawer">
        <div class="drawer-header">
          <span>📋 成绩报告 — {{ reportItem ? reportItem.studentName : '' }}</span>
          <div class="flex gap-2 items-center">
            <button class="btn btn-sm" @click="exportPDF">📥 导出PDF</button>
            <button class="btn-default btn-sm" @click="closeReport">✕</button>
          </div>
        </div>
        <div ref="reportBodyRef" class="drawer-body report-body" v-if="reportAssessmentData">
          <div ref="reportContentRef" class="report-print-area">

            <div class="report-header-3col">
              <div class="report-header-score">
                <div class="rhs-score-val">{{ reportScoringCalcTotal }}<span class="rhs-score-unit">分</span></div>
                <span class="badge" style="background:#2563eb;color:#fff;font-size:12px;padding:2px 10px;border-radius:10px;">{{ reportScoringCalcTotal >= reportScoringMaxTotal * 0.6 ? '达标' : '未达标' }}</span>
                <div class="rhs-score-note">你是团队的重要资产，继续发光发热！</div>
              </div>
              <div class="report-header-student">
                <div class="rhs-avatar rhs-avatar-gray">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-7 8-7s8 3 8 7"/></svg>
                </div>
                <div class="rhs-info">
                  <div class="rhs-info-row"><span class="rhs-label">姓名：</span>{{ reportItem.studentName }}</div>
                  <div class="rhs-info-row"><span class="rhs-label">学号：</span>{{ reportItem.phone }}</div>
                  <div class="rhs-info-row"><span class="rhs-label">专业：</span>内科专业</div>
                  <div class="rhs-info-row"><span class="rhs-label">机构：</span>{{ reportItem.institution || '北京清华长庚医院' }}</div>
                </div>
              </div>
              <div class="report-header-patient">
                <div class="rhs-avatar rhs-avatar-img" style="background-image:url('images/patients/patient-male-45.jpg');background-size:cover;background-position:center;"></div>
                <div class="rhs-info">
                  <div class="rhs-info-row"><strong>被问诊者</strong> 张建国 <span class="rhs-patient-age">52岁</span></div>
                  <div class="rhs-info-row" style="font-size:12px;color:var(--text-secondary);margin-top:2px;">病例：CASE-202405001 急性阑尾炎接诊</div>
                  <div class="rhs-info-row" style="font-size:12px;color:var(--text-secondary);">性别：男 | 职业：退休工人</div>
                  <div class="rhs-info-row" style="font-size:12px;color:var(--text-secondary);margin-top:2px;">主诉：反复右上腹痛1周，加重伴发热1天</div>
                </div>
              </div>
            </div>

            <div class="report-meta-bar" v-if="reportAssessmentData">
              <span class="score-meta-tag strictness">⚙️ 严格度：<strong>{{ reportAssessmentData.meta.strictness === 'normal' ? '标准' : reportAssessmentData.meta.strictness }}</strong></span>
              <span class="score-meta-tag mode">🧠 能力模式：<strong>{{ reportAssessmentData.meta.ability_mode === 'normal' ? '标准' : reportAssessmentData.meta.ability_mode }}</strong></span>
            </div>

            <div class="report-tabs">
              <div class="inner-tabs" style="flex:0 0 auto">
                <div class="tab-item" :class="{ active: reportTab === 'comprehensive' }" @click="switchReportTab('comprehensive')">📝 综合评价</div>
                <div class="tab-item" :class="{ active: reportTab === 'scoring' }" @click="switchReportTab('scoring')">📊 得分详情</div>
                <div class="tab-item" :class="{ active: reportTab === 'operations' }" @click="switchReportTab('operations')">📜 操作记录</div>
              </div>
            </div>

            <template v-if="reportTab === 'comprehensive'">
              <div class="comprehensive-bg">
              <div class="comprehensive-section" v-if="reportAssessmentData.comprehensive_evaluation.overall_performance">
                <div v-if="reportAssessmentData.comprehensive_evaluation.overall_performance.strengths && reportAssessmentData.comprehensive_evaluation.overall_performance.strengths.length" style="margin-bottom:10px;">
                  <strong style="font-size:14px;">🌟 核心亮点</strong>
                  <div class="flex gap-1 flex-wrap mt-1">
                    <span v-for="s in reportAssessmentData.comprehensive_evaluation.overall_performance.strengths" :key="s" class="badge badge-success" style="font-size:12px;padding:4px 10px;">{{ s }}</span>
                  </div>
                </div>
                <div v-if="reportAssessmentData.comprehensive_evaluation.overall_performance.weaknesses && reportAssessmentData.comprehensive_evaluation.overall_performance.weaknesses.length">
                  <strong style="font-size:14px;">⚠️ 关键失分点</strong>
                  <div class="flex gap-1 flex-wrap mt-1">
                    <span v-for="w in reportAssessmentData.comprehensive_evaluation.overall_performance.weaknesses" :key="w" class="badge badge-error" style="font-size:12px;padding:4px 10px;">{{ w }}</span>
                  </div>
                </div>
              </div>

              <div class="comprehensive-section" v-if="reportAssessmentData.comprehensive_evaluation.radar_chart">
                <strong style="font-size:14px;">📡 临床胜任力雷达图</strong>
                <div class="chart-center">
                  <div style="display:flex;gap:24px;flex-wrap:wrap;align-items:center;justify-content:center;margin-top:12px;">
                    <canvas ref="radarCanvas" width="280" height="280" style="flex-shrink:0;"></canvas>
                    <div style="font-size:13px;min-width:140px;">
                      <div v-for="label in radarLabels" :key="label.key" style="margin-bottom:6px;">
                        <strong>{{ label.name }}</strong>: {{ label.score }}/10
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="comprehensive-section" v-if="reportAssessmentData.comprehensive_evaluation.overall_conclusion">>
                <strong style="font-size:14px;">📝 总结评语</strong>
                <div class="card" style="padding:14px 18px;margin-top:8px;font-size:13px;line-height:1.8;color:var(--text-secondary);background:#fffef9;border-color:#e8e2d0;">
                  {{ reportAssessmentData.comprehensive_evaluation.overall_conclusion }}
                </div>
              </div>

              <div class="comprehensive-section" v-if="reportAssessmentData.comprehensive_evaluation.improvement_plan">
                <strong style="font-size:14px;">🎯 个性化改进计划</strong>
                <div style="margin-top:8px;">
                  <div v-if="reportAssessmentData.comprehensive_evaluation.improvement_plan.immediate_actions && reportAssessmentData.comprehensive_evaluation.improvement_plan.immediate_actions.length">
                    <strong style="font-size:13px;">⚡ 立即行动项</strong>
                    <div v-for="a in reportAssessmentData.comprehensive_evaluation.improvement_plan.immediate_actions" :key="a" class="card" style="padding:10px 14px;margin:6px 0;font-size:13px;border-left:3px solid var(--primary);">🔹 {{ a }}</div>
                  </div>
                  <div v-if="reportAssessmentData.comprehensive_evaluation.improvement_plan.targeted_training && reportAssessmentData.comprehensive_evaluation.improvement_plan.targeted_training.length" style="margin-top:10px;">
                    <strong style="font-size:13px;">📚 针对性训练</strong>
                    <div v-for="t in reportAssessmentData.comprehensive_evaluation.improvement_plan.targeted_training" :key="t" class="card" style="padding:10px 14px;margin:6px 0;font-size:13px;border-left:3px solid var(--success);">📖 {{ t }}</div>
                  </div>
                </div>
              </div>
            </div>
            </template>

            <template v-if="reportTab === 'scoring'">
              <div class="score-meta-bar">
                <span class="score-meta-tag strictness">⚙️ 严格度：<strong>{{ reportAssessmentData.meta.strictness === 'normal' ? '标准' : reportAssessmentData.meta.strictness }}</strong></span>
                <span class="score-meta-tag mode">🧠 能力模式：<strong>{{ reportAssessmentData.meta.ability_mode === 'normal' ? '标准' : reportAssessmentData.meta.ability_mode }}</strong></span>
              </div>

              <div v-if="activeSheetGroups && activeSheetGroups.length > 1" class="mb-3">
                <div class="score-sheet-tabs">
                  <div v-for="(sg, i) in activeSheetGroups" :key="i" class="score-sheet-tab" :class="{ active: activeSheetIdx === i }" @click="activeSheetIdx = i">{{ sg.name }}</div>
                </div>
              </div>

              <div class="table-wrapper">
                <table class="table report-scoring-table" style="font-size:12px;">
                  <thead>
                    <tr>
                      <th style="width:50px;">序号</th><th>考核项目</th><th>评分项</th><th>评分要点</th><th style="width:55px;">分值<br><small style="font-weight:400;color:var(--text-secondary)">合计 {{ currentSheetGroup ? currentSheetGroup.maxTotal : 0 }}</small></th><th style="width:55px;">得分<br><small style="font-weight:400;color:var(--text-secondary)">合计 {{ currentSheetGroup ? currentSheetGroup.calcTotal : 0 }}</small></th><th style="min-width:220px;">评分依据</th><th style="width:110px;">关联对话</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in (currentSheetGroup ? currentSheetGroup.items : [])" :key="item.item_id" :class="{ 'row-low-score': item.awarded_score < item.max_score * 0.6 && item.max_score > 0 }">
                      <td style="text-align:center;">{{ item.item_id }}</td>
                      <td>{{ item.category || '—' }}</td>
                      <td>{{ item.subcategory || '—' }}</td>
                      <td>{{ item.name || '—' }}</td>
                      <td style="text-align:center;">{{ item.max_score }}</td>
                      <td class="report-score-cell" :class="{ 'score-danger': item.awarded_score < item.max_score * 0.6 && item.max_score > 0, 'score-full': item.awarded_score === item.max_score, 'score-mid': item.awarded_score >= item.max_score * 0.6 && item.awarded_score < item.max_score }">{{ item.awarded_score }}</td>
                      <td style="font-size:11px;max-width:240px;">{{ item.evidence }}</td>
                      <td>
                        <a v-if="item.related_dialogue_ids && item.related_dialogue_ids.length" class="action-link" style="font-size:11px;" @click="openDialogueModal(item.related_dialogue_ids)">📋 查看 ({{ item.related_dialogue_ids.length }})</a>
                        <span v-else style="color:#ccc;">—</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </template>

            <template v-if="reportTab === 'operations'">
              <div class="op-sub-tabs">
                <div class="op-sub-tab" :class="{ active: opSubTab === 'history' }" @click="switchOpSubTab('history')">病史采集</div>
                <div class="op-sub-tab" :class="{ active: opSubTab === 'exam' }" @click="switchOpSubTab('exam')">体格检查</div>
                <div class="op-sub-tab" :class="{ active: opSubTab === 'diagnosis' }" @click="switchOpSubTab('diagnosis')">初步诊断</div>
                <div class="op-sub-tab" :class="{ active: opSubTab === 'treatment' }" @click="switchOpSubTab('treatment')">治疗计划</div>
                <div class="op-sub-tab" :class="{ active: opSubTab === 'record' }" @click="switchOpSubTab('record')">病历书写</div>
              </div>

              <template v-if="opSubTab === 'history' || opSubTab === 'exam'">
                <div class="table-wrapper">
                  <table class="table op-record-table" style="font-size:12px;">
                    <thead>
                      <tr>
                        <th style="width:50px;">序号</th>
                        <th style="width:160px;">时间</th>
                        <th style="min-width:130px;">{{ opSubTab === 'history' ? '医生提问' : '检查项目' }}</th>
                        <th style="min-width:180px;">{{ opSubTab === 'history' ? '病人回答' : '检查结果' }}</th>
                        <th style="min-width:180px;">分析</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(row, idx) in opSubTabRows" :key="idx">
                        <td style="text-align:center;">{{ idx + 1 }}</td>
                        <td style="white-space:nowrap;">{{ row.time }}</td>
                        <td>{{ row.item }}</td>
                        <td>{{ row.answer }}</td>
                        <td>{{ row.analysis }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </template>

              <template v-if="opSubTab === 'diagnosis'">
                <div class="op-text-card">
                  <div class="op-text-section"><span class="op-text-label">初步诊断：</span>十二指肠溃疡</div>
                  <div class="op-text-section" style="margin-top:10px;">
                    <span class="op-text-label">诊断依据：</span>
                    <div class="op-text-long">1. 症状：上腹部规律性疼痛，饭后2-3小时加重，进食或服用抑酸药后缓解，伴有夜间疼痛，病程约6个月。<br>
                    2. 既往史：患者自述长期饮食不规律，工作压力大，每日饮用咖啡3-4杯，偶有饮酒，无吸烟史。<br>
                    3. 体格检查：上腹部剑突下偏右有轻度压痛，无反跳痛及肌紧张，Murphy征阴性。<br>
                    4. 辅助检查：2024年3月胃镜检查提示十二指肠球部前壁可见一约0.8cm×0.6cm溃疡，边缘整齐，底覆白苔，周围黏膜充血水肿。快速尿素酶试验HP阳性。<br>
                    5. 鉴别诊断要点：需排除胃溃疡（疼痛多在饭后半小时出现）、慢性胃炎（疼痛规律性不如溃疡明显）、功能性消化不良（无器质性病变证据）。</div>
                  </div>
                  <div class="op-text-section" style="margin-top:10px;"><span class="op-text-label">鉴别诊断：</span>胃癌</div>
                </div>
              </template>

              <template v-if="opSubTab === 'treatment'">
                <div class="op-text-card">
                  <div class="op-text-long"><strong>1. 一般治疗</strong><br>
                    规律饮食，少食多餐，避免辛辣、过烫、过硬食物；戒酒，减少咖啡因摄入；保持充足睡眠，适度体育锻炼。<br><br>
                    <strong>2. 药物治疗</strong><br>
                    （1）根除幽门螺杆菌治疗（四联疗法14天）：<br>
                    &nbsp;&nbsp;• 奥美拉唑 20mg bid（早晚空腹服用）<br>
                    &nbsp;&nbsp;• 枸橼酸铋钾 220mg bid（早晚空腹服用）<br>
                    &nbsp;&nbsp;• 阿莫西林 1.0g bid（饭后服用，青霉素过敏者禁用）<br>
                    &nbsp;&nbsp;• 克拉霉素 0.5g bid（饭后服用）<br>
                    （2）根除治疗结束后继续抑酸治疗：<br>
                    &nbsp;&nbsp;• 奥美拉唑 20mg qd，维持4-6周，促进溃疡愈合。<br><br>
                    <strong>3. 随访计划</strong><br>
                    （1）服药结束后4周复查¹³C或¹⁴C呼气试验确认HP根除效果。<br>
                    （2）疗程结束后6-8周复查胃镜，评估溃疡愈合情况。<br>
                    （3）嘱患者记录腹痛日记，若出现黑便、呕血、剧烈腹痛等警示症状随时就诊。<br><br>
                    <strong>4. 健康教育</strong><br>
                    告知患者十二指肠溃疡的病因（HP感染、胃酸过多、药物因素等）；强调规律服药和全程治疗的重要性，不可因症状缓解擅自停药。</div>
                </div>
              </template>

              <template v-if="opSubTab === 'record'">
                <div class="op-text-card">
                  <div class="op-text-section"><span class="op-text-label">主诉：</span>发热、咳嗽 一天</div>
                  <div class="op-text-section" style="margin-top:10px;">
                    <span class="op-text-label">现病史：</span>
                    <div class="op-text-long">患者3天前因天气变化后出现发热，体温最高达38.5℃，伴咳嗽，为阵发性连声咳，有少量白痰，无寒战、无胸痛、无呼吸困难。曾在社区医院就诊，予"感冒药"（具体用药不详）治疗，症状无明显好转。发病以来，精神可，食欲稍差，睡眠可，大小便正常，体重无明显变化。</div>
                  </div>
                  <div class="op-text-section" style="margin-top:10px;">
                    <span class="op-text-label">既往史：</span>既往体健，无高血压、糖尿病史，无肝炎、结核等传染病史，无手术、外伤史，无输血史，无食物药物过敏史。预防接种史按计划进行。
                  </div>
                  <div class="op-text-section" style="margin-top:12px;">
                    <span class="op-text-label">系统回顾：</span>
                    <div class="op-system-review">
                      <div class="op-sr-item"><span class="op-sr-name">呼吸系统：</span>无慢性咳嗽、咳痰、咯血史，无胸闷、气促史。</div>
                      <div class="op-sr-item"><span class="op-sr-name">循环系统：</span>无心悸、气促、胸闷史，无高血压、冠心病史。</div>
                      <div class="op-sr-item"><span class="op-sr-name">消化系统：</span>无恶心、呕吐、腹痛、腹泻史，无黄疸史。</div>
                      <div class="op-sr-item"><span class="op-sr-name">泌尿生殖系统：</span>无尿频、尿急、尿痛史，无血尿史。</div>
                      <div class="op-sr-item"><span class="op-sr-name">血液系统：</span>无乏力、面色苍白史，无出血倾向史。</div>
                      <div class="op-sr-item"><span class="op-sr-name">内分泌及代谢系统：</span>无多饮、多尿史，无怕热、多汗史。</div>
                      <div class="op-sr-item"><span class="op-sr-name">神经精神系统：</span>无头痛、眩晕史，无抽搐史。</div>
                      <div class="op-sr-item"><span class="op-sr-name">运动系统：</span>无关节肿痛史，无活动受限史。</div>
                      <div class="op-sr-item"><span class="op-sr-name">妇产科：</span>无异常阴道流血史。</div>
                      <div class="op-sr-item"><span class="op-sr-name">月经史：</span>13岁初潮，周期28-30天，经期5天，无痛经史。</div>
                      <div class="op-sr-item"><span class="op-sr-name">婚育史：</span>已婚，孕2产1，无异常妊娠史。</div>
                    </div>
                  </div>
                  <div class="op-text-section" style="margin-top:12px;">
                    <span class="op-text-label">体格检查：</span>
                    <div class="op-text-long">T：36.8℃ P：78次/分 R：22次/分 BP：130/80mmHg<br>
                    一般情况：发育正常，神志清楚，查体合作。<br>
                    皮肤黏膜：无黄染，无皮疹，无出血点。<br>
                    全身浅表淋巴结：未触及肿大。<br>
                    头颅：无畸形，双眼睑无水肿，巩膜无黄染，双侧瞳孔等大正圆，对光反射灵敏。<br>
                    颈部：软，无抵抗，气管居中，甲状腺无肿大。<br>
                    胸部：胸廓对称，双肺呼吸音清，未闻及干湿性啰音。<br>
                    心脏：心前区无隆起，心界不大，心率78次/分，律齐，各瓣膜听诊区未闻及病理性杂音。<br>
                    腹部：平坦，无压痛、反跳痛，肝脾肋下未及，肠鸣音正常。<br>
                    脊柱四肢：无畸形，活动自如。<br>
                    神经系统：生理反射存在，病理征未引出。</div>
                  </div>
                </div>
              </template>
            </template>
          </div>
        </div>
      </div>
    </div>

    <div v-if="dialogueSubModalVisible" class="modal-overlay" @click.self="dialogueSubModalVisible = false">
      <div class="modal-container" style="width: 520px; max-height: 75vh;">
        <div class="drawer-header"><span>📋 关联对话详情</span><button class="btn-default btn-sm" @click="dialogueSubModalVisible = false">✕</button></div>
        <div class="drawer-body" v-if="dialogueSubModalEntries && dialogueSubModalEntries.length">
          <div v-for="(entry, i) in dialogueSubModalEntries" :key="i" class="card" style="padding:10px 14px;margin-bottom:10px;font-size:13px;">
            <span class="badge badge-info" style="margin-bottom:6px;">🔹 {{ entry.dialogue_id }}</span>
            <div class="flex" style="gap:8px;margin-bottom:4px;"><span style="background:#7a9db8;color:#fff;padding:1px 6px;border-radius:2px;font-size:11px;font-weight:700;">问</span><span>{{ entry.student_question || '（无内容）' }}</span></div>
            <div class="flex" style="gap:8px;margin-bottom:4px;"><span style="background:#a3b89e;color:#fff;padding:1px 6px;border-radius:2px;font-size:11px;font-weight:700;">答</span><span>{{ entry.patient_answer || '（无内容）' }}</span></div>
            <div v-if="entry.intent || entry.evaluation || entry.guidance" class="flex gap-1 flex-wrap" style="padding-top:6px;border-top:1px dashed var(--border);">
              <span v-if="entry.intent" class="badge" style="background:#f5f0e8;color:#6b5e4e;font-size:11px;">意图：{{ entry.intent }}</span>
              <span v-if="entry.evaluation" class="badge" :class="getEvalBadgeClass(entry.evaluation)" style="font-size:11px;">{{ entry.evaluation }}</span>
              <span v-if="entry.guidance" style="font-size:11px;color:var(--text-secondary);">💡 {{ entry.guidance }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { toast } from '@ai-sp/shared'
import dayjs from 'dayjs'

const filters = ref({ keyword: '', caseKeyword: '', stationType: '', institution: '', dateFrom: '', dateTo: '' })
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const tableData = ref([])
const detailVisible = ref(false)
const detailItem = ref(null)
const reportVisible = ref(false)
const reportItem = ref(null)
const reportTab = ref('comprehensive')
const reportBodyRef = ref(null)
const reportAssessmentData = ref(null)
const dialogueSubModalVisible = ref(false)
const dialogueSubModalEntries = ref([])
const radarCanvas = ref(null)
const reportContentRef = ref(null)
const activeSheetIdx = ref(0)
const opSubTab = ref('history')

const allRecords = ref([])
const allInstitutions = ['仁爱医院', '华西医院', '中山医院', '协和医院', '同济医院', '省立医院']

const studentNames = ['张明','李华','王芳','赵刚','陈静','刘洋','周丽','吴强','郑敏','孙浩','钱进','蒋涛','韩雪','杨帆','朱琳','秦峰','许诺','何平','吕良','施雅']
const phones = ['13800138001','13800138002','13800138003','13800138004','13800138005','13800138006','13800138007','13800138008','13800138009','13800138010','13800138011','13800138012','13800138013','13800138014','13800138015','13800138016','13800138017','13800138018','13800138019','13800138020']
const caseCodes = ['CASE-202405001','CASE-202405002','CASE-202405003','CASE-202405004','CASE-202405005','CASE-202405006','CASE-202405007']
const caseNames = ['急性阑尾炎接诊','COPD病例分析','高血压患者沟通','糖尿病综合管理','心梗急诊处理','肺炎综合训练','骨折急诊处置']
const stationTypes = ['接诊站','分析站','沟通站','书写站','综合站']
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

const generateMock = () => {
  const data = []
  for (let i = 0; i < 45; i++) {
    const si = i % studentNames.length; const ci = i % caseCodes.length
    const st = stationTypes[i % stationTypes.length]
    const institution = allInstitutions[i % allInstitutions.length]
    const receptionScore = randInt(18,30); const analysisScore = randInt(22,40); const communicationScore = randInt(15,30)
    const writingScore = st === '书写站' || st === '综合站' ? randInt(25,40) : 0
    const isFull = st === '综合站'
    const scores = isFull ? [receptionScore,analysisScore,communicationScore,writingScore] : [receptionScore,analysisScore,communicationScore]
    const totalScore = scores.reduce((a,b) => a+b, 0)
    const maxTotalScore = isFull ? 140 : 100
    const aiR = randInt(Math.max(0,receptionScore-3),30); const aiA = randInt(Math.max(0,analysisScore-4),40)
    const aiC = randInt(Math.max(0,communicationScore-2),30)
    const aiW = st === '书写站' || st === '综合站' ? randInt(Math.max(0,writingScore-3),40) : 0
    const aiTotal = isFull ? (aiR+aiA+aiC+aiW) : (aiR+aiA+aiC)
    const md = [
      { name:'接诊病人',maxScore:30,score:receptionScore,rate:Math.round(receptionScore/30*100),aiScore:aiR,duration:randInt(10,20),feedback:['病史采集全面，问诊逻辑清晰。','问诊流程规范，部分细节可进一步追问。','信息收集完整，沟通技巧良好。'][randInt(0,2)],briefFeedback:'问诊规范，信息完整'},
      { name:'病例分析',maxScore:40,score:analysisScore,rate:Math.round(analysisScore/40*100),aiScore:aiA,duration:randInt(15,25),feedback:['诊断思路清晰，鉴别诊断完整。','分析到位，建议拓展鉴别诊断范围。','临床推理能力强，逻辑严密。'][randInt(0,2)],briefFeedback:'诊断准确，分析全面'},
      { name:'人文沟通',maxScore:30,score:communicationScore,rate:Math.round(communicationScore/30*100),aiScore:aiC,duration:randInt(8,18),feedback:['共情表达自然，沟通策略得当。','沟通基本到位，可加强情绪安抚。','人文关怀意识突出，家属沟通技巧娴熟。'][randInt(0,2)],briefFeedback:'沟通流畅，共情到位'}
    ]
    if (st === '书写站' || st === '综合站') md.push({ name:'病历书写',maxScore:40,score:writingScore,rate:Math.round(writingScore/40*100),aiScore:aiW,duration:randInt(20,30),feedback:['病历书写规范，逻辑严密。','格式正确，部分描述可更精炼。','书写完整，主次分明。'][randInt(0,2)],briefFeedback:'书写规范，逻辑清晰'})
    data.push({ id:`train_${i+1}`, studentName:studentNames[si], phone:phones[si], institution, caseCode:caseCodes[ci], caseName:caseNames[ci], stationType:st, totalScore:totalScore+' / '+maxTotalScore, totalValue:totalScore, maxTotal:maxTotalScore, aiScore:aiTotal+' / '+maxTotalScore, duration:randInt(25,75), trainTime:dayjs().subtract(randInt(0,30),'day').format('YYYY-MM-DD HH:mm'), moduleDetails:md, aiFeedback:['整体训练表现良好，接诊和沟通能力较为突出。','基础能力扎实，本次训练在病例分析方面有明显进步。','人文沟通表现优秀，临床思维能力仍有提升空间。'][randInt(0,2)] })
  }
  return data
}
allRecords.value = generateMock()

const stats = computed(() => {
  const c = allRecords.value.length
  const scores = allRecords.value.map(r => r.totalValue)
  return { totalRecords: c, avgScore: scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : 0, passRate: c ? Math.round(allRecords.value.filter(r => r.totalValue >= (r.maxTotal*0.6)).length/c*100) : 0, avgDuration: c ? Math.round(allRecords.value.map(r=>r.duration).reduce((a,b)=>a+b,0)/c) : 0 }
})

const fetchData = () => {
  let filtered = [...allRecords.value]; const f = filters.value
  if (f.keyword) { const kw = f.keyword.toLowerCase(); filtered = filtered.filter(r => r.studentName.toLowerCase().includes(kw) || r.phone.includes(kw)) }
  if (f.caseKeyword) { const kw = f.caseKeyword.toLowerCase(); filtered = filtered.filter(r => r.caseCode.toLowerCase().includes(kw) || r.caseName.toLowerCase().includes(kw)) }
  if (f.stationType) filtered = filtered.filter(r => r.stationType === f.stationType)
  if (f.institution) filtered = filtered.filter(r => r.institution === f.institution)
  if (f.dateFrom) filtered = filtered.filter(r => r.trainTime >= f.dateFrom)
  if (f.dateTo) filtered = filtered.filter(r => r.trainTime <= f.dateTo)
  total.value = filtered.length
  tableData.value = filtered.slice((currentPage.value-1)*pageSize.value, (currentPage.value-1)*pageSize.value + pageSize.value)
}

const handleSearch = () => { currentPage.value = 1; fetchData() }
const handleReset = () => { filters.value = { keyword:'',caseKeyword:'',stationType:'',institution:'',dateFrom:'',dateTo:'' }; handleSearch() }
const handleExport = () => toast.show(`导出当前筛选结果共 ${total.value} 条训练记录（演示）`)
const viewDetail = (item) => { detailItem.value = item; detailVisible.value = true }

const generateAssessmentData = (item) => {
  const rnd = (min,max) => Math.floor(Math.random()*(max-min+1))+min
  const totalRounds = rnd(8,14)
  const qTemplates = [
    ['您好，请问您今天来主要是哪里不舒服？','最近总是头痛，已经好几年了，今天疼得特别厉害。','开场问候','稳健合规','开场要素齐全，可补充科室与职责。'],
    ['头痛大概是什么时候开始的？怎么个疼法？','大概三年前开始的，右边太阳穴这边，一跳一跳的疼。','锁定主诉特征','表现卓越','对疼痛性质追问精准。'],
    ['疼痛大概持续多长时间？','一般疼两三天，这次从昨天开始，越来越重。','了解疼痛持续时间','稳健合规','时间维度追问到位。'],
    ['除了头痛还有其他不舒服吗？','昨天开始还有点恶心，看到光眼睛特别不舒服。','筛查伴随症状','表现卓越','主动捕捉光敏感伴随症状。'],
    ['之前有过类似的情况吗？一年大概发作几次？','每年三四次吧，以前吃点止痛药能缓解。','了解发作频率','稳健合规','频次采集完整。'],
    ['有没有吃过什么药？效果怎么样？','之前吃布洛芬还挺管用的，这次吃了没啥效果。','药物疗效评估','稳健合规','可进一步追问剂量与耐受。'],
    ['平时身体怎么样？有没有高血压糖尿病之类的？','身体还行，没有什么慢性病。','既往史采集','稳健合规','可进一步追问手术外伤史。'],
    ['家里有其他人有类似头痛的吗？','我妈妈年轻时候也经常头痛，好像是偏头痛。','家族史采集','表现卓越','家族史信息获取完整。'],
    ['做什么工作的？平时压力大吗？','我是中学老师，最近带毕业班，确实挺累的。','职业与压力因素','稳健合规','可进一步追问睡眠和作息。'],
    ['有没有做过什么检查？','去年做过一次头部CT，说是没什么问题。','辅助检查史','稳健合规','辅助检查信息获取完整。'],
    ['这几天睡眠怎么样？','睡不好，头痛的时候根本睡不着。','睡眠状况评估','稳健合规','睡眠与疼痛关联追问到位。'],
    ['食欲怎么样？体重有没有明显变化？','吃不太下，体重倒是没什么变化。','一般情况评估','有待精进','应进一步系统回顾其他伴随症状。'],
    ['有没有对什么药物过敏？','没有过敏史。','过敏史筛查','稳健合规','过敏史已确认，可标记。']
  ]
  const lineAnalysis = []
  for (let i=0;i<totalRounds;i++) { const t=qTemplates[i%qTemplates.length]; lineAnalysis.push({ dialogue_id:`第${i+1}轮`, student_question:t[0], patient_answer:t[1], intent:t[2], evaluation:t[3], guidance:t[4] }) }

  const buildSheetItem = (idx, cat, subcat, name, max) => {
    const score = rnd(Math.max(0,Math.floor(max*0.3)),max)
    const rc = rnd(0,2); const rids = []
    for (let r=0;r<rc;r++) rids.push(`第${rnd(1,totalRounds)}轮`)
    return { item_id: idx, category: cat, subcategory: subcat, name: name, max_score: max, awarded_score: score, evidence: score>=max ? '该生此项表现完整，无扣分点。' : `该生此项得分${score}/${max}，存在部分信息遗漏或问诊不够深入的情况。`, related_dialogue_ids: [...new Set(rids)] }
  }

  const sheet1Items = [
    ['一般项目','开场与身份确认','检查者自我介绍(姓名、职务或职责)',3.0],
    ['一般项目','开场与身份确认','说明问诊目的及大致时长',2.0],
    ['一般项目','基本信息采集','核对患者姓名、性别、年龄',2.0],
    ['主诉','主诉锁定','准确获取核心症状（头痛）',3.0],
    ['主诉','主诉锁定','明确主诉持续时间与发作特点',3.0],
    ['现病史','现病史扩展','现病史起病时间与诱因',3.0],
    ['现病史','现病史扩展','疼痛性质、部位、程度、放射',4.0],
    ['现病史','现病史扩展','伴随症状（恶心、畏光等）',3.0],
    ['现病史','现病史扩展','既往发作频率与模式',3.0],
    ['现病史','现病史扩展','缓解/加重因素',2.0],
    ['现病史','现病史扩展','诊疗经过与用药效果',3.0],
    ['既往史','既往史','既往慢性病史（高血压/糖尿病等）',2.0],
    ['既往史','既往史','手术外伤史及过敏史',2.0],
    ['既往史','既往史','辅助检查史',2.0],
    ['个人史与家族史','家族史','相关家族病史',2.0],
    ['个人史与家族史','个人史','职业、生活习惯、压力因素',2.0],
    ['系统回顾','一般情况','食欲、睡眠、体重变化',2.0],
    ['沟通与收尾','共情与总结','患者情绪关注与共情表达',2.0],
    ['沟通与收尾','共情与总结','问诊后总结反馈',1.0]
  ]
  const sheet2Items = [
    ['体格检查','心脏检查','视诊心前区有无隆起',2.0],
    ['体格检查','心脏检查','触诊心尖搏动位置与范围',2.0],
    ['体格检查','心脏检查','叩诊心界大小',3.0],
    ['体格检查','心脏检查','听诊心率与心律',3.0],
    ['体格检查','心脏检查','听诊各瓣膜区杂音',3.0],
    ['体格检查','腹部检查','视诊腹部外形与蠕动波',2.0],
    ['体格检查','腹部检查','听诊肠鸣音',2.0],
    ['体格检查','腹部检查','叩诊肝浊音界',2.0],
    ['体格检查','腹部检查','触诊腹部压痛与反跳痛',3.0],
    ['体格检查','腹部检查','触诊肝脾大小',3.0],
    ['体格检查','神经系统','检查瞳孔对光反射',2.0],
    ['体格检查','神经系统','检查病理征（Babinski征等）',2.0],
    ['总体评价','操作规范','查体顺序是否符合规范',3.0],
    ['总体评价','操作规范','操作手法是否轻柔得当',2.0]
  ]

  const s1Items = sheet1Items.map((it,i) => buildSheetItem(i+1,it[0],it[1],it[2],it[3]))
  const s2Items = sheet2Items.map((it,i) => buildSheetItem(i+1,it[0],it[1],it[2],it[3]))

  const allS1Total = s1Items.reduce((s,it)=>s+it.awarded_score,0), allS1Max = sheet1Items.reduce((s,it)=>s+it[3],0)
  const allS2Total = s2Items.reduce((s,it)=>s+it.awarded_score,0), allS2Max = sheet2Items.reduce((s,it)=>s+it[3],0)
  const calcTotal = allS1Total + allS2Total; const maxAllTotal = allS1Max + allS2Max
  const aiCalcTotal = Math.round((calcTotal + rnd(-3,3))*10)/10

  const dynamicComment = calcTotal >= maxAllTotal*0.9
    ? `您在本次考核中表现优异（得分率 ${Math.round(calcTotal/maxAllTotal*100)}%），各项核心能力均衡发展，尤其在主诉采集与家族史挖掘方面展现了出色的临床敏感性。建议继续保持并在红旗征象筛查方面进一步强化，以达到更高水平。`
    : calcTotal >= maxAllTotal*0.7
    ? `您在现病史采集和伴随症状追问方面表现扎实（得分率 ${Math.round(calcTotal/maxAllTotal*100)}%），但在体格检查中的"查体顺序规范性"方面扣分较多。建议加强"视-触-叩-听"标准化查体流程的训练。`
    : `您本次考核得分率 ${Math.round(calcTotal/maxAllTotal*100)}%，存在较大的提升空间。主要薄弱环节集中在神经系统警示征象筛查不足、开场标准化流程缺失以及沟通收尾环节薄弱。建议从基础问诊规范出发，系统性地补强薄弱模块。`

  return {
    meta: { strictness:'normal', ability_mode:'normal', ability_mode_reason:'该生整体表现均衡，部分安全筛查和沟通收尾环节存在可改进空间。' },
    line_analysis: lineAnalysis,
    scoring: { items: [...s1Items, ...s2Items], sheetGroups: [
      { name:'病史采集评分表', items: s1Items, maxTotal: allS1Max, calcTotal: allS1Total },
      { name:'体格检查评分表', items: s2Items, maxTotal: allS2Max, calcTotal: allS2Total }
    ], total_score: aiCalcTotal, pass_fail: calcTotal>=maxAllTotal*0.6?'通过':'未通过', arithmetic_verification: { sum_of_awarded: calcTotal, reported_total: aiCalcTotal, match: Math.abs(calcTotal-aiCalcTotal)<0.01 } },
    comprehensive_evaluation: {
      overall_performance: { strengths: ['主诉采集精准，对头痛特征识别表现出较强的临床敏感性。','家族史追问方向明确，锁定关键诊断线索。'], weaknesses: ['开场标准化身份确认完全缺失。','神经系统警示征象筛查不足，遗漏发热/意识障碍排查。','沟通收尾环节薄弱，缺乏共情表达。'] },
      process_analysis: {
        opening_and_basic_info: '开场阶段缺失标准化流程，未进行身份确认和问诊目的说明。',
        chief_complaint_and_history_expansion: { summary:'主诉采集是最大亮点，疼痛特征全覆盖。', strengths:['疼痛四维特征全覆盖','伴随症状主动追问'], weaknesses:['诊疗经过不够详细'] },
        past_personal_family_history: { summary:'家族史采集优秀，既往史基本到位。', strengths:['家族史信息完整'], weaknesses:['手术外伤史缺失'] },
        communication_and_closing: { summary:'收尾严重不足，缺少人文温度。', strengths:[], weaknesses:['收尾共情缺失','无问诊总结'], suggestion:'建议在每次问诊结束前刻意练习总结反馈环节。' }
      },
      radar_chart: { clinical_reasoning:{score:rnd(6,8),comment:'主诉识别准确，鉴别诊断意识良好'}, organizational_proficiency:{score:rnd(3,5),comment:'开场与收尾流程缺失'}, communication_skills:{score:rnd(4,6),comment:'提问清晰，人文温度薄弱'}, medical_knowledge:{score:rnd(6,8),comment:'专业知识应用得当'}},
      overall_conclusion: '本次病史采集训练中，该生展现了扎实的临床主诉采集能力和良好的医患沟通基础。在主诉特征的精确定位、伴随症状的主动追问、家族史信息的深度挖掘方面表现优秀。\n\n然而在问诊结构化和安全保障方面存在明显不足：开场身份确认完全缺失，神经系统红旗征象筛查不足，沟通收尾环节缺少共情表达和信息总结。\n\n建议该生以"结构化为纲、安全为基"重新梳理问诊流程，重点练习标准化开场四要素和系统性红旗征象筛查。',
      improvement_plan: { immediate_actions: ['强制执行标准化开场四要素'], targeted_training: ['参加SP问诊标准化工作坊','每周完成2次神经系统案例专项练习'] }
    },
    dynamic_comment: dynamicComment
  }
}

const openReport = (item) => {
  reportItem.value = item; reportTab.value = 'comprehensive'; activeSheetIdx.value = 0
  reportAssessmentData.value = generateAssessmentData(item)
  reportVisible.value = true
  nextTick(() => { drawAllCanvases() })
}
const closeReport = () => { reportVisible.value = false; dialogueSubModalVisible.value = false }
const switchReportTab = (tab) => { reportTab.value = tab; if (reportBodyRef.value) reportBodyRef.value.scrollTop = 0 }
const switchOpSubTab = (tab) => { opSubTab.value = tab; if (reportBodyRef.value) reportBodyRef.value.scrollTop = 0 }
const exportPDF = () => toast.show(`导出 ${reportItem.value ? reportItem.value.studentName : ''} 的成绩报告为PDF（演示）`)
const regenerateReport = (item) => { openReport(item) }

const openDialogueModal = (relatedIds) => {
  if (!relatedIds || !relatedIds.length) return
  const analysis = reportAssessmentData.value ? reportAssessmentData.value.line_analysis : []
  const entries = []; const seen = new Set()
  for (const rid of relatedIds) {
    const key = String(rid); if (seen.has(key)) continue; seen.add(key)
    const fi = analysis.find(a => String(a.dialogue_id) === key)
    if (fi) entries.push({ dialogue_id: fi.dialogue_id || key, student_question: fi.student_question || '', patient_answer: fi.patient_answer || '', intent: fi.intent || '', evaluation: fi.evaluation || '', guidance: fi.guidance || '' })
    else entries.push({ dialogue_id: key, student_question: '', patient_answer: '', intent: '', evaluation: '', guidance: '' })
  }
  dialogueSubModalEntries.value = entries; dialogueSubModalVisible.value = true
}

const getEvalBadgeClass = (e) => { if(!e) return 'badge-info'; if(e.includes('卓越')) return 'badge-success'; if(e.includes('稳健')) return 'badge-info'; if(e.includes('精进')||e.includes('有待')) return 'badge-warning'; return 'badge-info' }

const radarLabels = computed(() => {
  if (!reportAssessmentData.value) return []
  const radar = reportAssessmentData.value.comprehensive_evaluation.radar_chart || {}
  const m = { clinical_reasoning:'临床思维逻辑推理', organizational_proficiency:'组织效能与专业性', communication_skills:'沟通与人际技巧', medical_knowledge:'医学知识应用' }
  return Object.entries(m).map(([k,n]) => { const v = radar[k]&&typeof radar[k]==='object'?radar[k].score:(radar[k]||0); return { key:k, name:n, score:v } })
})

const reportScoringCalcTotal = computed(() => {
  if (!reportAssessmentData.value || !reportAssessmentData.value.scoring) return 0
  return Math.round(reportAssessmentData.value.scoring.items.reduce((s,it)=>s+(it.awarded_score||0),0)*10)/10
})
const reportScoringMaxTotal = computed(() => {
  if (!reportAssessmentData.value || !reportAssessmentData.value.scoring) return 0
  return Math.round(reportAssessmentData.value.scoring.items.reduce((s,it)=>s+(it.max_score||0),0)*10)/10
})

const activeSheetGroups = computed(() => {
  if (!reportAssessmentData.value || !reportAssessmentData.value.scoring) return []
  return reportAssessmentData.value.scoring.sheetGroups || [{ name:'评分表', items: reportAssessmentData.value.scoring.items || [], maxTotal: reportScoringMaxTotal.value, calcTotal: reportScoringCalcTotal.value }]
})
const currentSheetGroup = computed(() => {
  const gs = activeSheetGroups.value
  return gs.length ? gs[Math.min(activeSheetIdx.value, gs.length-1)] : null
})

const opSubTabRows = computed(() => {
  const baseTime = reportItem.value ? dayjs(reportItem.value.trainTime) : dayjs()
  const t = (offsetMin) => baseTime.add(offsetMin, 'minute').format('YYYY-MM-DD HH:mm:ss')
  const historyData = [
    { time: t(0), item: '您好，请坐。我是今天接诊的李医生，请问您今天来主要是哪里不舒服？', answer: '医生您好，我最近一直头疼，今天疼得特别厉害，实在受不了了。', analysis: '开场问候规范，患者主诉"头痛"明确，建议进一步追问疼痛部位和性质。' },
    { time: t(1), item: '头疼大概是什么时候开始的？具体是哪个部位疼？', answer: '大概三天前开始，右边太阳穴的位置，一跳一跳的疼，有时候整个右半边头都跟着疼。', analysis: '锁定了疼痛部位（右侧颞部）和性质（搏动性），问诊方向正确。' },
    { time: t(2), item: '疼痛的程度怎么样？如果用0到10分来打分，10分是最痛，您给打几分？', answer: '我觉得有七八分吧，疼起来什么事都做不了，今天早上疼得我都不想上班了。', analysis: '疼痛评分7-8分（中度偏重），提示需要关注疼痛对生活功能的影响。' },
    { time: t(3), item: '除了头痛，还有没有其他不舒服？比如恶心、呕吐、怕光或者怕声音？', answer: '对对对，有恶心，今天早上还想吐来着。而且看到亮光眼睛特别不舒服，窗帘都拉上了。', analysis: '捕捉到关键伴随症状：恶心和畏光，提示偏头痛可能性大，问诊针对性好。' },
    { time: t(4), item: '以前有过类似的情况吗？大概多久发作一次？', answer: '有过，从三年前就开始了，大概一两个月发作一次。以前吃点止痛药就好，这次吃了两三片布洛芬也没用。', analysis: '明确为复发性头痛，病程3年，既往布洛芬有效但本次失效，需关注药物过度使用可能。' },
    { time: t(5), item: '每次头痛发作一般持续多长时间？有没有什么诱因能让头痛发作？', answer: '一般疼两三天，睡一觉可能会好一点。最近工作压力大，经常加班到很晚，睡眠也不太好。', analysis: '发作持续2-3天，睡眠不足和压力是可能的诱因，信息采集较为完整。' },
    { time: t(6), item: '平时身体怎么样？有没有高血压、糖尿病或者其他慢性病？', answer: '身体还行，没有什么慢性病。就是有点胃病，吃布洛芬的时候胃会不舒服。', analysis: '既往体健，但NSAIDs药物导致胃部不适需关注，建议追问胃病史详情。' },
    { time: t(7), item: '家里有人有类似头痛的情况吗？', answer: '我妈妈年轻时候也经常头痛，说是偏头痛，她也是右边疼。', analysis: '家族史阳性：母亲偏头痛病史，进一步支持偏头痛的诊断倾向。' },
    { time: t(8), item: '您做什么工作的？平时生活规律吗？饮食和睡眠怎么样？', answer: '我是程序员，天天对着电脑。最近项目赶进度，每天睡不到6个小时，吃饭也不规律。', analysis: '职业因素（长期屏幕暴露）和生活方式（睡眠不足、饮食不规律）可能是加重因素。' },
    { time: t(9), item: '有没有对什么药物或者食物过敏的？', answer: '没有药物过敏，吃海鲜偶尔会过敏，起皮疹。', analysis: '无药物过敏史，海鲜过敏与当前头痛无直接关联，已记录。' },
    { time: t(10), item: '之前有没有因为这个头痛做过什么检查？比如CT或者磁共振？', answer: '去年在人民医院做过一次头部CT，医生说没发现什么问题。', analysis: '头部CT阴性，排除器质性病变，但已超过一年，可考虑复查。' },
    { time: t(11), item: '好的，我大概了解您的情况了。您这个头痛的特点很像是偏头痛，我需要再给您做一些神经系统方面的检查来进一步确认。', answer: '好的医生，那就麻烦您了。', analysis: '问诊收尾规范，给出了初步印象（偏头痛）并说明了下一步计划，患者依从性好。' }
  ]
  const examData = [
    { time: t(12), item: '生命体征测量', answer: 'T：36.5℃，P：76次/分，R：18次/分，BP：128/82mmHg', analysis: '意图：建立患者基础生命体征基线，排除发热、高血压等引起头痛的常见器质性病因；必要性：★★★★★ 所有患者首次就诊的必备检查，为后续诊疗决策提供基础数据；临床思维特征：体现了"先排除危险信号"的安全诊疗思维，符合规范化接诊流程。' },
    { time: t(13), item: '一般情况观察', answer: '神志清楚，查体合作，发育正常，营养良好。', analysis: '意图：快速评估患者整体状态，判断是否存在急重症表现（如意识障碍、痛苦面容）；必要性：★★★★☆ 意识状态和一般情况是判断病情严重程度的第一手信息，头痛伴意识改变提示颅内病变可能；临床思维特征：运用"视诊先行"的临床基本功，在接触患者的前30秒内完成初步病情分级。' },
    { time: t(14), item: '头颈部检查', answer: '头颅无畸形，双侧瞳孔等大正圆，对光反射灵敏，颈部软，无抵抗。', analysis: '意图：排查颅内占位、颅内高压、脑膜刺激等可能导致头痛的结构性/器质性病变；必要性：★★★★★ 瞳孔和颈抵抗是头痛患者神经系统查体的核心项目，瞳孔异常提示脑疝前兆，颈强直提示脑膜炎或蛛网膜下腔出血，均为不可遗漏的红旗征象；临床思维特征：体现了"从常见到危重"的鉴别诊断递进思维，先排除最危险的器质性病变。' },
    { time: t(15), item: '神经系统检查（颅神经）', answer: 'Ⅰ-Ⅻ对颅神经检查未见异常，面部感觉对称，张口无偏斜。', analysis: '意图：系统性筛查12对颅神经功能，排除因颅神经受累引起的症状性头痛（如三叉神经痛、青光眼等）；必要性：★★★☆☆ 对于无局灶性神经症状的典型偏头痛患者，完整颅神经检查的阳性率较低，但有助于增强诊断信心和排除罕见病因；临床思维特征：运用系统查体方法学，虽然部分检查对当前疾病的直接诊断价值有限，但体现了"全面评估"的严谨态度。' },
    { time: t(16), item: '神经系统检查（运动系统）', answer: '四肢肌力Ⅴ级，肌张力正常，腱反射（++），对称引出。', analysis: '意图：排除锥体束、脊髓或周围神经病变导致的继发性头痛；必要性：★★★☆☆ 典型偏头痛不伴运动功能障碍，但对于鉴别脑卒中、多发性硬化等疾病具有重要价值，尤其当患者存在非典型症状时需要重点排查；临床思维特征：虽然运动系统检查在偏头痛诊断路径中优先级不高，但考生选择该项检查反映了"宽进严出"的鉴别诊断意识。' },
    { time: t(17), item: '神经系统检查（感觉与协调）', answer: '深浅感觉正常对称，指鼻试验稳准，Romberg征阴性。', analysis: '意图：筛查小脑及后索病变，排除因共济失调或感觉异常提示的颅后窝病变；必要性：★★☆☆☆ 在无眩晕、行走不稳主诉的偏头痛患者中，协调功能检查的临床收益相对较低，但Romberg征作为快速筛查项目操作便捷、耗时短，可酌情保留；临床思维特征：体现了神经科查体的完整性意识，但需注意查体时间资源分配的效率——在时间有限的考核中，可考虑优先完成高收益检查项目。' },
    { time: t(18), item: '神经系统检查（病理征）', answer: 'Babinski征阴性，Hoffmann征阴性，颈强直阴性。', analysis: '意图：筛查上运动神经元损害体征和脑膜刺激征；必要性：★★★★★ 颈强直是脑膜炎和蛛网膜下腔出血的核心体征，Babinski征是锥体束损害的重要指标，对于头痛患者属于必须完成的筛查项目；临床思维特征：准确地将脑膜刺激征和病理征作为头痛查体的"底线检查"，体现了扎实的神经科基本功和良好的临床安全意识。' },
    { time: t(19), item: '颞动脉触诊', answer: '双侧颞动脉无增粗，无压痛，搏动正常。', analysis: '意图：排除颞动脉炎（巨细胞动脉炎），该病好发于50岁以上人群，可导致不可逆性视力丧失；必要性：★★★★☆ 虽然患者年龄52岁在颞动脉炎好发年龄范围内，但无颞部压痛、下颌跛行等典型症状，检查必要性中等偏高，体现了对中老年头痛患者鉴别诊断的全面性；临床思维特征：展现了"年龄分层"的临床决策意识，在偏头痛与颞动脉炎的鉴别路径中做出了合理选择，具有良好的风险防范意识。' }
  ]
  return opSubTab.value === 'exam' ? examData : historyData
})

const drawAllCanvases = () => {
  nextTick(() => {
    const rC = radarCanvas.value
    if (rC && reportAssessmentData.value && reportAssessmentData.value.comprehensive_evaluation.radar_chart) drawRadarCanvas(rC, reportAssessmentData.value.comprehensive_evaluation.radar_chart)
  })
}

watch(reportTab, () => { if (reportTab.value==='comprehensive') nextTick(()=>{ drawAllCanvases() }) })

const drawRadarCanvas = (canvas, data) => {
  const ctx = canvas.getContext('2d'); const s = canvas.width; const c = s/2; const r = s*0.33
  const labels = ['临床思维\n逻辑推理','组织效能\n与专业性','沟通与人\n际技巧','医学知识\n应用']
  const keys = [{key:'clinical_reasoning'},{key:'organizational_proficiency',alt:'organization_professionalism'},{key:'communication_skills'},{key:'medical_knowledge'}]
  const scores = keys.map(k=>{let v=data[k.key]&&typeof data[k.key]==='object'?data[k.key].score:data[k.key];if(v===undefined&&k.alt)v=data[k.alt]&&typeof data[k.alt]==='object'?data[k.alt].score:data[k.alt];return v||0})
  ctx.clearRect(0,0,s,s)
  for(let i=1;i<=5;i++){const st=r*(i/5);ctx.beginPath();for(let j=0;j<keys.length;j++){const a=(Math.PI*2*j/keys.length)-Math.PI/2;const x=c+st*Math.cos(a);const y=c+st*Math.sin(a);if(j===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.closePath();ctx.strokeStyle='#e0dcd3';ctx.lineWidth=0.8;ctx.stroke()}
  for(let j=0;j<keys.length;j++){const a=(Math.PI*2*j/keys.length)-Math.PI/2;ctx.beginPath();ctx.moveTo(c,c);ctx.lineTo(c+r*Math.cos(a),c+r*Math.sin(a));ctx.strokeStyle='#ccc';ctx.stroke();const lx=c+(r+22)*Math.cos(a);const ly=c+(r+22)*Math.sin(a);ctx.fillStyle='#333';ctx.font='11px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';const ls=labels[j].split('\n');ls.forEach((l,idx)=>ctx.fillText(l,lx,ly-5+idx*13))}
  ctx.beginPath();for(let j=0;j<keys.length;j++){const a=(Math.PI*2*j/keys.length)-Math.PI/2;const v=Math.min(1,scores[j]/10);const x=c+r*v*Math.cos(a);const y=c+r*v*Math.sin(a);if(j===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.closePath();ctx.fillStyle='rgba(37,99,235,0.2)';ctx.fill();ctx.strokeStyle='#2563eb';ctx.lineWidth=2;ctx.stroke()
  for(let j=0;j<keys.length;j++){const a=(Math.PI*2*j/keys.length)-Math.PI/2;const v=Math.min(1,scores[j]/10);const x=c+r*v*Math.cos(a);const y=c+r*v*Math.sin(a);ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fillStyle='#2563eb';ctx.fill()}
}


const getScoreClass = (s,m) => { if(typeof s!=='number'||!m) return ''; const r=s/m; if(r>=0.9)return 'text-success'; if(r>=0.7)return 'text-primary'; if(r>=0.6)return 'text-warning'; return 'text-error' }
const getTotalClass = (ss) => { const s=parseInt(ss);const parts=String(ss).split('/');const m=parseInt(parts[1]);if(isNaN(s)||isNaN(m))return'';const r=s/m;if(r>=0.9)return'badge-success';if(r>=0.8)return'badge-info';if(r>=0.6)return'badge-warning';return'badge-error' }
const getRateColor = (r) => { if(r>=90)return'#10b981';if(r>=70)return'#2563eb';if(r>=60)return'#f59e0b';return'#ef4444' }
const totalPages = computed(()=>Math.ceil(total.value/pageSize.value)||1)
const onPageSizeChange = () => { currentPage.value=1;fetchData() }
watch(currentPage,()=>fetchData())
watch(pageSize,()=>{currentPage.value=1})
onMounted(()=>{fetchData()})
</script>
