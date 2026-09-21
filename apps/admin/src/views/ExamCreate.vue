<template>
  <div class="content-container exam-create-container">
    <div class="steps">
      <div v-for="(step, index) in steps" :key="index" class="step-item" :class="{ active: currentStep === index, completed: currentStep > index }" :data-reviewable="'步骤-' + step.title">
        <div class="step-number">{{ index+1 }}</div>
        <div class="step-label">{{ step.title }}</div>
        <div v-if="index<steps.length-1" class="step-line"></div>
      </div>
    </div>

    <div v-if="currentStep===0" class="card" data-reviewable="基础信息卡片">
      <h3 class="mb-4" data-reviewable="基础信息卡片标题">基础信息</h3>
      <div class="form-item" data-reviewable="考核名称区域">
        <label class="form-label">考核名称 <span class="text-red-500">*</span></label>
        <input v-model="form.name" class="input-field" :class="{ 'review-disabled': reviewModeGlobal }" :readonly="reviewModeGlobal" placeholder="例：2026年住培结业考核">
      </div>
      <div class="form-item" data-reviewable="考核类型区域">
        <label class="form-label">考核类型 <span class="text-red-500">*</span></label>
        <select v-model="form.typeCombined" class="select-field" :class="{ 'review-disabled': reviewModeGlobal }">
          <optgroup label="住培">
            <option value="residency-出科考核">出科考核</option>
            <option value="residency-年度考核">年度考核</option>
            <option value="residency-模拟结业">模拟结业</option>
            <option value="residency-招录考核">招录考核</option>
          </optgroup>
          <optgroup label="院校">
            <option value="college-期末考试">期末考试</option>
            <option value="college-中期考核">中期考核</option>
          </optgroup>
        </select>
      </div>
      <div class="form-item" data-reviewable="考试时间区域">
        <label class="form-label">考试时间 <span class="text-red-500">*</span></label>
        <div class="flex gap-2">
          <input type="datetime-local" v-model="form.startDate" class="input-field w-48" :class="{ 'review-disabled': reviewModeGlobal }" :readonly="reviewModeGlobal">
          <span>至</span>
          <input type="datetime-local" v-model="form.endDate" class="input-field w-48" :class="{ 'review-disabled': reviewModeGlobal }" :readonly="reviewModeGlobal">
        </div>
      </div>
      <div class="form-item" data-reviewable="考试地点区域">
        <label class="form-label">考试地点</label>
        <input v-model="form.location" class="input-field" :class="{ 'review-disabled': reviewModeGlobal }" :readonly="reviewModeGlobal">
      </div>
      <div class="form-item" data-reviewable="考核说明区域">
        <label class="form-label">考核说明</label>
        <textarea v-model="form.description" rows="3" class="input-field" :class="{ 'review-disabled': reviewModeGlobal }" :readonly="reviewModeGlobal"></textarea>
      </div>
    </div>

    <div v-if="currentStep===1" class="card" data-reviewable="方案专业卡片" style="width:100%">
      <h3 class="mb-4" data-reviewable="方案专业卡片标题">考站设置</h3>
      <div class="form-item mb-4" data-reviewable="方案选择区域">
        <div style="display: flex; align-items: center; gap: 16px;">
          <label style="margin-bottom: 0;">考站方案</label>
          <select v-model="form.schemeId" @change="onSchemeChange" class="select-field scheme-select" :class="{ 'review-disabled': reviewModeGlobal }">
            <option v-for="s in schemeOptions" :value="s.id">{{ s.name }}</option>
          </select>
          <button class="btn btn-sm" @click="toggleAllMajors" :class="{ 'review-disabled': reviewModeGlobal }">{{ allSelected ? '取消全选' : '全选' }}</button>
        </div>
      </div>
      <div v-for="major in availableMajors" :key="major" class="major-group" :data-reviewable="'专业-' + major">
        <label class="flex items-center gap-2 major-checkbox" style="font-size:18px; font-weight:700; padding:8px 0; margin-bottom:8px">
          <input type="checkbox" v-model="form.selectedMajors" :value="major" @change="onMajorToggle(major)" :class="{ 'review-disabled': reviewModeGlobal }" style="width:18px;height:18px;accent-color:var(--primary)"> {{ major }}
        </label>
        <div class="station-row" v-if="form.selectedMajors.includes(major)">
          <label v-for="station in getStationsByMajor(major)" :key="major + '::' + station" class="flex items-center gap-1 station-label" :data-reviewable="'考站-' + station">
            <input type="checkbox" v-model="selectedStations[major]" :value="station" :class="{ 'review-disabled': reviewModeGlobal }" style="width:16px;height:16px;accent-color:var(--primary)"> {{ station }}
          </label>
        </div>
      </div>

      <!-- 影像报告书写站：组卷配置（发布后写入派发任务，学员端按这些字段呈现） -->
      <div v-if="hasImagingStation" class="form-item mb-4" data-reviewable="影像报告书写考核配置" style="border-top:1px solid var(--border-light);padding-top:16px;">
        <label class="font-semibold">影像报告书写考核配置</label>
        <div class="flex items-center gap-2 mb-3" style="flex-wrap:wrap;">
          <span style="font-size:13px;color:var(--text-secondary);">预设</span>
          <button v-for="p in IMAGING_PRESETS" :key="p.key" class="btn btn-sm"
                  :class="{ 'btn-primary': imagingCfg.preset === p.key }"
                  @click="applyImagingPreset(p.key)">{{ p.label }}</button>
        </div>
        <div class="flex gap-4 mb-3" style="flex-wrap:wrap;">
          <div class="form-item" style="margin-bottom:0;">
            <label>考试方式</label>
            <select v-model="imagingCfg.examMode" class="select-field" style="width:210px;">
              <option value="online">在线考试（自有设备）</option>
              <option value="onsite">现场考站机</option>
            </select>
          </div>
          <div class="form-item" style="margin-bottom:0;">
            <label>题量</label>
            <input type="number" class="input-field" style="width:90px;" min="1" :max="imagingQuestionCap"
                   v-model.number="imagingCfg.questionCount" @change="clampQuestionCount(true)">
          </div>
          <div class="form-item" style="margin-bottom:0;">
            <label>达标线</label>
            <input type="number" class="input-field" style="width:110px;" min="0"
                   :max="imagingCfg.scoreScale === 'raw' ? 1000 : 100"
                   v-model.number="imagingCfg.passLine" @input="onPassLineInput"
                   :placeholder="suggestedPassLine !== null ? String(suggestedPassLine) : '留空按难度标定'">
          </div>
          <div class="form-item" style="margin-bottom:0;">
            <label>满分口径</label>
            <select v-model="imagingCfg.scoreScale" class="select-field" style="width:190px;">
              <option value="normalize">按可评满分归一化</option>
              <option value="raw">原始分</option>
            </select>
          </div>
        </div>
        <div class="flex gap-4 mb-2" style="flex-wrap:wrap;">
          <div class="form-item" style="margin-bottom:0;">
            <label>出分时机</label>
            <select v-model="imagingCfg.visibleWhen" class="select-field" style="width:190px;">
              <option value="afterSubmit">交卷后</option>
              <option value="afterWindow">考试窗口结束后</option>
              <option value="afterPublish">教师发布后</option>
            </select>
          </div>
          <div class="form-item" style="margin-bottom:0;">
            <label>成绩可见内容</label>
            <select v-model="imagingCfg.visibleContent" class="select-field" style="width:190px;">
              <option value="total">仅总分与达标</option>
              <option value="detail">总分 + 逐要点明细</option>
            </select>
          </div>
          <div class="form-item" style="margin-bottom:0;">
            <label>重考策略</label>
            <select v-model="imagingCfg.retake" class="select-field" style="width:160px;">
              <option value="single">不允许</option>
              <option value="latest">取最近一次</option>
              <option value="best">取最高分</option>
              <option value="capped">限 N 次</option>
            </select>
          </div>
        </div>
        <div style="font-size:12px;color:var(--text-tertiary);">
          影像题库可选 {{ imagingCaseRows.length }} 例 · 本场影像场次 {{ imagingSessions.length }} 个
        </div>
      </div>
    </div>

    <div v-if="currentStep===2" style="width:100%">
      <div class="flex justify-end mb-4" data-reviewable="考站筛选区域">
        <select v-model="filterStation" class="select-field" style="width:200px" :class="{ 'review-disabled': reviewModeGlobal }">
          <option value="">全部考站类型</option>
          <option v-for="s in allStationNames" :value="s">{{ s }}</option>
        </select>
      </div>
      <div class="session-layout">
        <div class="session-nav" data-reviewable="场次左侧导航">
          <template v-for="major in filteredNavMajors" :key="major">
            <div class="session-nav-major" @click="toggleNavMajor(major)">
              <span>{{ major }}</span>
              <span>{{ navMajorExpanded[major] ? '▾' : '▸' }}</span>
            </div>
            <div v-if="navMajorExpanded[major]">
              <div v-for="session in getNavSessionsByMajor(major)" :key="session.id"
                   class="session-nav-station" :class="{ active: activeSessionId === session.id }">
                <div class="nav-station-top" @click="scrollToSession(session.id)">
                  <span class="nav-station-name">{{ session.name }}</span>
                  <span :class="getStationStatus(session.id) === 'ok' ? 'status-ok' : 'status-warning'">{{ getStationStatus(session.id) === 'ok' ? '✅' : '⚠️' }}</span>
                  <span v-if="!reviewModeGlobal" class="nav-arrows"><button @click.stop="moveSession(session, -1)" title="上移">↑</button><button @click.stop="moveSession(session, 1)" title="下移">↓</button></span>
                </div>
              </div>
            </div>
          </template>
        </div>
        <div class="session-content-area">
          <div v-for="(session, idx) in filteredSessions" :key="idx" :id="'session-' + session.id" class="session-card" :data-reviewable="'场次卡片-' + session.name">
            <div class="session-header" @click="toggleCollapse(session.id)" :data-reviewable="'场次头部-' + session.name">
              <div class="session-header-left">
                <span class="font-medium">{{ session.name }}</span>
                <span :class="getSessionStatus(session) === 'ok' ? 'status-ok' : 'status-warning'">{{ getSessionStatus(session) === 'ok' ? '✅' : '⚠️' }}</span>
                <button v-if="!reviewModeGlobal" class="btn btn-sm" @click.stop="editSessionName(session)" title="修改名称" style="padding:1px 6px;font-size:12px;">✎</button>
                <button v-if="!reviewModeGlobal" class="btn btn-sm" @click.stop="copySession(session)" title="复制考站" style="padding:1px 6px;font-size:12px;">📋</button>
                <button v-if="!reviewModeGlobal" class="btn btn-sm" @click.stop="deleteSession(session)" title="删除考站" style="padding:1px 6px;font-size:12px;color:var(--error);">🗑</button>
              </div>
            </div>
            <div class="session-body" v-show="!collapsedSessions[session.id]">
              <div class="form-item" data-reviewable="考试时间区域">
                <label>考试时间</label>
                <div class="flex gap-2">
                  <input type="datetime-local" v-model="session.start_datetime" class="input-field w-48" :class="{ 'review-disabled': reviewModeGlobal }" :readonly="reviewModeGlobal">
                  <span>至</span>
                  <input type="datetime-local" v-model="session.end_datetime" class="input-field w-48" :class="{ 'review-disabled': reviewModeGlobal }" :readonly="reviewModeGlobal">
                </div>
              </div>
              <div class="form-item" data-reviewable="考题区域">
                <label class="font-semibold">设置考题</label>
                <!-- 影像报告书写站：多病例（题量决定实际出题数） -->
                <template v-if="isImagingStation(session)">
                  <div v-if="(session.imagingCases || []).length === 0" class="text-sm text-gray-500" style="margin-bottom:6px;">未选择</div>
                  <div v-else style="margin-bottom:6px;">
                    <div v-for="c in session.imagingCases" :key="c.id" class="text-sm" style="display:flex;align-items:center;gap:8px;margin-bottom:2px;">
                      <span>{{ c.title }} ({{ c.code }})</span>
                      <button class="text-primary text-sm" @click="removeImagingCase(session, c.id)" :class="{ 'review-disabled': reviewModeGlobal }" data-reviewable="'移除病例-'+c.code">移除</button>
                    </div>
                  </div>
                  <button class="btn-default btn-sm" @click="openCaseSelector(session)" :class="{ 'review-disabled': reviewModeGlobal }" data-reviewable="选择考题按钮">选择病例</button>
                </template>
                <div v-else class="flex items-center gap-2">
                  <span v-if="session.case" class="text-sm">{{ session.case.title }} ({{ session.case.code }})</span>
                  <span v-else class="text-sm text-gray-500">未选择</span>
                  <button class="btn-default btn-sm" @click="openCaseSelector(session)" :class="{ 'review-disabled': reviewModeGlobal }" data-reviewable="选择考题按钮">选择病例</button>
                </div>
              </div>
              <div v-if="isCommunicationStation(session) && session.case && !session.stationName.includes('接诊')" class="form-item" data-reviewable="沟通场景区域">
                <label class="font-semibold">选择人文沟通场景</label>
                <div class="flex items-center gap-2">
                  <select v-model="session.communicationScene" class="select-field" style="max-width: 320px;" :class="{ 'review-disabled': reviewModeGlobal }">
                    <option value="">-- 请选择场景 --</option>
                    <option v-for="scene in (session.case.communicationScenes || [])" :key="scene" :value="scene">{{ scene }}</option>
                  </select>
                  <span v-if="!session.communicationScene && (session.case?.communicationScenes || []).length > 0" class="text-sm text-amber-600">未选择</span>
                </div>
              </div>
              <div class="form-item" data-reviewable="各项目时长区域">
                <div class="font-medium mb-1">各项目时长</div>
                <div v-for="item in session.items_duration" :key="item.id" class="duration-item" :data-reviewable="'项目时长-' + item.name">
                  <span>{{ item.name }}:</span>
                  <input type="number" v-model="item.duration" class="input-field duration-input" step="1" :class="{ 'review-disabled': reviewModeGlobal }" :readonly="reviewModeGlobal"> 分钟
                  <span class="restore-default" @click="restoreDefaultDuration(session, item.id)" :data-reviewable="'恢复默认-' + item.name">恢复默认</span>
                </div>
              </div>
              <div class="form-item" data-reviewable="评分表列表区域">
                <div class="font-medium">评分表</div>
                <div class="score-table-list">
                  <div v-for="st in session.scoreTables" :key="st.id" class="text-sm" :data-reviewable="'评分表-' + st.name">📋 {{ st.name }}（关联项目：{{ st.items.join('、') }}）<button class="text-primary text-sm ml-2" @click="openScoreSettings(st, session)" :class="{ 'review-disabled': reviewModeGlobal }">修改设置</button></div>
                </div>
              </div>
              <div class="form-item" data-reviewable="考官规则区域">
                <div class="examiner-rule">
                  <div class="checkbox-label mb-2"><input type="checkbox" v-model="session.includeAiScore" :class="{ 'review-disabled': reviewModeGlobal }"> AI考官评分计入总分</div>
                  <div class="flex gap-3 items-center">
                    <div class="flex items-center gap-2">
                      <label class="text-sm">设置真人考官人数：</label>
                      <select v-model="session.minHumanExaminers" class="input-field" style="width:80px" :class="{ 'review-disabled': reviewModeGlobal }">
                        <option :value="0">0</option><option :value="1">1</option><option :value="2">2</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="currentStep===3" class="card" data-reviewable="考生分配卡片">
      <h3 class="mb-4" data-reviewable="考生分配标题">考生与考官分配</h3>
      <table class="table">
        <thead>
          <tr><th style="text-align:left; padding-left:16px">场次名称</th><th style="text-align:left">专业</th><th style="text-align:left">考站类型</th><th style="text-align:left">考官</th><th style="text-align:left">考生</th></tr>
        </thead>
        <tbody>
          <tr v-for="session in allSessions" :key="session.id" :data-reviewable="'分配行-' + session.name">
            <td style="text-align:left; padding-left:16px">{{ session.name }}</td>
            <td style="text-align:left">{{ session.major }}</td>
            <td style="text-align:left">{{ session.stationName }}</td>
            <td style="text-align:left">
              <template v-if="session.examiners.length > 0">
                <span v-for="(eid, i) in session.examiners" :key="eid" class="examiner-tag">{{ getExaminerName(eid) }}</span>
                <span class="link-style text-sm ml-2" @click.stop="openExaminerDrawer(session)" data-review-exempt>修改</span>
              </template>
              <template v-else>
                <span class="link-style-pending" @click.stop="openExaminerDrawer(session)" data-review-exempt>待分配</span>
              </template>
            </td>
            <td style="text-align:left">
              <span class="link-style cursor-pointer" style="color:var(--primary); text-decoration:underline; font-weight:500" @click.stop="openStudentDrawer(session)" data-review-exempt>{{ session.candidates.length }} 人</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="fixed-buttons">
      <button class="btn-default" @click="prevStep" v-if="currentStep>0" :class="{ 'review-disabled': reviewModeGlobal }" data-reviewable="上一步按钮">上一步</button>
      <button class="btn-primary" @click="nextStep" v-if="currentStep<steps.length-1" :class="{ 'review-disabled': reviewModeGlobal }" data-reviewable="下一步按钮">下一步</button>
      <button class="btn-primary" @click="submitExam" v-if="currentStep===steps.length-1" :class="{ 'review-disabled': reviewModeGlobal }" data-reviewable="提交考核按钮">提交考核</button>
      <button class="btn-default" @click="cancel" :class="{ 'review-disabled': reviewModeGlobal }" data-reviewable="取消按钮">取消</button>
    </div>

    <div class="drawer-overlay" v-if="personDrawerVisible" @click.self="personDrawerVisible=false" data-review-exempt>
      <div class="drawer-container">
        <div class="drawer-header" data-reviewable="抽屉标题"><span>选择{{ personType === 'examiner' ? '考官' : '考生' }}</span><button class="btn-default btn-sm" @click="personDrawerVisible=false" data-review-exempt>✕</button></div>
        <div class="drawer-body">
          <input v-model="personSearch" placeholder="搜索姓名" class="input-field w-full mb-3" data-review-exempt>
          <div class="text-sm text-gray-500 mb-2" data-reviewable="已选人数提示">已选择 <strong>{{ selectedPersonIds.length }}</strong> 人<span v-if="personType==='examiner' && selectedPersonIds.length < (currentTargetSession ? currentTargetSession.minHumanExaminers : 1)" class="text-red-500 ml-2">（不足最低人数要求）</span></div>
          <div class="person-card-list">
            <div v-for="p in filteredPersons" :key="p.id" class="person-card" :class="{ selected: selectedPersonIds.includes(p.id) }" @click="togglePersonSelection(p.id)" :data-reviewable="'人员卡片-' + p.name">
              <input type="checkbox" :value="p.id" v-model="selectedPersonIds" class="person-card-checkbox" @click.stop data-review-exempt>
              <div class="person-card-info"><div class="person-card-name">{{ p.name }}</div><div class="person-card-details"><span>📱 {{ p.phone }}</span><span v-if="p.sex">⚤ {{ p.sex }}</span><span v-if="p.age">🎂 {{ p.age }}岁</span><span v-if="p.specialty || p.major">🏥 {{ p.specialty || p.major }}</span><span v-if="p.title && personType==='examiner'" class="person-card-tag">{{ p.title }}</span><span v-if="p.grade && personType==='student'" class="person-card-tag">{{ p.grade }}</span></div></div>
            </div>
          </div>
          <div v-if="filteredPersons.length === 0" class="text-center text-gray-500 py-8" data-reviewable="无匹配人员提示">无匹配人员</div>
        </div>
        <div class="drawer-footer"><button class="btn-default" @click="personDrawerVisible=false" data-review-exempt>取消</button><button class="btn-primary" @click="confirmPersonSelection" data-review-exempt>确定选择</button></div>
      </div>
    </div>

    <div v-if="caseSelectorVisible" class="modal-overlay" @click.self="caseSelectorVisible=false">
      <div class="modal-container case-selector-modal">
        <h3 class="mb-3" data-reviewable="选择病例标题">选择病例</h3>
        <!-- 筛选栏 -->
        <div class="case-filter-bar">
          <div class="case-filter-item">
            <label class="case-filter-label">搜索</label>
            <input v-model="caseKeyword" placeholder="病例名称/编码" class="input-field">
          </div>
          <div v-if="!caseSelectorImaging" class="case-filter-item">
            <label class="case-filter-label">阶段</label>
            <select v-model="caseFilterPhase" class="select" @change="onCasePhaseChange">
              <option value="">全部</option>
              <optgroup v-for="g in casePhaseGroups" :key="g.phase" :label="g.phase">
                <option v-for="l in g.levels" :key="l.value" :value="l.value">{{ l.label }}</option>
              </optgroup>
            </select>
          </div>
          <div v-if="!caseSelectorImaging" class="case-filter-item">
            <label class="case-filter-label">专业</label>
            <select v-model="caseFilterSpecialty" class="select" @change="onCaseSpecialtyChange">
              <option value="">全部</option>
              <option v-for="s in caseSpecialtyOptions" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
          <div v-if="!caseSelectorImaging" class="case-filter-item">
            <label class="case-filter-label">分类</label>
            <select v-model="caseFilterCategory" class="select" @change="onCaseCategoryChange">
              <option value="">全部</option>
              <option v-for="c in caseCategoryOptions" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
          <div v-if="!caseSelectorImaging" class="case-filter-item">
            <label class="case-filter-label">病种</label>
            <select v-model="caseFilterDisease" class="select">
              <option value="">全部</option>
              <option v-for="d in caseDiseaseOptions" :key="d" :value="d">{{ d }}</option>
            </select>
          </div>
          <div class="case-filter-actions">
            <button class="btn-primary btn-sm" @click="casePage = 1">搜索</button>
            <button class="btn btn-sm" @click="resetCaseFilters">重置</button>
          </div>
        </div>
        <table class="table">
          <thead>
            <tr><th>编码</th><th>标题</th><th>阶段</th><th>专业</th><th>分类</th><th>病种</th><th>来源</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="c in paginatedCases" :key="c.id" :data-reviewable="'病例行-'+c.code">
              <td>{{ c.code }}</td>
              <td>{{ c.title }}</td>
              <td>{{ getDifficultyLabel(c.difficulty) }}<span v-if="getCaseLevelLabel(c.difficulty)" style="margin-left:4px;font-size:11px;color:#909399;">· {{ getCaseLevelLabel(c.difficulty) }}</span></td>
              <td>{{ c.specialty }}</td>
              <td>{{ c.category }}</td>
              <td>{{ c.disease }}</td>
              <td>{{ c.source }}</td>
              <td>
                <button v-if="!caseSelectorImaging" @click="selectCase(c)" class="btn-primary btn-sm" :data-reviewable="'选择病例按钮-'+c.code">选择</button>
                <button v-else-if="imagingPicked(c.id)" class="btn btn-sm" disabled>已添加</button>
                <button v-else @click="selectCase(c)" class="btn-primary btn-sm" :data-reviewable="'选择病例按钮-'+c.code">添加</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="filteredCases.length === 0" class="text-secondary text-center py-4">暂无匹配病例</div>
        <!-- 影像场次：追加式选择，选完点「完成」关闭 -->
        <div v-if="caseSelectorImaging" class="flex items-center justify-between mt-3">
          <span class="text-secondary text-sm">已选 {{ imagingPickCount }} 例</span>
          <button class="btn-primary btn-sm" @click="caseSelectorVisible = false">完成</button>
        </div>
        <!-- 分页 -->
        <div class="case-pagination" v-if="totalCasePages > 1">
          <span class="text-secondary">共 {{ filteredCases.length }} 条</span>
          <div class="flex gap-2">
            <button class="btn btn-sm" :disabled="casePage === 1" @click="casePage--">上一页</button>
            <span class="flex items-center px-2 text-sm">{{ casePage }} / {{ totalCasePages }}</span>
            <button class="btn btn-sm" :disabled="casePage === totalCasePages" @click="casePage++">下一页</button>
            <select class="select" style="width:90px" v-model="casePageSize">
              <option :value="10">10条/页</option>
              <option :value="20">20条/页</option>
              <option :value="50">50条/页</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <div v-if="nameModalVisible" class="modal-overlay" @click.self="nameModalVisible=false" data-review-exempt>
      <div class="modal-container" style="width:400px">
        <h3 class="mb-4">修改考站名称</h3>
        <div class="form-item mb-3"><label>考站名称</label><input class="input-field w-full" v-model="nameModalValue" @keyup.enter="confirmEditName" placeholder="请输入考站名称"></div>
        <div class="flex justify-end gap-2 mt-4"><button class="btn" @click="nameModalVisible=false" data-review-exempt>取消</button><button class="btn btn-primary" @click="confirmEditName" data-review-exempt>确定</button></div>
      </div>
    </div>

    <div v-if="scoreSettingsVisible" class="drawer-overlay" @click.self="scoreSettingsVisible=false">
      <div class="drawer-container" style="width:550px">
        <div class="drawer-header"><span>修改评分表设置</span><button class="btn-default btn-sm" @click="scoreSettingsVisible=false" data-review-exempt>✕</button></div>
        <div class="drawer-body">
          <div class="form-item mb-3"><label>评分表名称</label><input class="input-field" :value="scoreSettingsTargetSt?.name" disabled style="background:#F5F7FA"></div>
          <div class="form-item mb-3"><label>关联考核项目</label>
            <div style="border:1px solid var(--border);border-radius:8px;padding:10px;max-height:200px;overflow-y:auto">
              <div v-for="item in scoreSettingsTargetSession?.items_duration || []" :key="item.id" style="margin-bottom:6px">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" :checked="scoreSettingsTargetSt?.items?.includes(item.name)" @change="toggleScoreItem(item.name)" style="width:16px;height:16px"> {{ item.name }}
                </label>
              </div>
            </div>
          </div>
        </div>
        <div class="drawer-footer"><button class="btn-default" @click="scoreSettingsVisible=false" data-review-exempt>取消</button><button class="btn-primary" @click="confirmScoreSettings" data-review-exempt>保存</button></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch, onMounted, inject } from 'vue'
