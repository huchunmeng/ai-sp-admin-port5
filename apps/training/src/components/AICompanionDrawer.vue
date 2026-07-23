<template>
  <div class="companion-float-wrapper">
    <!-- 浮动触发按钮 — 右侧中上位置，与FloatInfoPanel高度一致 -->
    <div class="companion-trigger" :class="{ active: open }" @click="open = !open" title="AI伴学">
      <img :src="companionImg" class="trigger-img" />
    </div>

    <!-- 展开面板 -->
    <div v-if="open" class="companion-panel">
      <div class="panel-header">
        <span class="panel-tab" :class="{ active: activeTab === 'qa' }" @click="activeTab = 'qa'">
          <i class="fa-solid fa-comments"></i> 智能问答
        </span>
        <span class="panel-tab" :class="{ active: activeTab === 'commentary' }" @click="activeTab = 'commentary'">
          <i class="fa-solid fa-star"></i> 专家点评
        </span>
        <span class="panel-close" @click="open = false"><i class="fa-solid fa-xmark"></i></span>
      </div>

      <div class="panel-body">
        <!-- 智能问答 -->
        <div v-show="activeTab === 'qa'" class="tab-content">
          <div class="suggested-qs">
            <button v-for="q in suggestedQuestions" :key="q" class="suggested-q" @click="askQuestion(q)">{{ q }}</button>
          </div>
          <div class="qa-messages" ref="qaContainer">
            <div v-for="(msg, i) in qaMessages" :key="i" :class="['qa-msg', msg.type]">
              <span v-if="msg.type === 'ai'">🤖 </span>{{ msg.text }}
              <div v-if="msg.ref" class="qa-ref">{{ msg.ref }}</div>
            </div>
          </div>
          <div class="qa-input-row">
            <input v-model="qaInput" class="input" placeholder="输入你的问题..." @keydown.enter="askQuestion()">
            <button class="btn btn-primary btn-sm" @click="askQuestion()">
              <i class="fa-solid fa-paper-plane"></i>
            </button>
          </div>
        </div>

        <!-- 专家点评 -->
        <div v-show="activeTab === 'commentary'" class="tab-content commentary-tab">
          <div class="commentary-single">
            <!-- 视频区 -->
            <div class="commentary-video" @click="playVideo">
              <img :src="expertCover" class="video-cover" />
              <div class="video-overlay">
                <div class="play-btn"><i class="fa-solid fa-play"></i></div>
                <span class="video-duration">课程视频 · 点击播放</span>
              </div>
            </div>

            <!-- 专家信息 -->
            <div class="expert-profile">
              <img :src="expertPhoto" class="expert-avatar" />
              <div class="expert-meta">
                <div class="expert-name">滕皋军 院士</div>
                <div class="expert-dept">东南大学附属中大医院 · 介入与血管外科</div>
                <div class="expert-tags">
                  <span class="expert-tag">中国科学院院士</span>
                  <span class="expert-tag">介入放射学</span>
                </div>
              </div>
            </div>

            <!-- 点评正文 -->
            <div class="commentary-article">
              <h3 class="article-title">从不明原因消瘦到肝脏占位——症状驱动的临床思维路径</h3>
              <div class="article-body">
                <p>本病例以"近3个月无明显诱因体重下降5kg、右上腹持续性隐痛伴纳差乏力"为切入点。患者无发热、黄疸等急性表现，这种隐匿起病的慢性消耗性症状群，往往需要从"蛛丝马迹"中展开系统性鉴别。</p>

                <div class="article-section">
                  <h4><i class="fa-solid fa-magnifying-glass"></i> 从症状入手的鉴别思维</h4>
                  <p>消瘦+右上腹痛的组合，首先建立"右上腹器官→系统性疾病"的双层鉴别框架。第一层：肝、胆、右肾、结肠肝曲等局部器官病变。第二层：消化系统肿瘤、慢性感染、代谢性疾病等系统性病因。临床思维的关键在于，<em>不急于指向某一个诊断</em>，而是先穷举可能，再通过问诊和检查逐层收敛。</p>
                </div>

                <div class="article-section">
                  <h4><i class="fa-solid fa-clock"></i> 病史深挖时间线</h4>
                  <div class="timeline-table">
                    <div class="tl-row"><span class="tl-time">3月前</span><span class="tl-act">无明显诱因开始食欲减退，饭量降至平时一半，厌油腻明显</span></div>
                    <div class="tl-row"><span class="tl-time">2月前</span><span class="tl-act">右上腹隐痛出现，持续性、钝痛性质，无放射，劳累后加重</span></div>
                    <div class="tl-row"><span class="tl-time">1月前</span><span class="tl-act">家属发现面色晦暗、体重明显下降（称重后确认下降5kg），就诊</span></div>
                    <div class="tl-row"><span class="tl-time">就诊后</span><span class="tl-act">腹部超声提示肝右叶占位性病变，进一步行增强CT/MRI明确</span></div>
                  </div>
                </div>

                <div class="article-section">
                  <h4><i class="fa-solid fa-chart-line"></i> 关键数据</h4>
                  <div class="key-metrics">
                    <div class="metric-item">
                      <div class="metric-val">50<span>%</span></div>
                      <div class="metric-label">初诊时已为中晚期<br>（我国现状）</div>
                    </div>
                    <div class="metric-item">
                      <div class="metric-val">80<span>%</span></div>
                      <div class="metric-label">有乙肝/肝硬化<br>基础病史</div>
                    </div>
                    <div class="metric-item">
                      <div class="metric-val">5<span>年</span></div>
                      <div class="metric-label">早期根治术后<br>生存率可达70%+</div>
                    </div>
                    <div class="metric-item">
                      <div class="metric-val">3-6<span>月</span></div>
                      <div class="metric-label">高危人群建议<br>超声+AFP筛查频次</div>
                    </div>
                  </div>
                </div>

                <div class="article-section">
                  <h4><i class="fa-solid fa-lightbulb"></i> 教学要点</h4>
                  <ul class="teaching-points">
                    <li>非特异性症状（消瘦、纳差、隐痛）组合出现持续超过2周，必须启动系统性排查</li>
                    <li>问诊中不可遗漏的关键线索：乙肝病史、饮酒史、家族肿瘤史、疫水接触史</li>
                    <li>即使超声已发现占位，仍应完成完整的鉴别诊断流程，避免"看见病灶就下结论"的锚定偏误</li>
                    <li>体格检查中肝脏触诊+移动性浊音+蜘蛛痣/肝掌是三个必须完成的查体步骤</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, computed } from 'vue'
