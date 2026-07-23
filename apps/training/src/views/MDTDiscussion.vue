<template>
  <div class="mdt-page">
    <!-- 阶段指示器 -->
    <div class="steps-bar">
      <div v-for="(stage, i) in stages" :key="i" class="step-item">
        <div :class="['step-dot', { done: i < currentStage, current: i === currentStage }]">
          {{ i < currentStage ? '✓' : i + 1 }}
        </div>
        <span class="step-label">{{ stage }}</span>
      </div>
      <button class="btn-end-training" @click="$router.push({ name: 'mdtCaseList' })">
        <i class="fa-solid fa-stop"></i> 结束训练
      </button>
    </div>

    <!-- 主体：三栏布局 -->
    <div class="mdt-layout">
      <!-- 左栏：病例信息（分页） -->
      <div class="mdt-sidebar-left">
        <div class="case-info-title"><i class="fa-solid fa-folder-open"></i> 病例信息</div>

        <!-- Tab 导航 -->
        <div class="info-tabs">
          <button v-for="tab in infoTabs" :key="tab.key"
            :class="['info-tab', { active: activeInfoTab === tab.key }]"
            @click="activeInfoTab = tab.key">
            <i :class="tab.icon"></i> {{ tab.label }}
          </button>
        </div>

        <!-- Tab 内容 -->
        <div class="info-tab-content">
          <!-- 基本信息 -->
          <div v-show="activeInfoTab === 'basic'" class="tab-panel">
            <div class="case-info-photo">
              <img v-if="patientAvatar" :src="patientAvatar" class="case-patient-img" />
              <span v-else class="case-info-avatar"><i class="fa-solid fa-user"></i></span>
            </div>
            <div class="case-info-name">{{ caseInfo.patientName }}</div>
            <div class="case-info-row">
              <span class="case-info-id">{{ caseInfo.caseId }}</span>
              <span class="case-info-diff" :class="'diff-' + (caseInfo.difficulty[0] || 'R')">{{ caseInfo.difficulty }}</span>
            </div>
            <div class="case-info-meta-grid">
              <div class="meta-item"><span class="meta-label">性别</span><span class="meta-value">{{ caseInfo.gender }}</span></div>
              <div class="meta-item"><span class="meta-label">年龄</span><span class="meta-value">{{ caseInfo.age }}岁</span></div>
              <div class="meta-item"><span class="meta-label">科室</span><span class="meta-value">{{ caseInfo.specialty }}</span></div>
              <div class="meta-item"><span class="meta-label">入院日期</span><span class="meta-value">{{ caseInfo.admissionDate }}</span></div>
            </div>
            <div class="case-section">
              <div class="case-section-label">主诉</div>
              <div class="case-section-text">{{ caseInfo.chiefComplaint }}</div>
            </div>
            <div class="case-section case-features-box">
              <div class="case-section-label"><i class="fa-solid fa-list-check"></i> 病例特点</div>
              <ul class="features-list">
                <li v-for="(f, i) in caseFeatures" :key="i">{{ f }}</li>
              </ul>
            </div>
          </div>

          <!-- 病史资料 -->
          <div v-show="activeInfoTab === 'history'" class="tab-panel">
            <div class="case-section">
              <div class="case-section-label">现病史</div>
              <div class="case-section-text">{{ caseInfo.presentIllness }}</div>
            </div>
            <div class="case-section">
              <div class="case-section-label">体格检查</div>
              <div class="case-section-text">{{ caseInfo.physicalExam }}</div>
            </div>
            <div class="case-section case-two-col">
              <div class="case-col">
                <div class="case-section-label">既往史</div>
                <div class="case-section-text">{{ caseInfo.pastHistory }}</div>
              </div>
              <div class="case-col">
                <div class="case-section-label">个人史</div>
                <div class="case-section-text">{{ caseInfo.personalHistory }}</div>
              </div>
            </div>
            <div class="case-section">
              <div class="case-section-label">家族史</div>
              <div class="case-section-text">{{ caseInfo.familyHistory }}</div>
            </div>
          </div>

          <!-- 检查报告 -->
          <div v-show="activeInfoTab === 'reports'" class="tab-panel">
            <div class="case-section">
              <div class="case-section-label"><i class="fa-solid fa-flask"></i> 实验室检查</div>
              <div class="case-lab-table">
                <div class="case-vital-row" v-for="v in caseInfo.vitals" :key="v.label">
                  <span class="case-vital-label">{{ v.label }}</span>
                  <span class="case-vital-value" :class="{ abnormal: v.abnormal }">{{ v.value }}</span>
                </div>
              </div>
            </div>
            <div class="case-section">
              <div class="case-section-label"><i class="fa-solid fa-x-ray"></i> 影像检查</div>
              <div class="imaging-cards">
                <div v-for="img in imagingReports" :key="img.label" class="imaging-card">
                  <div class="imaging-thumb" :style="{ background: img.bg }">
                    <i :class="img.icon"></i>
                    <span class="imaging-modality">{{ img.modality }}</span>
                  </div>
                  <div class="imaging-info">
                    <div class="imaging-label">{{ img.label }}</div>
                    <div class="imaging-summary">{{ img.summary }}</div>
                  </div>
                </div>
              </div>
            </div>
            <div class="case-section">
              <div class="case-section-label"><i class="fa-solid fa-microscope"></i> 病理检查</div>
              <div class="case-section-text">{{ caseInfo.pathology }}</div>
            </div>
          </div>

          <!-- MDT议题 -->
          <div v-show="activeInfoTab === 'mdt'" class="tab-panel">
            <div class="case-section mdt-question-box">
              <div class="case-section-label"><i class="fa-solid fa-circle-question"></i> 本次MDT核心议题</div>
              <div class="case-section-text" style="font-weight:500;color:#1f2937;">{{ caseInfo.mdtQuestion }}</div>
            </div>
            <div class="case-section" style="margin-top:16px;">
              <div class="case-section-label"><i class="fa-solid fa-list-ol"></i> 讨论问题列表</div>
              <div class="mdt-question-list">
                <div v-for="q in mdtQuestions" :key="q.id" class="mdt-question-item">
                  <span class="mdt-q-num">Q{{ q.id }}</span>
                  <span class="mdt-q-text">{{ q.text }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 中栏：对话流 + 输入栏 -->
      <div class="mdt-center">
        <div class="mdt-main" ref="discussionRef">
          <template v-for="(item, i) in chatItems" :key="i">
            <!-- 专家消息 -->
            <div v-if="item.type === 'expert'" class="mdt-msg">
              <div :class="['mdt-msg-avatar', item.avatarClass]">
                <img v-if="avatarMap[item.initials]" :src="avatarMap[item.initials]" class="avatar-img" />
                <span v-else>{{ item.initials }}</span>
              </div>
              <div class="mdt-msg-body">
                <div class="mdt-msg-sender">{{ item.sender }}</div>
                <div class="mdt-msg-text">{{ item.text }}</div>
              </div>
            </div>

            <!-- 学员发言 -->
            <div v-else-if="item.type === 'student'" class="mdt-msg student-msg">
              <div class="mdt-msg-body" style="text-align:right;">
                <div class="mdt-msg-sender" style="color:#409EFF;">你</div>
                <div class="mdt-msg-text student-text">{{ item.text }}</div>
              </div>
              <div class="mdt-msg-avatar student-avatar-msg">
                <img v-if="learnerAvatar" :src="learnerAvatar" class="avatar-img" />
                <span v-else>👤</span>
              </div>
            </div>

            <!-- 紧凑卡片：初步诊断 -->
            <div v-else-if="item.type === 'diagnosis-card'" class="chat-card" @click="openCard('diagnosis')">
              <div class="chat-card-icon" style="background:#eff6ff;color:#409EFF;"><i class="fa-solid fa-stethoscope"></i></div>
              <div class="chat-card-body">
                <div class="chat-card-title">初步诊断印象</div>
                <div class="chat-card-meta" v-if="diagnosisSubmitted">{{ studentDiagnosis.substring(0, 60) }}...</div>
                <div class="chat-card-meta" v-else>待完成 — 点击打开</div>
              </div>
              <div class="chat-card-status" v-if="diagnosisSubmitted"><i class="fa-solid fa-circle-check" style="color:#10b981;"></i></div>
              <div class="chat-card-status" v-else><i class="fa-solid fa-chevron-right" style="color:#9ca3af;"></i></div>
            </div>

            <!-- 紧凑卡片：影像标注 -->
            <div v-else-if="item.type === 'imaging-card'" class="chat-card" @click="openCard('imaging')">
              <div class="chat-card-icon" style="background:#fef3c7;color:#d97706;"><i class="fa-solid fa-x-ray"></i></div>
              <div class="chat-card-body">
                <div class="chat-card-title">影像解读 — CT标注</div>
                <div class="chat-card-meta" v-if="annotationSubmitted">已标注 {{ markers.length }} 处异常 · 识别率 33%</div>
                <div class="chat-card-meta" v-else>待完成 — 点击打开</div>
              </div>
              <div class="chat-card-status" v-if="annotationSubmitted"><i class="fa-solid fa-circle-check" style="color:#10b981;"></i></div>
              <div class="chat-card-status" v-else><i class="fa-solid fa-chevron-right" style="color:#9ca3af;"></i></div>
            </div>

            <!-- 紧凑卡片：投票 -->
            <div v-else-if="item.type === 'vote-card'" class="chat-card" @click="openCard('vote')">
              <div class="chat-card-icon" style="background:#f0fdf4;color:#059669;"><i class="fa-solid fa-square-poll-vertical"></i></div>
              <div class="chat-card-body">
                <div class="chat-card-title">治疗方向投票</div>
                <div class="chat-card-meta" v-if="studentVote">{{ studentVote.substring(0, 50) }}...</div>
                <div class="chat-card-meta" v-else>待完成 — 点击打开</div>
              </div>
              <div class="chat-card-status" v-if="studentVote"><i class="fa-solid fa-circle-check" style="color:#10b981;"></i></div>
              <div class="chat-card-status" v-else><i class="fa-solid fa-chevron-right" style="color:#9ca3af;"></i></div>
            </div>

            <!-- 紧凑卡片：方案 -->
            <div v-else-if="item.type === 'plan-card'" class="chat-card" @click="openCard('plan')">
              <div class="chat-card-icon" style="background:#f3f0ff;color:#409EFF;"><i class="fa-solid fa-file-prescription"></i></div>
              <div class="chat-card-body">
                <div class="chat-card-title">制定治疗方案</div>
                <div class="chat-card-meta" v-if="planSubmitted">{{ studentPlan.substring(0, 60) }}...</div>
                <div class="chat-card-meta" v-else>待完成 — 点击打开</div>
              </div>
              <div class="chat-card-status" v-if="planSubmitted"><i class="fa-solid fa-circle-check" style="color:#10b981;"></i></div>
              <div class="chat-card-status" v-else><i class="fa-solid fa-chevron-right" style="color:#9ca3af;"></i></div>
            </div>

            <!-- 紧凑卡片：反思 -->
            <div v-else-if="item.type === 'reflect-card'" class="chat-card" @click="openCard('reflect')">
              <div class="chat-card-icon" style="background:#fff7ed;color:#ea580c;"><i class="fa-solid fa-lightbulb"></i></div>
              <div class="chat-card-body">
                <div class="chat-card-title">反思总结</div>
                <div class="chat-card-meta" v-if="reflectSubmitted">{{ studentReflection.substring(0, 60) }}...</div>
                <div class="chat-card-meta" v-else>待完成 — 点击打开</div>
              </div>
              <div class="chat-card-status" v-if="reflectSubmitted"><i class="fa-solid fa-circle-check" style="color:#10b981;"></i></div>
              <div class="chat-card-status" v-else><i class="fa-solid fa-chevron-right" style="color:#9ca3af;"></i></div>
            </div>

            <!-- 专家提问 -->
            <div v-else-if="item.type === 'expert-question'" class="flow-card expert-question-card">
              <i class="fa-solid fa-hand-pointer"></i> <strong>{{ item.speaker }} 点名提问：</strong>{{ item.text }}
            </div>

            <!-- MDT讨论问题列表 -->
            <div v-else-if="item.type === 'mdt-questions'" class="mdt-questions-card">
              <div class="questions-header"><i class="fa-solid fa-list-ol"></i> 本次MDT讨论问题</div>
              <div class="questions-list">
                <div v-for="q in mdtQuestions" :key="q.id" class="question-item">
                  <span class="question-num">Q{{ q.id }}</span>
                  <span>{{ q.text }}</span>
                </div>
              </div>
            </div>

            <!-- 出院诊断 -->
            <div v-else-if="item.type === 'discharge-card'" class="flow-card discharge-card-flow">
              <div class="flow-card-header"><i class="fa-solid fa-notes-medical"></i> 出院诊断</div>
              <div class="flow-card-body">{{ dischargeDiagnosis }}</div>
            </div>

            <!-- 随访计划 -->
            <div v-else-if="item.type === 'followup-card'" class="flow-card followup-card-flow">
              <div class="flow-card-header"><i class="fa-solid fa-calendar-check"></i> 随访计划</div>
              <div class="flow-card-body">{{ followUp }}</div>
            </div>

            <!-- 参考文献 -->
            <div v-else-if="item.type === 'references-card'" class="flow-card references-card-flow">
              <div class="flow-card-header"><i class="fa-solid fa-book-open"></i> 参考文献与指南依据</div>
              <div class="flow-card-body">
                <div v-for="(r, i) in referencesList" :key="i" class="ref-item">{{ i + 1 }}. {{ r }}</div>
              </div>
            </div>

            <!-- MDT最终决策 -->
            <div v-else-if="item.type === 'decision'" class="mdt-decision-card">
              <div class="decision-header"><i class="fa-solid fa-gavel"></i> MDT最终决策</div>
              <div class="decision-body">{{ mdtDecision }}</div>
            </div>
          </template>

          <!-- 打字指示器 -->
          <div v-if="isTyping" class="mdt-msg">
            <div :class="['mdt-msg-avatar', currentSpeaker.avatarClass]">
              <img v-if="currentSpeaker.avatar" :src="currentSpeaker.avatar" class="avatar-img" />
              <span v-else>{{ currentSpeaker.initials }}</span>
            </div>
            <div class="mdt-msg-body">
              <div class="mdt-msg-sender">{{ currentSpeaker.name }}</div>
              <div class="mdt-msg-text typing">正在发言...</div>
            </div>
          </div>
        </div>

        <!-- 底部输入栏 -->
        <div class="mdt-input-bar">
          <button class="input-voice-btn" title="语音输入"><i class="fa-solid fa-microphone"></i></button>
          <input v-model="chatInput" class="chat-input" :placeholder="inputPlaceholder" @keyup.enter="sendMessage" />
          <button class="input-send-btn" @click="sendMessage" :disabled="!chatInput.trim()"><i class="fa-solid fa-paper-plane"></i></button>
        </div>
      </div>

      <!-- 右栏：参与者 -->
      <div class="mdt-roster">
        <div class="roster-title">AI专家</div>
        <div v-for="m in members" :key="m.initials" :class="['roster-member', { speaking: m.isCurrentSpeaker }]">
          <div :class="['roster-avatar', m.avatarClass]">
            <img v-if="m.avatar" :src="m.avatar" class="roster-avatar-img" />
            <span v-else>{{ m.initials }}</span>
          </div>
          <div>
            <div class="roster-name">{{ m.name }}</div>
            <div class="roster-role">{{ m.role }}</div>
          </div>
          <div class="speaking-indicator" :class="{ active: m.isCurrentSpeaker }"></div>
        </div>
        <div class="roster-student">
          <div class="roster-member student-row" v-for="(stu, i) in students" :key="i">
            <div class="roster-avatar student-avatar">
              <img v-if="stu.avatar" :src="stu.avatar" class="roster-avatar-img" />
              <span v-else>👤</span>
            </div>
            <div><div class="roster-name">{{ stu.name }}</div><div class="roster-role">{{ stu.role }}</div></div>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== 卡片弹窗 ========== -->
    <!-- 初步诊断弹窗 -->
    <div v-if="activeCard === 'diagnosis'" class="modal-overlay" @click.self="closeCard">
      <div class="card-modal">
        <div class="card-modal-header">
          <div class="card-modal-title"><i class="fa-solid fa-stethoscope"></i> 初步诊断印象</div>
          <button class="modal-close" @click="closeCard"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="card-modal-body">
          <p class="card-modal-desc">根据病例信息，写出你的初步诊断及依据、鉴别诊断考虑、以及希望进一步了解的信息。</p>
          <textarea v-model="studentDiagnosis" class="flow-textarea" rows="5" placeholder="1. 初步诊断及依据&#10;2. 鉴别诊断&#10;3. 希望进一步了解的信息" :disabled="diagnosisSubmitted"></textarea>
          <div v-if="diagnosisSubmitted" class="expert-feedback mt-3">
            <div class="feedback-title"><i class="fa-solid fa-clipboard-check"></i> 主持人点评</div>
            <div class="feedback-item" v-for="fb in diagnosisFeedback" :key="fb.point">{{ fb.icon }} {{ fb.point }}</div>
          </div>
        </div>
        <div class="card-modal-footer">
          <button v-if="!diagnosisSubmitted" class="btn btn-primary" @click="submitCard('diagnosis')" :disabled="!studentDiagnosis.trim()">提交诊断</button>
          <button v-else class="btn" @click="closeCard">关闭</button>
        </div>
      </div>
    </div>

    <!-- 影像标注弹窗 -->
    <div v-if="activeCard === 'imaging'" class="modal-overlay" @click.self="closeCard">
      <div class="card-modal card-modal-lg">
        <div class="card-modal-header">
          <div class="card-modal-title"><i class="fa-solid fa-x-ray"></i> 影像解读 — 胸部CT·肺窗</div>
          <button class="modal-close" @click="closeCard"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="card-modal-body">
          <p class="card-modal-desc">右肺上叶横断面。请在CT图像上点击标注你发现的异常征象（最多3处），提交后查看影像专家的解读。</p>
          <div class="ct-placeholder" @click="addAnnotation">
            <div class="ct-inner">
              <div class="ct-icon"><i class="fa-solid fa-lungs" style="font-size:48px;"></i></div>
              <div class="ct-label">胸部CT · 肺窗</div>
              <div style="font-size:11px;color:#888;">点击图像添加标注</div>
            </div>
            <div v-for="(m, idx) in markers" :key="idx" class="ct-marker" :style="{ left: m.x + '%', top: m.y + '%' }">{{ idx + 1 }}</div>
          </div>
          <div v-if="annotationSubmitted" class="ct-result">
            <strong>影像专家AI 解读：</strong><br>
            <span class="result-hit">✓ 右肺上叶结节（2.8×2.3cm），分叶+毛刺征 — 你已标注</span><br>
            <span class="result-miss">✗ 纵隔4R区淋巴结肿大 — 遗漏</span><br>
            <span class="result-miss">✗ 结节内空泡征 — 遗漏</span><br>
            <strong>关键病灶识别率：33%（1/3）</strong>
          </div>
        </div>
        <div class="card-modal-footer">
          <button v-if="!annotationSubmitted" class="btn btn-primary" @click="submitCard('imaging')" :disabled="markers.length === 0">提交标注</button>
          <button v-else class="btn" @click="closeCard">关闭</button>
        </div>
      </div>
    </div>

    <!-- 投票弹窗 -->
    <div v-if="activeCard === 'vote'" class="modal-overlay" @click.self="closeCard">
      <div class="card-modal">
        <div class="card-modal-header">
          <div class="card-modal-title"><i class="fa-solid fa-square-poll-vertical"></i> 治疗方向投票</div>
          <button class="modal-close" @click="closeCard"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="card-modal-body">
          <p class="card-modal-desc">在听取各专家观点后，请选择你认同的治疗方向：</p>
          <div class="vote-options">
            <label v-for="opt in voteOptions" :key="opt" class="vote-option" :class="{ selected: studentVote === opt }">
              <input type="radio" v-model="studentVote" :value="opt" :disabled="!!studentVote" /> {{ opt }}
            </label>
          </div>
        </div>
        <div class="card-modal-footer">
          <button v-if="!studentVote" class="btn btn-primary" @click="submitCard('vote')" :disabled="!studentVote">确认投票</button>
          <button v-else class="btn" @click="closeCard">关闭</button>
        </div>
      </div>
    </div>

    <!-- 方案弹窗 -->
    <div v-if="activeCard === 'plan'" class="modal-overlay" @click.self="closeCard">
      <div class="card-modal card-modal-lg">
        <div class="card-modal-header">
          <div class="card-modal-title"><i class="fa-solid fa-file-prescription"></i> 制定治疗方案</div>
          <button class="modal-close" @click="closeCard"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="card-modal-body">
          <p class="card-modal-desc">请独立制定完整的治疗方案，包括诊断、治疗策略、用药方案和随访计划。</p>
          <textarea v-model="studentPlan" class="flow-textarea" rows="6" placeholder="1. 诊断结论&#10;2. 治疗策略（手术/化疗/放疗/靶向/免疫）&#10;3. 具体用药方案（药物、剂量、周期）&#10;4. 随访计划" :disabled="planSubmitted"></textarea>
          <div v-if="planSubmitted" class="expert-feedback mt-3">
            <div class="feedback-title"><i class="fa-solid fa-scale-balanced"></i> 你的方案 vs MDT决策对比</div>
            <div class="feedback-item" v-for="fb in planFeedback" :key="fb.point">{{ fb.icon }} {{ fb.point }}</div>
          </div>
        </div>
        <div class="card-modal-footer">
          <button v-if="!planSubmitted" class="btn btn-primary" @click="submitCard('plan')" :disabled="!studentPlan.trim()">提交方案</button>
          <button v-else class="btn" @click="closeCard">关闭</button>
        </div>
      </div>
    </div>

    <!-- 反思弹窗 -->
    <div v-if="activeCard === 'reflect'" class="modal-overlay" @click.self="closeCard">
      <div class="card-modal">
        <div class="card-modal-header">
          <div class="card-modal-title"><i class="fa-solid fa-lightbulb"></i> 反思总结</div>
          <button class="modal-close" @click="closeCard"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="card-modal-body">
          <p class="card-modal-desc">回顾整个MDT讨论过程，写下你的收获、认知改变和遗留困惑。</p>
          <textarea v-model="studentReflection" class="flow-textarea" rows="4" placeholder="1. 本次讨论我学到了什么？&#10;2. 我的哪些认知被改变了？&#10;3. 还有哪些困惑没有解决？" :disabled="reflectSubmitted"></textarea>
        </div>
        <div class="card-modal-footer">
          <button v-if="!reflectSubmitted" class="btn btn-primary" @click="submitCard('reflect')" :disabled="!studentReflection.trim()">提交反思</button>
          <button v-if="reflectSubmitted" class="btn btn-primary" @click="closeCard(); showResult = true"><i class="fa-solid fa-chart-pie"></i> 查看能力画像</button>
          <button v-else class="btn" @click="closeCard">关闭</button>
        </div>
      </div>
    </div>

    <!-- 能力画像弹窗 -->
    <div v-if="showResult" class="modal-overlay" @click.self="showResult = false">
      <div class="modal-container">
        <div class="modal-header">
          <h3>MDT能力画像</h3>
          <button class="modal-close" @click="showResult = false"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body">
          <table class="result-table">
            <thead><tr><th>评估维度</th><th>得分</th><th>评价</th></tr></thead>
            <tbody>
              <tr><td>诊断判断力</td><td><span class="badge badge-success">78%</span></td><td>初步诊断与最终诊断吻合度良好</td></tr>
              <tr><td>影像识读能力</td><td><span class="badge badge-warning">33%</span></td><td>关键病灶识别率偏低，需加强训练</td></tr>
              <tr><td>方案制定规范性</td><td><span class="badge badge-success">82%</span></td><td>与MDT最终决策基本一致</td></tr>
              <tr><td>批判性思维</td><td><span class="badge badge-info">75%</span></td><td>能发现专家论点中的关键逻辑漏洞</td></tr>
              <tr><td>循证决策能力</td><td><span class="badge badge-warning">60%</span></td><td>方案中引用指南较少，建议强化循证意识</td></tr>
              <tr><td>反思深度</td><td><span class="badge badge-success">85%</span></td><td>反思深刻，能准确识别自身认知偏差</td></tr>
            </tbody>
          </table>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" @click="showResult = false">确认</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { matchPatientImage } from '@/composables/usePatientImage'

// ── 阶段 ──
const stages = ['病例汇报', '影像解读', '综合讨论', '方案决策', '总结决策']
const currentStage = ref(2)   // 演示：综合讨论阶段
const isTyping = ref(false)
const showResult = ref(false)
const discussionRef = ref(null)

// ── 病例信息分页 ──
const activeInfoTab = ref('basic')
const infoTabs = [
  { key: 'basic', label: '基本信息', icon: 'fa-solid fa-user' },
  { key: 'history', label: '病史资料', icon: 'fa-solid fa-notes-medical' },
  { key: 'reports', label: '检查报告', icon: 'fa-solid fa-file-waveform' },
  { key: 'mdt', label: 'MDT议题', icon: 'fa-solid fa-circle-question' },
]
const imagingReports = [
  { label: '胸部CT平扫+增强', modality: 'CT', icon: 'fa-solid fa-x-ray', bg: 'linear-gradient(135deg, #0f172a, #1e293b)',
    summary: '右肺上叶后段2.8×2.3cm结节，分叶+毛刺征，纵隔4R区淋巴结肿大(1.2cm)' },
  { label: '头颅MRI平扫+增强', modality: 'MRI', icon: 'fa-solid fa-brain', bg: 'linear-gradient(135deg, #1a1a2e, #16213e)',
    summary: '未见明确转移灶' },
  { label: '上腹部CT', modality: 'CT', icon: 'fa-solid fa-rotate-left', bg: 'linear-gradient(135deg, #0c1f2b, #1a374b)',
    summary: '肝脏、肾上腺未见占位' },
  { label: '全身骨扫描', modality: 'NM', icon: 'fa-solid fa-bone', bg: 'linear-gradient(135deg, #1b1b2f, #2d2d44)',
    summary: '未见明确骨转移征象' },
]

// ── 卡片状态 ──
const activeCard = ref(null)  // 'diagnosis' | 'imaging' | 'vote' | 'plan' | 'reflect' | null
const diagnosisSubmitted = ref(true)
const annotationSubmitted = ref(true)
const planSubmitted = ref(false)
const reflectSubmitted = ref(false)

// ── 学员输入 ──
const chatInput = ref('')
const studentDiagnosis = ref('考虑右肺上叶周围型肺癌可能性大（cT1cN1M0, IIB期）。依据：① 58岁男性+重度吸烟史；② CT示分叶+毛刺征+空泡征，符合肺腺癌影像特征；③ 纵隔4R区淋巴结肿大，需评估N分期。鉴别诊断需排除：炎性假瘤、结核球。希望进一步了解：肿瘤标志物结果、穿刺病理、PET-CT全身评估。')
const studentVote = ref('')
const studentPlan = ref('')
const studentReflection = ref('')
const markers = ref([{ x: '62', y: '38' }])

// ── 病例信息 ──
const caseInfo = {
  difficulty: '疑难病例',
  patientName: '张德明',
  caseId: 'RESP-20260710-K9P3',
  gender: '男',
  age: 58,
  specialty: '呼吸内科',
  admissionDate: '2026-07-06',
  chiefComplaint: '咳嗽、痰中带血2周，加重伴胸闷3天。',
  presentIllness: '患者2周前无明显诱因出现阵发性咳嗽，咳白色黏痰，痰中偶见鲜红色血丝，每日约2-3次。近3天咳嗽频率增加，伴活动后胸闷、气短，夜间可平卧。无发热、盗汗、声嘶。发病以来体重下降约2kg，食欲减退。曾于社区医院口服头孢类抗生素1周，症状无明显改善。',
  physicalExam: 'T 37.8°C, P 88次/分, R 20次/分, BP 132/85 mmHg, SpO₂ 94%（静息）。神清，浅表淋巴结未触及。右肺上叶呼吸音略低，未闻及干湿啰音。心脏、腹部查体未见明显异常。杵状指（-）。',
  vitals: [
    { label: 'WBC', value: '9.8×10⁹/L', abnormal: true },
    { label: 'NEUT%', value: '72.5%', abnormal: true },
    { label: 'Hb', value: '128 g/L', abnormal: false },
    { label: 'PLT', value: '245×10⁹/L', abnormal: false },
    { label: 'CRP', value: '18.6 mg/L', abnormal: true },
    { label: 'CEA', value: '28.4 ng/mL', abnormal: true },
    { label: 'NSE', value: '22.1 ng/mL', abnormal: true },
    { label: 'CYFRA21-1', value: '5.8 ng/mL', abnormal: true },
  ],
  imagingSummary: '胸部CT平扫+增强：右肺上叶后段见2.8×2.3cm不规则软组织结节，边界不清，呈分叶状，周边可见毛刺征及胸膜凹陷征。增强扫描呈不均匀强化，CT值由平扫42HU升至78HU。纵隔窗示4R区淋巴结肿大，短径约1.2cm。结节内可见小空泡征。',
  imagingAdditional: '头颅MRI平扫+增强：未见明确转移灶。上腹部CT：肝脏、肾上腺未见占位。全身骨扫描：未见明确骨转移征象。',
  pathology: 'CT引导下经皮肺穿刺活检（2026-07-09）：病理回报——腺癌，中分化，腺泡样为主。免疫组化：TTF-1(+), Napsin A(+), CK7(+), CK5/6(-), p40(-), PD-L1(22C3) TPS=60%。NGS待回报（EGFR/ALK/ROS1/KRAS）。',
  pastHistory: '高血压病史10年，口服氨氯地平5mg qd，血压控制可。否认糖尿病、冠心病、肝炎、结核病史。青霉素过敏史。',
  personalHistory: '吸烟30年，40支/日，未戒烟。偶尔饮酒，每周2-3次啤酒。职业：建筑工人（接触粉尘15年）。',
  familyHistory: '父亲65岁死于"肺癌"，母亲健在（高血压）。一兄一姐体健。否认家族遗传病史。',
  mdtQuestion: '明确诊断方向（肺癌待确诊），制定初始治疗策略——先行手术 vs 先行新辅助治疗？',
}

const patientAvatar = computed(() => matchPatientImage({ gender: caseInfo.gender, age: caseInfo.age }, 'patient'))

const caseFeatures = [
  '老年男性（58岁），重度吸烟者（30年×40支/日 ≈ 60包年），职业粉尘接触15年——肺癌高危人群',
  '影像学高度提示恶性：分叶+毛刺+胸膜凹陷+空泡征（肺腺癌特征性表现），增强后不均匀强化',
  '纵隔4R区淋巴结肿大（短径1.2cm > 1.0cm），提示N1转移可能，临床分期至少IIB（T1cN1M0）',
  '肿瘤标志物CEA、NSE、CYFRA21-1均升高，支持肺癌诊断',
  '穿刺病理证实为腺癌（TTF-1+/Napsin A+），PD-L1 TPS=60%高表达——免疫治疗可能获益',
  'NGS待回报，EGFR/ALK/ROS1/KRAS状态将决定靶向治疗选择',
]

const mdtQuestions = [
  { id: 1, text: '临床分期如何确定？还需要补充哪些检查？（PET-CT、EBUS-TBNA、头颅MRI等）' },
  { id: 2, text: '初始治疗策略：先行手术切除 vs 先行新辅助治疗（化疗±免疫）？各自的优劣和适用条件？' },
  { id: 3, text: '若行新辅助治疗，最佳方案是什么？（含铂双药？联合免疫？靶向？）如何评估疗效？' },
  { id: 4, text: '术后辅助治疗如何决策？根据病理分期、基因检测、PD-L1表达综合制定。' },
]

const dischargeDiagnosis = '右肺上叶腺癌，中分化，腺泡样为主型，临床分期IIB期（cT1cN1M0），PD-L1(22C3) TPS=60%，EGFR/ALK/ROS1(-)，KRAS G12C(+)'

const followUp = '术后3周胸外科+肿瘤科联合门诊复查，行胸部CT平扫+肿瘤标志物。NGS回报后根据KRAS G12C阳性决定是否联合靶向辅助。术后2年内每3-6月复查一次，3-5年每6-12月一次，5年后每年一次。戒烟干预，职业粉尘防护教育。'

const referencesList = [
  'CheckMate 816: Nivolumab+化疗新辅助治疗可切除NSCLC，pCR率24% vs 2.2%（NEJM 2022）',
  'KEYNOTE-671: 围手术期Pembrolizumab显著改善EFS（HR 0.58, p<0.001）（NEJM 2023）',
  'CSCO非小细胞肺癌诊疗指南2025版：IIB期NSCLC推荐多学科讨论决定手术或新辅助治疗',
  'NCCN Guidelines NSCLC V6.2025: T1cN1M0 (Stage IIB) — 首选手术，N1+可考虑新辅助chemo+IO',
  'Fleischner Society 2024: 肺结节管理指南——分叶+毛刺+空泡征为恶性高风险征象组合',
]

const voteOptions = [
  '先行手术切除+术后辅助化疗（外科观点）',
  '先行新辅助化疗+再评估手术（肿瘤科观点）',
  '立体定向放疗+密切随访（放疗科观点）',
]

// ── 专家 ──
const AVATAR_BASE = '/images/avatars/'
const members = [
  { name: '主持人', role: '流程调度', initials: 'MC', avatarClass: 'av-host', avatar: AVATAR_BASE + 'avatar-friendly-zhao.png', isCurrentSpeaker: false },
  { name: '肿瘤专家', role: '诊疗方案', initials: 'ON', avatarClass: 'av-onco', avatar: AVATAR_BASE + 'avatar-skeptical-wang.png', isCurrentSpeaker: true },
  { name: '影像专家', role: '影像解读', initials: 'RD', avatarClass: 'av-radio', avatar: AVATAR_BASE + 'avatar-academic-li.png', isCurrentSpeaker: false },
  { name: '病理专家', role: '病理分析', initials: 'PT', avatarClass: 'av-path', avatar: AVATAR_BASE + 'avatar-busy-zhang.png', isCurrentSpeaker: false },
  { name: '护理专家', role: '护理计划', initials: 'NS', avatarClass: 'av-nurse', avatar: AVATAR_BASE + encodeURIComponent('男医生形象.png'), isCurrentSpeaker: false },
  { name: '麻醉专家', role: '风险评估', initials: 'AN', avatarClass: 'av-anes', avatar: AVATAR_BASE + encodeURIComponent('男医生形象 (1).png'), isCurrentSpeaker: false },
]
const learnerAvatar = AVATAR_BASE + encodeURIComponent('学习者.png')
const students = [
  { name: '张梓墨', role: '主动参与', avatar: AVATAR_BASE + encodeURIComponent('学习者.png') },
  { name: '李慧芳', role: '旁听', avatar: '' },
  { name: '王建国', role: '旁听', avatar: '' },
]

const currentSpeaker = ref(members[1])
const avatarMap = computed(() => {
  const map = {}
  members.forEach(m => { map[m.initials] = m.avatar })
  return map
})

const mdtDecision = ref('综合各位专家意见，决定：行 VATS 右肺上叶切除 + 纵隔淋巴结清扫术（D2），术后根据病理及基因检测结果决定辅助方案。若EGFR/ALK阳性则靶向辅助，若阴性且PD-L1≥50%则免疫辅助，其余行含铂双药化疗4周期。术后3周胸外科+肿瘤科联合门诊复查。')

const diagnosisFeedback = [
  { icon: '✓', point: '方向正确：识别出肺占位的恶性可能，考虑到肺腺癌的典型影像特征' },
  { icon: '~', point: '可补充：未提及吸烟量与肺癌风险的量化关系（40包年=高危），以及分子检测对治疗决策的影响' },
  { icon: '✗', point: '遗漏：纵隔淋巴结肿大的N分期意义未充分展开，这对治疗策略选择（手术 vs 新辅助）至关重要' },
]

const planFeedback = [
  { icon: '✓', point: '外科方案方向正确，右肺上叶切除+D2清扫与MDT决策一致' },
  { icon: '✗', point: '遗漏：未提及基因检测指导辅助治疗（EGFR/ALK/PD-L1）' },
  { icon: '~', point: '部分偏差：建议直接开胸手术，MDT选择VATS微创方案' },
]

const inputPlaceholder = computed(() => {
  const map = {
    0: '记录你对病例的初步印象和疑问...',
    1: '描述你观察到的异常影像征象...',
    2: '记录专家观点的分歧点，或指出逻辑漏洞...',
    3: '先独立制定方案，再与MDT决策对比...',
    4: '写下你的反思感悟和遗留问题...',
  }
  return map[currentStage.value] || '输入你的观察笔记...'
})

// ── 对话流（演示数据） ──
const chatItems = ref([
  { type: 'expert', sender: '主持人 AI', initials: 'MC', avatarClass: 'av-host',
    text: '各位专家，今天讨论一位58岁男性患者张德明，"咳嗽、痰中带血2周"。吸烟史30年（40支/日），高血压病史10年。CT示右肺上叶后段2.8×2.3cm不规则结节，分叶+毛刺征，纵隔4R区淋巴结肿大（1.2cm），结节内可见空泡征。本次MDT核心议题：明确诊断方向，制定初始治疗策略——先行手术还是先行新辅助治疗？请各位先查看左侧病例资料。' },
  { type: 'expert', sender: '主持人 AI', initials: 'MC', avatarClass: 'av-host',
    text: '在各位专家发表意见之前，请学员先写出你的初步诊断印象。包括：初步诊断及依据、鉴别诊断考虑、你还想了解哪些信息。' },
  { type: 'diagnosis-card' },
  { type: 'expert', sender: '主持人 AI', initials: 'MC', avatarClass: 'av-host',
    text: '学员的初步诊断方向正确，识别出了肺占位的恶性可能。需要注意：吸烟史+影像学特征（分叶、毛刺、空泡征）高度指向肺腺癌，纵隔淋巴结肿大提示需要评估N分期——这对选择手术还是新辅助治疗至关重要。下面请影像专家对CT发现做详细解读。请学员先在CT图像上标注你发现的异常征象，提交后查看专家的对照解读。' },
  { type: 'imaging-card' },
  { type: 'expert', sender: '影像专家 AI', initials: 'RD', avatarClass: 'av-radio',
    text: 'CT肺窗示右肺上叶后段2.8×2.3cm不规则结节，边缘毛糙，分叶+毛刺征，高度提示恶性。纵隔4R区淋巴结肿大（1.2cm），短径超过1cm标准，需考虑N1转移可能。结节内可见空泡征——这是肺腺癌的特征性表现，在腺癌中出现率约30%，而在鳞癌中不到5%。建议穿刺活检明确病理，同时行PET-CT评估全身转移情况。' },
  { type: 'expert', sender: '主持人 AI', initials: 'MC', avatarClass: 'av-host',
    text: '现在进入综合讨论阶段。病理已明确为肺腺癌（中分化，TTF-1+/Napsin A+，PD-L1 TPS=60%），临床分期T1cN1M0（IIB期）。本次讨论围绕以下四个问题展开，请各学科专家从本专业角度逐一发表意见。' },
  { type: 'mdt-questions' },
  { type: 'expert', sender: '主持人 AI', initials: 'MC', avatarClass: 'av-host',
    text: '首先聚焦Q1：临床分期为T1cN1M0（IIB期），还需要补充哪些检查以完成精准分期？PET-CT评估全身转移、EBUS-TBNA确认淋巴结性质——这些检查结果如何影响治疗决策？肿瘤专家先开始。' },
  { type: 'expert', sender: '肿瘤专家 AI', initials: 'ON', avatarClass: 'av-onco',
    text: '谢谢主持人。针对T1cN1M0（IIB期）肺腺癌，我倾向于先行新辅助化疗联合免疫治疗，再评估手术时机。理由有三：第一，N1淋巴结阳性意味着已经有淋巴结转移，直接手术可能无法做到R0切除；第二，新辅助治疗可以测试肿瘤对化疗/免疫的敏感性，为术后辅助方案选择提供依据；第三，CheckMate 816研究显示，新辅助免疫+化疗的pCR率达到24%，显著优于单纯化疗的2.2%。当然，前提是需要明确基因突变状态——EGFR/ALK阳性患者首选靶向新辅助。' },
  { type: 'student', text: '请问肿瘤专家，如果新辅助治疗后肿瘤缩小不明显甚至进展了怎么办？会不会错过最佳手术窗口？' },
  { type: 'expert', sender: '肿瘤专家 AI', initials: 'ON', avatarClass: 'av-onco',
    text: '好问题。新辅助治疗一般2-3个周期后即行影像学评估，如果SD（稳定）或PD（进展），我们会立刻转为手术——不会无限制等下去。实际上新辅助期间出现进展的比例不到5%，大多数患者至少能达到SD。另外，新辅助阶段我们会有MDT紧密随访，每周期评估一次，不存在"错过窗口"的问题。' },
  { type: 'expert', sender: '病理专家 AI', initials: 'PT', avatarClass: 'av-path',
    text: '补充两点。第一，空泡征+毛刺征确实是肺腺癌典型影像-病理对应表现，但需注意约5%的鳞癌也可出现空泡征，所以最终诊断仍需病理金标准。第二，如果要做新辅助，建议穿刺时同步取足够组织做PD-L1检测和NGS二代测序——PD-L1≥50%的患者免疫单药新辅助的pCR率可能优于化疗。CheckMate 816和KEYNOTE-671的数据都可以参考。' },
  { type: 'vote-card' },
])

// ── 卡片操作 ──
function openCard(type) { activeCard.value = type }
function closeCard() { activeCard.value = null }

function sendMessage() {
  const text = chatInput.value.trim()
  if (!text) return
  chatItems.value.push({ type: 'student', text })
  chatInput.value = ''
  nextTick(() => scrollToBottom())
}

function addAnnotation(e) {
  if (annotationSubmitted.value || markers.value.length >= 3) return
  const rect = e.target.getBoundingClientRect()
  markers.value.push({
    x: ((e.clientX - rect.left) / rect.width * 100).toFixed(1),
    y: ((e.clientY - rect.top) / rect.height * 100).toFixed(1),
  })
}

function submitCard(cardType) {
  if (cardType === 'vote') {
    // 投票只需关闭弹窗
    closeCard()
    isTyping.value = true
    setTimeout(() => {
      isTyping.value = false
      chatItems.value.push(
        { type: 'expert', sender: '肿瘤专家 AI', initials: 'ON', avatarClass: 'av-onco',
          text: '同意病理专家的补充，PD-L1检测确实应该作为必查项。如果PD-L1 CPS≥50，倾向于免疫+化疗联合新辅助；如果阴性，则单纯含铂双药化疗即可，避免免疫相关不良反应。' },
        { type: 'expert-question', speaker: '肿瘤专家', text: '刚才影像专家提到结节有空泡征，你知道空泡征在腺癌和鳞癌中的出现率差别吗？这位患者你倾向于哪种诊断？为什么？' },
      )
      advanceStage()
      nextTick(() => scrollToBottom())
    }, 1500)
    return
  }

  isTyping.value = true
  if (cardType === 'diagnosis') diagnosisSubmitted.value = true
  if (cardType === 'imaging') annotationSubmitted.value = true
  if (cardType === 'plan') planSubmitted.value = true
  if (cardType === 'reflect') reflectSubmitted.value = true

  setTimeout(() => {
    isTyping.value = false
    const responses = getCardResponses(cardType)
    chatItems.value.push(...responses)
    closeCard()
    nextTick(() => scrollToBottom())
    if (cardType === 'diagnosis' && currentStage.value === 0) advanceStage()
    if (cardType === 'imaging' && currentStage.value === 1) advanceStage()
    if (cardType === 'plan' && currentStage.value === 3) advanceStage()
    if (cardType === 'reflect' && currentStage.value === 4) advanceStage()
  }, 1500)
}

function getCardResponses(cardType) {
  if (cardType === 'diagnosis') {
    return [
      { type: 'expert', sender: '主持人 AI', initials: 'MC', avatarClass: 'av-host',
        text: '感谢你的初步诊断。方向正确，识别出了肺占位的恶性可能。下面请影像专家做详细解读，请先在CT图像上标注异常征象。' },
      { type: 'imaging-card' },
    ]
  }
  if (cardType === 'imaging') {
    return [
      { type: 'expert', sender: '影像专家 AI', initials: 'RD', avatarClass: 'av-radio',
        text: 'CT解读已在上方展示。你标注了右肺上叶结节（正确），但遗漏了纵隔淋巴结肿大和空泡征——这两个发现对分期和病理推测都非常关键。建议加强纵隔窗和细节征象的观察训练。' },
      { type: 'expert', sender: '主持人 AI', initials: 'MC', avatarClass: 'av-host',
        text: '现在进入综合讨论阶段。请各学科专家从本专业角度发表诊疗意见。' },
      { type: 'vote-card' },
    ]
  }
  if (cardType === 'plan') {
    return [
      { type: 'expert', sender: '主持人 AI', initials: 'MC', avatarClass: 'av-host',
        text: '方案已收到，现在展示MDT最终决策，请对照分析差异。' },
      { type: 'decision' },
      { type: 'reflect-card' },
    ]
  }
  if (cardType === 'reflect') {
    return [
      { type: 'expert', sender: '主持人 AI', initials: 'MC', avatarClass: 'av-host',
        text: '本次MDT讨论结束。各阶段表现统计：诊断78% | 影像33% | 批判思维75% | 循证决策60% | 反思85%。影像识读和循证引用需重点加强。点击下方按钮查看完整能力画像。' },
    ]
  }
  return []
}

function advanceStage() {
  if (currentStage.value < 4) {
    currentStage.value++
    members.forEach(m => m.isCurrentSpeaker = false)
    const speakerMap = [1, 2, 3, 4, 0]
    members[speakerMap[currentStage.value]].isCurrentSpeaker = true
    currentSpeaker.value = members[speakerMap[currentStage.value]]
    nextTick(() => scrollToBottom())
  }
}

function scrollToBottom() {
  if (discussionRef.value) {
    discussionRef.value.scrollTop = discussionRef.value.scrollHeight
  }
}
</script>

<style scoped>
.mdt-page {
  height: calc(100vh - 110px); display: flex; flex-direction: column;
  padding: 20px 24px; background: #f8f9fb;
}

.steps-bar {
  display: flex; align-items: center; gap: 6px;
  background: #fff; border-radius: 12px; padding: 12px 24px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04); border: 1px solid #edf0f4; margin-bottom: 14px;
}
.step-item { display: flex; flex-direction: column; align-items: center; gap: 5px; position: relative; }
.step-item + .step-item::before {
  content: ''; position: absolute; left: -8px; top: 14px;
  width: 16px; height: 1px; background: #e5e7eb;
}
.step-dot {
  width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 600; background: #f3f4f6; color: #9ca3af;
  transition: all .3s;
}
.step-dot.done { background: #10b981; color: #fff; }
.step-dot.current { background: #409EFF; color: #fff; box-shadow: 0 0 0 4px rgba(64,158,255,0.15); }
.step-label { font-size: 10px; color: #6b7280; white-space: nowrap; font-weight: 500; }
.btn-end-training {
  margin-left: auto; padding: 8px 18px;
  background: #fee2e2; color: #dc2626; border: 1px solid #fecaca;
  border-radius: 10px; font-size: 13px; font-weight: 600;
  cursor: pointer; font-family: inherit; transition: all .2s;
  display: flex; align-items: center; gap: 6px; white-space: nowrap;
}
.btn-end-training:hover { background: #fecaca; }

.mdt-layout { display: flex; gap: 0; flex: 1; overflow: hidden; min-height: 0; }

/* ─── 左栏 ─── */
.mdt-sidebar-left {
  flex: 1.5; min-width: 240px; overflow-y: auto;
  background: #fff; border: 1px solid #edf0f4; border-right: none;
  border-radius: 12px 0 0 12px; padding: 0;
  display: flex; flex-direction: column;
}
.case-info-title {
  font-size: 13px; font-weight: 600; color: #374151;
  display: flex; align-items: center; gap: 6px;
  padding: 18px 16px 12px; border-bottom: 1px solid #f3f4f6;
  flex-shrink: 0;
}

/* ─── 信息分页标签 ─── */
.info-tabs {
  display: flex; gap: 0; padding: 6px 10px; flex-shrink: 0;
  border-bottom: 1px solid #edf0f4; background: #fafbfc;
}
.info-tab {
  flex: 1; padding: 7px 4px; border: none; background: transparent;
  font-size: 10px; font-family: inherit; color: #9ca3af;
  cursor: pointer; border-radius: 6px; transition: all .2s;
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  font-weight: 500; white-space: nowrap;
}
.info-tab i { font-size: 12px; }
.info-tab:hover { color: #6b7280; background: #f3f4f6; }
.info-tab.active { color: #409EFF; background: #eff6ff; font-weight: 600; }

.info-tab-content {
  flex: 1; overflow-y: auto; padding: 16px;
}
.tab-panel { animation: tabFadeIn .2s ease; }
@keyframes tabFadeIn { from { opacity: 0; transform: translateX(-4px); } to { opacity: 1; transform: translateX(0); } }
.case-section { margin-bottom: 18px; }
.case-section:last-child { margin-bottom: 0; }
.case-section-label {
  font-size: 10px; font-weight: 700; color: #b0b7c3; text-transform: uppercase;
  letter-spacing: .8px; margin-bottom: 6px; display: flex; align-items: center; gap: 5px;
}
.case-section-text { font-size: 12px; color: #4b5563; line-height: 1.65; }
.case-section-sub { font-size: 10px; font-weight: 600; color: #b0b7c3; margin: 8px 0 4px; }

.case-info-photo {
  width: 72px; height: 72px; border-radius: 50%; overflow: hidden;
  background: linear-gradient(135deg, #ecf5ff, #d9ecff);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 8px;
}
.case-patient-img { width: 100%; height: 100%; object-fit: cover; border: none; background: transparent; }
.case-info-avatar { font-size: 28px; color: #79bbff; }
.case-info-name { font-size: 15px; font-weight: 700; text-align: center; margin-bottom: 4px; color: #1f2937; }
.case-info-row { font-size: 11px; color: #6b7280; margin-bottom: 2px; display: flex; align-items: center; gap: 6px; justify-content: center; }
.case-info-id { font-size: 10px; color: #9ca3af; font-family: 'SF Mono', 'Fira Code', monospace; background: #f9fafb; padding: 1px 6px; border-radius: 4px; }
.case-info-diff { font-size: 10px; padding: 2px 8px; border-radius: 10px; font-weight: 600; }
.diff-U { background: #d9ecff; color: #1d4ed8; }
.diff-R { background: #fef3c7; color: #d97706; }
.diff-F { background: #fee2e2; color: #dc2626; }

.case-info-meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 10px; }
.meta-item { display: flex; flex-direction: column; gap: 2px; padding: 6px 10px; background: #f9fafb; border-radius: 8px; }
.meta-label { font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: .5px; }
.meta-value { font-size: 13px; color: #1f2937; font-weight: 600; }

.case-lab-table { border: 1px solid #edf0f4; border-radius: 8px; overflow: hidden; }
.case-vital-row { display: flex; justify-content: space-between; align-items: center; font-size: 12px; padding: 6px 12px; border-bottom: 1px solid #f9fafb; }
.case-vital-row:last-child { border-bottom: none; }
.case-vital-row:nth-child(even) { background: #fafbfc; }
.case-vital-label { color: #6b7280; font-weight: 500; }
.case-vital-value { color: #374151; font-weight: 500; }
.case-vital-value.abnormal { color: #dc2626; font-weight: 700; }

.case-two-col { display: flex; gap: 16px; }
.case-col { flex: 1; min-width: 0; }
.case-col .case-section-text { font-size: 11px; }

.mdt-question-box {
  background: linear-gradient(135deg, #eff6ff, #f0f5ff);
  border: 1px solid #dbeafe; border-radius: 10px; padding: 12px 14px; margin-top: 4px;
}

/* ─── 影像缩略图卡片 ─── */
.imaging-cards { display: flex; flex-direction: column; gap: 8px; }
.imaging-card {
  display: flex; gap: 10px; padding: 10px 12px;
  background: #f9fafb; border: 1px solid #edf0f4; border-radius: 10px;
  cursor: pointer; transition: all .15s; align-items: center;
}
.imaging-card:hover { border-color: #93c5fd; background: #f8faff; }
.imaging-thumb {
  width: 56px; height: 56px; border-radius: 8px; flex-shrink: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 3px; color: #94a3b8; position: relative; overflow: hidden;
}
.imaging-thumb::before {
  content: ''; position: absolute; inset: 0;
  background: radial-gradient(circle at 60% 30%, rgba(255,255,255,0.05), transparent 70%);
}
.imaging-thumb i { font-size: 18px; position: relative; z-index: 1; }
.imaging-modality { font-size: 9px; font-weight: 700; color: #64748b; position: relative; z-index: 1; letter-spacing: .5px; }
.imaging-info { flex: 1; min-width: 0; }
.imaging-label { font-size: 12px; font-weight: 600; color: #1f2937; margin-bottom: 3px; }
.imaging-summary { font-size: 10px; color: #6b7280; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

/* ─── MDT问题列表 ─── */
.mdt-question-list { display: flex; flex-direction: column; gap: 8px; }
.mdt-question-item {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 10px 12px; background: #f9fafb; border: 1px solid #edf0f4;
  border-radius: 8px; font-size: 11px; line-height: 1.6;
}
.mdt-q-num {
  font-size: 10px; font-weight: 700; color: #fff; background: #409EFF;
  width: 20px; height: 20px; border-radius: 10px; display: flex;
  align-items: center; justify-content: center; flex-shrink: 0;
}
.mdt-q-text { color: #4b5563; padding-top: 1px; }

/* ─── 中栏 ─── */
.mdt-center {
  flex: 7; display: flex; flex-direction: column; min-width: 360px;
  background: #fff; border-top: 1px solid #edf0f4; border-bottom: 1px solid #edf0f4;
}
.mdt-main { flex: 1; overflow-y: auto; padding: 20px 24px 8px; background: #fafbfc; }

/* ─── 消息 ─── */
.mdt-msg { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 16px; }
.mdt-msg-avatar {
  width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; color: #fff; flex-shrink: 0; overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
.avatar-img { width: 100%; height: 100%; object-fit: cover; object-position: top center; }
.av-host { background: #409EFF; } .av-onco { background: #ef4444; } .av-radio { background: #f59e0b; }
.av-path { background: #8b5cf6; } .av-nurse { background: #10b981; } .av-anes { background: #06b6d4; }
.student-avatar-msg { background: #3b82f6; }
.mdt-msg-body { flex: 1; min-width: 0; }
.mdt-msg-sender { font-size: 11px; font-weight: 700; margin-bottom: 4px; color: #374151; letter-spacing: .2px; }
.mdt-msg-text {
  font-size: 13px; line-height: 1.75; padding: 12px 16px;
  background: #fff; border-radius: 12px; border: 1px solid #f1f5f9;
  box-shadow: 0 1px 2px rgba(0,0,0,0.03);
}
.mdt-msg-text.typing { background: #eff6ff; color: #409EFF; font-style: italic; border-color: #dbeafe; }
.student-msg { justify-content: flex-end; }
.student-msg .mdt-msg-body { display: flex; flex-direction: column; align-items: flex-end; }
.student-text { background: #eff6ff; border-color: #dbeafe; }

/* ─── 紧凑卡片（对话流中） ─── */
.chat-card {
  display: flex; align-items: center; gap: 14px;
  margin: 10px 4px 14px; padding: 16px 18px;
  background: #fff; border: 2px solid #edf0f4; border-radius: 14px;
  cursor: pointer; transition: all .2s;
}
.chat-card:hover {
  border-color: #93c5fd;
  box-shadow: 0 4px 12px rgba(64,158,255,0.08);
  transform: translateY(-1px);
}
.chat-card-icon {
  width: 42px; height: 42px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 17px; flex-shrink: 0;
}
.chat-card-body { flex: 1; min-width: 0; }
.chat-card-title { font-size: 14px; font-weight: 600; color: #1f2937; margin-bottom: 3px; }
.chat-card-meta { font-size: 12px; color: #9ca3af; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.chat-card-status { font-size: 18px; flex-shrink: 0; }

/* ─── 弹窗卡片 ─── */
.card-modal {
  background: #fff; border-radius: 16px; width: 640px; max-height: 82vh;
  overflow-y: auto; display: flex; flex-direction: column;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15);
}
.card-modal-lg { width: 740px; }
.card-modal-header {
  padding: 20px 28px; border-bottom: 1px solid #f3f4f6;
  display: flex; align-items: center; justify-content: space-between;
}
.card-modal-title { font-size: 17px; font-weight: 700; display: flex; align-items: center; gap: 10px; color: #1f2937; }
.card-modal-body { padding: 28px; flex: 1; overflow-y: auto; }
.card-modal-footer { padding: 18px 28px; border-top: 1px solid #f3f4f6; display: flex; justify-content: flex-end; gap: 10px; }
.card-modal-desc { font-size: 13px; color: #6b7280; margin-bottom: 18px; line-height: 1.7; }

.flow-textarea {
  width: 100%; min-height: 110px; padding: 14px 16px;
  border: 2px solid #edf0f4; border-radius: 10px; font-size: 13px;
  font-family: inherit; outline: none; resize: vertical;
  line-height: 1.7; box-sizing: border-box; transition: all .2s;
}
.flow-textarea:focus { border-color: #409EFF; box-shadow: 0 0 0 4px rgba(64,158,255,0.06); }
.flow-textarea:disabled { background: #f9fafb; color: #6b7280; border-color: #f3f4f6; }

.ct-placeholder {
  width: 100%; height: 260px;
  background: linear-gradient(145deg, #0f172a, #1e293b);
  border-radius: 10px; display: flex; align-items: center; justify-content: center;
  position: relative; cursor: crosshair; margin-bottom: 14px;
  overflow: hidden;
}
.ct-placeholder::before {
  content: ''; position: absolute; inset: 0;
  background: radial-gradient(circle at 65% 35%, rgba(255,255,255,0.03) 0%, transparent 70%);
}
.ct-inner { text-align: center; color: #94a3b8; position: relative; z-index: 1; }
.ct-label { font-size: 15px; color: #94a3b8; margin-top: 10px; font-weight: 500; }
.ct-marker {
  position: absolute; width: 26px; height: 26px; border-radius: 50%;
  background: rgba(239,68,68,0.9); border: 2px solid #fff; color: #fff;
  font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center;
  transform: translate(-50%, -50%); pointer-events: none; z-index: 2;
  box-shadow: 0 2px 8px rgba(239,68,68,0.4);
}
.ct-result { padding: 16px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; font-size: 13px; line-height: 1.8; }
.result-hit { color: #059669; font-weight: 500; }
.result-miss { color: #dc2626; font-weight: 500; }

.vote-options { display: flex; flex-direction: column; gap: 10px; }
.vote-option {
  display: flex; align-items: center; gap: 10px; padding: 14px 18px;
  border: 2px solid #edf0f4; border-radius: 10px; font-size: 14px;
  cursor: pointer; transition: all .2s;
}
.vote-option:hover { border-color: #93c5fd; background: #f8faff; }
.vote-option.selected { border-color: #409EFF; background: #ecf5ff; }
.vote-option input[type="radio"] { accent-color: #409EFF; width: 16px; height: 16px; }
.vote-option input[type="radio"]:disabled { accent-color: #a0cfff; }

.expert-question-card {
  background: #fffbeb !important; border: 1px solid #fde68a !important;
  color: #92400e; font-size: 14px; line-height: 1.7;
  margin: 8px 4px 14px; padding: 14px 18px; border-radius: 12px;
}
.expert-question-card i { color: #f59e0b; }

.expert-feedback { padding: 16px; background: #f9fafb; border: 1px solid #edf0f4; border-radius: 10px; }
.feedback-title { font-weight: 700; font-size: 14px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; color: #1f2937; }
.feedback-item { font-size: 13px; line-height: 1.8; padding: 4px 0; color: #4b5563; }

.mdt-decision-card {
  margin: 14px 4px; border: 2px solid #10b981; border-radius: 12px; overflow: hidden;
  box-shadow: 0 2px 8px rgba(16,185,129,0.08);
}
.decision-header {
  background: #d1fae5; padding: 12px 18px; font-weight: 700; font-size: 14px;
  color: #065f46; display: flex; align-items: center; gap: 8px;
}
.decision-body { padding: 16px 18px; font-size: 13px; line-height: 1.85; color: #374151; background: #f0fdf4; }

/* ─── 输入栏 ─── */
.mdt-input-bar {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 20px; background: #fff;
  border-top: 1px solid #edf0f4;
  box-shadow: 0 -1px 4px rgba(0,0,0,0.03);
}
.input-voice-btn {
  width: 38px; height: 38px; border-radius: 50%; border: 1px solid #edf0f4;
  background: #f9fafb; cursor: pointer; display: flex; align-items: center; justify-content: center;
  font-size: 15px; color: #6b7280; flex-shrink: 0; transition: all .2s;
}
.input-voice-btn:hover { border-color: #79bbff; color: #409EFF; background: #ecf5ff; }
.chat-input {
  flex: 1; height: 40px; padding: 0 18px;
  border: 2px solid #edf0f4; border-radius: 24px;
  font-size: 13px; font-family: inherit; outline: none; background: #f9fafb;
  transition: all .2s;
}
.chat-input:focus { border-color: #409EFF; background: #fff; box-shadow: 0 0 0 4px rgba(64,158,255,0.06); }
.chat-input::placeholder { color: #c0c4cc; }
.input-send-btn {
  width: 40px; height: 40px; border-radius: 50%; border: none;
  background: #409EFF; color: #fff; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; flex-shrink: 0; transition: all .2s;
  box-shadow: 0 2px 4px rgba(64,158,255,0.3);
}
.input-send-btn:hover { background: #337ECC; transform: scale(1.05); }
.input-send-btn:disabled { background: #d1d5db; cursor: not-allowed; box-shadow: none; }

/* ─── 右栏 ─── */
.mdt-roster {
  flex: 1.5; min-width: 180px; background: #fff;
  border: 1px solid #edf0f4; border-radius: 0 12px 12px 0;
  border-left: none; padding: 18px 14px; overflow-y: auto;
}
.roster-title { font-weight: 600; font-size: 13px; margin-bottom: 16px; color: #374151; padding-bottom: 10px; border-bottom: 2px solid #f3f4f6; }
.roster-member {
  display: flex; align-items: center; gap: 8px; padding: 9px 10px;
  border-radius: 10px; margin-bottom: 3px; transition: background .2s;
}
.roster-member.speaking { background: #eff6ff; box-shadow: inset 3px 0 0 #409EFF; }
.roster-avatar {
  width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; color: #fff; flex-shrink: 0; overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
.roster-avatar-img { width: 100%; height: 100%; object-fit: cover; object-position: top center; }
.student-avatar { background: #3b82f6; }
.roster-name { font-size: 12px; font-weight: 600; color: #1f2937; }
.roster-role { font-size: 10px; color: #9ca3af; }
.speaking-indicator {
  width: 8px; height: 8px; border-radius: 50%; background: #10b981;
  margin-left: auto; display: none; box-shadow: 0 0 4px rgba(16,185,129,0.5);
}
.speaking-indicator.active { display: block; animation: pulse 1.2s infinite; }
@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.7)} }
.roster-student { border-top: 1px solid #edf0f4; margin-top: 12px; padding-top: 12px; }
.student-row { background: #ecf5ff; border-radius: 10px; }

/* ─── 弹窗通用 ─── */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; }
.modal-container { background: #fff; border-radius: 12px; width: 560px; max-height: 80vh; overflow-y: auto; }
.modal-header { padding: 16px 24px; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: space-between; }
.modal-header h3 { font-size: 16px; font-weight: 600; }
.modal-close { background: none; border: none; font-size: 18px; cursor: pointer; color: #6b7280; padding: 4px; }
.modal-body { padding: 24px; }
.modal-footer { padding: 16px 24px; border-top: 1px solid #e5e7eb; display: flex; justify-content: flex-end; }
.result-table { width: 100%; border-collapse: collapse; }
.result-table th, .result-table td { padding: 10px 14px; text-align: left; font-size: 13px; border-bottom: 1px solid #e5e7eb; }
.result-table th { font-size: 12px; color: #6b7280; font-weight: 600; }

/* ─── 通用 ─── */
.badge-error { background: #fee2e2; color: #991b1b; padding: 3px 12px; border-radius: 14px; font-size: 12px; font-weight: 600; }
.badge-purple { background: #f0f0ff; color: #409EFF; padding: 3px 12px; border-radius: 14px; font-size: 12px; font-weight: 600; }
.badge-success { background: #d1fae5; color: #065f46; padding: 3px 12px; border-radius: 14px; font-size: 12px; font-weight: 600; }
.badge-warning { background: #fef3c7; color: #92400e; padding: 3px 12px; border-radius: 14px; font-size: 12px; font-weight: 600; }
.badge-info { background: #dbeafe; color: #1e40af; padding: 3px 12px; border-radius: 14px; font-size: 12px; font-weight: 600; }

.btn { cursor: pointer; border-radius: 10px; font-family: inherit; font-size: 14px; padding: 9px 20px; transition: all .2s; background: #fff; border: 2px solid #edf0f4; font-weight: 500; }
.btn:hover { border-color: #d1d5db; }
.btn-primary { background: #409EFF; color: #fff; border-color: #409EFF; }
.btn-primary:hover { background: #337ECC; border-color: #337ECC; }
.btn-primary:disabled { background: #a0cfff; border-color: #a0cfff; cursor: not-allowed; }
.btn-sm { font-size: 12px; padding: 7px 16px; }

.mt-3 { margin-top: 16px; }

/* ─── 病例特点 ─── */
.case-features-box { background: #fefce8; border: 1px solid #fef08a; border-radius: 10px; padding: 12px 14px; }
.case-features-box .case-section-label { color: #a16207; }
.features-list { margin: 0; padding-left: 18px; }
.features-list li { font-size: 11px; color: #713f12; line-height: 1.7; margin-bottom: 5px; }

/* ─── MDT讨论问题卡片 ─── */
.mdt-questions-card {
  margin: 14px 4px; padding: 20px 22px;
  background: linear-gradient(135deg, #f0f7ff, #e0efff);
  border: 2px solid #b3d8ff; border-radius: 14px;
}
.questions-header {
  font-size: 15px; font-weight: 700; color: #1d4ed8;
  display: flex; align-items: center; gap: 8px; margin-bottom: 14px;
}
.questions-list { display: flex; flex-direction: column; gap: 10px; }
.question-item {
  display: flex; align-items: flex-start; gap: 10px;
  font-size: 13px; color: #374151; line-height: 1.65;
  padding: 10px 14px; background: #fff; border-radius: 10px;
  border: 1px solid #d9ecff;
}
.question-num {
  font-size: 11px; font-weight: 700; color: #fff; background: #409EFF;
  padding: 2px 8px; border-radius: 12px; flex-shrink: 0; margin-top: 1px;
}

/* ─── 通用flow卡片 ─── */
.flow-card {
  margin: 10px 4px 14px; border-radius: 12px; overflow: hidden;
  border: 1px solid #edf0f4;
}
.flow-card-header {
  padding: 12px 18px; font-weight: 700; font-size: 14px;
  display: flex; align-items: center; gap: 8px;
}
.flow-card-body { padding: 16px 18px; font-size: 13px; line-height: 1.85; color: #374151; }

.discharge-card-flow { border-color: #10b981; }
.discharge-card-flow .flow-card-header { background: #d1fae5; color: #065f46; }
.discharge-card-flow .flow-card-body { background: #f0fdf4; }

.followup-card-flow { border-color: #409EFF; }
.followup-card-flow .flow-card-header { background: #d9ecff; color: #1e40af; }
.followup-card-flow .flow-card-body { background: #ecf5ff; }

.references-card-flow { border-color: #d1d5db; }
.references-card-flow .flow-card-header { background: #f3f4f6; color: #374151; }
.references-card-flow .flow-card-body { background: #fafafa; }
.ref-item { font-size: 12px; line-height: 1.75; padding: 4px 0; color: #4b5563; }
</style>