import { useRoute } from 'vue-router'
import { confirm, toast, getCaseLevelLabel } from '@ai-sp/shared'
import { loadAllSchemes } from '@/data/station-schemes/index.js'
import { EXAM_IMAGING_CASES, scoreableOf, calibrationOf } from '@ai-sp/shared/imaging'
import { createdExamsStore } from '@ai-sp/shared/created-exams'
import { useAdminStore } from '@/stores/admin'
import { dict } from '@/views/case-editor/shared.js'

const reviewModeGlobal = inject('reviewMode', false)
const route = useRoute()
const adminStore = useAdminStore()

const institutionProvinceMap = {
  '东南大学医学院': '江苏',
  '华西医院': '四川',
  '中山医院': '广东',
  '协和医院': '北京',
  '同济医院': '湖北',
  '省立医院': '安徽',
  '瑞金医院': '上海',
  '北大第一医院': '北京',
  '湘雅医院': '湖南',
  '齐鲁医院': '山东',
  '郑大一附院': '河南',
  '南方医院': '广东',
  '西南医院': '重庆',
  '清华长庚医院': '北京',
  '浙江省人民医院': '浙江'
}

const SELECTION_PREFIX = 'ai-sp-station-selection-'

function isSchemeVisible(scheme) {
  if (!scheme) return false
  if (scheme.type === 'institution') return scheme.source === adminStore.currentInstitution
  if (scheme.type === 'platform') return scheme.status
  if (scheme.type === 'province') {
    const province = institutionProvinceMap[adminStore.currentInstitution] || ''
    return scheme.source === province && scheme.status
  }
  return false
}