import { useTrainingStore } from '@/stores/training'

const store = useTrainingStore()

const open = ref(false)
const activeTab = ref('qa')
const qaInput = ref('')
const qaContainer = ref(null)
const companionImg = '/images/avatars/' + encodeURIComponent('AI学伴.png')

const caseName = computed(() => {
  const c = store.currentCase
  if (c && c.patient && c.patient.name) return c.patient.name
  return ''
})

const suggestedQuestions = [
  '右上腹痛伴消瘦，需要考虑哪些可能？',
  '问诊时哪些关键信息不能遗漏？',
  '需要安排哪些辅助检查？',
  '腹部超声发现占位后，下一步怎么走？',
  '这个病例的鉴别诊断思路是什么？',
  '体格检查应该重点关注哪些体征？',
  '如果肿瘤标志物正常，能否排除恶性病变？',
  '这类患者的预后与哪些因素相关？',
]

const qaMessages = ref([
  { type: 'ai', text: '你好！我是AI伴学助手，基于专家知识库为你解答。你可以针对这个病例自由提问。' },
])

const qaResponses = {
  '右上腹痛伴消瘦，需要考虑哪些可能？': {
    text: '右上腹痛+消瘦是重要的临床线索，需从局部器官到系统疾病进行分层鉴别：(1)肝脏病变——慢性肝炎活动期、肝占位性病变（良恶性均需考虑）、肝脓肿；(2)胆道系统——慢性胆囊炎、胆道肿瘤；(3)右肾及肾上腺——肾肿瘤、肾上腺占位；(4)结肠肝曲——结肠肿瘤；(5)全身性——慢性感染（结核等）、内分泌代谢病（甲亢、糖尿病）、消化系统肿瘤。关键原则：先穷举，后收敛，不急于锁定单一诊断。',
    ref: '参考：《内科学（第9版）》消化系统疾病鉴别诊断',
  },
  '问诊时哪些关键信息不能遗漏？': {
    text: '必须覆盖的关键问诊线索：(1)乙肝/丙肝病史——我国肝脏占位性病变最重要的背景因素；(2)饮酒史——量和年限，每日>40g乙醇持续5年以上显著升高风险；(3)家族史——一级亲属中是否有肝脏恶性肿瘤患者；(4)症状演变——疼痛性质、体重变化速度、有无发热/黄疸/腹胀；(5)疫水/血吸虫接触史——部分流行区仍是重要病因；(6)药物史——长期使用损肝药物情况。',
    ref: '参考：《中国原发性肝癌诊疗指南（2024版）》危险因素评估',
  },
  '需要安排哪些辅助检查？': {
    text: '推荐分层检查路径：第一层（初筛）——肝功能全套+乙肝五项+丙肝抗体+AFP+腹部超声。第二层（精查）——增强CT（三期扫描）或增强MRI（含肝细胞特异性对比剂），这是目前无创诊断的核心手段。第三层（必要时）——超声/CT引导下肝穿刺活检取得病理。同时完善：血常规、凝血功能、肿瘤标志物谱（AFP-L3、DCP/PIVKA-II等补充标志物）。',
    ref: '参考：《中国原发性肝癌诊疗指南（2024版）》诊断流程',
  },
  '腹部超声发现占位后，下一步怎么走？': {
    text: '超声发现肝脏占位不等于诊断明确。下一步关键步骤：(1)确认超声特征——是否有"晕圈征"、低回声/高回声、边界是否清楚——这对鉴别良恶性有重要提示；(2)必须完成增强影像（增强CT或增强MRI），观察"快进快出"强化特征——这是肝细胞癌的典型影像学特征；(3)同时查AFP等肿瘤标志物辅助判断；(4)综合分析：影像特征+标志物+背景肝病（乙肝/肝硬化）=临床诊断。部分典型病例仅凭影像学即可达到临床诊断标准，无需活检。',
    ref: '参考：LI-RADS分级系统 + 中国肝癌诊疗指南影像诊断路径',
  },
  '这个病例的鉴别诊断思路是什么？': {
    text: '肝脏占位的三个核心鉴别方向：(1)恶性——肝细胞癌、胆管细胞癌、转移性肝癌、混合型肝癌；(2)良性——肝血管瘤（最常见，增强有特征性"填充式"强化）、局灶性结节性增生（FNH，中央瘢痕为特征）、肝腺瘤（与口服避孕药相关）；(3)非肿瘤性——肝硬化再生结节、肝脓肿、局灶性脂肪浸润/缺失。鉴别的核心工具是增强影像的"血流动力学特征"+背景肝病状态+肿瘤标志物。',
    ref: '参考：LI-RADS（Liver Imaging Reporting and Data System）v2018',
  },
  '体格检查应该重点关注哪些体征？': {
    text: '三项必查：(1)肝脏触诊——右锁骨中线肋缘下触诊，注意大小、质地（硬/韧/软）、表面（光滑/结节感）、压痛。正常成人肝下界一般在肋缘下不可触及；(2)移动性浊音——提示腹水，是肝功能失代偿或肿瘤腹腔转移的重要体征；(3)慢性肝病体征——蜘蛛痣（胸前、颈部、上肢）、肝掌（大小鱼际红斑）、巩膜黄染、男性乳房发育。这些体征提示存在背景肝病的可能性。',
    ref: '参考：《实用内科学（第16版）》腹部查体与慢性肝病体征',
  },
  '如果肿瘤标志物正常，能否排除恶性病变？': {
    text: '不能。这是一个重要的临床认识：(1)AFP诊断肝细胞癌的灵敏度约为60%~70%，即约1/3的肝细胞癌患者AFP始终正常；(2)胆管细胞癌和转移性肝癌更常见AFP正常或不显著升高；(3)小肝癌（<3cm）中AFP阴性比例更高；(4)因此AFP仅作为辅助参考，不能作为排除依据——影像学仍然是诊断的核心支柱。AFP-L3和DCP（异常凝血酶原）可作为补充标志物，提高诊断敏感性。',
    ref: '参考：临床肿瘤学关键认知——肿瘤标志物的诊断局限性',
  },
  '这类患者的预后与哪些因素相关？': {
    text: '预后评估五要素：(1)肿瘤分期——大小、数量、有无血管侵犯或肝外转移，这是最核心的预后因子；(2)肝功能储备——Child-Pugh分级，决定了可耐受的治疗手段范围；(3)根治性治疗机会——能否手术切除或消融/肝移植，早期发现是改善预后的最大杠杆；(4)背景肝病控制——乙肝/丙肝抗病毒治疗、戒酒等；(5)综合治疗反应——TACE、靶向、免疫治疗的疗效。我国通过高危人群定期筛查（每6个月超声+AFP），已逐步提高早诊率。',
    ref: '参考：BCLC分期系统 + 中国肝癌诊疗指南预后分层',
  },
}

