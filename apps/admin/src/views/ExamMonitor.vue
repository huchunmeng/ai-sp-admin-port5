<template>
  <div class="content-container">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-3">
        <span class="exam-title-inline" data-reviewable="考试名称">{{ exam.name }}</span>
        <div class="inner-tabs" style="flex:0 0 auto">
          <div class="tab-item" :class="{ active: activeTab === 'monitor' }" @click="activeTab = 'monitor'">监考</div>
          <div class="tab-item" :class="{ active: activeTab === 'scores' }" @click="activeTab = 'scores'">成绩</div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-sm text-secondary" v-if="activeTab === 'monitor'">刷新：{{ lastRefresh }}</span>
        <button class="btn btn-sm" @click="goBack">← 列表</button>
      </div>
    </div>

    <template v-if="activeTab === 'monitor'">
      <div class="monitor-layout">
        <div class="monitor-sidebar">
          <div v-for="m in examMajors" :key="m" class="monitor-major-item" :class="{ active: monitorMajor === m }" @click="monitorMajor = m">
            <span>{{ m }}</span>
          </div>
        </div>
        <div class="monitor-main">
          <div class="flex items-center justify-between mb-4">
            <div class="monitor-subtabs">
              <div class="monitor-subtab" :class="{ active: monitorPanel === 'station' }" @click="changePanel('station')">考站 <span class="subtab-count">{{ stationCards.length }}</span></div>
              <div class="monitor-subtab" :class="{ active: monitorPanel === 'examiner' }" @click="changePanel('examiner')">考官 <span class="subtab-count">{{ examiners.length }}</span></div>
              <div class="monitor-subtab" :class="{ active: monitorPanel === 'candidate' }" @click="changePanel('candidate')">考生 <span class="subtab-count">{{ majorCounts[monitorMajor] || 0 }}</span></div>
            </div>
          </div>

          <template v-if="monitorPanel === 'station'">
            <div class="card mb-4" style="padding:16px 20px"><div class="flex items-center gap-3">
              <div class="filter-item" style="flex-direction:row;align-items:center;gap:6px"><label style="margin:0;white-space:nowrap">时间筛选</label><select class="select" v-model="stationTimeType" style="width:140px"><option value="">不限</option><option value="today">今天</option><option value="week">本周</option><option value="month">本月</option></select></div>
            </div></div>
            <div class="card" style="padding:0"><div class="table-wrapper"><table class="table">
              <thead><tr><th>考站名称</th><th>考站类型</th><th>考题</th><th style="text-align:center">考试中</th><th style="text-align:center">暂停</th><th style="text-align:center">已考</th><th style="text-align:center">待考</th><th style="text-align:center">中止</th><th style="text-align:center">考生端</th><th style="text-align:center">考官端</th><th>开始时间</th><th>结束时间</th></tr></thead>
              <tbody><tr v-for="st in stationCards" :key="st.name"><td style="font-weight:600">{{ st.name }}</td><td>{{ st.stationType }}</td><td>{{ st.caseInfo }}</td><td style="text-align:center"><span class="badge badge-info" style="cursor:pointer" @click="openNameList(st.name, 'in_progress')">{{ st.inProgress }}</span></td><td style="text-align:center"><span class="badge badge-warning" style="cursor:pointer" @click="openNameList(st.name, 'paused')">{{ st.paused }}</span></td><td style="text-align:center"><span class="badge badge-success" style="cursor:pointer" @click="openNameList(st.name, 'completed')">{{ st.completed }}</span></td><td style="text-align:center"><span class="badge badge-warning" style="cursor:pointer" @click="openNameList(st.name, 'pending')">{{ st.pending }}</span></td><td style="text-align:center"><span class="badge badge-error" style="cursor:pointer" @click="openNameList(st.name, 'abnormal')">{{ st.abnormal }}</span></td><td style="text-align:center"><span class="text-primary" style="cursor:pointer;font-weight:600" @click="openDeviceList(st.name, 'SP')">{{ st.spDeviceCount }}</span></td><td style="text-align:center"><span style="cursor:pointer;font-weight:600;color:#7c3aed" @click="openDeviceList(st.name, 'examiner')">{{ st.exDeviceCount }}</span></td><td>{{ st.startTime }}</td><td>{{ st.endTime }}</td></tr></tbody>
            </table></div></div>
          </template>

          <template v-if="monitorPanel === 'examiner'">
            <div class="card mb-4" style="padding:12px 20px"><div class="flex items-center gap-4">
              <div class="filter-item"><input class="input" placeholder="搜索姓名/手机号" v-model="examinerKeyword" style="min-width:160px"></div>
              <div class="filter-item"><select class="select" v-model="examinerStationFilter"><option value="">全部考站</option><option v-for="sn in allStationNames" :key="sn" :value="sn">{{ sn }}</option></select></div>
              <div class="filter-item"><select class="select" v-model="examinerStatusFilter"><option value="">全部状态</option><option value="logged_in">已登录</option><option value="not_logged">未登录</option></select></div>
              <div class="filter-item" style="flex-direction:row;gap:8px"><button class="btn btn-primary btn-sm" @click="examinerSearch()">搜索</button><button class="btn btn-sm" @click="examinerReset()">重置</button></div>
            </div></div>
            <div class="card" style="padding:0"><div class="table-wrapper"><table class="table">
              <thead><tr><th style="width:50px">序号</th><th>考官姓名</th><th>手机号</th><th>登录状态</th><th>登录设备</th><th>所在考站</th><th>当前评分对象</th><th style="text-align:center">已评分</th></tr></thead>
              <tbody><tr v-for="(ex, ei) in filteredExaminers" :key="ex.id"><td>{{ ei + 1 }}</td><td style="font-weight:500">{{ ex.name }}</td><td>{{ ex.phone }}</td><td><span :style="{display:'inline-flex',alignItems:'center',gap:'4px',color:ex.logged_in?'var(--success)':'var(--text-tertiary)'}"><span style="display:inline-block;width:8px;height:8px;border-radius:50%" :style="{background:ex.logged_in?'var(--success)':'#ccc'}"></span>{{ ex.logged_in ? '已登录' : '未登录' }}</span></td><td>{{ ex.device || '-' }}</td><td>{{ ex.station || '-' }}</td><td>{{ ex.scoring_target || '-' }}</td><td style="text-align:center"><span class="badge badge-info" style="cursor:pointer" @click="openExaminerScoreList(ex)">{{ ex.scored_count }}</span></td></tr></tbody>
            </table></div></div>
          </template>

          <template v-if="monitorPanel === 'candidate'">
            <div class="card mb-4" style="padding:12px 20px"><div class="flex items-center gap-4">
              <div class="filter-item"><input class="input" placeholder="搜索考生姓名/手机号" v-model="candidateKeyword" style="min-width:200px"></div>
              <div class="filter-item"><select class="select" v-model="candidateGradeFilter"><option value="">全部年级</option><option v-for="g in gradeOptions" :key="g" :value="g">{{ g }}</option></select></div>
              <div class="filter-item"><button class="btn btn-primary btn-sm" @click="candidatePage=1">搜索</button><button class="btn btn-sm" @click="candidateKeyword='';candidateGradeFilter=''">重置</button></div>
            </div></div>
            <div class="card" style="padding:0"><div class="table-wrapper"><table class="table">
              <thead><tr><th style="width:50px">序号</th><th>考生姓名</th><th>手机号</th><th>年级</th><th v-for="sn in activeMajorStations" :key="sn" style="text-align:center">{{ sn }}</th></tr></thead>
              <tbody><tr v-for="(c, ci) in candidatePageData" :key="c.id"><td>{{ (candidatePage-1) * candidatePageSize + ci + 1 }}</td><td style="font-weight:500">{{ c.name }}</td><td>{{ c.phone }}</td><td>{{ c.grade }}</td><td v-for="st in c.stations" :key="st.name" style="text-align:center"><span class="badge" :class="stationBadgeClass(st.status)" style="cursor:pointer" @click="openStatusPicker(c, st)">{{ stationStatusMap[st.status] }}</span></td></tr></tbody>
            </table></div></div>
            <div class="flex items-center justify-between mt-4"><div class="text-secondary">共 {{ filteredCandidates.length }} 人</div><div class="flex gap-2 items-center"><button class="btn btn-sm" :disabled="candidatePage <= 1" @click="candidatePage--">上一页</button><span class="px-3">{{ candidatePage }} / {{ candidateTotalPages }}</span><button class="btn btn-sm" :disabled="candidatePage >= candidateTotalPages" @click="candidatePage++">下一页</button><select class="select" style="width:auto" v-model="candidatePageSize" @change="candidatePage=1"><option :value="10">10条/页</option><option :value="20">20条/页</option><option :value="50">50条/页</option></select></div></div>
          </template>

        </div>
      </div>
    </template>

    <template v-if="activeTab === 'scores'">
      <div class="monitor-layout">
        <div class="monitor-sidebar">
          <div v-for="m in scoreMajorList" :key="m" class="monitor-major-item" :class="{ active: scoreActiveMajor === m }" @click="scoreActiveMajor = m; scorePage = 1">
            <span>{{ m }}</span>
          </div>
        </div>
        <div class="monitor-main">
          <div class="stat-cards-row mb-4" style="grid-template-columns:repeat(4,1fr)" v-if="scoreActiveMajor">
            <div class="stat-card" style="position:relative"><div class="stat-card-icon" style="background:#d1fae5;color:var(--success)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg></div><div class="stat-card-body"><div class="stat-card-value" style="color:var(--success)">{{ currentScoreStats.passRate }}</div><div class="stat-card-label">通过率</div></div><button class="btn btn-sm" style="position:absolute;top:8px;right:8px" @click="openScoreSettings()">⚙</button></div>
            <div class="stat-card"><div class="stat-card-icon" style="background:#eff6ff;color:var(--primary)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 6 13.5 15.5 8.5 10.5 1 18"/></svg></div><div class="stat-card-body"><div class="stat-card-value" style="color:var(--primary)">{{ currentScoreStats.avg }}</div><div class="stat-card-label">平均分</div></div></div>
            <div class="stat-card"><div class="stat-card-icon" style="background:#fef3c7;color:#f59e0b"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 6 13.5 15.5 8.5 10.5 1 18"/></svg></div><div class="stat-card-body"><div class="stat-card-value" style="color:#f59e0b">{{ currentScoreStats.max }}</div><div class="stat-card-label">最高分</div></div></div>
            <div class="stat-card"><div class="stat-card-icon" style="background:#fee2e2;color:var(--error)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 18 13.5 8.5 8.5 13.5 1 6"/></svg></div><div class="stat-card-body"><div class="stat-card-value" style="color:var(--error)">{{ currentScoreStats.min }}</div><div class="stat-card-label">最低分</div></div></div>
          </div>
          <div class="card mb-4" style="padding:12px 20px" v-if="scoreActiveMajor"><div class="flex items-center gap-4">
            <div class="filter-item"><input class="input" placeholder="搜索考生姓名/手机号" v-model="scoreKeyword" style="min-width:200px"></div>
            <div class="filter-item"><select class="select" v-model="scorePassFilter"><option value="">全部</option><option value="pass">通过</option><option value="fail">未通过</option></select></div>
            <button class="btn btn-primary btn-sm" @click="scorePage=1">搜索</button>
            <button class="btn btn-sm" @click="scoreKeyword='';scorePassFilter='';scorePage=1">重置</button>
          </div></div>
          <div class="card" style="padding:0" v-if="scoreActiveMajor"><div class="table-wrapper"><table class="table">
            <thead><tr>
              <th style="width:50px" class="sortable" @click="toggleSort('index')">序号 {{ sortIcon('index') }}</th>
              <th class="sortable" @click="toggleSort('name')">考生姓名 {{ sortIcon('name') }}</th>
              <th>手机号</th><th>年级</th>
              <th v-for="sn in scoreActiveStations" :key="sn" style="text-align:center" class="sortable" @click="toggleSort('station', sn)">{{ sn }} {{ sortIcon('station', sn) }}</th>
              <th style="text-align:center" class="sortable" @click="toggleSort('total')">总分 {{ sortIcon('total') }}</th>
              <th style="text-align:center" class="sortable" @click="toggleSort('pass')">通过 {{ sortIcon('pass') }}</th>
              <th style="min-width:120px">操作</th>
            </tr></thead>
            <tbody><tr v-for="(s, si) in sortedScorePageData" :key="s.id"><td>{{ si + 1 }}</td><td style="font-weight:500">{{ s.candidate_name }}</td><td>{{ s.phone }}</td><td>{{ s.grade }}</td><td v-for="st in s.stations" :key="st.name" style="text-align:center;font-weight:600" :style="{color:(st.score/st.full_score>=0.6)?'var(--success)':'var(--error)'}">{{ st.score }}/{{ st.full_score }}</td><td style="text-align:center;font-weight:700" :style="{color: s.passed ? 'var(--success)' : 'var(--error)'}">{{ scoreTotalByRule(s) }}</td><td style="text-align:center"><span class="badge" :class="s.passed ? 'badge-success' : 'badge-error'">{{ s.passed ? '通过' : '未通过' }}</span></td><td><a class="action-link" @click="openScoreDetailDrawer(s)">评分详情</a><a class="action-link" @click="viewAIReport(s)">AI报告</a></td></tr></tbody>
          </table></div></div>
          <div class="flex items-center justify-between mt-4" v-if="scoreActiveMajor"><div class="text-secondary">共 {{ scoreFilteredList.length }} 条</div><div class="flex gap-2 items-center"><button class="btn btn-sm" :disabled="scorePage <= 1" @click="scorePage--">上一页</button><span class="px-3">{{ scorePage }} / {{ scoreTotalPages }}</span><button class="btn btn-sm" :disabled="scorePage >= scoreTotalPages" @click="scorePage++">下一页</button><select class="select" style="width:auto" v-model="scorePageSize" @change="scorePage=1"><option :value="10">10条/页</option><option :value="20">20条/页</option><option :value="50">50条/页</option></select></div></div>
        </div>
      </div>
    </template>

    <div v-if="nameListVisible" class="drawer-overlay" @click.self="nameListVisible = false">
      <div class="drawer-container" style="width:auto;max-width:900px;min-width:560px">
        <div class="drawer-header"><span style="font-weight:600">{{ nameListTitle }} — {{ nameListStatusLabel }}</span><button class="btn-default btn-sm" @click="nameListVisible = false">✕</button></div>
        <div class="drawer-body">
          <div class="name-list-legend mb-3" style="font-size:12px;color:var(--text-tertiary);padding:8px 12px;background:#f9fafb;border-radius:6px">
            <span><strong>暂停：</strong>暂停考生当前考站的计时，考试状态保持不变，后续可恢复</span>
            <span style="margin-left:24px"><strong>中止：</strong>终止该考站考试，标记为异常状态，需说明原因</span>
          </div>
          <div class="card" style="padding:0"><div class="table-wrapper"><table class="table">
          <thead><tr v-if="nameListIsAbnormal"><th style="width:40px">#</th><th>考生姓名</th><th>手机号</th><th>专业</th><th>年级</th><th>考官</th><th>设备</th><th>中止说明</th><th>操作</th></tr><tr v-else><th style="width:40px">#</th><th>考生姓名</th><th>手机号</th><th>专业</th><th>年级</th><th>考官</th><th>设备</th><th>操作</th></tr></thead>
          <tbody><tr v-for="(n, ni) in nameListPageData" :key="ni"><td>{{ (nameListPage-1) * nameListPageSize + ni + 1 }}</td><td style="font-weight:500">{{ n.name }}</td><td>{{ n.phone }}</td><td>{{ n.major }}</td><td>{{ n.grade }}</td><td>{{ n.examiner }}</td><td>{{ n.device }}</td><td v-if="nameListIsAbnormal" style="color:var(--error)">{{ n.reason || '-' }}</td><td><a v-if="!nameListIsAbnormal" class="action-link" @click="nlPause(n)">暂停</a><a v-if="!nameListIsAbnormal" class="action-link" style="color:var(--error)" @click="nlAbort(n)">中止</a></td></tr></tbody>
        </table></div></div>
        <div class="flex items-center justify-between mt-3" v-if="nameListTotalPages > 1"><span class="text-sm text-secondary">{{ nameListFull.length }}人</span><div class="flex gap-1"><button class="btn btn-sm" :disabled="nameListPage<=1" @click="nameListPage--">上一页</button><span class="px-2 text-sm">{{ nameListPage }}/{{ nameListTotalPages }}</span><button class="btn btn-sm" :disabled="nameListPage>=nameListTotalPages" @click="nameListPage++">下一页</button></div></div></div>
      </div>
    </div>

    <div v-if="deviceListVisible" class="drawer-overlay" @click.self="deviceListVisible = false">
      <div class="drawer-container" style="width:640px"><div class="drawer-header"><span style="font-weight:600">{{ deviceListTitle }} — {{ deviceListTypeLabel }}设备</span><button class="btn-default btn-sm" @click="deviceListVisible = false">✕</button></div>
      <div class="drawer-body"><div class="card" style="padding:0"><div class="table-wrapper"><table class="table">
        <thead><tr v-if="deviceListType === 'SP'"><th>设备名称</th><th>登录账号</th><th>当前考生</th><th>状态</th><th>考核项目</th><th>IP</th><th>在线</th></tr><tr v-else><th>设备名称</th><th>登录账号</th><th>考官</th><th>IP</th><th>在线</th></tr></thead>
        <tbody><tr v-for="d in deviceListData" :key="d.id"><td>{{ d.device_name }}</td><td>{{ d.account }}</td><td style="font-weight:500">{{ d.user || '-' }}</td><td v-if="deviceListType === 'SP'"><span :style="{color: d.userStatus === '答题中' ? 'var(--primary)' : 'var(--text-secondary)'}">{{ d.userStatus }}</span></td><td v-if="deviceListType === 'SP'"><span style="font-size:12px">{{ d.examItems }}</span></td><td><code style="background:#f3f4f6;padding:2px 6px;border-radius:4px">{{ d.ip }}</code></td><td><span :style="{color:d.online?'var(--success)':'var(--text-tertiary)'}">{{ d.online ? '在线' : '离线' }}</span></td></tr></tbody>
      </table></div></div></div>
    </div></div>

    <div v-if="examinerScoreVisible" class="drawer-overlay" @click.self="examinerScoreVisible = false"><div class="drawer-container" style="width:680px"><div class="drawer-header"><span style="font-weight:600">{{ examinerScoreTitle }} — 已评分名单</span><button class="btn-default btn-sm" @click="examinerScoreVisible = false">✕</button></div><div class="drawer-body"><div class="card" style="padding:0"><div class="table-wrapper"><table class="table"><thead><tr><th>考生姓名</th><th>手机号</th><th>评分的考站</th><th style="text-align:center">得分</th><th>提交时间</th><th>操作</th></tr></thead><tbody><tr v-for="s in examinerScoreData" :key="s.name + s.station"><td style="font-weight:500">{{ s.name }}</td><td>{{ s.phone }}</td><td>{{ s.station }}</td><td style="text-align:center;font-weight:600" :style="{color:s.totalScore>=passScore?'var(--success)':'var(--error)'}">{{ s.totalScore }}</td><td>{{ s.submitTime }}</td><td><a class="action-link" style="color:var(--text-tertiary);cursor:default">查看详情</a></td></tr></tbody></table></div></div></div></div></div>

    <div v-if="statusPickerVisible" class="modal-overlay" @click.self="statusPickerVisible = false"><div class="modal-container" style="width:auto;max-width:400px;min-width:320px"><div class="drawer-header"><span style="font-weight:600">修改状态 — {{ statusPickerCandidate?.name }}</span><button class="btn-default btn-sm" @click="statusPickerVisible = false">✕</button></div><div class="drawer-body"><p style="margin-bottom:12px;color:var(--text-secondary)">考站：{{ statusPickerStation?.name }}</p><div class="flex flex-col gap-2"><button class="btn" :class="{ 'btn-primary': statusPickerStation?.status === 'paused' }" @click="applyStatus('paused')">暂停</button><button class="btn" :class="{ 'btn-primary': statusPickerStation?.status === 'completed' }" @click="applyStatus('completed')">已完成</button><button class="btn" :class="{ 'btn-primary': statusPickerStation?.status === 'pending' }" @click="applyStatus('pending')">待考</button><button class="btn" style="color:var(--error)" :class="{ 'btn-primary': statusPickerStation?.status === 'abnormal' }" @click="preAbnormal()">中止</button></div></div></div></div>

    <div v-if="abnormalReasonVisible" class="modal-overlay" @click.self="abnormalReasonVisible = false"><div class="modal-container" style="width:auto;max-width:440px;min-width:360px"><div class="drawer-header"><span style="font-weight:600">中止原因 — {{ statusPickerCandidate?.name }}</span><button class="btn-default btn-sm" @click="abnormalReasonVisible = false">✕</button></div><div class="drawer-body"><div class="form-item"><label>中止原因</label><textarea class="input" v-model="abnormalReasonText" rows="3" placeholder="请说明中止原因..." style="width:100%"></textarea></div></div><div class="drawer-footer"><button class="btn" @click="abnormalReasonVisible = false">取消</button><button class="btn btn-primary" @click="confirmAbnormal">确认中止</button></div></div></div>

    <div v-if="scoreSettingsVisible" class="drawer-overlay" @click.self="scoreSettingsVisible = false">
      <div class="drawer-container" style="width:560px"><div class="drawer-header"><span style="font-weight:600">成绩设置</span><button class="btn-default btn-sm" @click="scoreSettingsVisible = false">✕</button></div>
      <div class="drawer-body">
        <div class="inner-tabs mb-4" style="width:fit-content"><div class="tab-item" :class="{active:scoreSettingTab==='rule'}" @click="scoreSettingTab='rule'">总分规则</div><div class="tab-item" :class="{active:scoreSettingTab==='pass'}" @click="scoreSettingTab='pass'">通过标准</div></div>
        <template v-if="scoreSettingTab === 'rule'">
          <div class="mb-4"><label><input type="radio" v-model="scoreRuleMode" value="weighted"> 加权合计（所有考站得分按照权重加权后合计总分）</label></div>
          <div class="mb-4"><label><input type="radio" v-model="scoreRuleMode" value="sum"> 不加权合计（所有考站分数合计总分，不加权）</label></div>
          <div v-if="scoreRuleMode === 'weighted'" class="mb-4"><div v-for="sn in scoreActiveStations" :key="sn" class="flex items-center gap-2 mb-2"><span style="width:140px;font-size:13px">{{ sn }}</span><input class="input" type="number" v-model.number="scoreWeights[sn]" min="0" max="100" style="width:80px"><span style="font-size:12px;color:var(--text-secondary)">%</span></div><p class="text-sm" :style="{color:scoreWeightSum===100?'var(--success)':'var(--error)'}">权重之和：{{ scoreWeightSum }}% {{ scoreWeightSum===100 ? '✓' : '（应等于100%）' }}</p></div>
        </template>
        <template v-if="scoreSettingTab === 'pass'">
          <h4 style="margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--border-light)">各考站合格线分值设置</h4>
          <div v-for="sn in scoreActiveStations" :key="sn" class="flex items-center gap-2 mb-2"><span style="width:140px;font-size:13px">{{ sn }}</span><input class="input" type="number" v-model.number="stationPassScores[sn]" min="0" max="100" style="width:80px"><span style="font-size:12px;color:var(--text-secondary)">分</span></div>
          <h4 style="margin:20px 0 12px;padding-bottom:8px;border-bottom:1px solid var(--border-light)">整体考核通过标准</h4>
          <div class="form-item mb-3">
            <div class="flex items-center gap-2 mb-2"><input type="checkbox" v-model="passScoreEnabled"><span style="font-weight:500">条件一：总分达到合格线</span></div>
            <div v-if="passScoreEnabled" style="margin-left:24px"><input class="input" type="number" v-model.number="passScore" min="0" style="width:120px"><span style="font-size:12px;color:var(--text-secondary)"> 分，低于此分数视为不通过</span></div>
          </div>
          <div class="form-item">
            <div class="flex items-center gap-2 mb-2"><input type="checkbox" v-model="minFailedEnabled"><span style="font-weight:500">条件二：必须合格的考站</span></div>
            <div v-if="minFailedEnabled" style="margin-left:24px">
              <div class="mb-3"><label><input type="radio" v-model="condition2Mode" value="fixed"> ○以下考站必须达到合格线：</label><div class="flex flex-wrap gap-2 mt-2 ml-4" v-if="condition2Mode === 'fixed'"><label v-for="sn in scoreActiveStations" :key="sn" class="flex items-center gap-1" style="font-size:13px"><input type="checkbox" :checked="requiredStations.includes(sn)" @change="toggleRequiredStation(sn)">{{ sn.replace(/^.{2}-/,'') }}</label></div></div>
              <div class="mb-2"><label><input type="radio" v-model="condition2Mode" value="count"> ○至少有 <select class="select" v-model="minPassedStations" style="width:auto;margin:0 4px"><option :value="0">不限</option><option v-for="n in scoreActiveStations.length" :key="n" :value="n">{{ n }}</option></select> 个考站达到合格线</label></div>
            </div>
          </div>
        </template>
      </div>
      <div class="drawer-footer"><button class="btn" @click="scoreSettingsVisible = false">取消</button><button class="btn btn-primary" @click="saveScoreSettings">保存</button></div></div>
    </div>

    <div v-if="scoreDetailVisible" class="drawer-overlay" @click.self="scoreDetailVisible = false">
      <div class="drawer-container" style="width:760px"><div class="drawer-header"><span style="font-weight:600">评分详情 — {{ scoreDetailCandidate?.candidate_name }}</span><button class="btn-default btn-sm" @click="scoreDetailVisible = false">✕</button></div>
      <div class="drawer-body">
        <div class="station-sheet-tabs mb-4"><div v-for="sn in scoreDetailStations" :key="sn" class="station-sheet-tab" :class="{ active: scoreDetailActiveStation === sn }" @click="scoreDetailActiveStation = sn">{{ sn }}</div></div>
        <div v-if="scoreDetailActiveStation"><div v-for="(table, ti) in scoreDetailSheetTables" :key="ti" class="mb-4"><h5 style="margin-bottom:8px;color:var(--text-secondary)">评分表{{ ti+1 }}：{{ table.name }}</h5><div class="score-compare-table-wrap"><table class="score-table"><thead><tr><th>评分点</th><th style="text-align:center">满分</th><th style="text-align:center">权重</th><th v-for="ex in scoreDetailExaminerNames" :key="ex" style="text-align:center">{{ ex }}</th></tr></thead><tbody><tr v-for="pt in scoreDetailPoints" :key="pt.id"><td>{{ pt.item }}</td><td style="text-align:center">{{ pt.full_score }}</td><td style="text-align:center">{{ pt.weight }}%</td><td v-for="(s, ei) in pt.scores" :key="ei" style="text-align:center;font-weight:600" :style="{color: s >= 0 ? 'var(--text-main)' : 'var(--text-tertiary)'}">{{ s >= 0 ? s : '-' }}</td></tr></tbody></table></div></div></div>
      </div></div>
    </div>

    <div v-if="aiReportVisible" class="drawer-overlay" @click.self="aiReportVisible = false"><div class="drawer-container" style="width:560px"><div class="drawer-header"><span style="font-weight:600">AI成绩报告 - {{ aiReportCandidate?.candidate_name }}</span><button class="btn-default btn-sm" @click="aiReportVisible = false">✕</button></div><div class="drawer-body"><div class="score-detail-summary mb-4"><div class="score-detail-info"><div><span class="text-secondary">考生：</span>{{ aiReportCandidate?.candidate_name }}</div><div><span class="text-secondary">总分：</span><strong :style="{color:aiReportCandidate?.passed?'var(--success)':'var(--error)'}">{{ aiReportCandidate?.total_score }}分</strong></div></div><div class="score-detail-total"><div class="score-detail-big-num" :style="{color: aiReportCandidate?.passed ? 'var(--success)' : 'var(--error)'}">{{ aiReportCandidate?.passed ? '通过' : '未通过' }}</div></div></div><h4 style="margin-bottom:8px">🤖 AI综合评语</h4><div class="ai-report-text">{{ aiReportText }}</div><h4 style="margin:16px 0 8px">📊 能力雷达示意</h4><div class="ai-report-radar"><div class="radar-row" v-for="dim in aiRadarData" :key="dim.name"><span class="radar-label">{{ dim.name }}</span><div class="radar-bar-wrap"><div class="radar-bar-fill" :style="{width:dim.score+'%',background:dim.score>=60?'var(--success)':'var(--error)'}"></div></div><span class="radar-score">{{ dim.score }}</span></div></div><h4 style="margin:16px 0 8px">考站得分概述</h4><div v-for="st in aiReportCandidate?.stations" :key="st.name" class="ai-station-summary"><div class="flex justify-between items-center"><span style="font-weight:500">{{ st.name }}</span><span :style="{color: (st.score/st.full_score>=0.6)?'var(--success)':'var(--error)'}">{{ st.score }}/{{ st.full_score }}</span></div></div></div></div></div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import dayjs from 'dayjs'