function getDefaultSchemeId(schemes) {
  // 机构已有启用的自建方案 → 优先使用
  const enabledInst = schemes.find(s => s.type === 'institution' && s.source === adminStore.currentInstitution && s.status)
  if (enabledInst) return enabledInst.id
  // 检查 localStorage 保存的选择
  try {
    const raw = localStorage.getItem(SELECTION_PREFIX + adminStore.currentInstitution)
    if (raw) {
      const schemeId = JSON.parse(raw).schemeId
      const scheme = schemes.find(s => s.id === schemeId)
      if (scheme && isSchemeVisible(scheme)) return schemeId
    }
  } catch {}
  // 级联回退：省级（同省启用）→ 平台（启用）→ 机构（本机构）
  const province = institutionProvinceMap[adminStore.currentInstitution] || ''
  const fallbackProvince = schemes.find(s => s.type === 'province' && s.source === province && s.status)
  if (fallbackProvince) return fallbackProvince.id
  const fallbackPlatform = schemes.find(s => s.type === 'platform' && s.status)
  if (fallbackPlatform) return fallbackPlatform.id
  const fallbackInst = schemes.find(s => s.type === 'institution' && s.source === adminStore.currentInstitution)
  if (fallbackInst) return fallbackInst.id
  return schemes.length > 0 ? schemes[0].id : null
}