function askQuestion(q) {
  const question = typeof q === 'string' ? q : qaInput.value.trim()
  if (!question) return
  qaMessages.value.push({ type: 'user', text: question })
  qaInput.value = ''
  const answer = qaResponses[question]
  if (answer) {
    setTimeout(() => { qaMessages.value.push({ type: 'ai', text: answer.text, ref: answer.ref }); scrollToBottom() }, 600)
  } else {
    setTimeout(() => {
      qaMessages.value.push({ type: 'ai', text: '这是一个好问题。基于病例上下文和专家知识库，建议从病史特点、体格检查、辅助检查三个维度综合分析。如需更详细解答，请咨询带教老师。' })
      scrollToBottom()
    }, 800)
  }
}

function scrollToBottom() {
  nextTick(() => { if (qaContainer.value) qaContainer.value.scrollTop = qaContainer.value.scrollHeight })
}

const expertCover = '/images/expert-cover.png'
const expertPhoto = '/images/expert-photo.webp'

function playVideo() {
  // 演示：点击视频封面提示
  alert('专家课程视频播放（演示版本）')
}

defineExpose({ open })
</script>

<style scoped>
.companion-float-wrapper {
  position: absolute; top: 60px; right: 16px; z-index: 10;
}

/* 触发按钮 — 圆形，与FloatInfoPanel一致 */
.companion-trigger {
  width: 42px; height: 42px; border-radius: 50%;
  background: rgba(255,255,255,0.94); border: 1px solid rgba(0,0,0,0.06);
  box-shadow: 0 2px 12px rgba(0,0,0,0.15);
  cursor: pointer; overflow: hidden;
  transition: all .2s;
  display: flex; align-items: center; justify-content: center;
}
.companion-trigger:hover { transform: scale(1.08); box-shadow: 0 4px 16px rgba(0,0,0,0.18); }
.companion-trigger.active { box-shadow: 0 0 0 3px rgba(64,158,255,0.3); border-color: #409EFF; }
.trigger-img { width: 100%; height: 100%; object-fit: cover; }

/* 展开面板 — 从右侧向左展开 */
.companion-panel {
  position: absolute; top: 0; right: 56px;
  width: 400px; height: calc(100vh - 80px); max-height: calc(100vh - 80px);
  background: rgba(255,255,255,0.97); border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.15);
  display: flex; flex-direction: column; overflow: hidden;
  backdrop-filter: blur(8px); border: 1px solid rgba(0,0,0,0.06);
}