const props = defineProps({
  examData: Object
})

const exam = ref(props.examData || {})
const activeTab = ref('monitor')
const monitorPanel = ref('station')
const monitorMajor = ref('内科')

const goBack = () => {
  if (window.openPage) window.openPage({ id: 'exam-records', label: '考核记录' })
}

const candidateNames = ['张明','李华','王芳','赵强','刘洋','陈静','杨磊','吴婷','周杰','黄丽','林伟','孙悦','郑鑫','唐磊','沈洁','韩冰','秦雪','顾磊','乔羽','陆峰','宋阳','苏婷','梁浩','何静']
const phones = ['13800001111','13800002222','13800003333','13800004444','13800005555','13800006666','13800007777','13800008888','13800009999','13800001000','13900001111','13900002222','13900003333','13900004444','13900005555','13900006666','13900007777','13900008888','13900009999','13900001000','13700001111','13700002222','13700003333','13700004444']
const grades = ['2023级','2024级','2025级']
const gradeOptions = ['2023级','2024级','2025级']
const stationTypes = ['接诊站','病例分析站','病历书写站','人文沟通站','体格检查站','病史采集站','沟通站']
const caseTitles = ['肾病综合征','阑尾炎','糖尿病','高血压','心梗','肺炎']
const examItems = ['病史采集','体格检查','诊断','病历书写','病例分析','人文沟通']