const currentStep = ref(0)
const steps = ref(['基础信息', '考站设置', '场次与考官规则', '考生与考官分配'])

const form = ref({
  name: '',
  typeCombined: 'residency-出科考核',
  startDate: '',
  endDate: '',
  location: '',
  description: '',
  schemeId: 's1',
  selectedMajors: []
})

const selectedStations = ref({})
const filterStation = ref('')
const allSessions = ref([])
const caseSelectorVisible = ref(false)
let tempSession = null
const caseKeyword = ref('')
const caseFilterPhase = ref('')
const caseFilterSpecialty = ref('')
const caseFilterCategory = ref('')
const caseFilterDisease = ref('')
const casePage = ref(1)
const casePageSize = ref(10)
const activeSessionId = ref('')
const collapsedSessions = ref({})
const navMajorExpanded = ref({})
const scoreSettingsVisible = ref(false)
const scoreSettingsTargetSt = ref(null)
const scoreSettingsTargetSession = ref(null)

const schemeOptions = ref([])
const schemesLoading = ref(true)

/* ══ 影像报告书写考核：病例来源 + 考核配置 ══
 * 组卷时老师在这里配一次，发布后落进派发任务；学员端「我的考核任务」按这些字段呈现。 */
const IMAGING_STATION_KEY = '影像报告书写'
const isImagingStation = (session) => !!session && String(session.stationName || '').includes(IMAGING_STATION_KEY)

/** 影像题库 → 病例选择弹窗的行（沿用现有表格列：编码/标题/阶段/专业/分类/病种/来源） */
const imagingCaseRows = computed(() => EXAM_IMAGING_CASES.map(s => ({
  id: s.id,
  code: s.id,
  title: s.title,
  difficulty: s.level || '',
  specialty: '影像',
  category: s.modality || '',
  disease: s.bodyPart || '',
  source: s.sourceDataset || '内置影像题库',
  sample: s
})))

/** 当前病例弹窗是否处于影像模式（决定可选病例来源与筛选区） */
const caseSelectorImaging = ref(false)

/** 三套预设：一键把下面各字段写成一套常用口径 */
const IMAGING_PRESETS = [
  { key: 'formal', label: '正式考核', examMode: 'online', questionCount: 1, visibleWhen: 'afterWindow', visibleContent: 'total', retake: 'single', scoreScale: 'normalize' },
  { key: 'quiz', label: '随堂测验', examMode: 'online', questionCount: 1, visibleWhen: 'afterSubmit', visibleContent: 'detail', retake: 'latest', scoreScale: 'normalize' },
  { key: 'practice', label: '课后练习', examMode: 'online', questionCount: 1, visibleWhen: 'afterSubmit', visibleContent: 'detail', retake: 'best', scoreScale: 'raw' }
]

const imagingCfg = reactive({
  preset: 'formal',
  examMode: 'online',
  questionCount: 1,
  passLine: null,
  visibleWhen: 'afterWindow',
  visibleContent: 'total',
  retake: 'single',
  scoreScale: 'normalize'
})

const hasImagingStation = computed(() => form.value.selectedMajors.some(m =>
  (selectedStations.value[m] || []).some(s => String(s).includes(IMAGING_STATION_KEY))))

const imagingSessions = computed(() => allSessions.value.filter(isImagingStation))

function applyImagingPreset(key) {
  const p = IMAGING_PRESETS.find(x => x.key === key)
  if (!p) return
  imagingCfg.preset = key
  imagingCfg.examMode = p.examMode
  imagingCfg.questionCount = p.questionCount
  imagingCfg.visibleWhen = p.visibleWhen
  imagingCfg.visibleContent = p.visibleContent
  imagingCfg.retake = p.retake
  imagingCfg.scoreScale = p.scoreScale
}

/** 达标线是否被老师手改过（手改过就不再被建议值覆盖） */
const passLineTouched = ref(false)
function onPassLineInput() { passLineTouched.value = true }

/**
 * 达标线推荐值：按已选病例的难度分层标定折算，**量纲跟着满分口径走**
 *   · normalize → 百分制（passRate × 100）
 *   · raw       → 本卷可评满分量纲（passRate × scoreableMax）
 * ⚠️ 取单个难度用 `calibrationOf(level)`；`getLevelCalibration()` 返回的是**整张标定表**，不是单条。
 */
const suggestedPassLine = computed(() => {
  const sess = imagingSessions.value.find(s => s.case)
  if (!sess) return null
  const sample = EXAM_IMAGING_CASES.find(x => x.id === sess.case.id)
  if (!sample) return null
  const cal = calibrationOf(sample.level)
  if (!cal || !cal.passRate) return null
  if (imagingCfg.scoreScale === 'raw') {
    const max = scoreableOf(sample.id, sample.capabilities).max
    return max ? Math.round(cal.passRate * max * 10) / 10 : null
  }
  return Math.round(cal.passRate * 100 * 10) / 10
})

// 病例或满分口径变化 → 刷新建议值；老师手改过就不覆盖（清空视为未定，仍刷新）
watch(suggestedPassLine, v => {
  if (v === null) return
  if (!passLineTouched.value || imagingCfg.passLine === null || imagingCfg.passLine === '') {
    imagingCfg.passLine = v
  }
})

/* ── 影像场次多病例：`imagingCases` 承载多选，`session.case` 始终 = 第一例 ──
 * 这样既支持多题，又不破坏其它既有单值逻辑（场次表格、状态、快捷应用到同类考站）。 */
function imagingCasesOf(session) {
  if (!session.imagingCases) session.imagingCases = []
  return session.imagingCases
}
function addImagingCase(session, c) {
  const list = imagingCasesOf(session)
  if (list.some(x => x.id === c.id)) return false
  list.push(c)
  session.case = list[0]
  return true
}
function removeImagingCase(session, caseId) {
  const list = imagingCasesOf(session)
  const idx = list.findIndex(x => x.id === caseId)
  if (idx >= 0) list.splice(idx, 1)
  session.case = list[0] || null
  syncPicked()
}

/** 弹窗内"已选"提示（用独立响应式量，避免依赖非响应式的 tempSession 变量） */
const imagingPickCount = ref(0)
const imagingPickedIds = ref([])
function syncPicked() {
  const list = tempSession ? (tempSession.imagingCases || []) : []
  imagingPickCount.value = list.length
  imagingPickedIds.value = list.map(x => x.id)
}
function imagingPicked(id) { return imagingPickedIds.value.includes(id) }

/** 题量上限 = 各影像场次已选病例数的最小值（保证每个场次都出得满） */
const imagingQuestionCap = computed(() => {
  const counts = imagingSessions.value.map(s => (s.imagingCases || []).length).filter(n => n > 0)
  return counts.length ? Math.min(...counts) : 1
})