.panel-header {
  display: flex; align-items: center; border-bottom: 1px solid #EBEEF5; flex-shrink: 0;
}
.panel-tab {
  flex: 1; text-align: center; padding: 12px 6px; font-size: 13px;
  cursor: pointer; color: #909399; transition: all .15s;
  display: flex; align-items: center; justify-content: center; gap: 5px;
}
.panel-tab.active { color: #409EFF; border-bottom: 2px solid #409EFF; }
.panel-close {
  padding: 8px 14px; cursor: pointer; color: #909399; font-size: 16px; flex-shrink: 0;
  transition: color .15s;
}
.panel-close:hover { color: #F56C6C; }

.panel-body { flex: 1; overflow-y: auto; }

.tab-content { padding: 16px; display: flex; flex-direction: column; height: 100%; }

.suggested-qs { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; flex-shrink: 0; }
.suggested-q {
  font-size: 11px; padding: 4px 10px; border-radius: 12px;
  background: #ecf5ff; color: #409EFF; cursor: pointer;
  border: none; font-family: inherit; transition: .15s;
}
.suggested-q:hover { background: #d9ecff; }

.qa-messages { flex: 1; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; margin-bottom: 12px; min-height: 160px; }
.qa-msg { max-width: 90%; padding: 10px 14px; border-radius: 12px; font-size: 13px; line-height: 1.6; }
.qa-msg.user { align-self: flex-end; background: #ecf5ff; color: #1f2937; }
.qa-msg.ai { align-self: flex-start; background: #f9fafb; border: 1px solid #e5e7eb; color: #374151; }
.qa-ref { font-size: 11px; color: #409EFF; margin-top: 6px; padding-top: 6px; border-top: 1px solid #e5e7eb; }

.qa-input-row { display: flex; gap: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb; flex-shrink: 0; }
.qa-input-row .input {
  flex: 1; height: 38px; padding: 0 14px;
  border: 1px solid #DCDFE6; border-radius: 8px; font-size: 13px;
  font-family: inherit; outline: none; transition: border-color .15s;
}
.qa-input-row .input:focus { border-color: #409EFF; }

.commentary-tab { padding: 0 !important; }

.commentary-single { display: flex; flex-direction: column; }

/* ─── 视频区 ─── */
.commentary-video {
  position: relative; cursor: pointer; overflow: hidden;
  border-radius: 0; aspect-ratio: 16/9; background: #0f172a;
}
.video-cover { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .3s; }
.commentary-video:hover .video-cover { transform: scale(1.03); }
.video-overlay {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.35); transition: background .2s;
}
.commentary-video:hover .video-overlay { background: rgba(0,0,0,0.25); }
.play-btn {
  width: 56px; height: 56px; border-radius: 50%;
  background: rgba(255,255,255,0.9); display: flex; align-items: center; justify-content: center;
  transition: transform .2s;
}
.play-btn i { font-size: 20px; color: #2563eb; margin-left: 2px; }
.commentary-video:hover .play-btn { transform: scale(1.08); }
.video-duration { font-size: 11px; color: rgba(255,255,255,0.8); margin-top: 10px; }

/* ─── 专家信息 ─── */
.expert-profile {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 16px; background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%);
  border-bottom: 1px solid #e5e7eb;
}
.expert-avatar {
  width: 56px; height: 56px; border-radius: 50%; object-fit: cover;
  border: 2px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.1); flex-shrink: 0;
}
.expert-meta { min-width: 0; }
.expert-name { font-size: 16px; font-weight: 700; color: #1f2937; }
.expert-dept { font-size: 11px; color: #6b7280; margin-top: 2px; }
.expert-tags { display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap; }
.expert-tag {
  font-size: 10px; padding: 2px 8px; border-radius: 10px;
  background: #dbeafe; color: #1d4ed8; font-weight: 500;
}

/* ─── 点评正文 ─── */
.commentary-article { padding: 16px; }
.article-title { font-size: 15px; font-weight: 700; color: #1f2937; margin-bottom: 14px; line-height: 1.4; }
.article-body { font-size: 13px; line-height: 1.8; color: #4b5563; }
.article-body p { margin-bottom: 10px; }

.article-section {
  margin-top: 16px; padding-top: 14px; border-top: 1px solid #f3f4f6;
}
.article-section h4 { font-size: 13px; font-weight: 600; color: #1f2937; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
.article-section h4 i { color: #2563eb; font-size: 12px; width: 16px; text-align: center; }

/* ─── 时间轴表 ─── */
.timeline-table {
  background: #f8fafc; border-radius: 8px; overflow: hidden;
  border: 1px solid #e5e7eb;
}
.tl-row {
  display: flex; align-items: flex-start; padding: 8px 12px;
  border-bottom: 1px solid #e5e7eb; font-size: 12px;
}
.tl-row:last-child { border-bottom: none; }
.tl-time {
  width: 70px; flex-shrink: 0; font-weight: 700; color: #2563eb;
  font-family: monospace;
}
.tl-act { flex: 1; color: #4b5563; }

/* ─── 关键指标 ─── */
.key-metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.metric-item {
  text-align: center; padding: 12px 6px; background: #f8fafc;
  border-radius: 8px; border: 1px solid #e5e7eb;
}
.metric-val { font-size: 22px; font-weight: 800; color: #2563eb; line-height: 1.2; }
.metric-val span { font-size: 12px; font-weight: 500; color: #6b7280; }
.metric-label { font-size: 10px; color: #6b7280; margin-top: 3px; line-height: 1.3; }

/* ─── 教学要点 ─── */
.teaching-points { margin: 0; padding-left: 18px; }
.teaching-points li { font-size: 12px; margin-bottom: 5px; line-height: 1.6; }
.teaching-points li::marker { color: #2563eb; }
</style>