const stationStatusMap = { pending:'待考', in_progress:'考试中', paused:'暂停', completed:'已完成', abnormal:'中止' }
const stationBadge = { pending:'badge-warning', in_progress:'badge-info', paused:'badge-warning', completed:'badge-success', abnormal:'badge-error' }

const majorStationMap = {
  '内科': ['内科-接诊站','内科-病例分析站','内科-病历书写站','内科-人文沟通站'],
  '儿科': ['儿科-病史采集站','儿科-体格检查站','儿科-病历书写站','儿科-人文沟通站']
}

const studentCount = exam.value.candidate_count || 20
const candidateTotal = studentCount + 55
const examMajors = ref(['内科','儿科'])
const allStationNames = ref([])
const lastRefresh = ref(dayjs().format('HH:mm:ss'))
const passScore = ref(60)
const stationPassScores = ref({})
const passScoreEnabled = ref(true)
const minFailedEnabled = ref(false)
const requiredStations = ref([])
const minPassedStations = ref(1)
const condition2Mode = ref('fixed')

const toggleRequiredStation = (sn) => {
  const idx = requiredStations.value.indexOf(sn)
  if (idx >= 0) requiredStations.value.splice(idx, 1)
  else requiredStations.value.push(sn)
}

onMounted(() => {
  const names = []
  examMajors.value.forEach(m => { (majorStationMap[m]||[]).forEach(s => names.push(s)) })
  allStationNames.value = names
  const sps = {}
  names.forEach(s => { sps[s] = 60 })
  stationPassScores.value = sps
  const w = {}
  examMajors.value.forEach(m => {
    const sts = majorStationMap[m] || []
    sts.forEach(s => { w[s] = Math.round(100 / sts.length) })
  })
  scoreWeights.value = w
})