/** 题量夹取到 [1, 上限]；超上限时提示 */
function clampQuestionCount(notify) {
  const cap = imagingQuestionCap.value
  let v = Number(imagingCfg.questionCount)
  if (!v || v < 1) v = 1
  if (v > cap) {
    v = cap
    if (notify) toast.show(`题量不能超过本场已选病例数（${cap} 例）`, 'warning')
  }
  imagingCfg.questionCount = v
}
watch(imagingQuestionCap, () => clampQuestionCount(true))

function transformScheme(scheme) {
  const majors = scheme.majors.map(m => m.name)
  const stations = {}
  const items = {}
  const scoreTables = {}
  let itemCounter = 0
  let stCounter = 0

  for (const major of scheme.majors) {
    const names = []
    for (const station of major.stations) {
      names.push(station.name)
      const key = major.name + '::' + station.name
      items[key] = station.projects.map(p => ({
        id: 'i' + (++itemCounter),
        name: p.name,
        defaultDur: station.duration
      }))
      scoreTables[key] = station.scoreTables.map(st => ({
        id: 'st' + (++stCounter),
        name: st.name,
        items: st.bindProjects || []
      }))
    }
    stations[major.name] = names
  }
  return { id: scheme.id, name: scheme.name, majors, stations, items, scoreTables }
}

const examinerPool = ref([
  { id: 'e1', name: '张医生', sex: '男', age: 45, phone: '138****0001', specialty: '内科', title: '主任医师' },
  { id: 'e2', name: '李医生', sex: '女', age: 38, phone: '138****0002', specialty: '外科', title: '副主任医师' },
  { id: 'e3', name: '王医生', sex: '男', age: 42, phone: '139****0003', specialty: '内科', title: '主治医师' },
  { id: 'e4', name: '赵医生', sex: '女', age: 35, phone: '137****0004', specialty: '儿科', title: '副主任医师' },
  { id: 'e5', name: '陈医生', sex: '男', age: 50, phone: '136****0005', specialty: '外科', title: '主任医师' },
  { id: 'e6', name: '刘医生', sex: '女', age: 40, phone: '135****0006', specialty: '内科', title: '主治医师' }
])

const studentPool = ref([
  { id: 's1', name: '张三', sex: '男', age: 26, major: '内科', phone: '138****1111', exam_number: '001', grade: '2023级' },
  { id: 's2', name: '李四', sex: '女', age: 25, major: '外科', phone: '138****2222', exam_number: '002', grade: '2023级' },
  { id: 's3', name: '王五', sex: '男', age: 27, major: '内科', phone: '137****3333', exam_number: '003', grade: '2022级' },
  { id: 's4', name: '赵六', sex: '女', age: 24, major: '儿科', phone: '136****4444', exam_number: '004', grade: '2024级' },
  { id: 's5', name: '钱七', sex: '男', age: 26, major: '外科', phone: '135****5555', exam_number: '005', grade: '2023级' },
  { id: 's6', name: '孙八', sex: '女', age: 28, major: '内科', phone: '134****6666', exam_number: '006', grade: '2021级' }
])

const mockCases = ref([])
const casesLoading = ref(false)

async function loadCases() {
  if (mockCases.value.length > 0) return
  casesLoading.value = true
  try {
    // 并行请求静态索引和API，取最快成功的
    const results = await Promise.allSettled([
      fetch('/data/cases/cases-index.json').then(r => r.ok ? r.json() : Promise.reject()),
      fetch('/api/ai-generate/cases').then(r => r.ok ? r.json() : Promise.reject())
    ])
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value.length > 0) {
        mockCases.value = r.value.map(c => ({
          id: c.id || c.case_id,
          code: c.case_id,
          title: c.title,
          specialty: c.specialty,
          disease: c.disease,
          difficulty: c.difficulty || c.teaching_phase || 'R1',
          teaching_phase: c.teaching_phase || '',
          category: c.category || '',
          source: c.source || c.creator_name || '',
          enabled: c.enabled !== false,
          communicationScenes: []
        }))
        break
      }
    }
    // 异步加载各病例的人文沟通场景
    for (const c of mockCases.value) {
      try {
        const hr = await fetch(`/data/cases/${c.code}-humanity.json`)
        if (hr.ok) {
          const hdata = await hr.json()
          c.communicationScenes = (hdata.scenarios || []).map(s => s.scenario_name || s.name || s.title || s.scene).filter(Boolean)
        }
      } catch {}
    }
  } catch {}
  casesLoading.value = false
}

const personDrawerVisible = ref(false)
const personType = ref('examiner')
const personSearch = ref('')
const selectedPersonIds = ref([])
const currentTargetSession = ref(null)

const availableMajors = computed(() => {
  const s = schemeOptions.value.find(s => s.id === form.value.schemeId)
  return s ? s.majors : []
})

const getStationsByMajor = (major) => {
  const s = schemeOptions.value.find(s => s.id === form.value.schemeId)
  return s ? s.stations[major] || [] : []
}

const filteredSessions = computed(() =>
  filterStation.value
    ? allSessions.value.filter(s => s.stationName === filterStation.value)
    : allSessions.value
)

const allStationNames = computed(() => [...new Set(allSessions.value.map(s => s.stationName))])

const filteredNavMajors = computed(() => [...new Set(filteredSessions.value.map(s => s.major))])

const getNavSessionsByMajor = (major) => filteredSessions.value.filter(s => s.major === major)

function getDifficultyLabel(d) { return dict.level_labels[d] || d }

// 阶段：使用 difficulty 字段（U1/U2/R1/R2/R3/F1/F2），按 phase 分组
const casePhaseGroups = computed(() => {
  const groups = []
  for (const phase of dict.teaching_phases) {
    const levels = dict.training_levels.filter(l => l.phase === phase)
    groups.push({ phase, levels })
  }
  return groups
})

const caseSpecialtyOptions = computed(() => {
  let list = mockCases.value
  if (caseFilterPhase.value) list = list.filter(c => c.difficulty === caseFilterPhase.value)
  return [...new Set(list.map(c => c.specialty).filter(Boolean))].sort()
})
const caseCategoryOptions = computed(() => {
  let list = mockCases.value
  if (caseFilterPhase.value) list = list.filter(c => c.difficulty === caseFilterPhase.value)
  if (caseFilterSpecialty.value) list = list.filter(c => c.specialty === caseFilterSpecialty.value)
  return [...new Set(list.map(c => c.category).filter(Boolean))].sort()
})
const caseDiseaseOptions = computed(() => {
  let list = mockCases.value
  if (caseFilterPhase.value) list = list.filter(c => c.difficulty === caseFilterPhase.value)
  if (caseFilterSpecialty.value) list = list.filter(c => c.specialty === caseFilterSpecialty.value)
  if (caseFilterCategory.value) list = list.filter(c => c.category === caseFilterCategory.value)
  return [...new Set(list.map(c => c.disease).filter(Boolean))].sort()
})
function onCasePhaseChange() { caseFilterSpecialty.value = ''; caseFilterCategory.value = ''; caseFilterDisease.value = ''; casePage.value = 1 }
function resetCaseFilters() { caseKeyword.value = ''; caseFilterPhase.value = ''; caseFilterSpecialty.value = ''; caseFilterCategory.value = ''; caseFilterDisease.value = ''; casePage.value = 1 }
function onCaseSpecialtyChange() { caseFilterCategory.value = ''; caseFilterDisease.value = ''; casePage.value = 1 }
function onCaseCategoryChange() { caseFilterDisease.value = ''; casePage.value = 1 }

const filteredCases = computed(() => {
  const kw = caseKeyword.value.toLowerCase()
  // 影像报告书写站：病例来自影像题库，只按关键字过滤（阶段/专业/分类/病种对影像样本无意义）
  if (caseSelectorImaging.value) {
    const list = imagingCaseRows.value
    return kw ? list.filter(c => c.title.toLowerCase().includes(kw) || c.code.toLowerCase().includes(kw)) : list
  }
  let list = mockCases.value.filter(c => c.enabled !== false)
  if (kw) list = list.filter(c => c.title.toLowerCase().includes(kw) || c.code.toLowerCase().includes(kw))
  if (caseFilterPhase.value) list = list.filter(c => c.difficulty === caseFilterPhase.value)
  if (caseFilterSpecialty.value) list = list.filter(c => c.specialty === caseFilterSpecialty.value)
  if (caseFilterCategory.value) list = list.filter(c => c.category === caseFilterCategory.value)
  if (caseFilterDisease.value) list = list.filter(c => c.disease === caseFilterDisease.value)
  return list
})

const totalCasePages = computed(() => Math.ceil(filteredCases.value.length / casePageSize.value) || 1)
const paginatedCases = computed(() => {
  const start = (casePage.value - 1) * casePageSize.value
  return filteredCases.value.slice(start, start + casePageSize.value)
})

const personsPool = computed(() =>
  personType.value === 'examiner' ? examinerPool.value : studentPool.value
)

const filteredPersons = computed(() => {
  const kw = personSearch.value.trim().toLowerCase()
  return kw
    ? personsPool.value.filter(p => p.name.toLowerCase().includes(kw))
    : personsPool.value
})

const generateSessions = () => {
  const scheme = schemeOptions.value.find(s => s.id === form.value.schemeId)
  if (!scheme) return
  const existingMap = new Map(allSessions.value.map(s => [s.name, s]))
  const newSessions = []
  for (const major of form.value.selectedMajors) {
    const stations = selectedStations.value[major] || []
    for (const station of stations) {
      const name = `${major}-${station}`
      if (existingMap.has(name)) {
        newSessions.push(existingMap.get(name))
      } else {
        const itemKey = major + '::' + station
        const items = (scheme.items[itemKey] || []).map(it => ({
          id: it.id,
          name: it.name,
          duration: it.defaultDur,
          defaultDur: it.defaultDur
        }))
        const scoreTables = (scheme.scoreTables[itemKey] || []).map(st => ({ ...st, items: st.items }))
        newSessions.push({
          id: `${major}_${station}_${Date.now()}`,
          name,
          major,
          stationName: station,
          start_datetime: form.value.startDate || '',
          end_datetime: form.value.endDate || '',
          items_duration: items,
          case: null,
          communicationScene: '',
          includeAiScore: true,
          // 影像报告书写站由 AI 逐要点评阅，**不要求真人考官**；
          // 沿用默认 1 会让在线考试卡在"考官人数不足"提交不了
          minHumanExaminers: String(station).includes(IMAGING_STATION_KEY) ? 0 : 1,
          scoreTables,
          examiners: [],
          candidates: []
        })
      }
    }
  }
  allSessions.value = newSessions
  const validIds = new Set(newSessions.map(s => s.id))
  Object.keys(collapsedSessions.value).forEach(id => {
    if (!validIds.has(id)) delete collapsedSessions.value[id]
  })
  newSessions.forEach(s => {
    if (collapsedSessions.value[s.id] === undefined) collapsedSessions.value[s.id] = false
  })
  availableMajors.value.forEach(m => {
    if (navMajorExpanded.value[m] === undefined) navMajorExpanded.value[m] = true
  })
}

const allSelected = computed(() => {
  if (availableMajors.value.length === 0) return false
  return availableMajors.value.every(m => form.value.selectedMajors.includes(m) &&
    (selectedStations.value[m] || []).length === getStationsByMajor(m).length)
})

function toggleAllMajors() {
  if (allSelected.value) {
    form.value.selectedMajors = []
    selectedStations.value = {}
  } else {
    form.value.selectedMajors = [...availableMajors.value]
    for (const major of form.value.selectedMajors) {
      selectedStations.value[major] = [...getStationsByMajor(major)]
    }
  }
  generateSessions()
}

const onSchemeChange = () => {
  form.value.selectedMajors = [...availableMajors.value]
  for (const major of form.value.selectedMajors) {
    selectedStations.value[major] = [...getStationsByMajor(major)]
  }
  generateSessions()
}

const onMajorToggle = (major) => {
  if (form.value.selectedMajors.includes(major)) {
    selectedStations.value[major] = [...getStationsByMajor(major)]
  } else {
    delete selectedStations.value[major]
  }
  generateSessions()
}

const toggleCollapse = (id) => {
  if (!reviewModeGlobal.value) collapsedSessions.value[id] = !collapsedSessions.value[id]
}

const toggleNavMajor = (major) => {
  navMajorExpanded.value[major] = !navMajorExpanded.value[major]
}

const scrollToSession = (id) => {
  activeSessionId.value = id
  const el = document.getElementById(`session-${id}`)
  if (el) el.scrollIntoView({ behavior: 'smooth' })
}

const nameModalVisible = ref(false)
const nameModalValue = ref('')
const nameModalSession = ref(null)

const editSessionName = (session) => {
  nameModalSession.value = session
  nameModalValue.value = session.name
  nameModalVisible.value = true
}

const confirmEditName = () => {
  const newName = nameModalValue.value.trim()
  if (!newName) {
    toast.show('考站名称不能为空', 'warning')
    return
  }
  if (newName.length > 50) {
    toast.show('考站名称不能超过50个字符', 'warning')
    return
  }
  if (nameModalSession.value) {
    nameModalSession.value.name = newName
  }
  nameModalVisible.value = false
}