const changePanel = (p) => { monitorPanel.value = p }
const activeMajorStations = computed(() => monitorMajor.value ? (majorStationMap[monitorMajor.value] || []) : [])
const majorCounts = computed(() => {
  const counts = {}
  examMajors.value.forEach(m => { counts[m] = monitorCandidates.value.filter(c => c.major === m).length })
  return counts
})

const stationTimeType = ref('')
const stationCards = computed(() => {
  const majorStations = majorStationMap[monitorMajor.value] || []
  return majorStations.map((sn, si) => {
    let inProgress = 0, completed = 0, pending = 0, abnormal = 0, paused = 0
    monitorCandidates.value.forEach(c => {
      const st = c.stations.find(s => s.name === sn)
      if (!st) return
      if (st.status === 'in_progress') inProgress++
      else if (st.status === 'paused') paused++
      else if (st.status === 'completed') completed++
      else if (st.status === 'pending') pending++
      else if (st.status === 'abnormal') abnormal++
    })
    const startDate = dayjs().subtract(5 + si, 'day').format('YYYY-MM-DD HH:mm')
    const endDate = dayjs().subtract(5 + si, 'day').add(2, 'hour').format('YYYY-MM-DD HH:mm')
    return {
      name: sn,
      major: monitorMajor.value,
      stationType: stationTypes[si % stationTypes.length],
      caseInfo: `${caseTitles[si % caseTitles.length]} (C-${String(si+1).padStart(3,'0')})`,
      startTime: startDate,
      endTime: endDate,
      inProgress, paused, completed, pending, abnormal,
      spDeviceCount: Math.floor(Math.random() * 4) + 1,
      exDeviceCount: Math.floor(Math.random() * 3) + 1
    }
  })
})

const generateCandidates = () => {
  const shuffled = [...candidateNames].sort(() => Math.random() - 0.5)
  const examinerPool = ['王考官','李考官','赵考官','陈考官','刘考官']
  const devicePool = ['SP平板-01','SP平板-02','SP平板-03','考官平板-01','考官平板-02']
  return Array.from({ length: candidateTotal }, (_, i) => {
    const major = examMajors.value[Math.floor(Math.random() * examMajors.value.length)]
    const stations = majorStationMap[major] || []
    const personStations = stations.map(sn => {
      let status
      const r = Math.random()
      if (r < 0.30) status = 'completed'
      else if (r < 0.48) status = 'in_progress'
      else if (r < 0.58) status = 'paused'
      else if (r < 0.75) status = 'pending'
      else status = 'abnormal'
      return {
        name: sn,
        status,
        elapsed: status === 'completed' ? `${15+Math.floor(Math.random()*30)}min` : status === 'in_progress' ? `${5+Math.floor(Math.random()*20)}min` : status === 'paused' ? `${8+Math.floor(Math.random()*15)}min` : '-',
        reason: status === 'abnormal' ? ['设备故障','考生弃考','作弊嫌疑','超时未完成'][Math.floor(Math.random()*4)] : ''
      }
    })
    return {
      id: `c_${i}`,
      name: shuffled[i % shuffled.length] + (i >= shuffled.length ? (i - shuffled.length + 1) : ''),
      phone: phones[i % phones.length],
      major,
      grade: grades[Math.floor(Math.random() * grades.length)],
      scoring_examiner: examinerPool[Math.floor(Math.random() * examinerPool.length)],
      device: devicePool[Math.floor(Math.random() * devicePool.length)],
      stations: personStations
    }
  })
}

const monitorCandidates = ref(generateCandidates())

const stationBadgeClass = (s) => stationBadge[s] || ''

const candidateKeyword = ref('')
const candidateGradeFilter = ref('')
const candidatePage = ref(1)
const candidatePageSize = ref(10)

const filteredCandidates = computed(() => {
  let data = monitorCandidates.value.filter(c => c.major === monitorMajor.value)
  const kw = candidateKeyword.value.toLowerCase()
  if (kw) data = data.filter(c => c.name.toLowerCase().includes(kw) || c.phone.includes(kw))
  if (candidateGradeFilter.value) data = data.filter(c => c.grade === candidateGradeFilter.value)
  return data
})

const candidateTotalPages = computed(() => Math.ceil(filteredCandidates.value.length / candidatePageSize.value) || 1)