const copySession = (session) => {
  confirm(`确定复制考站「${session.name}」吗？`).then(ok => {
    if (!ok) return
    const idx = allSessions.value.indexOf(session)
    const sameMajor = allSessions.value.filter(s => s.major === session.major)
    let baseName = session.name.replace(/\s*\d+$/, '').trim()
    if (!baseName) baseName = session.name
    let maxNum = 0
    sameMajor.forEach(s => {
      const m = s.name.match(new RegExp('^' + baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s+(\\d+)$'))
      if (m) maxNum = Math.max(maxNum, parseInt(m[1]))
    })
    if (!session.name.match(/\d+$/)) {
      session.name = `${baseName} 1`
      maxNum = 1
    }
    const newNum = maxNum + 1
    const newSession = JSON.parse(JSON.stringify(session))
    newSession.id = `${session.major}_${session.stationName}_copy_${Date.now()}`
    newSession.name = `${baseName} ${newNum}`
    newSession.examiners = []
    newSession.candidates = []
    allSessions.value.splice(idx + 1, 0, newSession)
    collapsedSessions.value[newSession.id] = false
  }).catch(() => {})
}

const deleteSession = (session) => {
  confirm(`确定删除考站「${session.name}」吗？此操作不可恢复。`).then(ok => {
    if (!ok) return
    const idx = allSessions.value.indexOf(session)
    if (idx !== -1) allSessions.value.splice(idx, 1)
  }).catch(() => {})
}

const moveSession = (session, direction) => {
  const idx = allSessions.value.indexOf(session)
  if (idx === -1) return
  const sameMajorIndices = []
  allSessions.value.forEach((s, i) => {
    if (s.major === session.major) sameMajorIndices.push(i)
  })
  const pos = sameMajorIndices.indexOf(idx)
  if (pos === -1) return
  const newPos = pos + direction
  if (newPos < 0 || newPos >= sameMajorIndices.length) return
  const targetIdx = sameMajorIndices[newPos]
  const temp = allSessions.value[targetIdx]
  allSessions.value[targetIdx] = allSessions.value[idx]
  allSessions.value[idx] = temp
}

const restoreDefaultDuration = (session, itemId) => {
  const item = session.items_duration.find(i => i.id === itemId)
  if (item) item.duration = item.defaultDur
}

const openCaseSelector = (session) => {
  tempSession = session
  caseSelectorImaging.value = isImagingStation(session)
  caseSelectorVisible.value = true
  caseKeyword.value = ''
  caseFilterPhase.value = ''
  caseFilterSpecialty.value = ''
  caseFilterCategory.value = ''
  caseFilterDisease.value = ''
  casePage.value = 1
  syncPicked()
  // 影像样本没有人文沟通场景，不需要拉病例库索引
  if (!caseSelectorImaging.value) loadCases()
}

const selectCase = (c) => {
  // 影像场次：**追加**语义，弹窗不关，可连续添加多例（题量由 imagingCfg.questionCount 决定）
  if (tempSession && caseSelectorImaging.value) {
    const added = addImagingCase(tempSession, c)
    if (!added) toast.show('该病例已在本次考核中', 'warning')
    syncPicked()
    return
  }
  if (tempSession) {
    tempSession.case = c
    const scenes = c.communicationScenes || []
    const isComm = isCommunicationStation(tempSession)
    tempSession.communicationScene = isComm && scenes.length > 0 ? scenes[0] : ''
  }
  caseSelectorVisible.value = false
  // 快捷配置：询问是否应用到同类型其他考站
  if (tempSession) {
    const sameTypeStations = allSessions.value.filter(
      s => s.stationName === tempSession.stationName && s.id !== tempSession.id && !s.case
    )
    if (sameTypeStations.length > 0) {
      confirm(`已将病例「${c.title}」分配给「${tempSession.name}」。\n是否同时应用到其他 ${sameTypeStations.length} 个同类型考站？`).then(ok => {
        if (ok) {
          for (const s of sameTypeStations) {
            s.case = c
            const scenes = c.communicationScenes || []
            const isComm = isCommunicationStation(s)
            s.communicationScene = isComm && scenes.length > 0 ? scenes[0] : ''
          }
          toast.show(`已应用到 ${sameTypeStations.length + 1} 个考站`, 'success')
        }
      }).catch(() => {})
    }
  }
}

const openScoreSettings = (st, session) => {
  scoreSettingsTargetSt.value = st
  scoreSettingsTargetSession.value = session
  scoreSettingsVisible.value = true
}

const confirmScoreSettings = () => {
  scoreSettingsVisible.value = false
  toast.show('评分表设置已保存（演示）', 'success')
}

const toggleScoreItem = (itemName) => {
  if (!scoreSettingsTargetSt.value) return
  const items = scoreSettingsTargetSt.value.items
  if (!items) return
  const idx = items.indexOf(itemName)
  if (idx >= 0) items.splice(idx, 1)
  else items.push(itemName)
}

const getExaminerName = (id) => {
  const e = examinerPool.value.find(e => e.id === id)
  return e ? e.name : ''
}

const openExaminerDrawer = (session) => {
  currentTargetSession.value = session
  personType.value = 'examiner'
  personSearch.value = ''
  selectedPersonIds.value = [...session.examiners]
  personDrawerVisible.value = true
}

const openStudentDrawer = (session) => {
  currentTargetSession.value = session
  personType.value = 'student'
  personSearch.value = ''
  selectedPersonIds.value = [...session.candidates]
  personDrawerVisible.value = true
}

const togglePersonSelection = (personId) => {
  const idx = selectedPersonIds.value.indexOf(personId)
  if (idx >= 0) selectedPersonIds.value.splice(idx, 1)
  else selectedPersonIds.value.push(personId)
}

const confirmPersonSelection = () => {
  if (currentTargetSession.value) {
    if (personType.value === 'examiner') {
      currentTargetSession.value.examiners = [...selectedPersonIds.value]
    } else {
      currentTargetSession.value.candidates = [...selectedPersonIds.value]
    }
  }
  personDrawerVisible.value = false
}

const isCommunicationStation = (session) => {
  return session.stationName.includes('沟通') ||
    (session.items_duration && session.items_duration.some(i => i.name === '人文沟通'))
}

const getSessionStatus = (session) => {
  if (!session.case) return 'warning'
  if (!session.start_datetime || !session.end_datetime) return 'warning'
  if (session.items_duration.some(i => i.duration <= 0)) return 'warning'
  return 'ok'
}

const getStationStatus = (sessionId) => {
  const session = allSessions.value.find(s => s.id === sessionId)
  return session ? getSessionStatus(session) : 'warning'
}

/** 影像报告书写场次的配置校验：至少 1 例病例、题量在 [1, 已选病例数] 内 */
const validateImagingConfig = () => {
  const imaging = allSessions.value.filter(isImagingStation)
  if (!imaging.length) return true
  for (const s of imaging) {
    if (!(s.imagingCases || []).length) { toast.show(`场次「${s.name}」未选择病例`, 'warning'); return false }
  }
  const cap = imagingQuestionCap.value
  const n = Number(imagingCfg.questionCount)
  if (!n || n < 1) { toast.show('影像报告书写题量至少 1 题', 'warning'); return false }
  if (n > cap) { toast.show(`题量不能超过本场已选病例数（${cap} 例）`, 'warning'); return false }
  return true
}

const nextStep = () => {
  const step = currentStep.value
  if (step === 0) {
    if (!form.value.name.trim()) { toast.show('请填写考核名称', 'warning'); return }
    if (!form.value.startDate || !form.value.endDate) { toast.show('请选择考试时间', 'warning'); return }
    if (new Date(form.value.endDate) <= new Date(form.value.startDate)) { toast.show('结束时间必须晚于开始时间', 'warning'); return }
  }
  if (step === 1) {
    if (form.value.selectedMajors.length === 0) { toast.show('请至少选择一个专业', 'warning'); return }
    const hasStation = form.value.selectedMajors.some(m => (selectedStations.value[m] || []).length > 0)
    if (!hasStation) { toast.show('请至少配置一个考站', 'warning'); return }
  }
  if (step === 2) {
    for (const session of allSessions.value) {
      if (!session.case) { toast.show(`场次「${session.name}」未选择病例`, 'warning'); return }
      if (!session.start_datetime || !session.end_datetime) { toast.show(`场次「${session.name}」未设置考试时间`, 'warning'); return }
      if (isCommunicationStation(session) && !session.stationName.includes('接诊') && !session.communicationScene) { toast.show(`场次「${session.name}」未选择沟通场景`, 'warning'); return }
    }
    if (!validateImagingConfig()) return
  }
  if (currentStep.value < steps.value.length - 1) currentStep.value++
}

const prevStep = () => { if (currentStep.value > 0) currentStep.value-- }

/** 统一格式化成任务契约要的 `YYYY-MM-DD HH:mm`（Date 实例与字符串都支持） */
const fmtDateTime = (v) => {
  if (!v) return ''
  const d = v instanceof Date ? v : new Date(String(v).replace(' ', 'T'))
  if (isNaN(d.getTime())) return typeof v === 'string' ? v : ''
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

const submitExam = async () => {
  for (const session of allSessions.value) {
    if (!session.case) { toast.show(`场次「${session.name}」未选择病例`, 'warning'); return }
    if (session.minHumanExaminers > 0 && session.examiners.length < session.minHumanExaminers) { toast.show(`场次「${session.name}」考官人数不足`, 'warning'); return }
  }
  if (!validateImagingConfig()) return

  // 影像报告书写场次：各产出一条派发任务，写入跨端存储（学员端「我的考核任务」读它）
  const imaging = allSessions.value.filter(isImagingStation)
  if (!imaging.length) {
    toast.show('考核创建成功（模拟）', 'success')
    cancel()
    return
  }

  const now = new Date()
  const p = n => String(n).padStart(2, '0')
  const examId = `EXAM-${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}${p(now.getHours())}${p(now.getMinutes())}`
  const schemeName = (schemeOptions.value.find(s => s.id === form.value.schemeId) || {}).name
  const passLine = (imagingCfg.passLine === null || imagingCfg.passLine === '')
    ? suggestedPassLine.value
    : Number(imagingCfg.passLine)

  const tasks = imaging.map((session, idx) => {
    const item = (session.items_duration || [])[0] || {}
    const caseIds = (session.imagingCases || []).map(c => c.id)
    const qCount = Math.max(1, Math.min(Number(imagingCfg.questionCount) || 1, caseIds.length || 1))
    return {
      id: `TASK-${examId}-${idx + 1}`,
      name: `${form.value.name} · ${session.name}`,
      scheme: schemeName || session.stationName,
      examMode: imagingCfg.examMode,
      caseIds,
      durationMin: item.defaultDur || item.duration || 20,
      passLine: typeof passLine === 'number' && !isNaN(passLine) ? passLine : 0,
      questionCount: qCount,
      scoreVisible: { when: imagingCfg.visibleWhen, content: imagingCfg.visibleContent },
      retake: imagingCfg.retake,
      scoreScale: imagingCfg.scoreScale,
      windowStart: fmtDateTime(session.start_datetime),
      windowEnd: fmtDateTime(session.end_datetime),
      dispatchedBy: '考务管理员',
      dispatchedAt: fmtDateTime(now)
    }
  })

  try {
    const existing = await createdExamsStore.load()
    const list = Array.isArray(existing) ? existing.slice() : []
    await createdExamsStore.save([...list, ...tasks])
  } catch (e) {
    toast.show(`考核创建失败：${e.message || '存储不可用'}`, 'error')
    return
  }
  toast.show(`考核创建成功，已派发 ${tasks.length} 个影像报告书写任务`, 'success')
  cancel()
}

const cancel = () => {
  confirm('确定要返回列表页吗？').then(ok => {
    if (ok && window.openPage) {
      window.openPage({ id: 'exam-records', label: '考核记录' })
    }
  }).catch(() => {})
}

watch([() => form.value.selectedMajors, selectedStations], () => generateSessions(), { deep: true })

watch(filterStation, () => { activeSessionId.value = '' })

function loadExamForEdit(examId) {
  const idx = parseInt(examId.replace('exam_', '')) || 1
  const names = ['2026年住培结业考核', '2026年第一季度出科考核', '2026年年度考核', '2026年招录考核', '2026年中期考核', '2026年期末考试']
  const typeCombos = ['residency-出科考核', 'residency-年度考核', 'residency-模拟结业', 'residency-招录考核', 'college-中期考核', 'college-期末考试']
  const nameIdx = (idx - 1) % names.length
  form.value.name = names[nameIdx] + (idx > 6 ? ` (第${Math.floor((idx-1)/6)+1}期)` : '')
  form.value.typeCombined = typeCombos[nameIdx]
  const baseDate = new Date(2026, 5, 1 + (idx % 28))
  form.value.startDate = baseDate.toISOString().slice(0, 16).replace('T', ' ') // fallback format
  // Format as datetime-local compatible
  const d = new Date(2026, 5, 1 + (idx % 28), 8 + (idx % 4), 0)
  form.value.startDate = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0') + 'T' + String(d.getHours()).padStart(2,'0') + ':00'
  const dEnd = new Date(d.getTime() + (2 + idx % 3) * 3600000)
  form.value.endDate = dEnd.getFullYear() + '-' + String(dEnd.getMonth()+1).padStart(2,'0') + '-' + String(dEnd.getDate()).padStart(2,'0') + 'T' + String(dEnd.getHours()).padStart(2,'0') + ':00'
  form.value.location = ['临床技能中心3楼', '教学楼5楼', '实训中心2楼', '模拟医院6楼'][idx % 4]
  form.value.description = names[nameIdx] + '临床实践能力考核'
  currentStep.value = 0
}

onMounted(async () => {
  const allSchemes = await loadAllSchemes()
  const visibleSchemes = allSchemes.filter(isSchemeVisible)
  schemeOptions.value = visibleSchemes.map(transformScheme)
  schemesLoading.value = false
  if (schemeOptions.value.length > 0) {
    const defaultId = getDefaultSchemeId(allSchemes)
    form.value.schemeId = schemeOptions.value.find(s => s.id === defaultId)?.id || schemeOptions.value[0].id
    form.value.selectedMajors = [...availableMajors.value]
    onSchemeChange()
  }
  // 编辑模式：从route query加载已有考试数据
  if (route.query.examId) {
    loadExamForEdit(route.query.examId)
  }
})
</script>

<style scoped>
.content-container {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.exam-create-container {
  padding-bottom: 80px;
}

.steps {
  display: flex;
  align-items: center;
  margin-bottom: 24px;
  padding: 16px 20px;
  background: var(--card-bg);
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
}

.step-item {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.step-item.active .step-number {
  background: var(--primary);
  color: #fff;
}

.step-item.completed .step-number {
  background: var(--success);
  color: #fff;
}

.step-number {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  background: var(--border);
  color: var(--text-secondary);
  flex-shrink: 0;
}

.step-label {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.step-item.active .step-label,
.step-item.completed .step-label {
  color: var(--text-main);
  font-weight: 600;
}

.step-line {
  flex: 1;
  height: 2px;
  background: var(--border);
  margin: 0 8px;
}

.step-item.completed + .step-line,
.step-item.active + .step-line {
  background: var(--primary);
}

.form-item {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  font-size: 13px;
}

.input-field {
  padding: 8px 12px;
  border-radius: var(--input-radius);
  border: 1px solid var(--input-border);
  font-size: 13px;
  outline: none;
  transition: all 0.15s;
  width: 100%;
  background: #fff;
}

.input-field:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(24, 144, 255, 0.1);
}

.select-field {
  padding: 8px 12px;
  border-radius: var(--input-radius);
  border: 1px solid var(--input-border);
  font-size: 13px;
  outline: none;
  background: #fff;
  width: 100%;
}

.scheme-select {
  max-width: 300px;
}

.major-group {
  margin-bottom: 16px;
  padding: 12px;
  background: #FAFAFA;
  border-radius: 8px;
}

.major-checkbox {
  cursor: pointer;
}

.station-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding-left: 24px;
}

.station-label {
  cursor: pointer;
  font-size: 14px;
}

.session-layout {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.session-nav {
  width: 240px;
  flex-shrink: 0;
  background: var(--card-bg);
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
  padding: 12px 0;
  max-height: calc(100vh - 240px);
  overflow-y: auto;
  position: sticky;
  top: 12px;
}

.session-nav-major {
  padding: 10px 16px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 6px;
  margin: 0 8px;
  transition: background .15s;
}

.session-nav-major:hover {
  background: #E6F7FF;
}

.nav-station-top {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  min-width: 0;
  padding: 2px 0;
}

.nav-station-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}

.session-nav-station {
  padding: 6px 12px 6px 12px;
  margin: 2px 8px;
  font-size: 13px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  border-left: 3px solid transparent;
  border-radius: 6px;
  transition: background .15s, border-color .15s;
}

.session-nav-station.active {
  background: #E6F7FF;
  border-left-color: var(--primary);
}

.session-nav-station:hover {
  background: #E6F7FF;
  border-left-color: #BAE7FF;
}

.nav-actions {
  display: flex;
  gap: 2px;
  align-items: center;
}

.nav-actions button {
  background: #fff;
  border: 1px solid #EBEEF5;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 12px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all .12s;
  line-height: 1;
}

.nav-actions button:hover {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}

.nav-arrows button {
  background: #fff;
  border: 1px solid #EBEEF5;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 12px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all .12s;
  line-height: 1;
}

.nav-arrows button:hover {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}

.session-content-area {
  flex: 1;
  min-width: 0;
}

.session-card {
  background: var(--card-bg);
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
  margin-bottom: 12px;
  overflow: hidden;
}

.session-header {
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid var(--border-light);
}

.session-header:hover {
  background: #FAFAFA;
}

.session-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.session-body {
  padding: 16px;
}

.duration-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 13px;
}

.duration-input {
  width: 80px;
  text-align: center;
}

.restore-default {
  font-size: 12px;
  color: var(--primary);
  cursor: pointer;
  text-decoration: underline;
}

.score-table-list {
  margin-top: 4px;
}

.score-table-list > div {
  padding: 4px 0;
}

.examiner-rule {
  padding: 8px 0;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th,
.table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-light);
  font-size: 13px;
}

.table th {
  background: #FAFAFA;
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
}

.fixed-buttons {
  position: fixed;
  bottom: 0;
  left: var(--sidebar-width);
  right: 0;
  background: var(--card-bg);
  padding: 12px 24px;
  border-top: 1px solid var(--border);
  display: flex;
  gap: 12px;
  z-index: 10;
}

.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
}

.drawer-container {
  width: 480px;
  max-width: 90vw;
  height: 100%;
  background: #fff;
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1);
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  font-weight: 600;
}