const candidatePageData = computed(() => {
  const s = (candidatePage.value - 1) * candidatePageSize.value
  return filteredCandidates.value.slice(s, s + candidatePageSize.value)
})

const statusPickerVisible = ref(false)
const statusPickerCandidate = ref(null)
const statusPickerStation = ref(null)

const openStatusPicker = (c, st) => {
  statusPickerCandidate.value = c
  statusPickerStation.value = st
  statusPickerVisible.value = true
}

const applyStatus = (newStatus) => {
  if (statusPickerStation.value) statusPickerStation.value.status = newStatus
  statusPickerVisible.value = false
}

const preAbnormal = () => {
  abnormalReasonText.value = ''
  abnormalReasonVisible.value = true
}

const abnormalReasonVisible = ref(false)
const abnormalReasonText = ref('')

const confirmAbnormal = () => {
  if (statusPickerStation.value) {
    statusPickerStation.value.status = 'abnormal'
    statusPickerStation.value.reason = abnormalReasonText.value || '未说明'
  }
  abnormalReasonVisible.value = false
  statusPickerVisible.value = false
}

const nameListVisible = ref(false)
const nameListFull = ref([])
const nameListTitle = ref('')
const nameListStatusLabel = ref('')
const nameListIsAbnormal = ref(false)
const nameListPage = ref(1)
const nameListPageSize = ref(10)

const nameListTotalPages = computed(() => Math.ceil(nameListFull.value.length / nameListPageSize.value) || 1)

const nameListPageData = computed(() => {
  const s = (nameListPage.value - 1) * nameListPageSize.value
  return nameListFull.value.slice(s, s + nameListPageSize.value)
})

const openNameList = (stationName, statusKey) => {
  const data = []
  monitorCandidates.value.forEach(c => {
    const st = c.stations.find(s => s.name === stationName)
    if (st && st.status === statusKey) {
      const entry = { name: c.name, phone: c.phone, major: c.major, grade: c.grade, examiner: c.scoring_examiner, device: c.device, _cid: c.id, _sname: stationName }
      if (statusKey === 'abnormal') entry.reason = st.reason
      data.push(entry)
    }
  })
  nameListFull.value = data
  nameListTitle.value = stationName
  nameListIsAbnormal.value = (statusKey === 'abnormal')
  nameListStatusLabel.value = { in_progress:'考试中', completed:'已考', pending:'待考', abnormal:'中止' }[statusKey] || statusKey
  nameListPage.value = 1
  nameListVisible.value = true
}

const nlPause = (n) => {
  const c = monitorCandidates.value.find(x => x.id === n._cid)
  if (c) {
    const st = c.stations.find(s => s.name === n._sname)
    if (st) st.status = 'paused'
  }
}

const nlAbort = (n) => {
  const c = monitorCandidates.value.find(x => x.id === n._cid)
  if (c) {
    const st = c.stations.find(s => s.name === n._sname)
    if (st) { st.status = 'abnormal'; st.reason = '手动中止' }
  }
}

const deviceListVisible = ref(false)
const deviceListData = ref([])
const deviceListTitle = ref('')
const deviceListTypeLabel = ref('')
const deviceListType = ref('SP')

const openDeviceList = (stationName, type) => {
  const count = type === 'SP' ? (2 + Math.floor(Math.random() * 3)) : (1 + Math.floor(Math.random() * 2))
  const data = []
  const spPrefix = type === 'SP' ? 'SP平板' : '考官平板'
  const accountBase = type === 'SP' ? 'sp_user' : 'examiner'
  const userStatuses = ['等待确认','等待确认','答题中','答题中','答题中']
  for (let i = 0; i < count; i++) {
    const itemCount = 1 + Math.floor(Math.random() * 3)
    const shuffledItems = [...examItems].sort(() => Math.random() - 0.5)
    data.push({
      id: `d_${type}_${stationName}_${i}`,
      device_name: `${spPrefix}-${String(i+1).padStart(2,'0')}`,
      account: `${accountBase}_${String(i+1).padStart(2,'0')}`,
      user: candidateNames[Math.floor(Math.random() * candidateNames.length)],
      userStatus: type === 'SP' ? userStatuses[Math.floor(Math.random() * userStatuses.length)] : '',
      examItems: type === 'SP' ? shuffledItems.slice(0, itemCount).join('、') : '',
      ip: `192.168.${type==='SP'?'1':'2'}.${100+i}`,
      online: Math.random() > 0.1
    })
  }
  deviceListData.value = data
  deviceListTitle.value = stationName
  deviceListTypeLabel.value = type === 'SP' ? '考生端' : '考官端'
  deviceListType.value = type
  deviceListVisible.value = true
}

const examinerPhones = ['18900001111','18900002222','18900003333','18900004444','18900005555','18900006666']
const examiners = ref([
  { id: 'ex_1', name: '王考官', phone: examinerPhones[0], logged_in: true, device: '考官平板-01', station: '内科-接诊站', scoring_target: '张明', scored_count: 12 },
  { id: 'ex_2', name: '李考官', phone: examinerPhones[1], logged_in: true, device: '考官平板-02', station: '内科-病例分析站', scoring_target: '李华', scored_count: 8 },
  { id: 'ex_3', name: '赵考官', phone: examinerPhones[2], logged_in: true, device: '考官平板-03', station: '儿科-体格检查站', scoring_target: '王芳', scored_count: 15 },
  { id: 'ex_4', name: '陈考官', phone: examinerPhones[3], logged_in: false, device: '-', station: '-', scoring_target: '-', scored_count: 0 },
  { id: 'ex_5', name: '刘考官', phone: examinerPhones[4], logged_in: true, device: '考官平板-04', station: '儿科-病历书写站', scoring_target: '赵强', scored_count: 6 },
  { id: 'ex_6', name: 'AI评分系统', phone: examinerPhones[5], logged_in: true, device: '服务器-AI-01', station: '全部考站', scoring_target: '自动评分', scored_count: 45 }
])

const examinerKeyword = ref('')
const examinerStationFilter = ref('')
const examinerStatusFilter = ref('')

const filteredExaminers = computed(() => {
  let data = examiners.value
  const kw = examinerKeyword.value.toLowerCase()
  if (kw) data = data.filter(ex => ex.name.toLowerCase().includes(kw) || ex.phone.includes(kw))
  if (examinerStationFilter.value) data = data.filter(ex => ex.station === examinerStationFilter.value)
  if (examinerStatusFilter.value === 'logged_in') data = data.filter(ex => ex.logged_in)
  else if (examinerStatusFilter.value === 'not_logged') data = data.filter(ex => !ex.logged_in)
  return data
})

const examinerSearch = () => {
  examinerKeyword.value = examinerKeyword.value.trim()
}
const examinerReset = () => {
  examinerKeyword.value = ''
  examinerStationFilter.value = ''
  examinerStatusFilter.value = ''
}

const examinerScoreVisible = ref(false)
const examinerScoreData = ref([])
const examinerScoreTitle = ref('')

const openExaminerScoreList = (ex) => {
  const shuffled = [...candidateNames].sort(() => Math.random() - 0.5)
  const data = []
  for (let i = 0; i < Math.min(ex.scored_count, 15); i++) {
    const sc = 1 + Math.floor(Math.random() * 3)
    for (let j = 0; j < sc; j++) {
      data.push({
        name: shuffled[i],
        phone: phones[Math.floor(Math.random() * phones.length)],
        station: ex.station === '全部考站' ? allStationNames.value[Math.floor(Math.random() * allStationNames.value.length)] : ex.station,
        totalScore: Math.round(Math.random() * 100),
        submitTime: dayjs().subtract(Math.floor(Math.random() * 120), 'minute').format('HH:mm:ss')
      })
    }
  }
  examinerScoreData.value = data
  examinerScoreTitle.value = ex.name
  examinerScoreVisible.value = true
}

const scoreActiveMajor = ref('内科')
const scoreMajorList = computed(() => examMajors.value)
const scorePage = ref(1)
const scorePageSize = ref(10)
const scoreKeyword = ref('')
const scorePassFilter = ref('')
const scoreRuleMode = ref('weighted')
const scoreWeights = ref({})

const scoreWeightSum = computed(() => {
  let s = 0
  Object.values(scoreWeights.value).forEach(v => s += (v||0))
  return Math.round(s)
})

const scoreActiveStations = computed(() => scoreActiveMajor.value ? (majorStationMap[scoreActiveMajor.value] || []) : [])

const sortKey = ref('')
const sortDir = ref('asc')

const toggleSort = (key, sub) => {
  const k = sub ? `${key}_${sub}` : key
  if (sortKey.value === k) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else { sortKey.value = k; sortDir.value = 'asc' }
}

const sortIcon = (key, sub) => {
  const k = sub ? `${key}_${sub}` : key
  return sortKey.value === k ? (sortDir.value === 'asc' ? '↑' : '↓') : ''
}

const generateScores = () => {
  const data = []
  examMajors.value.forEach(major => {
    const majorStations = majorStationMap[major] || []
    const shuffled = [...candidateNames].sort(() => Math.random() - 0.5)
    for (let i = 0; i < 12 + Math.floor(Math.random() * 16); i++) {
      const personStations = []
      let total = 0
      for (const st of majorStations) {
        const full = 100
        const score = Math.round(Math.random() * 100)
        total += score
        personStations.push({ name: st, score, full_score: full })
      }
      const avg = Math.round(total / majorStations.length)
      data.push({
        id: `s_${major}_${i}`,
        candidate_name: shuffled[i % shuffled.length] + (i >= shuffled.length ? (i - shuffled.length + 1) : ''),
        phone: phones[(i + major.length) % phones.length],
        major,
        grade: grades[Math.floor(Math.random() * grades.length)],
        total_score: avg,
        passed: avg >= passScore.value,
        stations: personStations
      })
    }
  })
  return data
}

const scoreData = ref(generateScores())

const scoreFilteredList = computed(() => {
  let data = scoreActiveMajor.value ? scoreData.value.filter(s => s.major === scoreActiveMajor.value) : []
  if (scoreKeyword.value) { const kw = scoreKeyword.value.toLowerCase(); data = data.filter(s => s.candidate_name.includes(kw) || s.phone.includes(kw)) }
  if (scorePassFilter.value === 'pass') data = data.filter(s => s.passed)
  else if (scorePassFilter.value === 'fail') data = data.filter(s => !s.passed)
  return data
})

const scoreTotalPages = computed(() => Math.ceil(scoreFilteredList.value.length / scorePageSize.value) || 1)

const scorePageData = computed(() => {
  const s = (scorePage.value - 1) * scorePageSize.value
  return scoreFilteredList.value.slice(s, s + scorePageSize.value)
})

const scoreTotalByRule = (s) => {
  if (scoreRuleMode.value === 'weighted') {
    let total = 0
    s.stations.forEach(st => { total += st.score * (scoreWeights.value[st.name] || 0) / 100 })
    return Math.round(total)
  }
  return s.total_score
}

const sortedScorePageData = computed(() => {
  let data = [...scorePageData.value]
  if (!sortKey.value) return data
  const dir = sortDir.value === 'asc' ? 1 : -1
  const key = sortKey.value
  if (key === 'index') return dir === 1 ? data : data.reverse()
  if (key === 'name') return data.sort((a,b) => dir * a.candidate_name.localeCompare(b.candidate_name))
  if (key === 'total') return data.sort((a,b) => dir * (scoreTotalByRule(a) - scoreTotalByRule(b)))
  if (key === 'pass') return data.sort((a,b) => dir * ((a.passed ? 1 : 0) - (b.passed ? 1 : 0)))
  if (key.startsWith('station_')) {
    const sn = key.replace('station_','')
    return data.sort((a,b) => {
      const sa = a.stations.find(st=>st.name===sn)
      const sb = b.stations.find(st=>st.name===sn)
      return dir * ((sa?.score||0) - (sb?.score||0))
    })
  }
  return data
})

const currentScoreStats = computed(() => {
  const base = scoreFilteredList.value
  const scores = base.map(s => scoreTotalByRule(s))
  if (scores.length === 0) return { passRate: '0%', avg: 0, max: 0, min: 0 }
  const passed = base.filter((s, i) => scores[i] >= passScore.value).length
  return {
    passRate: Math.round(passed / scores.length * 100) + '%',
    avg: Math.round(scores.reduce((a,b)=>a+b,0) / scores.length),
    max: Math.max(...scores),
    min: Math.min(...scores)
  }
})

const scoreSettingsVisible = ref(false)
const scoreSettingTab = ref('rule')

const openScoreSettings = () => { scoreSettingsVisible.value = true }

const saveScoreSettings = () => {
  scoreData.value.forEach(s => {
    const total = scoreTotalByRule(s)
    let passed = true
    if (passScoreEnabled.value && total < passScore.value) passed = false
    if (minFailedEnabled.value) {
      if (condition2Mode.value === 'fixed' && requiredStations.value.length > 0) {
        const allRequiredPassed = requiredStations.value.every(sn => {
          const st = s.stations.find(x => x.name === sn)
          return st && st.score >= (stationPassScores.value[sn] || 60)
        })
        if (!allRequiredPassed) passed = false
      }
      if (condition2Mode.value === 'count' && minPassedStations.value > 0) {
        const passedCount = s.stations.filter(st => st.score >= (stationPassScores.value[st.name] || 60)).length
        if (passedCount < minPassedStations.value) passed = false
      }
    }
    s.passed = passed
    s.total_score = total
  })
  scoreSettingsVisible.value = false
}

const scoreDetailVisible = ref(false)
const scoreDetailCandidate = ref(null)
const scoreDetailExaminerNames = ref(['王考官','李考官','赵考官','AI评分'])

const scoreDetailStations = computed(() => scoreDetailCandidate.value?.stations.map(s => s.name) || [])

const scoreDetailActiveStation = ref('')
const scoreDetailPoints = ref([])

const scoreDetailSheetTables = computed(() => {
  if (!scoreDetailActiveStation.value) return []
  const tableCount = 1 + Math.floor(Math.random() * 2)
  return Array.from({ length: tableCount }, (_, ti) => ({ name: ['操作评分','综合评分'][ti % 2] }))
})

const openScoreDetailDrawer = (s) => {
  scoreDetailCandidate.value = s
  scoreDetailActiveStation.value = s.stations.length ? s.stations[0].name : ''
  scoreDetailVisible.value = true
}