.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.drawer-footer {
  padding: 12px 20px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.person-card-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.person-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
}

.person-card:hover {
  background: var(--primary-lightest);
}

.person-card.selected {
  border-color: var(--primary);
  background: var(--primary-light);
}

.person-card-checkbox {
  width: 16px;
  height: 16px;
  accent-color: var(--primary);
}

.person-card-info {
  flex: 1;
  min-width: 0;
}

.person-card-name {
  font-weight: 500;
  font-size: 14px;
}

.person-card-details {
  font-size: 12px;
  color: var(--text-secondary);
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 2px;
}

.person-card-tag {
  background: var(--primary-lightest);
  color: var(--primary);
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-container {
  background: #fff;
  border-radius: var(--card-radius);
  padding: 24px;
  max-width: 900px;
  width: 95%;
  max-height: 80vh;
  overflow: auto;
}

.review-disabled {
  pointer-events: none;
  opacity: 0.7;
  background: #F5F7FA;
}

.status-ok {
  color: var(--success);
  font-size: 14px;
}

.status-warning {
  color: var(--warning);
  font-size: 14px;
}

.link-style {
  color: var(--primary);
  cursor: pointer;
  text-decoration: underline;
}

.link-style-pending {
  color: var(--warning);
  cursor: pointer;
  font-size: 13px;
}

.examiner-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  background: var(--primary-lightest);
  color: var(--primary);
  border-radius: 4px;
  font-size: 12px;
  margin-right: 4px;
}

.btn-default {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 36px;
  padding: 0 16px;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  border: 1px solid var(--border);
  background: #fff;
  transition: all 0.15s;
}

.btn-default:hover {
  background: var(--primary-light);
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 36px;
  padding: 0 16px;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  border: none;
  background: var(--primary);
  color: #fff;
  transition: all 0.15s;
}

.btn-primary:hover {
  background: var(--primary-dark);
}

.btn-sm {
  height: 32px;
  padding: 0 12px;
  font-size: 12px;
}

.text-red-500 {
  color: #F5222D;
}

.text-gray-500 {
  color: #606266;
}

.text-primary {
  color: var(--primary);
}

.font-medium {
  font-weight: 500;
}

.font-semibold {
  font-weight: 600;
}

.text-sm {
  font-size: 12px;
}

.text-center {
  text-align: center;
}

.py-8 {
  padding-top: 32px;
  padding-bottom: 32px;
}

.ml-2 {
  margin-left: 8px;
}

.mb-1 {
  margin-bottom: 4px;
}

.mb-2 {
  margin-bottom: 8px;
}

.mb-3 {
  margin-bottom: 12px;
}

.mb-4 {
  margin-bottom: 16px;
}

.justify-end {
  justify-content: flex-end;
}

.flex {
  display: flex;
}

.items-center {
  align-items: center;
}

.gap-1 {
  gap: 4px;
}

.gap-2 {
  gap: 8px;
}

.gap-3 {
  gap: 12px;
}

.w-48 {
  width: 192px;
}

.w-full {
  width: 100%;
}

.cursor-pointer {
  cursor: pointer;
}

/* 选择病例弹窗 */
.case-selector-modal {
  max-width: 1200px;
  height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.case-selector-modal > h3 { flex-shrink: 0; }
.case-selector-modal > .case-filter-bar { flex-shrink: 0; }
.case-selector-modal > .table { flex: 1; overflow-y: auto; display: block; }
.case-selector-modal > .table thead { position: sticky; top: 0; background: #fff; z-index: 1; }
.case-selector-modal > .case-pagination { flex-shrink: 0; }
.case-selector-modal > .text-secondary { flex-shrink: 0; }
.case-filter-bar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
.case-filter-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 100px;
  flex: 1;
}
.case-filter-label {
  font-size: 11px;
  color: #909399;
  font-weight: 500;
}
.case-filter-item .input-field,
.case-filter-item .select {
  padding: 6px 8px;
  font-size: 12px;
  border: 1px solid #EBEEF5;
  border-radius: 6px;
  outline: none;
  background: #fff;
}
.case-filter-item .input-field:focus,
.case-filter-item .select:focus {
  border-color: var(--primary);
}
.case-filter-actions {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  padding-bottom: 2px;
}
.case-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid #EBEEF5;
}
</style>