watch(scoreDetailActiveStation, (sn) => {
  if (!sn || !scoreDetailCandidate.value) { scoreDetailPoints.value = [] ; return }
  const scoringItems = ['问诊技巧','信息收集','沟通能力','体格检查手法','检查全面性','诊断逻辑','鉴别能力','治疗方案','人文关怀','应急处置']
  const points = []
  const exCount = scoreDetailExaminerNames.value.length
  for (let j = 0; j < (3 + Math.floor(Math.random() * 5)); j++) {
    const full = 10 + Math.floor(Math.random() * 15)
    const scores = []
    for (let ei = 0; ei < exCount; ei++) scores.push(Math.random() > 0.15 ? Math.round(Math.random() * full) : -1)
    const w = [10,15,20,25,30][Math.floor(Math.random()*5)]
    points.push({ id: `pt_${sn}_${j}`, station: sn, item: scoringItems[(points.length) % scoringItems.length], full_score: full, weight: w, scores })
  }
  scoreDetailPoints.value = points
})

const aiReportVisible = ref(false)
const aiReportCandidate = ref(null)

const aiReportText = computed(() => {
  if (!aiReportCandidate.value) return ''
  const c = aiReportCandidate.value
  return c.passed
    ? `该考生在本次考核中表现良好，综合得分${c.total_score}分，达到了通过标准。在${c.stations.map(s=>s.name).join('、')}等考站中展现出扎实的临床基本功和良好的沟通能力。建议进一步加强病例分析和鉴别诊断的深度，提升复杂临床场景下的决策能力。`
    : `该考生在本次考核中得分${c.total_score}分，未能达到通过标准（${passScore.value}分）。主要薄弱环节体现在${c.stations.filter(s=>s.score<passScore.value).map(s=>s.name).join('、') || '部分考站'}。建议针对性地加强问诊技巧训练和临床思维培养。`
})

const aiRadarData = computed(() => {
  const base = aiReportCandidate.value?.passed ? 55 : 35
  return ['问诊能力','体格检查','临床思维','沟通能力','人文关怀','应急处理'].map(n => ({ name: n, score: base + Math.floor(Math.random()*30) }))
})

const viewAIReport = (s) => { aiReportCandidate.value = s; aiReportVisible.value = true }
</script>

<style scoped>
.content-container {
  padding: 24px;
}

.exam-title-inline {
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
}

.inner-tabs {
  display: flex;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  width: fit-content;
  flex-shrink: 0;
}

.tab-item {
  padding: 6px 14px;
  font-size: 13px;
  cursor: pointer;
  color: var(--text-secondary);
  border-right: 1px solid var(--border);
  transition: all 0.15s;
}

.tab-item:last-child {
  border-right: none;
}

.tab-item.active {
  background: var(--primary);
  color: #fff;
}

.tab-item:not(.active):hover {
  background: var(--primary-lightest);
}

.monitor-layout {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.monitor-sidebar {
  width: 140px;
  flex-shrink: 0;
  background: var(--card-bg);
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
  padding: 8px 0;
  position: sticky;
  top: 12px;
}

.monitor-major-item {
  padding: 10px 16px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.1s;
  border-left: 3px solid transparent;
  font-weight: 500;
}

.monitor-major-item:hover {
  background: var(--primary-lightest);
}

.monitor-major-item.active {
  background: var(--primary-light);
  border-left-color: var(--primary);
  color: var(--primary);
  font-weight: 600;
}

.monitor-main {
  flex: 1;
  min-width: 0;
}

.monitor-subtabs {
  display: flex;
  gap: 2px;
}

.monitor-subtab {
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  color: var(--text-secondary);
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
}

.monitor-subtab.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
  font-weight: 600;
}

.monitor-subtab:hover {
  color: var(--text-main);
}

.subtab-count {
  font-size: 11px;
  background: var(--primary-lightest);
  padding: 1px 6px;
  border-radius: 10px;
  margin-left: 4px;
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.table-wrapper {
  overflow-x: auto;
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
  background: #f9fafb;
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
}

.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.badge-info {
  background: #dbeafe;
  color: #1d4ed8;
}

.badge-warning {
  background: #fef3c7;
  color: #92400e;
}

.badge-success {
  background: #d1fae5;
  color: #065f46;
}

.badge-error {
  background: #fee2e2;
  color: #991b1b;
}

.stat-cards-row {
  display: grid;
  gap: 16px;
}

.stat-card {
  background: var(--card-bg);
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
  padding: 16px;
  display: flex;
  gap: 12px;
  align-items: center;
}

.stat-card-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-card-body {
  flex: 1;
}

.stat-card-value {
  font-size: 20px;
  font-weight: 700;
}

.stat-card-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.sortable {
  cursor: pointer;
  user-select: none;
}

.sortable:hover {
  color: var(--primary);
}

.action-link {
  color: var(--primary);
  cursor: pointer;
  font-size: 13px;
  margin-right: 12px;
}

.action-link:hover {
  text-decoration: underline;
}

.name-list-legend span {
  display: inline-block;
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
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.form-item {
  margin-bottom: 16px;
}

.station-sheet-tabs {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.station-sheet-tab {
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;
  border: 1px solid var(--border);
  border-radius: 6px;
  transition: all 0.15s;
}

.station-sheet-tab.active {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}

.score-compare-table-wrap {
  overflow-x: auto;
}

.score-table {
  width: 100%;
  border-collapse: collapse;
}

.score-table th,
.score-table td {
  padding: 8px 10px;
  border: 1px solid var(--border-light);
  font-size: 13px;
}

.score-table th {
  background: #f9fafb;
  font-weight: 600;
}

.score-detail-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
}

.score-detail-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.score-detail-total {
  text-align: right;
}

.score-detail-big-num {
  font-size: 24px;
  font-weight: 700;
}

.ai-report-text {
  font-size: 13px;
  line-height: 1.8;
  color: var(--text-secondary);
  background: #f9fafb;
  padding: 12px 16px;
  border-radius: 8px;
}

.ai-report-radar {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.radar-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.radar-label {
  width: 80px;
  font-size: 13px;
  color: var(--text-secondary);
  text-align: right;
}

.radar-bar-wrap {
  flex: 1;
  height: 12px;
  background: #f3f4f6;
  border-radius: 6px;
  overflow: hidden;
}

.radar-bar-fill {
  height: 100%;
  border-radius: 6px;
  transition: width 0.3s;
}

.radar-score {
  width: 32px;
  font-size: 13px;
  font-weight: 600;
  text-align: left;
}

.ai-station-summary {
  padding: 6px 0;
  border-bottom: 1px solid var(--border-light);
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

.text-primary {
  color: var(--primary);
}

.text-secondary {
  color: var(--text-secondary);
}

.text-sm {
  font-size: 12px;
}

.flex {
  display: flex;
}

.flex-col {
  flex-direction: column;
}

.flex-wrap {
  flex-wrap: wrap;
}

.items-center {
  align-items: center;
}

.justify-between {
  justify-content: space-between;
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

.gap-4 {
  gap: 16px;
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

.mt-2 {
  margin-top: 8px;
}

.mt-3 {
  margin-top: 12px;
}

.mt-4 {
  margin-top: 16px;
}

.ml-2 {
  margin-left: 8px;
}

.ml-4 {
  margin-left: 16px;
}

.px-2 {
  padding-left: 8px;
  padding-right: 8px;
}

.px-3 {
  padding-left: 12px;
  padding-right: 12px;
}

.py-8 {
  padding-top: 32px;
  padding-bottom: 32px;
}

.font-medium {
  font-weight: 500;
}

.text-center {
  text-align: center;
}

.cursor-pointer {
  cursor: pointer;
}
</style>
